---
name: documentation
description: Use when architecture, modules, responsibilities, public APIs, AGENTS.md files, or ADRs must be created or updated. Enforces the project documentation workflow.
---

# DOCUMENTATION SYSTEM

Keeps architecture, module, API, decision docs correct and in sync. Satisfies the
`feature` workflow's "documentation updated if required" step.

**Language + style: all docs follow ENGLISH + SIMPLE ARTIFACTS** (`skills/_shared/blocks.md`) — covers AGENTS.md, CLAUDE.md, ADRs, READMEs, code comments/docstrings. (READMEs may stay a touch more prose-y for human onboarding.)

# ON ACTIVATION — DECISION GATE
1. Matches a **required** trigger (below)? No → say "no docs required" and stop. Don't document trivial changes.
2. Yes → which artifacts: AGENTS.md (which folders?), ADR, or several.
3. Update, then run the Completion Checklist.

Bias: under-document the trivial, never under-document architecture.

# TRIGGERS
Required when: architecture changes · responsibilities change · a public API changes (signature/contract/behavior) · a new module · a new feature · a module/API is **removed** · setup/run/usage steps change (→ README).
NOT required for: small bug fixes · internal refactors with no contract change · styling-only · small localized edits.

Removal is a doc change too: a deleted module/API → remove or update its docs (AGENTS.md sections, links, README) in the SAME change. Never leave docs describing code that no longer exists.

# CODE COMMENTS & DOCSTRINGS
In-code docs are documentation too (invoked from `coding-standards`).
- **Language: English** — always, every language/file type: docstrings, inline comments, TODO/FIXME. (Identifier naming + user-facing i18n stay under `coding-standards`.)
- **Style: terse + plain (`simple-language`)** — say what/why in the fewest words; no filler prose, no restating the code. A term the next reader may not know → gloss it in a clause.
- **Edit scope:** translate/tighten only comments you touch; never mass-rewrite untouched comments.

# AGENTS.md

## Editing an existing doc
Before an in-place edit of ANY prose or rule file, confirm exact current text on disk by reading/grepping the target lines — a snapshot/recalled copy drifts in whitespace/wording, and an inexact match fails the edit. A read from earlier in the SAME session is a snapshot once intervening edits have shifted the file.

Documenting a control byte or an escape sequence → the write may insert the CHARACTER instead of the text describing it. Confirm with a byte-visible read.

## When to create a local AGENTS.md
Create one when ANY holds:
- Folder becomes a distinct module
- Its responsibilities warrant docs
- Module-specific conventions emerge
- The subsystem is independently maintainable

Do NOT create one just because a refactor made new files. Extracting a component/helper WITHIN an existing module is not a new module — update the parent's AGENTS.md instead.

A folder whose own convention already mandates an equivalent per-folder doc (a framework's or harness's required file) needs no second one — the test is whether the module's contract is documented, not the filename. The folder HOLDING those files is a different question: it has no doc of itself, and usually needs one.

## Structure + worked example
See `reference/agents-md-template.md`. Load it only when creating or restructuring an AGENTS.md file.
Dispatching a SUBAGENT whose task creates a module doc → hand it the ABSOLUTE path. The pointer above
is skill-relative, and an absolute one is unambiguous for every reader
(`feature/reference/dispatch.md` §3 owns the hand-off).

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
AGENTS.md files form a tree, kept bidirectionally linked. **The mechanical half needs at least TWO
AGENTS.md files that reference each other; below that it enforces nothing** — a one-node tree has no
edge to check, and a parent documented by a `README.md` instead is excluded by construction (see
MECHANICAL CHECK). The rule below still binds you as an author; just do not read a green run as
proof it held.
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
Write an ADR for any major/hard-to-reverse architectural decision. Application repos: framework, data store, auth model, API style, build pipeline. Those are EXAMPLES, not the test — other repo shapes have their own hard-to-reverse decisions. The test is "hard to reverse AND shapes everything after it", never whether it matches an example. Supersede — never silently edit — an accepted ADR: add a new one, set the old to `superseded`. Only PART of an accepted ADR went stale (one bullet, a renamed symbol) while its decision still holds → don't supersede the whole record. Append `**Amended by NNNN:**` at that point, naming what changed and what still stands. **No amending ADR exists** — a plain code change made the bullet stale, so there is no `NNNN` to cite → `**Amended YYYYMMDD (no ADR — <what changed>):**`, same rule otherwise. Never a bare date: the marker exists so a reader can trace WHAT invalidated the bullet, and a date alone names only when.
Dates (ADR `date:`) are ALWAYS today's date from context — never guessed or fabricated.

