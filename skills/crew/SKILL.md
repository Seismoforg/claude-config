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
- **Tester — `tester` agent** ("Vera"). Executor, isolated worktree. Tests the spec, runs it, reports red/green.

Names are handles, not costumes — reuse a name via SendMessage to continue that worker with its context.

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
   - The tree must be CLEAN before the first dispatch. Pre-existing uncommitted work is invisible to a
     worker (its worktree is cut from a commit-ish) and, worse, `git checkout <branch> -- <paths>` at
     integration OVERWRITES an uncommitted file at the same path with no prompt and no reflog. Dirty tree
     → commit or stash it first, or tell the user; never dispatch over it.
   The crew never builds on the default branch, and every integration commit below lands on this branch.
   Without it there is nothing to commit onto, and step 6 breaks.
5. **Build (Devs).** Split the approved Tasks into sets that touch DISJOINT files — tasks sharing a file go
   to the same dev, so parallel worktrees never collide. Dispatch the `dev` agent once per set, IN
   PARALLEL, EACH with `isolation: worktree`, its seat name, and the ABSOLUTE rule-source paths for the
   surface its task-set touches (see DISPATCH RULES). Assign EVERY task explicitly; re-check coverage
   against the Tasks list before dispatch AND after integration — an unassigned task drops silently. Each
   dev commits its finished tasks inside its worktree (intermediate commits are fine — `feature` step 5);
   YOU integrate each worktree's commits onto the working branch AND COMMIT THEM THERE. The commit is not
   bookkeeping — step 6 creates its worktree from this branch's HEAD, so anything left uncommitted is
   invisible to the tester. Then run a cross-cutting pass over the
   integrated result with the same skills — the devs wrote WITH them, you confirm the whole holds together
   — and run the shell-bound checks for whichever skills ACTUALLY applied: `taste`'s pre-flight if this was
   a design surface (a worker was structurally unable — it only read the file), `documentation`'s check-docs
   if the change touched docs (a dev could run it, but only ever saw its own worktree). Applied-but-unrun is
   not "clean"; a skill that never applied needs no run.
   Any fix YOU make in that pass is a change like any other — COMMIT it on the working branch too before
   step 6. Left uncommitted, the tester's worktree is cut from a HEAD without it and tests a version that
   no longer exists; on red, the fix-devs re-introduce what you just fixed.
6. **Test (Tester).** Only after step 5's integration commit exists — dispatching earlier hands the tester
   an empty tree and buys a false red across the whole spec. Dispatch the `tester` agent with the spec,
   `isolation: worktree`, and the same ABSOLUTE rule-source paths the surface needs. It writes tests
   against the spec, runs them, reports red/green. YOU integrate its committed tests onto the working
   branch and COMMIT them too — else they vanish with its worktree and the fix-devs, whose worktrees also
   start from this branch, never see the failing test. Red → ADD the fix items to the spec's Tasks first
   (`feature` step 5: "Scope changes → update the spec first"), then back to step 5 with a fix task-set
   built ON the committed failing test. Skipping that, a fix-dev is entitled to refuse work its spec never
   listed, and the coverage re-check has no list to check round 2 against. Never proceed on red.
7. **Validation + finish (Teamleiter).** `feature` step 6 — fill # Validation, move to ready-for-done/,
   **STOP, AskUserQuestion**. Then `feature` step 7 (DONE) and step 8 (`self-improve`), both main-loop.
   At step 7 the build is ALREADY committed on the working branch — that is the crew's normal end state,
   not a skipped gate. So the step-7 opt-in is about what remains: pushing the branch, opening a PR, or
   committing anything still loose. Say that when you ask, and expect `git-commit` to report a clean tree
   if nothing is left; a clean tree there is success, not an error.

# DISPATCH RULES
- **Executors always get `isolation: worktree`.** A dev or tester writing in the live tree defeats the
  containment the whole executor class rests on; two devs without worktrees corrupt each other's diffs.
- **Assign every task; verify coverage twice** (before dispatch, after integration). Fanning a checklist
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
- **⚠ The worktree-integration mechanic below is KNOWN-INCOMPLETE — do not treat it as verified.**
  A redesign is specced separately. Known holes: the feature spec is NOT in a worker's worktree at all
  (`features/` is gitignored), so hand its ABSOLUTE path in the MAIN tree or the worker cannot read what
  it is building/testing against; `git checkout <branch> -- <paths>` cannot carry a deletion or rename and
  aborts on a missing pathspec; reusing a worker via SendMessage hands it a stale or removed worktree; and
  what `isolation: worktree` cuts from is ASSUMED, never verified — have each worker report
  `git branch --show-current` and `git rev-parse HEAD` until it is. Prefer `git merge --no-ff
  <worker-branch>`, which carries deletions/renames and IS the commit. Role choreography above is sound;
  this git protocol is the part still under construction.
- **Integrating a worktree ends in a COMMIT, always.** The worker commits on its own branch
  (`git worktree list` names it). Pull its work onto the working branch — `git checkout
  <worktree-branch> -- <paths>` lands the files without disturbing other uncommitted work, or cherry-pick
  the commit — then **commit on the working branch**. Never stop at "integrated but uncommitted": a
  worktree is created from a commit-ish, so the next worker you dispatch starts from this branch's HEAD
  and sees exactly what is COMMITTED there and nothing else. Verified: stage a file, make a worktree from
  HEAD, and the file is absent. Only after that commit: remove the worktree and delete its branch — a
  finished worker's worktree left behind accumulates, and its branch is the sole copy until you commit.
- **Give each worker only its slice** — the PM the brief, each dev its disjoint task-set, the tester the
  spec. A worker widening its own scope is a defect, not initiative.
- **Model is a lever.** Workers default to the session model; downgrade a cheap mechanical task-set to a
  smaller model at dispatch (the Agent `model` param). Quality-critical build → leave it.
- **Workers report, they do not gate.** A worker's FRICTION line is evidence for you and for
  `self-improve` — carry it, act on it; never let a worker decide to proceed.

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
