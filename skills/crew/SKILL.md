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
reaches the workers two ways — the first two bullets. The last two say who RUNS what:
- **Preloaded** (always applies): `coding-standards` for every worker; `documentation` for `pm` and `dev`.
  The SKILL.md BODY only — a skill's `reference/` addenda are never preloaded and must be handed.
- **Handed per dispatch** (surface-specific): `security-review` (sensitive code) as a whole skill, plus
  `coding-standards`' surface addenda — `coding-standards/reference/web.md` (web/UI) and
  `coding-standards/reference/design.md` (frontend design). Skills are not auto-discovered in a subagent,
  but a worker HAS `Read` — so the Teamleiter names the ABSOLUTE path of each applicable one and the worker
  reads it BEFORE writing. Baking these into `skills:` instead would load every rule into every dispatch,
  including backend work that needs none.
- **Scripts split by LOAD, not by role — whoever the placeholder resolves for owns the run.** A HANDED
  skill's script runs nowhere in a worker: the skill-dir placeholder substitutes at skill LOAD, and a
  handed skill is only ever `Read`, so the worker gets the literal token. A PRELOADED skill's script is the
  opposite case — its placeholder does substitute, so `dev` (which holds `Bash`) runs it inside its
  worktree; `pm` and `tester` hold no shell and run nothing.
  **OBSERVED 20260803, on ONE live `pm` dispatch reading its own context:** the preloaded block opened
  with `Base directory for this skill: <absolute path>`, and the pre-flight invocation inside it arrived
  as a real path with no `${...}` token left. This paragraph asserted that before anyone had checked, and
  the repo carried the OPPOSITE claim in several other places at the same time.
  **One run, on a generative target, by an agent holding no shell** — so it establishes that the token is
  substituted, and NOT that the run then succeeds from a worker. Enough to stop asserting the opposite;
  not enough to found a mandate on. Repeat it before anyone does. `agents/pm.md` was the last site missing the
  correction — not asserting the old claim, just lacking the attempt-first instruction `agents/dev.md`
  carries. Corrected by `20260803-0005`. `skills/documentation/SKILL.md` never carried the claim
  either; it states only that its pointer is skill-relative and hands off to DISPATCH RULES below,
  which is correct as written.
  **Pre-flight is the `dev`'s for exactly that reason.** `preflight.mjs` lives in
  `coding-standards/scripts/` and `coding-standards` is preloaded by every worker, so its invocation
  arrives already absolute — the same case as `documentation`'s check-docs. The DISPATCH BRIEF must name
  the run, or it happens nowhere. **The MANDATE to run it sits in the handed
  `coding-standards/reference/design.md`, not in the preloaded body** — say so in the brief. A dev reading a rule about handed files otherwise
  declines the run as the Teamleiter's, reports FRICTION, and the pre-flight happens nowhere while both
  sides believe the other covered it. `agents/dev.md` now triggers on where the SCRIPT lives; the brief
  should not rely on that alone.
- **Teamleiter-only** (main loop): the final cross-cutting pass, plus every repo-wide check over the
  INTEGRATED whole — the one thing no worker can see from inside its own worktree.

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

1. **Intake (Teamleiter).** Read the task. Vague/exploratory, or named but underspecified → brainstorm
   first (`feature` step 0; its own test picks `drunken-genius` vs `feature-brainstorming`). Concrete →
   go on. `feature-brainstorming` RETURNS WITH THE DRAFT ALREADY WRITTEN, so CREW step 2 below is done —
   run `feature` step 1.4 (the implementation-questions gate) and then 1.5 (premortem) on that DRAFT,
   then go to CREW step 3, the approval gate. Every
   number in this list is a crew step unless it says
   `feature`; reading them as `feature` steps skips the gate. Dispatching the PM anyway writes a second
   spec for the same feature — and so does routing a later "Change spec" answer back to it. Refine that
   DRAFT in place instead, staying in NEEDS_APPROVAL as `feature` step 2 prescribes.
   **A DRAFT written in an EARLIER session is the different case: re-planning it is correct, not a
   second spec.** Its counts, file lists and blockers describe a tree that has since moved. Dispatch the
   PM with that spec plus what to re-verify, and fold the answer into the SAME file. The rule above
   forbids a second FILE, never a second look — and this is how a stale DRAFT gets a real plan stage
   instead of being waved through on numbers nobody rechecked.
