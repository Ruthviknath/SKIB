import { z } from 'zod';

export const createCommunitySchema = z.object({
  name: z.string().trim().min(3, 'Community name must be at least 3 characters').max(70),
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(400),
  cityId: z.string().min(1),
  interestId: z.string().min(1),
});

export const createCommunityPostSchema = z.object({
  body: z.string().trim().min(1, 'Post cannot be empty').max(600),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
