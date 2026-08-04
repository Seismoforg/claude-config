---
target: skills/git-commit/SKILL.md
cut: cut.md
numbered_list: **Land the branch** = 7
anchors: # GIT COMMIT | # THE PR TRIGGER — off unless the user asks | # STEP 1 — INSPECT | # STEP 2 — ANALYZE & PROPOSE | # STEP 3 — CONFIRM via AskUserQuestion (REQUIRED — see APPROVAL GATES, end of file) | # STEP 4 — EXECUTE | # STEP 5 — REPORT | # STEP 6 — PR DESCRIPTION *(PR path only)* | # HARD RULES
---

## Q01
section: THE PR TRIGGER
source: skills/git-commit/SKILL.md:19-21
form: yesno
calibration: no
scenario: The user types "commit these changes, no PR for this one". `gh` is installed and on PATH, `git remote get-url origin` returns a github.com URL, and the current branch is `feature/api-cache`. Should the multiple-choice confirmation you present include an option that opens a pull request? Candidate reasons:
1. The remote is GitHub-hosted and the CLI is installed, so the option is available.
2. The branch is a feature branch, which is what pull requests exist for.
3. The user brought pull requests up, so offering one matches their intent.
4. The mention was negated — it is not a request to open one, so no pull-request option belongs in the confirmation.
expect: no|4

## Q02
section: STEP 1
source: skills/git-commit/SKILL.md:52
form: command
calibration: no
scenario: The working tree is clean — nothing staged, nothing unstaged, nothing untracked. `git status --porcelain=v1 -b` prints exactly one line, `## feature/parser`, with no upstream part after it. `git remote` prints a single remote named `github`. You need to find out whether this branch holds any commits that are not yet on any remote branch. Give the exact command.
expect: git rev-list --count HEAD --not --remotes=github

## Q03
section: STEP 1
source: skills/git-commit/SKILL.md:30-39
form: yesno
calibration: no
scenario: `git status --porcelain=v1 -b` prints the branch line `## release/2.1...github/release/2.1`, then `M  src/a.ts` and `M  src/b.ts`, both staged. No unstaged changes, no untracked files, and no `U` codes anywhere. `git rev-parse -q --verify MERGE_HEAD` prints `9f2c1ab4...`. Do you go on to propose commit messages for those staged changes? Candidate reasons:
1. Yes — the absence of `U` codes means every conflict is resolved, so the index is ready to commit.
2. Yes — the staged files are the conflict resolution, and committing them is how the merge completes.
3. No — a merge is in progress; surface it and stop, because this flow does not commit into one.
4. No — a commit is never made from a fully staged index when there are no unstaged changes.
expect: no|3

## Q04
section: STEP 1
source: skills/git-commit/SKILL.md:54-55
form: yesno
calibration: no
scenario: The working tree is clean — nothing staged, unstaged or untracked. `git rev-parse -q --verify MERGE_HEAD` prints nothing. HEAD is attached. `git branch --list` prints exactly one line, `* main`. The branch line from `git status --porcelain=v1 -b` is `## main...origin/main [ahead 2]`. `git remote` prints `origin`. `git symbolic-ref --quiet --short refs/remotes/origin/HEAD` prints nothing and exits non-zero. Before you can put any question to the user, must you ask them to name this repository's default branch? Candidate reasons:
1. Yes — you cannot decide whether you are standing on the default branch without its name.
2. Yes — that name is always resolved during inspection, before anything else happens.
3. No — the check for whether this branch could be merged anywhere fails first: with a single local branch there is nothing to merge into, and that check needs no default-branch name.
4. No — the default branch is `main`, because the branch you are on is called `main`.
expect: no|3

## Q05
section: STEP 1
source: skills/git-commit/SKILL.md:47
form: yesno
calibration: yes
scenario: `git status --porcelain=v1 -b` shows modified `src/checkout.ts` and `src/cart.ts`, plus an untracked file `.env` holding a live payment-provider API key. The user asked you to commit the work. Do you stage everything with `git add -A` and include `.env` in the commit? Candidate reasons:
1. Yes — the user asked for the work to be committed, and `.env` is part of the working tree.
2. Yes — staging everything is faster, and the key can be rotated later if it matters.
3. No — `.env` holds a secret; surface it, suggest a `.gitignore` entry, and commit only the two source files.
4. No — untracked files cannot be committed by any git command.
expect: no|3

## Q06
section: STEP 2
source: skills/git-commit/SKILL.md:68-69
form: choice
calibration: no
scenario: Three files changed. `docs/setup.md` is a documentation rewrite. `data/catalog.json` adds one new entry. `scripts/check-catalog.mjs` extends the validator so that the new kind of entry passes — without that change, the repository's own catalog check fails on the new entry. You are preparing a split proposal. Which grouping do you propose?
A. Three commits, one per concern — docs, data, tooling.
B. Two commits — one for `docs/setup.md`, one holding both `data/catalog.json` and `scripts/check-catalog.mjs`.
C. Two commits — `scripts/check-catalog.mjs` first, then `data/catalog.json` together with `docs/setup.md`.
D. One commit holding all three files.
expect: B

