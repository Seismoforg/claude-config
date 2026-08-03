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
`coding-standards/`, `_shared/`, …) — no leading `skills/`. The dispatcher resolves them to absolute before
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

## Web conformance (UI)
Mobile-first responsive layout, accessibility (WCAG — semantics/labels/focus/contrast),
Core Web Vitals perf, purposeful motion, minimalist/bento layout.
Rule source: `coding-standards/reference/web.md`. Skip if the solution has no web UI.

## Design quality
Does it look templated/generic ("slop")? Cookie-cutter hero, default component look, no coherent
design direction, weak type/spacing/color system. Design-direction quality — distinct from the web
mechanics above. Mechanical tells are the dispatcher's script (`preflight.mjs`), not
yours; judge the rest.
Rule source: `coding-standards/reference/design.md` + `coding-standards/reference/design-ai-tells.md`
+ `coding-standards/reference/web.md` — design.md defers to web.md for contrast, reduced motion and
the CWV targets and forbids restating them, so those checks cannot be made without it.
Skip if no user-facing design surface, or the UI is internal tooling with no design ambition.

## Documentation conformance
AGENTS.md coverage for real modules, ADRs for major decisions, stale/contradictory docs.
Technical debt is not a doc artifact under THIS config — it is a feature DRAFT, so a debt ledger in a
repo that follows this config is a finding. In any other repo REPO PATTERNS wins: a debt doc the
project keeps by its own convention is a convention, not a finding. Sibling + link mechanics are the
dispatcher's script (`check-docs.mjs`), not yours; judge coverage and correctness.
Rule source: `documentation/SKILL.md`.

