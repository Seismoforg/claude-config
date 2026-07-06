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
**Identifiers in English** — always, every language/file type. User-facing UI text is the exception → i18n layer, never inline literals.

**Code comments & docstrings** — language + style are governed by `documentation` (English, terse caveman, edit only what you touch). Invoke it when writing/editing comments.

# FILE SIZE
- Target **300–500 lines**. Soft cap **700**.
- Guidelines, not hard failures — a cohesive file slightly over beats an arbitrary split.
- Too large → extract along seams (components, hooks, services, helpers). Never split mid-responsibility.

# FRONTEND ARCHITECTURE
> Web/frontend UI work also triggers `web-standards` (invoke it alongside this). This section = code STRUCTURE; web-standards = EXPERIENCE.

Greenfield default = Atomic Design:
```text
/components/atoms
/components/molecules
/components/organisms
/components/templates
/components/pages
```
Project already organizes UI differently (feature-folders, route groups) → follow THAT.

# TS/JS — FUNCTION STYLE
Functions are **arrow-const**, never `function` declaration/statement. Applies to EVERYTHING: components, hooks, handlers, helpers.
```ts
// yes
export const Name = (props: Props) => { … };
const helper = (x: number): string => { … };
export default someArrowConst;
// no
export function Name(props: Props) { … }
export default function Page() { … }
```
Default export → declare arrow-const then `export default Name`. Object/class methods (`method() {}`) are exempt. Project-wide; never reintroduce `function`.

# BACKEND ARCHITECTURE
Layer: Controllers → Services → Repositories → Domain Models. No business logic in controllers or UI — it belongs in services/domain models.

# CHANGE STRATEGY
Prefer: minimal diffs · localized edits · existing patterns · incremental improvements.
Avoid: full-file rewrites · broad restructuring · unnecessary renaming · large refactors without approval.

# REFACTOR RULES
Before: identify affected files, assess risk, minimize scope, preserve behavior. Significant structural changes need approval.
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

# COMPLETION CHECKLIST
- [ ] No obvious duplication introduced
- [ ] File sizes within guidelines
- [ ] Architecture consistent with surrounding code
- [ ] Existing patterns respected
- [ ] Diff minimal, matches task scope
- [ ] No unnecessary complexity / premature abstraction
- [ ] Verification (compile/tests/smoke) ran against the project's OWN env/toolchain (its virtualenv/lockfile/interpreter), not a global install — so a failure means a real defect

# HARD RULES
- Match existing patterns over imposing defaults.
- TS/JS functions always arrow-const, never `function`.
- No business logic in controllers or UI.
- Minimal diffs; no broad restructuring / large refactor without approval.
- Read scope follows task classification — don't over-scan small changes.
- Threading a new param through a call chain: confirm every function declares it and every caller passes it (grep the name) — a value used in a helper but only added to the outer function is a runtime error.
- Local context first; unclear → verify with `WebSearch`/`WebFetch`, don't assume.
- Web/frontend UI work also invokes `web-standards`.
- Identifiers English; user-facing text → i18n, never inline. Code comments/docstrings → governed by `documentation`.
- Project has tests → new behavior + bug fixes get tests (repro test first for bugs); match the existing setup, never weaken a test to pass.

# AFTER THE TASK
Concrete friction traceable to this skill? → `/self-improve`. Else silent.
