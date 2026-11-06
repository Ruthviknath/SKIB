import crypto from 'node:crypto';
import { config } from '../../lib/config';
import { AppError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { createSmsProvider } from './sms';

const sms = createSmsProvider();
const { length, ttlSeconds, maxAttempts, resendCooldownSeconds, maxPerHour, secret } = config.otp;

const hashCode = (phone: string, code: string) =>
  crypto.createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');

export interface OtpRequestResult {
  code: string;
  expiresInSeconds: number;
  resendInSeconds: number;
}

/** Generates, stores (hashed) and sends a new OTP. Enforces resend cooldown and hourly cap. */
export async function requestOtp(phone: string): Promise<OtpRequestResult> {
  const now = Date.now();
  const last = await prisma.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: 'desc' } });
  if (last) {
    const waitMs = last.createdAt.getTime() + resendCooldownSeconds * 1000 - now;
    if (waitMs > 0) {
      const retryAfter = Math.ceil(waitMs / 1000);
      throw new AppError(429, 'OTP_COOLDOWN', `Please wait ${retryAfter}s before requesting a new code`, { retryAfter });
    }
  }
  const sentLastHour = await prisma.otpCode.count({ where: { phone, createdAt: { gte: new Date(now - 3600_000) } } });
  if (sentLastHour >= maxPerHour) {
    throw new AppError(429, 'OTP_LIMIT', 'Too many codes requested. Try again in an hour.');
  }

  const code = crypto.randomInt(0, 10 ** length).toString().padStart(length, '0');
  await prisma.$transaction([
    // Only the latest code is valid.
    prisma.otpCode.updateMany({ where: { phone, consumedAt: null }, data: { consumedAt: new Date(now) } }),
    prisma.otpCode.create({ data: { phone, codeHash: hashCode(phone, code), expiresAt: new Date(now + ttlSeconds * 1000) } }),
  ]);
  await sms.send(phone, `${code} is your SKIB verification code. It expires in ${ttlSeconds / 60} minutes.`);

  return { code, expiresInSeconds: ttlSeconds, resendInSeconds: resendCooldownSeconds };
}

/** Verifies the latest OTP for the phone; consumes it on success. Throws AppError otherwise. */
export async function verifyOtp(phone: string, code: string): Promise<void> {
  const otp = await prisma.otpCode.findFirst({ where: { phone, consumedAt: null }, orderBy: { createdAt: 'desc' } });
  if (!otp || otp.expiresAt.getTime() < Date.now()) {
    throw new AppError(400, 'OTP_EXPIRED', 'Code expired or not found. Request a new one.');
  }
  if (otp.attempts >= maxAttempts) {
    throw new AppError(429, 'OTP_TOO_MANY_ATTEMPTS', 'Too many wrong attempts. Request a new code.');
  }

  const valid = crypto.timingSafeEqual(Buffer.from(hashCode(phone, code)), Buffer.from(otp.codeHash));
  if (!valid) {
    const updated = await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    const attemptsLeft = Math.max(0, maxAttempts - updated.attempts);
    throw new AppError(400, 'OTP_INVALID', 'Incorrect code', { attemptsLeft });
  }
  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
}
