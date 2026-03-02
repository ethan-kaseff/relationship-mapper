# Start Fresh From GitHub

> **What this does:** Resets Barry's local code to exactly match what's on GitHub. Use this when things are really messed up and Barry wants a clean slate.
>
> **This will set aside any local changes.** They won't be deleted — they'll be stashed so they can be recovered if needed.

## Instructions for Claude Code

**Before doing anything, warn Barry:**
> "This will reset your local code to match GitHub. Any changes you haven't pushed will be set aside (I'll keep them safe in a git stash in case you need them). Want me to go ahead?"

Wait for Barry to confirm before proceeding.

### Step 1: Save any current changes to a stash

```bash
git stash push -m "Backup before reset - $(date '+%Y-%m-%d %H:%M')"
```

If there was nothing to stash, that's fine — continue.

Tell Barry if you stashed anything:
> "I saved your current changes in a backup stash, just in case."

### Step 2: Fetch latest from GitHub

```bash
git fetch origin main
```

### Step 3: Reset to match GitHub

```bash
git reset --hard origin/main
```

### Step 4: Clean up any extra files

```bash
git clean -fd
```

This removes files that aren't tracked by git (but won't remove files in `.gitignore` like `node_modules` or `.env`).

### Step 5: Reinstall dependencies

```bash
npm install
```

### Step 6: Generate Prisma client

```bash
npx prisma generate
```

### Step 7: Verify everything is working

Read `prisma/schema.prisma` and confirm the provider is `postgresql`.

```bash
git config user.email
```

Confirm the email is `barry@kaseff.com`. If not, fix it.

### Step 8: Confirm to Barry

Tell Barry something like:
> "Done! Your local code now matches exactly what's on GitHub. Everything is clean and up to date."
>
> "If you need to get back the changes I set aside, just let me know — I saved them in a backup."

### Recovering stashed changes (only if Barry asks)

If Barry wants his old changes back:

```bash
git stash list
```

Show Barry what stashes are available, then:

```bash
git stash pop
```

This restores the most recent stash. If there are conflicts, resolve them and tell Barry what happened.
