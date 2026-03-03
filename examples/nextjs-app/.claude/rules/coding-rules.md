# Next.js App Coding Rules

## Stack
- Next.js 15 (App Router)
- TypeScript strict mode
- Tailwind CSS
- PostgreSQL + Drizzle ORM

## Conventions
- Server components by default, 'use client' only when needed
- API routes in app/api/
- Shared types in types/
- Environment variables via .env.local (never commit)

## Testing
- Vitest for unit tests
- Playwright for E2E
- Coverage target: 80%
