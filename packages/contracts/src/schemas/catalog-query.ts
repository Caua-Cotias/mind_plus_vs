import { z } from 'zod';

import { paginationParamsSchema } from './pagination.js';
import { catalogAccessLevelSchema, catalogSlugSchema } from './catalog-common.js';

export const catalogSeriesSortSchema = z.enum(['featured', 'newest', 'title']);

export const catalogSeriesQuerySchema = paginationParamsSchema.extend({
  search: z.string().trim().min(1).max(120).optional(),
  category: catalogSlugSchema.optional(),
  sort: catalogSeriesSortSchema.default('featured'),
}).strict();

export const catalogEpisodeQuerySchema = paginationParamsSchema.extend({
  accessLevel: catalogAccessLevelSchema.optional(),
}).strict();

export type CatalogSeriesSort = z.infer<typeof catalogSeriesSortSchema>;
export type CatalogSeriesQuery = z.infer<typeof catalogSeriesQuerySchema>;
export type CatalogEpisodeQuery = z.infer<typeof catalogEpisodeQuerySchema>;
