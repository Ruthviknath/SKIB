# SKIB — Final Touchup Roadmap

This document tracks the **Final Touchup** items for SKIB:

## 1. Convert Web App → Mobile App (`apps/mobile` with React Native + Expo)
- [ ] **Shared Workspace Package (`packages/shared`)**: Extract shared DTO types (`apps/web/src/types/api.ts`) and API client helpers so Web and Mobile share 100% of API contracts.
- [ ] **Expo Router App (`apps/mobile`)**:
  - Native phone OTP input & auto-read
  - Native camera & photo library picker (`expo-image-picker`)
  - Native swipe deck gestures (`react-native-gesture-handler`)
  - Secure JWT storage (`expo-secure-store`)
  - Native push notifications (`expo-notifications`)

## 2. Production Cloud Integrations
- [ ] **Live SMS OTP** (`apps/api/src/services/otp/sms/`): Plug in `Msg91SmsProvider` (for `+91` routes) or `TwilioSmsProvider` behind `SmsProvider`.
- [ ] **Cloud Photo Storage** (`apps/api/src/services/storage/storage.service.ts`): Swap `LocalDiskStorage` for `CloudinaryStorage` or `S3Storage`.
- [ ] **PostgreSQL Database** (`apps/api/prisma/schema.prisma`): Switch Prisma datasource `provider` from `"sqlite"` to `"postgresql"` (Supabase / Neon / RDS).
- [ ] **Refresh Tokens & Rate-Limit Hardening**: Rotating refresh tokens and Redis-backed rate limits.

## 3. Belong & Bumble Trust, Discovery & Social Enhancements
- [ ] **Verified Profile Badge ("Verified ✓")**: Selfie verification flow so attendees know profiles are authentic before meeting offline.
- [ ] **Neighborhood & Map Filtering**: Neighborhood tags (*Indiranagar, Koramangala, HSR, Jubilee Hills, Gachibowli*, etc.) and interactive venue map pins.
- [ ] **Attendance Check-In & Show-Up Rate Badge**: Host check-in toggle at the meetup to reward reliable attendees with a **Show-Up Rate** badge.
- [ ] **Profile & Chat Icebreakers**: Bumble-style profile prompts (*"My ideal Sunday in Bangalore is…"*) and group chat icebreaker prompts.

## 4. Payments & Ticketing Service (`apps/api/src/services/payments/`)
- [ ] **Razorpay / Stripe Integration**:
  - Support ticketed plans and refundable no-show deposits.
  - Automatic refunds if a host cancels a plan or declines a join request.
  - Host payout ledger.

## 5. Custom SKIB Brand & UI Polish
- [ ] Replace placeholder Bumble yellow theme with SKIB's custom brand identity, typography, dark mode, and smooth card/page transitions.
