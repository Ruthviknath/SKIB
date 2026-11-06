import { AppError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { notifyUser } from '../../services/notifications/notification.service';
import { profileInclude, toPublicProfileDTO } from '../profile/profile.serializer';
import { getBlockedUserIds, isBlockedBetween } from '../safety/safety.service';
import type { SwipeInput } from './discovery.schemas';

function canonicalPair(u1: string, u2: string): [string, string] {
  return u1 < u2 ? [u1, u2] : [u2, u1];
}

/** Returns onboarded BFF candidates in the viewer's city (or all cities), sorted by shared interests. */
export async function listCandidates(userId: string, cityIdFilter?: string) {
  const viewer = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { interests: true },
  });
  if (!viewer.onboardedAt) {
    throw new AppError(403, 'ONBOARDING_REQUIRED', 'Complete onboarding before discovering people');
  }

  const [swiped, blockedIds] = await Promise.all([
    prisma.swipe.findMany({ where: { swiperId: userId }, select: { targetId: true } }),
    getBlockedUserIds(userId),
  ]);

  const excludeIds = new Set<string>([userId, ...swiped.map((s) => s.targetId), ...blockedIds]);
  const myInterestIds = new Set(viewer.interests.map((i) => i.interestId));

  const candidates = await prisma.user.findMany({
    where: {
      id: { notIn: [...excludeIds] },
      onboardedAt: { not: null },
      ...(cityIdFilter ? { cityId: cityIdFilter } : {}),
    },
    include: profileInclude,
    take: 50,
  });

  return candidates
    .map((c) => {
      const dto = toPublicProfileDTO(c);
      const sharedInterests = dto.interests.filter((i) => myInterestIds.has(i.id));
      return {
        ...dto,
        sharedInterestCount: sharedInterests.length,
        sharedInterests: sharedInterests.map((i) => i.name),
      };
    })
    .sort((a, b) => b.sharedInterestCount - a.sharedInterestCount);
}

/** Records a LIKE or PASS swipe; creates a 1:1 Match if both users liked each other. */
export async function swipeCandidate(swiperId: string, input: SwipeInput) {
  if (swiperId === input.targetUserId) {
    throw new AppError(400, 'INVALID_SWIPE', 'Cannot swipe on yourself');
  }

  const [swiper, target] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: swiperId }, select: { id: true, name: true, onboardedAt: true } }),
    prisma.user.findUnique({ where: { id: input.targetUserId }, include: profileInclude }),
  ]);
  if (!swiper.onboardedAt) {
    throw new AppError(403, 'ONBOARDING_REQUIRED', 'Complete onboarding before swiping');
  }
  if (!target || !target.onboardedAt) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Candidate not found');
  }
  if (await isBlockedBetween(swiperId, target.id)) {
    throw new AppError(403, 'USER_BLOCKED', 'Cannot interact with this user');
  }

  await prisma.swipe.upsert({
    where: { swiperId_targetId: { swiperId, targetId: target.id } },
    update: { action: input.action },
    create: { swiperId, targetId: target.id, action: input.action },
  });

  if (input.action !== 'LIKE') {
    return { matched: false, match: null };
  }

  const reciprocal = await prisma.swipe.findUnique({
    where: { swiperId_targetId: { swiperId: target.id, targetId: swiperId } },
  });
  if (reciprocal?.action !== 'LIKE') {
    return { matched: false, match: null };
  }

  const [userAId, userBId] = canonicalPair(swiperId, target.id);
  const match = await prisma.match.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    update: {},
    create: { userAId, userBId },
  });

  await Promise.all([
    notifyUser(swiperId, {
      type: 'NEW_MATCH',
      title: `New BFF match with ${target.name ?? 'a member'}!`,
      body: 'Say hi and plan a coffee or activity together.',
      link: `/matches/${match.id}`,
    }),
    notifyUser(target.id, {
      type: 'NEW_MATCH',
      title: `New BFF match with ${swiper.name ?? 'a member'}!`,
      body: 'Say hi and plan a coffee or activity together.',
      link: `/matches/${match.id}`,
    }),
  ]);

  return {
    matched: true,
    match: {
      id: match.id,
      createdAt: match.createdAt.toISOString(),
      peer: toPublicProfileDTO(target),
    },
  };
}

/** Lists all active 1:1 BFF matches for the user (excluding blocked users). */
export async function listMatches(userId: string) {
  const blockedIds = await getBlockedUserIds(userId);
  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    include: {
      userA: { include: profileInclude },
      userB: { include: profileInclude },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });

  return matches
    .filter((m) => {
      const peerId = m.userAId === userId ? m.userBId : m.userAId;
      return !blockedIds.has(peerId);
    })
    .map((m) => {
      const peer = m.userAId === userId ? m.userB : m.userA;
      const last = m.messages[0] ?? null;
      return {
        id: m.id,
        createdAt: m.createdAt.toISOString(),
        peer: toPublicProfileDTO(peer),
        lastMessage: last
          ? {
              id: last.id,
              senderId: last.senderId,
              body: last.body,
              createdAt: last.createdAt.toISOString(),
            }
          : null,
      };
    });
}
