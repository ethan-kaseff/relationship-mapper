# Push My Changes

> **What this does:** Saves any unsaved work, runs all safety checks, and pushes to GitHub. This will trigger a Vercel deployment to the live site.
>
> **This affects the live site.** Only push when things are working.

## Instructions for Claude Code

Follow these steps in order. Stop and tell Barry if anything fails.

### Step 1: Save any unsaved work first

Follow all the steps in `claude-helpers/Save My Progress.md` first. This ensures:
- Git email is correct
- Database provider is PostgreSQL
- Latest changes are pulled
- All changes are committed

If there were no changes to save, that's fine — continue.

### Step 2: Pull latest from GitHub

```bash
git pull origin main
```

If there are merge conflicts, resolve them and commit the merge. Keep both sides where possible. Tell Barry what you resolved.

### Step 3: Run lint check

```bash
npm run lint
```

If lint fails, fix the issues automatically:

```bash
npm run lint:fix
```

Then re-run `npm run lint`. If it still fails, tell Barry what's wrong and stop.

### Step 4: Run TypeScript type check

```bash
npm run typecheck
```

If this fails, tell Barry what's wrong and stop. Do NOT push with type errors.

### Step 5: Run tests

```bash
npm test
```

If tests fail, tell Barry which tests failed and stop. Do NOT push with failing tests.

### Step 6: Run production build

```bash
npm run build
```

If the build fails, tell Barry what's wrong and stop. Do NOT push a broken build — it will break the live site.

### Step 7: Commit any fixes

If steps 3-6 required you to fix anything, commit those fixes:

```bash
git add -A
git commit -m "Fix lint/type errors before push"
```

### Step 8: Push to GitHub

```bash
git push origin main
```

If push fails with "rejected" or "non-fast-forward", do NOT force-push. Instead:

```bash
git pull origin main --rebase
```

Then try pushing again. If it still fails, tell Barry and stop.

### Step 9: Confirm to Barry

Tell Barry something like:
> "Pushed to GitHub! Vercel will automatically deploy to the live site in a few minutes. Everything passed: lint, types, tests, and build all look good."
