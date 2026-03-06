# Saving

Commits Barry's work locally. Does NOT push to the live site.

1. Check git email is `barry@kaseff.com`. Fix if not.

2. Check `prisma/schema.prisma` has `provider = "postgresql"`. Fix if not.

3. Pull latest from GitHub and merge:
   ```
   git pull origin main
   ```
   If there are merge conflicts, resolve them keeping both sides where possible. Tell Barry what you resolved.

4. Check if there's anything to save:
   ```
   git status
   ```
   If nothing changed, tell Barry "Nothing new to save" and stop.

5. Stage and commit:
   ```
   git add -A
   git commit -m "your message here"
   ```
   Write a short plain-English commit message describing what changed.

Tell Barry: "Saved! Say 'push to live' when you're ready to update the website."
