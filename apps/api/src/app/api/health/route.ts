import { healthCheckSchema } from '@mind-plus/contracts';

export function GET() {
  const health = healthCheckSchema.parse({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });

  return Response.json(health);
}
