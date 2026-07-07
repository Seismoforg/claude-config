---
name: coding-standards
description: Use whenever code is created, modified, reviewed, or refactored. Enforces architecture, file-size limits, Atomic Design, minimal-diff change strategy, and code-quality rules.
---

# CODING STANDARDS

Governs HOW code is written. Composes with `feature` (what to build) and
`documentation` (what to document).

# ON ACTIVATION — CLASSIFY THE CHANGE
Sets read scope + approval needs:
- **SMALL_CHANGE** — bug fix / localized edit. Read only relevant files. Don't scan the repo.
- **FEATURE** — new behavior. Read only affected modules. Expand scope only when needed.
- **REFACTOR** — structural. Full impact analysis allowed; significant structural changes REQUIRE approval first.

Overriding rule: **match the surrounding code.** Repo patterns beat the defaults below. Don't impose a structure the project doesn't use.

# CORE PRINCIPLES
Prefer: separation of concerns · small focused modules · reusable components · explicit dependencies · consistent patterns.
Avoid: monolithic files · duplicated logic · hidden side effects · premature abstraction.

# LANGUAGE
Base English rule → `skills/_shared/blocks.md`. Identifiers English; user-facing UI text → i18n layer, never inline literals.
Code comments & docstrings: governed entirely by `documentation` — invoke it, don't restate its rules here.

# FILE SIZE
- Target **300–500 lines**. Soft cap **700**.
- Guidelines, not hard failures — a cohesive file slightly over beats an arbitrary split.
- Too large → extract along seams (components, hooks, services, helpers). Never split mid-responsibility.

## Frontend / TS-JS specifics
Building or editing frontend/TS-JS code → also read `skills/coding-standards/frontend.md` (Atomic Design layout, arrow-const function style). Not applicable to non-frontend work (Python, scripts, backend-only, ML) — skip it there.

## Python / ML specifics
Python / ML work (training scripts, notebooks, model configs) → also read `skills/coding-standards/python-ml.md`. Not applicable to frontend/TS-JS work.

# BACKEND ARCHITECTURE
Layer: Controllers → Services → Repositories → Domain Models. No business logic in controllers or UI — it belongs in services/domain models.
API conventions (if building anything consumed externally): consistent error response shape · pick one versioning strategy (URL vs. header) and one pagination pattern (cursor vs. offset), stay consistent · idempotent mutating endpoints.

# CHANGE STRATEGY
Prefer: minimal diffs · localized edits · existing patterns · incremental improvements.
Avoid: full-file rewrites · broad restructuring · unnecessary renaming · large refactors without approval.
Introducing a whole-repo formatter/linter alongside other edits → run the format pass FIRST, or commit functional changes before formatting, so mechanical churn lands in its own commit, never intermingled with functional diffs.

# REFACTOR RULES
Before: identify affected files, assess risk, minimize scope, preserve behavior. Significant structural changes need approval.
**"Significant" means ANY of:** > 3 files touched · a public API/exported-signature changes · a module boundary moves · a folder/module is renamed or split. Below this bar → proceed without an extra approval gate (still subject to normal task classification).
Significant (per the threshold above) → capture as a `/feature` draft before touching code, same as any new behavior. Non-significant → inline approval question is enough, no feature file needed.
Moving/renaming/splitting files: use the VCS move (`git mv`) to keep history, rewrite every affected import/reference in one pass, then run the project's typecheck/build to confirm no stale references before done. A missed reference fails silently until built.

# TESTS
Match the project's testing setup — don't invent one it lacks.
- Project has tests → new behavior and bug fixes get tests. Bug fix: write the reproduction test first, then make it pass.
- Match the existing framework, layout, naming. Don't add a new test stack unasked.
- Never delete/weaken a test to make it green — fix the cause.
- No test setup at all → don't force one; note the gap if the change is risky.

# RESEARCH ORDER
Local first: 1) relevant files 2) AGENTS.md (nearest up) 3) `/features` specs 4) `/docs`, ADRs 5) existing code.
External only for third-party APIs, framework/SDK updates, version-specific behavior. Unclear after local? Use `WebSearch` (+ `WebFetch` for official docs), never guess. Prefer official docs. For any framework/SDK, check the installed version's docs — APIs may differ from training data.
Adding/upgrading a dependency → also read `skills/coding-standards/dependencies.md`.

# COMPLETION CHECKLIST
- [ ] No obvious duplication introduced
- [ ] File sizes within guidelines
- [ ] Architecture consistent with surrounding code
- [ ] Existing patterns respected
- [ ] Diff minimal, matches task scope
- [ ] No unnecessary complexity / premature abstraction
- [ ] Verification (compile/tests/smoke) ran against the project's OWN env/toolchain (its virtualenv/lockfile/interpreter), not a global install — so a failure means a real defect
- [ ] Orphaned imports/vars/functions YOUR change made unused are removed (see CLAUDE.md Surgical Changes — don't touch pre-existing dead code)

# HARD RULES
- Match existing patterns over imposing defaults.
- Never hardcode secrets, API keys, tokens, or credentials in source — use env vars / secret manager per the project's existing pattern. Flag it immediately if you notice one already in the codebase, don't silently fix unrelated instances.
- No business logic in controllers or UI.
- Minimal diffs; no broad restructuring / large refactor without approval.
- Read scope follows task classification — don't over-scan small changes.
- Threading a new param through a call chain: confirm every function declares it and every caller passes it (grep the name) — a value used in a helper but only added to the outer function is a runtime error.
- Web/frontend UI work also invokes `web-standards`; frontend/TS-JS + Python/ML have addenda (`frontend.md`, `python-ml.md`).
- Identifiers English; user-facing text → i18n, never inline. Code comments/docstrings → governed by `documentation`.
- Project has tests → new behavior + bug fixes get tests (repro test first for bugs); match the existing setup, never weaken a test to pass.

See `skills/_shared/blocks.md` for WHEN UNCERTAIN / AFTER THE TASK / LANGUAGE.
