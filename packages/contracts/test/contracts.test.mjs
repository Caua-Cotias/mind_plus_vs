import assert from 'node:assert/strict';
import test from 'node:test';
import {
  apiErrorResponseSchema,
  apiErrorSchema,
  apiResponseSchema,
  catalogAccessLevelSchema,
  catalogCategoryListResponseSchema,
  catalogCategorySchema,
  catalogEpisodeListResponseSchema,
  catalogEpisodeQuerySchema,
  catalogEpisodeSchema,
  catalogMediaAssetKindSchema,
  catalogPublicationStatusSchema,
  catalogSeasonListResponseSchema,
  catalogSeasonSchema,
  catalogSeriesDetailResponseSchema,
  catalogSeriesDetailSchema,
  catalogSeriesListResponseSchema,
  catalogSeriesQuerySchema,
  catalogSeriesSortSchema,
  catalogSeriesSummarySchema,
  createCatalogListResponseSchema,
  createApiResponseSchema,
  healthCheckSchema,
  paginationMetaSchema,
  paginationParamsSchema,
  publicUserSchema,
} from '@mind-plus/contracts';
import { apiErrorSchema as apiErrorSubpathSchema } from '@mind-plus/contracts/api-error';
import { healthCheckSchema as healthCheckSubpathSchema } from '@mind-plus/contracts/health-check';
import { paginationParamsSchema as paginationSubpathSchema } from '@mind-plus/contracts/pagination';
import { publicUserSchema as publicUserSubpathSchema } from '@mind-plus/contracts/public-user';
import { catalogCategorySchema as catalogSubpathCategorySchema } from '@mind-plus/contracts/catalog';

