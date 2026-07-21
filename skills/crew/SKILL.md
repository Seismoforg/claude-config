---
name: crew
description: Run a task through the feature lifecycle as a role-based crew — the main loop plays Teamleiter and dispatches worker agents (PM to plan, devs to build, a tester to validate) while keeping every approval gate itself. Use when the user wants a task handled by the "team" (Teamleiter/PM/devs/tester) rather than done inline, or asks to delegate a build to the crew. Composes with feature (owns the lifecycle + gates) and coding-standards.
---

# CREW

Runs work like a small team. The main loop is the **Teamleiter**: it takes the task, holds every gate,
and dispatches the workers. The workers are subagents — they cannot ask the user and cannot dispatch
each other, so all gating and all dispatch stay here, in the main loop. The drawn chain
(Teamleiter → PM → devs) is really a hub: Teamleiter at the centre, workers on the spokes.

Composes with: `feature` (REQUIRED — owns the lifecycle, the state machine, and EVERY approval gate; the
crew does not replace it, it delegates the work inside it) and the `feature` step 5 skill set, which
reaches the workers two ways:
- **Preloaded** (always applies): `coding-standards` for every worker; `documentation` for `pm` and `dev`.
- **Handed per dispatch** (surface-specific): `security-review` (sensitive code), `web-standards` (web/UI),
  `taste` (frontend design). Skills are not auto-discovered in a subagent, but a worker HAS `Read` — so
  the Teamleiter names the ABSOLUTE path of each applicable one and the worker reads it BEFORE writing.
  Baking these into `skills:` instead would load every rule into every dispatch, including backend work
  that needs none.
- **Teamleiter-only** (main loop): the shell-bound check a HANDED skill mandates — e.g. `taste`'s
  pre-flight — plus the final cross-cutting pass. A worker cannot run a handed skill's script: the
  skill-dir placeholder substitutes at skill LOAD, and a handed skill is only ever `Read`, so the worker
  gets the literal token. A PRELOADED skill's script is the opposite case — its placeholder does
  substitute, so `dev` (which holds `Bash`) can run `documentation`'s check-docs inside its worktree;
  `pm` cannot, having no shell. Repo-wide checks still run here, over the integrated whole.

`feature` step 5 says "invoke each skill via the Skill tool". No worker holds that tool, so inside the
crew the workers substitute handed-path + `Read`; the Teamleiter's own pass uses the Skill tool as
written. A deliberate deviation, recorded here so it does not read as a missed rule.

The Teamleiter still owns the final cross-cutting pass over the integrated result — workers writing with
the rules does not replace the review, it stops defects from being written in the first place.

# THE ROSTER
- **Teamleiter** — this main-loop seat (not an agent file). Receives the task, files specs, runs gates,
  dispatches everyone, owns coverage. Never delegates a gate.
- **PM — `pm` agent** ("Rieke"). Read-only. Plans: returns a DRAFT feature spec. Never files it, never gates.
- **Devs — `dev` agent** ("Kern", "Mara"). Executors, write in isolated worktrees. Two parallel seats,
  disjoint task-sets. Build only assigned tasks.
- **Tester — `tester` agent** ("Vera"). Read-only test designer: derives tests from the spec and returns
  the code as TEXT. You write it into the main checkout and run it — she never writes and never runs.

Names are handles, not costumes — reuse a name via SendMessage to continue that worker with its context.
Never for post-fix work, though: an isolated worker's worktree is frozen at a stale base and may already
be gone (THE INVARIANT). Dispatch a fresh one instead.

# CHOREOGRAPHY
`feature` owns the state transitions and gates; below is WHO does each step. Invoke `feature` and follow
its workflow — the crew only assigns the work.

1. **Intake (Teamleiter).** Read the task. Vague/exploratory → brainstorm first (`feature` step 0).
   Concrete → go on.
2. **Plan (PM).** Dispatch the `pm` agent with the task brief + repo AND the ABSOLUTE rule-source paths
   the BRIEF's surface implies (see DISPATCH RULES) — a web or auth feature must be PLANNED against those
   rules, not only built against them. The surface is readable from the brief; you do not need a task-set
   yet. It returns a spec (7 sections) + an OPEN list. Read it. PM is read-only → YOU write the DRAFT into
   /features/draft/ (`feature` step 1). OPEN items that need the user → resolve at the gate, not by guessing.
3. **Approval gate (Teamleiter).** `feature` step 2 — move to pending/, **STOP, AskUserQuestion**. A worker
   NEVER runs this. Then honour the choice `feature` offers:
   - **Approve & implement** (fast-path, `feature` step 2/4) → straight to in-progress/, then THROUGH
     step 4 (it establishes the working branch) and on to step 5. The fast-path collapses the folder
     rests, never step 4 itself.
   - **Approve, don't implement yet** → APPROVED, rest in approved/ (`feature` step 3), STOP. Resuming
     later re-enters at step 4, not step 5 — the branch may not exist yet in a new session.
   - Change spec → back to PM (step 2). Discard → discarded/.
