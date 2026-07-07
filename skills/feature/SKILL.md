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
1. Identify which feature the request refers to (name or timestamp).
2. Exists → open it, read `status`, confirm folder matches status. Folder ≠ status → STOP and report the mismatch, don't guess.
3. Doesn't exist → new feature, start at Workflow step 1.
4. State the current status + the single allowed next action, then proceed.

Never plan/approve/implement/validate/change status without this check.

# STRUCTURE
Path: `/features/<state-folder>/<timestamp>-<slug>.md`
Time: `YYYYMMDD-HHMM` — date part is ALWAYS today's date from context. Clock time unavailable → derive only the time part: newest file dated today → a minute just after it; else start today early (e.g. 0001). Never move the date off today; never fabricate a wall-clock time.
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
- No skipped states. Linear, forward-only, EXCEPT rework: user reports a bug / requests a change before DONE → move back to IN_PROGRESS, fix + re-validate, then advance again. Never change a feature's code while its file sits in ready-for-done/ or done/ without first moving it back — the folder must reflect that work resumed.
- Exception — "Approve & implement" fast-path: user picks that combined option at the approval gate → file may advance NEEDS_APPROVAL → APPROVED → IN_PROGRESS in one move (record approval, land in in-progress/) with no rest in approved/. A collapse of adjacent transitions, not a skipped state.
- Exception — audit remediation fast-path: an approved `audit-solution` scope may create the feature file DIRECTLY in in-progress/ (its Step-4 approval replaces this gate); the empty draft/pending/approved rests collapse. Same one-move collapse, not a skipped state.
- A transition = update the `status` field first (edit in place), THEN move the file. After moving, re-read before the next in-place edit — the move invalidates the prior read, so an edit at the new path fails otherwise.
- Move via a path anchored to the features dir (absolute or repo-root-relative), never relative to the shell CWD (it may have drifted after build/test commands).

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
**Language + style: feature files follow ENGLISH + TERSE ARTIFACTS** (`skills/_shared/blocks.md`) — English + caveman-terse across title, all sections, Tasks; every requirement/number/file/constraint kept.

# WORKFLOW

## 0. Brainstorm (optional) → ideas
When the feature is vague, exploratory, or the user asks for ideas/options/"what could we do" — before writing any spec, invoke `/drunken-genius` via the Skill tool to generate and filter ideas. Let it run its wild-round → sober-look → nightcap process.
- Skip when the request is already a concrete, well-specified feature — go straight to step 1.
- Brainstorming stays in chat; it is NOT feature state. Nothing exists until step 1 writes it into `/features/draft/`.
- Once the user picks an idea (or a merge of several), carry it into step 1 as the DRAFT's Summary/Problem/Solution seed.

## 1. Create → DRAFT
Write the spec into `/features/draft/`. Fill all sections as far as known.

## 2. Request approval → NEEDS_APPROVAL
Move to `/features/pending/`. Summarize for the user. **STOP. Ask via AskUserQuestion** (not free text). Offer at least:
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
- Apply `/coding-standards` to every code change.
- Apply `/security-review` when the feature touches auth, sessions, input handling, or external payloads.
- Apply `/web-standards` to any web/UI change (responsive, a11y, perf, motion).
- Apply `/taste` when the feature is frontend design work — landing/marketing/hero/portfolio surfaces, redesigns, visual polish, "make it look good / not templated" (composes with `/web-standards`).
- Apply `/documentation` whenever the change touches architecture, modules, responsibilities, public APIs, AGENTS.md, ADRs, or technical debt.
Invoke each skill via the Skill tool; don't just paraphrase.
- Fanning an enumerated task/checklist out to parallel workers → explicitly assign every item, and re-verify full coverage against the list before dispatch AND after merge; unassigned items drop silently.
Intermediate commits during implementation are fine; the FINAL commit waits until AFTER the user moves the feature to DONE (Step 7), and only if the user opts in there.

## 6. Validation gate → READY_FOR_DONE
Do NOT move to DONE. Verify and record under `# Validation`:
- all tasks complete, no unfinished work
- docs updated if required (via `/documentation` when architecture/APIs/AGENTS.md/ADRs/debt touched)
- code conforms to `/coding-standards`
- build succeeds (if applicable)
- tests pass (if available)
- every changed code path actually exercised. A path needing an unavailable dep (model, GPU, paid API) is NOT "outside your control" — drive it with a stub/mock before declaring done; an unrun changed branch is unverified, not "structurally verified"
- full validation needs a genuinely external action (deploy, service restart, third-party run) → record what you DID verify vs what remains under `# Validation`, surface the pending step to the user — never report it as fully validated
- do NOT commit here. The commit waits until after DONE (Step 7), and is user-opt-in.
Verification fails (build/tests red) → fix the root cause, re-run. Same check fails again after a fix attempt → stop, report the failure and your diagnosis to the user, do NOT weaken the check, skip it, or keep guessing at patches. Ask before a third attempt at the same failing check.
Then move to `/features/ready-for-done/`. **STOP. Ask via AskUserQuestion** (not free text): "Implementation complete and validation passed. Move to DONE?" Offer at least **Move to DONE** / **Leave open for now**. Only DONE counts as the explicit confirmation for step 7.

## 7. Finalize → DONE
Only on explicit user confirmation: move to `/features/done/`.
Then — and only after that move — OPTIONALLY commit. **STOP. Ask via AskUserQuestion** whether to commit the landed work now. Only on an explicit yes, commit via `/git-commit` (owns its own confirmation + default-branch/branch gate; don't hand-roll). User declines → skip; leave it uncommitted. Never commit before this point.

## 8. Retrospective — `/self-improve`
After a resting point (DONE, or user leaves it in READY_FOR_DONE / discards), invoke `/self-improve` via the Skill tool to detect friction in this + the applied skills (feature, coding-standards, documentation) and offer to codify improvements. It stays silent unless real friction — so run it, don't pre-judge.

# WHEN UNCERTAIN
See `skills/_shared/blocks.md`.

# HARD RULES
- Only `/features` files define state; chat doesn't.
- Unclear → verify with `WebSearch`/`WebFetch`, don't assume.
- Feature files always English, regardless of chat language.
- No implementation before status = APPROVED and file in in-progress/.
- No skipping states; folder and status always match (bar the documented approve&implement / audit-remediation fast-paths).
- READY_FOR_DONE requires recorded, passing validation.
- DONE requires explicit user confirmation — never automatic.
- Commit ONLY after the user moves the feature to DONE, and only if the user opts in via AskUserQuestion — never at READY_FOR_DONE, never automatically.
- A follow-up change contradicting an already-DONE feature's spec → open a new feature or record a brief amendment note in the DONE file; the terminal spec never drifts from the code.
- High-risk features require explicit approval before implementation.
- Every user-waiting transition (approval gate, DONE gate, any "STOP. Ask") MUST use AskUserQuestion — never a free-text prompt.
