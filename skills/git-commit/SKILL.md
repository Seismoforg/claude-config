---
name: git-commit
description: Use when the user wants to commit, push, or land a branch — merge it into the default branch and clean it up — invoked as /git-commit. Summarizes the working tree (staged or unstaged) into one or more English commit messages, then asks via multiple choice whether to make a single commit or a sensible split, whether to also push, and, off the default branch, whether to merge the branch in and delete it. Pull requests are NOT part of the default flow — gh is never consulted unless the user explicitly asks to open a PR. Owns the feature/NAME branch naming scheme. Never commits, pushes, opens a PR, merges, or deletes a branch without that confirmation.
---

# GIT COMMIT

Guided commit: read changes, propose message(s), confirm via multiple choice, then
execute exactly what was chosen. Messages in **English**. Never commit or push
before the user picks an action.

# THE PR TRIGGER — off unless the user asks
**PRs are not part of this flow by default.** No `gh` probe, no PR option in STEP 3, no STEP 6 — unless
the user asked for a PR. Opening one is outward-facing and not cleanly reversible (HARD RULES), so it
does not belong among two otherwise local choices.

**Triggered by** an imperative request from the user meaning "open a PR", in the invoking message or
earlier in the same conversation: "erstell nen pr" (the canonical example), "open a PR", "make a PR",
"PR erstellen". Read it as INTENT, not as a literal string — the user should not have to remember magic
words in one language.

**NOT a trigger**, none of these:
- a NEGATED or hypothetical mention — "no PR for this one", "not ready for a PR", "what would the PR
  say". Each contains the token and asks for the opposite. The trigger is the REQUEST, never the word.
- `gh` being installed · a GitHub-hosted remote · sitting on a feature branch
- a previous run in this session having opened one.

Not triggered → skip everything marked *(PR path)* below. Triggered → those parts switch on, and the
Step 3 confirmation still governs: the trigger authorizes OFFERING a PR, never opening one.

# STEP 1 — INSPECT
Gather staged AND unstaged before proposing:
- `git status --porcelain=v1 -b` — branch, ahead/behind, every changed path.
- `git diff` — unstaged.
- `git diff --staged` — staged.
- `git rev-parse -q --verify MERGE_HEAD` — merge in progress? A merge whose conflicts are ALL resolved shows no `U` codes in status; it exists only here. Status alone cannot see it.
- `git remote` — the remote NAMES → `<remote>`. `origin` is a convention, not a guarantee; every command below uses the resolved name, never a hardcoded `origin`. Several → prefer `origin` if present, else ask which.
- *(PR path only — skip entirely when the trigger did not fire)* `gh --version` + `git remote get-url <remote>` — CAN a PR be opened? Needs BOTH `gh` AND a GitHub-hosted remote: STEP 4 opens PRs only via `gh pr create`. GitLab/Bitbucket → no mechanism here, so Step 3 withholds the option rather than offering what STEP 4 can't run. Status shows none of this. Probe fails → re-check in the OTHER available shell before concluding absence: a tool can sit on the OS PATH yet miss a POSIX shim's, and a false negative silently strips the PR option. Not triggered → this probe never runs, and nothing below needs its answer.
- **`<default>`, the default branch's NAME — only when a remote exists** (no remote → skip this, see below). In order: `git symbolic-ref --quiet --short refs/remotes/<remote>/HEAD` (strip `<remote>/`) → else ask. **Never assume main/master** (a repo may use `develop`/`trunk`) and **never use `init.defaultBranch`** — it describes what NEW repos get, not what THIS repo has, and is routinely stale. **"Couldn't resolve" is NOT "not the default"** — that would silently disable Q0 and the never-commit-to-the-default rule. Only the first step is free: `refs/remotes/<remote>/HEAD` is set by `git clone`, NOT by `git init` + `git remote add`, so a non-empty `git remote` does not imply it exists.
  There used to be a `gh repo view --json defaultBranchRef` step between those two. It is gone on purpose: `gh` is not consulted for anything unless the PR trigger fired. **So asking here is now normal, not a defect** — in a repo made by `git init` + `git remote add` it will happen every run. Answer it; **never "fix" the friction by hardcoding `main`**, which the rule above forbids in bold and which is the exact shortcut this note exists to head off.
