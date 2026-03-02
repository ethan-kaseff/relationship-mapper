# Save My Progress

> **What this does:** Saves Barry's work as a git commit on his computer. Does NOT push to GitHub or affect the live site.
>
> **Safe to run anytime.** Nothing leaves Barry's computer.

## Instructions for Claude Code

Follow these steps in order. Stop and tell Barry if anything fails.

### Step 1: Check the git email

```bash
git config user.email
```

If it is NOT `barry@kaseff.com`, fix it:

```bash
git config user.email "barry@kaseff.com"
git config user.name "Barry Kaseff"
```

### Step 2: Check the database provider

Read `prisma/schema.prisma` and confirm it says `provider = "postgresql"`.

If it says `sqlite`, **stop immediately** and tell Barry:
> "The database provider got changed to sqlite. I'm fixing it back to postgresql before saving."

Then fix it back to `provider = "postgresql"` and include that fix in the commit.

### Step 3: Pull latest changes

```bash
git pull origin main
```

If there are merge conflicts, resolve them — keep both sides of changes where possible. Tell Barry what conflicts you found and how you resolved them.

### Step 4: See what changed

```bash
git status
```

If there are no changes, tell Barry: "Everything is already saved — no new changes to commit."

### Step 5: Stage all changes

```bash
git add -A
```

### Step 6: Write a commit message and commit

Look at the changed files and write a short, clear commit message describing what changed. Use plain English.

Good examples:
- "Add search bar to partner list page"
- "Fix login page not showing error messages"
- "Update dashboard layout and add priority filter"

```bash
git commit -m "your message here"
```

### Step 7: Confirm to Barry

Tell Barry something like:
> "Saved! I committed your changes with the message: [message]. Your work is safe on your computer. When you're ready to push to GitHub, just say 'push my changes'."
