# SKIB

Meet new people in your city (Bangalore, Hyderabad, Mumbai, Pune, and more) through real-life plans and shared interests.

## Architecture (Monorepo)

```
SKIB/
├── apps/
│   ├── api/                        # Express 5 + TypeScript + Prisma + Socket.IO
│   │   ├── prisma/                 # Schema & seed (cities, interests, demo hosts & plans)
│   │   ├── src/
│   │   │   ├── features/
│   │   │   │   ├── auth/           # Phone OTP request & verification, JWT login
│   │   │   │   ├── catalog/        # Cities & interest categories
│   │   │   │   ├── onboarding/     # Step tracking & completion validation
│   │   │   │   ├── profile/        # Self profile, photo uploads & public member profiles
│   │   │   │   ├── plans/          # Browse, host, join requests & host approval workflow
│   │   │   │   └── plan-chat/      # Real-time group chat per plan (approved attendees)
│   │   │   ├── services/
│   │   │   │   ├── otp/            # HMAC OTP service + pluggable SMS provider
│   │   │   │   ├── realtime/       # Socket.IO server & plan room broadcasting
│   │   │   │   ├── storage/        # Local disk photo storage (S3/Cloudinary-ready)
│   │   │   │   └── token/          # JWT signing & verification
│   │   │   ├── middleware/         # Auth guard, Zod validation, error handler
│   │   │   └── lib/                # Config, Prisma client, errors
│   │   └── tests/                  # End-to-end Vitest + Supertest suites (Phase 1 & 2)
│   └── web/                        # Next.js 16 + React 19 (Bumble-inspired UI)
│       └── src/
│           ├── app/                # Routes: /login, /verify, /onboarding, /plans, /plans/new, /plans/[planId], /members/[userId], /profile
│           ├── components/         # AppNav bar
│           ├── features/           # Feature modules (auth, onboarding, profile, plans)
│           ├── lib/                # Fetch client & session helper
│           └── types/              # Shared DTO types
└── package.json
```

## Quick Start

```bash
# 1. Install dependencies & initialize SQLite database with seed data
npm run setup

# 2. Run API + Socket.IO (port 4000) and Web (port 3000) together
npm run dev
```

## Running Tests

```bash
npm test
```
