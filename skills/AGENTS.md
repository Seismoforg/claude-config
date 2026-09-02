# Purpose
The three skills this config defines. One folder per skill; `SKILL.md` is the body a model loads, and
the frontmatter `description:` is what decides whether it loads at all.

A skill is a LIFECYCLE — gates, state, a wait for the user. Material with no gates in it belongs in
[../rules/](../rules/AGENTS.md), which is pulled by CLAUDE.md's routing table instead of activating
itself.

Because the description decides activation, `../scripts/check-frontmatter.mjs` checks it: the block
must be valid YAML and carry a non-empty `name` and `description`, and `name` must equal the folder.
The failure it catches is silent — an unquoted value holding `": "` is a nested mapping, so the block
is dropped, the file still loads, and the skill simply stops matching anything.

# Responsibilities
- Hold each skill's workflow, gates and hard rules
- Keep on-demand material out of the always-loaded body, in `reference/`
- Own the feature lifecycle's scripts and its two harness hooks

# File Structure
- `feature/`      — the `/features` lifecycle: state machine, gates, the requirements interview
- `git-commit/`   — guided commit, push and branch landing
- `self-improve/` — the retrospective, in two modes
- `<name>/SKILL.md`       — the always-loaded body. The folder name is the skill name
- `<name>/reference/*.md` — addenda, loaded ON DEMAND by an explicit pointer, never automatically
- `<name>/scripts/*.mjs`  — that skill's mechanical checks, any harness hook it owns, and any module
                            they share. `feature/scripts/` holds all three kinds: `check-features.mjs`
                            is a check you run, `tick-guard.mjs` (Stop) and `tick-sync.mjs`
                            (PostToolUse) are hooks you never invoke by hand, and `_shared.mjs` is
                            imported by the other three and is no entry point at all
- `<name>/*.template.md`  — the BASE for a runtime file the skill writes. `self-improve/` holds both
                            halves: `findings.template.md` travels, `findings.md` is the live log,
                            per machine, git-ignored

Never at a skill root: an addendum or a script. A TEMPLATE is the one exception.

# Key Components

## What loads, and when
`SKILL.md` is loaded whole when the skill activates. A `reference/` file is only ever `Read`, and only
because some prose told the reader to. Nothing under `reference/` loads on its own — a rule written
there that no pointer reaches is dead text.

## The skill-dir placeholder substitutes at LOAD
Only the `SKILL.md` body gets that substitution. Put an invocation line in a `reference/` file and
every reader receives the literal, unsubstituted token. That is why `feature/reference/grilling.md`
points back at `SKILL.md` for the `new-feature.mjs` and `check-features.mjs` command lines rather than
spelling them out.

## Pointing at a rule
A skill reaches a rule file by its junction path — `~/.claude/rules/<file>.md` — never by a
repo-relative `rules/` path. Skills run in other projects, where a relative path resolves against that
project's CWD. `self-improve`'s SKILL LIFECYCLE section owns the full pointer table.

## Adding, editing or removing a skill
`self-improve`'s SKILL LIFECYCLE owns every one of those cases, including the first question: is this
a skill at all, or a rule file? Read it before touching this tree.

# Dependencies
Node (`node:` builtins only) for the feature scripts. No package manager, no third-party packages.

# Related Modules
- Parent: [../](../README.md) — repo root: layout, the routing table, the Copilot build
- Sibling: [../rules/](../rules/AGENTS.md) — the pulled rule files these skills point at
