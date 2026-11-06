import { AppError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { profileInclude, toPublicProfileDTO } from '../profile/profile.serializer';
import type { CreateCommunityInput } from './communities.schemas';

export async function listCommunities(viewerId: string, cityId?: string) {
  const communities = await prisma.community.findMany({
    where: cityId ? { cityId } : undefined,
    include: {
      city: true,
      interest: true,
      members: { select: { userId: true } },
      _count: { select: { posts: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return communities.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    city: { id: c.city.id, name: c.city.name },
    interest: { id: c.interest.id, name: c.interest.name, category: c.interest.category },
    memberCount: c.members.length,
    postCount: c._count.posts,
    joined: c.members.some((m) => m.userId === viewerId),
    createdAt: c.createdAt.toISOString(),
  }));
}

export async function getCommunity(viewerId: string, communityId: string) {
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    include: {
      city: true,
      interest: true,
      members: { include: { user: { include: profileInclude } }, orderBy: { joinedAt: 'asc' } },
      posts: {
        include: { author: { include: profileInclude } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      },
    },
  });
  if (!c) throw new AppError(404, 'COMMUNITY_NOT_FOUND', 'Community not found');

  return {
    id: c.id,
    name: c.name,
    description: c.description,
    city: { id: c.city.id, name: c.city.name },
    interest: { id: c.interest.id, name: c.interest.name, category: c.interest.category },
    memberCount: c.members.length,
    joined: c.members.some((m) => m.userId === viewerId),
    members: c.members.map((m) => toPublicProfileDTO(m.user)),
    posts: c.posts.map((p) => ({
      id: p.id,
      body: p.body,
      createdAt: p.createdAt.toISOString(),
      author: toPublicProfileDTO(p.author),
    })),
    createdAt: c.createdAt.toISOString(),
  };
}

export async function createCommunity(userId: string, input: CreateCommunityInput) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { onboardedAt: true } });
  if (!user.onboardedAt) {
    throw new AppError(403, 'ONBOARDING_REQUIRED', 'Complete onboarding before creating a community');
  }

  const [city, interest] = await Promise.all([
    prisma.city.findFirst({ where: { id: input.cityId, isActive: true } }),
    prisma.interest.findUnique({ where: { id: input.interestId } }),
  ]);
  if (!city) throw new AppError(400, 'INVALID_CITY', 'Selected city is not active');
  if (!interest) throw new AppError(400, 'INVALID_INTEREST', 'Selected interest does not exist');

  const created = await prisma.community.create({
    data: {
      name: input.name,
      description: input.description,
      cityId: city.id,
      interestId: interest.id,
      createdById: userId,
      members: { create: [{ userId }] },
    },
  });

  return getCommunity(userId, created.id);
}

export async function joinCommunity(userId: string, communityId: string) {
  const exists = await prisma.community.findUnique({ where: { id: communityId }, select: { id: true } });
  if (!exists) throw new AppError(404, 'COMMUNITY_NOT_FOUND', 'Community not found');

  await prisma.communityMember.upsert({
    where: { communityId_userId: { communityId, userId } },
    update: {},
    create: { communityId, userId },
  });
  return getCommunity(userId, communityId);
}

export async function leaveCommunity(userId: string, communityId: string) {
  await prisma.communityMember.deleteMany({ where: { communityId, userId } });
  return getCommunity(userId, communityId);
}

export async function createPost(userId: string, communityId: string, body: string) {
  const membership = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
  });
  if (!membership) {
    throw new AppError(403, 'NOT_COMMUNITY_MEMBER', 'Join the community before posting');
  }

  const post = await prisma.communityPost.create({
    data: { communityId, authorId: userId, body },
    include: { author: { include: profileInclude } },
  });

  return {
    id: post.id,
    body: post.body,
    createdAt: post.createdAt.toISOString(),
    author: toPublicProfileDTO(post.author),
  };
}
