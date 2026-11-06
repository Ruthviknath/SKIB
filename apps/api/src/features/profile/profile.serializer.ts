import type { Prisma } from '@prisma/client';
import { config } from '../../lib/config';
import { ageFrom } from '../../lib/errors';
import { storage } from '../../services/storage/storage.service';
import { getMissingSteps } from '../onboarding/onboarding.status';

/** Relations needed to build a profile DTO. */
export const profileInclude = {
  city: true,
  interests: { include: { interest: true } },
  photos: { orderBy: { position: 'asc' } },
} satisfies Prisma.UserInclude;

export type UserWithProfile = Prisma.UserGetPayload<{ include: typeof profileInclude }>;

export function toProfileDTO(user: UserWithProfile) {
  const missing = getMissingSteps(user);
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    birthDate: user.birthDate?.toISOString().slice(0, 10) ?? null,
    age: user.birthDate ? ageFrom(user.birthDate) : null,
    gender: user.gender,
    bio: user.bio,
    city: user.city ? { id: user.city.id, name: user.city.name } : null,
    interests: user.interests.map(({ interest }) => ({
      id: interest.id,
      name: interest.name,
      category: interest.category,
    })),
    photos: user.photos.map((p) => ({ id: p.id, url: storage.urlFor(p.key), position: p.position })),
    onboarding: { completed: !!user.onboardedAt, missing, rules: config.onboarding },
    createdAt: user.createdAt.toISOString(),
  };
}

/** Public member profile shown on Plans & Attendee lists (never exposes phone number). */
export function toPublicProfileDTO(user: UserWithProfile) {
  return {
    id: user.id,
    name: user.name ?? 'Member',
    age: user.birthDate ? ageFrom(user.birthDate) : null,
    gender: user.gender,
    bio: user.bio,
    city: user.city ? { id: user.city.id, name: user.city.name } : null,
    interests: user.interests.map(({ interest }) => ({
      id: interest.id,
      name: interest.name,
      category: interest.category,
    })),
    photos: user.photos.map((p) => ({ id: p.id, url: storage.urlFor(p.key), position: p.position })),
    createdAt: user.createdAt.toISOString(),
  };
}

export type ProfileDTO = ReturnType<typeof toProfileDTO>;
export type PublicProfileDTO = ReturnType<typeof toPublicProfileDTO>;
