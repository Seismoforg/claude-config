---
name: feature
description: Use when planning, specifying, approving, tracking, or implementing new features. Manages the /features lifecycle, state transitions, approval gates, and completion validation.
---

# FEATURE SYSTEM

Manages every feature lifecycle operation in `/features`.

**Only files inside `/features` define feature state.** Chat is never a spec source. A requirement
that exists only in chat does not exist until it is written into a feature file.

# ON ACTIVATION — STATE CHECK FIRST
Before anything else:

0. **Nothing named** → don't guess. List the non-terminal features (draft, pending, approved,
   in-progress, ready-for-done) and ask via `AskUserQuestion` what to do, including a "start
   something new" option. Describing a candidate means READING it end to end, never grepping its
   Summary — a spec's later sections can invert its earlier ones.
0.5. **Filing a record rather than proposing work** — technical debt, or a finding the user declined
   → **write-only entry**. Claim the file with `new-feature.mjs`, write a minimal spec, status
   DRAFT, and STOP. No interview, no gates, no folder move. It re-enters the workflow later, when
   the USER picks it out of `draft/`.
1. Identify which feature the request refers to, by name or timestamp.
2. **Exists** → open it, read `status`, confirm the folder matches (run the MECHANICAL CHECK, don't
   eyeball it). Folder ≠ status → STOP and report. Never guess which side is right.
3. **Doesn't exist** → new feature, start at step 0.
4. State the current status and the single allowed next action, then proceed.

Never plan, approve, implement, validate or change status without this check.

# STRUCTURE
Path: `/features/<state-folder>/<timestamp>-<slug>.md`. Slug is lowercase-kebab.
Example: `/features/pending/20260124-1530-user-auth.md`

**Never derive the id yourself. A script does it, and it CREATES the file:**
```
node ${CLAUDE_SKILL_DIR}/scripts/new-feature.mjs <slug> [--folder <state>] [--root <project>]
```
It prints the path it claimed on stdout and nothing else. Write your content into that file.
`--folder` defaults to `draft`; `--root` defaults to the shell CWD, so pass it when the CWD is not
the project holding `features/`.

**It cannot run → STOP and report.** Never fall back to deriving an id by hand. A hand-built id
looks completely normal, so the regression would be invisible.

What the script guarantees, stated here because a script says what it does and never what it is
allowed to do:
- `YYYYMMDD-HHMM` is a real local clock time, both halves. A run just after midnight files under
  tomorrow's date, which is correct.
- The date is fixed for one run: a candidate rolling past `2359` wraps to `0000` of the SAME day.
- Creating the file empty IS the claim, and it is atomic. Two sessions in one minute cannot collide.
- An id is taken if it exists in ANY state folder. A feature is identified by its timestamp alone.

One feature per file. No index file. A request bundling several independent features → split it into
separate files; ambiguous grouping → confirm the split with the user.

# STATE MACHINE
```
/features/draft/          → DRAFT          → interview, gates, then request approval
/features/pending/        → NEEDS_APPROVAL → wait for the user
/features/approved/       → APPROVED       → move to in-progress, then implement
/features/in-progress/    → IN_PROGRESS    → implement, then validate
/features/ready-for-done/ → READY_FOR_DONE → wait for user confirmation
/features/done/           → DONE           → terminal
/features/discarded/      → DISCARDED      → terminal, abandoned before DONE
```

Discard is the one non-linear exit: from any pre-DONE state the user may discard → set status
DISCARDED, move to `/features/discarded/`. Never silently delete a feature file.

**A spec's own gate task can refute the spec, and there is no backward edge to DRAFT.** A task whose
job is to decide whether the approach WORKS — a measurement, a spike, a probe — coming back negative
kills the SOLUTION, not the Problem. So discard it, record the evidence, name the successor, and file
the re-scope as a new DRAFT pointing back.

Rules:
- Folder and status field ALWAYS match.
- Linear and forward-only, with one exception: **rework.** Delivered work fails its OWN spec — a bug
  found, a requirement missed — from ANY state including DONE → move back to IN_PROGRESS, fix,
  re-validate, advance again. Never change a feature's code while its file sits in `ready-for-done/`
  or `done/`. Repeated reports of one symptom are where this slips.
- **Fast path:** the user picks "Approve & implement" at the approval gate → the file may go
  NEEDS_APPROVAL → APPROVED → IN_PROGRESS in one move. Several features approved at once → only the
  one you START now takes the fast path; the rest wait in `approved/`.
