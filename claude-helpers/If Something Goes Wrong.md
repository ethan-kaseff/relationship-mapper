# If Something Goes Wrong

Common recoveries when deploy/save/start-work doesn't work cleanly.

## CI failed on the PR

Don't panic. The PR stays open. Fix locally:

1. Look at the failure:
   ```
   gh pr checks <branch-name>
   gh run view --log-failed
   ```
2. Fix the issue (lint, type, test, or build).
3. Commit and push to the same branch:
   ```
   git add -A
   git commit -m "Fix <what you fixed>"
   git push
   ```
4. CI re-runs automatically. Auto-merge stays queued — once it passes, the
   PR merges itself.

## Merge conflict in a PR (`mergeStateStatus: DIRTY`)

Two changes touched the same lines. Rebase the feature branch onto the
latest main, resolve conflicts, force-with-lease push:

```
git fetch origin main
git rebase origin/main
# for each conflicted file, edit to keep the right version, then:
git add <resolved files>
git rebase --continue
git push --force-with-lease
```

Auto-merge stays armed. Once CI re-passes on the rebased commit, the PR
merges itself.

(`--force-with-lease` is safe on your own feature branch. Never use
`--force` or force-with-lease on `main`.)

## The live site is broken after a deploy

1. Find the bad deploy in Vercel:
   ```
   vercel ls
   ```
2. Promote the previous good deployment:
   ```
   vercel promote <deployment-url>
   ```
   (Or use the Vercel dashboard → Deployments → three-dot menu → "Promote
   to Production" on the last known good deploy.)
3. Then revert the bad commit via a new PR:
   ```
   git checkout main
   git pull origin main
   git checkout -b work/revert-<something>
   git revert <bad-commit-sha>
   git push -u origin HEAD
   gh pr create --base main --head HEAD --title "Revert <bad thing>" --body ""
   gh pr merge --auto --squash --delete-branch
   ```

## I'm stuck on main with uncommitted changes

Never what we want, but recoverable:

1. Stash the changes:
   ```
   git stash push -m "work in progress"
   ```
2. Start a proper feature branch (run "Before Starting Work").
3. Pop the stash onto the new branch:
   ```
   git stash pop
   ```

## I committed something sensitive by accident

**Stop. Do not push.** Tell Ethan immediately. Removing secrets from git
history after they've been pushed is hard and the secret must be
rotated anyway. If it's only local:

```
git reset --soft HEAD~1   # undo the commit, keep changes staged
```
Then unstage the secret file and add it to `.gitignore`.