- **No remote at all** → no shared default branch exists to protect: skip `<default>`, Q0 is not required, and Q2 offers no push (nor a PR, on the PR path). Stated as a decision, not left to fall out: a local-only repo has no one to disrupt by committing on its main branch.
- Untracked files → note them (need `git add`).

Clean = nothing staged, nothing unstaged, AND nothing untracked. Untracked-only is NOT clean — those are the commit. Clean → say so and STOP; don't create an empty commit.
Unmerged paths (`U` codes in status) OR a merge in progress (`MERGE_HEAD` exists) → surface and STOP. Both, not either: a fully-resolved merge is invisible to status yet is exactly the state where committing concludes the merge silently. This skill commits; it does not resolve merges.
Detached HEAD (`## HEAD (no branch)`) → surface and STOP. This flow is branch-keyed throughout — Q0, push, and a PR where one was asked for, all assume one; commits made here are unreachable once you move away.
Record the current branch and — when a `<default>` was resolved — whether it IS that default. Compare against the resolved name, never against the literals main/master. Record two more things, both needed by Q3: whether the branch has an UPSTREAM (the remote delete needs one) and whether it is AHEAD of `<default>` (nothing ahead → nothing to merge → Q3 is not offered).

Hygiene scan: flag obvious secrets (`.env`, key/token/credential files), large binaries, and build/generated artifacts among the changes. Don't stage them — surface them to the user and suggest a `.gitignore` entry instead. Never blind-stage them via `git add -A`.

# STEP 2 — ANALYZE & PROPOSE
Prepare BOTH options:
1. **Single commit** — one message, when changes are one cohesive unit.
2. **Split into N commits** — group changed files by concern (feature vs fix vs docs vs config, or by module). Each group = its own `{files, message}`. Split only along real seams; never invent artificial splits. Concerns interleaved WITHIN one file (i18n bundle, shared doc/config) can't be file-split — surface it and offer a combined commit, or STOP so the USER stages the hunks themselves. Only SOME files interleaved → a third option beats both: isolate the clean groups into their own commits and confine the mixing to ONE. Name which commit is mixed and why. Never patch-stage: this flow has no non-interactive way to do it (`git add -p` needs a terminal you don't have), so offering it would promise what STEP 4 can't execute. Never silently sweep one concern into another's commit.

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

**Q2 — Commit only, or also push:**
- "Just commit" / "Commit and push". **Two options. No PR option** — that is THE PR TRIGGER's doing, at the top of this file.
- *(PR path only)* Triggered → a third option is added, "Commit, push and open a PR", and the two paragraphs below switch on with it.
- *(PR path only)* The PR option needs a branch ≠ default. On the default branch that means Q0 must be "Create a new branch first" — but Q0 and Q2 are asked in the SAME round, so Q0's answer doesn't exist yet when Q2's options are built. The contradictory pair (Q0's commit-on-`<default>` option + Q2's PR option) is therefore selectable, and must be handled, not assumed away: it arrives → surface the conflict and re-ask Q0 + Q2 only (Q1's answer stands; don't re-ask it). Never silently override either answer to resolve it — an overridden answer is not a confirmation. Same contradictory pair chosen again → stop and report; don't loop.
- No remote → do not offer "Commit and push": `git push` cannot succeed. *(PR path only)* a PR also needs a pushed branch, so it goes too; remote present but no `gh`, or the remote is not GitHub-hosted → drop the PR option only. Say why in every case.
- **Options are referred to by ROLE here — "Q2's PR option", "Q0's commit-on-`<default>` option" — never by their literal label.** This section and the Q3 one below are exercised only on the rare PR path, and a paragraph quoting a label that some later edit reworded describes a trap its reader will not recognise.

