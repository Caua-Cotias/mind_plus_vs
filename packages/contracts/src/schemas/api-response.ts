import { z } from 'zod';

export const apiResponseSchema = z.object({
  success: z.literal(true),
  data: z.json(),
});

export const createApiResponseSchema = <TData extends z.ZodType>(dataSchema: TData) =>
  apiResponseSchema.extend({ data: dataSchema });

export type ApiResponse = z.infer<typeof apiResponseSchema>;
export type ApiResponseOf<TData> = Omit<ApiResponse, 'data'> & { data: TData };
