---
name: coding-standards
description: "Use whenever code is created, modified, reviewed, or refactored — and the single entry point for DESIGN work (landing pages, portfolios, pricing/marketing/about pages, redesigns, hero UI, visual polish, design direction, make it look good, make it not look templated, make it less generic, this looks AI-generated, AI slop) and for any WEB/UI work (pages, components, layouts, styling, responsive/mobile, animations, anything user-facing on the web). Enforces architecture, file-size limits, Atomic Design, minimal-diff change strategy, code-quality rules. Design surfaces load an anti-slop addendum — brief inference, real design systems, audit-first redesigns, strict pre-flight check. Web surfaces load mobile-first responsive layout, WCAG accessibility, Core Web Vitals, purposeful motion, minimalist/bento layouts."
---

# CODING STANDARDS

Governs HOW code is written. Composes with `feature` (what to build) and
`documentation` (what to document).

# ON ACTIVATION — CLASSIFY THE CHANGE
**A design surface ROUTES before it is classified.** A request about how something LOOKS (see DESIGN
SURFACES below) goes to `reference/design.md` first; the buckets here then describe the code work
inside that.

Sets read scope + approval needs:
- **SMALL_CHANGE** — bug fix / localized edit. Read only relevant files. Don't scan the repo.
  **Exception: a design surface.** Its addendum sets the read scope, and on a redesign that scope is
  an audit. This bullet does not override it.
- **FEATURE** — new behavior. Read only affected modules. Expand scope only when needed.
- **REFACTOR** — structural. Full impact analysis allowed; significant structural changes REQUIRE approval first.

Overriding rule: **match the surrounding code** — REPO PATTERNS in `skills/_shared/blocks.md` governs the DEFAULTS below. It never overrides the HARD RULES at the end; those hold against any repo pattern.

**Carve-out — REPO PATTERNS does not govern `reference/design.md`.** Asked to make something less
templated, the templated look IS the repo pattern. Scope is LOOK only — code STRUCTURE still matches
the repo.

# CORE PRINCIPLES
Prefer: separation of concerns · small focused modules · reusable components · explicit dependencies · consistent patterns.
Avoid: monolithic files · duplicated logic · hidden side effects · premature abstraction.
Prefer a primitive that makes rules unnecessary over rules patching a primitive's gaps — one invariant needing three or more restatements means the mechanic is wrong, not the wording.

# LANGUAGE
LANGUAGE in `skills/_shared/blocks.md` owns it — including identifiers and the i18n rule.
Code comments & docstrings: governed entirely by `documentation` — invoke it, don't restate its rules here.

# FILE SIZE
- Target **300–500 lines**. Soft cap **700**.
- Guidelines, not hard failures — a cohesive file slightly over beats an arbitrary split.
- Too large → extract along seams (components, hooks, services, helpers). Never split mid-responsibility.

# ADDENDA — STACK AND SURFACE
On-demand files, each with its own trigger. Read every matching one BEFORE writing, never after.
More than one can apply to a single change, and `reference/dependencies.md` further down belongs to
this set too. Nothing below loads automatically.

## Frontend / TS-JS specifics
Building or editing frontend/TS-JS code → also read `reference/frontend.md`. **Its two halves have different scope**: Atomic Design layout is FRONTEND-only; the arrow-const function style binds ANY TS/JS, backend included. TS/JS backend → read it and apply the style half. No TS/JS at all (Python, scripts, ML) → skip it.

## Python / ML specifics
Python / ML work (training scripts, notebooks, model configs) → also read `reference/python-ml.md`. Not applicable to frontend/TS-JS work.

## Web / UI surfaces
Building or changing user-facing web UI — pages, components, layouts, styling, responsive/mobile
work, animations → read `reference/web.md` **BEFORE writing**, not after. It owns mobile-first
layout, WCAG AA accessibility, Core Web Vitals, purposeful motion, and the
loading/empty/error/success states. Non-web work → skip it.

## Design surfaces — landing, portfolio, redesign, marketing
Landing pages, portfolios, pricing/marketing/about pages, redesigns, hero UI, visual polish, design
direction → read `reference/design.md` **BEFORE writing**, on top of `reference/web.md`.

**Trigger on the COMPLAINT, not just the artifact.** "make it look good", "make it not look
templated", "make it less generic", "this looks AI-generated", "it looks like AI slop" are design
surfaces whatever the page is called. This list is EXAMPLES — a request about how something LOOKS
belongs here even when it matches no phrase above. It owns brief inference, the three dials,
design-system choice, the AI-tell catalogue and the pre-flight check. Its MOTION_INTENSITY dial
overrides `reference/web.md` §4's timing figures on these surfaces. Dense product UI, dashboards,
admin panels → `reference/design.md`'s OUT OF SCOPE header says which levers still apply.

