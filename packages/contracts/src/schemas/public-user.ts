import { z } from 'zod';

export const publicUserSchema = z.strictObject({
  id: z.string().trim().min(1),
  displayName: z.string().trim().min(1).max(100).nullable(),
  avatarUrl: z.url().nullable().optional(),
});

export type PublicUser = z.infer<typeof publicUserSchema>;
