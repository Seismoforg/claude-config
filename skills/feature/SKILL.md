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
1. Identify which feature the request refers to (name or timestamp).
2. Exists → open it, read `status`, confirm folder matches status (MECHANICAL CHECK below — run it, don't eyeball). Folder ≠ status → STOP and report the mismatch, don't guess.
3. Doesn't exist → new feature, start at Workflow step 1.
4. State the current status + the single allowed next action, then proceed.

Never plan/approve/implement/validate/change status without this check.

# STRUCTURE
Path: `/features/<state-folder>/<timestamp>-<slug>.md`
Time: `YYYYMMDD-HHMM` — date part is ALWAYS today's date from context. Clock time unavailable → derive only the time part: newest file dated today across ALL folders (draft/pending/approved/in-progress/ready-for-done/done/discarded — not just non-terminal) → a minute just after it; else start today early (e.g. 0001). Never move the date off today; never fabricate a wall-clock time.
Slug: lowercase-kebab, no spaces. Example: `/features/pending/20260124-1530-user-auth.md`

One feature per file. Chronological by filename. No index file. One request bundling multiple independent features → split into separate files; ambiguous grouping → confirm the split with the user.

# STATE MACHINE
```
/features/draft/         → DRAFT          → refine, then request approval
/features/pending/       → NEEDS_APPROVAL → wait for user
/features/approved/      → APPROVED       → move to in-progress, then implement
/features/in-progress/   → IN_PROGRESS    → implement, then validate
/features/ready-for-done/→ READY_FOR_DONE → wait for user confirmation
/features/done/          → DONE           → terminal
/features/discarded/     → DISCARDED      → terminal (abandoned before DONE)
```
Discard is the one non-linear exit: from any pre-DONE state the user may discard → set status DISCARDED, move to `/features/discarded/`. Never silently delete a feature file; discarding preserves the record.
Rules:
- Folder and status field ALWAYS match.
- No skipped states. Linear, forward-only, EXCEPT rework: delivered work fails its OWN spec (bug found, requirement missed) — from ANY state INCLUDING DONE → move back to IN_PROGRESS, fix + re-validate, then advance again. (A change that CONTRADICTS the spec is a different case → HARD RULES.) Never change a feature's code while its file sits in ready-for-done/ or done/ without first moving it back — the folder must reflect that work resumed.
- Exception — "Approve & implement" fast-path: user picks that combined option at the approval gate → file may advance NEEDS_APPROVAL → APPROVED → IN_PROGRESS in one move (record approval, land in in-progress/) with no rest in approved/. A collapse of adjacent transitions, not a skipped state.
- Exception — audit remediation fast-path: an approved `audit-solution` scope may create the feature file DIRECTLY in in-progress/ (its Step-4 approval replaces this gate); the empty draft/pending/approved rests collapse. Same one-move collapse, not a skipped state.
- A transition = update the `status` field first (edit in place), THEN move the file. After moving, re-read before the next in-place edit — the move invalidates the prior read, so an edit at the new path fails otherwise.
- Move via a path anchored to the features dir (absolute or repo-root-relative), never relative to the shell CWD (it may have drifted after build/test commands). Feature files are usually untracked (the features dir is commonly VCS-ignored) → plain `mv`, not `git mv`.

# MECHANICAL CHECK
Folder↔status and filename shape are deterministic. Run the script; never eyeball them:
```
node ${CLAUDE_SKILL_DIR}/scripts/check-features.mjs [root]
```
Exit 1 = violations as `file  rule  detail` (folder-status-mismatch, bad-filename, unknown-folder,
missing-status, no-frontmatter). Consistency only — that a status was EARNED (work done, validation
run) stays a judgment call, and a mismatch is never auto-fixed: ON ACTIVATION says STOP and report.

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
# Tasks            (checklist: - [ ] ...)
# Impact Analysis  (affected/new/deleted files; breaking changes; overlap with other in-flight features editing the same files)
# Validation       (filled at the READY_FOR_DONE gate)
```
**Language + style: feature files follow ENGLISH + SIMPLE ARTIFACTS** (`skills/_shared/blocks.md`) — English + terse/plain across title, all sections, Tasks; every requirement/number/file/constraint kept.

# WORKFLOW

## 0. Brainstorm (optional) → ideas
When the feature is vague, exploratory, or the user asks for ideas/options/"what could we do" — before writing any spec, invoke `drunken-genius` via the Skill tool to generate and filter ideas. Let it run its wild-round → sober-look → nightcap process.
- Skip when the request is already a concrete, well-specified feature — go straight to step 1.
- Brainstorming stays in chat; it is NOT feature state. Nothing exists until step 1 writes it into `/features/draft/`.
- Once the user picks an idea (or a merge of several), carry it into step 1 as the DRAFT's Summary/Problem/Solution seed.

## 1. Create → DRAFT
Write the spec into `/features/draft/`. Fill all sections as far as known.
Change mirrors an existing one (same layer, sibling module) → read that precedent FIRST and mirror its structure. A plan drafted from the file tree alone puts constants and wiring in plausible-but-wrong places, and the correction lands mid-implementation.

## 2. Request approval → NEEDS_APPROVAL
Move to `/features/pending/`. Summarize for the user. **STOP. Ask via AskUserQuestion** (see APPROVAL GATES, end of file). Offer at least:
- **Approve & implement** — explicit approval: → APPROVED (step 3) → implementation gate (step 4) → implement (step 5) without asking again.
- **Approve, don't implement yet** — → APPROVED then stop.
- **Change spec** — stay in NEEDS_APPROVAL, refine.
- **Discard** — → DISCARDED, move to `/features/discarded/` (abandon, keep the record).
Only an explicit "Approve" choice counts as approval. An implement option IS the explicit confirmation to proceed.

## 3. Approve → APPROVED
Only on explicit approval: move to `/features/approved/`.

## 4. Implementation gate → IN_PROGRESS
Before ANY code change: verify file exists AND status = APPROVED. Then move to `/features/in-progress/`. Implementation begins only after this.

## 5. Implement
Build only the spec's tasks. Scope changes → update the spec first. Keep Tasks current.
- Apply `coding-standards` to every code change.
- Apply `security-review` when the feature touches auth, sessions, input handling, or external payloads.
- Apply `web-standards` to any web/UI change (responsive, a11y, perf, motion).
- Apply `taste` when the feature is frontend design work — landing/marketing/hero/portfolio surfaces, redesigns, visual polish, "make it look good / not templated" (composes with `web-standards`).
- Apply `documentation` whenever the change touches architecture, modules, responsibilities, public APIs, AGENTS.md, ADRs, or technical debt.
Invoke each skill via the Skill tool; don't just paraphrase.
- Fanning an enumerated task/checklist out to parallel workers → explicitly assign every item, and re-verify full coverage against the list before dispatch AND after merge; unassigned items drop silently.
Intermediate commits during implementation are fine — but NEVER on the default branch: branch first (`git-commit` STEP 1 owns resolving the default branch's name and its Q0 gate; don't hand-roll either). The FINAL deliverable commit waits until AFTER the user moves the feature to DONE (Step 7), and only if the user opts in there.

## 6. Validation gate → READY_FOR_DONE
Do NOT move to DONE. Verify and record under `# Validation`:
- all tasks complete, no unfinished work
- docs updated if required (via `documentation` when architecture/APIs/AGENTS.md/ADRs/debt touched)
- code conforms to `coding-standards`
- build succeeds (if applicable)
- tests pass (if available)
- every changed code path actually exercised. A path needing an unavailable dep (model, GPU, paid API) is NOT "outside your control" — drive it with a stub/mock before declaring done; an unrun changed branch is unverified, not "structurally verified"
- data/config entries consumed by existing code (catalog/registry/list) count as a changed path — "it parses" is NOT validation. Exercise ≥1 representative entry through the real consuming path; entries vary in format and only the live path reveals a break
- changed path is harness-registered config (agent/skill/hook definition) → it may not be dispatchable in the SAME turn it was written. A not-found error is NOT proof the definition is wrong — re-check in a later turn before reporting it blocked or broken
- validating a RULE you wrote by RUNNING it yourself tests your hand-operation, not the rule. Whatever the text tells its executor to derive (a path, a command, a value) must be derived FROM THE TEXT during the test — supply it by hand and a green run proves nothing about the step you skipped, which is exactly where the rule can be wrong
- changed path is PROSE a model executes (skill, workflow, rule file, prompt) → "it reads fine" is NOT validation. You cannot audit your own prose — you know what you meant. Hand it to a FRESH model with no context; demand a reachability/coherence trace naming every dead or offered-but-unexecutable path. Expect it to find defects the change itself introduced
- exercising a changed path that MUTATES persisted/user state (settings store, DB, on-disk files) → find the store's REAL path first (don't assume it), snapshot it, restore it after; never leave test data in the user's state
- exercising a streaming/real-time/async changed path → size the test so the observed window outlasts connect/setup latency; a run that finishes before the observer attaches proves nothing — observe events arriving over time, not just a final snapshot
- a path that EMITS events/metrics/callbacks → assert the payload VALUES, not just that events fire; a fired-but-null/empty event (e.g. metric present but its value None) passes a count check yet violates intent
- full validation needs a genuinely external action (deploy, service restart, third-party run) → record what you DID verify vs what remains under `# Validation`, surface the pending step to the user — never report it as fully validated
- changed a rule/value that can exist in MORE THAN ONE place (shared constant, config default, duplicated doc/rule text) → grep repo-wide for other copies before ready-for-done. A spec scoped to one file does not stop a stale copy elsewhere from silently defeating the change. **Grep finds literal COPIES, not DEPENDENTS** — a rule stated in OTHER words whose truth your change just broke shares no string with it, so every literal grep passes while an absolute rule elsewhere now contradicts you. Also re-read each invariant section (HARD RULES, "always/never") end to end and ask of every rule: still true?
- do NOT make the DELIVERABLE commit here. It waits until after DONE (Step 7), and is user-opt-in. Intermediate commits already made during Step 5 are fine and stay.
Verification fails (build/tests red) → fix the root cause, re-run. Same check fails again after a fix attempt → stop, report the failure and your diagnosis to the user, do NOT weaken the check, skip it, or keep guessing at patches. Ask before a third attempt at the same failing check. Same stop when each fix round CLOSES its named defects but opens new ones in its own blast radius: two such rounds = not converging → report the pattern and ask, don't start a third.
Then move to `/features/ready-for-done/`. **STOP. Ask via AskUserQuestion**: "Implementation complete and validation passed. Move to DONE?" Offer at least **Move to DONE** / **Leave open for now**. Only DONE counts as the explicit confirmation for step 7.

