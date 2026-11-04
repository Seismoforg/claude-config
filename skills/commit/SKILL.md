---
name: commit
description: Propose how to split the current changes into commits, commit them, then merge the feature branch into main and push, each step after the user's yes. Use when the user wants to commit, merge or push, or when the plan skill closes a plan.
---

# COMMIT

Every step that writes history asks first. A "no" ends the skill at that step; say what is left.

## 1. Read the state
- Branch: `git branch --show-current`. Base: `git symbolic-ref --short refs/remotes/origin/HEAD`
  minus `origin/`; no remote → `main`.
- Changes: `git status --short`, `git diff`, and every untracked file in full.
- Nothing to commit and nothing to merge → say so and stop.
- On the base branch itself → ask: create `feature/<slug>` first (recommended) / commit on base.
- Base has no commits yet → commit on base; there is nothing to branch from or merge into.

## 2. Propose the split
- One commit per logical change: one concern, builds on its own. Never mix a refactor with a
  feature, or formatting with logic.
- Message: Conventional Commits, `type(scope): subject`, imperative, ≤ 72 chars. The repo's log
  uses another style → use that.
- **Never** a `Co-Authored-By:` trailer or a "Generated with Claude" line.
- Never stage secrets (`.env`, keys, tokens). One shows up in the diff → stop and flag it.

Ask with `AskUserQuestion`, the split in the `preview` field (message + files per commit):
commit as proposed / one single commit / change (Other).

## 3. Commit
- Stage by explicit path, never `git add -A` or `git add .`.
- A hook fails → fix the cause and commit again. Never `--no-verify`.
- Show the result: `git log --oneline <base>..HEAD`.

## 4. Merge
Ask: merge `<branch>` into `<base>` / not now.
- `git switch <base>`, `git merge --no-ff <branch>`.
- Conflict → `git merge --abort`, report the conflicting files, stop.

## 5. Push
No remote → skip. Otherwise ask: push `<base>` / not now.
- `git push origin <base>`. Rejected → report the output and stop. Never force-push.

## 6. Clean up
After a successful merge: `git branch -d <branch>`. Never `-D`.
Report what was committed, merged, pushed, and anything skipped.