- A transition = update the `status` field first, in place, THEN move the file. After moving, re-read
  before the next in-place edit. Anchor that edit on the FRONTMATTER — include the neighbouring
  `created:` line, because a spec discussing the lifecycle quotes its own status literals in the body
  and a bare `status: X` matches twice. Use the file-editing tool, never a stream editor: a
  `$`-anchored `sed` pattern matches nothing on a CRLF file, so the transition silently no-ops at
  exit 0.
- Move via a path anchored to the features dir, never relative to the shell CWD. Feature files are
  usually untracked → plain `mv`, not `git mv`. Create the destination folder if it does not exist.

# MECHANICAL CHECK
Folder-status agreement and filename shape are deterministic. Run the script; never eyeball them:
```
node ${CLAUDE_SKILL_DIR}/scripts/check-features.mjs [root]
```
Exit 1 = violations as `file  rule  detail`.

Always checked: `folder-status-mismatch`, `bad-filename`, `bad-timestamp`, `abandoned-claim`,
`unknown-folder`, `missing-status`, `no-frontmatter`, `duplicate-id`.

Gated, so read the trigger before trusting a green run: `debt-not-recorded` fires only on a
`ready-for-done/` or `done/` spec carrying both `# Open Questions` and `# Premortem`;
`tasks-not-current` and `unterminated-fence` need those two folders plus a `# Premortem` section. An
unclosed fence in an earlier folder is therefore NOT seen.

**Read the detail string — a violation means different things:**
- `folder-status-mismatch`, `missing-status`, `no-frontmatter` are never auto-fixed. STOP and report;
  which side is right is exactly what the script cannot know.
- `tasks-not-current` is fixed in place: tick the box if the work landed, annotate it if it did not.
- `abandoned-claim` is fixed in place. An EMPTY spec is an id claimed by a session that died before
  writing. Fill it or delete it. Treating it as a STOP would let one crashed session block every
  later state check.
- `bad-timestamp` — `HHMM` is not a 24h time. Only reachable by an id nobody generated. Fix the name.

**The script reports repo-wide, so a red run says nothing about YOUR file on its own.** Grep the
output for the filename you just wrote.

## The tick hooks
The tick cadence is mechanised by two hooks. Neither is a command you run:
```
node ${CLAUDE_SKILL_DIR}/scripts/tick-sync.mjs
node ${CLAUDE_SKILL_DIR}/scripts/tick-guard.mjs
```
- **`tick-sync.mjs` is a PostToolUse hook on `TodoWrite`.** It SETS the box in every `in-progress/`
  spec to follow its todo, both ways: `completed` ticks it, anything else clears it. So the box is
  not something you draw. It never guesses — no matching todo, an annotated line, or a task text
  living in two in-progress specs at once, and it leaves the line alone. What it does goes to
  `features/.tick-sync.log`. **Doing nothing is silent by design**, so an unchanged log means nothing
  needed doing, NOT that the hook stopped.
- **`tick-guard.mjs` is a Stop hook.** One job: block while any `# Tasks` item has no todo. It blocks
  once per signature, then only advises, so nothing can wedge.

Both are registered in `~/.claude/settings.json`, fed hook JSON on stdin, and reach every project.
Both fail open on any internal error. Where they are not registered, step 6's rule binds on its own.

# FEATURE FILE FORMAT
```
---
title: <feature name>
status: DRAFT | NEEDS_APPROVAL | APPROVED | IN_PROGRESS | READY_FOR_DONE | DONE | DISCARDED
created: YYYYMMDD-HHMM
risk: low | medium | high
---
```
Body, all required:
```
# Summary
# Problem
# Solution
# Technical Plan
# Tasks
# Impact Analysis
# Validation
```

- **`# Tasks`** — a checklist (`- [ ] ...`). An unchecked box in `ready-for-done/` or `done/` must
  carry `BLOCKED`, `NOT DONE`, or a feature id, on its line or a continuation. **An item's task text
  is ONE physical line** — the tick matcher reads no further. May be grouped under `## <milestone>`
  sub-headings.
- **`# Impact Analysis`** — affected, new and deleted files; breaking changes; overlap with other
  in-flight features editing the same files.
- **`# Validation`** — filled at the READY_FOR_DONE gate.

