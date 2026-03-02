# See What Changed

> **What this does:** Shows Barry what files have changed since the last save. Read-only — changes nothing.
>
> **Completely safe.** This just looks at things.

## Instructions for Claude Code

### Step 1: Check for uncommitted changes

```bash
git status
```

### Step 2: Show the changes in plain English

For each changed file, explain in simple terms what changed. Group them by category:

- **New files** — files that were added
- **Changed files** — files that were modified
- **Deleted files** — files that were removed

For each file, explain what it does in plain language. Barry doesn't need to see code diffs — just tell him what happened.

Good example:
> Here's what changed since your last save:
>
> **Changed files:**
> - The partner list page — added a search bar at the top
> - The dashboard — updated the layout to show priority contacts first
>
> **New files:**
> - A new component for the search bar
>
> No files were deleted.

### Step 3: Show recent commits

```bash
git log --oneline -5
```

Tell Barry what the last few saves were, in plain English.

Good example:
> Your last few saves:
> 1. "Add search bar to partner list page" (today)
> 2. "Fix login page error messages" (yesterday)
> 3. "Update dashboard layout" (2 days ago)

### Step 4: Check if Barry is ahead or behind GitHub

```bash
git fetch origin main
git status
```

Tell Barry if he has unsaved work, unpushed commits, or if GitHub has newer changes.

Good example:
> You have 2 commits that haven't been pushed to GitHub yet. Say "push my changes" when you're ready.

Or:
> You're all caught up with GitHub — nothing to push.
