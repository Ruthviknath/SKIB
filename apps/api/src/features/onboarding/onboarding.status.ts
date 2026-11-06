import { config } from '../../lib/config';

export const ONBOARDING_STEPS = ['basics', 'city', 'interests', 'photos'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

interface OnboardingFields {
  name: string | null;
  birthDate: Date | null;
  gender: string | null;
  cityId: string | null;
  interests: unknown[];
  photos: unknown[];
}

/** Required steps the user has not completed yet (bio is optional). */
export function getMissingSteps(user: OnboardingFields): OnboardingStep[] {
  const { minInterests, minPhotos } = config.onboarding;
  const done: Record<OnboardingStep, boolean> = {
    basics: !!(user.name && user.birthDate && user.gender),
    city: !!user.cityId,
    interests: user.interests.length >= minInterests,
    photos: user.photos.length >= minPhotos,
  };
  return ONBOARDING_STEPS.filter((s) => !done[s]);
}
