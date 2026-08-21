---
name: feature
description: Use when planning, specifying, approving, tracking, or implementing new features. Manages the /features lifecycle, state transitions, approval gates, and completion validation.
---

# FEATURE SYSTEM

Manages all feature lifecycle ops in `/features`.

Authoritative rule: **only files inside `/features` define feature state.** Chat is never a spec source. A requirement that exists only in chat does not exist until written into a feature file.

# ON ACTIVATION — STATE CHECK FIRST
Before anything else:
0. Bare invocation (no feature named/described) → don't guess. Show current non-terminal features (draft, pending, approved, in-progress, ready-for-done) and ask via AskUserQuestion what to do (include a "Brainstorm a new feature" option → Workflow step 0). Proceed only once a feature/intent is chosen. **Describing a candidate means READING it end to end, never grepping its Summary or Solution.** A spec's later sections can invert its earlier ones — an update, an amendment note, a gate task that says to discard it first.
0.5. Request reads as another skill's dedicated trigger (whole-system audit, ad-hoc bug hunt) → surface the mismatch, ask before hand-rolling it inside feature.
0.7. Request is FILING A RECORD rather than proposing work — technical debt (TECHNICAL DEBT in `skills/_shared/blocks.md`), or an audit finding the user DECLINED (`audit-solution` STEP 5) → **write-only entry**. Claim the file with `new-feature.mjs` (STRUCTURE) and write the spec into it, status DRAFT, minimal, and STOP. Skip steps 0, 1.4, 1.5, 1.6 and 2 entirely: no brainstorm router, no implementation-questions gate, no premortem, no milestone cut, no approval gate, no folder move. It re-enters the workflow later, when the USER picks it up out of `draft/`.
1. Identify which feature the request refers to (name or timestamp).
2. Exists → open it, read `status`, confirm folder matches status (MECHANICAL CHECK below — run it, don't eyeball). Folder ≠ status → STOP and report the mismatch, don't guess.
3. Doesn't exist → new feature, start at Workflow step 0. Step 0's first branch sends an already-specified request straight on to step 1; entering at step 1 directly skips the router.
4. State the current status + the single allowed next action, then proceed.

Never plan/approve/implement/validate/change status without this check.

# STRUCTURE
Path: `/features/<state-folder>/<timestamp>-<slug>.md`
Slug: lowercase-kebab, no spaces. Example: `/features/pending/20260124-1530-user-auth.md`

**NEVER derive the id yourself. A script does it, and it also CREATES the file:**
```
node ${CLAUDE_SKILL_DIR}/scripts/new-feature.mjs <slug> [--folder <state>] [--root <project>]
```
It prints the path it claimed, on stdout, and nothing else. Write your content into that file. `--folder` defaults to `draft`; `--root` to the shell CWD, so pass it when the CWD is not the project holding `features/`.
**It cannot run → STOP and report.** Never fall back to deriving an id by hand: that is the exact defect this replaces, and a hand-built id looks completely normal, so the regression would be invisible.

The contract it implements, stated here because a script says what it DOES and never what it is ALLOWED to do:
- `YYYYMMDD-HHMM` is a real local clock time — both halves. A run just after midnight therefore files under tomorrow's date, which is correct.
- The date is fixed for one run: a candidate rolling past `2359` wraps to `0000` of the SAME day, never to tomorrow.
- Creating the file empty IS the claim, and it is atomic. Two sessions in one minute cannot collide.
- An id is taken if it exists in ANY of the seven state folders — a feature is identified by its timestamp alone.
- An empty spec left behind is a claim nobody wrote into: `abandoned-claim`, fixed in place.

One feature per file. Chronological by filename. No index file. One request bundling multiple independent features → split into separate files; ambiguous grouping → confirm the split with the user.

# STATE MACHINE
```
/features/draft/         → DRAFT          → refine, questions gate (1.4), premortem (1.5), milestone cut (1.6), then request approval
/features/pending/       → NEEDS_APPROVAL → wait for user
/features/approved/      → APPROVED       → move to in-progress, then implement
/features/in-progress/   → IN_PROGRESS    → implement, then validate
/features/ready-for-done/→ READY_FOR_DONE → wait for user confirmation
/features/done/          → DONE           → terminal
/features/discarded/     → DISCARDED      → terminal (abandoned before DONE)
```
Discard is the one non-linear exit: from any pre-DONE state the user may discard → set status DISCARDED, move to `/features/discarded/`. Never silently delete a feature file.

**A spec's own GATE task can refute the spec, and there is no backward edge to DRAFT.** A task whose stated job is to decide whether the approach WORKS — a measurement, a spike, a probe — coming back negative kills the SOLUTION, not the Problem. So: DISCARD it, recording the evidence and NAMING the successor, then file the re-scope as a new DRAFT that points back.

Rules:
- Folder and status field ALWAYS match.
- No skipped states. Linear, forward-only, EXCEPT rework: delivered work fails its OWN spec (bug found, requirement missed) — from ANY state INCLUDING DONE → move back to IN_PROGRESS, fix + re-validate, then advance again. (A change that CONTRADICTS the spec is a different case → HARD RULES.) Never change a feature's code while its file sits in ready-for-done/ or done/ without first moving it back. Repeat reports of ONE symptom are where this slips.
- Exception — "Approve & implement" fast-path: user picks that combined option at the approval gate → file may advance NEEDS_APPROVAL → APPROVED → IN_PROGRESS in one move, with no rest in approved/. Several features approved at once → only the one you START now takes the fast-path; the rest wait in approved/.
- Exception — audit remediation fast-path: an approved `audit-solution` scope may create the feature file DIRECTLY in in-progress/ (its Step-4 approval replaces this gate).
- A transition = update the `status` field first (edit in place), THEN move the file. After moving, re-read before the next in-place edit. Anchor that edit on the FRONTMATTER — include the neighbouring `created:` line, because a spec discussing the lifecycle quotes its own status literals in the body and a bare `status: X` matches twice. Use the file-editing tool, never a stream editor: a `$`-anchored `sed`/`perl` pattern matches nothing on a CRLF file, so the transition silently no-ops at exit 0.
- Move via a path anchored to the features dir (absolute or repo-root-relative), never relative to the shell CWD. Feature files are usually untracked → plain `mv`, not `git mv`. Destination state-folder may not exist yet → create it before the move.

# MECHANICAL CHECK
Folder↔status and filename shape are deterministic. Run the script; never eyeball them:
```
node ${CLAUDE_SKILL_DIR}/scripts/check-features.mjs [root]
```
Exit 1 = violations as `file  rule  detail`. Unconditional, on every spec: folder-status-mismatch,
bad-filename, bad-timestamp, abandoned-claim, unknown-folder, missing-status, no-frontmatter,
duplicate-id. GATED, so read the trigger
before trusting a green run: debt-not-recorded fires only on a `ready-for-done/`/`done/` spec carrying
BOTH gate sections; tasks-not-current and unterminated-fence share one narrower gate — the same two
folders AND a `# Premortem` section. An unclosed fence in `draft/`, `pending/`, `approved/` or
`in-progress/` is therefore NOT seen. Consistency only — that a status was EARNED stays a judgment call.

**Read the detail string, not this list — a violation means different things.**
- `folder-status-mismatch`, `missing-status`, `no-frontmatter` are never auto-fixed: ON ACTIVATION says STOP and report. Which side is right is exactly what the script cannot know.
- `tasks-not-current` IS fixed in place — tick the box if the work landed, annotate it if it did not.
- `abandoned-claim` IS fixed in place, and it is NOT the `no-frontmatter` STOP above. An EMPTY spec is an id `new-feature.mjs` claimed for a session that died before writing: fill it or delete it. Treating it as a STOP would let one crashed session block every later state check.
- `bad-timestamp` — `HHMM` is not a 24h time. Only reachable by an id nobody generated, since the script reads a clock. Fix the name.

**The script reports repo-wide, so a red run says nothing about YOUR file on its own.** Grep the output for the filename you just wrote, and read the total only to notice it did not grow.

**The cadence half is not checked by hand at all — it is MECHANISED by two hooks.** `check-features.mjs`
only ever sees the FINAL state, so it could never tell ticking-as-you-go from reconciling at step 6.
Neither of these is a command you run:
```
node ${CLAUDE_SKILL_DIR}/scripts/tick-sync.mjs
node ${CLAUDE_SKILL_DIR}/scripts/tick-guard.mjs
```
- **`tick-sync.mjs` is a PostToolUse hook on `TodoWrite`.** It SETS the box in every `in-progress/` spec
  to follow its todo, both ways: `completed` ticks it, anything else clears it. So the box is not
  something you draw. It never guesses — no matching todo, an annotated line, or a task text living in
  two in-progress specs at once, and it leaves the line alone. Every write, skip and abandon goes to
  `features/.tick-sync.log`.
- **`tick-guard.mjs` is a Stop hook.** One job: block while any `# Tasks` item has no todo. That is the
  input side of the auto-tick — an unmirrored task is one whose box can never move on its own. It blocks
  ONCE per signature, then only advises, so nothing can wedge.

Both are registered once in `~/.claude/settings.json`, fed hook JSON on stdin, and reach every project
and worktree. Both fail open on any internal error. Where they are not registered — another harness, the
Copilot export — step 5's rule binds on its own. README and ADR 0006 own the wiring and the reasoning.

# FEATURE FILE FORMAT
Frontmatter (source of truth for status):
```
---
title: <feature name>
status: DRAFT | NEEDS_APPROVAL | APPROVED | IN_PROGRESS | READY_FOR_DONE | DONE | DISCARDED
created: YYYYMMDD-HHMM
risk: low | medium | high
---
```
Body (all required):
```
# Summary
# Problem
# Solution
# Technical Plan
# Tasks            (checklist: - [ ] ...; an unchecked box in ready-for-done/ or done/ must carry
                  #  BLOCKED, NOT DONE, or a feature id, on its line or a continuation of it.
                  #  An item's TASK TEXT is ONE physical line — the tick matcher reads no
                  #  further (step 4); only a reason may run onto a continuation.
                  #  May be grouped by `## <milestone>` sub-headings — see step 1.6)
# Impact Analysis  (affected/new/deleted files; breaking changes; overlap with other in-flight features editing the same files)
# Validation       (filled at the READY_FOR_DONE gate)
```
These are added by the GATES, in the order their gate runs. Every section above stays required and none of these replaces one.
```
# Open Questions   (added by step 1.4 — one row per category: question or evidence · answer · what changed)
# Premortem        (added by step 1.5 — failure report + mitigation table, or the one-line skip record)
# Milestones       (added by step 1.6 — the cut and why, or the one-line skip record; then one check
                  #  line per milestone as step 5 finishes it)
# Debt Found       (added during step 5 — one line per shortcut: what · path:line · why you took it · the DRAFT id step 6 files it as)
```
- **`# Open Questions` is present on EVERY spec that reached step 2.** 1.4 has no threshold, so absent there is a defect. Absent is CORRECT on any spec that never reaches step 2 — the audit fast-path, its queued `approved/` siblings, every ON ACTIVATION 0.7 record, and specs predating this gate.
- **`# Premortem`** is conditional on 1.5's own threshold; absent where 1.5 never ran.
- **`# Milestones`** — like `# Open Questions`: present on every spec that reached step 2, since 1.6
  has no threshold either. Absent only where 1.6 never ran, the same carve-out list as 1.4's.
- **`# Debt Found`** is conditional on a shortcut actually being taken. Absent = none was — a claim step 6 makes you state out loud, never a silence it accepts. TECHNICAL DEBT in `skills/_shared/blocks.md` owns WHEN to write it; the line above is the only definition of what a line in THAT section carries. `agents/dev.md` OUTPUT separately owns a worker's `DEBT:` REPORT line, which a dispatcher transcribes into this format — two formats on purpose.

**`Open assumption:` lines** — a trailing list under `# Technical Plan`, one line each: what you assumed and why, for anything the spec could not settle. EVERY spec writer produces them: inline at step 1, `grilling` (its §5), and the Teamleiter transcribing a `pm` agent's `OPEN:` list. They are step 1.4's candidate list, so a spec that smooths its assumptions away disarms the gate that exists to confirm them.

**Language + style: feature files follow ENGLISH + SIMPLE ARTIFACTS** (`skills/_shared/blocks.md`).

# WORKFLOW

## 0. Route → brainstorm, or straight to the spec
Every new feature enters here. One of its branches is "go to step 1 now". Two brainstorm paths, both before any spec is written, both invoked via the Skill tool.

The test that picks — **to fill the spec, would you have to INVENT a decision the user has an opinion about?** Not "can I write fluent prose for this section": you always can, and that fluency is the failure. Ask which concrete choices you would be making FOR them — a limit, a default, a storage location, a scope cut.
- **None** → skip both, straight to step 1.
- **Several, and the IDEA itself is one of them.** Vague, exploratory, "what could we do", or the user says brainstorm/wild ideas → `drunken-genius`. Its output stays in chat; it never writes a file. Once the user picks an idea, carry it into step 1 as the DRAFT's Summary/Problem/Solution seed — or into `grilling` if details are still open.
- **Several, but the idea is settled — the DETAILS or the APPROACH are open** → `grilling`. A design-tree interview worked in ROUNDS: it asks the whole frontier, takes your answers, recomputes and asks again until nothing is left assumed. Then it performs step 1 for you: DRAFT written into `/features/draft/`. You resume at **step 1.4** and do NOT redo step 1.
- **The idea is open AND the details under it are** → `drunken-genius` first, then `grilling`.

## 1. Create → DRAFT
Claim the file with `new-feature.mjs` (STRUCTURE owns the invocation), then write the spec into the path it prints. Fill all sections as far as known.
**Every spec write goes through the file-writing tool — never the shell.** No `cat >`/`>>`, no heredoc (a quoted delimiter does not save it), no `sed -i`, no inline interpreter. Binds every "Append" in 1.4, 1.5, 1.6 and steps 5-6 too. A mangled shell write can still exit 0, and nothing validates spec prose.
Change mirrors an existing one (same layer, sibling module) → read that precedent FIRST and mirror its structure. A plan drafted from the file tree alone puts constants and wiring in plausible-but-wrong places.
**A precedent that is the SOLE user of a shared mechanism proves nothing about a SECOND one.** Hook, event bus, registry, singleton slot: read the mechanism's own composition contract — does it merge, queue, or keep only the last writer? — before planning to be user number two.
Anything the spec cannot settle becomes an `Open assumption:` line under `# Technical Plan`. An inline spec with no assumption list hands step 1.4 a blank page.
Spec fixes a defect CLASS (a rule missing from several files, one pattern wrong in several places) → grep every instance BEFORE writing Tasks; count from the grep, not from the report you are working off.
Plan changes an exported SIGNATURE → count call sites by grepping the SYMBOL, not the feature's surface description; the two sets differ.
Spec written → step 1.4, then 1.5, then 1.6. Never straight to step 2.

## 1.4 Implementation questions — ask before the critique
Runs on EVERY spec, before the premortem — in `draft/`, or in `pending/` after a Change-spec revision that opened a new question. No threshold, no folder move, no status change.

Frame: **it is one day later, you are about to start implementing this spec, and you still have questions. What are they?**

Carve-outs — the audit-remediation fast-path (STATE MACHINE) and ON ACTIVATION 0.7's debt write-only entry. Neither reaches step 2, so neither has a gate to feed.

Spec already carries an `# Open Questions` section → it ran; go to step 1.5, unless a revision has since opened a new question. That section is the ONLY record that it ran.

Then:
1. Read the spec — its `Open assumption:` lines FIRST, they are your candidate list — and `reference/open-questions.md`, joined onto this skill's announced base directory.
2. Walk the five categories. Each ends in a QUESTION to the user or a `settled by <evidence>` line, never blank. A candidate is a question only if a WRONG ANSWER COSTS REWORK. Evidence is a repo `file:line`, an earlier user answer, or "no consequence either way" — never the spec you are writing. Evidence you RUN rather than read is an instrument, and nobody validated the instrument — a probe whose two sides are equal by construction prints a clean result having measured nothing.
3. Questions qualify → **STOP. Ask via AskUserQuestion** (see APPROVAL GATES, end of file), ONE round, max 4 (the harness cap). More than 4 → ask the top 4 by cost, record the rest as deferred. None qualify → ask nothing; the evidence lines are the record, and the gate still ran.
4. Edit the spec. Then write the table, recording the edits you MADE — never intentions.
5. Append `# Open Questions` at the END of the file. Re-running on a revision → EXTEND the existing section, never append a second.
6. Re-ran on a revision and edited the spec → the existing `# Premortem` mitigation table now names sections that changed after it was written. Refresh it, or re-run 1.5.
7. Go to step 1.5.

## 1.5 Premortem — self-critique before the gate
Runs on the spec before it is approved — in `draft/`, or in `pending/` after a revision that newly crosses the threshold. No folder move, no status change, no user stop of its own. Step 1.4 ran first, so the plan you critique already carries the user's answers.

Threshold — run it when ANY of these holds:
- more than 2 files or modules touched
- a new dependency introduced
- existing skills, agents, or their interfaces changed
- more than ~1h of work, or work spanning several sessions

None holds → skip it, and record the skip BOTH ways: a one-line `# Premortem` section naming the criteria you checked, and that same line in the step-2 summary. A silent skip reads identical to a forgotten one.
Features created by the audit-remediation fast-path never run this step.
Spec already carries a `# Premortem` section → it ran; go to step 1.6, unless a Change-spec revision has since crossed the threshold. That section is the ONLY record that it ran.

Then:
1. Read the spec, and `reference/premortem.md`, joined onto this skill's announced base directory.
2. Write the failure report.
3. Edit the spec. Then write the mitigation table, recording the edits you MADE — never intentions. `reference/premortem.md` owns both forms, and the two outcomes that legitimately change no plan.
4. Append report + table as a new `# Premortem` section at the END of the file.
5. Go to step 1.6.

## 1.6 Milestone cut — stage the build, or say why not
Runs on EVERY spec, after the premortem, before the approval gate. No threshold, no folder move, no status change. Carve-outs — the same two as 1.4. Spec already carries a `# Milestones` section → it ran; go to step 2.

Frame: **the build is half done and something goes wrong. What has already been checked, and what has to be thrown away?** A milestone is where that answer changes.

The cut rule — **a milestone must be EXERCISABLE ON ITS OWN**: its tasks leave the repo in a state you can run something against and get a real answer from. A phase of one indivisible change is not one: a rule restated in seven files is self-contradictory until the seventh lands, so "edit four" then "edit three" cuts nothing. SEAMS decide this, never size — a long list with no seam gets no milestones, a short one across two independent surfaces may get two.

Then:
1. Cut → group `# Tasks` under `## <milestone name>` sub-headings, in build order. Task wording is untouched; only order and grouping change. Every task belongs to exactly one milestone.
2. No cut → **say what you checked and why no slice stands alone.** A bare "not needed" is not a record; this gate has no threshold to hide behind.
3. Append `# Milestones` at the END: the milestones in build order, one line each on what that milestone makes exercisable — or the one-line skip record.
4. Go to step 2.

## 2. Request approval → NEEDS_APPROVAL
Move to `/features/pending/`. Summarize for the user. The summary carries the output of steps 1.4, 1.5 and 1.6, and none is optional. Step 1.4 → the `# Open Questions` answers and what each changed (nothing qualified → say that, naming the categories checked), PLUS every `Open assumption:` line still unresolved, said out loud. Premortem ran → its mitigation table, not the report; skipped → the one-line skip reason. Step 1.6 → the milestones in build order, or why no slice stands alone. **STOP. Ask via AskUserQuestion.** Offer at least:
- **Approve & implement** — → APPROVED (step 3) → implementation gate (step 4) → implement (step 5) without asking again.
- **Approve, don't implement yet** — → APPROVED then stop.
- **Change spec** — stay in NEEDS_APPROVAL, refine in place. Then re-enter the gates the revision invalidated, from `pending/`: step 1.4 if it opened a new question, step 1.5 if it newly crosses that threshold OR if 1.4 edited the spec after the mitigation table was written, step 1.6 if the revision added, removed or re-ordered tasks.
- **Discard** — → DISCARDED, move to `/features/discarded/`.

Only an explicit "Approve" choice counts as approval. An implement option IS the explicit confirmation to proceed.
Spec settles a choice the user judges by LOOK or FEEL (layout, composition, interaction shape) → never record it as decided. Offer the viable options AT this gate.

## 3. Approve → APPROVED
Only on explicit approval: move to `/features/approved/`.

## 4. Implementation gate → IN_PROGRESS
Before ANY code change: verify file exists AND status = APPROVED. Then move to `/features/in-progress/`.
**A spec can be APPROVED and still have nothing to build.** A write-only record (ON ACTIVATION 0.7) ships with `# Solution` and `# Technical Plan` as placeholders. Read both sections here. Placeholder → write the plan into the spec, and put the APPROACH to the user via AskUserQuestion before any code.
**The plan you write HERE has had no premortem.** Crosses 1.5's threshold → run it now, against this plan, and append `# Premortem`. Record the approach answer as `# Open Questions` in the same pass; that ask IS 1.4, arriving late. Run 1.6 against that plan too — a spec that skipped step 2 skipped the milestone cut with it.
**Then SEED THE MIRROR: one todo per `# Tasks` item, `content` copied VERBATIM.** Always, at every size — a threshold is one more rule to get wrong. VERBATIM is not style: `tick-sync.mjs` matches todo to task by its FIRST PHYSICAL LINE, so a paraphrased todo is a box that never moves — and so is a task that WRAPS. Keep every `# Tasks` item on one line; a wrapped one can never tick, in silence, whichever side you copy from. Re-seeding after a task is ADDED mid-build is part of the same rule, and `tick-guard.mjs` blocks until you do.
**No `TodoWrite` reachable → there is no mirror.** Check before seeding; absent (`ToolSearch` finds none) → tick each box by hand as its task lands, and treat any `tick-guard.mjs` block as unsatisfiable: note it once, do not re-seed against it. The hooks are registered globally and fire whether or not the tool exists.
**The mirror is milestone-BLIND.** Cut into `## ` milestones (1.6) → still seed EVERY item now, including milestones you will not start for hours. Milestones order the WORK, never the mirror: `tick-guard.mjs` blocks while any task has no todo, so seeding per milestone wedges the build on its own guard.

## 5. Implement
Build only the spec's tasks. Scope changes → update the spec first.
**Spec cut into `## ` milestones (1.6) → build them in order**, one finished before the next starts. As each lands, exercise what it made exercisable and add one line under `# Milestones`: what you ran, what you saw. That line is a RECORD, not a gate — no folder move, no user stop. **A FAILED milestone check is different: it stops the build**, via the invalidated-premise rule below. `autopilot` depends on that — unattended, a failure only recorded is a failure parked at ready-for-done.
**`# Tasks` is a live work-list, and you do NOT tick it.** Move the TODO the moment its task lands — that is the whole act. On this harness `tick-sync.mjs` (MECHANICAL CHECK) sets the box to follow, in the same turn, both ways. Do not also edit the box by hand: a box you tick while its todo still reads `pending` is cleared again on the next `TodoWrite`, because the todo list is authoritative for tick state. No hook, or no `TodoWrite` — another harness, the Copilot export, a session where the tool is absent — you tick the box yourself, in the same act, and the four sites this rule used to be restated at are why it needed a mechanism.
The LIST itself changes too: a task added mid-build is added silently, but a task REMOVED or REWORDED carries a one-line reason. A task "removed" after being delivered by a knowingly weaker means is DEBT, not a removal; one never delivered stays an unfinished task.
Knowingly leaving a shortcut → that is DEBT, and debt becomes its own feature. Note it under this file's `# Debt Found` section the MOMENT you take it; step 6 files it. TECHNICAL DEBT in `skills/_shared/blocks.md` owns the rule — including the three things that look like debt and are not: an UNDELIVERED task, debt you did not create, and an `audit-solution` finding.
A fact found while building that INVALIDATES the premise of a decision the user already made at a gate → re-open it via AskUserQuestion, stating the new fact.
Feature DERIVES its output from real data (heuristic, scan, model) → run the real pipeline on real input as soon as ONE slice works, before building the rest. Tests written first encode your assumption about the data and all go green while the derivation is wrong. That run is subject to LOCAL RESOURCE RUNS in `skills/_shared/blocks.md`.
- Apply `coding-standards` to every code change.
- Apply `security-review` when the feature touches auth, sessions, input handling, or external payloads.
- Web/UI change (responsive, a11y, perf, motion) → also read `coding-standards/reference/web.md`.
- Frontend design work — landing/marketing/hero/portfolio surfaces, redesigns, visual polish → also read `coding-standards/reference/design.md`.
- Apply `documentation` whenever the change touches architecture, modules, responsibilities, public APIs, AGENTS.md, or ADRs.
Invoke each skill via the Skill tool; don't just paraphrase.
- Fanning an enumerated task/checklist out to parallel workers → explicitly assign every item, and re-verify full coverage against the list before dispatch AND after merge.
- A COUNT the spec asserts (files, sites, instances) goes stale between planning and building → re-run it before you build from it, and say what you got.
Intermediate commits during implementation are fine — but NEVER on the default branch: branch first as `feature/<this feature file's slug>`, the timestamp dropped (`git-commit` STEP 1 owns resolving the default branch's name and STEP 4 owns the naming scheme). The FINAL deliverable commit waits until AFTER the user moves the feature to DONE (Step 7), and only if the user opts in there.
The branch rule binds EVERY commit this workflow makes: a commit carrying only feature FILES is still a commit.

## 6. Validation gate → READY_FOR_DONE
Do NOT move to DONE. Verify and record under `# Validation`:
- all tasks complete. A box left unchecked must say WHY on its own line or a continuation of it — `BLOCKED`, `NOT DONE`, or the id of the feature the work moved to. A bare unchecked box in `ready-for-done/` or `done/` is the `tasks-not-current` violation, and it is FIXED IN PLACE
- every `# Debt Found` line filed as its own DRAFT, claimed with `new-feature.mjs` (write-only, per ON ACTIVATION 0.7; MINIMAL), its id written back onto the line. An ABSENT section is NOT proof: `# Validation` records either the filed ids or the LITERAL phrase "no debt taken" — the check greps for exactly that, so a paraphrase goes red
- docs updated if required (via `documentation` when architecture/APIs/AGENTS.md/ADRs touched)
- code conforms to `coding-standards`
- build succeeds (if applicable); tests pass (if available)
- every changed code path actually exercised
- full validation needs a genuinely external action (deploy, service restart, third-party run), OR the user DECLINED a run under LOCAL RESOURCE RUNS → record what you DID verify vs what remains under `# Validation`, surface the pending step — never report it as fully validated. This is the ONE home for a declined run
- do NOT make the DELIVERABLE commit here. Intermediate commits during fixes are fine

Verification fails (build/tests red) → fix the root cause, re-run. Same check fails again after a fix attempt → stop, report the failure and your diagnosis, do NOT weaken the check, skip it, or keep guessing at patches. Ask before a third attempt at the same failing check.

Then move to `/features/ready-for-done/`. **STOP. Ask via AskUserQuestion**: "Implementation complete and validation passed. Move to DONE?" Offer at least **Move to DONE** / **Leave open for now**. Only DONE counts as the explicit confirmation for step 7.

## 7. Finalize → DONE
Only on explicit user confirmation: move to `/features/done/`.

Then — and only after that move — OPTIONALLY commit, and read the working tree FIRST.
- **Dirty → STOP. Ask via AskUserQuestion** whether to commit the landed work now.
- **Clean, because Step 5's intermediate commits already took everything → ask NOTHING here.** Hand straight to `git-commit` and let its Q2 ("Push" / "Don't push") be the single confirmation for pushing the BRANCH. Asking your own push question and then delegating to a skill whose next question is WORD-IDENTICAL IS the doubled ask. Handing over takes no action on its own: nothing is committed or pushed before that Q2.

Dirty branch, on an explicit yes → commit via `git-commit` (owns its own confirmation + default-branch/branch gate; don't hand-roll). User declines → skip. Commit unavoidably carries ANOTHER feature's uncommitted work (shared file, interleaved edits) → that feature's DONE gate is being bypassed. Name it and get its opt-in too, or don't commit. Never make the DELIVERABLE commit before this point. The clean-tree case is `git-commit`'s PUSH-ONLY EXCEPTION: a clean tree with unpushed commits does NOT stop at its STEP 1, it goes on to a push-only STEP 3. Clean AND nothing unpushed → `git-commit` stops, and that is a valid end. A PR is not offered here — `git-commit`'s PR trigger owns it, and it fires only if you ask for one.

Then the BRANCH itself. **This step owns the landing of a feature's branch** — `git-commit`'s Q3 stays suppressed for as long as a feature owns that branch. Feature sat on a branch ≠ the default branch → **STOP. Ask via AskUserQuestion.** **Spell that question out; it does not get to be improvised.** Heading: "Land the branch?". Options: "Keep the branch" / "Merge into `<default>`, delete the branch — here AND on `<remote>` if it is published there — and push `<default>`". The label carries the ACTION; the option's DESCRIPTION says why it is safe — the branch is merged by the time it is deleted, and `git branch -d` refuses, stopping the sequence, if it is not.

**`<default>` must be BOUND before you can word this, and it may not be** — a `git-commit` run that STOPped at its STEP 1 never resolved the name. Unbound → follow `git-commit` STEP 1's `<default>` bullet as a PROCEDURE; no remote → that bullet's only source IS the question, so asking is the procedure itself. Binding it HERE is also what lets the land list treat it as a check rather than resolve it again.

**The `if it is published there` clause must not be dropped** — Step 5's intermediate commits do not guarantee a push, so an unconditional promise of a remote delete names a mutation that may not exist. That clause goes only when NO remote exists at all. **The push clause is not decoration:** this ask is the only one in the whole flow that names publishing the MERGE, and deleting the branch's only published copy while the merge stays local empties the remote of the feature's work. Both or neither. No remote at all → drop both clauses.

Only on an explicit yes. **`git-commit` STEP 4's "Land the branch" list owns the full sequence — follow that list as a procedure; do NOT re-invoke `git-commit` to reach it, and do NOT restate its steps here.** Re-invoking restarts at its STEP 1, and both outcomes there are wrong: the push happened → it STOPs and the merge never happens; the push was declined → it re-asks Q2. Declined → the branch stays, say so plainly.

**You report the landing, because nobody else can.** `git-commit`'s STEP 5 either already ran — before this ask — or never ran at all. State the merge commit, what was deleted locally and remotely, and whether `<default>` was pushed or left local. A delete that failed is reported as failed. **A `git-commit` STEP 5 that already ran can be CONTRADICTED by yours — say which is current.** Where a declined Q2 left its STEP 5 reporting commits as unpushed, and you then land and push `<default>`, those same commits reached the remote inside the merge. Supersede that count out loud.

## 8. Retrospective — `self-improve`
After a resting point (DONE, or user leaves it in READY_FOR_DONE / discards), invoke `self-improve` via the Skill tool (AFTER THE TASK in `skills/_shared/blocks.md` owns the rule). It LOGS what went wrong; it does not edit a skill here.

# HARD RULES
Non-obvious, high-severity only — the state machine and workflow above are not repeated here.
- **Only `/features` files define state; chat doesn't.**
- **No implementation before status = APPROVED and the file sits in in-progress/.**
- **No skipping states; folder and status ALWAYS match** — incl. the documented fast-paths.
- **DONE requires explicit user confirmation — never automatic.** READY_FOR_DONE requires recorded, passing validation.
- **The FINAL DELIVERABLE commit happens ONLY after the user moves the feature to DONE, and only if they opt in** via AskUserQuestion. Never at READY_FOR_DONE, never automatically. This binds a commit that carries a feature's work SIDEWAYS too: sweeping in another feature's uncommitted changes lands it without its own gate. This governs the DELIVERABLE commit only — intermediate commits during the BUILD are fine, in Step 5 AND in Step 6, including the integration commits a delegating workflow needs. Those are still never made on the default branch: branch first.
- **Every user-waiting transition MUST use AskUserQuestion** — never a free-text prompt.
- **A follow-up change contradicting an already-DONE spec** → new feature, or a brief amendment note in the DONE file. The terminal spec never drifts from the code.
- **High-risk features require explicit approval before implementation.**

See `skills/_shared/blocks.md` for WHEN UNCERTAIN / AFTER THE TASK / LANGUAGE / APPROVAL GATES / LOCAL RESOURCE RUNS / TECHNICAL DEBT.
