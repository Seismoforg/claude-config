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

# STEP 2 — INVESTIGATE (read-only; fan out for breadth)
Check these dimensions. Large codebase → parallel read-only subagents; small → inline. Every finding needs concrete evidence (`file:line`), not a hunch.
- **Structure & organization** — layout, separation of concerns, misplaced files, naming, dead code.
- **Coding-standards conformance** — apply `coding-standards`: file-size, function/declaration style, layering (no business logic in controllers/UI), duplication, premature abstraction, pattern consistency.
- **Web-standards conformance (UI)** — for web/frontend code, apply `web-standards`: mobile-first responsive layout, accessibility (WCAG — semantics/labels/focus/contrast), Core Web Vitals perf, purposeful motion, minimalist/bento layout. Flag violations with `file:line`. (Skip if the solution has no web UI.)
- **Design quality (taste)** — for user-facing frontend, esp. landing/marketing/hero/portfolio surfaces, apply `taste`: does it look templated/generic ("slop") — cookie-cutter hero, default component look, no coherent design direction, weak type/spacing/color system? Flag `file:line` (or component/page). This is design-direction quality, distinct from `web-standards` mechanics. (Skip if no such surfaces, or the UI is purely functional/internal-tooling with no design ambition.)
- **Documentation conformance** — apply `documentation`: AGENTS.md coverage for real modules, every AGENTS.md has a CLAUDE.md sibling, bidirectional links intact, ADRs for major decisions, stale/contradictory docs, tech-debt recorded.
- **Consistency** — is a chosen pattern applied uniformly (imports, config, error handling, i18n, styling)? Flag one-off deviations.
- **Language (English-only)** — code comments/docstrings, feature files under `/features`, and docs (AGENTS.md, ADRs, tech-debt, READMEs) must be English. Flag non-English with `file:line`; fix = translate to English (user-facing UI text → i18n, not inline). Independent of whether the logic is fine.
- **Caveman-style conformance** — ALL documentation must be terse (caveman style) per the `documentation`/`coding-standards` mandate: AGENTS.md, CLAUDE.md, ADRs, tech-debt, READMEs, `/features` specs, line comments, docstrings — everything. Flag verbose/prose-heavy ones (filler, hedging, flowing paragraphs) with `file:line`; fix = invoke the `caveman` skill to condense, keeping every fact/number/path/constraint (skip only what is already caveman). (READMEs may stay a touch more prose-y for human onboarding.)
- **Performance / correctness smells** — only clear, evidence-backed ones (redundant work on a hot path, dev-only config shipped as default, obvious footguns). Don't speculate.
- **VCS hygiene** — build artifacts / generated files tracked, ignore-file gaps, committed secrets or large binaries that don't belong. Auth / input-validation review beyond this basic scan → `security-review`.

Investigation changes nothing. Dimension clean → say so.

# STEP 3 — REPORT
One findings list, **ranked by severity**. Each: `file:line`, what's wrong, why it matters, proposed fix. Separate:
- **Must-fix** — real bugs, broken docs/links, standards violations, inconsistencies.
- **Optional** — guideline-soft items, polish, nice-to-haves.
Be honest about what was NOT checked (e.g. runtime behavior needing the user's env). Don't pad — evidence-based only.

# STEP 4 — CONFIRM SCOPE via AskUserQuestion (REQUIRED)
Never edit before this gate. Present the remediation choice as multiple choice, e.g.:
- **Fix everything** (must-fix + optional)
- **Fix must-fix only**
- **Report only** (no changes)
- **Adjust scope**
Significant structural changes (moves/renames/splits, broad restructuring) are high-risk: they require explicit approval here regardless of the option chosen (see `coding-standards` REFACTOR RULES for the threshold).

# STEP 5 — CAPTURE AS A FEATURE DRAFT (via `/feature`, before any edits)
Turn the approved remediation into a tracked feature — the audit report is the source, the feature file the spec.
- Skip ONLY when the user chose **Report only**.
- Trivial-fix carve-out: purely trivial must-fixes with no behavior change (a single broken doc link, one non-English comment/string to translate, a typo) may be fixed directly, no feature draft. Anything larger — structural, behavior-changing, or multi-file logic — still goes through the feature lifecycle. When in doubt, capture it as a feature.
- Invoke `/feature`, create a DRAFT under `/features/draft/` whose Summary/Problem/Solution/Technical-Plan restate the approved findings, Tasks = one item per finding to fix (grouped by area), Impact Analysis lists affected/new/deleted files.
- The Step 4 selection (any option but "Report only") IS the approval to implement — create the feature file DIRECTLY in `/features/in-progress/` (status IN_PROGRESS), collapsing the empty draft/approved rests (feature fast-path); don't physically pass through each folder and don't re-ask a separate feature approval gate for the same scope. Remediation = that feature's implementation phase; its validation gate (READY_FOR_DONE → DONE) replaces this skill's ad-hoc "done" check.
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
Run `/self-improve`: audit surfaced a weakness in a skill itself (missing check, misfired rule) → propose a general improvement via multiple choice. No friction → skip silently.

# WHEN UNCERTAIN
See `skills/_shared/blocks.md`.

# HARD RULES
- Investigation is read-only; no edits before the Step 4 approval gate.
- Stack-agnostic — detect language/framework/layout, never assume.
- Unclear → verify with `WebSearch`/`WebFetch`, don't assume.
- Evidence-based findings only (`file:line`); rank by severity; don't pad.
- Check all code against `coding-standards` and all web/UI against `web-standards` — every violation is a finding.
- Check user-facing frontend (esp. landing/marketing/hero/portfolio surfaces) against `taste` — templated/generic "slop" design is a finding. Skip purely functional/internal UI with no design ambition.
- Check `documentation` present everywhere: every real module has an AGENTS.md (+ CLAUDE.md sibling containing `@AGENTS.md`), links bidirectional and unbroken, ADRs for major decisions — a missing/orphaned one is a finding.
- Check English-only: non-English comments, feature files, or docs are findings; fix = translate to English.
- Review ALL documentation for caveman-style — line comments, docstrings, AGENTS.md, CLAUDE.md, ADRs, tech-debt, READMEs, `/features` specs, everything. Any verbose/prose one (filler, hedging, flowing paragraphs) is a finding; fix = MANDATORY invoke the `caveman` skill to condense, keeping every fact/number/path/constraint — unless it is already caveman.
- Consistency is paramount: any pattern/convention applied unevenly (imports, config, error handling, i18n, styling, naming, file layout) is a finding — flag every one-off deviation; fix = align to the dominant pattern, never add another variant.
- Significant structural changes need explicit approval (see `coding-standards` REFACTOR RULES for the threshold).
- Unless "Report only" (or a trivial no-behavior-change fix per the Step 5 carve-out), capture approved remediation as a `feature` draft and remediate through the feature lifecycle — never edit non-trivial code straight from the audit report.
- Minimal diffs matching existing patterns; keep docs in sync.
- Verify with the project's build/tests before declaring done; report honestly.
- Always finish with self-improve.
