# Before Starting Work

Run these steps before making any changes. The goal: make sure the local
environment is clean, up to date, and on a fresh feature branch — never on
`main` directly.

## 1. Make sure no uncommitted work is about to be lost

```
git status
```

If there are uncommitted changes, ask Barry whether they should be saved
first (run the "Save My Changes Locally" helper) or discarded. Do NOT
overwrite his work.

## 2. Switch to main and pull the latest

```
git checkout main
git pull origin main
```

If there are merge conflicts on pull, stop and ask for help.

## 3. Install any new dependencies

```
npm install
```

## 4. Create a fresh feature branch

Pick a short slug (3–5 words, lowercased, hyphen-separated) based on
what Barry is about to work on. Examples: `fix-seating-sort`,
`add-donor-report`, `polish-fundraiser-page`.

```
git checkout -b work/<slug>
```

Tell Barry the branch name you chose. He'll work on this branch until
the "Deploy" helper pushes and merges it back into main.

## 5. Verify `prisma/schema.prisma` is correct

Check ALL of these:
- `provider = "postgresql"` (NOT sqlite)
- `url = env("DATABASE_URL")` exists in the datasource block
- `directUrl = env("DIRECT_URL")` exists in the datasource block
- Generator has `provider = "prisma-client-js"` with NO custom output path

If ANY of these are missing, fix them before doing anything else.

## 6. Verify the Prisma client import

Check that `src/lib/prisma.ts` imports from `@prisma/client`. If it says
`@/generated/prisma/client` or any other path, fix it back to
`@prisma/client`.

## 7. Do a quick build to confirm everything works

```
npm run build
```

If the build fails, stop and tell Barry what's wrong before making changes.

---

Tell Barry: **"You're on branch `work/<slug>` and ready to go. Make your
changes, then say 'save' or 'deploy' when you're done."**
