import { api } from '@/lib/api';
import type { Profile } from '@/types/api';

export interface OtpRequestResponse {
  phone: string;
  expiresInSeconds: number;
  resendInSeconds: number;
  devCode?: string; // only in dev with the mock SMS provider
}

export interface VerifyResponse {
  token: string;
  isNewUser: boolean;
  profile: Profile;
}

export const requestOtp = (phone: string) => api<OtpRequestResponse>('/auth/otp/request', { body: { phone } });

export const verifyOtp = (phone: string, code: string) => api<VerifyResponse>('/auth/otp/verify', { body: { phone, code } });
