import { prisma } from '../../lib/prisma';
import { emitToUser } from '../realtime/socket.service';

export interface CreateNotificationInput {
  type:
    | 'PLAN_REQUEST'
    | 'PLAN_APPROVED'
    | 'PLAN_REJECTED'
    | 'NEW_MATCH'
    | 'DIRECT_MESSAGE'
    | 'VOUCH_RECEIVED';
  title: string;
  body: string;
  link?: string;
}

/** Creates an in-app notification and pushes it in real time over Socket.IO. */
export async function notifyUser(userId: string, input: CreateNotificationInput) {
  const row = await prisma.notification.create({
    data: {
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
    },
  });
  const dto = {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
  emitToUser(userId, 'notification:new', dto);
  return dto;
}
