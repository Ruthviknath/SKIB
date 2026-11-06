import 'dotenv/config';
import path from 'node:path';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProd = nodeEnv === 'production';

/** Returns env var; falls back to a dev default outside production, throws in production. */
function required(name: string, devDefault: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProd) throw new Error(`Missing required env var ${name}`);
  return devDefault;
}

const smsProvider = process.env.SMS_PROVIDER ?? 'mock';

export const config = {
  nodeEnv,
  isProd,
  port: Number(process.env.PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
  publicUrl: process.env.PUBLIC_URL ?? '',
  jwt: {
    secret: required('JWT_SECRET', 'dev-only-insecure-jwt-secret'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  otp: {
    length: 6,
    ttlSeconds: 5 * 60,
    maxAttempts: 5,
    resendCooldownSeconds: 30,
    maxPerHour: 5,
    secret: required('OTP_SECRET', 'dev-only-insecure-otp-secret'),
  },
  sms: { provider: smsProvider },
  /** In dev with the mock SMS provider, the OTP is returned to the client so the app is testable. */
  exposeDevOtp: !isProd && smsProvider === 'mock',
  storage: {
    uploadDir: path.resolve(process.env.UPLOAD_DIR ?? 'uploads'),
    maxFileBytes: 5 * 1024 * 1024,
  },
  onboarding: {
    minAge: 18,
    maxAge: 100,
    minInterests: 3,
    maxInterests: 10,
    minPhotos: 1,
    maxPhotos: 6,
    maxBioLength: 300,
  },
} as const;
