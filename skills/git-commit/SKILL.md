---
name: git-commit
description: Use when the user wants to commit, push, or land a branch — merge it into the default branch and clean it up — invoked as /git-commit. Summarizes the working tree (staged or unstaged) into one or more English commit messages, then asks via multiple choice whether to make a single commit or a sensible split, whether to also push, and, off the default branch, whether to merge the branch in and delete it. Pull requests are NOT part of the default flow — gh is never consulted unless the user explicitly asks to open a PR. Owns the feature/NAME branch naming scheme. Never commits, pushes, opens a PR, merges, or deletes a branch without that confirmation.
---

# GIT COMMIT

Guided commit: read changes, propose message(s), confirm via multiple choice, then
execute exactly what was chosen. Messages in **English**. Never commit or push
before the user picks an action.

# THE PR TRIGGER — off unless the user asks
No `gh` probe, no PR option in STEP 3, no STEP 6 — unless the user asked for a PR.

**Triggered by** an imperative request meaning "open a PR", in the invoking message or earlier in the
same conversation: "erstell nen pr", "open a PR", "make a PR", "PR erstellen". Read it as INTENT, not
as a literal string.

**NOT a trigger:** a NEGATED or hypothetical mention ("no PR for this one", "what would the PR say")
· `gh` being installed · a GitHub-hosted remote · sitting on a feature branch · a previous run in
this session having opened one.

Not triggered → skip everything marked *(PR path)*. Triggered → those parts switch on, and the Step 3
confirmation still governs: the trigger authorizes OFFERING a PR, never opening one.

# STEP 1 — INSPECT
Gather staged AND unstaged before proposing:
- `git status --porcelain=v1 -b` — branch, ahead/behind, every changed path.
- `git diff` — unstaged. `git diff --staged` — staged.
- `git rev-parse -q --verify MERGE_HEAD` — a merge whose conflicts are ALL resolved shows no `U` codes in status; it exists only here.
- `git remote` — the remote NAMES → `<remote>`. Every command below uses the resolved name, never a hardcoded `origin`. Several → prefer `origin` if present, else ask which.
- *(PR path only)* `gh --version` + `git remote get-url <remote>` — a PR needs BOTH `gh` AND a GitHub-hosted remote; STEP 4 opens PRs only via `gh pr create`. GitLab/Bitbucket → Step 3 withholds the option. Probe fails → re-check in the OTHER available shell before concluding absence: a tool can sit on the OS PATH yet miss a POSIX shim's.
- **`<default>`, the default branch's NAME — resolved when a CONSUMER needs it**, remote or not. In order: `git symbolic-ref --quiet --short refs/remotes/<remote>/HEAD` (strip `<remote>/`) → else ask. **No remote → the first source cannot exist**, since `refs/remotes/<remote>/HEAD` is written by `git clone`, not by `git init` + `git remote add`; the question is then the only source. **Never assume main/master** and **never use `init.defaultBranch`**. **"Couldn't resolve" is NOT "not the default"**. **Resolve it AFTER the STOPs below have all passed** — its only consumers are Q0, Q3 and the two exceptions, none of which a stopped run reaches. Asking here is normal, not a defect; never "fix" it by hardcoding `main`.
- **No remote at all** → no shared default branch to protect: Q0 is not required, and Q2 offers no push (nor a PR). `<default>` is still RESOLVED, by the question — landing needs that name.
- Untracked files → note them (need `git add`).

Clean = nothing staged, nothing unstaged, AND nothing untracked. Untracked-only is NOT clean. Clean → say so and STOP; don't create an empty commit. **Except the two EXCEPTIONS at the end of this step — read them before stopping.** The STOPs below and the record-keeping paragraph still bind; both exceptions offer Q3, and Q3 reads its ahead-of-`<default>` input from that paragraph.

Unmerged paths (`U` codes) OR a merge in progress (`MERGE_HEAD` exists) → surface and STOP. Both, not either. This skill commits; it does not resolve merges.
Detached HEAD (`## HEAD (no branch)`) → surface and STOP. Commits made here are unreachable once you move away.

