import { AppError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { notifyUser } from '../../services/notifications/notification.service';
import { storage } from '../../services/storage/storage.service';
import { profileInclude, toPublicProfileDTO } from '../profile/profile.serializer';
import type { CreateRatingInput, CreateStoryInput } from './memories.schemas';

async function requireApprovedAttendee(userId: string, planId: string) {
  const member = await prisma.planMember.findUnique({
    where: { planId_userId: { planId, userId } },
  });
  if (member?.status !== 'APPROVED') {
    throw new AppError(403, 'NOT_PLAN_ATTENDEE', 'Only approved attendees of this plan can post stories or rate attendees');
  }
}

export async function listStories(cityId?: string, planId?: string) {
  const stories = await prisma.planStory.findMany({
    where: {
      ...(planId ? { planId } : {}),
      ...(cityId ? { plan: { cityId } } : {}),
    },
    include: {
      author: { include: profileInclude },
      plan: { include: { city: true, interest: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return stories.map((s) => ({
    id: s.id,
    caption: s.caption,
    photoUrl: s.photoKey ? storage.urlFor(s.photoKey) : null,
    createdAt: s.createdAt.toISOString(),
    author: toPublicProfileDTO(s.author),
    plan: {
      id: s.plan.id,
      title: s.plan.title,
      city: s.plan.city.name,
      interest: s.plan.interest.name,
    },
  }));
}

export async function createStory(
  userId: string,
  input: CreateStoryInput,
  file?: Express.Multer.File,
) {
  await requireApprovedAttendee(userId, input.planId);
  const photoKey = file ? await storage.save(file.buffer, file.mimetype) : null;

  const story = await prisma.planStory.create({
    data: {
      planId: input.planId,
      authorId: userId,
      caption: input.caption,
      photoKey,
    },
    include: {
      author: { include: profileInclude },
      plan: { include: { city: true, interest: true } },
    },
  });

  return {
    id: story.id,
    caption: story.caption,
    photoUrl: story.photoKey ? storage.urlFor(story.photoKey) : null,
    createdAt: story.createdAt.toISOString(),
    author: toPublicProfileDTO(story.author),
    plan: {
      id: story.plan.id,
      title: story.plan.title,
      city: story.plan.city.name,
      interest: story.plan.interest.name,
    },
  };
}

export async function rateAttendee(raterId: string, input: CreateRatingInput) {
  if (raterId === input.rateeId) {
    throw new AppError(400, 'INVALID_RATING', 'You cannot rate yourself');
  }
  await requireApprovedAttendee(raterId, input.planId);
  await requireApprovedAttendee(input.rateeId, input.planId);

  const rating = await prisma.attendeeRating.upsert({
    where: {
      planId_raterId_rateeId: {
        planId: input.planId,
        raterId,
        rateeId: input.rateeId,
      },
    },
    update: {
      score: input.score,
      vouchTag: input.vouchTag ?? null,
      comment: input.comment ?? null,
    },
    create: {
      planId: input.planId,
      raterId,
      rateeId: input.rateeId,
      score: input.score,
      vouchTag: input.vouchTag ?? null,
      comment: input.comment ?? null,
    },
    include: {
      rater: { include: profileInclude },
      ratee: { include: profileInclude },
    },
  });

  await notifyUser(input.rateeId, {
    type: 'VOUCH_RECEIVED',
    title: `${rating.rater.name ?? 'An attendee'} vouched for you!`,
    body: input.vouchTag ? `${input.score}★ · "${input.vouchTag}"` : `${input.score}★ rating from your plan`,
    link: `/members/${input.rateeId}`,
  });

  return {
    id: rating.id,
    planId: rating.planId,
    score: rating.score,
    vouchTag: rating.vouchTag,
    comment: rating.comment,
    createdAt: rating.createdAt.toISOString(),
    rater: toPublicProfileDTO(rating.rater),
    ratee: toPublicProfileDTO(rating.ratee),
  };
}

export async function listUserRatings(userId: string) {
  const ratings = await prisma.attendeeRating.findMany({
    where: { rateeId: userId },
    include: { rater: { include: profileInclude }, plan: { select: { id: true, title: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const count = ratings.length;
  const averageScore =
    count === 0 ? null : Math.round((ratings.reduce((s, r) => s + r.score, 0) / count) * 10) / 10;

  return {
    count,
    averageScore,
    ratings: ratings.map((r) => ({
      id: r.id,
      score: r.score,
      vouchTag: r.vouchTag,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      plan: r.plan,
      rater: toPublicProfileDTO(r.rater),
    })),
  };
}
