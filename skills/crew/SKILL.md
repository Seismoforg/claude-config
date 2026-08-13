---
name: crew
description: Run a task through the feature lifecycle as a role-based crew — the main loop plays Teamleiter and dispatches worker agents (PM to plan, devs to build, a tester to validate) while keeping every approval gate itself. Use when the user wants a task handled by the "team" (Teamleiter/PM/devs/tester) rather than done inline, or asks to delegate a build to the crew. Composes with feature (owns the lifecycle + gates) and coding-standards.
---

# CREW

Runs work like a small team. The main loop is the **Teamleiter**: it takes the task, holds every gate,
and dispatches the workers. The workers are subagents — they cannot ask the user, and this repo
withholds the `Agent` tool from every one of them, so all gating and all dispatch stay here. The
drawn chain (Teamleiter → PM → devs) is really a hub: Teamleiter at the centre, workers on the
spokes.

Composes with: `feature` (REQUIRED — owns the lifecycle, the state machine, and EVERY approval gate;
the crew delegates the work inside it) and the `feature` step 5 skill set, which reaches the workers
two ways:
- **Preloaded** (always): `coding-standards` for every worker; `documentation` for `pm` and `dev`.
  The SKILL.md BODY only — a skill's `reference/` addenda are never preloaded and must be handed.
- **Handed per dispatch** (surface-specific): `security-review` (sensitive code) as a whole skill, plus
  `coding-standards`' surface addenda — `coding-standards/reference/web.md` (web/UI) and
  `coding-standards/reference/design.md` (frontend design). Skills are not auto-discovered in a
  subagent, but a worker HAS `Read` — so the Teamleiter names the ABSOLUTE path of each applicable one
  and the worker reads it BEFORE writing.
- **Scripts split by LOAD, not by role — whoever the placeholder resolves for owns the run.** A HANDED
  skill's script runs nowhere in a worker: the skill-dir placeholder substitutes at skill LOAD, and a
  handed skill is only ever `Read`. A PRELOADED skill's placeholder DOES substitute, so `dev` (which
  holds `Bash`) runs it inside its worktree; `pm` and `tester` hold no shell and run nothing.
  **Pre-flight is the `dev`'s** — `preflight.mjs` lives in `coding-standards/scripts/` and that skill
  is preloaded by every worker, so its invocation arrives already absolute. The DISPATCH BRIEF must
  name the run, or it happens nowhere. **The MANDATE to run it sits in the handed
  `coding-standards/reference/design.md`, not in the preloaded body** — say so in the brief, or a dev
  reading a rule about handed files declines the run as the Teamleiter's and it happens nowhere.
- **Teamleiter-only** (main loop): the final cross-cutting pass, plus every repo-wide check over the
  INTEGRATED whole — the one thing no worker can see from inside its own worktree.

`feature` step 5 says "invoke each skill via the Skill tool". No worker holds that tool, so inside the
crew the workers substitute handed-path + `Read`; the Teamleiter's own pass uses the Skill tool as
written. A deliberate deviation, recorded so it does not read as a missed rule.

# THE ROSTER
- **Teamleiter** — this main-loop seat (not an agent file). Receives the task, files specs, runs gates,
  dispatches everyone, owns coverage. Never delegates a gate.
- **PM — `pm` agent** ("Rieke"). Read-only. Plans: returns a DRAFT feature spec. Never files it, never gates.
- **Devs — `dev` agent** ("Kern", "Mara"). Executors, write in isolated worktrees. Two parallel seats,
  disjoint task-sets. Build only assigned tasks.
- **Tester — `tester` agent** ("Vera"). Read-only test designer: derives tests from the spec and returns
  the code as TEXT. You write it into the main checkout and run it — she never writes and never runs.

Names are handles, not costumes — reuse a name via SendMessage to continue that worker with its context.
Never for post-fix work: an isolated worker's worktree is frozen at a stale base and may already be
gone (THE INVARIANT). Dispatch a fresh one instead.

# CHOREOGRAPHY
`feature` owns the state transitions and gates; below is WHO does each step. Invoke `feature` and follow
its workflow — the crew only assigns the work. **Every number in this list is a CREW step unless it says
`feature`**; reading them as `feature` steps skips a gate.