Added by the gates, in the order their gate runs. None of these replaces a required section:
```
# Open Questions   (step 2 — one row per category: question or evidence · answer · what changed)
# Premortem        (step 3 — failure report + mitigation table, or the one-line skip record)
# Milestones       (step 4 — the cut and why, or the one-line skip record; then one check line
                   #  per milestone as step 6 finishes it)
# Debt Found       (step 6 — one line per shortcut: what · path:line · why · the DRAFT id step 7
                   #  files it as)
```
- `# Open Questions` and `# Milestones` are present on EVERY spec that reached step 5. Their gates
  have no threshold, so absent there is a defect. Absent is correct only where the gate never ran —
  a write-only record, or a spec predating the gate.
- `# Premortem` is conditional on step 3's threshold.
- `# Debt Found` is conditional on a shortcut actually being taken. Absent means none was — a claim
  step 7 makes you state out loud, never a silence it accepts.

**`Open assumption:` lines** — a trailing list under `# Technical Plan`, one line each: what you
assumed and why, for anything the spec could not settle. Every spec writer produces them. They are
step 2's candidate list, so a spec that smooths its assumptions away disarms the gate that exists to
confirm them.

**Language and style:** feature files are English, terse, plain — `rules/documentation.md` owns it.

# WORKFLOW

## 0. Route — interview, or straight to the spec
Every new feature enters here.

The test: **to fill the spec, would you have to INVENT a decision the user has an opinion about?**
Not "can I write fluent prose for this section" — you always can, and that fluency is the failure.
Ask which concrete choices you would be making FOR them: a limit, a default, a storage location, a
scope cut.

- **None** → go straight to step 1.
- **Any** → run the interview in `reference/grilling.md`, joined onto this skill's announced base
  directory. It performs step 1 for you and hands back at step 2.

## 1. Create → DRAFT
Claim the file with `new-feature.mjs` (STRUCTURE owns the invocation), then write the spec into the
path it prints. Fill every section as far as known.

**Every spec write goes through the file-writing tool, never the shell.** No `cat >`, no heredoc (a
quoted delimiter does not save it), no `sed -i`, no inline interpreter. This binds every "append" in
steps 2, 3, 4, 6 and 7 too. A mangled shell write can still exit 0, and nothing validates spec prose.

The change mirrors an existing one (same layer, sibling module) → read that precedent FIRST and
mirror its structure. A plan drafted from the file tree alone puts constants and wiring in
plausible-but-wrong places. **A precedent that is the SOLE user of a shared mechanism proves nothing
about a SECOND one** — hook, event bus, registry, singleton slot: read the mechanism's own
composition contract before planning to be user number two.

Anything the spec cannot settle becomes an `Open assumption:` line under `# Technical Plan`. A spec
with no assumption list hands step 2 a blank page.

Two greps that SIZE the spec:
- Spec fixes a defect CLASS (a rule missing from several files, one pattern wrong in several places)
  → grep every instance BEFORE writing Tasks, and count from the grep, not from the report.
- Plan changes an exported SIGNATURE → count call sites by grepping the SYMBOL, not the feature's
  surface description. The two sets differ.

Then step 2. Never straight to the approval gate.

## 2. Implementation questions — ask before the critique
Runs on EVERY spec. No threshold, no folder move, no status change. Carve-out: the write-only record
from ON ACTIVATION 0.5, which never reaches the approval gate.

Frame: **it is one day later, you are about to start implementing this spec, and you still have
questions. What are they?**

Spec already carries `# Open Questions` → it ran; go to step 3, unless a revision opened a new
question. That section is the only record that it ran.

1. Read the spec — its `Open assumption:` lines FIRST, they are your candidate list — and
   `reference/open-questions.md`, joined onto this skill's announced base directory.
2. Walk the five categories. Each ends in a QUESTION or a `settled by <evidence>` line, never blank.
   A candidate is a question only if a WRONG ANSWER COSTS REWORK. Evidence is a repo `file:line`, an
   earlier user answer, or "no consequence either way" — never the spec you are writing.
3. Questions qualify → **STOP. Ask via `AskUserQuestion`** (APPROVAL GATES, end of file), ONE
   round, max 4. More than 4 → ask the top 4 by cost, record the rest as deferred. None qualify →
   ask nothing; the evidence lines are the record, and the gate still ran.
4. Edit the spec. Then write the table, recording the edits you MADE, never intentions.
5. Append `# Open Questions` at the END of the file. Re-running on a revision → EXTEND the existing
   section, never append a second.
