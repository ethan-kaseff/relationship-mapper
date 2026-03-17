# Before Starting Work

Run these steps before making any changes.

1. Make sure git email is correct:
   ```
   git config user.email
   ```
   If it's not `barry@kaseff.com`, fix it:
   ```
   git config user.email "barry@kaseff.com"
   git config user.name "Barry Kaseff"
   ```

2. Pull the latest code from GitHub:
   ```
   git pull origin main
   ```

3. Install any new dependencies:
   ```
   npm install
   ```

4. **Verify prisma/schema.prisma is correct.** Check ALL of these:
   - `provider = "postgresql"` (NOT sqlite)
   - `url = env("DATABASE_URL")` exists in the datasource block
   - `directUrl = env("DIRECT_URL")` exists in the datasource block
   - Generator has `provider = "prisma-client-js"` with NO custom output path

   If ANY of these are missing, fix them before doing anything else.

5. **Verify the Prisma client import.** Check that `src/lib/prisma.ts` imports from `@prisma/client`. If it says `@/generated/prisma/client` or any other path, fix it back to `@prisma/client`.

6. Do a quick build to make sure everything is working:
   ```
   npm run build
   ```
   If the build fails, stop and tell Barry what's wrong before making changes.

Tell Barry: "You're up to date and ready to go."
