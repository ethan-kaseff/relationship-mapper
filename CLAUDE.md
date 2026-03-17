# Relationship Mapper — Claude Code Instructions

## CRITICAL RULES (never break these)

1. **Database is PostgreSQL.** The file `prisma/schema.prisma` MUST have `provider = "postgresql"`. If you ever see `provider = "sqlite"`, stop and fix it immediately. Never change the provider to sqlite.

2. **Never remove datasource URLs from schema.prisma.** The `datasource db` block MUST always contain these three lines:
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")
     directUrl = env("DIRECT_URL")
   }
   ```
   If any of these lines are missing, the build will fail and the live site will break.

3. **Do not change the Prisma generator config.** The generator block MUST stay as:
   ```prisma
   generator client {
     provider = "prisma-client-js"
   }
   ```
   Do NOT change it to `prisma-client` or add a custom `output` path. The standard `prisma-client-js` generates into `node_modules/@prisma/client`, which is the only configuration that works reliably on Vercel's serverless environment. The app imports from `@prisma/client` in `src/lib/prisma.ts` — do not change that import path either.

4. **Always build before push.** Run `npm run build` and confirm it succeeds before pushing. A broken build will break the live site on Vercel.

5. **Do not change `git config user.email`.** Use whatever email is already configured.

6. **Always pull before push.** Run `git pull origin main` before pushing to avoid overwriting others' work.

7. **Never force-push.** Do not use `git push --force` or `git push -f`. If push fails, ask for help.

## Project Overview

- **App:** Relationship Mapper — tracks people, partners, and connections across offices
- **Framework:** Next.js 15 with React 19, TypeScript
- **Database:** PostgreSQL via Prisma ORM (Prisma 6, standard `prisma-client-js` generator)
- **Auth:** NextAuth.js (v5 beta)
- **Styling:** Tailwind CSS
- **Hosting:** Vercel (auto-deploys from `main` branch)

## Commands

| Command | What It Does |
|---------|-------------|
| `npm run dev` | Start local dev server |
| `npm run build` | Generate Prisma client + build for production |
| `npm run lint` | Check code for errors (must pass with 0 warnings) |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run typecheck` | Check TypeScript types |
| `npm test` | Run tests once |
| `npm run db:push` | Sync Prisma schema to database |
| `npm run db:studio` | Open database browser |

## Project Structure

```
src/
  app/              — Pages and API routes (Next.js App Router)
    api/            — REST API endpoints (auth, people, partners, events, etc.)
    dashboard/      — Main dashboard
    people/         — People list and detail pages
    partners/       — Partner list and detail pages
    relationships/  — Relationship management
    events/         — Event management with seating charts
    happenings/     — Ad-hoc event tracking
    interactions/   — Interaction logging
    settings/       — App settings (lookup tables, annual event types)
    help/           — Help page
  components/       — Reusable UI components
    events/         — Event-specific components (modals, invite manager)
    seating/        — Seating chart components (floor plan, tables)
  lib/              — Shared utilities
    prisma.ts       — Prisma client singleton (imports from @prisma/client)
    auth.ts         — NextAuth.js configuration
    api-auth.ts     — API route authentication helpers
    api-error.ts    — Standardized API error responses
    office-filter.ts — Office-level data scoping
    validations/    — Zod schemas for request validation
  types/            — TypeScript type definitions
  hooks/            — Custom React hooks
prisma/
  schema.prisma     — Database schema (MUST stay PostgreSQL)
  seed.ts           — Database seeding script
claude-helpers/     — Step-by-step workflow instructions for Barry
```

## Key Architecture Patterns

### API Routes
All API routes follow this pattern:
1. Authenticate with `requireAuth()` or `requireNonConnector()`
2. Validate request body with Zod schemas from `src/lib/validations/`
3. Query database with Prisma, scoped to the user's office
4. Return JSON response or standardized error via `handleApiError()`

### Prisma Schema Rules
- The generator block must stay as `prisma-client-js` with no custom output (see Critical Rule #3)
- The datasource block must keep `url` and `directUrl` (see Critical Rule #2)
- All models use `@@map("snake_case")` for table names
- All fields use `@map("snake_case")` for column names
- Relations use `onDelete: Cascade` on join tables

### Validation
- Every API route that accepts a body uses Zod schemas from `src/lib/validations/`
- Schemas are re-exported from `src/lib/validations/index.ts`
- When adding new fields to a Prisma model, also update the matching validation schema

## Helper Workflows

Barry has helper instruction files in `claude-helpers/`. When Barry asks to do one of these tasks, read the matching file and follow its instructions:

| Barry Says | File to Read |
|------------|-------------|
| "Let's get started" / beginning of session | `claude-helpers/Before Starting Work.md` |
| "Save" / "commit" | `claude-helpers/Save My Changes Locally.md` |
| "Push" / "deploy" / "push to live" | `claude-helpers/Deploy Changes to Live Site.md` |
