import assert from "node:assert/strict";
import test from "node:test";
import {
  catalogCategoryListResponseSchema,
  catalogEpisodeListResponseSchema,
  catalogSeasonListResponseSchema,
  catalogSeriesDetailResponseSchema,
  catalogSeriesListResponseSchema,
} from "@mind-plus/contracts";
import {
  CatalogNotFoundError,
  CatalogPaginationRangeError,
  createCatalogService,
} from "../src/lib/catalog/catalog-service.ts";
import { createCatalogHandlers } from "../src/lib/catalog/catalog-http.ts";

const publishedAt = new Date("2026-11-16T12:00:00.000Z");

function createDatabase(overrides = {}) {
  const calls = [];
  const methods = ["findMany", "findFirst", "count"];
  const database = {};

  for (const table of ["category", "series", "season", "episode"]) {
    database[table] = {};
    for (const method of methods) {
      database[table][method] = async (args) => {
        calls.push({ table, method, args });
        const implementation = overrides[table]?.[method];
        if (implementation) return implementation(args);
        return method === "count" ? 0 : method === "findFirst" ? null : [];
      };
    }
  }

  return { database, calls, service: createCatalogService(database) };
}

function seriesRow(overrides = {}) {
  return {
    id: "series-1",
    slug: "silent-orbit",
    title: "Silent Orbit",
    synopsis: "A crew follows a signal from deep space.",
    description: "Supplemental series information.",
    ageRating: null,
    publishedAt,
    storageKey: "private/poster-key",
    categories: [
      { category: { id: "category-z", name: "Mystery", slug: "mystery", storageKey: "private" } },
      { category: { id: "category-a", name: "Drama", slug: "drama" } },
    ],
    ...overrides,
  };
}

function episodeRow(overrides = {}) {
  return {
    id: "episode-1",
    episodeNumber: 1,
    title: "First Signal",
    description: null,
    durationSeconds: 120,
    accessLevel: "PREMIUM",
    publishedAt,
    videoAssetId: "private-video-id",
    storageKey: "private/video-key",
    ...overrides,
  };
}

test("category listings require an association with a published series and return no internals", async () => {
  const { service, calls } = createDatabase({
    category: {
      findMany: async () => [{ id: "category-1", name: "Drama", slug: "drama", storageKey: "private" }],
      count: async () => 1,
    },
  });

  const result = await service.listCategories({ page: 1, pageSize: 20 });
  const findCall = calls.find((call) => call.table === "category" && call.method === "findMany");

  assert.deepEqual(findCall.args.where, {
    series: { some: { series: { publicationStatus: "PUBLISHED", publishedAt: { not: null } } } },
  });
  assert.deepEqual(result.items, [{ id: "category-1", name: "Drama", slug: "drama" }]);
  assert.equal(result.pagination.totalItems, 1);
});

test("series listing applies published visibility, title search, category filter, and stable featured ordering", async () => {
  const { service, calls } = createDatabase({
    series: {
      findMany: async () => [seriesRow()],
      count: async () => 25,
    },
  });

  const result = await service.listSeries({
    page: 2,
    pageSize: 10,
    search: "orbit",
    category: "drama",
    sort: "featured",
  });
  const findCall = calls.find((call) => call.table === "series" && call.method === "findMany");

  assert.deepEqual(findCall.args.where, {
    publicationStatus: "PUBLISHED",
    publishedAt: { not: null },
    title: { contains: "orbit", mode: "insensitive" },
    categories: { some: { category: { slug: "drama" } } },
  });
  assert.equal(findCall.args.skip, 10);
  assert.equal(findCall.args.take, 10);
  assert.deepEqual(findCall.args.orderBy, [
    { featuredOrder: { sort: "asc", nulls: "last" } },
    { publishedAt: "desc" },
    { id: "asc" },
  ]);
  assert.deepEqual(result.items[0].categories.map(({ name }) => name), ["Drama", "Mystery"]);
  assert.equal(result.items[0].posterUrl, null);
  assert.equal("storageKey" in result.items[0], false);
  assert.equal("description" in result.items[0], false);
  assert.deepEqual(result.pagination, {
    page: 2,
    pageSize: 10,
    totalItems: 25,
    totalPages: 3,
    hasNextPage: true,
    hasPreviousPage: true,
  });
});

test("series sort choices use deterministic tie-breakers", async () => {
  for (const [sort, expected] of [
    ["newest", [{ publishedAt: "desc" }, { id: "asc" }]],
    ["title", [{ title: "asc" }, { id: "asc" }]],
  ]) {
    const { service, calls } = createDatabase();
    await service.listSeries({ page: 1, pageSize: 20, sort });
    const call = calls.find((entry) => entry.table === "series" && entry.method === "findMany");
    assert.deepEqual(call.args.orderBy, expected);
  }
});

