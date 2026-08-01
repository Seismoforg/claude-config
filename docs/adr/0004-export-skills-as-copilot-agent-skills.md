---
status: accepted
date: 2026-08-01
---

# Context
`scripts/build-copilot.mjs` was written when Copilot had no concept of a skill. Every skill had to be
forced into one of two shapes it did understand:

- **instructions** (`.github/instructions/<name>.instructions.md`) — applied automatically to every
  file matching an `applyTo` glob. Four skills went here: `coding-standards` (`**`), `web-standards`
  and `taste` (web file globs), `documentation` (`**/*.md`).
- **agents** (`.github/agents/<name>.agent.md`) — invoked by name. The other eleven.

A table named `SKILL_CLASS` held the split, one row per skill with a written reason, because the
choice was a judgement call with no obviously right answer.

GitHub Copilot shipped Agent Skills on 2025-12-18: `.github/skills/<name>/SKILL.md`, plus personal
locations including `~/.copilot/skills/` and `~/.claude/skills/`. The format is the same one this
repo already writes. Measured on the current 15 skills — every one declares exactly `name` and
`description`, the two fields the standard requires, with no Claude Code extensions, and all fit the
1024-character description cap.

# Decision
Emit every skill as a Copilot skill: `.github/skills/<name>/SKILL.md`, with its `reference/` files
alongside inside the same folder. Delete `SKILL_CLASS` and the instructions/agents split for skills.
`.github/agents/` now holds only the six real subagents.

Add `--install-skills` for the per-machine install, defaulting to `~/.copilot/skills`.

# Rationale
The split was a workaround for a missing feature. The feature exists, so the workaround goes — and
with it a table whose rows had to be judged and maintained per skill, and the risk that the next
skill added gets classified wrong in a way the output does not reveal.

Skills also carry their `reference/` files as part of the skill folder, which is what those files
are. Under the old shape they were emitted beside a flat instructions or agents file and only held
together by rewritten pointers.

# Consequences
- **The four instruction-class skills lose always-on application.** This is the real cost and it is
  not hypothetical: `coding-standards` applied to every file matching `**`; as a skill it loads when
  Copilot judges it relevant. Restoring always-on for one of them means deliberately emitting it as
  an instruction as well, accepting that it then exists in the build twice.
- `SKILL_CLASS` is gone, and with it the per-skill `why` notes. The globs it held are recorded above
  so the decision can be reversed without re-deriving them.
- A new skill needs no classification, so nothing has to be decided when one is added.
- `--install-skills` writes into the user's home directory. It only writes folders it emits, never
  deletes, and reports anything in the target it did not write — a skill removed from this repo
  leaves a stale folder behind, visible but not cleaned up automatically.
- `rewritePointers` no longer invents a home for an unattributable `reference/x.md`. It used to
  fabricate `.github/agents/reference/<file>`, a path present in no build; four such pointers existed
  at the time of this change. Unattributable pointers are now left exactly as written.
- The six subagents still inline their preloaded skills. Copilot agents have no way to declare a
  preloaded skill, so the inlining stays even though the skill now also ships standalone.
