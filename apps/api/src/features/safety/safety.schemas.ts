import { z } from 'zod';

export const createReportSchema = z.object({
  targetUserId: z.string().min(1),
  reason: z.enum(['SPAM', 'HARASSMENT', 'FAKE_PROFILE', 'NO_SHOW', 'INAPPROPRIATE', 'OTHER']),
  details: z.string().trim().max(500).optional(),
});

export const resolveReportSchema = z.object({
  status: z.enum(['OPEN', 'RESOLVED']),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
