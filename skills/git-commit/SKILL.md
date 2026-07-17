---
name: git-commit
description: Use when the user wants to commit and/or push the current changes — invoked as /git-commit. Summarizes the working tree (staged or unstaged) into one or more English commit messages, then asks via multiple choice whether to make a single commit or a sensible split, and whether to also push or additionally open a PR. Never commits, pushes, or opens a PR without that confirmation.
---

# GIT COMMIT

Guided commit: read changes, propose message(s), confirm via multiple choice, then
execute exactly what was chosen. Messages in **English**. Never commit or push
before the user picks an action.

# STEP 1 — INSPECT
Gather staged AND unstaged before proposing:
- `git status --porcelain=v1 -b` — branch, ahead/behind, every changed path.
- `git diff` — unstaged.
- `git diff --staged` — staged.
- `git rev-parse -q --verify MERGE_HEAD` — merge in progress? A merge whose conflicts are ALL resolved shows no `U` codes in status; it exists only here. Status alone cannot see it.
- `git remote` — the remote NAMES → `<remote>`. `origin` is a convention, not a guarantee; every command below uses the resolved name, never a hardcoded `origin`. Several → prefer `origin` if present, else ask which.
- `gh --version` + `git remote get-url <remote>` — CAN a PR be opened? Needs BOTH `gh` AND a GitHub-hosted remote: STEP 4 opens PRs only via `gh pr create`. GitLab/Bitbucket → no mechanism here, so Step 3 withholds the option rather than offering what STEP 4 can't run. Status shows none of this. Probe fails → re-check in the OTHER available shell before concluding absence: a tool can sit on the OS PATH yet miss a POSIX shim's, and a false negative silently strips the PR option.
- **`<default>`, the default branch's NAME — only when a remote exists** (no remote → skip this, see below). In order: `git symbolic-ref --quiet --short refs/remotes/<remote>/HEAD` (strip `<remote>/`) → else `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` → else ask. **Never assume main/master** (a repo may use `develop`/`trunk`) and **never use `init.defaultBranch`** — it describes what NEW repos get, not what THIS repo has, and is routinely stale. **"Couldn't resolve" is NOT "not the default"** — that would silently disable Q0 and the never-commit-to-the-default rule. Only the first step is free: `refs/remotes/<remote>/HEAD` is set by `git clone`, NOT by `git init` + `git remote add`, so a non-empty `git remote` does not imply it exists.
- **No remote at all** → no shared default branch exists to protect: skip `<default>`, Q0 is not required, and Q2 offers neither push nor PR. Stated as a decision, not left to fall out: a local-only repo has no one to disrupt by committing on its main branch.
- Untracked files → note them (need `git add`).

Clean = nothing staged, nothing unstaged, AND nothing untracked. Untracked-only is NOT clean — those are the commit. Clean → say so and STOP; don't create an empty commit.
Unmerged paths (`U` codes in status) OR a merge in progress (`MERGE_HEAD` exists) → surface and STOP. Both, not either: a fully-resolved merge is invisible to status yet is exactly the state where committing concludes the merge silently. This skill commits; it does not resolve merges.
Detached HEAD (`## HEAD (no branch)`) → surface and STOP. This flow is branch-keyed throughout — Q0, push and PR all assume one; commits made here are unreachable once you move away.
Record the current branch and — when a `<default>` was resolved — whether it IS that default. Compare against the resolved name, never against the literals main/master.

Hygiene scan: flag obvious secrets (`.env`, key/token/credential files), large binaries, and build/generated artifacts among the changes. Don't stage them — surface them to the user and suggest a `.gitignore` entry instead. Never blind-stage them via `git add -A`.

# STEP 2 — ANALYZE & PROPOSE
Prepare BOTH options:
1. **Single commit** — one message, when changes are one cohesive unit.
2. **Split into N commits** — group changed files by concern (feature vs fix vs docs vs config, or by module). Each group = its own `{files, message}`. Split only along real seams; never invent artificial splits. Concerns interleaved WITHIN one file (i18n bundle, shared doc/config) can't be file-split — surface it and offer a combined commit, or STOP so the USER stages the hunks themselves. Never patch-stage: this flow has no non-interactive way to do it (`git add -p` needs a terminal you don't have), so offering it would promise what STEP 4 can't execute. Never silently sweep one concern into another's commit.

Message format (English, Conventional-Commits-friendly, not mandatory):
- Imperative subject ≤ ~72 chars, no trailing period.
- Optional body (blank line, wrapped) when the "why" isn't obvious.
- No `Co-Authored-By:` / "Generated with Claude" line — see HARD RULES.

# STEP 3 — CONFIRM via AskUserQuestion (REQUIRED — see APPROVAL GATES, end of file)
On the **default branch** (the name Step 1 resolved — not the literal main/master) → Q0 is REQUIRED, asked alongside Q1/Q2, never folded into Q2 as an afterthought:

**Q0 — Branch (default branch only):**
- "Commit directly on `<default>`" / "Create a new branch first".

**Q1 — How to commit:**
- "Single commit" (include the proposed subject).
- "Split into N commits" (summarize groups + subjects).
- Trivial/one-concern tree → put "Single commit" first as recommended.

