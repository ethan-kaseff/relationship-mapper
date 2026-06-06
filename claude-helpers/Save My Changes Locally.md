# Saving

Commits Barry's work locally on the current feature branch. Does NOT push
or deploy.

## 1. Check the current branch

```
git branch --show-current
```

- If the branch is `main`, STOP. Barry should be on a `work/...` branch.
  Run the "Before Starting Work" helper to create one, then continue here.
- Otherwise continue.

## 2. Verify `prisma/schema.prisma` is correct

- `provider = "postgresql"` (NOT sqlite)
- `url = env("DATABASE_URL")` in the datasource block
- `directUrl = env("DIRECT_URL")` in the datasource block
- Generator has `provider = "prisma-client-js"` with NO custom output path

Fix any of these if missing.

## 3. Verify `src/lib/prisma.ts` imports from `@prisma/client`

Fix if it points anywhere else.

## 4. Check if there's anything to save

```
git status
```

If nothing changed, tell Barry "Nothing new to save" and stop.

## 5. Stage and commit

```
git add -A
git commit -m "your message here"
```

Write a short plain-English commit message describing what changed. Do NOT
stage `src/generated/`, `.env`, or `.env.local` — they should already be
gitignored.

---

Tell Barry: **"Saved locally on branch `<branch-name>`. Say 'deploy' when
you're ready to push it live."**
