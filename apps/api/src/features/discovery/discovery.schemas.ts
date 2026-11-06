import { z } from 'zod';

export const swipeSchema = z.object({
  targetUserId: z.string().min(1),
  action: z.enum(['LIKE', 'PASS']),
});

export type SwipeInput = z.infer<typeof swipeSchema>;