Record the current branch and — when a `<default>` was resolved — whether it IS that default, comparing against the resolved name. Record three more, all needed below:
- **UPSTREAM present?** For REPORTING only; the remote delete re-reads it live at STEP 4's land step 2, because a push in this same run can create one.
- **AHEAD of `<default>`?** `git rev-list --count <default>..HEAD`; non-zero means ahead. Nothing ahead → Q3 is not offered; say why. Run it only when `<default>` actually resolved, and never read its failure as an answer — unresolved → Q3 has no input and is not offered; say why.
- **AHEAD OF ITS UPSTREAM?** A DIFFERENT comparison from ahead-of-`<default>`, and the two are routinely conflated: a feature branch already merged into `<default>` locally is ahead of neither, while `<default>` itself with local commits is ahead of its upstream and ahead of nothing else.

Hygiene scan: flag obvious secrets (`.env`, key/token/credential files), large binaries, and build/generated artifacts. Don't stage them — surface them and suggest a `.gitignore` entry. Never blind-stage via `git add -A`.
**Scan excluded at least ONE path AND nothing survived it → surface them, suggest the `.gitignore` entries, and STOP.** Both halves required: over an EMPTY change set "every path was excluded" is vacuously true. Narrow on purpose — one `.env` beside real changes is the ordinary case: exclude it, commit the rest. Two consequences to state: **Q3's landing cannot run this session** (land step 1 STOPs on the file left in the tree), and on a branch also ahead of its upstream those commits stay unpushed — the push-only exception needs a clean tree and an untracked file is not clean. Say the count and that a push is available once the file is ignored or removed.

**PUSH-ONLY EXCEPTION.** Clean AND a remote exists AND the branch has commits the remote does not → do NOT stop. Skip STEP 2, go to STEP 3, which asks about pushing only. Read the state off the branch line:
- `## <branch>...<remote>/<branch> [ahead N]` — has an upstream, N unpushed. `git push`.
- `## <branch>` with no `...<remote>/<branch>` part — no upstream, so this branch does not exist on the remote. Not the same as "none of its commits are pushed": a branch cut from an already-pushed `<default>` shares every one of those. **Compute it: `git rev-list --count HEAD --not --remotes=<remote>`** — non-zero means pushable. It needs no `<default>`. **The argument order is load-bearing: `--not` inverts every ref that FOLLOWS it**, so `--not --remotes=<remote> HEAD` excludes HEAD too and reports 0 on a branch that has unpushed commits. There is no `[ahead]` marker here, which is exactly what a `feature` run leaves behind. Added nothing → the exception's own condition is FALSE; STOP and say so rather than offering to publish a duplicate of `<default>`. `git push -u` is the form. **A repo with no remote prints the identical `## <branch>`**, so `git remote` decides between them and must be read.

**LAND-ONLY EXCEPTION.** Clean AND the branch is AHEAD of `<default>` → do NOT stop, even with nothing unpushed. No remote needed: landing merges into a local name. Skip STEP 2, go to STEP 3, which asks about landing only.
- **Evaluate in THIS order, stopping at the first that fails:** tree clean · no `MERGE_HEAD` · not detached · MORE THAN ONE local branch (`git branch --list`; one branch means nothing to land INTO — free, needs no `<default>`) · `git rev-list --count <default>..HEAD` non-zero. The first four are free; only the last needs `<default>`, whose resolution can fall through to a QUESTION. "Not on `<default>`" is NOT a cheap pre-filter and is not in the list — you cannot know which branch is the default until you have resolved the name, and a zero ahead-count already excludes it. Where `<default>` has no free source the question fires on any clean run past the four free tests; say so plainly.
- **Ownership is NOT read here.** It decides Q3, not this exception. A feature-owned branch reaches STEP 3 and is told there why nothing is being asked.
- **Both exceptions can hold at once.** Q2 and Q3 then both apply: the ordinary STEP 3 round minus Q1. Neither overrides the other.
- **No remote → this DOES fire**, unlike the push-only exception. `<default>` resolves by question.

