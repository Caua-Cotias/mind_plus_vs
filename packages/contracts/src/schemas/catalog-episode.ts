import { z } from 'zod';

import {
  catalogAccessLevelSchema,
  catalogPublishedAtSchema,
  catalogPublicImageUrlSchema,
} from './catalog-common.js';

export const catalogEpisodeSchema = z.strictObject({
  id: z.string().trim().min(1).max(128),
  episodeNumber: z.number().int().min(1),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().min(1).max(5_000).nullable(),
  thumbnailUrl: catalogPublicImageUrlSchema.nullable(),
  durationSeconds: z.number().int().min(1).nullable(),
  accessLevel: catalogAccessLevelSchema,
  publishedAt: catalogPublishedAtSchema,
});

export type CatalogEpisode = z.infer<typeof catalogEpisodeSchema>;