6. Re-ran on a revision and edited the spec → an existing `# Premortem` mitigation table now names
   sections that changed after it was written. Refresh it, or re-run step 3.

## 3. Premortem — self-critique before the gate
Runs before approval. No folder move, no status change, no user stop.

Threshold — run it when ANY holds:
- more than 2 files or modules touched
- a new dependency introduced
- existing skills, rules or their interfaces changed
- more than ~1h of work, or work spanning several sessions

None holds → skip it, and record the skip BOTH ways: a one-line `# Premortem` section naming the
criteria you checked, and that same line in the step-5 summary. A silent skip reads identical to a
forgotten one.

Spec already carries `# Premortem` → it ran; go to step 4.

1. Read the spec and `reference/premortem.md`, joined onto this skill's announced base directory.
2. Write the failure report.
3. Edit the spec. Then write the mitigation table, recording edits you MADE.
4. Append report and table as a new `# Premortem` section at the END of the file.

## 4. Milestone cut — stage the build, or say why not
Runs on EVERY spec, after the premortem. No threshold, no folder move, no status change. Same
carve-out as step 2. Spec already carries `# Milestones` → it ran; go to step 5.

Frame: **the build is half done and something goes wrong. What has already been checked, and what
has to be thrown away?** A milestone is where that answer changes.

The cut rule: **a milestone must be EXERCISABLE ON ITS OWN.** Its tasks leave the repo in a state you
can run something against and get a real answer from. A phase of one indivisible change is not one —
a rule restated in seven files is self-contradictory until the seventh lands, so "edit four" then
"edit three" cuts nothing. SEAMS decide this, never size.

1. **Cut** → group `# Tasks` under `## <milestone name>` sub-headings, in build order. Task wording
   is untouched; only order and grouping change. Every task belongs to exactly one milestone.
2. **No cut** → say what you checked and why no slice stands alone. A bare "not needed" is not a
   record; this gate has no threshold to hide behind.
3. Append `# Milestones` at the END: the milestones in build order, one line each on what that
   milestone makes exercisable, or the one-line skip record.

## 5. Request approval → NEEDS_APPROVAL
Move to `/features/pending/`. Summarize for the user. The summary carries the output of steps 2, 3
and 4, and none is optional:
- Step 2 → the answers and what each changed (nothing qualified → say that, naming the categories
  checked), PLUS every `Open assumption:` line still unresolved, said out loud.
- Step 3 → the mitigation table, not the report. Skipped → the one-line reason.
- Step 4 → the milestones in build order, or why no slice stands alone.

**STOP. Ask via `AskUserQuestion`.** Offer at least:
- **Approve & implement** → APPROVED, then the implementation gate, then implement, without asking
  again.
- **Approve, don't implement yet** → APPROVED, then stop.
- **Change spec** — stay in NEEDS_APPROVAL, refine in place. Then re-enter the gates the revision
  invalidated, from `pending/`: step 2 if it opened a new question, step 3 if it newly crosses that
  threshold or if step 2 edited the spec after the mitigation table was written, step 4 if the
  revision added, removed or re-ordered tasks.
- **Discard** → DISCARDED, move to `/features/discarded/`.

Those four LABELS are fixed; their DESCRIPTIONS are not written for you. Each must carry what the
choice does to this spec and what it costs.

Only an explicit "Approve" counts as approval. An implement option IS the explicit confirmation to
proceed.

Spec settles a choice the user judges by LOOK or FEEL — layout, composition, interaction shape →
never record it as decided. Offer the viable options AT this gate.

## 6. Implement
Before ANY code change: verify the file exists AND status = APPROVED, then move to
`/features/in-progress/`.

**A spec can be APPROVED and still have nothing to build.** A write-only record ships with
`# Solution` and `# Technical Plan` as placeholders. Read both here. Placeholder → write the plan
into the spec and put the APPROACH to the user via `AskUserQuestion` before any code. That plan has
had no premortem: crosses step 3's threshold → run it now. Record the approach answer as
`# Open Questions` in the same pass, and run step 4 against that plan too.

**Then SEED THE MIRROR: one todo per `# Tasks` item, `content` copied VERBATIM.** Always, at every
size. VERBATIM is not style — `tick-sync.mjs` matches todo to task by its FIRST PHYSICAL LINE, so a
paraphrased todo is a box that never moves, and so is a task that WRAPS. Keep every `# Tasks` item on
one line. Re-seeding after a task is ADDED mid-build is part of the same rule, and `tick-guard.mjs`
blocks until you do. The mirror is milestone-BLIND: seed EVERY item now, including milestones you
will not start for hours. No `TodoWrite` reachable → tick each box by hand as its task lands, and
treat any `tick-guard.mjs` block as unsatisfiable.

