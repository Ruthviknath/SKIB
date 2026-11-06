import { z } from 'zod';
import { config } from '../../lib/config';

export const GENDERS = ['woman', 'man', 'nonbinary'] as const;
const { maxBioLength, minInterests, maxInterests } = config.onboarding;

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50),
    birthDate: z.iso.date('Birth date must be YYYY-MM-DD'),
    gender: z.enum(GENDERS),
    bio: z.string().trim().max(maxBioLength, `Bio must be at most ${maxBioLength} characters`),
    cityId: z.string().min(1),
    interestIds: z
      .array(z.string().min(1))
      .min(minInterests, `Pick at least ${minInterests} interests`)
      .max(maxInterests, `Pick at most ${maxInterests} interests`),
  })
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0, 'Nothing to update');

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
