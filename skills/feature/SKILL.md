---
name: feature
description: Use when planning, specifying, approving, tracking, or implementing new features. Manages the /features lifecycle, state transitions, approval gates, and completion validation.
---

# FEATURE SYSTEM

Manages all feature lifecycle ops in `/features`.

Authoritative rule: **only files inside `/features` define feature state.** Chat is never a spec source. A requirement that exists only in chat does not exist until written into a feature file.

# ON ACTIVATION — STATE CHECK FIRST
Before anything else:
0. Bare invocation (no feature named/described) → don't guess. Show current non-terminal features (draft, pending, approved, in-progress, ready-for-done) and ask via AskUserQuestion what to do (include a "Brainstorm a new feature" option → Workflow step 0). Proceed only once a feature/intent is chosen.
0.5. Request reads as another skill's dedicated trigger (e.g. whole-system audit, ad-hoc bug hunt) → surface the mismatch, ask before hand-rolling it inside feature instead of using the purpose-built skill.
0.7. Request is FILING A RECORD rather than proposing work — technical debt (TECHNICAL DEBT in `skills/_shared/blocks.md`), or an audit finding the user DECLINED (`audit-solution` STEP 5) → **write-only entry**. Write the spec into `/features/draft/` with status DRAFT, minimal, and STOP. Skip steps 0, 1.4, 1.5 and 2 entirely: no brainstorm router, no implementation-questions gate, no premortem, no approval gate, no folder move. Running a record through the normal workflow lands it in `pending/` behind a blocking user question — for debt that is the queue-jump the block forbids, and for a declined finding it re-asks a decision the user just made. It re-enters the workflow later, when the USER picks it up out of `draft/`.
1. Identify which feature the request refers to (name or timestamp).
2. Exists → open it, read `status`, confirm folder matches status (MECHANICAL CHECK below — run it, don't eyeball). Folder ≠ status → STOP and report the mismatch, don't guess.
3. Doesn't exist → new feature, start at Workflow step 0. Not a detour: step 0's first branch sends an already-specified request straight on to step 1. Entering at step 1 directly skips the router and is how step 0 stayed dead.
4. State the current status + the single allowed next action, then proceed.

Never plan/approve/implement/validate/change status without this check.

# STRUCTURE
Path: `/features/<state-folder>/<timestamp>-<slug>.md`
Time: `YYYYMMDD-HHMM` — date part is ALWAYS today's date from context. Clock time unavailable → derive only the time part: newest file dated today across ALL folders (draft/pending/approved/in-progress/ready-for-done/done/discarded — not just non-terminal) → a minute just after it; else start today early (e.g. 0001). Never move the date off today; never fabricate a wall-clock time. Chosen id already exists in ANY folder → step to the next free minute; a parallel session may have claimed it, and the derivation is deterministic enough that two sessions land on the same one.
Slug: lowercase-kebab, no spaces. Example: `/features/pending/20260124-1530-user-auth.md`

One feature per file. Chronological by filename. No index file. One request bundling multiple independent features → split into separate files; ambiguous grouping → confirm the split with the user.

# STATE MACHINE
```
/features/draft/         → DRAFT          → refine, questions gate (1.4), premortem (1.5), then request approval
/features/pending/       → NEEDS_APPROVAL → wait for user
/features/approved/      → APPROVED       → move to in-progress, then implement
/features/in-progress/   → IN_PROGRESS    → implement, then validate
/features/ready-for-done/→ READY_FOR_DONE → wait for user confirmation
/features/done/          → DONE           → terminal
/features/discarded/     → DISCARDED      → terminal (abandoned before DONE)
```
Discard is the one non-linear exit: from any pre-DONE state the user may discard → set status DISCARDED, move to `/features/discarded/`. Never silently delete a feature file; discarding preserves the record.
**A spec's own GATE task can refute the spec, and there is no backward edge to DRAFT.** A task whose stated job is to decide whether the approach WORKS — a measurement, a spike, a probe — coming back negative kills the SOLUTION, not the Problem. Rework does not fit (nothing was delivered) and re-scoping in place erases why. So: DISCARD it, recording the evidence and NAMING the successor, then file the re-scope as a new DRAFT that points back. The refuted approach must stay findable, or the next reader re-runs the measurement that killed it — which is the expensive half.
Rules:
- Folder and status field ALWAYS match.
- No skipped states. Linear, forward-only, EXCEPT rework: delivered work fails its OWN spec (bug found, requirement missed) — from ANY state INCLUDING DONE → move back to IN_PROGRESS, fix + re-validate, then advance again. (A change that CONTRADICTS the spec is a different case → HARD RULES.) Never change a feature's code while its file sits in ready-for-done/ or done/ without first moving it back — the folder must reflect that work resumed. Repeat reports of ONE symptom are where this slips: the first move back gets made, the second and third do not.
- Exception — "Approve & implement" fast-path: user picks that combined option at the approval gate → file may advance NEEDS_APPROVAL → APPROVED → IN_PROGRESS in one move (record approval, land in in-progress/) with no rest in approved/. A collapse of adjacent transitions, not a skipped state. Several features approved at once and built one after another → only the one you START now takes the fast-path; the rest wait in approved/ and pass step 4 when their work actually begins. IN_PROGRESS with nobody building is a folder that lies.
- Exception — audit remediation fast-path: an approved `audit-solution` scope may create the feature file DIRECTLY in in-progress/ (its Step-4 approval replaces this gate); the empty draft/pending/approved rests collapse. Same one-move collapse, not a skipped state.
- A transition = update the `status` field first (edit in place), THEN move the file. After moving, re-read before the next in-place edit — the move invalidates the prior read, so an edit at the new path fails otherwise. Anchor that edit on the FRONTMATTER — include the neighbouring `created:` line. A spec that discusses the lifecycle quotes its own status literals in the body, so a bare `status: X` matches twice and the edit fails. Use the file-editing tool, never a stream editor: a `$`-anchored `sed`/`perl` pattern matches nothing on a CRLF file, so the transition silently no-ops at exit 0 and only the MECHANICAL CHECK catches it.
- Move via a path anchored to the features dir (absolute or repo-root-relative), never relative to the shell CWD (it may have drifted after build/test commands). Feature files are usually untracked (the features dir is commonly VCS-ignored) → plain `mv`, not `git mv`. Destination state-folder may not exist yet → create it before the move.

# MECHANICAL CHECK
Folder↔status and filename shape are deterministic. Run the script; never eyeball them:
```
node ${CLAUDE_SKILL_DIR}/scripts/check-features.mjs [root]
```
Exit 1 = violations as `file  rule  detail`. Unconditional, on every spec: folder-status-mismatch,
bad-filename, unknown-folder, missing-status, no-frontmatter, duplicate-id. GATED, so read the trigger
before trusting a green run: debt-not-recorded fires only on a `ready-for-done/`/`done/` spec carrying
BOTH gate sections, so older specs are exempt rather than permanently red; tasks-not-current and
unterminated-fence share one narrower gate — the same two folders AND a `# Premortem` section — because
both are emitted from the same task-list walk. An unclosed fence in `draft/`, `pending/`, `approved/` or
`in-progress/` is therefore NOT seen. Consistency only — that a status was EARNED
(work done, validation run) stays a judgment call.

**What a violation means differs by violation, so read the detail string, not this list.**
- `folder-status-mismatch` and `missing-status`/`no-frontmatter` are never auto-fixed: ON ACTIVATION
  says STOP and report. Which of the two sides is right is exactly what the script cannot know.
- `tasks-not-current` IS fixed in place — tick the box if the work landed, annotate it if it did not.
  There is one correct fix and no ambiguity about which side is right.
A blanket "never auto-fix" over both would forbid the only sensible response to the commonest and
least dangerous violation.

**The script reports repo-wide, so a red run says nothing about YOUR file on its own.** A repo carrying
standing violations from other features is red on every run, forever. Grep the output for the filename
you just wrote, and read the total only to notice it did not grow.

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
                  #  BLOCKED, NOT DONE, or a feature id, on its line or a continuation of it)
# Impact Analysis  (affected/new/deleted files; breaking changes; overlap with other in-flight features editing the same files)
# Validation       (filled at the READY_FOR_DONE gate)
```
Three more sections the GATES add. The seven above stay required and none of these replaces one. They appear in the file in the order their gate runs — deliberately NOT numbered "8th/9th/10th": a count in prose goes stale the moment a gate is added, and nothing greps for an ordinal.
```
# Open Questions   (added by step 1.4 — one row per category: question or evidence · answer · what changed)
# Premortem        (added by step 1.5 — failure report + mitigation table, or the one-line skip record)
# Debt Found       (added during step 5 — one line per shortcut: what · path:line · why you took it · the DRAFT id step 6 files it as)
```
- **`# Open Questions` is present on EVERY spec that reached step 2.** 1.4 has no threshold, so absent there is a defect, not an ambiguity. Absent is CORRECT on any spec that never reaches step 2 — stated as the property, not as a list, because the list has already grown: the audit fast-path, its queued `approved/` siblings, and every ON ACTIVATION 0.7 record. Plus specs predating this gate.
- **`# Premortem`** is conditional on 1.5's own threshold; absent where 1.5 never ran (audit fast-path, or a spec predating it).
- **`# Debt Found`** is conditional on a shortcut actually being taken. Absent = none was — a claim step 6 makes you state out loud, never a silence it accepts. TECHNICAL DEBT in `skills/_shared/blocks.md` owns WHEN to write it; the line above is the only definition of what a line in THAT section carries. (`agents/dev.md` OUTPUT separately owns a worker's `DEBT:` REPORT line, which a dispatcher transcribes into this format — two formats on purpose: one written by an actor that can file, one by an actor that cannot.)
**`Open assumption:` lines** — a trailing list under `# Technical Plan`, one line each: what you assumed and why, for anything the spec could not settle. EVERY spec writer produces them: inline at step 1, `feature-brainstorming` (its §5), and the Teamleiter transcribing a `pm` agent's `OPEN:` list into the DRAFT it files. They are step 1.4's candidate list, so a spec that smooths its assumptions away disarms the gate that exists to confirm them.

**Language + style: feature files follow ENGLISH + SIMPLE ARTIFACTS** (`skills/_shared/blocks.md`) — English + terse/plain across title, all sections, Tasks; every requirement/number/file/constraint kept.

# WORKFLOW

## 0. Route → brainstorm, or straight to the spec
Every new feature enters here. Not optional, and not a detour — one of its branches is "go to step 1 now". Two brainstorm paths, both before any spec is written, both invoked via the Skill tool.

The test that picks — **to fill the spec, would you have to INVENT a decision the user has an opinion about?** Not "can I write fluent prose for this section": you always can, and that fluency is the failure. Ask instead which concrete choices you would be making FOR them — a limit, a default, a storage location, a scope cut.
- **None — you would invent nothing** → skip both, straight to step 1.
- **Several, and the IDEA itself is one of them.** Vague, exploratory, "what could we do", or the user says brainstorm/wild ideas → `drunken-genius`. Let it run its wild-round → sober-look → nightcap process. Its output stays in chat; it is NOT feature state, it never writes a file. Once the user picks an idea (or a merge of several), carry it into step 1 as the DRAFT's Summary/Problem/Solution seed — or into `feature-brainstorming` if the details are still open.
- **Several, but the idea is settled — the DETAILS or the APPROACH are open.** The feature is named but underspecified → `feature-brainstorming`. Mostly multiple-choice `AskUserQuestion` interview, then it performs step 1 for you: DRAFT written into `/features/draft/` with status `DRAFT`. It returns there. You resume at **step 1.4, the implementation-questions gate** (then 1.5) and do NOT redo step 1. That file IS feature state the moment it exists.
- **The idea is open AND the details under it are** → `drunken-genius` first, then `feature-brainstorming` on the picked idea.

## 1. Create → DRAFT
Write the spec into `/features/draft/`. Fill all sections as far as known.
Change mirrors an existing one (same layer, sibling module) → read that precedent FIRST and mirror its structure. A plan drafted from the file tree alone puts constants and wiring in plausible-but-wrong places, and the correction lands mid-implementation.
**A precedent that is the SOLE user of a shared mechanism proves nothing about a SECOND one.** Hook, event bus, registry, singleton slot: copying the sibling that already uses it inherits its assumption of being alone. Read the mechanism's own composition contract — does it merge, queue, or keep only the last writer? — before planning to be user number two. The precedent looks correct either way, so this is a plan that reviews clean and fails silently at runtime.
Anything the spec cannot settle becomes an `Open assumption:` line under `# Technical Plan` (FEATURE FILE FORMAT). Not optional and not a confession of sloppiness — it is what step 1.4 works from. An inline spec with no assumption list hands that gate a blank page.
Spec fixes a defect CLASS (a rule missing from several files, one pattern wrong in several places) → grep every instance BEFORE writing Tasks; count from the grep, not from the report you are working off. A spec naming 4 of 6 instances looks complete, passes its own review, and ships the other 2 unfixed.
Plan changes an exported SIGNATURE → count call sites by grepping the SYMBOL, not the feature's surface description; the two sets differ. Sizing Impact Analysis from the wrong set understates it, and the missed callers surface as build errors mid-implementation.
Spec written → step 1.4, the implementation-questions gate, then 1.5. Never straight to step 2.

## 1.4 Implementation questions — ask before the critique
Runs on EVERY spec, before the premortem — in `draft/`, or in `pending/` after a Change-spec revision that opened a new question. No threshold, no folder move, no status change, and it is the only gate that asks the USER about a spec that already exists.

Frame: **it is one day later, you are about to start implementing this spec, and you still have questions. What are they?**

Carve-outs — the same two paths 1.5 skips, for the same reason: the audit-remediation fast-path (STATE MACHINE) and ON ACTIVATION 0.7's debt write-only entry. Neither reaches step 2, so neither has a gate to feed.

Spec already carries an `# Open Questions` section → it ran; go to step 1.5, unless a Change-spec revision has since opened a new question. That section is the ONLY record that it ran.

Then:
1. Read the spec — its `Open assumption:` lines FIRST, they are your candidate list — and `reference/open-questions.md`. Join that pointer onto this skill's announced base directory; a bare relative path resolves against the CWD, which is the user's project.
2. Walk the five categories. Each ends in a QUESTION to the user or a `settled by <evidence>` line, never blank. A candidate is a question only if a WRONG ANSWER COSTS REWORK; below that bar, settle it. Evidence is a repo `file:line`, an earlier user answer, or "no consequence either way" — never the spec you are writing.
3. Questions qualify → **STOP. Ask via AskUserQuestion** (see APPROVAL GATES, end of file), ONE round, max 4 (the harness cap). More than 4 → ask the top 4 by cost, record the rest as deferred. None qualify → ask nothing; the evidence lines are the record, and the gate still ran. This is the one point in the workflow where the STOP is conditional — nothing qualifying is a real outcome, not a skipped gate.
4. Edit the spec. Then write the table, recording the edits you MADE — never intentions.
5. Append `# Open Questions` at the END of the file. On a first run that is after `# Validation`; no `# Premortem` can exist yet, since 1.5 has not run. Re-running on a revision → EXTEND the existing section, never append a second: it is the only record the gate ran, and two of them identify no current round.
6. Re-ran on a revision and edited the spec → the existing `# Premortem` mitigation table now names sections that changed after it was written. Refresh it, or re-run 1.5. Leaving it is the exact staleness the 1.4-before-1.5 order exists to prevent, arriving through the back door.
7. Go to step 1.5.

## 1.5 Premortem — self-critique before the gate
Runs on the spec before it is approved — in `draft/`, or in `pending/` after a Change-spec revision that newly crosses the threshold. No folder move, no status change, no user stop of its own. Step 1.4 ran first, so the plan you critique already carries the user's answers; that is why the order is 1.4 then 1.5 and not the reverse — a spec that changes AFTER the mitigation table is written leaves the table describing a plan that no longer exists.

Threshold — run it when ANY of these holds:
- more than 2 files or modules touched
- a new dependency introduced
- existing skills, agents, or their interfaces changed
- more than ~1h of work, or work spanning several sessions

None holds → skip it, and record the skip BOTH ways: a one-line `# Premortem` section naming the criteria you checked, and that same line in the step-2 summary. File only and the gate hides it; chat only and it is not feature state at all (authoritative rule, top of this skill). A silent skip reads identical to a forgotten one.
Features created by the audit-remediation fast-path (STATE MACHINE) never run this step, whichever folder they are created in — the audit findings ARE their failure analysis.
Spec already carries a `# Premortem` section → it ran; go to step 2, unless a Change-spec revision has since crossed the threshold. That section is the ONLY record that it ran.

Then:
1. Read the spec, and `reference/premortem.md` — join that pointer onto this skill's announced base directory; a bare relative path resolves against the CWD, which is the user's project.
2. Write the failure report.
3. Edit the spec. Then write the mitigation table, recording the edits you MADE — never intentions. `reference/premortem.md` owns both forms, and the two outcomes that legitimately change no plan: every cause accepted as a named risk, or a premortem that found nothing real.
4. Append report + table to the feature file as a new `# Premortem` section, at the END of the file — after `# Validation`, and after `# Open Questions` where 1.4 wrote one. FEATURE FILE FORMAT documents the resulting order.
5. Go to step 2.

## 2. Request approval → NEEDS_APPROVAL
Move to `/features/pending/`. Summarize for the user. The summary carries BOTH gates' output, and neither is optional — they are the parts that changed the plan the user is about to approve. Step 1.4 → the `# Open Questions` answers and what each changed (nothing qualified → say that, naming the categories checked), PLUS every `Open assumption:` line still unresolved, said out loud. Those are the requirements nobody confirmed; left inside the file they get approved unread. Premortem ran → its mitigation table, not the report; skipped → the one-line skip reason. **STOP. Ask via AskUserQuestion** (see APPROVAL GATES, end of file). Offer at least:
- **Approve & implement** — explicit approval: → APPROVED (step 3) → implementation gate (step 4) → implement (step 5) without asking again.
- **Approve, don't implement yet** — → APPROVED then stop.
- **Change spec** — stay in NEEDS_APPROVAL, refine in place. Then re-enter the gates the revision invalidated, from `pending/`: step 1.4 if it opened a new question, step 1.5 if it newly crosses that step's threshold OR if 1.4 edited the spec after the mitigation table was written. Refining without this walks past both gates on the revision most likely to need them.
- **Discard** — → DISCARDED, move to `/features/discarded/` (abandon, keep the record).
Only an explicit "Approve" choice counts as approval. An implement option IS the explicit confirmation to proceed.
Spec settles a choice the user judges by LOOK or FEEL (layout, composition, interaction shape) → never record it as decided. Offer the viable options AT this gate. An internally-made visual choice ships, gets rejected on sight, and costs a full rework.

## 3. Approve → APPROVED
Only on explicit approval: move to `/features/approved/`.

## 4. Implementation gate → IN_PROGRESS
Before ANY code change: verify file exists AND status = APPROVED. Then move to `/features/in-progress/`. Implementation begins only after this.
**A spec can be APPROVED and still have nothing to build.** A write-only record (ON ACTIVATION 0.7) ships with `# Solution` and `# Technical Plan` as placeholders on purpose, so approval approved the RECORD, not a plan. Read both sections here. Placeholder → write the plan into the spec, and put the APPROACH to the user via AskUserQuestion before any code: they approved a problem, and approval of an empty plan is not approval of whatever you invent to fill it.

## 5. Implement
Build only the spec's tasks. Scope changes → update the spec first.
**`# Tasks` is a live work-list, not a plan you wrote once.** Tick a box the MOMENT its task lands, not
in one reconciling pass at step 6. Nothing can verify this — `features/` is git-ignored, so no artifact
distinguishes ticking-as-you-go from a single sweep at the end, and step 6's check only ever sees the
final state. It is a rule you keep because the list is worthless to anyone reading it mid-build
otherwise.
The LIST itself changes too: a task added mid-build is added silently, but a task REMOVED or REWORDED
carries a one-line reason. That is where scope shrinks unseen — and a task "removed" after being
delivered by a knowingly weaker means is DEBT, not a removal, while one never delivered stays an
unfinished task. The reason line forces that call to be made out loud.
Knowingly leaving a shortcut → that is DEBT, and debt becomes its own feature. Note it under this file's `# Debt Found` section the MOMENT you take it, then step 6 files it. TECHNICAL DEBT in `skills/_shared/blocks.md` owns the rule — including the three things that look like debt and are not: an UNDELIVERED task (the test is completeness, not scope — a task you DID deliver by a knowingly weaker means is debt, and it is in scope by definition), debt you did not create, and an `audit-solution` finding.
A fact found while building that INVALIDATES the premise of a decision the user already made at a gate → re-open it via AskUserQuestion, stating the new fact. Keeping it silently ships a choice made on a false premise; overriding it silently takes the user's call away.
Feature DERIVES its output from real data (heuristic, scan, model) → run the real pipeline on real input as soon as ONE slice works, before building the rest. Tests written first encode your assumption about the data and all go green while the derivation is wrong; Step 6's sample read then costs a rebuild, not a fix. That real run is subject to LOCAL RESOURCE RUNS in `skills/_shared/blocks.md` — a model or GPU pipeline asks the user before it starts.
- Apply `coding-standards` to every code change.
- Apply `security-review` when the feature touches auth, sessions, input handling, or external payloads.
- Web/UI change (responsive, a11y, perf, motion) → also read `coding-standards/reference/web.md`.
- Frontend design work — landing/marketing/hero/portfolio surfaces, redesigns, visual polish, "make it look good / not templated" → also read `coding-standards/reference/design.md` (composes with the web addendum above).
- Apply `documentation` whenever the change touches architecture, modules, responsibilities, public APIs, AGENTS.md, or ADRs. Technical debt is NOT on this list any more — it is a feature of its own, see above.
Invoke each skill via the Skill tool; don't just paraphrase.
- Fanning an enumerated task/checklist out to parallel workers → explicitly assign every item, and re-verify full coverage against the list before dispatch AND after merge; unassigned items drop silently.
- A COUNT the spec asserts (files, sites, instances) is cheap to re-measure and goes stale between planning and building → re-run it before you build from it, and say what you got. Step 1 makes the spec WRITER count; nothing otherwise makes the BUILDER recheck, so an authoritative-looking number from an earlier session propagates into the work and into whatever the work produces.
Intermediate commits during implementation are fine — but NEVER on the default branch: branch first as `feature/<this feature file's slug>`, the timestamp dropped (`git-commit` STEP 1 owns resolving the default branch's name and STEP 4 owns the naming scheme; don't hand-roll either). The FINAL deliverable commit waits until AFTER the user moves the feature to DONE (Step 7), and only if the user opts in there.
The branch rule binds EVERY commit this workflow makes, not just the ones during implementation: a commit carrying only feature FILES is still a commit. That case is the one that slips, because it reads as bookkeeping rather than work — and hand-rolling `git commit` for it skips `git-commit`'s default-branch gate outright.

## 6. Validation gate → READY_FOR_DONE
Do NOT move to DONE. Verify and record under `# Validation`:
- all tasks complete, no unfinished work. A box left unchecked must say WHY on its own line or a
  continuation of it — `BLOCKED`, `NOT DONE`, or the id of the feature the work moved to. A bare
  unchecked box in `ready-for-done/` or `done/` is the `tasks-not-current` violation (MECHANICAL
  CHECK), and it is FIXED IN PLACE: tick it if the work landed, annotate it if it did not
- every `# Debt Found` line filed as its own DRAFT in `/features/draft/` (write-only, per ON ACTIVATION 0.7; MINIMAL, per the block), its id written back onto the line. An ABSENT section is NOT proof: `# Validation` records either the filed ids or "no debt taken", said out loud. Debt is usually recognised HERE, reading the diff, not at the keystroke that created it — so an empty section far more often means you forgot than that you were clean
- docs updated if required (via `documentation` when architecture/APIs/AGENTS.md/ADRs touched)
- code conforms to `coding-standards`
- build succeeds (if applicable)
- tests pass (if available)
- every changed code path actually exercised. A path needing an unavailable dep (model, GPU, paid API) is NOT "outside your control" — drive it with a stub/mock before declaring done; an unrun changed branch is unverified, not "structurally verified". An INSTALLABLE dep (CLI, tool, package) is NOT unavailable — install it and run the REAL path; "it parses" / "external, not validated" on something installable ships latent bugs (a cross-platform spawn, a shell quirk) that only a real run catches. Both the install and the run are subject to LOCAL RESOURCE RUNS in `skills/_shared/blocks.md`: a local model is installable too, so this bullet never authorises spending the machine on its own
- an excuse is sized to the SUB-STEP it applies to. One step needing real hardware or a human (a keystroke, a physical device) does not make the surrounding branch uncoverable — drive the branch you own with a stub and name only the irreducible step as uncovered. An excuse that grows to cover the whole path hides the part that was testable all along
- changed path SPAWNS an external command → put the stub ON THE PATH under that command's name, so the real spawn runs and the real argv is observed. Mocking the calling function instead proves nothing about the command line actually built — which is usually the thing that was wrong
- changed path CONSUMES events/payloads from an external producer (framework, library, service) → at least one run must take the payload from the REAL producer. The mirror of the rule above: there you own what goes out, here you do NOT own what comes in. A stub you authored encodes your ASSUMPTION about what it sends, so every check passes while the feature does nothing in real use
- a check on a QUANTITATIVE claim (faster, earlier, smaller) asserts a MARGIN sized from the claim, never a bare direction. `A < B` goes green on noise — and on a feature doing nothing at all. Read the raw number, not the PASS line
- a check on a DIRECTIONAL outcome asserts the INVARIANT, never a component in one coordinate. "They move apart" survives a change of mechanism; "x decreased" breaks the moment the direction changes and says nothing about whether the property still holds
- data/config entries consumed by existing code (catalog/registry/list) count as a changed path — "it parses" is NOT validation. Exercise ≥1 representative entry through the real consuming path; entries vary in format and only the live path reveals a break
- changed path is harness-registered config (agent/skill/hook definition) → apply the harness-registration rule in `self-improve` SKILL LIFECYCLE before you judge it; a not-found error right after writing proves neither broken nor working
- validating a RULE you wrote by RUNNING it yourself tests your hand-operation, not the rule. Whatever the text tells its executor to derive (a path, a command, a value) must be derived FROM THE TEXT during the test — supply it by hand and a green run proves nothing about the step you skipped, which is exactly where the rule can be wrong. Same for a value the SYSTEM resolves (config, default, env): pass it explicitly and you test the consumer, never the resolution — and a stored value that defeats your new default lives exactly there. **And the command you RAN is the command you WRITE**: a rule paraphrased from a working test drops the flag that made it work, the test used it, the rule reads without it, and nothing compares the two
- changed path is PROSE a model executes (skill, workflow, rule file, prompt) → "it reads fine" is NOT validation. You cannot audit your own prose — you know what you meant. Hand it to a FRESH model with no context; demand a reachability/coherence trace naming every dead or offered-but-unexecutable path. **The brief carries the BAR and the CORPUS, or the trace manufactures findings.** BAR: a defect is a reachability or coherence failure a reader can act on, cited `file:line` — anything else is not one, and reporting CLEAN is a valid and expected result. A fresh model primed on dense prose invents marginal findings once the real ones run out; measured here as three rounds whose findings were later withdrawn in full, each costing a fix round. CORPUS: this change's own diff, plus every file the spec's `# Impact Analysis` names — wider only by saying so and why. A trace over more ground finds more regardless of the defect rate, so an unstated corpus makes "new findings every round" arithmetic rather than a symptom. Delegation unavailable (harness or policy forbids unrequested agents) → say so and ask the user to authorize it. Ask for the ROUNDS, not one pass: the fix round below is predictable, and asking per-pass returns to the user for every one. Never substitute your own re-read and report it validated — that is the one thing this bullet exists to forbid. A trace that finds defects produces a FIX round, and those fixes are untraced prose by construction: re-trace them, or record them as unverified. "The trace ran" is not "the shipped text was traced"
- exercising a changed path that MUTATES persisted/user state (settings store, DB, on-disk files) → find the store's REAL path first (don't assume it), snapshot it, restore it after; never leave test data in the user's state. This binds any TEST/verify you RUN as validation too, not just a path you changed: a script that writes to a REAL config/DB/store (not an isolated temp) corrupts the user's environment when run — check it isolates or snapshot+restores first; never assume a verify script is side-effect-free
- exercising a streaming/real-time/async changed path → size the test so the observed window outlasts connect/setup latency; a run that finishes before the observer attaches proves nothing — observe events arriving over time, not just a final snapshot
- a path that EMITS events/metrics/callbacks → assert the payload VALUES, not just that events fire; a fired-but-null/empty event (e.g. metric present but its value None) passes a count check yet violates intent
- two consumers of SHARED code asserted to AGREE (same output, parity, round-trip equality) → that check CANNOT fail on a defect in the shared code: both break identically and stay equal. Assert absolute expected VALUES per case too — agreement is necessary, never sufficient. Same trap whenever a check's EXPECTED and ACTUAL both derive from ONE source: it passes by construction. Prove a new check can FAIL — break what it guards and watch it go red. A check never seen red is not a check
- a generated artifact COMMITTED to version control → verify it survives a CLEAN CHECKOUT, not just your working tree. Line-ending and filter rules apply on checkout, so a build that matches locally can differ for everyone who clones. VCS warnings printed during the commit are evidence, not noise
- shell CWD persists between commands and may have drifted — anchor every verification path, or a check runs against the wrong root and its result is fiction
- feature OUTPUT is DATA it DERIVES (from user content, a heuristic, a model) → read a real SAMPLE of the values and judge each against EVERY invariant that constrains them (language, format, allowed-set, no-secrets), not just that values appeared. Derived output carries values no test anticipated; one that violates an invariant sits VISIBLE in the sample yet passes every count/mechanism check. Seeing a value is not checking it
- full validation needs a genuinely external action (deploy, service restart, third-party run), OR the user DECLINED a run under LOCAL RESOURCE RUNS → record what you DID verify vs what remains under `# Validation`, surface the pending step to the user — never report it as fully validated. This is the ONE home for a declined run; do not invent a second place for it, or the same gap gets filed differently each session
- changed a rule/value that can exist in MORE THAN ONE place (shared constant, config default, duplicated doc/rule text) → grep repo-wide for other copies before ready-for-done. A spec scoped to one file does not stop a stale copy elsewhere from silently defeating the change. **Grep finds literal COPIES, not DEPENDENTS** — a rule stated in OTHER words whose truth your change just broke shares no string with it, so every literal grep passes while an absolute rule elsewhere now contradicts you. Also re-read each invariant section (HARD RULES, "always/never") end to end and ask of every rule: still true? **A pointer your change lays between two NEW sites breaks at the JOIN, and neither grep sees it** — no stale copy exists and no prior dependent was touched, so both pass. Check that the CITED site's trigger actually admits the CITING site's case
- proving an ABSENCE by search (no override, no other caller, no stale copy) → the search's own filters decide the answer. Ignore-aware tools skip exactly where runtime and local state live, so "nothing found" can mean "nowhere it looked". Re-run with ignores disabled before recording an absence, or establish it through the running system instead. **An empty result can also mean the search FAILED**: a flag the tool rejects, a bad path, stderr silenced. Check the exit code; never discard stderr. **One NUL byte hides a whole FILE** from ripgrep-based tools, which skip it as binary — a string it plainly contains then returns no match. **A CHECK that proves an absence has this defect permanently, not once** — scope its corpus by ALLOWLIST (the places that would prove PRESENCE), never by a list of places to ignore. Every directory added later silently widens a denylist, so the check goes green for a reason nobody wrote down; excluding the one that defeated it just waits for the next one
- a rule quantified over a SET ("every X was excluded", "all callers updated") → say whether the EMPTY set satisfies it. It does, vacuously, and that case is usually the commonest one — so the rule fires hardest where nothing was meant to happen
- a check comparing two command OUTPUTS as strings → pin their FORMAT first. The same value printed relative and absolute compares unequal, and the check then reports presentation, not state
- do NOT make the DELIVERABLE commit here. It waits until after DONE (Step 7), and is user-opt-in. Intermediate commits already made during Step 5 are fine and stay.
Verification fails (build/tests red) → fix the root cause, re-run. Same check fails again after a fix attempt → stop, report the failure and your diagnosis to the user, do NOT weaken the check, skip it, or keep guessing at patches. Ask before a third attempt at the same failing check. Same stop when each fix round CLOSES its named defects but opens new ones in its own blast radius: two such rounds = not converging → report the pattern and ask, don't start a third. Count only the BLAST-RADIUS findings, and count them MECHANICALLY: a finding is blast-radius when its `file:line` falls inside the immediately preceding fix round's diff. Outside that diff = a part earlier rounds never probed = the check working, not divergence. SHOW both numbers ("N of M findings were blast-radius"). The verdict itself — "not converging", "the check working" — is required, not forbidden; what is forbidden is stating it WITHOUT the two numbers it rests on. Read by eye this rule has already been applied two ways in one week — once counting 2 of 7 with no visible arithmetic, once firing after ONE round though this text says two. User overrides the stop → the next round runs on a NARROWER corpus (the last fix round's diff alone), never the same one again; an override that changes nothing just repeats the round that failed to converge.
Then move to `/features/ready-for-done/`. **STOP. Ask via AskUserQuestion**: "Implementation complete and validation passed. Move to DONE?" Offer at least **Move to DONE** / **Leave open for now**. Only DONE counts as the explicit confirmation for step 7.

## 7. Finalize → DONE
Only on explicit user confirmation: move to `/features/done/`.
Then — and only after that move — OPTIONALLY commit, and read the working tree FIRST: it decides whether there is a question here at all. **Dirty → STOP. Ask via AskUserQuestion** whether to commit the landed work now. **Clean, because Step 5's intermediate commits already took everything → ask NOTHING here.** Hand straight to `git-commit` and let its Q2 ("Push" / "Don't push") be the single confirmation. Asking your own push question and then delegating to a skill whose next question is WORD-IDENTICAL IS the doubled ask, not the cure for it — and a user who just said yes says no to the repeat, leaving the branch unpushed, which is exactly what this clause exists to prevent. The dirty branch above is not that case and keeps its ask: "commit this work at all?" is a different question from Q1's "single or split?" and Q2's "also push?", which decide HOW and HOW FAR, not WHETHER. Handing over unasked takes no action on its own: nothing is committed or pushed before that Q2. Only on an explicit yes, commit via `git-commit` (owns its own confirmation + default-branch/branch gate; don't hand-roll). User declines → skip; leave it as it is. Commit unavoidably carries ANOTHER feature's uncommitted work (shared file, interleaved edits) → that feature's DONE gate is being bypassed. Name it and get its opt-in too, or don't commit. Never make the DELIVERABLE commit before this point — intermediate commits from Step 5 may already exist and stay. That clean-tree case is `git-commit`'s PUSH-ONLY EXCEPTION, at the end of its STEP 1: a clean tree with unpushed commits does NOT stop there any more, it goes on to a push-only STEP 3. The push is therefore confirmed exactly once, by Q2, and its STEP 5 reports no commit made plus N pushed. Clean AND nothing unpushed → `git-commit` stops, and that is a valid end, not a failure. A PR is not offered here and is not part of that ask — `git-commit`'s PR trigger owns it, and it fires only if you ask for one. Say so in one clause rather than dropping the mention: the path still exists, and silence makes it invisible exactly when a feature that needed review has just been declared finished.
Then the BRANCH itself. **This step owns the landing of a feature's branch** — `git-commit`'s Q3 stays suppressed for as long as a feature owns that branch, so the question gets asked exactly once, here, and never collects two different answers. Feature sat on a branch ≠ the default branch → **STOP. Ask via AskUserQuestion** whether to merge it into the default branch and delete it. **Spell that question out; it does not get to be improvised.** Heading: "Land the branch?". Options: "Keep the branch" / "Merge into `<default>`, delete the branch — here AND on `<remote>` if it is published there — and push `<default>`". `git-commit`'s HARD RULES name THIS ask as the other answer that authorizes the remote delete, and an authorization with no wording is not one — so the wording is fixed here rather than improvised. It differs from `git-commit`'s Q3 in three places, all of them deliberate: the trailing push clause is added (see below); its first option drops Q3's "Just commit, " prefix and its second drops "Commit, then ", because by this point the commit question has already been asked and answered. **The `if it is published there` clause is NOT one of the differences and must not be dropped** — `git-commit` STEP 3 spells out why: Step 5's intermediate commits do not guarantee a push, so an unconditional promise of a remote delete names a mutation that may not exist. That clause goes only when NO remote exists at all. **The push clause is not decoration.** No Q2 exists on this path, so nothing else can authorize publishing the merge — and deleting the branch's only published copy while the merge stays local empties the remote of the feature's work. Both or neither. No remote at all → drop both clauses. The description says why it is safe: the branch is merged by then, and `git branch -d` refuses and stops the sequence if it is not. Only on an explicit yes. **`git-commit` STEP 4's "Land the branch" list owns the full sequence — follow that list as a procedure; do NOT re-invoke `git-commit` to reach it, and do NOT restate its steps here.** One owner, no second copy — a summary of a procedure is a copy of it, and copies of procedures go stale silently. Re-invoking restarts at its STEP 1, and both outcomes there are wrong: the push happened → clean tree, nothing unpushed → it STOPs, and the merge you were just told to make never happens; the push was declined → the push-only exception fires again and re-asks Q2, the push question a second time. (Its Q3 stays correctly suppressed either way — ownership runs until this step's answer is EXECUTED — so a second branch question is not the risk here; a lost merge and a repeated push question are.) "Don't hand-roll" means don't invent your own sequence; it does not mean enter the skill again. Declined → the branch stays, say so plainly.
**You report the landing, because nobody else can.** `git-commit`'s STEP 5 either already ran — before this ask — or never ran at all, because it STOPped at STEP 1 on a clean tree with nothing unpushed. Neither case can cover what happens AFTER this ask, which is why its own branch-landed clause is dead on every feature-owned branch and this one is not. State the merge commit, what was deleted locally and remotely, and whether `<default>` was pushed or left local. A delete that failed is reported as failed.

## 8. Retrospective — `self-improve`
After a resting point (DONE, or user leaves it in READY_FOR_DONE / discards), invoke `self-improve` via the Skill tool (AFTER THE TASK in `skills/_shared/blocks.md` owns the rule). Scope it to this + the skills applied during implementation.

# HARD RULES
Non-obvious, high-severity only — the state machine and workflow above are not repeated here.
- **Only `/features` files define state; chat doesn't** — see the authoritative rule at the top of this skill.
- **No implementation before status = APPROVED and the file sits in in-progress/** — see workflow step 4.
- **No skipping states; folder and status ALWAYS match** — see STATE MACHINE, incl. its documented fast-paths.
- **DONE requires explicit user confirmation — never automatic.** READY_FOR_DONE requires recorded, passing validation.
- **The FINAL DELIVERABLE commit happens ONLY after the user moves the feature to DONE, and only if they opt in** via AskUserQuestion. Never at READY_FOR_DONE, never automatically. This binds a commit that carries a feature's work SIDEWAYS too: sweeping in another feature's uncommitted changes lands it without its own gate. Name it and get its opt-in, or don't commit. This governs the DELIVERABLE commit only — intermediate commits during implementation are fine (Step 5), including the integration commits a delegating workflow needs to hand work between workers. Those are still never made on the default branch: branch first.
- **Every user-waiting transition MUST use AskUserQuestion** — never a free-text prompt.
- **A follow-up change contradicting an already-DONE spec** → new feature, or a brief amendment note in the DONE file. The terminal spec never drifts from the code.
- **High-risk features require explicit approval before implementation.**

See `skills/_shared/blocks.md` for WHEN UNCERTAIN / AFTER THE TASK / LANGUAGE / APPROVAL GATES / LOCAL RESOURCE RUNS / TECHNICAL DEBT.
