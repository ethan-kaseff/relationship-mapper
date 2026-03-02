# Check If Everything Is Working

> **What this does:** Runs all checks and tells Barry the health status of the project. Read-only — changes nothing.
>
> **Completely safe.** This just checks things.

## Instructions for Claude Code

Run each check below and keep a scorecard. At the end, give Barry a simple summary.

### Check 1: Database provider

Read `prisma/schema.prisma` and confirm it says `provider = "postgresql"`.

- PASS: Provider is PostgreSQL
- FAIL: Provider is something else (this is a critical problem!)

### Check 2: Git email

```bash
git config user.email
```

- PASS: Email is `barry@kaseff.com`
- FAIL: Email is something else (commits won't link to Barry's GitHub account)

### Check 3: Lint

```bash
npm run lint
```

- PASS: No lint errors
- FAIL: Has lint errors (code quality issues)

### Check 4: TypeScript types

```bash
npm run typecheck
```

- PASS: No type errors
- FAIL: Has type errors (code correctness issues)

### Check 5: Tests

```bash
npm test
```

- PASS: All tests pass
- FAIL: Some tests fail (something might be broken)

### Check 6: Production build

```bash
npm run build
```

- PASS: Build succeeds
- FAIL: Build fails (this would break the live site if pushed!)

### Check 7: Git status

```bash
git fetch origin main
git status
```

- Note if there are uncommitted changes
- Note if there are unpushed commits
- Note if GitHub has newer changes to pull

### Summary

Give Barry a plain-English report card:

Good example (all passing):
> **Everything looks great!**
> - Database: PostgreSQL (correct)
> - Git email: barry@kaseff.com (correct)
> - Code quality: No errors
> - Tests: All passing
> - Build: Succeeds
> - Git: All caught up with GitHub
>
> You're good to go!

Bad example (some failures):
> **Found a couple issues:**
> - Database: PostgreSQL (correct)
> - Git email: Wrong! It's set to `barrykaseff@barrys-mbp-2024.lan`. Say "fix my email" to correct this.
> - Code quality: 2 lint errors in the dashboard page
> - Tests: All passing
> - Build: Fails because of the lint errors
>
> Want me to fix these issues?