test("series details hide unpublished records and expose no media storage references", async () => {
  const { service, calls } = createDatabase({
    series: { findFirst: async () => seriesRow() },
  });

  const result = await service.getSeriesBySlug("silent-orbit");
  const call = calls.find((entry) => entry.table === "series" && entry.method === "findFirst");

  assert.deepEqual(call.args.where, {
    slug: "silent-orbit",
    publicationStatus: "PUBLISHED",
    publishedAt: { not: null },
  });
  assert.equal(result.description, "Supplemental series information.");
  assert.equal(result.featuredImageUrl, null);
  assert.equal(result.posterUrl, null);
  assert.equal("storageKey" in result, false);
  assert.equal("posterAssetId" in result, false);
});

test("missing or unpublished series are indistinguishable", async () => {
  const { service } = createDatabase({ series: { findFirst: async () => null } });
  await assert.rejects(() => service.getSeriesBySlug("not-public"), CatalogNotFoundError);
});

test("season listings include only seasons with published episodes", async () => {
  const { service, calls } = createDatabase({
    series: { findFirst: async () => ({ id: "series-1" }) },
    season: {
      findMany: async () => [{ id: "season-1", seasonNumber: 1, title: null, seriesId: "series-1" }],
      count: async () => 1,
    },
  });

  const result = await service.listSeasons("silent-orbit", { page: 1, pageSize: 20 });
  const seasonCall = calls.find((entry) => entry.table === "season" && entry.method === "findMany");

  assert.deepEqual(seasonCall.args.where, {
    seriesId: "series-1",
    episodes: { some: { publicationStatus: "PUBLISHED", publishedAt: { not: null } } },
  });
  assert.deepEqual(result.items, [{ id: "season-1", seasonNumber: 1, title: null }]);
  assert.equal("seriesId" in result.items[0], false);
});

test("season listing for an unpublished series returns the same not-found error", async () => {
  const { service } = createDatabase({ series: { findFirst: async () => null } });
  await assert.rejects(
    () => service.listSeasons("hidden-series", { page: 1, pageSize: 20 }),
    CatalogNotFoundError,
  );
});

test("episode listing filters published records and optionally limits access level", async () => {
  const { service, calls } = createDatabase({
    season: { findFirst: async () => ({ id: "season-1" }) },
    episode: {
      findMany: async () => [episodeRow()],
      count: async () => 1,
    },
  });

  const result = await service.listEpisodes("silent-orbit", 1, {
    page: 1,
    pageSize: 20,
    accessLevel: "PREMIUM",
  });
  const guardCall = calls.find((entry) => entry.table === "season" && entry.method === "findFirst");
  const episodeCall = calls.find((entry) => entry.table === "episode" && entry.method === "findMany");

  assert.deepEqual(guardCall.args.where, {
    seasonNumber: 1,
    series: {
      slug: "silent-orbit",
      publicationStatus: "PUBLISHED",
      publishedAt: { not: null },
    },
    episodes: { some: { publicationStatus: "PUBLISHED", publishedAt: { not: null } } },
  });
  assert.deepEqual(episodeCall.args.where, {
    seasonId: "season-1",
    publicationStatus: "PUBLISHED",
    publishedAt: { not: null },
    accessLevel: "PREMIUM",
  });
  assert.deepEqual(result.items[0], {
    id: "episode-1",
    episodeNumber: 1,
    title: "First Signal",
    description: null,
    thumbnailUrl: null,
    durationSeconds: 120,
    accessLevel: "PREMIUM",
    publishedAt: "2026-11-16T12:00:00.000Z",
  });
  assert.equal("videoAssetId" in result.items[0], false);
  assert.equal("storageKey" in result.items[0], false);
});

test("a season without published episodes is hidden from the episode endpoint", async () => {
  const { service } = createDatabase({ season: { findFirst: async () => null } });
  await assert.rejects(
    () => service.listEpisodes("silent-orbit", 3, { page: 1, pageSize: 20 }),
    CatalogNotFoundError,
  );
});

test("empty catalog results have valid empty pagination metadata", async () => {
  const { service } = createDatabase();
  const response = await service.listSeries({ page: 1, pageSize: 20, sort: "featured" });
  const parsed = catalogSeriesListResponseSchema.parse({ success: true, data: response });

  assert.deepEqual(parsed.data, {
    items: [],
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });
});

test("offsets beyond the database-supported range are rejected before querying", async () => {
  const { service } = createDatabase();
  await assert.rejects(
    () => service.listCategories({ page: 30_000_000, pageSize: 100 }),
    CatalogPaginationRangeError,
  );
});

