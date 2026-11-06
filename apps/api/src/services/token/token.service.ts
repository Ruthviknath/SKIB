import jwt from 'jsonwebtoken';
import { config } from '../../lib/config';
import { AppError } from '../../lib/errors';

export function signAccessToken(userId: string): string {
  return jwt.sign({}, config.jwt.secret, {
    subject: userId,
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): { sub: string } {
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    if (typeof payload === 'string' || !payload.sub) throw new Error('bad payload');
    return { sub: payload.sub };
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Session expired, please log in again');
  }
}
