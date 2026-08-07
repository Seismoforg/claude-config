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
0.7. Request is FILING A RECORD rather than proposing work — technical debt (TECHNICAL DEBT in `skills/_shared/blocks.md`), or an audit finding the user DECLINED (`audit-solution` STEP 5) → **write-only entry**. Write the spec into `/features/draft/` with status DRAFT, minimal, and STOP. Skip steps 0, 1.4, 1.5 and 2 entirely: no brainstorm router, no implementation-questions gate, no premortem, no approval gate, no folder move. It re-enters the workflow later, when the USER picks it up out of `draft/`.
1. Identify which feature the request refers to (name or timestamp).
2. Exists → open it, read `status`, confirm folder matches status (MECHANICAL CHECK below — run it, don't eyeball). Folder ≠ status → STOP and report the mismatch, don't guess.
3. Doesn't exist → new feature, start at Workflow step 0. Step 0's first branch sends an already-specified request straight on to step 1; entering at step 1 directly skips the router.
4. State the current status + the single allowed next action, then proceed.

Never plan/approve/implement/validate/change status without this check.

# STRUCTURE
Path: `/features/<state-folder>/<timestamp>-<slug>.md`
Time: `YYYYMMDD-HHMM` — date part is ALWAYS today's date from context. Clock time unavailable → derive only the time part: newest file dated today across ALL folders (draft/pending/approved/in-progress/ready-for-done/done/discarded) → a minute just after it; else start today early (e.g. 0001). Never move the date off today; never fabricate a wall-clock time. Chosen id already exists in ANY folder → step to the next free minute.
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
bad-filename, unknown-folder, missing-status, no-frontmatter, duplicate-id. GATED, so read the trigger
before trusting a green run: debt-not-recorded fires only on a `ready-for-done/`/`done/` spec carrying
BOTH gate sections; tasks-not-current and unterminated-fence share one narrower gate — the same two
folders AND a `# Premortem` section. An unclosed fence in `draft/`, `pending/`, `approved/` or
`in-progress/` is therefore NOT seen. Consistency only — that a status was EARNED stays a judgment call.

**Read the detail string, not this list — a violation means different things.**
- `folder-status-mismatch`, `missing-status`, `no-frontmatter` are never auto-fixed: ON ACTIVATION says STOP and report. Which side is right is exactly what the script cannot know.
- `tasks-not-current` IS fixed in place — tick the box if the work landed, annotate it if it did not.

**The script reports repo-wide, so a red run says nothing about YOUR file on its own.** Grep the output for the filename you just wrote, and read the total only to notice it did not grow.

**The cadence half has its own guard, and it is not run by hand.** `check-features.mjs` only ever sees
the FINAL state, so it cannot tell ticking-as-you-go from reconciling at step 6. Its counterpart:
```
node ${CLAUDE_SKILL_DIR}/scripts/tick-guard.mjs
```
It is a Stop hook, registered once in `~/.claude/settings.json` and fed the hook JSON on stdin, so it
reaches every project and worktree. It compares `# Tasks` against the harness todo list at turn end and
blocks while they disagree — a task with no todo, a `completed` todo over a bare box, or a ticked box
whose todo never moved. It blocks ONCE per signature, then only advises, so nothing can wedge. It fails
open on any internal error. Where it is not registered — another harness, the Copilot export — step 5's
rule binds on its own. README and ADR 0006 own the wiring and the reasoning.

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
These are added by the GATES, in the order their gate runs. Every section above stays required and none of these replaces one.
```
# Open Questions   (added by step 1.4 — one row per category: question or evidence · answer · what changed)
# Premortem        (added by step 1.5 — failure report + mitigation table, or the one-line skip record)
# Debt Found       (added during step 5 — one line per shortcut: what · path:line · why you took it · the DRAFT id step 6 files it as)
```
- **`# Open Questions` is present on EVERY spec that reached step 2.** 1.4 has no threshold, so absent there is a defect. Absent is CORRECT on any spec that never reaches step 2 — the audit fast-path, its queued `approved/` siblings, every ON ACTIVATION 0.7 record, and specs predating this gate.
- **`# Premortem`** is conditional on 1.5's own threshold; absent where 1.5 never ran.
- **`# Debt Found`** is conditional on a shortcut actually being taken. Absent = none was — a claim step 6 makes you state out loud, never a silence it accepts. TECHNICAL DEBT in `skills/_shared/blocks.md` owns WHEN to write it; the line above is the only definition of what a line in THAT section carries. `agents/dev.md` OUTPUT separately owns a worker's `DEBT:` REPORT line, which a dispatcher transcribes into this format — two formats on purpose.

**`Open assumption:` lines** — a trailing list under `# Technical Plan`, one line each: what you assumed and why, for anything the spec could not settle. EVERY spec writer produces them: inline at step 1, `feature-brainstorming` (its §5), and the Teamleiter transcribing a `pm` agent's `OPEN:` list. They are step 1.4's candidate list, so a spec that smooths its assumptions away disarms the gate that exists to confirm them.

**Language + style: feature files follow ENGLISH + SIMPLE ARTIFACTS** (`skills/_shared/blocks.md`).

# WORKFLOW

## 0. Route → brainstorm, or straight to the spec
Every new feature enters here. One of its branches is "go to step 1 now". Two brainstorm paths, both before any spec is written, both invoked via the Skill tool.

The test that picks — **to fill the spec, would you have to INVENT a decision the user has an opinion about?** Not "can I write fluent prose for this section": you always can, and that fluency is the failure. Ask which concrete choices you would be making FOR them — a limit, a default, a storage location, a scope cut.
- **None** → skip both, straight to step 1.
- **Several, and the IDEA itself is one of them.** Vague, exploratory, "what could we do", or the user says brainstorm/wild ideas → `drunken-genius`. Its output stays in chat; it never writes a file. Once the user picks an idea, carry it into step 1 as the DRAFT's Summary/Problem/Solution seed — or into `feature-brainstorming` if details are still open.
- **Several, but the idea is settled — the DETAILS or the APPROACH are open** → `feature-brainstorming`. Mostly multiple-choice interview, then it performs step 1 for you: DRAFT written into `/features/draft/`. You resume at **step 1.4** and do NOT redo step 1.
- **The idea is open AND the details under it are** → `drunken-genius` first, then `feature-brainstorming`.

## 1. Create → DRAFT
Write the spec into `/features/draft/`. Fill all sections as far as known.
Change mirrors an existing one (same layer, sibling module) → read that precedent FIRST and mirror its structure. A plan drafted from the file tree alone puts constants and wiring in plausible-but-wrong places.
**A precedent that is the SOLE user of a shared mechanism proves nothing about a SECOND one.** Hook, event bus, registry, singleton slot: read the mechanism's own composition contract — does it merge, queue, or keep only the last writer? — before planning to be user number two.
Anything the spec cannot settle becomes an `Open assumption:` line under `# Technical Plan`. An inline spec with no assumption list hands step 1.4 a blank page.
Spec fixes a defect CLASS (a rule missing from several files, one pattern wrong in several places) → grep every instance BEFORE writing Tasks; count from the grep, not from the report you are working off.
Plan changes an exported SIGNATURE → count call sites by grepping the SYMBOL, not the feature's surface description; the two sets differ.
Spec written → step 1.4, then 1.5. Never straight to step 2.

## 1.4 Implementation questions — ask before the critique
Runs on EVERY spec, before the premortem — in `draft/`, or in `pending/` after a Change-spec revision that opened a new question. No threshold, no folder move, no status change.

Frame: **it is one day later, you are about to start implementing this spec, and you still have questions. What are they?**

Carve-outs — the audit-remediation fast-path (STATE MACHINE) and ON ACTIVATION 0.7's debt write-only entry. Neither reaches step 2, so neither has a gate to feed.

Spec already carries an `# Open Questions` section → it ran; go to step 1.5, unless a revision has since opened a new question. That section is the ONLY record that it ran.

Then:
1. Read the spec — its `Open assumption:` lines FIRST, they are your candidate list — and `reference/open-questions.md`, joined onto this skill's announced base directory.
2. Walk the five categories. Each ends in a QUESTION to the user or a `settled by <evidence>` line, never blank. A candidate is a question only if a WRONG ANSWER COSTS REWORK. Evidence is a repo `file:line`, an earlier user answer, or "no consequence either way" — never the spec you are writing.
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
Spec already carries a `# Premortem` section → it ran; go to step 2, unless a Change-spec revision has since crossed the threshold. That section is the ONLY record that it ran.

Then:
1. Read the spec, and `reference/premortem.md`, joined onto this skill's announced base directory.
2. Write the failure report.
3. Edit the spec. Then write the mitigation table, recording the edits you MADE — never intentions. `reference/premortem.md` owns both forms, and the two outcomes that legitimately change no plan.
4. Append report + table as a new `# Premortem` section at the END of the file.
5. Go to step 2.

## 2. Request approval → NEEDS_APPROVAL
Move to `/features/pending/`. Summarize for the user. The summary carries BOTH gates' output, and neither is optional. Step 1.4 → the `# Open Questions` answers and what each changed (nothing qualified → say that, naming the categories checked), PLUS every `Open assumption:` line still unresolved, said out loud. Premortem ran → its mitigation table, not the report; skipped → the one-line skip reason. **STOP. Ask via AskUserQuestion.** Offer at least:
- **Approve & implement** — → APPROVED (step 3) → implementation gate (step 4) → implement (step 5) without asking again.
- **Approve, don't implement yet** — → APPROVED then stop.
- **Change spec** — stay in NEEDS_APPROVAL, refine in place. Then re-enter the gates the revision invalidated, from `pending/`: step 1.4 if it opened a new question, step 1.5 if it newly crosses that threshold OR if 1.4 edited the spec after the mitigation table was written.
- **Discard** — → DISCARDED, move to `/features/discarded/`.

Only an explicit "Approve" choice counts as approval. An implement option IS the explicit confirmation to proceed.
Spec settles a choice the user judges by LOOK or FEEL (layout, composition, interaction shape) → never record it as decided. Offer the viable options AT this gate.

## 3. Approve → APPROVED
Only on explicit approval: move to `/features/approved/`.

## 4. Implementation gate → IN_PROGRESS
Before ANY code change: verify file exists AND status = APPROVED. Then move to `/features/in-progress/`.
**A spec can be APPROVED and still have nothing to build.** A write-only record (ON ACTIVATION 0.7) ships with `# Solution` and `# Technical Plan` as placeholders. Read both sections here. Placeholder → write the plan into the spec, and put the APPROACH to the user via AskUserQuestion before any code.
**The plan you write HERE has had no premortem.** Crosses 1.5's threshold → run it now, against this plan, and append `# Premortem`. Record the approach answer as `# Open Questions` in the same pass; that ask IS 1.4, arriving late.
**Then SEED THE MIRROR: one todo per `# Tasks` item, `content` copied VERBATIM.** Always, at every size — a threshold is one more rule to get wrong. The mirror is what makes step 5's tick cadence observable at all, and re-seeding after a task is ADDED mid-build is part of the same rule.

## 5. Implement
Build only the spec's tasks. Scope changes → update the spec first.
**`# Tasks` is a live work-list.** Tick a box the MOMENT its task lands, not in one reconciling pass at step 6. The box and its todo move in ONE act, in the same turn — flipping either alone is the defect. On this harness `tick-guard.mjs` (MECHANICAL CHECK) reads both at turn end and blocks while they disagree; elsewhere the rule binds on its own, and the four sites it used to be restated at are why it needs a mechanism.
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
- every `# Debt Found` line filed as its own DRAFT in `/features/draft/` (write-only, per ON ACTIVATION 0.7; MINIMAL), its id written back onto the line. An ABSENT section is NOT proof: `# Validation` records either the filed ids or the LITERAL phrase "no debt taken" — the check greps for exactly that, so a paraphrase goes red
- docs updated if required (via `documentation` when architecture/APIs/AGENTS.md/ADRs touched)
- code conforms to `coding-standards`
- build succeeds (if applicable); tests pass (if available)
- every changed code path actually exercised. A path needing an unavailable dep (model, GPU, paid API) is NOT "outside your control" — drive it with a stub/mock. An INSTALLABLE dep (CLI, tool, package) is NOT unavailable — install it and run the REAL path. Both the install and the run are subject to LOCAL RESOURCE RUNS in `skills/_shared/blocks.md`
- an excuse is sized to the SUB-STEP it applies to. One step needing real hardware or a human does not make the surrounding branch uncoverable — drive the branch you own with a stub and name only the irreducible step as uncovered
- changed path SPAWNS an external command → put the stub ON THE PATH under that command's name, so the real spawn runs and the real argv is observed. Mocking the calling function proves nothing about the command line actually built
- changed path CONSUMES events/payloads from an external producer (framework, library, service) → at least one run must take the payload from the REAL producer. A stub you authored encodes your ASSUMPTION about what it sends
- a check on a QUANTITATIVE claim (faster, earlier, smaller) asserts a MARGIN sized from the claim, never a bare direction. `A < B` goes green on noise. Read the raw number, not the PASS line
- a check on a DIRECTIONAL outcome asserts the INVARIANT, never a component in one coordinate
- data/config entries consumed by existing code (catalog/registry/list) count as a changed path — "it parses" is NOT validation. Exercise ≥1 representative entry through the real consuming path
- changed path is harness-registered config (agent/skill/hook definition) → apply the harness-registration rule in `self-improve` SKILL LIFECYCLE before you judge it. **The RUNNING copy may not be yours** — such a definition loads from a tree, often once, before your edit. Verify what you can, NAME the half you could not, and schedule it for after the change lands
- validating a RULE you wrote by RUNNING it yourself tests your hand-operation, not the rule. Whatever the text tells its executor to derive (a path, a command, a value) must be derived FROM THE TEXT during the test. Same for a value the SYSTEM resolves (config, default, env): pass it explicitly and you test the consumer, never the resolution. **And the command you RAN is the command you WRITE**: a rule paraphrased from a working test drops the flag — or, where the test used SEVERAL commands, a whole COMMAND — that made it work
- exercising a changed path that MUTATES persisted/user state (settings store, DB, on-disk files) → find the store's REAL path first (don't assume it), snapshot it, restore it after. This binds any TEST/verify you RUN as validation too: a script that writes to a REAL config/DB/store corrupts the user's environment when run — check it isolates or snapshot+restores first
- exercising a streaming/real-time/async changed path → size the test so the observed window outlasts connect/setup latency; observe events arriving over time, not just a final snapshot
- a path that EMITS events/metrics/callbacks → assert the payload VALUES, not just that events fire; a fired-but-null event passes a count check yet violates intent
- two consumers of SHARED code asserted to AGREE (same output, parity, round-trip equality) → that check CANNOT fail on a defect in the shared code: both break identically and stay equal. Assert absolute expected VALUES per case too. Same trap whenever a check's EXPECTED and ACTUAL both derive from ONE source. Prove a new check can FAIL — break what it guards and watch it go red. A check never seen red is not a check
- a generated artifact COMMITTED to version control → verify it survives a CLEAN CHECKOUT, not just your working tree. Line-ending and filter rules apply on checkout. VCS warnings printed during the commit are evidence, not noise
- shell CWD persists between commands and may have drifted — anchor every verification path
- feature OUTPUT is DATA it DERIVES (from user content, a heuristic, a model) → read a real SAMPLE of the values and judge each against EVERY invariant that constrains them (language, format, allowed-set, no-secrets), not just that values appeared. Seeing a value is not checking it
- full validation needs a genuinely external action (deploy, service restart, third-party run), OR the user DECLINED a run under LOCAL RESOURCE RUNS → record what you DID verify vs what remains under `# Validation`, surface the pending step — never report it as fully validated. This is the ONE home for a declined run
- changed a rule/value that can exist in MORE THAN ONE place (shared constant, config default, duplicated doc/rule text) → grep repo-wide for other copies before ready-for-done. **Grep finds literal COPIES, not DEPENDENTS** — a rule stated in OTHER words whose truth your change just broke shares no string with it. Also re-read each invariant section (HARD RULES, "always/never") end to end and ask of every rule: still true? **A pointer your change lays between two NEW sites breaks at the JOIN, and neither grep sees it** — check that the CITED site's trigger actually admits the CITING site's case
- proving an ABSENCE by search (no override, no other caller, no stale copy) → the search's own filters decide the answer. Ignore-aware tools skip exactly where runtime and local state live. Re-run with ignores disabled, or establish it through the running system. **An empty result can also mean the search FAILED**: check the exit code; never discard stderr. **`$?` after a pipe is the LAST command's.** **A check that SUCCEEDED can still have examined nothing** — report how many items it EXAMINED beside the violation count. **One NUL byte hides a whole FILE** from ripgrep-based tools. **A phrase WRAPPED across lines matches NOTHING** — a line-oriented search reads one line at a time, and prose wraps at a fixed width, so the copy you are hunting is the one a newline split. Search a fragment short enough to survive the wrap, or use a multiline mode. **A CHECK that proves an absence has this defect permanently** — scope its corpus by ALLOWLIST (the places that would prove PRESENCE), never by a list of places to ignore
- a rule quantified over a SET ("every X was excluded", "all callers updated") → say whether the EMPTY set satisfies it. It does, vacuously, and that case is usually the commonest one
- a check comparing two command OUTPUTS as strings → pin their FORMAT first. The same value printed relative and absolute compares unequal
- do NOT make the DELIVERABLE commit here. Intermediate commits during fixes are fine

