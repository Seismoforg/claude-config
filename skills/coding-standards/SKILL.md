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
inside that. Classify it first and "the hero looks generic, fix it" reads as SMALL_CHANGE, whose
"don't scan the repo" forbids the audit `reference/design.md` mandates as its own first action — so
the page gets patched in place and still looks generic. The classifier is upstream of brief
inference, which is exactly why it has to defer here.

Sets read scope + approval needs:
- **SMALL_CHANGE** — bug fix / localized edit. Read only relevant files. Don't scan the repo.
- **FEATURE** — new behavior. Read only affected modules. Expand scope only when needed.
- **REFACTOR** — structural. Full impact analysis allowed; significant structural changes REQUIRE approval first.

Overriding rule: **match the surrounding code** — REPO PATTERNS in `skills/_shared/blocks.md` governs the DEFAULTS below. It never overrides the HARD RULES at the end; those hold against any repo pattern.

**Carve-out — REPO PATTERNS does not govern `reference/design.md`.** It says *never impose a LOOK the project doesn't use*, which cancels the design addendum on the exact request it exists for: asked to make something less templated, the templated look IS the repo pattern, and the conservative reading wins. The design rules outranked REPO PATTERNS when they were a standalone skill; folding them into an addendum must not quietly demote them. Scope is LOOK only — code STRUCTURE still matches the repo, and `reference/web.md` stays governed as before.

# CORE PRINCIPLES
Prefer: separation of concerns · small focused modules · reusable components · explicit dependencies · consistent patterns.
Avoid: monolithic files · duplicated logic · hidden side effects · premature abstraction.
Prefer a primitive that makes rules unnecessary over rules patching a primitive's gaps — if one invariant needs three or more restatements to hold, the mechanic is wrong, not the wording.

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
this set too.
Nothing below is loaded automatically; a rule that never loads is indistinguishable from one that
does not exist.

## Frontend / TS-JS specifics
Building or editing frontend/TS-JS code → also read `reference/frontend.md` (Atomic Design layout, arrow-const function style). Not applicable to non-frontend work (Python, scripts, backend-only, ML) — skip it there.

## Python / ML specifics
Python / ML work (training scripts, notebooks, model configs) → also read `reference/python-ml.md`. Not applicable to frontend/TS-JS work.

## Web / UI surfaces
Building or changing user-facing web UI — pages, components, layouts, styling, responsive/mobile
work, animations → read `reference/web.md` **BEFORE writing**, not after. It owns mobile-first
layout, WCAG AA accessibility, Core Web Vitals, purposeful motion, and the
loading/empty/error/success states. Retrofitting those onto finished markup is the failure this
rule exists to prevent.
Non-web work → skip it.

## Design surfaces — landing, portfolio, redesign, marketing
Landing pages, portfolios, pricing/marketing/about pages, redesigns, hero UI, visual polish, design
direction → read `reference/design.md` **BEFORE writing**, on top of `reference/web.md`.

**Trigger on the COMPLAINT, not just the artifact.** "make it look good", "make it not look
templated", "make it less generic", "this looks AI-generated", "it looks like AI slop" are design
surfaces whatever the page is called. Users describe the problem, not the page type; a list of
artifact nouns routes "build me a pricing page that doesn't look AI-generated" to `reference/web.md`
on the word *page*, and it ships fast, accessible and entirely templated. This list is EXAMPLES —
a request about how something LOOKS belongs here even when it matches no phrase above. It owns brief inference, the three dials, design-system
choice, the AI-tell catalogue and the pre-flight check. Its MOTION_INTENSITY dial overrides
`reference/web.md` §4's timing figures on these surfaces. Dense product UI, dashboards, admin panels
→ `reference/design.md`'s OUT OF SCOPE header says which levers still apply.

**Pre-flight is mandatory before outputting code** (`reference/design.md` §14, pass 1). The command
line lives HERE, not in the addendum — the skill-dir placeholder substitutes at skill LOAD, and a
`reference/` file is only ever `Read`, so an invocation written there would ship a literal token:
```
node ${CLAUDE_SKILL_DIR}/scripts/preflight.mjs <changed files or dir>
```
Exit 1 = violations as `file:line:col  rule (§)  detail`. Fix every hit, re-run until exit 0.

