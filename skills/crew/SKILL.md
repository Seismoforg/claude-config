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
crew does not replace it, it delegates the work inside it), `coding-standards` (how the devs write), and
— applied by the Teamleiter in the main loop, because executors CANNOT preload them (skills are not
auto-discovered in a subagent) — `security-review` (sensitive code), `web-standards` (web/UI), `taste`
(frontend design), `documentation` (architecture/APIs/AGENTS.md/ADRs), exactly as `feature` step 5 mandates.

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
2. **Plan (PM).** Dispatch the `pm` agent with the task brief + repo. It returns a spec (7 sections) + an
   OPEN list. Read it. PM is read-only → YOU write the DRAFT into /features/draft/ (`feature` step 1).
   OPEN items that need the user → resolve at the gate, not by guessing.
3. **Approval gate (Teamleiter).** `feature` step 2 — move to pending/, **STOP, AskUserQuestion**. A worker
   NEVER runs this. Then honour the choice `feature` offers:
   - **Approve & implement** (fast-path, `feature` step 2/4) → straight to in-progress/, build now (step 5).
   - **Approve, don't implement yet** → APPROVED, rest in approved/ (`feature` step 3), STOP. Build resumes
     from step 5 only when the user later says go.
   - Change spec → back to PM (step 2). Discard → discarded/.
4. **Implementation gate (Teamleiter).** Before any dev is dispatched, the file must be IN_PROGRESS in
   in-progress/. The fast-path already landed it there (step 3). Resuming a held feature (still APPROVED
   in approved/) → set status IN_PROGRESS, then move it (`feature` step 4). Folder and status always match.
5. **Build (Devs).** Split the approved Tasks into sets that touch DISJOINT files — tasks sharing a file go
   to the same dev, so parallel worktrees never collide. Dispatch the `dev` agent once per set, IN
   PARALLEL, EACH with `isolation: worktree` and its seat name. Assign EVERY task explicitly; re-check
   coverage against the Tasks list before dispatch AND after integration — an unassigned task drops silently. Each dev commits its finished tasks inside its
   worktree (intermediate commits are fine — `feature` step 5); YOU integrate each worktree's commits into
   the working tree. Then, over the integrated result, apply the cross-cutting skills `feature` step 5
   mandates for what this feature touches — `security-review` / `web-standards` / `taste` / `documentation`
   — in the main loop (the devs could not: they preload only `coding-standards`).
6. **Test (Tester).** Dispatch the `tester` agent with the spec + `isolation: worktree`. It writes tests
   against the spec, runs them, reports red/green. YOU integrate its committed tests into the working tree
   too — else they vanish with the worktree and the fix-devs never see the failing test. Red → back to
   step 5 with a fix task-set built ON the integrated failing test; never proceed on red.
7. **Validation + finish (Teamleiter).** `feature` step 6 — fill # Validation, move to ready-for-done/,
   **STOP, AskUserQuestion**. Then `feature` step 7 (DONE) and step 8 (`self-improve`), both main-loop.

# DISPATCH RULES
- **Executors always get `isolation: worktree`.** A dev or tester writing in the live tree defeats the
  containment the whole executor class rests on; two devs without worktrees corrupt each other's diffs.
- **Assign every task; verify coverage twice** (before dispatch, after integration). Fanning a checklist
  to parallel workers with a gap drops that item with no error.
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
- **`feature` owns the lifecycle** — the crew never skips a state, never self-approves, and makes no
  deliverable commit before DONE (in-worktree commits during build are fine — `feature` step 5). It
  assigns work inside feature's gates; it does not replace them.

See `skills/_shared/blocks.md` for WHEN UNCERTAIN / AFTER THE TASK / LANGUAGE / APPROVAL GATES.