4. **Implementation gate (Teamleiter).** Before any dev is dispatched, the file must be IN_PROGRESS in
   in-progress/. The fast-path already landed it there (step 3). Resuming a held feature (still APPROVED
   in approved/) → set status IN_PROGRESS, then move it (`feature` step 4). Folder and status always match.
   Then establish the WORKING BRANCH — every path into step 5 comes through here, including the
   fast-path and a later resume:
   - Resolve the DEFAULT branch name first; never assume main/master (`git-commit` STEP 1 owns the
     procedure — follow it, don't hand-roll). Already on a non-default branch for this feature → keep it.
   - Otherwise `git switch -c <feature-slug>`; the branch already exists (a resumed feature) →
     `git switch <feature-slug>`. `switch -c` errors on an existing branch, so try plain `switch` first
     when resuming.
   - The tree must be CLEAN before the first dispatch — merges land here, and a dirty tree turns an
     integration into a conflict you did not plan. Commit or stash first, or tell the user.
   The crew never builds on the default branch, and every merge below lands on this branch.
5. **Build (parallel devs, ISOLATED).** Split the approved Tasks into sets that touch DISJOINT files —
   tasks sharing a file go to the same dev. Dispatch the `dev` agent once per set, IN PARALLEL, EACH
   with `isolation: worktree` and a full DISPATCH BRIEF (below). Assign EVERY task explicitly; re-check
   coverage against the Tasks list before dispatch AND after merge — an unassigned task drops silently.
   **Dispatch the whole round before you merge anything.** Every worktree in a round is cut from the same
   base; commits you make mid-round are invisible to workers already dispatched, so a late dispatch would
   silently build on a different state than its peers.
   Each dev commits inside its worktree; you merge each branch in (see DISPATCH RULES). Then run a
   cross-cutting pass over the merged result with the applicable skills — the devs wrote WITH them, you
   confirm the whole holds together — plus the shell-bound checks for whichever skills ACTUALLY applied:
   `taste`'s pre-flight if this was a design surface (a worker that only READ the file could not run it),
   `documentation`'s check-docs if the change touched docs. Applied-but-unrun is not "clean"; a skill that
   never applied needs no run. Commit any fix you make in that pass.
6. **Test (Vera, read-only).** Dispatch the `tester` agent with a full DISPATCH BRIEF and **NO
   `isolation: worktree`** — do not mirror step 5's flag. She holds no write tools, so there is nothing
   to contain, and a worktree would only feed her a stale tree to read the code from. She is read-only:
   she returns the test code as TEXT and predicts red or green per test. **YOU** write that code into the
   main checkout and run it, and YOU report the real pass/fail — she never observed a run, so the result
   is yours to state, never hers.
   Triage the run before you act on it — the prediction is what makes this possible:
   - Code that does not RUN (syntax, wrong runner, missing import) → a defect in her deliverable, not in
     the product. Fix the test or send it back to her; never write it into the spec as a product task.
   - Predicted red, went red → the finding she was dispatched for. Real work.
   - Predicted red, went GREEN → the test is toothless or the promise was already met. Do not bank it as
     validation; work out which, and say so.
   - Predicted green, went red → a genuine regression, the most valuable outcome here.
   Why she does not run it herself: running means writing, writing means a worktree, and a worktree is
   cut from a base that may predate this very build (THE INVARIANT) — an isolated tester would faithfully
   test a version that lacks the work. Read-only sidesteps that instead of patching around it.
   Red → ADD the fix items to the spec's Tasks first (`feature` step 5: "Scope changes → update the spec
   first"), then fix in the MAIN LOOP. Never dispatch a fix round into a worktree: it would not contain
   the failing test you just wrote. Never proceed on red.
   **Bound the loop.** The same test still red after a fix attempt → stop, report the failure and your
   diagnosis, and ask before a third attempt. Two rounds that each close their named defects while opening
   new ones = not converging → report the pattern and ask. `feature` step 6 owns both rules; they apply
   here too, and grinding on without them is the exact failure this skill has already lived through.
7. **Validation + finish (Teamleiter).** `feature` step 6 — fill # Validation, move to ready-for-done/,
   **STOP, AskUserQuestion**. Then `feature` step 7 (DONE) and step 8 (`self-improve`), both main-loop.
   The devs' work is already on the working branch as merges; the tests you wrote in step 6 and any
   main-loop fixes are still loose in the tree. So step 7's commit ask routes through `git-commit`
   exactly as `feature` step 7 requires — it owns the confirmation, the default-branch gate, and push/PR.
   Never hand-roll a push or a PR.

# DISPATCH RULES
- **Every executor is isolated — no exceptions, and that is what keeps them safe.** An executor is by
  definition a parallel independent writer, so it always gets `isolation: worktree`; two devs without it
  corrupt each other's diffs. A role that must SEE earlier work cannot use a worktree at all (THE
  INVARIANT), so it is not built as an executor: make it read-only and have it return text. That is
  exactly why the tester is read-only and why fix rounds are main-loop work.
- **Assign every task; verify coverage twice** (before dispatch, after merge). Fanning a checklist
  to parallel workers with a gap drops that item with no error.