# TECHNICAL DEBT
Not a doc artifact — this skill does not own it. Debt you knowingly leave becomes its own FEATURE
DRAFT; TECHNICAL DEBT in `skills/_shared/blocks.md` owns the rule.
`/docs/technical-debt.md` is retired. Never re-create it, and never file a shortcut into any doc
instead: a doc entry is a record nothing revisits, which is exactly why it was replaced.

# MECHANICAL CHECK
Sibling + linking rules are deterministic. Run the script; never eyeball them:
```
node ${CLAUDE_SKILL_DIR}/scripts/check-docs.mjs [root]
```
Exit 1 = violations as `file  rule  detail` (missing/bad CLAUDE.md sibling, one-way link, broken
link). Fix, re-run to exit 0. Structure only — coverage, prose style and "is this the right doc"
stay judgment calls below. Exit 0 on a repo with NO AGENTS.md says "nothing checked", not "clean" —
an empty set is not a pass, and whether a module needs one is your call, not the script's.
**Same for an empty EDGE set: read the counts it prints, not just the exit code.** TWO different
things produce zero edges, and only the first is a mistake:
1. **Bare paths.** Link checking sees markdown links only, so `- Parent: ../` under
   `# Related Modules` yields no edge. Fix the syntax — `reference/agents-md-template.md` shows the
   form.
2. **A parent that is not an AGENTS.md.** An edge counts only when the link target IS or CONTAINS an
   `AGENTS.md`. A repo whose top module is documented by a root `README.md` has a real, correct
   markdown link that is still excluded, and no violation is raised. Nothing is wrong with the doc;
   the check simply cannot reach it.
Either way, zero links checked = the link half is UNCHECKED; say so, and verify the parent/child ends
by hand.

# COMPLETION CHECKLIST
- [ ] Required docs updated (or explicit "no docs required")
- [ ] AGENTS.md created where a new module emerged
- [ ] `check-docs.mjs` exits 0 (covers sibling + bidirectional/unbroken links)
- [ ] ADR added for any major decision; superseded ones marked
- [ ] Architecture docs internally consistent — a doc that states the same fact twice drifts in one copy. Re-read COUNTS and ORDINALS ("three things", "starts at the third") against the code: nothing greps for them, and the change that invalidates one shares no string with it
- [ ] Shortcuts knowingly left are filed as feature DRAFTs, never written into a doc (TECHNICAL DEBT in `skills/_shared/blocks.md`)
- [ ] Prose is terse + plain (`simple-language` style) — no filler/hedging/wind-down; lists over paragraphs (READMEs excepted, see above); a term the doc's reader may not know is glossed in a clause (a model-facing doc needs none)

# HARD RULES
Non-obvious, high-severity only — the sections above are not repeated here.
- **Never document trivial fixes, refactors, or styling.** ON ACTIVATION above owns the under-document bias.
- **Never document a rule the code does not enforce.** Writing "X always happens" / "component Y uses Z" → check the code DOES it; don't infer from intent or from another doc.
- **ALWAYS invoke the `simple-language` skill** when drafting or condensing any doc text — mandatory, not optional. Keep every fact/name/path/constraint. Verbose prose is a defect to condense.
- This skill's checklist gates the `feature` workflow's documentation validation.

See `skills/_shared/blocks.md` for WHEN UNCERTAIN (never document a guess) / AFTER THE TASK / LANGUAGE / TECHNICAL DEBT.