Verification fails (build/tests red) → fix the root cause, re-run. Same check fails again after a fix attempt → stop, report the failure and your diagnosis, do NOT weaken the check, skip it, or keep guessing at patches. Ask before a third attempt at the same failing check.

Then move to `/features/ready-for-done/`. **STOP. Ask via AskUserQuestion**: "Implementation complete and validation passed. Move to DONE?" Offer at least **Move to DONE** / **Leave open for now**. Only DONE counts as the explicit confirmation for step 7.

## 7. Finalize → DONE
Only on explicit user confirmation: move to `/features/done/`.

Then — and only after that move — OPTIONALLY commit, and read the working tree FIRST.
- **Dirty → STOP. Ask via AskUserQuestion** whether to commit the landed work now.
- **Clean, because Step 5's intermediate commits already took everything → ask NOTHING here.** Hand straight to `git-commit` and let its Q2 ("Push" / "Don't push") be the single confirmation for pushing the BRANCH. Asking your own push question and then delegating to a skill whose next question is WORD-IDENTICAL IS the doubled ask. Handing over takes no action on its own: nothing is committed or pushed before that Q2.

**The explicit-yes rule below binds the DIRTY branch only.** "Commit this work at all?" is a different question from Q1's "single or split?" and Q2's "also push?"; on the clean branch there is nothing left to commit, so no yes is owed and the hand-off is unconditional.
Dirty branch, on an explicit yes → commit via `git-commit` (owns its own confirmation + default-branch/branch gate; don't hand-roll). User declines → skip. Commit unavoidably carries ANOTHER feature's uncommitted work (shared file, interleaved edits) → that feature's DONE gate is being bypassed. Name it and get its opt-in too, or don't commit. Never make the DELIVERABLE commit before this point. The clean-tree case is `git-commit`'s PUSH-ONLY EXCEPTION: a clean tree with unpushed commits does NOT stop at its STEP 1, it goes on to a push-only STEP 3. Clean AND nothing unpushed → `git-commit` stops, and that is a valid end. A PR is not offered here — `git-commit`'s PR trigger owns it, and it fires only if you ask for one.

Then the BRANCH itself. **This step owns the landing of a feature's branch** — `git-commit`'s Q3 stays suppressed for as long as a feature owns that branch. Feature sat on a branch ≠ the default branch → **STOP. Ask via AskUserQuestion.** **Spell that question out; it does not get to be improvised.** Heading: "Land the branch?". Options: "Keep the branch" / "Merge into `<default>`, delete the branch — here AND on `<remote>` if it is published there — and push `<default>`". The label carries the ACTION; the option's DESCRIPTION says why it is safe — the branch is merged by the time it is deleted, and `git branch -d` refuses, stopping the sequence, if it is not.

**`<default>` must be BOUND before you can word this, and it may not be** — a `git-commit` run that STOPped at its STEP 1 never resolved the name. Unbound → follow `git-commit` STEP 1's `<default>` bullet as a PROCEDURE; no remote → that bullet's only source IS the question, so asking is the procedure itself. Binding it HERE is also what lets the land list treat it as a check rather than resolve it again.

The wording differs from `git-commit`'s Q3 in three places, all deliberate: the trailing push clause is added; its first option drops Q3's "Just commit, " prefix and its second drops "Commit, then ", because the commit question has already been asked and answered. **The `if it is published there` clause is NOT one of the differences and must not be dropped** — Step 5's intermediate commits do not guarantee a push, so an unconditional promise of a remote delete names a mutation that may not exist. That clause goes only when NO remote exists at all. **The push clause is not decoration:** this ask is the only one in the whole flow that names publishing the MERGE, and deleting the branch's only published copy while the merge stays local empties the remote of the feature's work. Both or neither. No remote at all → drop both clauses.

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