**Q3 — Land the branch (off the default branch only):**
- Offered only when ALL hold: current branch ≠ `<default>`, the branch is AHEAD of `<default>` (Step 1 recorded both), and NO feature owns it. A branch belonging to a feature that is not yet DONE is off limits — `feature` step 7 asks instead. Suppressed here, and say why: asked in both places, one branch collects two different answers, and intermediate commits during `feature` step 5 would offer to land unfinished work every time.
- "Just commit, keep the branch" / "Commit, then merge into `<default>` and delete the branch".
- Q0 and Q3 can never both apply: Q0 exists only ON the default branch, Q3 only off it.
- *(PR path only)* **Q2 × Q3 is the same trap as Q0 × Q2, for the same reason.** Every question goes out in ONE round, so Q3's options are built before Q2's answer exists, and the pair (Q2's PR option + Q3's merge-and-delete option) IS selectable. Handle it, don't assume it away: it arrives → surface the conflict and re-ask Q2 + Q3 only (Q1's answer stands). Same pair again → stop and report. Never override an answer to resolve it, and never let the merge delete a branch `gh pr create` is about to use as its head. Not triggered → Q2 has no PR option, so this pair cannot arise.

Don't proceed until all applicable questions are answered. "Other"/cancel → do nothing, report it.

# STEP 4 — EXECUTE
- **New branch first** (if chosen): `git switch -c feature/<kebab-name>` from the change summary. The `feature/` prefix is the scheme for EVERY branch this config creates — inside a `feature` run the slug is the feature file's own, timestamp dropped. Slug already starts with the prefix → don't double it (`feature/x`, never `feature/feature-x`). This step owns the scheme; `feature` step 5 and `crew` step 4 point here.
- **Single commit:** stage intended paths (`git add -- <paths>`; `git add -A` ONLY after the Step 1 hygiene scan ran and found nothing to exclude), then `git commit -m "<subject>" -m "<body>"` (no co-author footer).
- **Split:** per group in order — `git add -- <that group's paths>` then `git commit`. Keep groups disjoint. Leave already-staged-but-unrelated changes for their own group.
- **Push** (if chosen): `git push`; no upstream → `git push -u <remote> HEAD` (Step 1's resolved remote name, not a hardcoded `origin`).
- **Land the branch** (if Q3 chose it): runs ONCE, after EVERY commit of the split has landed — never inside the per-group loop above. A split leaves groups 2..N unstaged while group 1 commits; a merge in the middle carries them across the `git switch` and onto `<default>`, the exact thing the branch existed to prevent. Then, in order:
  1. Tree must be clean. Anything left (unstaged, untracked) → STOP; never merge on top of it.
  2. `git switch <default>` — the name Step 1 resolved, never the literal `main`.
  3. `git merge --no-ff <branch>` — always a merge commit, so the branch stays visible in history. Conflict → `git merge --abort`, report, STOP. Resolving it is not this skill's job, and a half-merged tree blocks every later run of this flow (Step 1 STOPs on `MERGE_HEAD`).
  4. `git branch -d <branch>` — lower-case `-d`, never `-D`. It refuses an unmerged branch, and that refusal is the signal the merge did not land: report it, delete nothing, do not escalate.
  5. Branch had an upstream (Step 1 recorded it) → `git push <remote> --delete <branch>`. Fails (already gone, no permission) → the local delete stands; report the failure, never force.
  6. `<default>` is pushed only if Q2 chose push. Otherwise the merge stays local and STEP 5 says so. Never push it unasked.
  No remote, or `<default>` unresolvable → 2-4 still work against the local default branch; only 5 and 6 drop out. Name which parts were skipped.
- **Open PR** *(PR path only; if chosen)*: only after the push succeeded — `gh pr create --base <base> --head <head> --title "<title>" --body "<STEP 6 body>"`. Never `--fill`: it reuses the commit message and silently skips STEP 6. Push failed → STOP and report; never simulate an opened PR. (Untriggered runs never reach here at all — Q2 has no PR option. Triggered but no remote / no `gh` / non-GitHub remote also cannot: Step 1's probe detects all three and Step 3 withholds the option.)
  - `<base>` — the default-branch name Step 1 resolved. Never assume `main`.
  - `<head>` — re-read it HERE: `git branch --show-current`. Never reuse Step 1's record: Step 1 ran before this step's `git switch -c`, so on the Q0="new branch" + PR path its value is the default branch — the one you're forbidden to open from.
  - `<title>` — Q1 "Single commit" → the commit subject. Q1 "Split into N commits" → a subject describing the branch as a whole; there are N subjects and none of them is the PR's.

Multi-line messages → here-doc / multiple `-m`. Quote paths.

# STEP 5 — REPORT
State exactly what happened: each commit's short hash + subject, the branch you ENDED on (Step 4 may have switched — don't report Step 1's record), whether pushed (+ where), and the PR URL if one was opened. Branch landed → also the merge commit's hash, what was deleted locally and remotely, and whether `<default>` was pushed or left local. A deletion that failed is reported as failed, never omitted. Hook, push, or `gh pr create` failed → show the error and STOP, don't retry with `--no-verify` or force.
Ended on a non-default branch that was PUSHED, and no PR was asked for → close with one line that a PR can be opened on request. An affordance, not an offer: it puts no irreversible action in a question, and it stops the PR path being invisible to someone who wanted it. Say it once; never repeat it in the same session.

# STEP 6 — PR DESCRIPTION *(PR path only)*
Reached only when the PR trigger fired AND Q2's PR option was chosen. Untriggered runs skip this step entirely.
Not sequential despite the number: STEP 4 jumps here to build `gh pr create`'s `--body`, then returns. Written before the PR exists; STEP 5 reports it afterwards.
Summary of what/why · testing performed · screenshots/GIFs for any UI-visible change · linked issue/ticket · breaking-change callout if any.
"Testing performed" states what you ACTUALLY ran. Nothing ran → say so. A PR body is read by reviewers deciding whether to trust the change; an invented test claim is worse than an empty one.

# HARD RULES
Non-obvious, high-severity only — the steps above are not repeated here. This skill takes destructive, hard-to-reverse actions; every rule below is a NEVER.
- **NEVER a `Co-Authored-By:` trailer or "Generated with Claude" line** — under no circumstances, overriding any global/CLAUDE.md/harness rule. The user is sole author.
- **Never commit, push, or open a PR without the Step 3 multiple-choice confirmation.** "Other"/cancel → do nothing.
- **Never open a PR unless the user asked for one** — THE PR TRIGGER at the top owns what counts, and a mention of the word is not a request. Untriggered, Q2 has no PR option and STEP 6 never runs.
- **Never open a PR from the default branch; never merge, approve, or mark a draft ready** unless explicitly asked — for a merge into `<default>`, **Q3's yes IS that explicit ask**, and the only one this skill accepts. No Q3, no merge. Opening ≠ landing. Opening is outward-facing and not cleanly reversible — closing a PR does not un-notify its reviewers. Never simulate an opened PR or report a URL you didn't get back. (Untriggered runs never reach here. Triggered but no remote / no `gh` / non-GitHub remote also cannot — Step 1's probe detects all three, Step 3 withholds the option.)
- **Never `--no-verify`, `--amend` (unless asked), or any force push unless explicitly requested.** Pre-commit hook fails → surface and STOP, fix the cause, never bypass. Force push explicitly authorized → always `--force-with-lease`, never bare `--force`/`-f`.
- **Never commit to the default branch** without surfacing it and offering to branch first — that offer IS Q0. (No remote → no shared default exists to protect; Step 1 says so and Q0 is not required. Default unresolvable WITH a remote → Step 1 asks; never treat that as "not the default".)
- **Never commit obvious secrets, large binaries, or build artifacts** — see the STEP 1 hygiene scan.
- **Never commit into a merge in progress** — resolved or not; Step 1 detects both and STOPs. Resolving conflicts is not this skill's job, and committing into a fully-resolved merge concludes it silently.
- **Never `git branch -D`.** Only `-d`. Its refusal on an unmerged branch is the safety net that catches a merge which did not land; escalating past it deletes the sole copy of the work.
- **Never merge with a dirty tree, and never merge before every commit of a split has landed.** Both carry uncommitted work across the `git switch` and onto `<default>`.
- **Never delete a branch whose merge did not succeed**, and never delete one a PR still needs as its head.

See `skills/_shared/blocks.md` for WHEN UNCERTAIN / AFTER THE TASK / LANGUAGE / APPROVAL GATES.