Everything else on a clean tree still STOPs: `## <branch>...<remote>/<branch>` with no `[ahead N]` — `[behind N]` alone included, this flow does not pull — and no remote at all; **unless the LAND-ONLY EXCEPTION fires**, which needs no remote. Detached HEAD and a merge in progress already STOPped above; a clean tree does NOT clear `MERGE_HEAD`.
Neither exception creates a commit of its own. A merge commit can still appear when Q3 lands the branch — that is Q3's doing, confirmed by Q3.

# STEP 2 — ANALYZE & PROPOSE
Prepare BOTH options:
1. **Single commit** — one message, when changes are one cohesive unit.
2. **Split into N commits** — group changed files by concern (feature vs fix vs docs vs config, or by module). Each group = its own `{files, message}`. Split only along real seams. Concerns interleaved WITHIN one file (i18n bundle, shared doc/config) can't be file-split — offer a combined commit, or STOP so the USER stages the hunks. Only SOME files interleaved → isolate the clean groups and confine the mixing to ONE; name which commit is mixed and why. Never patch-stage: `git add -p` needs a terminal you don't have.

**Then ORDER the groups so every commit builds.** Group B referencing what group A adds — an import, a script entry, a new file — lands after A. Concern decides the GROUPS, dependency decides their ORDER.
**Compiling is not the test — the commit's own CHECKS must pass too.** A registry/catalog entry and the check that VALIDATES it are ONE group, however different their concerns look.

Message format (English, Conventional-Commits-friendly, not mandatory):
- Imperative subject ≤ ~72 chars, no trailing period.
- Optional body (blank line, wrapped) when the "why" isn't obvious.
- No `Co-Authored-By:` / "Generated with Claude" line — see HARD RULES.

# STEP 3 — CONFIRM via AskUserQuestion (REQUIRED — see APPROVAL GATES, end of file)
**Arrived by one of STEP 1's EXCEPTIONS?** Read this block first; everything after it assumes there is something to commit. Three entry states — add a fourth and you add it here:
- **NORMAL** — a dirty tree. This block does not apply.
- **PUSH-ONLY** — clean, and the branch has commits the remote does not. Asks about pushing, on ANY branch.
- **LAND-ONLY** — clean, and the branch is ahead of `<default>`. Asks about landing.

**PUSH-ONLY and LAND-ONLY OVERLAP** — all three conditions at once. The round is their union: Q2 and Q3, the NORMAL round minus Q1. **Where a rule below depends on the difference it keys on whether Q2 IS IN THIS ROUND, never on the state name**, because that fact stays single-valued in the overlap.
- **Q0 — asked in neither.** Its only job is offering to branch BEFORE committing on `<default>`; there is no commit to make, and switching branches cannot move commits that already sit there.
- **Q1 — asked in neither.** SUPPRESSED, not asked with an empty option set.
- **Q2 — asked exactly when the PUSH-ONLY exception fired; it loses its commit half.** Options "Push" / "Don't push". A remote is guaranteed here. *(PR path only)* triggered → a third option "Push and open a PR"; it needs a branch ≠ `<default>`, and Q0 is not in this round to create one, so on `<default>` it is not offered.
- **Q3 — both states, and on LAND-ONLY it is the WHOLE round.** Keeps every precondition below, feature suppression included, but loses its commit half. Options here: "Keep the branch" / "Merge into `<default>` and delete the branch — here AND on `<remote>` if it is published there". The labels below both begin with "Commit"; asked unchanged they promise a commit this run cannot make.
  - **NO Q2 in this round → the label MUST also end "and push `<default>`".** **No remote at all → drop that clause too.** **Q2 IS in this round → the label stays as written above.**
  - **In a round without Q2, "Keep the branch" comes FIRST.**
  - **Q3 suppressed with no Q2 in the round → the round is EMPTY. Say why and STOP; never ask nothing.** **Q3 has FOUR suppression routes and only ONE yields a filename:** invoked BY `feature` step 7, a definite yes → say that, and that its own branch ask is where this branch's landing question lives. Slug search HIT → name that file and point at `feature` step 7. Cannot tell who invoked this run, or a linked worktree hid `features/` → say THAT, and that Q3 fails closed by design. Naming a file you did not find fabricates the one fact the user needs.
  - *(PR path only)* **Triggered, but no Q2 in this round → the PR option has no carrier.** Say plainly that a PR cannot be offered on this round and why, then ask the landing question as normal.

