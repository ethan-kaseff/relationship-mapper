# Push to Live Site

Checks everything, saves any unsaved work, and pushes to GitHub which updates the live site.

1. Check git email is `barry@kaseff.com`. Fix if not.

2. **Verify prisma/schema.prisma is correct (ALL of these must be true):**
   - Has `provider = "postgresql"` (NOT sqlite)
   - Has `url = env("DATABASE_URL")` in the datasource block
   - Has `directUrl = env("DIRECT_URL")` in the datasource block
   - Generator has `provider = "prisma-client-js"` with NO custom output path
   Fix any of these if missing. These are critical — without them the build breaks.

3. **Verify `src/lib/prisma.ts` imports from `@prisma/client`** (NOT `@/generated/prisma/client`). Fix if wrong.

4. Pull latest from GitHub:
   ```
   git pull origin main
   ```
   Resolve any merge conflicts. Tell Barry what you resolved.

5. If there are uncommitted changes, stage and commit them:
   ```
   git add -A
   git commit -m "your message here"
   ```

6. Run checks — stop and tell Barry if any fail:
   ```
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```
   If lint fails, try `npm run lint:fix` first. If others fail, tell Barry what's wrong and stop.

7. If the checks required fixes, commit them:
   ```
   git add -A
   git commit -m "Fix lint/type errors before push"
   ```

8. Push:
   ```
   git push origin main
   ```
   Never use `--force`. If push is rejected, run `git pull origin main` and try again.

Tell Barry: "Pushed! The live site will update in a couple minutes."
