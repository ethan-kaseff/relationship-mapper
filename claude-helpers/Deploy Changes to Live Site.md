# Push to Live Site

Checks everything, saves any unsaved work, and pushes to GitHub which updates the live site.

1. Check git email is `barry@kaseff.com`. Fix if not.

2. Check `prisma/schema.prisma` has `provider = "postgresql"`. Fix if not.

3. Pull latest from GitHub:
   ```
   git pull origin main
   ```
   Resolve any merge conflicts. Tell Barry what you resolved.

4. If there are uncommitted changes, stage and commit them:
   ```
   git add -A
   git commit -m "your message here"
   ```

5. Run checks — stop and tell Barry if any fail:
   ```
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```
   If lint fails, try `npm run lint:fix` first. If others fail, tell Barry what's wrong and stop.

6. If the checks required fixes, commit them:
   ```
   git add -A
   git commit -m "Fix lint/type errors before push"
   ```

7. Push:
   ```
   git push origin main
   ```
   Never use `--force`. If push is rejected, run `git pull origin main` and try again.

Tell Barry: "Pushed! The live site will update in a couple minutes."