const catalogCategory = { id: 'category-1', name: 'Drama', slug: 'drama' };
const catalogSeries = {
  id: 'series-1',
  slug: 'silent-orbit',
  title: 'Silent Orbit',
  synopsis: 'A crew discovers a signal beyond the edge of known space.',
  posterUrl: 'https://cdn.example.test/posters/silent-orbit.jpg',
  ageRating: null,
  categories: [catalogCategory],
  publishedAt: '2026-11-16T10:00:00Z',
};
const catalogSeriesDetail = {
  ...catalogSeries,
  description: 'A short science-fiction series.',
  featuredImageUrl: 'https://cdn.example.test/featured/silent-orbit.jpg',
};
const catalogSeason = { id: 'season-1', seasonNumber: 1, title: null };
const catalogEpisode = {
  id: 'episode-1',
  episodeNumber: 1,
  title: 'First Signal',
  description: null,
  thumbnailUrl: 'https://cdn.example.test/thumbnails/first-signal.jpg',
  durationSeconds: 142,
  accessLevel: 'FREE',
  publishedAt: '2026-11-16T10:00:00Z',
};
const catalogPagination = {
  page: 1,
  pageSize: 20,
  totalItems: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

test('API success response validates a typed payload', () => {
  const responseSchema = createApiResponseSchema(publicUserSchema);
  const value = {
    success: true,
    data: { id: 'user-1', displayName: 'Sam', avatarUrl: null },
  };

  assert.deepEqual(responseSchema.parse(value), value);
  assert.equal(apiResponseSchema.safeParse(value).success, true);
  assert.equal(apiResponseSchema.safeParse({ success: true }).success, false);
  assert.equal(apiResponseSchema.safeParse({ success: true, data: () => null }).success, false);
  assert.equal(responseSchema.safeParse({ ...value, success: false }).success, false);
  assert.equal(responseSchema.safeParse({ success: true, data: { id: '' } }).success, false);
});

test('API error validates required fields and optional details', () => {
  const error = {
    code: 'VALIDATION_ERROR',
    message: 'Request is invalid.',
    details: { field: 'page', reason: 'must be positive' },
  };

  assert.deepEqual(apiErrorSchema.parse(error), error);
  assert.equal(apiErrorResponseSchema.safeParse({ success: false, error }).success, true);
  assert.equal(apiErrorSchema.safeParse({ code: ' ', message: 'Missing code' }).success, false);
  assert.equal(apiErrorSchema.safeParse({ code: 'ERROR', message: '' }).success, false);
  assert.equal(
    apiErrorSchema.safeParse({ code: 'ERROR', message: 'Failure', details: { value: () => null } })
      .success,
    false,
  );
  assert.equal(apiErrorResponseSchema.safeParse({ success: true, error }).success, false);
});

test('health check accepts operational states and ISO timestamps', () => {
  assert.equal(
    healthCheckSchema.safeParse({ status: 'ok', timestamp: '2026-11-15T12:00:00Z' }).success,
    true,
  );
  assert.equal(
    healthCheckSchema.safeParse({ status: 'degraded', timestamp: '2026-11-15T12:00:00+03:00' })
      .success,
    true,
  );
  assert.equal(
    healthCheckSchema.safeParse({ status: 'offline', timestamp: 'not-a-date' }).success,
    false,
  );
});

test('public user rejects extra fields that could expose private data', () => {
  const publicUser = { id: 'user-1', displayName: 'Sam', avatarUrl: null };

  assert.deepEqual(publicUserSchema.parse(publicUser), publicUser);
  assert.equal(publicUserSchema.safeParse({ ...publicUser, email: 'sam@example.com' }).success, false);
  assert.equal(publicUserSchema.safeParse({ id: '', displayName: null }).success, false);
  assert.equal(publicUserSchema.safeParse({ id: 'user-1', displayName: '' }).success, false);
});

test('pagination parameters coerce query strings, default values, and enforce limits', () => {
  assert.deepEqual(paginationParamsSchema.parse({}), { page: 1, pageSize: 20 });
  assert.deepEqual(paginationParamsSchema.parse({ page: '3', pageSize: '50' }), {
    page: 3,
    pageSize: 50,
  });
  assert.equal(paginationParamsSchema.safeParse({ page: '0' }).success, false);
  assert.equal(paginationParamsSchema.safeParse({ page: '1.5' }).success, false);
  assert.equal(paginationParamsSchema.safeParse({ page: true }).success, false);
  assert.equal(paginationParamsSchema.safeParse({ page: null }).success, false);
  assert.equal(paginationParamsSchema.safeParse({ pageSize: '101' }).success, false);
});

test('pagination metadata checks totals and navigation flags', () => {
  const metadata = {
    page: 2,
    pageSize: 10,
    totalItems: 25,
    totalPages: 3,
    hasNextPage: true,
    hasPreviousPage: true,
  };

  assert.deepEqual(paginationMetaSchema.parse(metadata), metadata);
  assert.equal(
    paginationMetaSchema.safeParse({
      ...metadata,
      totalPages: 2,
      hasNextPage: false,
    }).success,
    false,
  );
  assert.equal(
    paginationMetaSchema.safeParse({
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    }).success,
    true,
  );
});

test('documented subpath exports resolve to the same public schemas', () => {
  assert.equal(apiErrorSubpathSchema, apiErrorSchema);
  assert.equal(healthCheckSubpathSchema, healthCheckSchema);
  assert.equal(paginationSubpathSchema, paginationParamsSchema);
  assert.equal(publicUserSubpathSchema, publicUserSchema);
  assert.equal(catalogSubpathCategorySchema, catalogCategorySchema);
});

test('catalog public schemas validate categories, series, seasons, and episodes', () => {
  assert.deepEqual(catalogCategorySchema.parse(catalogCategory), catalogCategory);
  assert.deepEqual(catalogSeriesSummarySchema.parse(catalogSeries), catalogSeries);
  assert.deepEqual(catalogSeriesDetailSchema.parse(catalogSeriesDetail), catalogSeriesDetail);
  assert.deepEqual(catalogSeasonSchema.parse(catalogSeason), catalogSeason);
  assert.deepEqual(catalogEpisodeSchema.parse(catalogEpisode), catalogEpisode);

  assert.equal(catalogCategorySchema.safeParse({ ...catalogCategory, slug: 'Drama' }).success, false);
  assert.equal(catalogSeriesSummarySchema.safeParse({ ...catalogSeries, synopsis: ' ' }).success, false);
  assert.equal(catalogSeriesDetailSchema.safeParse({ ...catalogSeriesDetail, publishedAt: 'yesterday' }).success, false);
  assert.equal(catalogSeasonSchema.safeParse({ ...catalogSeason, seasonNumber: 0 }).success, false);
  assert.equal(catalogEpisodeSchema.safeParse({ ...catalogEpisode, episodeNumber: 1.5 }).success, false);
  assert.equal(catalogEpisodeSchema.safeParse({ ...catalogEpisode, durationSeconds: 0 }).success, false);
});

test('catalog enums accept only approved publication, access, and media kinds', () => {
  for (const status of ['DRAFT', 'PUBLISHED', 'ARCHIVED']) {
    assert.equal(catalogPublicationStatusSchema.parse(status), status);
  }
  for (const accessLevel of ['FREE', 'PREMIUM']) {
    assert.equal(catalogAccessLevelSchema.parse(accessLevel), accessLevel);
  }
  for (const kind of ['IMAGE', 'VIDEO']) {
    assert.equal(catalogMediaAssetKindSchema.parse(kind), kind);
  }

  assert.equal(catalogPublicationStatusSchema.safeParse('SCHEDULED').success, false);
  assert.equal(catalogAccessLevelSchema.safeParse('SUBSCRIPTION').success, false);
  assert.equal(catalogMediaAssetKindSchema.safeParse('HLS').success, false);
});

test('catalog query contracts validate filters, pagination, and ordering', () => {
  assert.deepEqual(catalogSeriesQuerySchema.parse({
    search: '  Silent Orbit  ',
    category: 'science-fiction',
    page: '2',
    pageSize: '15',
    sort: 'newest',
  }), {
    search: 'Silent Orbit',
    category: 'science-fiction',
    page: 2,
    pageSize: 15,
    sort: 'newest',
  });
  assert.deepEqual(catalogSeriesQuerySchema.parse({}), {
    page: 1,
    pageSize: 20,
    sort: 'featured',
  });
  assert.deepEqual(catalogEpisodeQuerySchema.parse({ accessLevel: 'PREMIUM' }), {
    page: 1,
    pageSize: 20,
    accessLevel: 'PREMIUM',
  });
  assert.deepEqual(catalogSeriesSortSchema.options, ['featured', 'newest', 'title']);

  assert.equal(catalogSeriesQuerySchema.safeParse({ search: '   ' }).success, false);
  assert.equal(catalogSeriesQuerySchema.safeParse({ category: 'Not A Slug' }).success, false);
  assert.equal(catalogSeriesQuerySchema.safeParse({ sort: 'popular' }).success, false);
  assert.equal(catalogSeriesQuerySchema.safeParse({ page: '0' }).success, false);
  assert.equal(catalogSeriesQuerySchema.safeParse({ pageSize: '101' }).success, false);
  assert.equal(catalogEpisodeQuerySchema.safeParse({ accessLevel: 'SUBSCRIPTION' }).success, false);
});

test('catalog response contracts reject internal fields and never define video playback URLs', () => {
  assert.equal(catalogCategorySchema.safeParse({ ...catalogCategory, storageKey: 'private/key' }).success, false);
  assert.equal(catalogSeriesSummarySchema.safeParse({ ...catalogSeries, createdBy: 'admin-1' }).success, false);
  assert.equal(catalogEpisodeSchema.safeParse({ ...catalogEpisode, videoUrl: 'https://private.example.test/video.m3u8' }).success, false);
  assert.equal(catalogEpisodeSchema.safeParse({ ...catalogEpisode, processingStatus: 'READY' }).success, false);
  assert.equal(catalogEpisodeSchema.safeParse({ ...catalogEpisode, publicationStatus: 'DRAFT' }).success, false);

  const seriesList = {
    success: true,
    data: { items: [catalogSeries], pagination: catalogPagination },
  };
  assert.deepEqual(catalogSeriesListResponseSchema.parse(seriesList), seriesList);
  assert.equal(catalogSeriesListResponseSchema.safeParse({ ...seriesList, debug: true }).success, false);
  assert.equal(catalogSeriesListResponseSchema.safeParse({
    ...seriesList,
    data: { ...seriesList.data, internalCursor: 'private' },
  }).success, false);
  assert.equal(catalogSeriesListResponseSchema.safeParse({
    ...seriesList,
    data: {
      ...seriesList.data,
      pagination: { ...catalogPagination, databaseOffset: 0 },
    },
  }).success, false);
  assert.deepEqual(catalogCategoryListResponseSchema.parse({
    success: true,
    data: { items: [catalogCategory], pagination: catalogPagination },
  }).data.items[0], catalogCategory);
  assert.deepEqual(catalogSeasonListResponseSchema.parse({
    success: true,
    data: { items: [catalogSeason], pagination: catalogPagination },
  }).data.items[0], catalogSeason);
  assert.deepEqual(catalogEpisodeListResponseSchema.parse({
    success: true,
    data: { items: [catalogEpisode], pagination: catalogPagination },
  }).data.items[0], catalogEpisode);
  assert.deepEqual(catalogSeriesDetailResponseSchema.parse({ success: true, data: catalogSeriesDetail }).data,
    catalogSeriesDetail);
  assert.equal(createCatalogListResponseSchema(catalogEpisodeSchema).safeParse({
    success: true,
    data: { items: [{ ...catalogEpisode, videoUrl: 'https://private.example.test/video.m3u8' }], pagination: catalogPagination },
  }).success, false);
});
