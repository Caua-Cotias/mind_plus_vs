import { z } from 'zod';

import { catalogCategorySchema } from './catalog-category.js';
import {
  catalogPublicImageUrlSchema,
  catalogPublishedAtSchema,
  catalogSlugSchema,
} from './catalog-common.js';

export const catalogSeriesSummarySchema = z.strictObject({
  id: z.string().trim().min(1).max(128),
  slug: catalogSlugSchema,
  title: z.string().trim().min(1).max(180),
  synopsis: z.string().trim().min(1).max(5_000),
  posterUrl: catalogPublicImageUrlSchema.nullable(),
  ageRating: z.string().trim().min(1).max(32).nullable(),
  categories: z.array(catalogCategorySchema),
  publishedAt: catalogPublishedAtSchema,
});

export const catalogSeriesDetailSchema = catalogSeriesSummarySchema.extend({
  description: z.string().trim().min(1).max(5_000).nullable(),
  featuredImageUrl: catalogPublicImageUrlSchema.nullable(),
});

export type CatalogSeriesSummary = z.infer<typeof catalogSeriesSummarySchema>;
export type CatalogSeriesDetail = z.infer<typeof catalogSeriesDetailSchema>;