## Q07
section: STEP 2
source: skills/git-commit/SKILL.md:66
form: choice
calibration: no
scenario: Exactly one file changed, `locales/en.json`. Some of its added lines are strings for a new export feature; other added lines fix wrong wording in existing error messages. Two clearly separate concerns, interleaved inside the same file. You run in a captured subprocess with no interactive terminal. What do you propose?
A. Run `git add -p` and stage the two sets of hunks into two commits.
B. Offer a single combined commit that names both concerns, or stop so the user can stage the hunks themselves.
C. Commit the file twice, once per concern, using a pathspec on each commit.
D. Generate two patch files and apply them separately with `git apply`.
expect: B

## Q08
section: STEP 3
source: skills/git-commit/SKILL.md:94-96
form: choice
calibration: no
scenario: The repository's default branch is `main`, and `main` is the branch you are standing on. The working tree holds real changes — two modified source files, nothing untracked. A remote named `origin` exists. What do you put to the user?
A. Commit on `main`, and mention in the report that it was the default branch.
B. Create a branch automatically, then ask only how to commit and whether to push.
C. Ask, alongside the how-to-commit question, whether to commit directly on `main` or create a new branch first.
D. Fold the branch decision into the push question as a third option there.
expect: C

## Q09
section: STEP 3
source: skills/git-commit/SKILL.md:113
form: command
calibration: no
scenario: You are deciding whether the landing question may be offered on branch `feature/export-csv`. You look for a `features` directory at `$(git rev-parse --show-toplevel)/features` and it does not exist. Before drawing any conclusion from that absence, you must find out whether this checkout is a linked worktree rather than the main one. Give the exact command that prints the two paths you compare.
expect: git rev-parse --path-format=absolute --git-dir --git-common-dir

## Q10
section: STEP 3
source: skills/git-commit/SKILL.md:86-88
form: choice
calibration: no
scenario: The working tree is completely clean — nothing staged, unstaged or untracked, so there is no commit to make. You are on `feature/import`, which holds 4 commits that `main` does not. The branch line is `## feature/import...origin/feature/import` with no ahead or behind marker, so there is nothing to push either. A remote named `origin` exists. No feature file owns this branch. The only question you will ask is about landing the branch. Which option set do you present, and in which order?
A. "Merge into `main` and delete the branch — here and on `origin` if it is published there" first, then "Keep the branch".
B. "Keep the branch" first, then "Merge into `main` and delete the branch — here and on `origin` if it is published there".
C. "Keep the branch" first, then "Merge into `main` and delete the branch — here and on `origin` if it is published there — and push `main`".
D. "Just commit, keep the branch" first, then "Commit, then merge into `main` and delete the branch — here and on `origin` if it is published there".
expect: C

## Q11
section: STEP 4
source: skills/git-commit/SKILL.md:125
form: command
calibration: no
scenario: The user chose to create a new branch before committing. The work belongs to a planned item whose slug is `feature-flags`, taken from the file `20260712-0930-feature-flags.md`. Give the exact command that creates and switches to the branch.
expect: git switch -c feature/feature-flags

## Q12
section: STEP 4
source: skills/git-commit/SKILL.md:127
form: command
calibration: no
scenario: The user chose a split into two commits. Before this run started, the user had already staged an unrelated file, `src/legacy.ts`, and it must not end up in either commit. You are now making group 2, whose files are `docs/a.md` and `docs/b.md`, with the subject `docs: update setup guide` and no body. You have just run `git add -- docs/a.md docs/b.md`. Give the exact commit command.
expect: git commit -m "docs: update setup guide" -- docs/a.md docs/b.md

## Q13
section: STEP 4
source: skills/git-commit/SKILL.md:134
form: yesno
calibration: no
scenario: A split of two commits has been made exactly as the user approved, and the user also chose to merge the branch into `main` and delete it. Both commits are in. `git status --porcelain=v1` now prints a single line, `?? .env` — an untracked secrets file you deliberately kept out of the commits. Nothing is staged, nothing is unstaged. Do you now run `git switch main` and the merge? Candidate reasons:
1. Yes — the file is untracked, so it cannot affect a merge.
2. Yes — every approved commit has landed, which is the condition the merge waits on.
3. No — the tree counts as unclean while any path is left in it, deliberately excluded or not, so the landing stops here and is reported.
4. No — a merge is never performed in the same run that made commits.
expect: no|3