**The `Qn — ` prefixes and the parentheticals below are AUTHORING labels, not user-facing text.** Show the plain question: Q0 → "Commit on `<default>`, or branch first?" · Q1 → "How to commit?" · Q2 → "Push?" · Q3 → "Land the branch?".

On the **default branch** (the name Step 1 resolved) → Q0 is REQUIRED, asked alongside Q1/Q2, never folded into Q2:

**Q0 — Branch (default branch only):** "Commit directly on `<default>`" / "Create a new branch first".

**Q1 — How to commit:** "Single commit" (include the proposed subject) · "Split into N commits" (summarize groups + subjects). Trivial/one-concern tree → put "Single commit" first as recommended.

**Q2 — Commit only, or also push:**
- "Just commit" / "Commit and push". **Two options. No PR option.**
- *(PR path only)* Triggered → a third option, "Commit, push and open a PR".
- *(PR path only)* The PR option needs a branch ≠ default, but Q0 and Q2 are asked in the SAME round, so Q0's answer doesn't exist when Q2's options are built. The contradictory pair (Q0's commit-on-`<default>` option + Q2's PR option) IS selectable: it arrives → surface the conflict and re-ask Q0 + Q2 only (Q1's answer stands). Never silently override either answer. Same pair again → stop and report; don't loop.
- No remote → do not offer "Commit and push". *(PR path only)* a PR also needs a pushed branch, so it goes too; remote present but no `gh`, or a non-GitHub remote → drop the PR option only. Say why in every case.
- **Options are referred to by ROLE here — "Q2's PR option" — never by their literal label.**

**Q3 — Land the branch (off the default branch only):**
- Offered only when ALL hold: current branch ≠ `<default>`, the branch is AHEAD of `<default>`, and NO feature owns it. `feature` step 7 asks instead — it is the single owner of a feature branch's landing. Suppressed here, and say why: asked in both places, one branch collects two different answers.
- **Ownership does NOT expire at DONE.** A feature owns its branch until step 7 is FINISHED with it — its branch question asked AND the answer executed — and step 7 moves the file to `done/` BEFORE invoking this skill. `done/` proves nothing in either direction; a NON-terminal folder proves ownership.
- **How to decide it, in this order — and it FAILS CLOSED.** Any step that cannot reach an answer suppresses Q3. Guess "owned" and one run is missing a question the user can ask for again; guess "not owned" and one branch collects two landing answers and a remote branch is deleted under an authorization nobody gave.
  1. **Was this run invoked BY `feature` step 7?** Nothing on disk records it. Yes → Q3 stays suppressed. **Cannot tell → treat as yes and suppress.** A `/git-commit` the user typed in front of you is the only reliable no.
  2. Otherwise search for a feature file whose slug matches this branch. Root: `$(git rev-parse --show-toplevel)/features`. Branch scheme is `feature/<slug>`, ids are `YYYYMMDD-HHMM-<slug>.md`, so match `????????-????-<slug>.md` — **not** `*-<slug>.md`, which also matches a longer slug ending in yours. Search `draft/ pending/ approved/ in-progress/ ready-for-done/` only. **Hit → suppress Q3 and name the file. Clean miss with the directory PRESENT → Q3 may be offered.** Branch not of the form `feature/<slug>` → treat as a clean miss.
  3. **An ABSENT `features/` is not a clean miss.** It is routinely VCS-ignored, so a LINKED WORKTREE lacks it even when the project has it — and a linked worktree is where delegated workers run. Test: `git rev-parse --path-format=absolute --git-dir --git-common-dir` prints two paths, identical in the main worktree, different in a linked one. **`--path-format=absolute` is not optional** — without it the two come back in different FORMS from a subdirectory (`D:/repo/.git` vs `../.git`) and a plain string compare reports "linked" in the main worktree. Linked → suppress Q3 and say why. Main worktree and still no `features/` → the project does not use the feature workflow; Q3 may be offered.
