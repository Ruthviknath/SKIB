import { AppError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { notifyUser } from '../../services/notifications/notification.service';
import { emitToMatchRoom } from '../../services/realtime/socket.service';
import { profileInclude, toPublicProfileDTO } from '../profile/profile.serializer';
import { isBlockedBetween } from '../safety/safety.service';

async function requireMatchParticipant(userId: string, matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      userA: { include: profileInclude },
      userB: { include: profileInclude },
    },
  });
  if (!match) throw new AppError(404, 'MATCH_NOT_FOUND', 'Match not found');
  if (match.userAId !== userId && match.userBId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You are not part of this match');
  }
  const peer = match.userAId === userId ? match.userB : match.userA;
  if (await isBlockedBetween(userId, peer.id)) {
    throw new AppError(403, 'USER_BLOCKED', 'This conversation is unavailable');
  }
  return { match, peer };
}

export async function getMatchConversation(userId: string, matchId: string) {
  const { match, peer } = await requireMatchParticipant(userId, matchId);
  const messages = await prisma.directMessage.findMany({
    where: { matchId },
    include: { sender: { include: profileInclude } },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  return {
    match: {
      id: match.id,
      createdAt: match.createdAt.toISOString(),
      peer: toPublicProfileDTO(peer),
    },
    messages: messages.map((m) => ({
      id: m.id,
      matchId: m.matchId,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      sender: toPublicProfileDTO(m.sender),
    })),
  };
}

/** Either matched person can send the first message (standard BFF mode). */
export async function sendDirectMessage(userId: string, matchId: string, body: string) {
  const { peer } = await requireMatchParticipant(userId, matchId);
  const msg = await prisma.directMessage.create({
    data: { matchId, senderId: userId, body },
    include: { sender: { include: profileInclude } },
  });

  const dto = {
    id: msg.id,
    matchId: msg.matchId,
    body: msg.body,
    createdAt: msg.createdAt.toISOString(),
    sender: toPublicProfileDTO(msg.sender),
  };

  emitToMatchRoom(matchId, 'match:message', dto);
  await notifyUser(peer.id, {
    type: 'DIRECT_MESSAGE',
    title: `New message from ${dto.sender.name}`,
    body: body.slice(0, 120),
    link: `/matches/${matchId}`,
  });

  return dto;
}
