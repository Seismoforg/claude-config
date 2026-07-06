---
name: documentation
description: Use when architecture, modules, responsibilities, public APIs, AGENTS.md files, ADRs, or technical-debt documentation must be created or updated. Enforces the project documentation workflow.
---

# DOCUMENTATION SYSTEM

Keeps architecture, module, API, decision docs correct and in sync. Satisfies the
`feature` workflow's "documentation updated if required" step.

**Language: all docs in English** — regardless of chat language. Covers AGENTS.md, CLAUDE.md, ADRs, technical-debt, READMEs, code comments/docstrings. Editing a doc in another language → translate the sections you touch.

**Style: write docs terse (caveman style)** — imperative, no filler, lists over prose; keep every fact, name, path and constraint. Invoke the `caveman` skill when drafting/condensing. (READMEs may stay a touch more prose-y where a human onboarding needs it.)

# ON ACTIVATION — DECISION GATE
1. Matches a **required** trigger (below)? No → say "no docs required" and stop. Don't document trivial changes.
2. Yes → which artifacts: AGENTS.md (which folders?), ADR, technical-debt, or several.
3. Update, then run the Completion Checklist.

Bias: under-document the trivial, never under-document architecture.

# TRIGGERS
Required when: architecture changes · responsibilities change · a public API changes (signature/contract/behavior) · a new module · a new feature · a module/API is **removed** · setup/run/usage steps change (→ README).
NOT required for: small bug fixes · internal refactors with no contract change · styling-only · small localized edits.

Removal is a doc change too: a deleted module/API → remove or update its docs (AGENTS.md sections, links, README, tech-debt) in the SAME change. Never leave docs describing code that no longer exists.

# CODE COMMENTS & DOCSTRINGS
In-code docs are documentation too (invoked from `coding-standards`).
- **Language: English** — always, every language/file type: docstrings, inline comments, TODO/FIXME. (Identifier naming + user-facing i18n stay under `coding-standards`.)
- **Style: terse (caveman)** — say what/why in the fewest words; no filler prose, no restating the code.
- **Edit scope:** translate/tighten only comments you touch; never mass-rewrite untouched comments.

# AGENTS.md

## Editing an existing doc
Before an in-place edit (AGENTS.md/ADR/debt), confirm exact current text on disk by reading/grepping the target lines — a snapshot/recalled copy drifts in whitespace/wording, and an inexact match fails the edit.

## When to create a local AGENTS.md
Create one when ANY holds:
- Folder becomes a distinct module
- Its responsibilities warrant docs
- Module-specific conventions emerge
- The subsystem is independently maintainable

Do NOT create one just because a refactor made new files. Extracting a component/helper WITHIN an existing module is not a new module — update the parent's AGENTS.md instead.

## Structure (all sections required)
```md
# Purpose
# Responsibilities
# File Structure
# Key Components
# Dependencies
# Related Modules
```

## Example
```md
# Purpose
Theme configuration and the SSR-safe MUI provider chain.

# Responsibilities
- Define the global default MUI theme
- Provide Emotion cache + ThemeProvider for the App Router

# File Structure
- theme.ts          — global createTheme() definition
- ThemeRegistry.tsx — AppRouterCacheProvider → ThemeProvider → CssBaseline

# Key Components
- ThemeRegistry — mounted once in app/layout.tsx

# Dependencies
@mui/material, @emotion/react, @mui/material-nextjs

# Related Modules
- Parent: ../  (src)
```

# CLAUDE.md SIBLING (HARD RULE)
Every folder with an `AGENTS.md` MUST have a `CLAUDE.md` beside it whose entire content is one line:
```md
@AGENTS.md
```
Keeps AGENTS.md the single source of truth, auto-loaded via CLAUDE.md.
- Create the CLAUDE.md in the SAME change as the AGENTS.md.
- Never duplicate docs into CLAUDE.md — only `@AGENTS.md` (plus extra `@`-imports if truly needed; never prose).
- Deleting an AGENTS.md → delete its CLAUDE.md sibling too.

# LINKING (HARD RULE)
AGENTS.md files form a tree, kept bidirectionally linked:
- Parent lists each child module under `# Related Modules`.
- Each child links back to its parent under `# Related Modules`.
- Creating/moving/deleting a module → update BOTH ends in the same change.
- A link to a moved/removed module is a broken doc — fix it now.

# ADR
Location `/docs/adr/`. Filename `NNNN-kebab-title.md` (zero-padded sequential).
```md
---
status: proposed | accepted | superseded
date: YYYY-MM-DD
---

# Context
# Decision
# Rationale
# Consequences
```
Write an ADR for any major/hard-to-reverse architectural decision (framework, data store, auth model, API style, build pipeline). Supersede — never silently edit — an accepted ADR: add a new one, set the old to `superseded`.
Dates (ADR `date:` and tech-debt `added`) are ALWAYS today's date from context — never guessed or fabricated.

# TECHNICAL DEBT
Track in `/docs/technical-debt.md`:
```md
## <short title>  (added YYYY-MM-DD)
- Problem:
- Impact:
- Proposed Resolution:
```
Add an entry whenever a change knowingly leaves a shortcut/workaround/deferred fix.

# COMPLETION CHECKLIST
- [ ] Required docs updated (or explicit "no docs required")
- [ ] AGENTS.md created where a new module emerged
- [ ] Every AGENTS.md has a CLAUDE.md sibling containing `@AGENTS.md`
- [ ] AGENTS.md hierarchy bidirectionally linked, unbroken
- [ ] ADR added for any major decision; superseded ones marked
- [ ] Architecture docs internally consistent
- [ ] New/known shortcuts recorded in technical-debt.md
- [ ] Prose is terse (caveman style) — no filler/hedging/wind-down; lists over paragraphs

# WHEN UNCERTAIN
Local first (existing docs, AGENTS.md, /docs+ADRs, code). Still unclear → `WebSearch` (+ `WebFetch` for official docs), never document a guess.

# HARD RULES
- Never document trivial fixes, refactors, or styling.
- Unclear → verify with `WebSearch`/`WebFetch`, don't document a guess.
- All docs English, regardless of chat language.
- ALWAYS invoke the `caveman` skill when drafting or condensing any doc text — mandatory, not optional. Keep every fact/name/path/constraint. Verbose/prose docs are a defect to condense.
- Code comments/docstrings: English + terse; edit only what you touch (see CODE COMMENTS & DOCSTRINGS).
- Every AGENTS.md has a CLAUDE.md sibling containing only `@AGENTS.md`.
- AGENTS.md links bidirectional and current.
- Removed module/API → its docs removed/updated same change; never describe code that no longer exists.
- ADR/tech-debt dates are today's date from context, never guessed.
- Major architectural decisions require an ADR.
- ADRs appended/superseded, never silently rewritten.
- This checklist gates the `feature` workflow's documentation validation.

# AFTER THE TASK
Concrete friction traceable to this skill? → `/self-improve`. Else silent.