2. **Plan (PM).** Dispatch the `pm` agent with the task brief + repo AND the ABSOLUTE rule-source paths
   the BRIEF's surface implies (see DISPATCH RULES) — a web or auth feature must be PLANNED against those
   rules, not only built against them. The surface is readable from the brief; you do not need a task-set
   yet. It returns a spec (7 sections) + an OPEN list. Read it. PM is read-only → YOU write the DRAFT into
   /features/draft/ (`feature` step 1). **Transcribe the OPEN items that need the user into that DRAFT as
   `Open assumption:` lines** — the list arrives as a chat message, and this skill's own authoritative rule
   says chat is never a spec source; untranscribed it dies exactly as an untranscribed `DEBT:` line does
   (CREW step 5). Split off any genuine skill defect first, as this step already tells you to. Those lines
   ARE step 1.4's candidate list, which is how an OPEN item reaches the user instead of being guessed.
   Then run `feature` step 1.4 (the implementation-questions gate) and 1.5 (premortem) yourself before
   CREW step 3 — the PM is read-only and holds neither a user channel nor a gate, so BOTH questioning the
   user about its plan and critiquing it are the Teamleiter's, and both must land while the spec is still
   a DRAFT.
3. **Approval gate (Teamleiter).** `feature` step 2 — move to pending/, **STOP. Ask via AskUserQuestion**. A worker
   NEVER runs this. Then honour the choice `feature` offers:
   - **Approve & implement** (fast-path, `feature` step 2/4) → straight to in-progress/, then THROUGH
     step 4 (it establishes the working branch) and on to step 5. The fast-path collapses the folder
     rests, never step 4 itself.
   - **Approve, don't implement yet** → APPROVED, rest in approved/ (`feature` step 3), STOP. Resuming
     later re-enters at step 4, not step 5 — the branch may not exist yet in a new session.
   - **Change spec** → REVISE the existing DRAFT in place. It stays NEEDS_APPROVAL in pending/ (`feature`
     step 2); never move it back to draft/. Needs a re-plan → re-dispatch the `pm` agent with the current
     spec and what must change, and fold its answer into that same file — the PM returns 7 sections and
     knows nothing of `# Open Questions` or `# Premortem`, so preserve BOTH sections yourself, re-run
     `feature` step 1.4 (the implementation-questions gate) if the revision opens a new question, and
     re-run 1.5 if it newly crosses that step's threshold. Sending it back to crew step 2
     unread writes a second spec and walks the state backwards. Discard → discarded/.
