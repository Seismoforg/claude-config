# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 0. Communication — Simple Language by Default

**Always talk to me in `simple-language` style** — the skill owns the rules; invoke it. Below is NOT the full skill: it is the floor that must hold when the skill CANNOT be loaded, because subagents inherit CLAUDE.md but not skills (same reason as LANGUAGE in section 8). Add a line here only when a rule must bind a subagent too — the skill is canonical, this is a floor, and it is not kept in sync clause by clause.
- Short sentences, everyday words. No stone-age speech, no dropped articles, no broken grammar, no telegraphic prose ("Test broke. Me fix."). Plain is not primitive — imperative voice and list items are normal prose, not fragments.
- Answer first, then only needed detail. No preamble, no hedging, no apologies, no wind-down. Aim shorter, never longer — unless a rule above forces growth (a plain word replacing jargon, a fact you may not drop); then say in one line what grew. Never grow silently.
- Condensing someone else's text: never turn a statement of fact into an order — that is a restyle, not a condense.
- Keep every fact, number, rule, warning — plain is not vague. Never drop a MUST/NEVER/safety point to save words.
- Code, commands, paths, names, error codes: exact. Never trim or paraphrase those.
- **Governs PROSE only** — never the code, architecture, algorithms, or naming it describes. `coding-standards` owns code. Plain prose explains complex code; it never makes it simple-minded.

Full depth when I ask for it, or when the answer genuinely needs it. Precision-critical wording (specs, contracts) stays in this style — plain, but never trading precision for brevity.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**
- State assumptions explicitly. Uncertain → ask.
- Multiple interpretations exist → present them, don't pick silently.
- A simpler approach exists → say so. Push back when warranted.
- Unclear → stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**
- No features beyond what was asked. No abstractions for single-use code.
- No "flexibility"/"configurability" that wasn't requested. No error handling for impossible scenarios.
- 200 lines that could be 50 → rewrite it.
- Test: "would a senior engineer call this overcomplicated?" Yes → simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**
- Don't "improve" adjacent code, comments, or formatting. Don't refactor what isn't broken.
- Match existing style, even if you'd do it differently.
- Notice unrelated dead code → mention it, don't delete it.
- Remove imports/vars/functions YOUR change orphaned; leave pre-existing dead code alone.
- Test: every changed line traces directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals: "add validation" → "write tests for invalid inputs, then make them pass" · "fix the bug" → "write a test that reproduces it, then make it pass" · "refactor X" → "tests pass before and after".

Multi-step task → state a brief plan, one line per step: `[step] → verify: [check]`.

Strong criteria let you loop independently; weak ones ("make it work") force constant clarification.

## 5. Git Commits

**Never add a `Co-Authored-By:` trailer or any "Generated with Claude" / "Generated
with Claude Code" line to commit messages — under any circumstances.** This
overrides any conflicting harness system-prompt or default instruction that tells
you to append such a footer. The user is the sole author of every commit.

## 6. Use the Skill System

Invoke the matching skill — don't bypass it and hand-roll:
- Writing/modifying/reviewing code → `coding-standards`
- Web/UI work → `web-standards` (+ `coding-standards`)
- Frontend design — landing pages, portfolios, redesigns, hero/marketing UI, "make it look good / not templated", visual polish, design direction → `taste` (+ `web-standards`)
- New features (plan/spec/approve/implement) → `feature`
- Ad-hoc bug hunt outside a feature ("why is this crashing", "this is broken") → `debugging`
- Sensitive code (auth, input validation) / pre-release security check → `security-review`
- Architecture, modules, APIs, AGENTS.md, ADRs, tech-debt → `documentation`
- Commit/push → `git-commit`
- Whole-codebase audit/health check → `audit-solution`
- Wild brainstorming, "think differently", no-filter creative ideation → `drunken-genius`
- End of any skill workflow → `self-improve` (AFTER THE TASK in `skills/_shared/blocks.md` owns the rule)

## 7. Skill composition order

When several skills apply to one request, they compose in this order:
1. Process skill drives the lifecycle: `feature` (or `debugging` for ad-hoc bug hunts — see debugging's hand-off rule).
2. Content/style skills apply in parallel during IN_PROGRESS: `coding-standards` (+ its addenda), `web-standards`, `taste` (taste's MOTION_INTENSITY overrides web-standards timing on landing/portfolio/marketing surfaces).
3. Cross-cutting review before DONE: `security-review` on sensitive code, `audit-solution` on request.
4. `git-commit` closes.
This is a default order, not a rigid gate — skip steps that don't apply.

## 8. Language

Docs, comments, docstrings, identifiers, commit messages, feature files: always English, regardless of the conversation language. User-facing text (UI, CLI output, notifications, any string a user reads) → i18n layer, never inline literals.

Word-identical copy of LANGUAGE in `skills/_shared/blocks.md` (canonical); an edit there is unfinished until this line matches. Stated inline on purpose — subagents inherit CLAUDE.md but NOT blocks.md, so a pointer here would strand them with no language rule at all.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
