import { AppError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { emitToPlanRoom } from '../../services/realtime/socket.service';
import { profileInclude, toPublicProfileDTO } from '../profile/profile.serializer';

async function requireApprovedMember(userId: string, planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { id: true } });
  if (!plan) throw new AppError(404, 'PLAN_NOT_FOUND', 'Plan not found');

  const member = await prisma.planMember.findUnique({
    where: { planId_userId: { planId, userId } },
    select: { status: true },
  });
  if (member?.status !== 'APPROVED') {
    throw new AppError(403, 'CHAT_FORBIDDEN', 'Only approved plan attendees can access the group chat');
  }
}

export async function listMessages(userId: string, planId: string) {
  await requireApprovedMember(userId, planId);
  const messages = await prisma.planMessage.findMany({
    where: { planId },
    include: { sender: { include: profileInclude } },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });
  return messages.map((m) => ({
    id: m.id,
    planId: m.planId,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    sender: toPublicProfileDTO(m.sender),
  }));
}

export async function sendMessage(userId: string, planId: string, body: string) {
  await requireApprovedMember(userId, planId);
  const msg = await prisma.planMessage.create({
    data: { planId, senderId: userId, body },
    include: { sender: { include: profileInclude } },
  });
  const dto = {
    id: msg.id,
    planId: msg.planId,
    body: msg.body,
    createdAt: msg.createdAt.toISOString(),
    sender: toPublicProfileDTO(msg.sender),
  };
  emitToPlanRoom(planId, 'plan:message', dto);
  return dto;
}
