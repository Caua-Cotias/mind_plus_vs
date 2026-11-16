import { z } from 'zod';

export const catalogPublicationStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export const catalogAccessLevelSchema = z.enum(['FREE', 'PREMIUM']);
export const catalogMediaAssetKindSchema = z.enum(['IMAGE', 'VIDEO']);

export const catalogSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const catalogPublicImageUrlSchema = z.url();
export const catalogPublishedAtSchema = z.iso.datetime({ offset: true });

export type CatalogPublicationStatus = z.infer<typeof catalogPublicationStatusSchema>;
export type CatalogAccessLevel = z.infer<typeof catalogAccessLevelSchema>;
export type CatalogMediaAssetKind = z.infer<typeof catalogMediaAssetKindSchema>;