## 7. Finalize → DONE
Only on explicit user confirmation: move to `/features/done/`.
Then — and only after that move — OPTIONALLY commit. **STOP. Ask via AskUserQuestion** whether to commit the landed work now. Only on an explicit yes, commit via `git-commit` (owns its own confirmation + default-branch/branch gate; don't hand-roll). User declines → skip; leave it as it is. Never make the DELIVERABLE commit before this point — intermediate commits from Step 5 may already exist and stay. Work that was already committed intermediately reaches here on a branch, with nothing left to commit: then this ask is about pushing / opening a PR, and `git-commit` reporting a clean tree is a valid end, not a failure.

## 8. Retrospective — `self-improve`
After a resting point (DONE, or user leaves it in READY_FOR_DONE / discards), invoke `self-improve` via the Skill tool (AFTER THE TASK in `skills/_shared/blocks.md` owns the rule). Scope it to this + the skills applied during implementation.

# HARD RULES
Non-obvious, high-severity only — the state machine and workflow above are not repeated here.
- **Only `/features` files define state; chat doesn't.** A requirement that exists only in chat does not exist.
- **No implementation before status = APPROVED and the file sits in in-progress/.**
- **No skipping states; folder and status ALWAYS match** (bar the documented approve&implement / audit-remediation fast-paths).
- **DONE requires explicit user confirmation — never automatic.** READY_FOR_DONE requires recorded, passing validation.
- **The FINAL DELIVERABLE commit happens ONLY after the user moves the feature to DONE, and only if they opt in** via AskUserQuestion. Never at READY_FOR_DONE, never automatically. This governs the DELIVERABLE commit only — intermediate commits during implementation are fine (Step 5), including the integration commits a delegating workflow needs to hand work between workers. Those are still never made on the default branch: branch first.
- **Every user-waiting transition MUST use AskUserQuestion** — never a free-text prompt.
- **A follow-up change contradicting an already-DONE spec** → new feature, or a brief amendment note in the DONE file. The terminal spec never drifts from the code.
- **High-risk features require explicit approval before implementation.**

See `skills/_shared/blocks.md` for WHEN UNCERTAIN / AFTER THE TASK / LANGUAGE / APPROVAL GATES.