**Pre-flight is mandatory before outputting code** (`reference/design.md` §14, pass 1). The command
line lives HERE, never in the addendum:
```
node ${CLAUDE_SKILL_DIR}/scripts/preflight.mjs <changed files or dir>
```
Exit 1 = violations as `file:line:col  rule (§)  detail`. Fix every hit, re-run until exit 0.
**Exit 2 = the run was INVALID and checked nothing** (no target, unreadable path, zero matching
files). Fix the invocation and re-run; a 2 is never a pass.

**Who runs it: whoever wrote the code, if they hold a shell — the dispatcher otherwise.** Holding no
shell at all (`pm`, `tester`, `audit-scout`) or only a restricted one (`standards-reviewer`'s HARD
RULES allow read-only git) → say so in your report; do not claim the check as done and do not treat
it as someone else's silence. The dispatcher's own run covers the integrated whole and does NOT
replace the per-worker one.

**NAMING RULE — a design addendum is `reference/design-<name>.md`.** In THIS config's own repo a
check enforces it (`unprefixed-design-ref`); its command is in that repo's README, not here.
Elsewhere the rule is yours to keep.

**Dispatching a WORKER these govern → hand it the ABSOLUTE path.** Every pointer above, and
`reference/dependencies.md` below, is skill-relative. `crew` DISPATCH RULES owns the hand-off.

# BACKEND ARCHITECTURE
Layer: Controllers → Services → Repositories → Domain Models. No business logic in controllers or UI — it belongs in services/domain models.
API conventions (if building anything consumed externally): consistent error response shape · pick one versioning strategy (URL vs. header) and one pagination pattern (cursor vs. offset), stay consistent · idempotent mutating endpoints.
Scheduled or polled work (cron, timer, queue poller) must not overlap itself. Guard it: concurrency limit, lock, or lease. Check WHEN the "handled" marker becomes visible to other runs — state persisted only at run end is invisible to runs already in flight, so it guards nothing.

# CHANGE STRATEGY
Prefer: minimal diffs · localized edits · existing patterns · incremental improvements.
Avoid: full-file rewrites · broad restructuring · unnecessary renaming · large refactors without approval.
Exception — a design surface whose brief is a redesign. Replacing the look IS the task, so a full rewrite of that surface's markup is in scope; `reference/design.md` owns how far it goes.
Introducing a whole-repo formatter/linter alongside other edits → run the format pass FIRST, or commit functional changes before formatting, so mechanical churn lands in its own commit.
**Never write content containing BACKSLASH ESCAPES through a heredoc-fed interpreter** (`python - <<EOF`, inline `node -e`, `perl -e`). The interpreter consumes the escape before the file exists, so `\n` lands as a real newline inside a string literal and `\d` as a bare `d`. The script reports success; only the compiler shows it, and prose has no compiler. Use the file-editing tool for anything holding escapes — a multi-file sweep is not a reason, it is where this bites hardest.

# REFACTOR RULES
Before: identify affected files, assess risk, minimize scope, preserve behavior. Significant structural changes need approval.
**"Significant" means ANY of:** > 3 files touched · a public API/exported-signature changes · a module boundary moves · a folder/module is renamed or split. Below this bar → proceed without an extra approval gate.
Significant → capture as a `feature` draft before touching code. Non-significant → inline approval question is enough, no feature file needed.
Moving/renaming/splitting files: TRACKED → VCS move (`git mv`) to keep history. UNTRACKED (never committed) → plain `mv`; `git mv` fails "not under version control". Rewrite every affected import/reference in one pass, then run the project's typecheck/build to confirm no stale references. A missed reference fails silently until built.
Deleting/merging a SECTION (doc, config, prose) needs the same rigour with none of the safety net — prose has no compiler. Before deleting, grep for BOTH (a) pointers to it and (b) the content itself.

# TESTS
Match the project's testing setup — don't invent one it lacks.
- Project has tests → new behavior and bug fixes get tests. Bug fix: write the reproduction test first, then make it pass.
- Match the existing framework, layout, naming. Don't add a new test stack unasked.
- Never delete/weaken a test to make it green — fix the cause.
- No test setup at all → don't force one; note the gap if the change is risky.

# RESEARCH ORDER
Local first: 1) relevant files 2) AGENTS.md (nearest up) 3) `/features` specs 4) `/docs`, ADRs 5) existing code.
Before offering the user a keep-vs-change choice about existing behavior, read the code that implements it first.
External only for: third-party APIs · framework/SDK updates · version-specific behavior (WHEN UNCERTAIN → blocks.md). Prefer official docs; for any framework/SDK check the INSTALLED version's docs. Consuming/pinning an external artifact at a ref → read its API AT that ref (fetch/checkout it), not a local copy that may be dirty or ahead of the pin.
Adding/upgrading a dependency → also read `reference/dependencies.md`.