**Who runs it: whoever wrote the code, if they hold a shell — the dispatcher otherwise.** The
placeholder above arrives substituted in a preloaded context, including a subagent's (OBSERVED once —
see the dispatch note below; it was observed on an agent with no shell, so whether the run then
SUCCEEDS from a worker is untested. Try it; report the failure rather than assuming either answer).
Holding no shell at all (`pm`, `tester`, `audit-scout`) or only a restricted one
(`standards-reviewer`'s HARD RULES allow read-only git) → say so in your report; do not claim the
check as done and do not treat it as someone else's silence. The dispatcher's own run covers the
integrated whole and does NOT replace the per-worker one.

**NAMING RULE — a design addendum is `reference/design-<name>.md`.** The `design-` prefix is the
only thing grouping the design files inside a flat `reference/` directory; a tenth one landing as
`reference/<name>.md` sits unmarked beside `frontend.md` and `python-ml.md`.
In THIS config's own repo a check enforces it (`unprefixed-design-ref`); its command is in that
repo's README, not here — this skill loads in every project, and a repo-root path spelled here is a
guaranteed ENOENT everywhere else. Elsewhere the rule is yours to keep.

**Dispatching a WORKER these govern → hand it the ABSOLUTE path.** Every pointer above, and
`reference/dependencies.md` below, is skill-relative. `crew` DISPATCH RULES owns the hand-off. Stated
here, where the addenda are introduced, so the reader who must act on it meets it at the pointer
itself.

**OBSERVED 20260803, because this line previously claimed the opposite:** a subagent that PRELOADS a
skill IS told its base directory — its context opens with `Base directory for this skill: <absolute
path>` — and the skill-dir placeholder in that body is already substituted to a real path when the
agent receives it. Probed on one live `pm` dispatch, reading its own context rather than the disk.
So the pre-flight command above is not a literal token for a subagent.
**Scoped honestly: ONE run, on a NON-DETERMINISTIC target, by an agent with no shell.** HARD RULES
below make that an observation, not a measurement, and it says nothing about whether the substituted
path then RESOLVES from a worker's process. Do not build a mandate on it; repeat it before anyone
does.
The hand-off rule stands anyway, for the case it was actually written for: a HANDED file is only
`Read`, announces no base directory, and its own `reference/...` pointers really are dead. Handing
the absolute path also costs nothing when the worker could have joined it itself. What changed is
the REASON, not the instruction — and an instruction resting on a false reason is one edit away from
being deleted as redundant.

# BACKEND ARCHITECTURE
Layer: Controllers → Services → Repositories → Domain Models. No business logic in controllers or UI — it belongs in services/domain models.
API conventions (if building anything consumed externally): consistent error response shape · pick one versioning strategy (URL vs. header) and one pagination pattern (cursor vs. offset), stay consistent · idempotent mutating endpoints.
Scheduled or polled work (cron, timer, queue poller) must not overlap itself. Interval shorter than worst-case runtime → every tick starts a run that still sees the same unprocessed input, and they all act on it. Guard it: concurrency limit, lock, or lease. Check WHEN the "handled" marker becomes visible to other runs — state persisted only at run end is invisible to runs already in flight, so it guards nothing.

# CHANGE STRATEGY
Prefer: minimal diffs · localized edits · existing patterns · incremental improvements.
Avoid: full-file rewrites · broad restructuring · unnecessary renaming · large refactors without approval.
Introducing a whole-repo formatter/linter alongside other edits → run the format pass FIRST, or commit functional changes before formatting, so mechanical churn lands in its own commit, never intermingled with functional diffs.

# REFACTOR RULES
Before: identify affected files, assess risk, minimize scope, preserve behavior. Significant structural changes need approval.
**"Significant" means ANY of:** > 3 files touched · a public API/exported-signature changes · a module boundary moves · a folder/module is renamed or split. Below this bar → proceed without an extra approval gate (still subject to normal task classification).
Significant (per the threshold above) → capture as a `feature` draft before touching code, same as any new behavior. Non-significant → inline approval question is enough, no feature file needed.
Moving/renaming/splitting files: TRACKED → VCS move (`git mv`) to keep history. UNTRACKED (never committed) → plain `mv`; `git mv` fails "not under version control" and there is no history to keep. Rewrite every affected import/reference in one pass, then run the project's typecheck/build to confirm no stale references before done. A missed reference fails silently until built.
Deleting/merging a SECTION (doc, config, prose) needs the same rigour with none of the safety net — prose has no compiler. Before deleting, grep for BOTH (a) pointers to it and (b) the content itself. A stale pointer or a rule that quietly vanished fails silently forever; nothing builds to catch it.

# TESTS
Match the project's testing setup — don't invent one it lacks.
- Project has tests → new behavior and bug fixes get tests. Bug fix: write the reproduction test first, then make it pass.
- Match the existing framework, layout, naming. Don't add a new test stack unasked.
- Never delete/weaken a test to make it green — fix the cause.
- No test setup at all → don't force one; note the gap if the change is risky.

# RESEARCH ORDER
Local first: 1) relevant files 2) AGENTS.md (nearest up) 3) `/features` specs 4) `/docs`, ADRs 5) existing code.
Before offering the user a keep-vs-change choice about existing behavior, read the code that implements it first — its current state may make the choice moot.
External only for: third-party APIs · framework/SDK updates · version-specific behavior (WHEN UNCERTAIN → blocks.md). Prefer official docs; for any framework/SDK check the INSTALLED version's docs — APIs may differ from training data. Consuming/pinning an external artifact at a ref → read its API AT that ref (fetch/checkout it), not a local copy that may be dirty or ahead of the pin; the shipped API can differ.
Adding/upgrading a dependency → also read `reference/dependencies.md`.

