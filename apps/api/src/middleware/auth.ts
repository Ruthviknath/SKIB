import type { Request, RequestHandler } from 'express';
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { verifyAccessToken } from '../services/token/token.service';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/** Requires a valid `Authorization: Bearer <jwt>` for an existing user. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new AppError(401, 'UNAUTHORIZED', 'Missing auth token');
  const { sub } = verifyAccessToken(header.slice(7));
  const user = await prisma.user.findUnique({ where: { id: sub }, select: { id: true } });
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Account no longer exists');
  req.userId = sub;
  next();
};

export function getUserId(req: Request): string {
  if (!req.userId) throw new AppError(401, 'UNAUTHORIZED', 'Not authenticated');
  return req.userId;
}
