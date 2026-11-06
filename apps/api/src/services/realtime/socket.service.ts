import type { Server as HttpServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { config } from '../../lib/config';
import { prisma } from '../../lib/prisma';
import { verifyAccessToken } from '../token/token.service';

let io: SocketServer | null = null;

/** Attaches Socket.IO to the HTTP server and authenticates connections with JWT. */
export function attachSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: config.webOrigin, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const rawToken =
        (socket.handshake.auth?.token as string | undefined) ??
        socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (!rawToken) return next(new Error('UNAUTHORIZED'));
      const { sub } = verifyAccessToken(rawToken);
      const user = await prisma.user.findUnique({ where: { id: sub }, select: { id: true } });
      if (!user) return next(new Error('UNAUTHORIZED'));
      socket.data.userId = sub;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;

    // Join a plan group chat room if the user is an APPROVED member of that plan
    socket.on('plan:join', async (planId: string, ack?: (res: { ok: boolean; error?: string }) => void) => {
      if (typeof planId !== 'string' || !planId) {
        ack?.({ ok: false, error: 'INVALID_PLAN' });
        return;
      }
      const member = await prisma.planMember.findUnique({
        where: { planId_userId: { planId, userId } },
        select: { status: true },
      });
      if (member?.status !== 'APPROVED') {
        ack?.({ ok: false, error: 'NOT_APPROVED_MEMBER' });
        return;
      }
      await socket.join(`plan:${planId}`);
      ack?.({ ok: true });
    });

    socket.on('plan:leave', async (planId: string) => {
      if (typeof planId === 'string') await socket.leave(`plan:${planId}`);
    });
  });

  return io;
}

/** Emits an event to all connected approved members of a plan room. */
export function emitToPlanRoom(planId: string, event: string, payload: unknown): void {
  io?.to(`plan:${planId}`).emit(event, payload);
}