## Redundancy, contradiction & paradox
Three failures of one root: a rule that does not hold in one consistent place.
- **Redundancy** — the same rule/logic stated twice or more. Name EVERY copy, say which one should own
  it, and which become pointers. Duplication the text itself declares AND justifies is not a finding —
  look for a stated reason first, then only check the copies still match.
  **Fix side — unify or extract, and they are different fixes.** UNIFY when one site is the natural
  owner: it keeps the rule, every other copy becomes a pointer to it. EXTRACT when no site owns it —
  it moves to a shared home (this repo's is `_shared/blocks.md`) and all sites point there. Extraction
  moves a module boundary, so `coding-standards` REFACTOR RULES makes it SIGNIFICANT: it needs explicit
  approval at `audit-solution` STEP 4, and "Fix everything" alone does not authorize it.
- **Contradiction** — two statements that cannot both hold for the same reader in the same situation.
  Cite `file:line` for BOTH sides; never pick a winner without saying why.
- **Paradox** — the self-referential case, and NOT the same as a contradiction: one rule that defeats
  itself. A requires B while B forbids A · a step ordered before its own precondition · a rule whose
  satisfaction violates it · a gate that can never be passed. There is no second statement to hold it
  against; the defect is the cycle.
Method, per kind — a contradiction worded differently shares no search string with its counterpart, so
grep cannot find it: read invariant sections (HARD RULES, "always/never", ownership claims) end to end
and hold them against each other. A paradox is not found that way at all. TRACE it: start at one rule,
follow each thing it requires to the rule that governs THAT, and record the hops. Evidence is the traced
cycle with a `file:line` at every hop, and the hop that closes it back on the start. Without the trace
written out it is an assertion, not a finding.
Rule source: the repo's own anti-duplication mechanism (a shared/common rule file), if one exists. None
exists while duplication is widespread → that absence IS the finding.

## Effectiveness
Does a rule ACHIEVE anything? Every other dimension checks conformance against a stated rule; this one
checks the rule itself, so it is the most speculation-prone entry in this catalog and carries the
hardest bar.

**A finding REQUIRES a count.** State the rule's own trigger condition, then N of M: how many candidates
it matches out of how many exist. N at or near zero is the finding. "This seems weak", "this could be
stronger", "nobody follows this" without a number → NOT a finding, drop it.

Shapes that qualify: a check whose scope excludes all of its own targets · an escape hatch broad enough
to admit every case · a gate whose approval an earlier step already implies · a rule restated in several
places and followed in none.

Two guards, because the bar is only as good as the number behind it:
- **The count must be UNBOUNDED.** Your search tool caps results by default, and a capped result reads
  exactly like a real denominator — "250 of 250, so it is effective" for a rule matching 250 of 40,000.
  Use a counting mode, and SAY where the denominator came from. A count you cannot source is not one.
- **A rule whose own text declares it FORWARD-LOOKING is not a finding.** A scope deliberately written
  to bind files that do not exist yet matches nothing on the day it ships and is working as designed.
  Same shape as the "duplication the text itself declares AND justifies" carve-out above, and the
  intentional-convention guard at the top of this file. Check for a stated reason before counting.
Denominators come from your OWN unbounded search, or from a 2a mechanical-check result the dispatcher
handed you — a check script's violation list and the file count it ran over are measurements, and using
one is cheaper and more reliable than re-deriving it. Handed no 2a results at all → say so rather than
counting blind; this dimension is the one that cannot work without a measurement.
Rule source: the repo's own stated intent — what the rule SAYS it does, held against what it matches.
There is no external rule file for this dimension; do not invent one.

## Gaps
What is MISSING. Bounded by the repo's OWN text, or it becomes a wishlist.

**A gap is a finding ONLY where something in the repo implies the missing thing should exist**, and the
finding cites the `file:line` that implies it. No citation, no finding. Qualifying shapes: a pointer to
a section/file that does not exist · an enumerated list with a member never defined · a required-section
list where one section has no producer · a named mechanism with no home · a documented step whose tool
or script is absent.

NOT findings: a missing test suite, CI config, CONTRIBUTING.md, or any other thing that would be nice to
have but that nothing in the repo asks for. Each is defensible, each reads as thoroughness, and adding
them one at a time is exactly how this dimension turns into noise that buries the real must-fixes.
Rule source: the repo's own stated intent — its pointers, lists and required-section declarations.
No external rule file; do not invent one.

## Consistency
Is a chosen pattern applied uniformly (imports, config, error handling, i18n, styling, naming,
layout)? Flag one-off deviations. Fix = align to the dominant pattern, never add a variant.
Rule source: the repo's dominant pattern. A deviation the WHOLE repo shares is not a finding.

## Language (English-only)
Code comments/docstrings, `/features` files, docs (AGENTS.md, ADRs, READMEs) must be
English. Fix = translate (user-facing UI text → i18n, not inline). Independent of logic quality.
Rule source: LANGUAGE in `_shared/blocks.md`.

## Simple-language conformance
ALL docs terse AND plain: AGENTS.md, CLAUDE.md, ADRs, READMEs, `/features` specs,
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

## External premise — MAIN LOOP ONLY, never a scout
A load-bearing claim about something OUTSIDE the repo: a third-party product's capabilities, an
API's shape, a format's fields, a platform limit. Every OTHER dimension checks the repo against
itself, so a file that is internally perfect and factually out of date passes all of them at once.
Trigger, both halves: any statement of the form "X does not support Y" · "X has no Z" · "the only
way is W"; AND any adapter, converter, shim or workaround whose stated REASON is such a claim. The
second half is the one that pays — a workaround outlives the limitation that justified it, and
nothing in the repo changes when the outside world does.
Method: find the claim, note when it was written if the repo says, then CHECK it against current
official docs. That needs `WebSearch`/`WebFetch`, which a scout does not hold — same reason VCS
hygiene is the dispatcher's.
Finding = the claim `file:line`, the current fact with its source, and what the repo BUILDS on the
stale one (the cost is rarely the sentence; it is the design underneath). No web access → record it
UNCHECKED. Never pass a premise as verified because it is self-consistent — that is exactly what it
will look like.

## VCS hygiene — MAIN LOOP ONLY, never a scout
Build artifacts / generated files tracked, ignore-file gaps, committed secrets, large binaries
that don't belong. Every question here is a git-index question (`ls-files`, `check-ignore`, `log`)
and needs a shell — a scout has none, and file presence alone cannot tell tracked from ignored.
Secrets: report `file:line` + the kind, **never the value**. Never dump a whole config file.
Auth / input-validation review beyond this basic scan → `security-review` / `security-auditor`.