1. **Intake (Teamleiter).** Read the task. Vague/exploratory, or named but underspecified → brainstorm
   first (`feature` step 0; its own test picks `drunken-genius` vs `feature-brainstorming`). Concrete →
   go on. `feature-brainstorming` RETURNS WITH THE DRAFT ALREADY WRITTEN, so CREW step 2 is done —
   run `feature` step 1.4, then 1.5, then 1.6 on that DRAFT, then go to CREW step 3. Dispatching the PM anyway
   writes a second spec for the same feature — and so does routing a later "Change spec" answer back to
   it. Refine that DRAFT in place instead, staying in NEEDS_APPROVAL as `feature` step 2 prescribes.
   **A DRAFT written in an EARLIER session is the different case: re-planning it is correct, not a
   second spec.** Its counts, file lists and blockers describe a tree that has since moved. Dispatch the
   PM with that spec plus what to re-verify, and fold the answer into the SAME file. The rule above
   forbids a second FILE, never a second look.
2. **Plan (PM).** Dispatch the `pm` agent with the task brief + repo AND the ABSOLUTE rule-source paths
   the BRIEF's surface implies (see DISPATCH RULES) — a web or auth feature must be PLANNED against
   those rules, not only built against them. The surface is readable from the brief; you do not need a
   task-set yet. It returns a spec (7 sections) + an OPEN list. Read it. PM is read-only → YOU write the
   DRAFT into /features/draft/ (`feature` step 1). **Transcribe the OPEN items that need the user into
   that DRAFT as `Open assumption:` lines** — the list arrives as a chat message, and only `/features`
   files are feature state. Split off any genuine skill defect first. Those lines ARE step 1.4's
   candidate list. Then run `feature` step 1.4, 1.5 and 1.6 yourself before CREW step 3 — the PM holds
   neither a user channel nor a gate, and all three must land while the spec is still a DRAFT. 1.6 also
   decides whether the build is dispatched to the devs in one pass or one milestone at a time.
3. **Approval gate (Teamleiter).** `feature` step 2 — move to pending/, **STOP. Ask via
   AskUserQuestion**. A worker NEVER runs this. Then honour the choice `feature` offers:
   - **Approve & implement** (fast-path) → straight to in-progress/, then THROUGH step 4 (it establishes
     the working branch) and on to step 5. The fast-path collapses the folder rests, never step 4 itself.
   - **Approve, don't implement yet** → APPROVED, rest in approved/, STOP. Resuming later re-enters at
     step 4, not step 5 — the branch may not exist yet in a new session.
   - **Change spec** → REVISE the existing DRAFT in place. It stays NEEDS_APPROVAL in pending/; never
     move it back to draft/. Needs a re-plan → re-dispatch the `pm` agent with the current spec and what
     must change, and fold its answer into that same file — the PM returns 7 sections and knows nothing
     of `# Open Questions` or `# Premortem`, so preserve BOTH sections yourself, re-run `feature` step
     1.4 if the revision opens a new question, re-run 1.5 if it newly crosses that threshold, and
     re-run 1.6 if the revision added, removed or re-ordered tasks. Discard → discarded/.