- **Hand surface rules as ABSOLUTE FILE paths.** Decide which apply — `web-standards` (web/UI), `taste`
  (frontend design), `security-review` (auth/sessions/input/external payloads). Join each onto the skills
  root (the parent of this skill's announced base directory) and pass the ABSOLUTE result. Point at the
  FILE, never the skill directory: `<skills-root>/taste/SKILL.md`, not `<skills-root>/taste` — `Read` on a
  directory errors, and the worker then falls into its read-failed branch and builds blind.
  None applies → hand none and say so. Applies but unnamed → the worker builds blind and flags FRICTION,
  which is YOUR miss, not its.
- **Hand the satellite files too, not just SKILL.md.** A handed file's own `reference/...` pointers are
  skill-relative and resolve only from an announced base directory, which a worker does not have — so they
  are dead on arrival. Pass every load-bearing companion explicitly, e.g. `taste/SKILL.md` AND
  `taste/reference/ai-tells.md` (the banned-pattern catalogue — taste without it is half a rule set).
  Cannot or will not hand one → say so in the brief, so the worker flags the gap instead of assuming
  coverage.
- **Merge a worker in; never copy paths out.** `git merge --no-ff <worker-branch>` (`git worktree list`
  names the branch). It carries deletions and renames, needs no path list, cannot half-apply, and IS the
  commit. MEASURED: against a worker that deleted one file, renamed a second and edited a third, the merge
  applied all three, while `git checkout <branch> -- <paths>` aborted on the deleted pathspec
  (`did not match any file(s) known to git`) and landed NOTHING. Only after the merge: remove the worktree
  and delete its branch — until then that branch is the sole copy.
- **Give each worker only its slice** — the PM the brief, each dev its disjoint task-set, the tester the
  spec. A worker widening its own scope is a defect, not initiative.
- **Model is a lever.** Workers default to the session model; downgrade a cheap mechanical task-set to a
  smaller model at dispatch (the Agent `model` param). Quality-critical build → leave it.
- **Workers report, they do not gate.** A worker's FRICTION line is evidence for you and for
  `self-improve` — carry it, act on it; never let a worker decide to proceed.

# THE INVARIANT
**A worker sees only its own worktree, cut from a base that may be older than yours — verify its
reported HEAD, never assume it matches.** MEASURED: two workers of different types, dispatched after a
commit landed on the working branch, both reported the tip as of SESSION START, not that commit; their
own `git worktree list` showed the main checkout ahead of them.
Everything else about isolation follows from this one line:
- Worktrees are for PARALLEL INDEPENDENT work. They cannot hand state from one worker to the next.
- A step that must SEE earlier work therefore cannot be a worktree worker at all. Build it read-only so
  it returns TEXT (the tester), or do it in the main loop (fix rounds). Do not try to hand it state.
- Dispatch a parallel round from a base you will not change until that round is merged.
- The feature spec is not in any worktree at all (`features/` is ignored) — hand its ABSOLUTE
  main-checkout path, which resolves fine from inside a worktree.
- Do NOT resume a finished worker via SendMessage for post-fix work: its worktree is frozen at that
  stale base, and may already have been removed. Dispatch a fresh one.

# DISPATCH BRIEF
Every worker dispatch carries all of it. A missing item is YOUR miss, not the worker's:
- Seat name (`Kern`, `Mara`, `Vera`, `Rieke`) and the role's scope.
- Its slice: the PM the task brief; a dev its disjoint task-set; the tester the spec's promises.
- **ABSOLUTE path to the feature spec in the MAIN checkout** — for every worker that CONSUMES a spec.
  Never a repo-relative path: `features/` does not exist inside a worktree. The PM dispatch is the one
  exception: it PRODUCES the spec, so there is none to hand yet.
- ABSOLUTE rule-source file paths that apply, plus their load-bearing companions.
- Executors only: report back `git branch --show-current` and `git rev-parse HEAD`. That turns the base
  assumption into a measurement you can fail on, and names the branch you will merge.

# HARD RULES
- **Every gate stays in the main loop.** Subagents have no AskUserQuestion channel — approval,
  ready-for-done, done, and commit are the Teamleiter's, always. A worker that "approves" is a bug.
- **No worker dispatches another worker.** Subagents cannot nest. All dispatch is the Teamleiter's.
- **The PM plans; it never writes feature state.** Only the main loop files specs and moves them between
  folders — chat and worker output are not feature state (`feature`: only /features files define state).
- **Executors write only in their worktree**, never the user's live tree; the Teamleiter integrates.
- **`feature` owns the lifecycle** — the crew never skips a state and never self-approves. Commits during
  the build are FINE and in fact required: in-worktree commits by workers, and the Teamleiter's
  integration commits on the working branch (`feature` step 5: "Intermediate commits during implementation
  are fine"). What waits for DONE is only the FINAL deliverable commit, and only on the user's opt-in via
  `git-commit`. It assigns work inside feature's gates; it does not replace them.

See `skills/_shared/blocks.md` for WHEN UNCERTAIN / AFTER THE TASK / LANGUAGE / APPROVAL GATES.