Then build:
- **Build only the spec's tasks.** Scope changes → update the spec first.
- **Spec cut into milestones → build them in order**, one finished before the next starts. As each
  lands, exercise what it made exercisable and add one line under `# Milestones`: what you ran, what
  you saw. **A FAILED milestone check stops the build** — see the invalidated-premise rule below.
- **`# Tasks` is a live work-list, and you do NOT tick it.** Move the TODO the moment its task lands;
  that is the whole act. `tick-sync.mjs` sets the box to follow, in the same turn. Do not also edit
  the box by hand: a box you tick while its todo still reads `pending` is cleared again on the next
  `TodoWrite`. No hook or no `TodoWrite` → you tick the box yourself, in the same act.
- The LIST itself changes too. A task added mid-build is added silently; a task REMOVED or REWORDED
  carries a one-line reason. A task "removed" after being delivered by a knowingly weaker means is
  DEBT, not a removal. One never delivered stays an unfinished task.
- **Knowingly leaving a shortcut is DEBT, and debt becomes its own feature.** Note it under
  `# Debt Found` the MOMENT you take it; step 7 files it. Three things look like debt and are not:
  an UNDELIVERED task (report it blocked), debt you did not create (mention it, don't fix it
  silently), and a finding the user declined (that gets its own write-only DRAFT).
- A fact found while building that INVALIDATES the premise of a decision the user made at a gate →
  re-open it via `AskUserQuestion`, stating the new fact.
- Feature DERIVES its output from real data (heuristic, scan, model) → run the real pipeline on real
  input as soon as ONE slice works, before building the rest. Tests written first encode your
  assumption about the data and all go green while the derivation is wrong. That run is a local
  resource run: ask first.
- A COUNT the spec asserts (files, sites, instances) goes stale between planning and building →
  re-run it before you build from it, and say what you got.

**Rules to read while building** — CLAUDE.md's routing table owns the full mapping. Always
`rules/core.md`; then the stack files the change touches, `rules/security.md` when it touches auth,
sessions, input handling or external payloads, and `rules/documentation.md` when it touches
architecture, modules, public APIs, `AGENTS.md` or ADRs. Read them BEFORE writing, not after.

**When the work is in, run the shell-bound checks over the FINISHED result** — `preflight.mjs` on a
design surface, `check-adr.mjs` when an ADR changed. Commit what that pass makes you fix.

Intermediate commits during implementation are fine, but NEVER on the default branch: branch first
as `feature/<this feature file's slug>`, timestamp dropped. The FINAL deliverable commit waits until
after the user moves the feature to DONE, and only if they opt in there. This binds every commit the
workflow makes — a commit carrying only feature FILES is still a commit.

## 7. Validation gate → READY_FOR_DONE
Do NOT move to DONE. Verify and record under `# Validation`:
- All tasks complete. A box left unchecked must say WHY on its own line or a continuation —
  `BLOCKED`, `NOT DONE`, or the id of the feature the work moved to.
- Every `# Debt Found` line filed as its own DRAFT, claimed with `new-feature.mjs` (write-only, per
  ON ACTIVATION 0.5, minimal), its id written back onto the line. An ABSENT section is not proof:
  `# Validation` records either the filed ids or the LITERAL phrase "no debt taken" — the check
  greps for exactly that, so a paraphrase goes red.
- Docs updated if required (`rules/documentation.md`).
- Code conforms to `rules/core.md` and the stack files that applied.
- Build succeeds if applicable; tests pass if available.
- Every changed code path actually exercised.
- Full validation needs a genuinely external action (deploy, service restart, third-party run), OR
  the user declined a local resource run → record what you DID verify versus what remains, and
  surface the pending step. Never report it as fully validated. This is the one home for a declined
  run.
- Do NOT make the deliverable commit here. Intermediate commits during fixes are fine.

Verification fails → fix the root cause, re-run. The same check fails again after a fix attempt →
stop, report the failure and your diagnosis. Do not weaken the check, skip it, or keep guessing. Ask
before a third attempt.

