# SKIB

Meet new people in your city (Bangalore, Hyderabad, Mumbai, Pune, and more) through real-life plans and shared interests.

## Architecture (Monorepo)

```
SKIB/
├── apps/
│   ├── api/                 # Express 5 + TypeScript + Prisma (SQLite for dev, Postgres-ready)
│   │   ├── prisma/          # Schema & seed (cities + interests)
│   │   ├── src/
│   │   │   ├── features/    # Modular features: auth, catalog, onboarding, profile
│   │   │   ├── services/    # Pluggable services: otp (+ sms providers), token, storage
│   │   │   ├── middleware/  # Auth guard, Zod validation, error handler
│   │   │   └── lib/         # Config, Prisma client, errors
│   │   └── tests/           # End-to-end Vitest + Supertest suite
│   └── web/                 # Next.js 16 + React 19 (Bumble-inspired UI)
│       └── src/
│           ├── app/         # App router pages (/login, /verify, /onboarding, /profile)
│           ├── features/    # Feature modules (auth, onboarding, profile)
│           ├── lib/         # Fetch client & session helper
│           └── types/       # Shared DTO types
└── package.json
```

## Quick Start

```bash
# 1. Install dependencies & initialize SQLite database with seed data
npm run setup

# 2. Run API (port 4000) and Web (port 3000) together
npm run dev
```

Open `http://localhost:3000`. In development (`SMS_PROVIDER="mock"`), the 6-digit OTP is printed in the API logs and displayed in a yellow banner on the `/verify` screen so you can test without SMS credits.

## Running Tests

```bash
npm test
```
