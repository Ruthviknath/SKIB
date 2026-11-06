import { z } from 'zod';

export const createStorySchema = z.object({
  planId: z.string().min(1),
  caption: z.string().trim().min(2, 'Caption must be at least 2 characters').max(400),
});

export const createRatingSchema = z.object({
  planId: z.string().min(1),
  rateeId: z.string().min(1),
  score: z.number().int().min(1).max(5),
  vouchTag: z.enum(['Great energy', 'Super welcoming', 'On time', 'Great conversation']).optional(),
  comment: z.string().trim().max(300).optional(),
});

export type CreateStoryInput = z.infer<typeof createStorySchema>;
export type CreateRatingInput = z.infer<typeof createRatingSchema>;