# INDEPENDENT REVIEW — main loop only
**You are a subagent → skip this section entirely; you cannot dispatch another agent.**
Main loop, diff worth a second pair of eyes (broad, structural, or pre-commit) → delegate the
`standards-reviewer` agent: read-only, fetches the diff itself, reviews against THESE rules
rather than generic best practice. Returns violations + FRICTION. Optional — skip for a
one-line fix.
Addendum applies (frontend/TS-JS · Python/ML · dependency change · web/UI · design surface) → join
the matching `reference/<file>.md` onto this skill's announced base directory and hand the agent that
ABSOLUTE path. A HANDED file announces no base directory, so its own pointers are dead — hand every
companion, or the reviewer reviews half a rule set and cannot tell.
- Web/UI → `reference/web.md`.
- Design surface → **all three**: `reference/design.md`, `reference/web.md` (design defers to it for
  contrast thresholds, reduced motion and the CWV targets, and forbids restating them locally — so
  without it those boxes are unfulfillable), and `reference/design-ai-tells.md` (the banned-pattern
  catalogue, half that rule set on its own).
`agents/standards-reviewer.md` must be told these are not "stack" addenda and that more than one can
apply at once; its own brief otherwise says read only the single matching stack file.

# COMPLETION CHECKLIST
- [ ] No obvious duplication introduced
- [ ] File sizes within guidelines
- [ ] Architecture consistent with surrounding code
- [ ] Existing patterns respected
- [ ] Diff minimal, matches task scope
- [ ] No unnecessary complexity / premature abstraction
- [ ] Verification (compile/tests/smoke) ran against the project's OWN env/toolchain (its virtualenv/lockfile/interpreter), not a global install — so a failure means a real defect
- [ ] Long-running verification launched in the background prints UNBUFFERED (`PYTHONUNBUFFERED`, `stdbuf`, equivalent) — a buffered pipe hides all progress until exit, so a stalled or mis-sized run looks identical to a working one
- [ ] A path that can run concurrently (scheduled, triggered, multi-user) was exercised with runs OVERLAPPING — green unit tests prove logic, never timing
- [ ] Orphaned imports/vars/functions YOUR change made unused are removed (see CLAUDE.md Surgical Changes — don't touch pre-existing dead code)

# HARD RULES
Non-obvious, high-severity only — the sections above are not repeated here.
- **Never hardcode secrets, API keys, tokens, or credentials** in source — env vars / secret manager per the project's existing pattern. Notice one already committed → flag it immediately, don't silently fix unrelated instances. Reading a config/state file that may hold secrets → read only the keys you need; never dump the whole file into output or logs.
- **No business logic in controllers or UI** — BACKEND ARCHITECTURE above owns it.
- **Threading a new param through a call chain:** confirm every function declares it AND every caller passes it (grep the name). A value used in a helper but only added to the outer function is a runtime error that typechecks.
- **A check guarded on a field's presence never fires when the field is ABSENT.** `if (cfg.x) validate(cfg.x)` passes everything when `x` is omitted. Default-permissive setting → absence IS the dangerous case; test for it explicitly.
- **Changing a DEFAULT another layer can also send** (client form, config file, CLI flag): grep every layer that supplies that value. The caller's own default silently overrides the new one and typechecks — the source of truth looks correct while every real request still carries the old value.
- **A field's value domain is set by its PRODUCER, not its type.** `string` hides how many values it emits — read the producing code before branching on it. A two-way test on an N-value field mislabels every other value (a sentinel read as success).
- **A return value that conflates FAILURE with EMPTY reports false success.** Returning `[]`/`null`/`""`/`0` for both "the operation failed" and "it legitimately produced nothing" leaves the caller unable to tell them apart — the failure path then gets persisted or announced as a successful empty result. Distinguish them: a discriminated result (`{ ok, value | error }`), a status flag, or a thrown error. Most critical right before persisting or reporting an outcome.
- **A claim about how a BACKEND behaves — its COST ("cheap"/"negligible") or its FAILURE MODE ("X evicts Y", "X is the bottleneck", "X contends") — is a claim, not a fact.** It holds for ONE implementation/environment; another lacks the fast path, or the contention never happens. Measure it on the TARGET before it enters a comment, doc, design rationale, or a FIX built on it. A cause reasoned from plausibility is not a measurement — and a costly fix (slower path, workaround) built on a wrong cause is pure loss. **Target is NON-DETERMINISTIC (generative model, sampler, timing, concurrency) → one run is not a measurement.** Repeat it before the number or the failure mode enters a doc, spec or rationale; a single sample that later fails to reproduce ships an overstated claim you then have to retract.

See `skills/_shared/blocks.md` for WHEN UNCERTAIN / AFTER THE TASK / LANGUAGE / TECHNICAL DEBT.
