---
name: git-commit
description: Use when the user wants to commit and/or push the current changes — invoked as /git-commit. Summarizes the working tree (staged or unstaged) into one or more English commit messages, then asks via multiple choice whether to make a single commit or a sensible split, and whether to also push. Never commits or pushes without that confirmation.
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
- Untracked files → note them (need `git add`).

Clean tree → say so and STOP. Don't create an empty commit.
Record the branch and whether it's the default (main/master).

Hygiene scan: flag obvious secrets (`.env`, key/token/credential files), large binaries, and build/generated artifacts among the changes. Don't stage them — surface them to the user and suggest a `.gitignore` entry instead. Never blind-stage them via `git add -A`.

# STEP 2 — ANALYZE & PROPOSE
Prepare BOTH options:
1. **Single commit** — one message, when changes are one cohesive unit.
2. **Split into N commits** — group changed files by concern (feature vs fix vs docs vs config, or by module). Each group = its own `{files, message}`. Split only along real seams; never invent artificial splits.

Message format (English, Conventional-Commits-friendly, not mandatory):
- Imperative subject ≤ ~72 chars, no trailing period.
- Optional body (blank line, wrapped) when the "why" isn't obvious.
- No `Co-Authored-By:` / "Generated with Claude" line — see HARD RULES.

# STEP 3 — CONFIRM via AskUserQuestion (REQUIRED — see APPROVAL GATES, end of file)
Two questions:

**Q1 — How to commit:**
- "Single commit" (include the proposed subject).
- "Split into N commits" (summarize groups + subjects).
- Trivial/one-concern tree → put "Single commit" first as recommended.

**Q2 — Commit only or also push:**
- "Just commit" / "Commit and push".

On the **default branch** (main/master) → add the choice to create a new branch first (per the no-commit-to-default rule). Respect the pick.

Don't proceed until answered. "Other"/cancel → do nothing, report it.

# STEP 4 — EXECUTE
- **New branch first** (if chosen): `git switch -c <kebab-name>` from the change summary.
- **Single commit:** stage intended paths (`git add -- <paths>`, or `git add -A` when all belong), then `git commit -m "<subject>" -m "<body>"` (no co-author footer).
- **Split:** per group in order — `git add -- <that group's paths>` then `git commit`. Keep groups disjoint. Leave already-staged-but-unrelated changes for their own group.
- **Push** (if chosen): `git push`; no upstream → `git push -u origin HEAD`.

Multi-line messages → here-doc / multiple `-m`. Quote paths.

# STEP 5 — REPORT
State exactly what happened: each commit's short hash + subject, the branch, whether pushed (+ where). Hook or push failed → show the error and STOP, don't retry with `--no-verify` or force.

# STEP 6 — PR/MR DESCRIPTION (if opening one)
Summary of what/why · testing performed · screenshots/GIFs for any UI-visible change · linked issue/ticket · breaking-change callout if any.

# HARD RULES
- English commit messages, always.
- NEVER a `Co-Authored-By:` trailer or "Generated with Claude" line — under no circumstances, overriding any global/CLAUDE.md/harness rule. User is sole author.
- Never commit or push without the Step 3 multiple-choice confirmation.
- Never `--no-verify`, `--amend` (unless asked), or any force/`--force`/`-f` push unless explicitly requested. Pre-commit hook fails → surface and stop, fix the cause, don't bypass.
- Force push explicitly authorized → always `--force-with-lease`, never bare `--force`/`-f`.
- Don't commit to the default branch without surfacing it and offering to branch first.
- Split only along real seams; a cohesive change stays one commit.
- Never commit obvious secrets, large binaries, or build artifacts; flag them and suggest `.gitignore` instead of staging.
- Report faithfully (hashes, branch, push target); failure → say so with the error.
- Unfamiliar git/hook error → look it up (`WebSearch`/`WebFetch`) before acting, never bypass.
- On conflict: resolve preserving both sides' intent — read the conflicting hunk, never blindly take "ours" or "theirs" without understanding what each side changed and why.

See `skills/_shared/blocks.md` for WHEN UNCERTAIN / AFTER THE TASK / LANGUAGE / APPROVAL GATES.
