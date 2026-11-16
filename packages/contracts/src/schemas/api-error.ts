import { z } from 'zod';

export const apiErrorSchema = z.object({
  code: z.string().trim().min(1).max(128),
  message: z.string().trim().min(1).max(1_000),
  details: z.record(z.string(), z.json()).optional(),
});

export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: apiErrorSchema,
});

export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
