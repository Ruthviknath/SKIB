import { z } from 'zod';

export const sendPlanMessageSchema = z.object({
  body: z.string().trim().min(1, 'Message cannot be empty').max(1000, 'Message is too long'),
});
