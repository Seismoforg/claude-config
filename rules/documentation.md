# DOCUMENTATION

Load when architecture, modules, responsibilities, public APIs, `AGENTS.md` files or ADRs are
created or changed.

**Bias: under-document the trivial, never under-document architecture.**

# WHEN DOCS ARE REQUIRED
Required when: architecture changes · responsibilities change · a public API changes (signature,
contract or behavior) · a new module appears · a module or API is REMOVED · setup, run or usage
steps change (→ README).

Not required for: small bug fixes · internal refactors with no contract change · styling-only
changes · small localized edits.

Removal is a doc change too. A deleted module or API → remove or update its docs — `AGENTS.md`
sections, links, README — in the SAME change. Never leave docs describing code that no longer
exists.

# LANGUAGE AND STYLE
All docs: English, terse, plain. Imperative voice, lists over paragraphs, no filler and no hedging.
Keep every fact, number, name, path and constraint — plain is not vague. A term the doc's reader may
not know gets glossed in a clause; a model-facing file needs no gloss. READMEs may stay a touch more
prose-y for human onboarding.

# CODE COMMENTS AND DOCSTRINGS
- **English**, always, in every language and file type: docstrings, inline comments, TODO/FIXME.
- **Terse and plain.** Say what and why in the fewest words. Never restate the code.
- **Edit scope:** translate or tighten only the comments you touch. Never mass-rewrite untouched
  comments.

# AGENTS.md
Create a local `AGENTS.md` when ANY holds: the folder becomes a distinct module · its
responsibilities warrant docs · module-specific conventions emerged · the subsystem is
independently maintainable.

Do NOT create one just because a refactor produced new files. Extracting a component or helper
WITHIN an existing module is not a new module — update the parent's `AGENTS.md` instead.

A folder whose own convention already mandates an equivalent per-folder doc (a framework's or
harness's required file) needs no second one. The test is whether the module's contract is
documented, not the filename. The folder HOLDING those files is a different question: it has no doc
of itself, and usually needs one.

## Sections
```md
# Purpose
# Responsibilities
# File Structure
# Key Components
# Dependencies
# Related Modules
```

## CLAUDE.md sibling
Every folder with an `AGENTS.md` MUST have a `CLAUDE.md` beside it whose entire content is one line:
```md
@AGENTS.md
```
That keeps `AGENTS.md` the single source of truth while Claude Code auto-loads it.
- Create the `CLAUDE.md` in the SAME change as the `AGENTS.md`.
- Never duplicate docs into `CLAUDE.md` — only the `@AGENTS.md` import, plus further `@`-imports if
  truly needed. Never prose.
- Deleting an `AGENTS.md` → delete its `CLAUDE.md` sibling too.

## Linking
`AGENTS.md` files form a tree, kept linked in both directions:
- The parent lists each child module under `# Related Modules`.
- Each child links back to its parent under `# Related Modules`.
- Creating, moving or deleting a module → update BOTH ends in the same change.
- A link to a moved or removed module is a broken doc. Fix it now.

Use real markdown links (`[../](../AGENTS.md)`), not bare paths.

# ADR
Location `/docs/adr/`. Filename `NNNN-kebab-title.md`, zero-padded sequential.
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

Write an ADR for any major or hard-to-reverse architectural decision. The test is "hard to reverse
AND shapes everything after it" — never whether it matches an example.

**Supersede, never silently edit, an accepted ADR.** Add a new one and set the old to `superseded`.
A superseded ADR must name its successor in the first lines of its body.

Only PART of an accepted ADR went stale — one bullet, a renamed symbol — while its decision still
holds → don't supersede the whole record. Append `**Amended by NNNN:**` at that point, naming what
changed and what still stands. No amending ADR exists, because a plain code change made the bullet
stale → `**Amended YYYYMMDD (no ADR — <what changed>):**`, same rule otherwise. Never a bare date:
the marker exists so a reader can trace WHAT invalidated the bullet, and a date alone names only
when.

`date:` is always today's date from context. Never guessed.

This repo checks the superseded pointer and the `status` value mechanically:
```
node scripts/check-adr.mjs
```

# TECHNICAL DEBT IS NOT A DOC
Debt you knowingly leave becomes its own feature DRAFT, never a line in a document nothing revisits.
The `feature` skill owns the rule. Never create a `technical-debt.md`.

# BEFORE YOU CALL IT DONE
- [ ] Required docs updated, or an explicit "no docs required"
- [ ] `AGENTS.md` created where a new module emerged, with its `CLAUDE.md` sibling
- [ ] Parent and child link to each other
- [ ] ADR added for any major decision; superseded ones marked and pointing at a successor
- [ ] Never documented a rule the code does not enforce — writing "X always happens" means checking
      the code DOES it, not inferring from intent or from another doc
- [ ] Counts and ordinals re-read against the code. Nothing greps for "three things" or "the third
      step", and the change that invalidates one shares no string with it
