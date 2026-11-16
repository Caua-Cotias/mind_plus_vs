import { z } from 'zod';

import { catalogSlugSchema } from './catalog-common.js';

export const catalogCategorySchema = z.strictObject({
  id: z.string().trim().min(1).max(128),
  name: z.string().trim().min(1).max(80),
  slug: catalogSlugSchema,
});

export type CatalogCategory = z.infer<typeof catalogCategorySchema>;