- "Just commit, keep the branch" / "Commit, then merge into `<default>` and delete the branch — here AND on `<remote>` if it is published there".
- **The hygiene scan excluded a path → say HERE that landing cannot happen this run.** Land step 1 STOPs on anything left in the tree, so the merge-and-delete option is offering something it cannot deliver. That is this question's PRICE and it is invisible from anywhere else.
- **The label NAMES the remote delete because Q3's yes is what authorizes it.** Leave it unnamed and the user authorizes a remote mutation they were never shown.
- **Do NOT strip that clause off a never-pushed branch just because Step 1 saw no upstream.** Q2 and Q3 go out in the SAME round, so Q2's push can publish the branch before the land list runs. Word it "and on `<remote>` if it is published there"; land step 2 reads the truth. The clause drops only when NO remote exists at all.
- **The safety fact this option's description owes the reader:** the branch is merged by the time it is deleted, and `git branch -d` refuses — and stops the list — if it is not. Which half goes in the label and which in the description is APPROVAL GATES (`skills/_shared/blocks.md`), not this step.
- Q0 and Q3 can never both apply: Q0 exists only ON the default branch, Q3 only off it.
- *(PR path only)* **Q2 × Q3 is the same trap as Q0 × Q2.** The pair (Q2's PR option + Q3's merge-and-delete option) IS selectable: it arrives → surface the conflict and re-ask Q2 + Q3 only. Same pair again → stop and report. Never let the merge delete a branch `gh pr create` is about to use as its head.

Don't proceed until all applicable questions are answered. "Other"/cancel → do nothing, report it.

# STEP 4 — EXECUTE
- **New branch first** (if chosen): `git switch -c feature/<kebab-name>`. The `feature/` prefix is the scheme for EVERY branch this config creates — inside a `feature` run the slug is the feature file's own, timestamp dropped. Slug already carries the prefix → don't double it. **A slug that merely BEGINS with `feature-` is NOT that case — keep it whole, `feature/feature-x`.** This step owns the scheme.
- **Single commit:** `git add -- <paths>` (`git add -A` ONLY after the hygiene scan found nothing to exclude), then `git commit -m "<subject>" -m "<body>"`.
- **Split:** per group in order — `git add -- <that group's paths>` then **`git commit -m "<subject>" -m "<body>" -- <that group's paths>`**. The `-m` is not optional: without it git opens `core.editor`, and a captured subprocess has no one to answer it. Keep groups disjoint. **The pathspec is what leaves already-staged-but-unrelated changes for their own group.**
- **Push** (if chosen): `git push`; no upstream → `git push -u <remote> HEAD`.
- **Open PR** *(PR path only; if chosen)*: only after the push succeeded — `gh pr create --base <base> --head <head> --title "<title>" --body "<STEP 6 body>"`. Never `--fill`: it reuses the commit message and silently skips STEP 6. Push failed → STOP and report; never simulate an opened PR.
  - `<base>` — the default-branch name Step 1 resolved. Never assume `main`.
  - `<head>` — re-read it HERE: `git branch --show-current`. Step 1 ran before this step's `git switch -c`, so on the Q0="new branch" + PR path its record is the default branch.
  - `<title>` — Q1 "Single commit" → the commit subject. Q1 "Split" → a subject describing the branch as a whole. **Q1 SUPPRESSED (push-only run)** → same as the split case, built from the commits the PR will CONTAIN (`<base>..<head>`), NOT from the ones being pushed; those two sets differ on any branch already partly pushed.
