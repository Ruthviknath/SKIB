import type { Prisma } from '@prisma/client';
import { config } from '../../lib/config';
import { AppError, ageFrom } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { storage } from '../../services/storage/storage.service';
import type { UpdateProfileInput } from './profile.schemas';
import { profileInclude, toProfileDTO, toPublicProfileDTO } from './profile.serializer';

const rules = config.onboarding;

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: profileInclude });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  return toProfileDTO(user);
}

export async function getPublicProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: profileInclude });
  if (!user || !user.onboardedAt) throw new AppError(404, 'USER_NOT_FOUND', 'Member not found');
  return toPublicProfileDTO(user);
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const data: Prisma.UserUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.gender !== undefined) data.gender = input.gender;
  if (input.bio !== undefined) data.bio = input.bio || null;

  if (input.birthDate !== undefined) {
    if (user.onboardedAt) throw new AppError(400, 'BIRTHDATE_LOCKED', 'Birth date cannot be changed after onboarding');
    const birthDate = new Date(`${input.birthDate}T00:00:00.000Z`);
    const age = ageFrom(birthDate);
    if (age < rules.minAge) throw new AppError(400, 'UNDERAGE', `You must be at least ${rules.minAge} to use SKIB`);
    if (age > rules.maxAge) throw new AppError(400, 'INVALID_BIRTHDATE', 'Please enter a valid birth date');
    data.birthDate = birthDate;
  }

  if (input.cityId !== undefined) {
    const city = await prisma.city.findFirst({ where: { id: input.cityId, isActive: true } });
    if (!city) throw new AppError(400, 'INVALID_CITY', 'SKIB is not available in that city yet');
    data.city = { connect: { id: city.id } };
  }

  let interestIds: string[] | undefined;
  if (input.interestIds) {
    interestIds = [...new Set(input.interestIds)];
    if (interestIds.length < rules.minInterests) {
      throw new AppError(400, 'VALIDATION_ERROR', `Pick at least ${rules.minInterests} interests`);
    }
    const found = await prisma.interest.count({ where: { id: { in: interestIds } } });
    if (found !== interestIds.length) throw new AppError(400, 'INVALID_INTEREST', 'One or more interests do not exist');
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data }),
    ...(interestIds
      ? [
          prisma.userInterest.deleteMany({ where: { userId } }),
          prisma.userInterest.createMany({ data: interestIds.map((interestId) => ({ userId, interestId })) }),
        ]
      : []),
  ]);
  return getProfile(userId);
}

export async function addPhoto(userId: string, file: Express.Multer.File | undefined) {
  if (!file) throw new AppError(400, 'NO_FILE', 'Attach an image in the "photo" field');
  const count = await prisma.photo.count({ where: { userId } });
  if (count >= rules.maxPhotos) throw new AppError(400, 'PHOTO_LIMIT', `You can upload up to ${rules.maxPhotos} photos`);

  const key = await storage.save(file.buffer, file.mimetype);
  await prisma.photo.create({ data: { userId, key, position: count } });
  return getProfile(userId);
}

export async function removePhoto(userId: string, photoId: string) {
  const photo = await prisma.photo.findFirst({ where: { id: photoId, userId } });
  if (!photo) throw new AppError(404, 'PHOTO_NOT_FOUND', 'Photo not found');

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { onboardedAt: true } });
  const count = await prisma.photo.count({ where: { userId } });
  if (user.onboardedAt && count <= rules.minPhotos) {
    throw new AppError(400, 'PHOTO_MIN', `Your profile needs at least ${rules.minPhotos} photo`);
  }

  await prisma.photo.delete({ where: { id: photo.id } });
  await storage.remove(photo.key);
  // Re-number remaining photos 0..n-1
  const remaining = await prisma.photo.findMany({ where: { userId }, orderBy: { position: 'asc' } });
  await prisma.$transaction(remaining.map((p, i) => prisma.photo.update({ where: { id: p.id }, data: { position: i } })));
  return getProfile(userId);
}

export async function deleteAccount(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { photos: true } });
  await prisma.$transaction([
    prisma.otpCode.deleteMany({ where: { phone: user.phone } }),
    prisma.user.delete({ where: { id: userId } }), // cascades interests + photos rows
  ]);
  await Promise.all(user.photos.map((p) => storage.remove(p.key)));
}
