import type {
  CatalogCategory,
  CatalogEpisode,
  CatalogEpisodeQuery,
  CatalogSeason,
  CatalogSeriesDetail,
  CatalogSeriesQuery,
  CatalogSeriesSummary,
  PaginationMeta,
  PaginationParams,
} from "@mind-plus/contracts";
import type { Prisma, PrismaClient } from "@mind-plus/database";

export type CatalogPage<TItem> = {
  items: TItem[];
  pagination: PaginationMeta;
};

export type CatalogDatabase = Pick<PrismaClient, "category" | "series" | "season" | "episode">;

export interface CatalogReadService {
  listCategories(query: PaginationParams): Promise<CatalogPage<CatalogCategory>>;
  listSeries(query: CatalogSeriesQuery): Promise<CatalogPage<CatalogSeriesSummary>>;
  getSeriesBySlug(slug: string): Promise<CatalogSeriesDetail>;
  listSeasons(slug: string, query: PaginationParams): Promise<CatalogPage<CatalogSeason>>;
  listEpisodes(
    slug: string,
    seasonNumber: number,
    query: CatalogEpisodeQuery,
  ): Promise<CatalogPage<CatalogEpisode>>;
}

export class CatalogNotFoundError extends Error {
  constructor() {
    super("Catalog resource was not found.");
    this.name = "CatalogNotFoundError";
  }
}

export class CatalogPaginationRangeError extends Error {
  constructor() {
    super("Catalog pagination offset is outside the supported range.");
    this.name = "CatalogPaginationRangeError";
  }
}

const visibleSeriesWhere = {
  publicationStatus: "PUBLISHED",
  publishedAt: { not: null },
} satisfies Prisma.SeriesWhereInput;

const visibleEpisodeWhere = {
  publicationStatus: "PUBLISHED",
  publishedAt: { not: null },
} satisfies Prisma.EpisodeWhereInput;

const publicSeriesSelect = {
  id: true,
  slug: true,
  title: true,
  synopsis: true,
  ageRating: true,
  publishedAt: true,
  categories: {
    select: {
      category: {
        select: { id: true, name: true, slug: true },
      },
    },
  },
} satisfies Prisma.SeriesSelect;

const publicSeasonSelect = {
  id: true,
  seasonNumber: true,
  title: true,
} satisfies Prisma.SeasonSelect;

const publicEpisodeSelect = {
  id: true,
  episodeNumber: true,
  title: true,
  description: true,
  durationSeconds: true,
  accessLevel: true,
  publishedAt: true,
} satisfies Prisma.EpisodeSelect;

type PublicSeriesRow = Prisma.SeriesGetPayload<{ select: typeof publicSeriesSelect }>;
type PublicEpisodeRow = Prisma.EpisodeGetPayload<{ select: typeof publicEpisodeSelect }>;

function getSkip(query: PaginationParams): number {
  const skip = (query.page - 1) * query.pageSize;

  // Prisma's PostgreSQL offset is bounded by a signed 32-bit integer.
  if (!Number.isSafeInteger(skip) || skip > 2_147_483_647) {
    throw new CatalogPaginationRangeError();
  }

  return skip;
}

function pagination(query: PaginationParams, totalItems: number): PaginationMeta {
  const totalPages = Math.ceil(totalItems / query.pageSize);

  return {
    page: query.page,
    pageSize: query.pageSize,
    totalItems,
    totalPages,
    hasNextPage: query.page < totalPages,
    hasPreviousPage: query.page > 1,
  };
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function seriesSummary(series: PublicSeriesRow): CatalogSeriesSummary {
  if (!series.publishedAt) {
    throw new Error("A published series must have a publication timestamp.");
  }

  const categories = series.categories
    .map(({ category }) => ({ id: category.id, name: category.name, slug: category.slug }))
    .sort((left, right) => compareText(left.name, right.name) || compareText(left.id, right.id));

  return {
    id: series.id,
    slug: series.slug,
    title: series.title,
    synopsis: series.synopsis,
    posterUrl: null,
    ageRating: series.ageRating,
    categories,
    publishedAt: series.publishedAt.toISOString(),
  };
}

function episodeSummary(episode: PublicEpisodeRow): CatalogEpisode {
  if (!episode.publishedAt) {
    throw new Error("A published episode must have a publication timestamp.");
  }

  return {
    id: episode.id,
    episodeNumber: episode.episodeNumber,
    title: episode.title,
    description: episode.description,
    thumbnailUrl: null,
    durationSeconds: episode.durationSeconds,
    accessLevel: episode.accessLevel,
    publishedAt: episode.publishedAt.toISOString(),
  };
}

function seriesOrder(sort: CatalogSeriesQuery["sort"]): Prisma.SeriesOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ publishedAt: "desc" }, { id: "asc" }];
    case "title":
      return [{ title: "asc" }, { id: "asc" }];
    case "featured":
    default:
      return [
        { featuredOrder: { sort: "asc", nulls: "last" } },
        { publishedAt: "desc" },
        { id: "asc" },
      ];
  }
}

