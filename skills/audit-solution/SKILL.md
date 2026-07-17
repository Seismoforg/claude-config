---
name: audit-solution
description: Full-solution audit — sweep the entire codebase for weaknesses and inconsistencies (structure, coding-standards conformance, documentation coverage, consistency, obvious perf/correctness smells), report findings ranked by severity with evidence, then correct the approved ones and verify. Use when the user asks to audit / review the whole solution or codebase, check for weaknesses or inconsistencies, or do a health check. Composes with the coding-standards, web-standards, taste, and documentation skills for the checks, and ends by running self-improve.
---

# AUDIT SOLUTION

Whole-solution health check: find weaknesses, report with evidence, fix the approved
ones per the project's rules, verify. Investigation is READ-ONLY until the user
approves a remediation scope.

Composes with: `coding-standards` (how code must be), `web-standards` (how web/UI must be), `taste` (how frontend design must look — anti-slop, not templated), `documentation` (how docs must be), `feature` (REQUIRED — approved remediation is captured as a feature draft and carried out through the feature lifecycle before any code is touched), `self-improve` (at the end).

# STEP 1 — SCOPE & MAP (local context first)
Understand before judging, in order:
1. Root + nested AGENTS.md / CLAUDE.md, README, `/docs` + ADRs.
2. Build/manifest files → detect stack, modules, entry points (don't assume language/framework).
3. Top-level layout of each module.
State briefly what the solution is + its module map. Never hard-code stack assumptions — works for any language/framework.
User args narrow the scope (a focused question/area) → audit that scope only, with the dimensions that apply to it; name what was skipped as out of scope.

# STEP 2 — INVESTIGATE (read-only; fan out per dimension)
Dimension catalog → `reference/dimensions.md`. It owns what each dimension checks and which file holds its rules — read it, don't restate it here.
Its rule-source paths are relative to the skills root (= the parent of this skill's base directory, announced at load; they carry no leading `skills/`). Join them onto that root and hand scouts the ABSOLUTE result — a scout has neither your base directory nor your CWD, so a raw string strands it.

**2a. Mechanical + shell-bound checks — main loop, before any fan-out.** Deterministic and cheap; scouts are read-only by tool config and carry no shell, so these can only run here.
- Docs present → invoke `documentation`, run ITS mechanical check. Design surface → invoke `taste`, run ITS pre-flight. **Each skill owns its own script path — invoke that skill and take the path from its body, never hand-write one.** Their bodies carry the skill-dir placeholder, so the path arrives already absolute; a hand-written one resolves against the audited repo's CWD and fails. Audited repo defines its own subagents → its own agent check applies too.
- VCS hygiene (tracked artifacts, ignore gaps, committed secrets) → read-only `git` here: `ls-files`, `check-ignore`, `log`. Never a scout's job — it has no shell.
Script hits are findings already. Feed them into Step 3 directly; don't re-derive them by eyeball, and don't hand them to a scout.
A check cannot run (script missing, wrong stack, no shell) → say so in Step 3 as UNCHECKED. Never let a skipped check read as a clean dimension — that is the one failure this split can cause.

**2b. Judgment sweeps — fan out `audit-scout`.** ONE per applicable dimension, all in a single message so they run in parallel. It is read-only by tool config (Read/Grep/Glob — no Bash, no Edit/Write) and keeps N sweeps out of main context. Trivial scope (one file, one question) → inline is fine.
Brief each scout with: the dimension name, the module map from Step 1, the rule-source path from the catalog **resolved to absolute** (per Step 2's base — a scout inherits neither your base directory nor your CWD), and any 2a script output relevant to it. Scouts return findings + a FRICTION line; they never fix, never gate.
Main loop dedupes, ranks, and owns Steps 3-8: **subagents cannot call AskUserQuestion, so every gate stays in the main loop.**
Scout reports FRICTION (missing tool, rule it could not apply) → carry it to Step 8, it is self-improve evidence.

Investigation changes nothing. Dimension clean → say so.

# STEP 3 — REPORT
One findings list, **ranked by severity**. Each: `file:line`, what's wrong, why it matters, proposed fix. Separate:
- **Must-fix** — real bugs, broken docs/links, standards violations, inconsistencies.
- **Optional** — guideline-soft items, polish, nice-to-haves.
- **UNCHECKED** — REQUIRED whenever a 2a check did not run (script missing/failed, no shell, wrong stack) or a dimension was skipped. Name the dimension and what stayed unexamined. A dimension whose mechanical half never ran is NOT clean — listing it as clean is the worst outcome this skill can produce, because it buys false confidence. Empty only if every applicable check actually ran.
Be honest about what was NOT checked (e.g. runtime behavior needing the user's env). Don't pad — evidence-based only.

# STEP 4 — CONFIRM SCOPE via AskUserQuestion (REQUIRED)
Never edit before this gate. Present the remediation choice as multiple choice, e.g.:
- **Fix everything** (must-fix + optional)
- **Fix must-fix only**
- **Report only** (no changes)
- **Adjust scope**
Significant structural changes (moves/renames/splits, broad restructuring) are high-risk: they require explicit approval here regardless of the option chosen (see `coding-standards` REFACTOR RULES for the threshold).

# STEP 5 — CAPTURE AS A FEATURE DRAFT (via `feature`, before any edits)
Turn the approved remediation into a tracked feature — the audit report is the source, the feature file the spec.
- Skip ONLY when the user chose **Report only**.
- Trivial-fix carve-out: purely trivial must-fixes with no behavior change (a single broken doc link, one non-English comment/string to translate, a typo) may be fixed directly, no feature draft. Anything larger — structural, behavior-changing, or multi-file logic — still goes through the feature lifecycle. When in doubt, capture it as a feature.
- Invoke `feature`, create a DRAFT under `/features/draft/` whose Summary/Problem/Solution/Technical-Plan restate the approved findings, Tasks = one item per finding to fix (grouped by area), Impact Analysis lists affected/new/deleted files.
- The Step 4 selection (any option but "Report only") IS the approval to implement — create the feature file DIRECTLY in `/features/in-progress/` (status IN_PROGRESS), collapsing the empty draft/approved rests (feature fast-path); don't physically pass through each folder and don't re-ask a separate feature approval gate for the same scope. Remediation = that feature's implementation phase; its validation gate (READY_FOR_DONE → DONE) replaces this skill's ad-hoc "done" check.
- Remediation too big for one feature (independent phases/areas) → split into sequential features: first straight to in-progress (fast-path above), rest to `/features/approved/` as a queue; implement in order, each through its own validation gate.
- Keep the Tasks checklist current as findings are fixed.

# STEP 6 — REMEDIATE
Apply only approved findings, per the composed skills:
- `coding-standards`: minimal diffs, match existing patterns, no scope creep; moving/renaming/splitting → VCS move to preserve history, rewrite references in one pass.
- `documentation`: update AGENTS.md/links/ADRs/tech-debt affected; don't over-document.
- Fix reveals the scope was wrong → update the plan/spec first, then continue.

# STEP 7 — VERIFY & REPORT
- Run the project's typecheck/build (+ tests, if present) to confirm no stale references/regressions.
- Report faithfully: fixed / deferred / remaining, and any check that failed or couldn't run (say why). Don't claim a fix works if you couldn't verify it.

# STEP 8 — SELF-IMPROVE
Run `self-improve` (AFTER THE TASK in `skills/_shared/blocks.md` owns the rule). Audit-specific evidence to hand it: every scout FRICTION line from Step 2b, plus any weakness the audit surfaced in a skill itself (missing check, misfired rule).

# HARD RULES
Non-obvious, high-severity only. The dimension list (STEP 2) and the workflow (STEPS 3-8) are not repeated here.
- Investigation is read-only; no edits before the Step 4 approval gate.
- Stack-agnostic — detect language/framework/layout, never assume.
- Evidence-based findings only (`file:line`); rank by severity; don't pad.
- Before proposing to change a value/structure, confirm the current state isn't an intentional convention (typed sentinel, documented default, deliberate tier) — check the local type/model/definition. Contradicts it → drop or downgrade the finding, don't "fix" it.
- Consistency is paramount: any pattern applied unevenly (imports, config, error handling, i18n, styling, naming, layout) is a finding — fix = align to the dominant pattern, never add another variant.
- Unless "Report only" (or a trivial no-behavior-change fix per the Step 5 carve-out), capture approved remediation as a `feature` draft and remediate through the feature lifecycle — never edit non-trivial code straight from the audit report.
- Significant structural changes need explicit approval (`coding-standards` REFACTOR RULES owns the threshold).
- Verify with the project's build/tests before declaring done; report honestly.

See `skills/_shared/blocks.md` for WHEN UNCERTAIN / AFTER THE TASK / LANGUAGE / APPROVAL GATES.