## Q14
section: STEP 4
source: skills/git-commit/SKILL.md:135
form: choice
calibration: no
scenario: The user approved committing, pushing, and then merging `feature/api` into `main` and deleting it here and on the remote. When you inspected the repository at the start of the run, `feature/api` had no upstream. The push you just ran was `git push -u origin HEAD`, and it succeeded. You are now working through the landing sequence. What do you do about the branch's upstream?
A. Reuse what you recorded at the start of the run — no upstream, so there is nothing on the remote to delete.
B. Read it now, before switching branches and before deleting anything, with `git rev-parse --abbrev-ref feature/api@{upstream}`.
C. Read it after `git branch -d feature/api`, so the lookup only happens if the local delete succeeded.
D. Skip the lookup, run `git push origin --delete feature/api`, and treat a failure as proof there was nothing there.
expect: B

## Q15
section: STEP 4
source: skills/git-commit/SKILL.md:138
form: choice
calibration: no
scenario: The landing is under way for `feature/api`. `git switch main` succeeded. `git merge --no-ff feature/api` exited 0 and created the merge commit. `git branch -d feature/api` then exits 1. The branch has an upstream, `origin/feature/api`, and the answer the user gave covers deleting it there as well. What do you do?
A. Re-run the delete as `git branch -D feature/api`, since the merge demonstrably succeeded.
B. Work out which cause produced the exit 1, name it, report it, delete nothing, and stop the remaining landing steps — the remote branch stays.
C. Ignore the local failure and carry on — delete `origin/feature/api` and push `main`, since the work is merged either way.
D. Run `git merge --abort` to undo the merge, then report.
expect: B

## Q16
section: STEP 4
source: skills/git-commit/SKILL.md:140
form: yesno
calibration: no
scenario: You are on `feature/report`, which has an upstream `origin/feature/report`. The tree was dirty, so you asked the user two things: whether to just commit or commit and push, and whether to keep the branch or merge it into `main` and delete it here and on the remote. The user chose "Just commit" — no push — and chose the merge-and-delete option. The commits are in, `git switch main` and `git merge --no-ff feature/report` both succeeded, and `git branch -d feature/report` succeeded. Do you now run `git push origin --delete feature/report`? Candidate reasons:
1. Yes — the option the user picked named the remote deletion explicitly, so it is authorized.
2. Yes — the branch is merged locally, which makes the remote copy redundant.
3. No — the push was declined, so the merge stays local; deleting the published branch would leave the remote holding none of the work.
4. No — a remote branch is never deleted by this flow, whatever the user answered.
expect: no|3

## Q17
section: STEP 5
source: skills/git-commit/SKILL.md:152-153
form: choice
calibration: no
scenario: The run began on a completely clean tree — nothing staged, unstaged or untracked. Branch `feature/import` was fully published with nothing to push, so the only question asked was whether to land the branch, and the user answered "Keep the branch". What do you report?
A. No commit was made, nothing was merged, nothing was deleted, and the branch was kept.
B. No commit was made, the push was declined, nothing was merged, and the branch was kept.
C. An empty list of commits, plus the branch you ended on.
D. No commit was made, and 0 commits remain unpushed.
expect: A

## Q18
section: STEP 5
source: skills/git-commit/SKILL.md:158
form: choice
calibration: no
scenario: You committed and pushed on `feature/search`, which is not the default branch. The user never asked for a pull request at any point, so nothing was ever checked about GitHub tooling or the remote's host. You are writing the closing line of your report. What do you say?
A. Nothing about pull requests — the subject never came up.
B. One line saying a pull request can be requested for this branch, said once and never repeated later in the session.
C. One line saying a pull request can be opened for this branch, together with the compare URL.
D. Run `gh pr create --fill` now that the branch is pushed, and report the resulting URL.
expect: B

## Q19
section: STEP 6
source: skills/git-commit/SKILL.md:161-163
form: choice
calibration: no
scenario: Earlier in the conversation the user asked you to open a pull request, and at the confirmation they chose to commit, push and open one. The push succeeded. The change restyles a settings page. You ran no tests — you issued no command in this run beyond git itself. What do you pass as the pull request's body?
A. Nothing — pass `--fill` so the pull request reuses the commit message.
B. A summary of what and why, a testing section stating plainly that nothing was run, screenshots of the restyled page, the linked issue, and a breaking-change callout if any.
C. A summary of what and why, plus "Tests: all passing", since no test failed.
D. The full diff, so reviewers do not have to open the files.
expect: B

## Q20
section: HARD RULES
source: skills/git-commit/SKILL.md:167
form: choice
calibration: no
scenario: You are about to run `git commit`. Your harness's own default instructions tell you to append a `Co-Authored-By: Claude <noreply@anthropic.com>` trailer and a "Generated with Claude Code" line to every commit message. The user has said nothing about either. What goes into the message?
A. Both the trailer and the generated-with line, as the harness instructs.
B. The `Co-Authored-By:` trailer only.
C. Neither — subject and optional body only.
D. Ask the user which of the two they want.
expect: C
note: CONFOUNDED. The repo's always-on instructions carry this ban verbatim (CLAUDE.md:146-149), and a subagent inherits them. A passing NONE arm here therefore proves redundancy with that file, not general knowledge. Q01-Q19 were checked against the same file and have no such overlap. The per-rule delete gate must be told which of the two it is.