export function createCatalogService(database: CatalogDatabase): CatalogReadService {
  return {
    async listCategories(query) {
      const skip = getSkip(query);
      const where = {
        series: {
          some: {
            series: visibleSeriesWhere,
          },
        },
      } satisfies Prisma.CategoryWhereInput;

      const [rows, totalItems] = await Promise.all([
        database.category.findMany({
          where,
          select: { id: true, name: true, slug: true },
          orderBy: [{ name: "asc" }, { id: "asc" }],
          skip,
          take: query.pageSize,
        }),
        database.category.count({ where }),
      ]);

      return {
        items: rows.map(({ id, name, slug }) => ({ id, name, slug })),
        pagination: pagination(query, totalItems),
      };
    },

    async listSeries(query) {
      const skip = getSkip(query);
      const where = {
        ...visibleSeriesWhere,
        ...(query.search
          ? { title: { contains: query.search, mode: "insensitive" as const } }
          : {}),
        ...(query.category
          ? { categories: { some: { category: { slug: query.category } } } }
          : {}),
      } satisfies Prisma.SeriesWhereInput;

      const [rows, totalItems] = await Promise.all([
        database.series.findMany({
          where,
          select: publicSeriesSelect,
          orderBy: seriesOrder(query.sort),
          skip,
          take: query.pageSize,
        }),
        database.series.count({ where }),
      ]);

      return {
        items: rows.map((row) => seriesSummary(row as PublicSeriesRow)),
        pagination: pagination(query, totalItems),
      };
    },

    async getSeriesBySlug(slug) {
      const series = await database.series.findFirst({
        where: { slug, ...visibleSeriesWhere },
        select: {
          ...publicSeriesSelect,
          description: true,
        },
      });

      if (!series) throw new CatalogNotFoundError();

      const summary = seriesSummary(series);
      return {
        ...summary,
        description: series.description,
        featuredImageUrl: null,
      };
    },

    async listSeasons(slug, query) {
      const skip = getSkip(query);
      const series = await database.series.findFirst({
        where: { slug, ...visibleSeriesWhere },
        select: { id: true },
      });

      if (!series) throw new CatalogNotFoundError();

      const where = {
        seriesId: series.id,
        episodes: { some: visibleEpisodeWhere },
      } satisfies Prisma.SeasonWhereInput;

      const [items, totalItems] = await Promise.all([
        database.season.findMany({
          where,
          select: publicSeasonSelect,
          orderBy: [{ seasonNumber: "asc" }, { id: "asc" }],
          skip,
          take: query.pageSize,
        }),
        database.season.count({ where }),
      ]);

      return {
        items: items.map(({ id, seasonNumber, title }) => ({ id, seasonNumber, title })),
        pagination: pagination(query, totalItems),
      };
    },

    async listEpisodes(slug, seasonNumber, query) {
      const skip = getSkip(query);
      const season = await database.season.findFirst({
        where: {
          seasonNumber,
          series: { slug, ...visibleSeriesWhere },
          episodes: { some: visibleEpisodeWhere },
        },
        select: { id: true },
      });

      if (!season) throw new CatalogNotFoundError();

      const where = {
        seasonId: season.id,
        ...visibleEpisodeWhere,
        ...(query.accessLevel ? { accessLevel: query.accessLevel } : {}),
      } satisfies Prisma.EpisodeWhereInput;

      const [rows, totalItems] = await Promise.all([
        database.episode.findMany({
          where,
          select: publicEpisodeSelect,
          orderBy: [{ episodeNumber: "asc" }, { id: "asc" }],
          skip,
          take: query.pageSize,
        }),
        database.episode.count({ where }),
      ]);

      return {
        items: rows.map((row) => episodeSummary(row as PublicEpisodeRow)),
        pagination: pagination(query, totalItems),
      };
    },
  };
}
