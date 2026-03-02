# Fix My Git Email

> **What this does:** Fixes Barry's git email so commits are linked to his GitHub account and Vercel deployments work correctly. One-time fix.
>
> **Safe to run.** Only changes git settings.

## Background (for Claude Code)

Barry's Mac sometimes sets his git email to `barrykaseff@barrys-mbp-2024.lan` (the computer's hostname). This causes two problems:
1. Commits don't show as Barry's on GitHub
2. Vercel deployments may fail because the commit author doesn't match a known GitHub user

The correct email is `barry@kaseff.com`.

## Instructions for Claude Code

### Step 1: Check current email

```bash
git config user.email
git config user.name
```

Tell Barry what it's currently set to.

### Step 2: Fix the email for this project

```bash
git config user.email "barry@kaseff.com"
git config user.name "Barry Kaseff"
```

This sets it for this project only (won't affect other projects).

### Step 3: Also fix it globally (so it works everywhere)

```bash
git config --global user.email "barry@kaseff.com"
git config --global user.name "Barry Kaseff"
```

### Step 4: Fix any recent commits with the wrong email

Check if recent commits have the wrong email:

```bash
git log --format="%ae %s" -5
```

If any recent **unpushed** commits have the wrong email, tell Barry:
> "I found [N] recent commits with the wrong email. I can fix them, but only if they haven't been pushed to GitHub yet. Want me to fix them?"

If Barry says yes, use interactive rebase to fix the author on those commits. Only fix unpushed commits — never rewrite pushed history.

If all recent commits already have the right email, skip this step.

### Step 5: Confirm to Barry

Tell Barry something like:
> "Fixed! Your git email is now set to barry@kaseff.com. All future commits will be linked to your GitHub account."
