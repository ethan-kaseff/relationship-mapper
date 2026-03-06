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

3. Check that `prisma/schema.prisma` has `provider = "postgresql"`. If it says `sqlite`, fix it back to `postgresql` before doing anything else.

4. Install any new dependencies:
   ```
   npm install
   ```

Tell Barry: "You're up to date and ready to go."