# INDEPENDENT REVIEW — main loop only
**You are a subagent → skip this section entirely; you hold no `Agent` tool.**
**A DESIGN SURFACE ALWAYS QUALIFIES**, however small the diff — `reference/design.md` §14 pass 2
requires this dispatch. The size test below does not apply to it.
Main loop, diff worth a second pair of eyes (broad, structural, or pre-commit) → delegate the
`standards-reviewer` agent: read-only, fetches the diff itself, reviews against THESE rules
rather than generic best practice. Returns violations + FRICTION. Optional — skip for a
one-line fix.
Addendum applies (frontend/TS-JS · Python/ML · dependency change · web/UI · design surface) → join
the matching `reference/<file>.md` onto this skill's announced base directory and hand the agent that
ABSOLUTE path. A HANDED file announces no base directory, so its own pointers are dead — hand every
companion.
- Web/UI → `reference/web.md`.
- Design surface → **all three**: `reference/design.md`, `reference/web.md` (design defers to it for
  contrast thresholds, reduced motion and the CWV targets), and `reference/design-ai-tells.md`.

# COMPLETION CHECKLIST
- [ ] No obvious duplication introduced
- [ ] File sizes within guidelines
- [ ] Architecture consistent with surrounding code
- [ ] Existing patterns respected — on a design surface asked to CHANGE the look, this box covers code patterns only; the look is judged against `reference/design.md`
- [ ] Diff minimal, matches task scope
- [ ] No unnecessary complexity / premature abstraction
- [ ] Verification (compile/tests/smoke) ran against the project's OWN env/toolchain (its virtualenv/lockfile/interpreter), not a global install
- [ ] Long-running verification launched in the background prints UNBUFFERED (`PYTHONUNBUFFERED`, `stdbuf`, equivalent) — a buffered pipe hides all progress until exit
- [ ] A path that can run concurrently (scheduled, triggered, multi-user) was exercised with runs OVERLAPPING — green unit tests prove logic, never timing
- [ ] Orphaned imports/vars/functions YOUR change made unused are removed (see CLAUDE.md Surgical Changes — don't touch pre-existing dead code)

# HARD RULES
Non-obvious, high-severity only — the sections above are not repeated here.
- **Never hardcode secrets, API keys, tokens, or credentials** in source — env vars / secret manager per the project's existing pattern. Notice one already committed → flag it immediately, don't silently fix unrelated instances. Reading a config/state file that may hold secrets → read only the keys you need; never dump the whole file into output or logs.
- **No business logic in controllers or UI** — BACKEND ARCHITECTURE above owns it.
- **Threading a new param through a call chain:** confirm every function declares it AND every caller passes it (grep the name). A value used in a helper but only added to the outer function is a runtime error that typechecks.
- **A check guarded on a field's presence never fires when the field is ABSENT.** `if (cfg.x) validate(cfg.x)` passes everything when `x` is omitted. Default-permissive setting → absence IS the dangerous case; test for it explicitly.
- **Changing a DEFAULT another layer can also send** (client form, config file, CLI flag): grep every layer that supplies that value. The caller's own default silently overrides the new one and typechecks.
- **A field's value domain is set by its PRODUCER, not its type.** `string` hides how many values it emits — read the producing code before branching on it. A two-way test on an N-value field mislabels every other value.
- **A return value that conflates FAILURE with EMPTY reports false success.** Returning `[]`/`null`/`""`/`0` for both "failed" and "legitimately produced nothing" leaves the caller unable to tell them apart. Distinguish them: a discriminated result (`{ ok, value | error }`), a status flag, or a thrown error. Most critical right before persisting or reporting an outcome.
- **A claim about how a BACKEND behaves — its COST ("cheap"/"negligible") or its FAILURE MODE ("X evicts Y", "X is the bottleneck", "X contends") — is a claim, not a fact.** Measure it on the TARGET before it enters a comment, doc, design rationale, or a FIX built on it. A cause reasoned from plausibility is not a measurement. **Target is NON-DETERMINISTIC (generative model, sampler, timing, concurrency) → one run is not a measurement.** Repeat it before the number or the failure mode enters a doc, spec or rationale. **Repeating means the whole RUN, not more samples inside one.** Measured: samples agreeing to ~20ms within a run moved by 2.7s between runs of the IDENTICAL input — tight agreement inside one run is the harness being warm, not the target being stable. So before crediting a difference to your change, establish that it exceeds the spread between runs of the unchanged one; below that you are ranking noise, and a confident verdict built on it gets retracted. **Probe a CAPABILITY on an actor that HOLDS it** — reading a command is not running it, and "the path is present" is not "the path works".

See `skills/_shared/blocks.md` for WHEN UNCERTAIN / AFTER THE TASK / LANGUAGE / TECHNICAL DEBT /
LIVE VERIFICATION (the last reached from `reference/web.md` and `reference/design.md`, not from here).
