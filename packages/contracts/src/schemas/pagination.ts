import { z } from 'zod';

const positiveIntegerInputSchema = z
  .union([
    z.string().trim().regex(/^\d+$/).transform(Number),
    z.number(),
  ])
  .pipe(z.number().int().min(1));

export const paginationParamsSchema = z.object({
  page: positiveIntegerInputSchema.default(1),
  pageSize: positiveIntegerInputSchema.pipe(z.number().max(100)).default(20),
});

export const paginationMetaSchema = z
  .object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(100),
    totalItems: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  })
  .superRefine((metadata, context) => {
    const expectedTotalPages = Math.ceil(metadata.totalItems / metadata.pageSize);

    if (metadata.totalPages !== expectedTotalPages) {
      context.addIssue({
        code: 'custom',
        path: ['totalPages'],
        message: 'totalPages must match totalItems and pageSize.',
      });
    }

    if (metadata.hasNextPage !== (metadata.page < metadata.totalPages)) {
      context.addIssue({
        code: 'custom',
        path: ['hasNextPage'],
        message: 'hasNextPage must match the current page and totalPages.',
      });
    }

    if (metadata.hasPreviousPage !== (metadata.page > 1)) {
      context.addIssue({
        code: 'custom',
        path: ['hasPreviousPage'],
        message: 'hasPreviousPage must match the current page.',
      });
    }
  });

export type PaginationParams = z.infer<typeof paginationParamsSchema>;
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