test("HTTP handlers return contract-valid empty results and reject invalid parameters", async () => {
  let callCount = 0;
  const handlers = createCatalogHandlers({
    async listCategories() { callCount += 1; return { items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } }; },
    async listSeries() { callCount += 1; return { items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } }; },
    async getSeriesBySlug() { throw new CatalogNotFoundError(); },
    async listSeasons() { return { items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } }; },
    async listEpisodes() { return { items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } }; },
  });

  const valid = await handlers.series(new Request("http://localhost/api/catalog/series"));
  assert.equal(valid.status, 200);
  catalogSeriesListResponseSchema.parse(await valid.json());
  const callsAfterValidRequest = callCount;

  const badQuery = await handlers.series(new Request("http://localhost/api/catalog/series?pageSize=101"));
  assert.equal(badQuery.status, 400);
  assert.equal(callCount, callsAfterValidRequest);
  assert.equal((await badQuery.json()).error.code, "INVALID_REQUEST");

  const duplicate = await handlers.categories(new Request("http://localhost/api/catalog/categories?page=1&page=2"));
  assert.equal(duplicate.status, 400);
  assert.equal(callCount, callsAfterValidRequest);

  const badSlug = await handlers.seriesDetail(new Request("http://localhost/api/catalog/series/Bad-Slug"), {
    params: Promise.resolve({ slug: "Bad-Slug" }),
  });
  assert.equal(badSlug.status, 400);

  const badSeasonNumber = await handlers.episodes(new Request("http://localhost/api/catalog/series/silent-orbit/seasons/0/episodes"), {
    params: Promise.resolve({ slug: "silent-orbit", seasonNumber: "0" }),
  });
  assert.equal(badSeasonNumber.status, 400);

  catalogCategoryListResponseSchema.parse(await (await handlers.categories(
    new Request("http://localhost/api/catalog/categories"),
  )).json());
  catalogSeasonListResponseSchema.parse(await (await handlers.seasons(
    new Request("http://localhost/api/catalog/series/silent-orbit/seasons"),
    { params: Promise.resolve({ slug: "silent-orbit" }) },
  )).json());
  catalogEpisodeListResponseSchema.parse(await (await handlers.episodes(
    new Request("http://localhost/api/catalog/series/silent-orbit/seasons/1/episodes"),
    { params: Promise.resolve({ slug: "silent-orbit", seasonNumber: "1" }) },
  )).json());
});

test("HTTP handlers hide missing and unpublished series and do not expose database errors", async () => {
  const handlers = createCatalogHandlers({
    async listCategories() { throw new Error("database internal diagnostic"); },
    async listSeries() { throw new Error("database internal diagnostic"); },
    async getSeriesBySlug() { throw new CatalogNotFoundError(); },
    async listSeasons() { throw new CatalogNotFoundError(); },
    async listEpisodes() { throw new CatalogNotFoundError(); },
  });

  const missing = await handlers.seriesDetail(new Request("http://localhost/api/catalog/series/missing"), {
    params: Promise.resolve({ slug: "missing" }),
  });
  const hidden = await handlers.seriesDetail(new Request("http://localhost/api/catalog/series/hidden"), {
    params: Promise.resolve({ slug: "hidden" }),
  });
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), await hidden.json());

  const internalFailure = await handlers.series(new Request("http://localhost/api/catalog/series"));
  const errorBody = await internalFailure.json();
  assert.equal(internalFailure.status, 500);
  assert.equal(errorBody.error.code, "INTERNAL_SERVER_ERROR");
  assert.equal(JSON.stringify(errorBody).includes("database internal diagnostic"), false);
});

test("public detail and episode envelopes validate against shared contracts", async () => {
  const handlers = createCatalogHandlers({
    async listCategories() { return { items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } }; },
    async listSeries() { return { items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } }; },
    async getSeriesBySlug() { return { id: "series-1", slug: "silent-orbit", title: "Silent Orbit", synopsis: "A signal arrives.", posterUrl: null, ageRating: null, categories: [], publishedAt: "2026-11-16T12:00:00Z", description: null, featuredImageUrl: null }; },
    async listSeasons() { return { items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } }; },
    async listEpisodes() { return { items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } }; },
  });

  const detail = await handlers.seriesDetail(new Request("http://localhost/api/catalog/series/silent-orbit"), {
    params: Promise.resolve({ slug: "silent-orbit" }),
  });
  catalogSeriesDetailResponseSchema.parse(await detail.json());
  assert.equal(detail.status, 200);

  const episodes = await handlers.episodes(new Request("http://localhost/api/catalog/series/silent-orbit/seasons/1/episodes?accessLevel=FREE"), {
    params: Promise.resolve({ slug: "silent-orbit", seasonNumber: "1" }),
  });
  catalogEpisodeListResponseSchema.parse(await episodes.json());
  assert.equal(episodes.status, 200);
});
