# Relationship Mapper — Claude Code Instructions

## CRITICAL RULES (never break these)

1. **Database is PostgreSQL.** The file `prisma/schema.prisma` MUST have `provider = "postgresql"`. If you ever see `provider = "sqlite"`, stop and fix it immediately. Never change the provider to sqlite.
2. **Git email must be `barry@kaseff.com`.** Before any commit, run `git config user.email` and confirm it is `barry@kaseff.com`. If it shows something like `barrykaseff@barrys-mbp-2024.lan`, fix it with `git config user.email "barry@kaseff.com"`.
3. **Always pull before push.** Run `git pull origin main` before pushing to avoid overwriting Ethan's work.
4. **Always build before push.** Run `npm run build` and confirm it succeeds before pushing. A broken build will break the live site on Vercel.
5. **Never force-push.** Do not use `git push --force` or `git push -f`. If push fails, ask for help.

## Project Overview

- **App:** Relationship Mapper — tracks people, partners, and connections across offices
- **Framework:** Next.js 15 with React 19, TypeScript
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** NextAuth.js (v5 beta)
- **Styling:** Tailwind CSS
- **Hosting:** Vercel (auto-deploys from `main` branch)

## Commands

| Command | What It Does |
|---------|-------------|
| `npm run dev` | Start local dev server |
| `npm run build` | Build for production (also generates Prisma client) |
| `npm run lint` | Check code for errors |
| `npm run typecheck` | Check TypeScript types |
| `npm test` | Run tests once |
| `npm run db:push` | Sync Prisma schema to database |
| `npm run db:studio` | Open database browser |

## Project Structure

```
src/
  app/          — Pages and API routes (Next.js App Router)
  components/   — Reusable UI components
  lib/          — Shared utilities and helpers
prisma/
  schema.prisma — Database schema (MUST stay PostgreSQL)
  seed.ts       — Database seeding script
```

## Helper Workflows

Barry has helper instruction files in `claude-helpers/`. When Barry asks to do one of these tasks, read the matching file and follow its instructions:

| Barry Says | File to Read |
|------------|-------------|
| "Let's get started" / beginning of session | `claude-helpers/Before Starting Work.md` |
| "Save" / "commit" | `claude-helpers/Save My Changes Locally.md` |
| "Push" / "deploy" / "push to live" | `claude-helpers/Deploy Changes to Live Site.md` |