**Q2 — Commit only, push, or also open a PR:**
- "Just commit" / "Commit and push" / "Commit, push and open a PR".
- The PR option needs a branch ≠ default. On the default branch that means Q0 must be "Create a new branch first" — but Q0 and Q2 are asked in the SAME round, so Q0's answer doesn't exist yet when Q2's options are built. The contradictory pair ("Commit directly on `<default>`" + "Commit, push and open a PR") is therefore selectable, and must be handled, not assumed away: it arrives → surface the conflict and re-ask Q0 + Q2 only (Q1's answer stands; don't re-ask it). Never silently override either answer to resolve it — an overridden answer is not a confirmation. Same contradictory pair chosen again → stop and report; don't loop.
- No remote → offer NEITHER "Commit and push" nor the PR option: `git push` cannot succeed and a PR needs a pushed branch. Remote present but no `gh`, or the remote is not GitHub-hosted → drop the PR option only. Say why in every case.

Don't proceed until all applicable questions are answered. "Other"/cancel → do nothing, report it.

# STEP 4 — EXECUTE
- **New branch first** (if chosen): `git switch -c <kebab-name>` from the change summary.
- **Single commit:** stage intended paths (`git add -- <paths>`; `git add -A` ONLY after the Step 1 hygiene scan ran and found nothing to exclude), then `git commit -m "<subject>" -m "<body>"` (no co-author footer).
- **Split:** per group in order — `git add -- <that group's paths>` then `git commit`. Keep groups disjoint. Leave already-staged-but-unrelated changes for their own group.
- **Push** (if chosen): `git push`; no upstream → `git push -u <remote> HEAD` (Step 1's resolved remote name, not a hardcoded `origin`).
- **Open PR** (if chosen): only after the push succeeded — `gh pr create --base <base> --head <head> --title "<title>" --body "<STEP 6 body>"`. Never `--fill`: it reuses the commit message and silently skips STEP 6. Push failed → STOP and report; never simulate an opened PR. (No remote / no `gh` / non-GitHub remote cannot reach here — Step 1 detects all three and Step 3 withholds the option.)
  - `<base>` — the default-branch name Step 1 resolved. Never assume `main`.
  - `<head>` — re-read it HERE: `git branch --show-current`. Never reuse Step 1's record: Step 1 ran before this step's `git switch -c`, so on the Q0="new branch" + PR path its value is the default branch — the one you're forbidden to open from.
  - `<title>` — Q1 "Single commit" → the commit subject. Q1 "Split into N commits" → a subject describing the branch as a whole; there are N subjects and none of them is the PR's.

Multi-line messages → here-doc / multiple `-m`. Quote paths.

# STEP 5 — REPORT
State exactly what happened: each commit's short hash + subject, the branch you ENDED on (Step 4 may have switched — don't report Step 1's record), whether pushed (+ where), and the PR URL if one was opened. Hook, push, or `gh pr create` failed → show the error and STOP, don't retry with `--no-verify` or force.

# STEP 6 — PR DESCRIPTION (only when Q2 chose "Commit, push and open a PR")
Not sequential despite the number: STEP 4 jumps here to build `gh pr create`'s `--body`, then returns. Written before the PR exists; STEP 5 reports it afterwards.
Summary of what/why · testing performed · screenshots/GIFs for any UI-visible change · linked issue/ticket · breaking-change callout if any.
"Testing performed" states what you ACTUALLY ran. Nothing ran → say so. A PR body is read by reviewers deciding whether to trust the change; an invented test claim is worse than an empty one.

# HARD RULES
Non-obvious, high-severity only — the steps above are not repeated here. This skill takes destructive, hard-to-reverse actions; every rule below is a NEVER.
- **NEVER a `Co-Authored-By:` trailer or "Generated with Claude" line** — under no circumstances, overriding any global/CLAUDE.md/harness rule. The user is sole author.
- **Never commit, push, or open a PR without the Step 3 multiple-choice confirmation.** "Other"/cancel → do nothing.
- **Never open a PR from the default branch; never merge, approve, or mark a draft ready** unless explicitly asked. Opening ≠ landing. Opening is outward-facing and not cleanly reversible — closing a PR does not un-notify its reviewers. Never simulate an opened PR or report a URL you didn't get back. (No remote / no `gh` / non-GitHub remote never reaches here — Step 1 detects all three, Step 3 withholds the option.)
- **Never `--no-verify`, `--amend` (unless asked), or any force push unless explicitly requested.** Pre-commit hook fails → surface and STOP, fix the cause, never bypass. Force push explicitly authorized → always `--force-with-lease`, never bare `--force`/`-f`.
- **Never commit to the default branch** without surfacing it and offering to branch first — that offer IS Q0. (No remote → no shared default exists to protect; Step 1 says so and Q0 is not required. Default unresolvable WITH a remote → Step 1 asks; never treat that as "not the default".)
- **Never commit obvious secrets, large binaries, or build artifacts** — flag them, suggest `.gitignore`, never blind-stage via `git add -A`.
- **Never commit into a merge in progress** — resolved or not; Step 1 detects both and STOPs. Resolving conflicts is not this skill's job, and committing into a fully-resolved merge concludes it silently.

See `skills/_shared/blocks.md` for WHEN UNCERTAIN / AFTER THE TASK / LANGUAGE / APPROVAL GATES.
