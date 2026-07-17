# AUDIT DIMENSIONS

Catalog for `audit-solution` STEP 2. One source for the dispatcher AND the `audit-scout`
agents it fans out — a scout briefed on a dimension reads its entry here.

Every finding: `file:line` · severity · what's wrong · why it matters · proposed fix.
**No evidence, no finding.** Dimension clean → say so; an empty result is valid.
Rule source not preloaded → read the named file before judging. Never invent a rule.
Before proposing a fix, confirm the current state isn't an intentional convention (typed sentinel,
documented default, deliberate tier, a term or rule placed where it is on purpose) — check the
local type/model/definition, or the rule that governs it. Contradicts your fix → drop or downgrade
the finding, don't "fix" it. (Stated here AND in `audit-solution` HARD RULES on purpose: a scout
never loads that file. Keep both copies identical.)

Rule-source paths below are relative to the SKILLS ROOT (the dir holding `audit-solution/`,
`taste/`, `_shared/`, …) — no leading `skills/`. The dispatcher resolves them to absolute before
briefing a scout; a scout's cwd is the audited repo and will not resolve them.

---

## Structure & organization
Layout, separation of concerns, misplaced files, naming, dead code.
Rule source: repo's own pattern (dominant layout wins).

## Coding-standards conformance
File-size, function/declaration style, layering (no business logic in controllers/UI),
duplication, premature abstraction, pattern consistency.
Rule source: `coding-standards/SKILL.md` + the stack addendum under
`coding-standards/reference/` (frontend / python-ml / dependencies) — load only the one
that matches.

## Web-standards conformance (UI)
Mobile-first responsive layout, accessibility (WCAG — semantics/labels/focus/contrast),
Core Web Vitals perf, purposeful motion, minimalist/bento layout.
Rule source: `web-standards/SKILL.md`. Skip if the solution has no web UI.

## Design quality (taste)
Does it look templated/generic ("slop")? Cookie-cutter hero, default component look, no coherent
design direction, weak type/spacing/color system. Design-direction quality — distinct from
web-standards mechanics. Mechanical tells are the dispatcher's script (`preflight.mjs`), not
yours; judge the rest.
Rule source: `taste/SKILL.md` + `taste/reference/ai-tells.md`.
Skip if no user-facing design surface, or the UI is internal tooling with no design ambition.

## Documentation conformance
AGENTS.md coverage for real modules, ADRs for major decisions, stale/contradictory docs,
tech-debt recorded. Sibling + link mechanics are the dispatcher's script (`check-docs.mjs`),
not yours; judge coverage and correctness.
Rule source: `documentation/SKILL.md`.

## Consistency
Is a chosen pattern applied uniformly (imports, config, error handling, i18n, styling, naming,
layout)? Flag one-off deviations. Fix = align to the dominant pattern, never add a variant.
Rule source: the repo's dominant pattern. A deviation the WHOLE repo shares is not a finding.

## Language (English-only)
Code comments/docstrings, `/features` files, docs (AGENTS.md, ADRs, tech-debt, READMEs) must be
English. Fix = translate (user-facing UI text → i18n, not inline). Independent of logic quality.
Rule source: LANGUAGE in `_shared/blocks.md`.

## Simple-language conformance
ALL docs terse AND plain: AGENTS.md, CLAUDE.md, ADRs, tech-debt, READMEs, `/features` specs,
comments, docstrings. Flag filler, hedging, flowing paragraphs. Jargon: a finding only where it
would genuinely lose that doc's reader — judgment, not a quota. A model-facing file (skill, agent
brief) keeps bare `frontmatter`/`idempotent`; that is correct, not a defect. Fix =
`simple-language` skill condenses, keeping every fact/number/path/constraint. Skip what already
reads plain. READMEs may stay a touch more prose-y for human onboarding.
Model-facing = anything auto-loaded into a model's context (skills, agent briefs, CLAUDE.md,
AGENTS.md), not just the examples above.
Frontmatter `description:`/`name:` (skill or agent) is activation/routing behavior, not prose —
rewording changes what gets dispatched. Never restyle it; flag only if genuinely bloated, and name
the routing risk.
Rule source: ENGLISH + SIMPLE ARTIFACTS in `_shared/blocks.md`.

## Model-executed prose (skills, agents, prompts, rule files)
Content a model EXECUTES, not code a machine runs. Dead paths (a step the reader's tools cannot
perform) · unreachable rules (stated where the executing context never loads them) · triggers that
never fire (in the body but absent from the activating metadata) · a gate with no decision
procedure · cross-references that cannot resolve in the READING context — a path is correct only
relative to WHO reads it and from where.
Rule source: the repo's own convention for how its prose loads and who reads it. No convention
stated → that absence IS the finding.
Skip if the repo has no model-executed prose.

## Performance / correctness smells
Only clear, evidence-backed ones: redundant work on a hot path, dev-only config shipped as
default, obvious footguns. **Don't speculate** — no measurement or no traceable line → not a
finding.
Rule source: the repo's own pattern + the language/framework's documented behavior. Uncertain
whether it IS a smell → drop it.

## VCS hygiene — MAIN LOOP ONLY, never a scout
Build artifacts / generated files tracked, ignore-file gaps, committed secrets, large binaries
that don't belong. Every question here is a git-index question (`ls-files`, `check-ignore`, `log`)
and needs a shell — a scout has none, and file presence alone cannot tell tracked from ignored.
Secrets: report `file:line` + the kind, **never the value**. Never dump a whole config file.
Auth / input-validation review beyond this basic scan → `security-review` / `security-auditor`.
