# Saving

Commits Barry's work locally. Does NOT push to the live site.

1. Check git email is `barry@kaseff.com`. Fix if not.

2. **Verify prisma/schema.prisma is correct:**
   - Has `provider = "postgresql"` (NOT sqlite)
   - Has `url = env("DATABASE_URL")` in the datasource block
   - Has `directUrl = env("DIRECT_URL")` in the datasource block
   - Generator has `output = "../src/generated/prisma"`
   Fix any of these if missing.

3. **Verify `src/lib/prisma.ts` imports from `@/generated/prisma/client`** (NOT `@prisma/client`). Fix if wrong.

4. Pull latest from GitHub and merge:
   ```
   git pull origin main
   ```
   If there are merge conflicts, resolve them keeping both sides where possible. Tell Barry what you resolved.

5. Check if there's anything to save:
   ```
   git status
   ```
   If nothing changed, tell Barry "Nothing new to save" and stop.

6. Stage and commit (do NOT stage `src/generated/` — it's in .gitignore):
   ```
   git add -A
   git commit -m "your message here"
   ```
   Write a short plain-English commit message describing what changed.

Tell Barry: "Saved! Say 'push to live' when you're ready to update the website."
