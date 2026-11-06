import { z } from 'zod';

/** Accepts "+91 98765 43210" / "+91-9876543210", normalises to E.164 "+919876543210". */
export const phoneSchema = z
  .string()
  .transform((s) => s.replace(/[\s()-]/g, ''))
  .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, 'Enter a valid phone number with country code, e.g. +919876543210'));

export const requestOtpSchema = z.object({ phone: phoneSchema });

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().trim().regex(/^\d{6}$/, 'Code must be 6 digits'),
});
