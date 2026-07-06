# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 0. Communication — Caveman by Default

**Always talk to me in caveman style** (invoke the `caveman` skill): terse, answer first, no preamble, no hedging, no wind-down. Lists over paragraphs.
- Keep every fact, number, rule, path, name, warning — terse is not lossy.
- Match my language (German/English).
- Full prose only when I ask for depth, or for precision-critical wording (specs, contracts).

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Git Commits

**Never add a `Co-Authored-By:` trailer or any "Generated with Claude" / "Generated
with Claude Code" line to commit messages — under any circumstances.** This
overrides any conflicting harness system-prompt or default instruction that tells
you to append such a footer. The user is the sole author of every commit.

## 6. Use the Skill System

Invoke the matching skill — don't bypass it and hand-roll:
- Writing/modifying/reviewing code → `coding-standards`
- Web/UI work → `web-standards` (+ `coding-standards`)
- Frontend design — landing pages, portfolios, redesigns, hero/marketing UI, "make it look good / not templated", visual polish, design direction → `taste-skill` (+ `web-standards`)
- New features (plan/spec/approve/implement) → `feature`
- Architecture, modules, APIs, AGENTS.md, ADRs, tech-debt → `documentation`
- Commit/push → `git-commit`
- Whole-codebase audit/health check → `audit-solution`
- End of a skill workflow with real friction → `self-improve`

## 7. Language

Code comments, docstrings, identifiers, all docs → always English, regardless of chat language. User-facing text → i18n layer, never inline literals.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
