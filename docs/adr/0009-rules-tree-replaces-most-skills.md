---
status: accepted
date: 2026-09-02
---

# Context
This config had grown to 13 skills, 5 subagents, 7 check scripts and a shared-block file: roughly
8200 lines of rule text across `skills/`, `agents/` and `scripts/`.

Most of that was not a workflow. `coding-standards`, `documentation`, `security-review` and
`debugging` were skills only because a skill was the only mechanism available for shipping rule text
that a model would pick up. None of them had gates, state, or a point where they waited for the user.
They said HOW code is written and then ended.

Being skills cost three things:

1. **Activation was a guess.** A skill loads off its `description:`. `coding-standards` had to list
   every design and web trigger phrase it could think of inside a 1024-character field, and a change
   it should have governed still missed it when the wording did not match.
2. **The composition rules grew to cover the guessing.** `CLAUDE.md` §7 defined a four-step
   composition order between skills. `feature` step 5 listed five separate "also invoke" bullets.
   Every subagent brief had to be handed absolute paths to addenda, because a file merely handed to
   an agent announces no base directory.
3. **Shared text needed a home of its own.** `skills/_shared/blocks.md` held nine rule blocks that
   several skills pointed at, plus a MIRROR/FLOOR discipline governing which copies had to stay
   word-identical. Two files could not point at it at all — subagent definitions and `CLAUDE.md` —
   so they carried inline copies that a script could not diff.

The subagent roster had a separate problem: `dev` workers ran in isolated worktrees, and a worktree is
cut from the branch tip as of session start (measured, ADR 0001). Task dispatch was therefore built
on machinery whose isolation guarantees kept surprising the thing that used it.

# Decision
**Coding rules leave `skills/` and become a pulled `rules/` tree. Three skills remain. The subagent
roster is removed entirely.**

- `rules/` holds plain markdown, no frontmatter. Nothing in it loads automatically. `CLAUDE.md`
  carries a **routing table** — kind of change → rule file — and a model reads what the table names.
- `rules/` is junctioned into `~/.claude/rules`, so a skill reaches a rule by that path and it
  resolves from any project.
- The three skills that survive are the ones that ARE lifecycles: `feature` (gates, state machine,
  approval), `git-commit` (a confirmed sequence of destructive git actions), `self-improve` (a
  gated retrospective).
- `grilling` folds into `feature` as `reference/grilling.md`, run from its step 0. It was never
  independently useful: it wrote a DRAFT into `feature`'s state machine and handed back into
  `feature`'s gates.
- `skills/_shared/blocks.md` is dissolved. Each block moves to the one place that owns it:
  interaction rules to `rules/asking.md`, coding rules to `rules/core.md`, the debt and
  resource-run rules to `CLAUDE.md`, the language rule to `rules/documentation.md`.
- `agents/` is deleted, and with it `feature`'s dispatch machinery. Task fan-out will be rebuilt on a
  different mechanism; keeping the old one running while that is designed would have meant
  maintaining two.
- `audit-solution`, `autopilot` and `drunken-genius` are deleted. Each was built on the agent roster,
  the deleted skills, or both.
- `check-pointers`, `check-size`, `check-docs`, `check-agents` and `behaviour-suite` are deleted.
  Their corpora were the old tree.

# Rationale
**A rule that is pulled beats a rule that guesses.** The routing table is a table: a row either
matches the change or it does not. That is a weaker mechanism than an always-on instruction and a
stronger one than a description field competing for the model's attention. It is also the same
mechanism on both targets — Copilot's export carries the identical table with rewritten paths.

**Cost is paid only when the rule applies.** A rule file is free on a task that never loads it, so
`design.md` and its nine appendices stay at full length. That is why the cut fell on skill COUNT and
on always-loaded text — `CLAUDE.md` went from 11.2 KB to roughly 7 KB — rather than on rule content.

**Composition disappears rather than being simplified.** With one process skill there is no ordering
question between skills. `feature` step 6 says "read the rules the routing table names for this
change"; there is no second skill to invoke, no addendum to hand an agent as an absolute path, and no
`_shared/` file whose copies can drift.

**What this gives up, stated plainly:**
- The former `coding-standards` was auto-invoked by its description. Rules now depend on the routing
  table being followed. Nothing enforces that, and a missed row is silent.
- `security-review` fired on its own trigger. `rules/security.md` is read when the routing table
  sends you there, which is one indirection later.
- The `standards-reviewer` and `security-auditor` agents gave an independent read of a diff in a
  fresh context. Nothing replaces that; `design.md` §14's second pass is now a self-review, which is
  weaker and says so.
- `check-pointers` verified that every `reference/` pointer resolved at exact on-disk case. The new
  tree has fewer pointers and no check on them.

# Consequences
- `~/.claude/agents` junction removed. `~/.claude/rules` junction added.
  **Amended by 0010:** the `agents/` tree and its junction are back, holding four model-tiered
  doorman workers instead of the role-based crew this ADR deleted. The decision above still stands —
  that roster is gone and did not return.
  **Amended by 0011:** 0010's amendment closed by calling that tree "the rebuilt fan-out the next
  bullet anticipated". It was not. The doorman rates one prompt and dispatches one worker; it has no
  notion of several tasks, of dependency order, or of two workers writing one file. It supplied the
  WORKERS the fan-out needed, not the fan-out. 0011 is the rebuild the next bullet anticipated.
- Claude Code's built-in `/security-review` is reachable again — the custom skill that shadowed it is
  gone.
- ADR 0001 (tester isolation), 0005 (surface skills merged into `coding-standards`) and 0008 (crew
  dissolved into feature dispatch) describe structures that no longer exist. All three are marked
  superseded by this ADR.
- `build-copilot.mjs` no longer translates agents: `TOOL_MAP`, the agent frontmatter table and the
  read-only-breach assertion are gone with them. It gained a `rules/` walk and two pointer rewrites.
- `features/` history is untouched. Older specs name skills that no longer exist; they are records of
  what was done, not live pointers.
