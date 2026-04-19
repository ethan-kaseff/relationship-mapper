# Deploy to Live Site

Pushes the current feature branch, opens a pull request, waits for the
automated checks to pass, and merges it into `main`. Vercel then
auto-deploys `main` to the live site.

**Never push directly to `main`.** GitHub branch protection will block it
anyway. If the user asks to "push to main directly", refuse and follow
this workflow.

Branch protection does NOT require the feature branch to be up-to-date
with main (that was intentionally relaxed — semantic conflicts are rare
at two-person scale and CI-on-main catches anything that slips through).
So a PR merges as soon as its checks pass, whether it's one commit
behind main or fifty. Only actual textual conflicts need manual
intervention — see step 9.

## 1. Confirm the current branch

```
git branch --show-current
```

- If the branch is `main`, STOP and tell Barry: "You're on main — I need a
  feature branch to deploy from. Say 'start work' first."
- Otherwise continue. Remember the branch name.

## 2. Verify critical config

- `prisma/schema.prisma` has `provider = "postgresql"`, `url = env("DATABASE_URL")`,
  `directUrl = env("DIRECT_URL")`, and generator `provider = "prisma-client-js"`
  with no custom output path.
- `src/lib/prisma.ts` imports from `@prisma/client`.

Fix any violations before continuing.

## 3. Commit anything outstanding

```
git status
```

If there are uncommitted changes, commit them with a descriptive message:

```
git add -A
git commit -m "your message here"
```

## 4. Run local checks

```
npm run lint
npm run typecheck
npm test
npm run check:env
npm run build
```

If anything fails:
- Try `npm run lint:fix` first for lint issues.
- Otherwise stop and tell Barry what broke.
- If you fix problems, commit the fixes:
  ```
  git add -A
  git commit -m "Fix checks before deploy"
  ```

## 5. Push the feature branch

```
git push -u origin HEAD
```

Never use `--force` or `--force-with-lease`.

## 6. Open a pull request

Use `gh` to open a PR targeting `main`. Use the latest commit message (or
a short summary of all commits on this branch) as the title.

```
gh pr create --base main --head <branch-name> \
  --title "<short description>" \
  --body "$(git log main..HEAD --pretty=format:'- %s' --reverse)"
```

Capture the PR URL from the output.

## 7. Enable auto-merge (squash)

```
gh pr merge <branch-name> --auto --squash --delete-branch
```

This tells GitHub: "as soon as all required checks pass, squash-merge
this PR and delete the branch."

## 8. Wait for CI

Poll PR status until all checks are either `SUCCESS` or `FAILURE`:

```
gh pr checks <branch-name> --watch
```

- If checks pass → auto-merge runs → main updates → Vercel deploys.
- If any check fails → stop, tell Barry what failed, and work with him to
  fix it. After pushing fixes to the same branch, re-run this helper from
  step 4.

## 9. Confirm the merge

```
gh pr view <branch-name> --json state,mergedAt,mergeStateStatus
```

- `state: MERGED` → great, continue to step 10.
- `state: OPEN` → something's preventing the merge. Check `mergeStateStatus`:
  - `DIRTY` — textual merge conflict with main. Rebase the feature branch
    onto latest main, resolve conflicts, and force-with-lease push:
    ```
    git fetch origin main
    git rebase origin/main
    # resolve conflicts, then `git add <files> && git rebase --continue`
    git push --force-with-lease
    ```
    Auto-merge is still armed and will fire once CI re-passes.
  - `BLOCKED` or `UNSTABLE` — a required check failed or is still running.
    Re-run step 8 to see what.
  - Anything else — tell Barry what `gh pr view` shows and stop.

## 10. Sync local main and clean up

```
git checkout main
git pull origin main
git branch -d <branch-name>
```

(The remote branch was deleted by auto-merge; this removes the local copy.)

---

Tell Barry: **"Deployed! Pull request <PR number> is merged and the live
site will update in a couple minutes. See it at <Vercel URL>."**

If something failed mid-way, see `If Something Goes Wrong.md`.
