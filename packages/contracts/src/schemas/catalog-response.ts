import { z } from 'zod';

import { createApiResponseSchema, type ApiResponseOf } from './api-response.js';
import { paginationMetaSchema, type PaginationMeta } from './pagination.js';
import { catalogCategorySchema, type CatalogCategory } from './catalog-category.js';
import { catalogEpisodeSchema, type CatalogEpisode } from './catalog-episode.js';
import { catalogSeasonSchema, type CatalogSeason } from './catalog-season.js';
import {
  catalogSeriesDetailSchema,
  catalogSeriesSummarySchema,
  type CatalogSeriesDetail,
  type CatalogSeriesSummary,
} from './catalog-series.js';

export function createCatalogListResponseSchema<TItem extends z.ZodType>(itemSchema: TItem) {
  return createCatalogResponseSchema(z.strictObject({
    items: z.array(itemSchema),
    pagination: paginationMetaSchema.strict(),
  }));
}

function createCatalogResponseSchema<TData extends z.ZodType>(dataSchema: TData) {
  return createApiResponseSchema(dataSchema).strict();
}

export const catalogCategoryListResponseSchema = createCatalogListResponseSchema(catalogCategorySchema);
export const catalogSeriesListResponseSchema = createCatalogListResponseSchema(catalogSeriesSummarySchema);
export const catalogSeasonListResponseSchema = createCatalogListResponseSchema(catalogSeasonSchema);
export const catalogEpisodeListResponseSchema = createCatalogListResponseSchema(catalogEpisodeSchema);
export const catalogSeriesDetailResponseSchema = createCatalogResponseSchema(catalogSeriesDetailSchema);

export type CatalogListResponseOf<TItem> = ApiResponseOf<{
  items: TItem[];
  pagination: PaginationMeta;
}>;
export type CatalogCategoryListResponse = CatalogListResponseOf<CatalogCategory>;
export type CatalogSeriesListResponse = CatalogListResponseOf<CatalogSeriesSummary>;
export type CatalogSeasonListResponse = CatalogListResponseOf<CatalogSeason>;
export type CatalogEpisodeListResponse = CatalogListResponseOf<CatalogEpisode>;
export type CatalogSeriesDetailResponse = ApiResponseOf<CatalogSeriesDetail>;
