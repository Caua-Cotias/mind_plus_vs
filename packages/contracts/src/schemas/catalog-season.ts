import { z } from 'zod';

export const catalogSeasonSchema = z.strictObject({
  id: z.string().trim().min(1).max(128),
  seasonNumber: z.number().int().min(1),
  title: z.string().trim().min(1).max(160).nullable(),
});

export type CatalogSeason = z.infer<typeof catalogSeasonSchema>;