Then move to `/features/ready-for-done/`. **STOP. Ask via `AskUserQuestion`:** "Implementation
complete and validation passed. Move to DONE?" Offer at least **Move to DONE** and **Leave open for
now**. Only DONE counts as the explicit confirmation for step 8. Both options need a DESCRIPTION —
DONE unlocks step 8's commit and branch-landing asks and closes the spec to further tasks; "Leave
open" keeps it in `ready-for-done/` where more work can still be added, at the price of the feature
staying unclosed.

## 8. Finalize → DONE
Only on explicit user confirmation: move to `/features/done/`.

Then, and only after that move, optionally commit. Read the working tree FIRST.
- **Dirty → STOP. Ask via `AskUserQuestion`** whether to commit the landed work now.
- **Clean, because step 6's intermediate commits already took everything → ask NOTHING here.** Hand
  straight to `git-commit` and let its push question be the single confirmation. Asking your own
  push question and then delegating to a skill whose next question is word-identical IS a doubled
  ask. Handing over takes no action on its own.

On an explicit yes → commit via `git-commit`; it owns its own confirmation and the default-branch
gate. Don't hand-roll it. The user declines → skip. The commit unavoidably carries ANOTHER feature's
uncommitted work → that feature's DONE gate is being bypassed. Name it and get its opt-in too, or
don't commit.

Then the BRANCH. **This step owns the landing of a feature's branch.** Feature sat on a branch that
is not the default branch → **STOP. Ask via `AskUserQuestion`.** Spell that question out; it does not
get improvised. Heading: "Land the branch?". Options: "Keep the branch" / "Merge into `<default>`,
delete the branch — here AND on `<remote>` if it is published there — and push `<default>`".

The safety fact that question owes its reader: the branch is merged by the time it is deleted, and
`git branch -d` refuses, stopping the sequence, if it is not.

**`<default>` must be BOUND before you can word this** — follow `git-commit` STEP 1's procedure for
resolving it. No remote → that procedure's only source IS the question, so asking is the procedure.

**The `if it is published there` clause must not be dropped.** Step 6's intermediate commits do not
guarantee a push, so an unconditional promise of a remote delete names a mutation that may not exist.
**The push clause is not decoration:** this ask is the only one that names publishing the MERGE, and
deleting the branch's only published copy while the merge stays local empties the remote of the
feature's work. Both clauses or neither. No remote at all → drop both.

Only on an explicit yes. **`git-commit` STEP 4's "Land the branch" list owns the full sequence —
follow that list as a procedure. Do NOT re-invoke `git-commit` to reach it.** Re-invoking restarts at
its STEP 1, and both outcomes there are wrong. Declined → the branch stays; say so plainly.

**You report the landing, because nobody else can.** State the merge commit, what was deleted locally
and remotely, and whether `<default>` was pushed or left local. A delete that failed is reported as
failed. A `git-commit` report that already ran can be CONTRADICTED by yours — say which is current.

## 9. Retrospective
After a resting point — DONE, or the user leaves it in READY_FOR_DONE, or discards it — invoke
`self-improve` via the Skill tool. It LOGS what went wrong; it does not edit a skill here.

# HARD RULES
Non-obvious, high-severity only. The state machine and workflow above are not repeated here.
- **Only `/features` files define state; chat doesn't.**
- **No implementation before status = APPROVED and the file sits in `in-progress/`.**
- **No skipping states; folder and status ALWAYS match**, including the documented fast path.
- **DONE requires explicit user confirmation — never automatic.** READY_FOR_DONE requires recorded,
  passing validation.
- **The final deliverable commit happens ONLY after the user moves the feature to DONE, and only if
  they opt in.** Never at READY_FOR_DONE, never automatically. This binds a commit that carries a
  feature's work sideways too: sweeping in another feature's uncommitted changes lands it without its
  own gate. Intermediate commits during the build are fine, and still never on the default branch.
- **Every user-waiting transition MUST use `AskUserQuestion`** — never a free-text prompt.
- **A follow-up change contradicting an already-DONE spec** → a new feature, or a brief amendment
  note in the DONE file. The terminal spec never drifts from the code.
- **High-risk features require explicit approval before implementation.**

# APPROVAL GATES
Every "STOP. Ask" above means `AskUserQuestion`, multiple choice, never free text. What has to be
INSIDE such a question — subject, consequence, price, gloss, show, and the label/description split —
is `~/.claude/rules/asking.md`. Read it before writing a gate question.