4. **Implementation gate (Teamleiter).** Before any dev is dispatched, the file must be IN_PROGRESS in
   in-progress/. The fast-path already landed it there. Resuming a held feature (still APPROVED in
   approved/) → set status IN_PROGRESS, then move it. Folder and status always match.
   Then establish the WORKING BRANCH — every path into step 5 comes through here:
   - Resolve the DEFAULT branch name first; never assume main/master (`git-commit` STEP 1 owns the
     procedure — follow it, don't hand-roll). Already on a non-default branch for this feature → keep it.
   - Otherwise `git switch -c feature/<feature-slug>`; the branch already exists (a resumed feature) →
     `git switch feature/<feature-slug>`. `switch -c` errors on an existing branch, so try plain
     `switch` first when resuming. `git-commit` STEP 4 owns the `feature/` scheme.
   - The tree must be CLEAN before the first dispatch — merges land here. Commit or stash first, or tell
     the user.
   The crew never builds on the default branch, and every merge below lands on this branch.
5. **Build (parallel devs, ISOLATED).** Split the approved Tasks into sets that touch DISJOINT files —
   tasks sharing a file go to the same dev. Dispatch the `dev` agent once per set, IN PARALLEL, EACH
   with `isolation: worktree` and a full DISPATCH BRIEF. Assign EVERY task explicitly; re-check coverage
   against the Tasks list before dispatch AND after merge.
   **Dispatch the whole round before you merge anything.** Every worktree in a round is cut from the same
   base; commits you make mid-round are invisible to workers already dispatched.
   Each dev commits inside its worktree; you merge each branch in (see DISPATCH RULES).
   **Transcribe that dev's `DEBT:` line into the feature file's `# Debt Found` section immediately
   after ITS merge** — the same moment as the after-merge coverage re-check, never "later". A worker's
   report is a chat message; untranscribed, the debt is gone when the round ends. `DEBT: none` needs
   nothing.
   **Tick that dev's finished tasks in `# Tasks` at the same moment, for the same reason.** A dev
   reports per task (`agents/dev.md` OUTPUT) and cannot write feature state at all — `features/` is in
   no worktree. A task the dev reported blocked stays unchecked and gets its reason on the line
   (`feature` step 6 owns that form).
   **Flip its TODO — that is the whole act.** You seeded the mirror at CREW step 4 (`feature` step 4 owns
   that rule), and `tick-sync.mjs` sets the box to follow; do not draw the box yourself. This seat needs
   the reminder most: a dev's report dies with the round, and a worker's OWN todo list never reaches the
   mirror — both hooks skip subagent-scoped calls, so nothing a dev does can move a box for you. Adding
   fix items to Tasks at CREW step 6 means re-seeding, or those items sit outside the mirror and
   `tick-guard.mjs` blocks until they are in it.
   Then run a cross-cutting pass over the merged result with the applicable skills, plus the shell-bound
   checks for whichever skills ACTUALLY applied: `coding-standards`' pre-flight if this was a design
   surface, `documentation`'s check-docs if the change touched docs — both over the INTEGRATED whole.
   **Neither is yours because a worker could not run it**: both skills are preloaded, so both
   placeholders resolve for a `dev`; your run covers what its worktree could not and does not replace
   it. A dev whose brief never named the run did not make it — check the brief you sent. Applied-but-unrun
   is not "clean"; a skill that never applied needs no run. Commit any fix you make in that pass.
   **A design surface also owes pass 2** — the reviewer dispatch in
   `coding-standards/reference/design.md` §14. That one IS yours: it is not a shell check, and no dev can
   ever make it, because no agent here holds the `Agent` tool. Commit what it makes you fix.
   **And pass 3's whole-page boxes.** Each dev ticked its own slice; several of §14's boxes are only
   checkable on the MERGED page — the theme/colour/shape locks, the zigzag cap, layout-family
   repetition, duplicate CTA intent. Two devs can each pass locally while the merged page fails every one.
6. **Test (Vera, read-only).** Dispatch the `tester` agent with a full DISPATCH BRIEF and **NO
   `isolation: worktree`** — do not mirror step 5's flag. She holds no write tools, and a worktree would
   only feed her a stale tree. She returns the test code as TEXT and predicts red or green per test.
   **YOU** write that code into the main checkout and run it (a run qualifying under LOCAL RESOURCE RUNS
   in `skills/_shared/blocks.md` asks the user first), and YOU report the real pass/fail — she never
   observed a run.
   **Decide WHERE that code lands before you dispatch her, and put it in the brief.** Repo has no test
   setup → do not invent one (`coding-standards`); pick a home the repo's own layout justifies, or agree
   one with the user. A suite with no home gets written, run once and discarded, leaving the defects it
   just proved fixed with no regression guard.
   Triage the run before you act on it — the prediction is what makes this possible:
   - Code that does not RUN (syntax, wrong runner, missing import) → a defect in her deliverable, not in
     the product. Fix the test or send it back to her; never write it into the spec as a product task.
   - Predicted red, went red → the finding she was dispatched for. Real work.
   - Predicted red, went GREEN → THREE causes, not two: the test is toothless, the promise was already
     met, or **the check never SAW the broken input** — its own filter excluded the shape it was built to
     catch. Work out which, and say so. The third hides, because the run reports clean. Catch it by
     comparing the run's COUNT of things inspected against its clean baseline: a count that FELL while
     you were breaking something is that case, every time.
   - Predicted green, went red → a genuine regression, the most valuable outcome here.
   Why she does not run it herself: running means writing, writing means a worktree, and a worktree is
   cut from a base that may predate this very build (THE INVARIANT).
   Red → ADD the fix items to the spec's Tasks first (`feature` step 5), then fix in the MAIN LOOP.
   Never dispatch a fix round into a worktree: it would not contain the failing test you just wrote.
   Never proceed on red.
   **Bound the loop.** The same test still red after a fix attempt → stop, report the failure and your
   diagnosis, and ask before a third attempt. Two rounds that each close their named defects while
   opening new ones = not converging → report the pattern and ask. `feature` step 6 owns both rules.
7. **Validation + finish (Teamleiter).** `feature` step 6 — fill `# Validation`, move to
   ready-for-done/, **STOP. Ask via AskUserQuestion**. Its debt bullet is yours alone: EVERY
   `# Debt Found` line becomes its own DRAFT — the ones you transcribed from devs in step 5 AND the
   ones your own main-loop work produced. Claim each with `new-feature.mjs` (`feature` STRUCTURE owns
   the invocation; never derive the id yourself). No worker can do ANY of it — `features/` is not in
   any worktree, so a dev cannot even run the claim, let alone write the file. Then `feature` step 7 (DONE) and step 8 (`self-improve`), both main-loop.
   The devs' work is already on the working branch as merges; the tests you wrote in step 6 and any
   main-loop fixes are still loose in the tree. Step 7's commit ask routes through `git-commit` exactly
   as `feature` step 7 requires. Never hand-roll a push or a PR.

# DISPATCH RULES
- **Every executor is isolated — no exceptions.** An executor is by definition a parallel independent
  writer, so it always gets `isolation: worktree`; two devs without it corrupt each other's diffs. A role
  that must SEE earlier work cannot use a worktree at all (THE INVARIANT), so it is not built as an
  executor: make it read-only and have it return text.
- **Assign every task; verify coverage twice** (before dispatch, after merge).
- **Hand surface rules as ABSOLUTE FILE paths.** Decide which apply — web/UI, frontend design,
  auth/sessions/input/external payloads. Join each onto the skills root (the parent of this skill's
  announced base directory) and pass the ABSOLUTE result. Point at the FILE, never the skill directory:
  `<skills-root>/security-review/SKILL.md`, not `<skills-root>/security-review` — `Read` on a directory
  errors, and the worker then falls into its read-failed branch and builds blind.
  None applies → hand none and say so. Applies but unnamed → the worker builds blind and flags FRICTION,
  which is YOUR miss.
- **Hand the satellite files too, not just the entry file.** A handed file's own `reference/...` pointers
  are skill-relative and resolve only from an announced base directory, which a worker does not have. A
  handed file may also point into ANOTHER skill (`<skill>/reference/...`) — equally dead. Resolve and
  hand every load-bearing companion, or name it as not handed: `security-review/SKILL.md` cites
  `coding-standards/reference/dependencies.md` for its CVE check, which is that second case — a security
  dispatch that adds no dependency still needs it named here.
  **A PRELOADED skill's satellites still have to be handed** — it has the SKILL.md body and nothing it
  points at. So `coding-standards`, preloaded by every worker, reaches a `dev` without any of its addenda:
  - `coding-standards/reference/frontend.md` — frontend/TS-JS work
  - `coding-standards/reference/python-ml.md` — Python/ML
  - `coding-standards/reference/dependencies.md` — a dependency added or upgraded
  - `coding-standards/reference/web.md` — web/UI work
  - `documentation/reference/agents-md-template.md` — the task creates a module doc
  - **A design surface takes `design.md` + `web.md` + `design-ai-tells.md` — all three, never
    `design.md` alone.** `design.md` defers to `web.md` for contrast thresholds, reduced motion and the
    CWV targets, and forbids restating them locally. `design-ai-tells.md` is the banned-pattern catalogue.
  - **The remaining `design-*` catalogues, handed BY TASK, not as a bundle:**
    `design-redesign-protocol.md` (any redesign — `design.md` says load it *before touching anything*),
    `design-design-directives.md` (composing a look), `design-install-commands.md` and
    `design-canonical-sources.md` (installing a real design system — `design.md` forbids hand-rolling its
    CSS, unfollowable without these), `design-liquid-glass.md`, `design-motion-skeletons.md` (motion
    work), `design-pattern-vocabulary.md` (naming or planning a layout/motion pattern),
    `design-block-library-schema.md` (authoring a block).
  Every one spelled from the skills root, never bare — a bare `reference/...` resolves inside THIS
  skill's directory, and `crew/reference/` does not exist.
  Cannot or will not hand one → say so in the brief, so the worker flags the gap instead of assuming
  coverage.
- **Merge a worker in; never copy paths out.** `git merge --no-ff <worker-branch>` (`git worktree list`
  names the branch). It carries deletions and renames, needs no path list, cannot half-apply, and IS the
  commit. `git checkout <branch> -- <paths>` aborts on a deleted pathspec (`did not match any file(s)
  known to git`) and lands NOTHING. Only after the merge: remove the worktree and delete its branch —
  until then that branch is the sole copy.
  Worker branches are EXEMPT from the `feature/` scheme: the harness names them when `isolation:
  worktree` is set and that flag takes no name, so you read it back from `git worktree list`.
- **Give each worker only its slice** — the PM the brief, each dev its disjoint task-set, the tester the
  spec. A worker widening its own scope is a defect, not initiative.
- **Model is a lever.** Workers default to the session model; downgrade a cheap mechanical task-set to a
  smaller model at dispatch (the Agent `model` param). Quality-critical build → leave it.
- **A brief carrying a qualifying run needs the user's yes BEFORE dispatch** — LOCAL RESOURCE RUNS in
  `skills/_shared/blocks.md`. A worker has no `AskUserQuestion`, so its brief IS its authorization:
  approved → the run may sit in the brief; not approved → the brief must not name it.
- **Workers report, they do not gate.** A worker's FRICTION line is evidence for you and for
  `self-improve` — carry it, act on it; never let a worker decide to proceed.

# THE INVARIANT
**A worker sees only its own worktree, cut from a base that may be older than yours — verify its
reported HEAD, never assume it matches.** A worktree is cut from the branch tip as of SESSION START,
not current HEAD. The measurement and the decision it forced live in
[ADR 0001](../../docs/adr/0001-tester-is-read-only-not-an-executor.md).
Everything else about isolation follows from this one line:
- Worktrees are for PARALLEL INDEPENDENT work. They cannot hand state from one worker to the next.
- A step that must SEE earlier work therefore cannot be a worktree worker at all. Build it read-only so
  it returns TEXT (the tester), or do it in the main loop (fix rounds).
- Dispatch a parallel round from a base you will not change until that round is merged.
- The feature spec is not in any worktree at all (`features/` is ignored) — hand its ABSOLUTE
  main-checkout path, which resolves fine from inside a worktree.
- Do NOT resume a finished worker via SendMessage for post-fix work: its worktree is frozen at that
  stale base, and may already have been removed.

# DISPATCH BRIEF
Every worker dispatch carries all of it. A missing item is YOUR miss, not the worker's:
- Seat name (`Kern`, `Mara`, `Vera`, `Rieke`) and the role's scope.
- Its slice: the PM the task brief; a dev its disjoint task-set; the tester the spec's promises.
- **ABSOLUTE path to the feature spec in the MAIN checkout** — for every worker that CONSUMES a spec.
  Never a repo-relative path: `features/` does not exist inside a worktree. The PM dispatch is the one
  exception: it PRODUCES the spec.
- ABSOLUTE rule-source file paths that apply, plus their load-bearing companions.
- **Paths by DIRECTION, never one blanket "absolute".** READ-ONLY inputs (the spec, rule sources) →
  MAIN-checkout absolute; they resolve fine from inside a worktree. WRITE TARGETS → the worker's OWN
  worktree: hand them repo-relative and let the worker join them onto its worktree root. Edit targets
  handed as main-checkout absolutes are REJECTED — "this agent is isolated in the worktree; edit the
  worktree copy instead".
- Executors only: the `DEBT:` line is EXPECTED — say so, so a knowingly-left shortcut comes back as a
  report instead of being filed (it cannot be) or dropped. `agents/dev.md` OUTPUT owns its format; you
  own the transcription (step 5) and the filing (step 7).
- Executors only: the shell-bound checks the task's own surface mandates — `coding-standards`' pre-flight
  on a design surface, `documentation`'s check-docs when the change touches docs.
- Executors only: the EXPECTED base — branch name AND commit — plus "check `git rev-parse HEAD` first;
  behind it → move onto that base before editing". A worktree is cut from the tip as of SESSION START,
  so every round after a merge starts stale, and briefed line numbers do not resolve until the worker
  fast-forwards. Naming the base is what makes the worker's own check actionable. They still report back
  `git branch --show-current` and `git rev-parse HEAD`; that names the branch you will merge.

# HARD RULES
- **Every gate stays in the main loop.** Subagents have no AskUserQuestion channel — the
  implementation-questions gate (`feature` step 1.4), approval, ready-for-done, done, and commit are
  the Teamleiter's, always. A worker that "approves" is a bug.
- **No worker dispatches another worker.** No agent here holds `Agent` — repo policy, enforced by
  `check-agents.mjs`, not a harness limit.
- **The PM plans; it never writes feature state.** Only the main loop files specs and moves them between
  folders — chat and worker output are not feature state.
- **Executors write only in their worktree**, never the user's live tree; the Teamleiter integrates.
- **`feature` owns the lifecycle** — the crew never skips a state and never self-approves. Commits during
  the build are FINE and in fact required: in-worktree commits by workers, and the Teamleiter's
  integration commits on the working branch. What waits for DONE is only the FINAL deliverable commit,
  and only on the user's opt-in via `git-commit`.

See `skills/_shared/blocks.md` for WHEN UNCERTAIN / AFTER THE TASK / LANGUAGE / APPROVAL GATES / LOCAL RESOURCE RUNS / TECHNICAL DEBT.
