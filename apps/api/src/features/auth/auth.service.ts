import { prisma } from '../../lib/prisma';
import { verifyOtp } from '../../services/otp/otp.service';
import { signAccessToken } from '../../services/token/token.service';
import { getProfile } from '../profile/profile.service';

/** Verifies the OTP, then logs in the existing user or creates a new one (signup == login). */
export async function loginWithOtp(phone: string, code: string) {
  await verifyOtp(phone, code);
  const existing = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
  const user = existing ?? (await prisma.user.create({ data: { phone }, select: { id: true } }));
  return {
    token: signAccessToken(user.id),
    isNewUser: !existing,
    profile: await getProfile(user.id),
  };
}
