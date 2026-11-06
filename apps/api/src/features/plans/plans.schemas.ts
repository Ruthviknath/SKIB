import { z } from 'zod';

export const createPlanSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(80),
  description: z.string().trim().max(600).optional(),
  venue: z.string().trim().min(3, 'Venue must be at least 3 characters').max(120),
  cityId: z.string().min(1),
  interestId: z.string().min(1),
  startsAt: z.iso.datetime({ message: 'startsAt must be an ISO-8601 datetime string' }),
  capacity: z.number().int().min(2, 'Capacity must be at least 2').max(30, 'Capacity can be at most 30').default(6),
});

export const updatePlanSchema = createPlanSchema
  .omit({ cityId: true })
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0, 'Nothing to update');

export const joinPlanRequestSchema = z.object({
  note: z.string().trim().max(240, 'Note can be at most 240 characters').optional(),
});

export const reviewJoinRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type JoinPlanRequestInput = z.infer<typeof joinPlanRequestSchema>;
export type ReviewJoinRequestInput = z.infer<typeof reviewJoinRequestSchema>;