4. **Implementation gate (Teamleiter).** Before any dev is dispatched, the file must be IN_PROGRESS in
   in-progress/. The fast-path already landed it there (step 3). Resuming a held feature (still APPROVED
   in approved/) → set status IN_PROGRESS, then move it (`feature` step 4). Folder and status always match.
   Then establish the WORKING BRANCH — every path into step 5 comes through here, including the
   fast-path and a later resume:
   - Resolve the DEFAULT branch name first; never assume main/master (`git-commit` STEP 1 owns the
     procedure — follow it, don't hand-roll). Already on a non-default branch for this feature → keep it.
   - Otherwise `git switch -c feature/<feature-slug>`; the branch already exists (a resumed feature) →
     `git switch feature/<feature-slug>`. `switch -c` errors on an existing branch, so try plain
     `switch` first when resuming. The `feature/` prefix is the scheme EVERY branch this config
     creates follows; `git-commit` STEP 4 owns it.
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
   Each dev commits inside its worktree; you merge each branch in (see DISPATCH RULES).
   **Transcribe that dev's `DEBT:` line into the feature file's `# Debt Found` section immediately
   after ITS merge** — the same moment as the after-merge coverage re-check, never "later". A worker's
   report is a chat message, and only `/features` files are feature state; untranscribed, the debt is
   gone the moment the round ends. `DEBT: none` needs nothing.
   **Tick that dev's finished tasks in `# Tasks` at the same moment, for the same reason.** A dev
   reports per task (`agents/dev.md` OUTPUT) and cannot write feature state at all — `features/` is in
   no worktree. Untranscribed, its per-task result dies with the round exactly as an untranscribed
   `DEBT:` line does, and the checklist then says nothing was built. A task the dev reported blocked
   stays unchecked and gets its reason on the line (`feature` step 6 owns that form). Then run a
   cross-cutting pass over the merged result with the applicable skills — the devs wrote WITH them, you
   confirm the whole holds together — plus the shell-bound checks for whichever skills ACTUALLY applied:
   `coding-standards`' pre-flight if this was a design surface, `documentation`'s check-docs if the change
   touched docs — both over the INTEGRATED whole, the one thing a worker cannot see. **Neither is yours
   because a worker could not run it.** Both skills are preloaded, so both placeholders resolve for a `dev`
   and it runs them in its own worktree; your run covers what its worktree could not, and does not replace
   it. A dev whose brief never named the run did not make it — check the brief you sent before assuming it
   is covered. Applied-but-unrun is not "clean"; a skill that never applied needs no run. Commit any fix
   you make in that pass.
   **A design surface also owes pass 2** — the reviewer dispatch in
   `coding-standards/reference/design.md` §14. That one IS yours, and for the opposite reason: it is not
   a shell check, and no dev can ever make it because subagents do not nest. Yours, or it happens
   nowhere. Commit what it makes you fix, the same as above.
   **And pass 3's whole-page boxes.** Each dev ticked its own slice; several of §14's boxes are only
   checkable on the MERGED page — the theme/colour/shape locks, the zigzag cap, layout-family
   repetition, duplicate CTA intent. Two devs can each pass locally while the merged page fails every
   one. Tick those here, or nobody does.
6. **Test (Vera, read-only).** Dispatch the `tester` agent with a full DISPATCH BRIEF and **NO
   `isolation: worktree`** — do not mirror step 5's flag. She holds no write tools, so there is nothing
   to contain, and a worktree would only feed her a stale tree to read the code from. She is read-only:
   she returns the test code as TEXT and predicts red or green per test. **YOU** write that code into the
   main checkout and run it (a run qualifying under LOCAL RESOURCE RUNS in `skills/_shared/blocks.md`
   asks the user first), and YOU report the real pass/fail — she never observed a run, so the result
   is yours to state, never hers.
   **Decide WHERE that code lands before you dispatch her, and put it in the brief.** Repo has no test
   setup → do not invent one (`coding-standards`); pick a home the repo's own layout justifies, or agree
   one with the user. MEASURED: a suite with no home was written, run once and discarded, leaving the
   very defects it had just proven fixed with no regression guard.
   Triage the run before you act on it — the prediction is what makes this possible:
   - Code that does not RUN (syntax, wrong runner, missing import) → a defect in her deliverable, not in
     the product. Fix the test or send it back to her; never write it into the spec as a product task.
   - Predicted red, went red → the finding she was dispatched for. Real work.
   - Predicted red, went GREEN → THREE causes, not two: the test is toothless, the promise was already
     met, or **the check never SAW the broken input** — its own filter excluded the very shape it was
     built to catch, so the corpus silently shrank instead of failing. Work out which, and say so.
     The third hides, because the run reports clean. Catch it by comparing the run's COUNT of things
     inspected against its clean baseline: a count that FELL while you were breaking something is that
     case, every time.
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
   **STOP. Ask via AskUserQuestion**. Its debt bullet is yours alone: EVERY `# Debt Found` line becomes its own
   DRAFT in `/features/draft/` — the ones you transcribed from devs in step 5 AND the ones your own
   main-loop work produced (step 5's cross-cutting pass, step 6's fix rounds; you write code too).
   No worker can do it — `features/` is not in any worktree. Then `feature` step 7 (DONE) and `feature` step 8 (`self-improve`), both main-loop.
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
- **Hand surface rules as ABSOLUTE FILE paths.** Decide which apply — web/UI, frontend design,
  auth/sessions/input/external payloads. `security-review` is still a whole skill; web and design are now
  `coding-standards` addenda, and the satellite rule below owns their paths so this list is not kept twice.
  Join each onto the skills root (the parent of this skill's announced base directory) and pass the
  ABSOLUTE result. Point at the FILE, never the skill directory: `<skills-root>/security-review/SKILL.md`,
  not `<skills-root>/security-review` — `Read` on a directory errors, and the worker then falls into its
  read-failed branch and builds blind.
  None applies → hand none and say so. Applies but unnamed → the worker builds blind and flags FRICTION,
  which is YOUR miss, not its.
- **Hand the satellite files too, not just the entry file.** A handed file's own `reference/...` pointers
  are skill-relative and resolve only from an announced base directory, which a worker does not have — so
  they are dead on arrival. A handed file may also point into ANOTHER skill (`<skill>/reference/...`) —
  skills-root-relative, and equally dead. Resolve and hand every load-bearing companion, or name it as not
  handed: `security-review/SKILL.md` cites `coding-standards/reference/dependencies.md` for its CVE check,
  which is that second case. The rule below hands that same file, but only when a DEPENDENCY changes — a
  different trigger, so a security dispatch that adds no dependency still needs it named here.
  **A PRELOADED skill's satellites still have to be handed** — and this is the case that hides, because
  preloading feels like the worker already has everything. It has the SKILL.md body and nothing it
  points at. (A worker COULD join a preloaded pointer onto the base directory it is given — MEASURED,
  see the scripts bullet above — but hand the absolute path anyway: it is unambiguous, it costs
  nothing, and it is the only option for a handed file.) So `coding-standards`, preloaded by every
  worker, reaches a `dev` without any of its addenda:
  - `coding-standards/reference/frontend.md` — frontend/TS-JS work
  - `coding-standards/reference/python-ml.md` — Python/ML
  - `coding-standards/reference/dependencies.md` — a dependency added or upgraded
  - `coding-standards/reference/web.md` — web/UI work
  - `documentation/reference/agents-md-template.md` — the task creates a module doc
  - **A design surface takes `design.md` + `web.md` + `design-ai-tells.md` — all three, never
    `design.md` alone.** `design.md` defers to `web.md` five times for contrast thresholds, reduced
    motion and the CWV targets, and explicitly forbids restating them locally, so without it those
    boxes cannot be filled at all. `design-ai-tells.md` is the banned-pattern catalogue — the design
    rules without it are half a rule set.
  - **The eight remaining `design-*` catalogues, handed BY TASK, not as a bundle:**
    `design-redesign-protocol.md` (any redesign — `design.md` says load it *before touching
    anything*), `design-design-directives.md` (composing a look), `design-install-commands.md` and
    `design-canonical-sources.md` (installing a real design system — `design.md` forbids hand-rolling
    its CSS, which is unfollowable without these), `design-liquid-glass.md`, `design-motion-skeletons.md`
    (motion work), `design-pattern-vocabulary.md` (naming or planning a layout/motion pattern),
    `design-block-library-schema.md` (authoring a block). Handing all nine every time is noise; handing
    only the first two leaves a dev told to load a file it has never been given.
  Every one spelled from the skills root, never bare — a bare `reference/...` resolves inside THIS
  skill's directory, and `crew/reference/` does not exist.
  Cannot or will not hand one → say so in the brief, so the worker flags the gap instead of assuming
  coverage.
- **Merge a worker in; never copy paths out.** `git merge --no-ff <worker-branch>` (`git worktree list`
  names the branch). It carries deletions and renames, needs no path list, cannot half-apply, and IS the
  commit. MEASURED: against a worker that deleted one file, renamed a second and edited a third, the merge
  applied all three, while `git checkout <branch> -- <paths>` aborted on the deleted pathspec
  (`did not match any file(s) known to git`) and landed NOTHING. Only after the merge: remove the worktree
  and delete its branch — until then that branch is the sole copy.
  Worker branches are EXEMPT from the `feature/` scheme, deliberately: the harness names them when
  `isolation: worktree` is set and that flag takes no name, so you never choose it — you read it back
  from `git worktree list`. They are deleted minutes later and no human ever reads the name. Renaming
  one before the merge buys nothing and adds a failure mode between the worktree and the merge.
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
not current HEAD. The measurement behind that, and the decision it forced, live in
[ADR 0001](../../docs/adr/0001-tester-is-read-only-not-an-executor.md) — one owner, cited rather than
re-narrated here. Seen again in this skill's own runs: two workers of different types, dispatched
after a commit landed on the working branch, both reported the older tip, and their own
`git worktree list` showed the main checkout ahead of them.
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
- **Paths by DIRECTION, never one blanket "absolute".** READ-ONLY inputs (the spec, rule sources) →
  MAIN-checkout absolute; they resolve fine from inside a worktree. WRITE TARGETS → the worker's OWN
  worktree: hand them repo-relative and let the worker join them onto its worktree root. MEASURED:
  edit targets handed as main-checkout absolutes were REJECTED — "this agent is isolated in the
  worktree; edit the worktree copy instead" — and every dev in that round hit it.
- Executors only: the `DEBT:` line is EXPECTED — say so in the brief, so a knowingly-left shortcut
  comes back as a report instead of being filed (it cannot be) or dropped. `agents/dev.md` OUTPUT owns
  its format; you own the transcription (step 5) and the filing (step 7).
- Executors only: the shell-bound checks the task's own surface mandates — `coding-standards`' pre-flight
  on a design surface, `documentation`'s check-docs when the change touches docs. Both skills are
  preloaded, so a `dev` CAN run them in its worktree; left out of the brief it will not, and the check
  then exists only in your own pass over the integrated whole.
- Executors only: the EXPECTED base — branch name AND commit — plus "check `git rev-parse HEAD` first;
  behind it → move onto that base before editing". A worktree is cut from the tip as of SESSION START,
  so every round after a merge starts stale. MEASURED: three dispatches in one feature, each 2-3 commits
  behind, one of them dispatched AFTER the merge it needed; briefed line numbers did not resolve until
  the worker fast-forwarded. Naming the base is what makes the worker's own check actionable — without
  it the worker can measure the drift but not know what to correct to. They still report back
  `git branch --show-current` and `git rev-parse HEAD`; that names the branch you will merge.

# HARD RULES
- **Every gate stays in the main loop.** Subagents have no AskUserQuestion channel — the
  implementation-questions gate (`feature` step 1.4), approval, ready-for-done, done, and commit are
  the Teamleiter's, always. A worker that "approves" is a bug.
- **No worker dispatches another worker.** Subagents cannot nest. All dispatch is the Teamleiter's.
- **The PM plans; it never writes feature state.** Only the main loop files specs and moves them between
  folders — chat and worker output are not feature state (`feature`: only /features files define state).
- **Executors write only in their worktree**, never the user's live tree; the Teamleiter integrates.
- **`feature` owns the lifecycle** — the crew never skips a state and never self-approves. Commits during
  the build are FINE and in fact required: in-worktree commits by workers, and the Teamleiter's
  integration commits on the working branch (`feature` step 5: "Intermediate commits during implementation
  are fine"). What waits for DONE is only the FINAL deliverable commit, and only on the user's opt-in via
  `git-commit`. It assigns work inside feature's gates; it does not replace them.

See `skills/_shared/blocks.md` for WHEN UNCERTAIN / AFTER THE TASK / LANGUAGE / APPROVAL GATES / LOCAL RESOURCE RUNS / TECHNICAL DEBT.
