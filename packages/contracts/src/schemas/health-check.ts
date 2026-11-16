import { z } from 'zod';

export const healthCheckSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  timestamp: z.iso.datetime({ offset: true }),
});

export type HealthCheck = z.infer<typeof healthCheckSchema>;