- **Land the branch** (if Q3 chose it — or if `feature` step 7's own branch ask chose it and sent its executor straight here; that ask REPLACES Q3 on a feature-owned branch, and this list is the procedure for both): runs LAST and runs ONCE — after EVERY commit of the split, and after the PR bullet ABOVE. Never inside the per-group loop: a split leaves groups 2..N unstaged while group 1 commits, and a merge in the middle carries them across the `git switch` onto `<default>`. If you ever find yourself here with a PR open on this branch, stop and report instead. Then, in order:
  1. Tree must be clean — **STEP 1's definition, all three parts.** Anything left → STOP; never merge on top of it. Staged belongs in that list. **A path the hygiene scan excluded is still "left".**
  2. **Read the branch's upstream NOW, before anything is deleted** — `git rev-parse --abbrev-ref <branch>@{upstream}` (or `git ls-remote --heads <remote> <branch>`). NOT Step 1's record. And not later: step 6 needs this value, and by then step 5 has deleted the branch.
  3. `git switch <default>`. **Check the exit code; a failure here must never fall through to the merge.** Inside a LINKED worktree this fails when `<default>` is checked out in another one — exit 128. Any non-zero → report and STOP.
  4. `git merge --no-ff <branch>` — always a merge commit. Conflict → `git merge --abort`, report, STOP. **Any other non-zero exit** → report and STOP as well. Check the exit code, do not scan the output for the word "conflict".
  5. `git branch -d <branch>` — lower-case `-d`, never `-D`. It refuses, and that refusal is the signal to stop: report it, delete nothing, **and STOP the list here** — do not run 6 or 7. **Exit 1 is not one cause; three share it:** `not fully merged`, `cannot delete branch 'X' used by worktree at '<path>'`, and `branch 'X' not found`. NAME the cause before reporting one, in this order. `git rev-parse --verify --quiet refs/heads/<branch>` prints nothing and exits non-zero when there is NO SUCH BRANCH — check that first. It exists → `git branch --merged <default> --list <branch>` is EMPTY when genuinely unmerged, and prints a `+`-prefixed line when merged but checked out in another worktree. UNMERGED → the work is still on `<branch>`; say so and name it. The other two → the merge already landed, nothing is stranded. Never offer a switch-back that git will reject.
  6. Step 2 found an upstream → `git push <remote> --delete <branch>`. Found none → say so. Fails → the local delete stands; report the failure, never force.
     **The merge is staying local → do not delete the remote branch either.** Both or neither. **Decide it off ONE thing: does the answer that AUTHORIZED this landing NAME the `<default>` push?** Q3's label does not on a run that also asked a Q2, so there the push rides on Q2 alone: Q2's commit-only option → this bullet FIRES; Q2's push option → it does not. **A Q3 label from a round with NO Q2 DOES name it**, so there Q3's own yes governs both halves. Keyed on the ABSENCE OF A Q2, never on the state name. `feature` step 7's branch ask DOES name it. **Never key it on who CALLED you.** **Cannot tell which answer authorized this landing → this bullet APPLIES; delete nothing remote.**
  7. `<default>` is pushed only if Q2 chose push — `git push`, or `git push -u <remote> HEAD` when `<default>` itself has no upstream. Otherwise the merge stays local and STEP 5 says so. Never push it unasked. **Reached from `feature` step 7's branch ask** → that ask governs instead and its yes covers this push. The pairing is ASYMMETRIC: what is forbidden is a remote delete with the merge left local; a push with nothing to delete is harmless. **Q3 landing that ASKED a Q2** → step 6 ran → push `<default>`; step 6 did not → leave it local. **Q3 landing with NO Q2** → its label names the push. **Unless there is NO REMOTE**, where STEP 3 drops that clause. **`feature` step 7 landing** → push `<default>` whether or not there was a remote branch to delete — **unless no remote at all, where that ask drops its push clause.**
  **`<default>` must be BOUND before step 3 — CHECK it here, never re-resolve it.** Not bound → resolve by STEP 1's recipe now.

Multi-line messages → here-doc / multiple `-m`. Quote paths. **The subject is ONE physical line, and a blank line follows it.** Wrap the first line and git FOLDS the continuation into the subject, shipping a 100+ char subject with a doubled space at the seam.

# STEP 5 — REPORT
State exactly what happened: each commit's short hash + subject, the branch you ENDED on (Step 4 may have switched), whether pushed (+ where), and the PR URL if one was opened.

**A run that arrived by one of STEP 1's EXCEPTIONS made no commit of its OWN.** Say that in words instead of printing an empty list. One clause per half of the round; a run in the overlap prints two — unless Q3 was SUPPRESSED there, and then only Q2's. **Each keys on which QUESTION was in the round, never on the state name.**
- **Q2 in the round, push chosen** → no commit made, N already-existing commits pushed to `<remote>/<branch>`. N is Step 1's ahead-of-upstream record; a never-pushed branch has no N, so report the branch as newly published instead of inventing a count.
- **Q2 in the round, push DECLINED** → no commit made, nothing pushed, N commits still unpushed.
- **Q3 in the round, answered "Keep the branch"** → no commit made, nothing merged, nothing deleted, the branch kept. "Other"/cancel on Q3 reports the same. **Keyed on Q3 having been ASKED** — a SUPPRESSED Q3 is not a kept branch and gets no clause.
- **No Q2 in that round → "nothing pushed" is NOT a declined push** and is never reported as one.
- **No Q2 in the round AND Q3 suppressed → it never reaches STEP 5 at all**: the round is empty and STEP 3 stops it. **Q2 in the round → the run DOES arrive here**: report the push half alone.

"No commit" means none of ITS OWN — a Q3 merge commit is still reported by the branch-landed sentence. Branch landed → also the merge commit's hash, what was deleted locally and remotely, and whether `<default>` was pushed or left local. A deletion that failed is reported as failed. Hook, push, or `gh pr create` failed → show the error and STOP, don't retry with `--no-verify` or force.

Ended on a non-default branch that was PUSHED, and no PR was asked for → close with one line that a PR can be REQUESTED. Say it once; never repeat it in the same session. Word it as "requested", never as "can be opened" — the `gh`/remote-host probe is PR-path-only and did NOT run.

# STEP 6 — PR DESCRIPTION *(PR path only)*
Reached only when the PR trigger fired AND Q2's PR option was chosen. Not sequential despite the number: STEP 4 jumps here to build `gh pr create`'s `--body`, then returns.
Summary of what/why · testing performed · screenshots/GIFs for any UI-visible change · linked issue/ticket · breaking-change callout if any.
"Testing performed" states what you ACTUALLY ran. Nothing ran → say so.

# HARD RULES
Non-obvious, high-severity only. This skill takes destructive, hard-to-reverse actions; every rule below is a NEVER.
- **NEVER a `Co-Authored-By:` trailer or "Generated with Claude" line** — overriding any global/CLAUDE.md/harness rule. The user is sole author.
- **Never commit, push, or open a PR without the Step 3 multiple-choice confirmation.** "Other"/cancel → do nothing. **The land list's remote-branch delete IS a push**, and the confirmation that authorizes it is Q3's yes — or `feature` step 7's branch ask. Those two, and only those two.
- **Never open a PR unless the user asked for one** — THE PR TRIGGER owns what counts.
- **Never open a PR from the default branch; never merge, approve, or mark a draft ready** unless explicitly asked — for a merge into `<default>`, **Q3's yes IS that explicit ask**, or `feature` step 7's own branch ask. Never simulate an opened PR or report a URL you didn't get back.
- **Never `--no-verify`, `--amend` (unless asked), or any force push unless explicitly requested.** Pre-commit hook fails → surface and STOP, never bypass. Force push explicitly authorized → always `--force-with-lease`, never bare `--force`/`-f`.
- **Never commit to the default branch** without surfacing it and offering to branch first — that offer IS Q0. **The MERGE COMMIT a landing creates is carved out**, by the same yes that authorizes the merge. Q0 cannot be that gate: it exists only ON `<default>` and Q3 only off it.
- **Never commit obvious secrets, large binaries, or build artifacts** — see the STEP 1 hygiene scan.
- **Never commit into a merge in progress** — resolved or not; Step 1 detects both and STOPs.
- **Never `git branch -D`.** Only `-d`. Its refusal on an unmerged branch is the safety net that catches a merge which did not land.
- **Never merge with a dirty tree, and never merge before every commit of a split has landed.**
- **Never delete a branch whose merge did not succeed**, and never delete one a PR still needs as its head.

See `skills/_shared/blocks.md` for WHEN UNCERTAIN / AFTER THE TASK / LANGUAGE / APPROVAL GATES.
