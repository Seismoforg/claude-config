# Purpose
The skills this config defines. One folder per skill; `SKILL.md` is the body a model loads, and the
frontmatter `description:` is what decides whether it loads at all.

Because it decides that, `../scripts/check-frontmatter.mjs` checks it: the block must be valid YAML
and carry a non-empty `name` and `description`, and `name` must equal the folder. The failure it
catches is silent — an unquoted value holding `": "` is a nested mapping, so the block is dropped, the
file still loads, and the skill simply stops matching anything.

# Responsibilities
- Hold each skill's workflow, gates and hard rules
- Keep on-demand material out of the always-loaded body, in `reference/`
- Own the shared rule text every skill draws on, in `_shared/blocks.md`

# File Structure
- `<name>/SKILL.md`        — the always-loaded body. One per skill; the folder name is the skill name
- `<name>/reference/*.md`  — addenda, loaded ON DEMAND by an explicit pointer, never automatically
- `<name>/scripts/*.mjs`   — that skill's mechanical checks, any harness hook it owns, and any module
                           they share. `feature/scripts/` holds all three kinds: `check-features.mjs`
                           is a check you run, `tick-guard.mjs` (Stop) and `tick-sync.mjs`
                           (PostToolUse) are hooks you never invoke by hand, and `_shared.mjs` is
                           imported by the other three and is no entry point at all
- `<name>/*.template.md`   — the BASE for a runtime file the skill writes. `self-improve/` holds both
                           halves: `findings.template.md` travels, `findings.md` is the live log, per
                           machine, git-ignored
- `_shared/blocks.md`      — rule text several skills share, one block per rule

Never at a skill root: an addendum or a script. A TEMPLATE is the one exception. `_shared/` holds no
`SKILL.md` and is not a skill.

# Key Components

## What loads, and when
`SKILL.md` is loaded whole when the skill activates. A `reference/` file is only ever `Read`, and
only because some prose told the reader to. Nothing under `reference/` loads on its own — a rule
written there that no pointer reaches is dead text.

That split is the reason the design and web addenda live under `coding-standards/reference/` rather
than in its body: a backend edit would otherwise carry a thousand lines of banned palettes and
motion recipes.

## Pointer style is decided by the READER, not by taste
`self-improve`'s SKILL LIFECYCLE owns the full rule; the short form:
- A skill pointing at its OWN addendum → `reference/<file>.md`, joined onto the base directory the
  skill load announces.
- A skill pointing at ANOTHER skill's → `<skill>/reference/<file>.md`, from the skills root.
- A path going into a SHELL command → the skill-dir placeholder, which substitutes on load.
- A path handed to a SUBAGENT → absolute. It has your CWD for nothing, and a merely handed file
  announces no base directory at all.

`../scripts/check-pointers.mjs` resolves the first three forms at exact on-disk case, repo-wide.

## The skill-dir placeholder substitutes at LOAD
Only the `SKILL.md` body gets that substitution. Put an invocation line in a `reference/` file and
every reader receives the literal token — which is why `coding-standards` keeps its pre-flight
invocation in its body and not beside the design rules it belongs to. ADR 0005 records the decision.

## Naming
A design addendum is `design-<name>.md`, flat — never a nested `reference/design/`. The build script
copies `reference/*.md` non-recursively and its pointer regex excludes `/`, so a second level is
dropped silently rather than erroring. ADR 0005 has the measurement.

## Adding, editing or removing a skill
`self-improve`'s SKILL LIFECYCLE owns every one of those cases — the README and CLAUDE.md entries a
new skill needs, the grep a removed one requires, and what to re-trace after editing a workflow step.
Read it before touching this tree; it is not repeated here.

# Dependencies
Node (`node:` builtins only) for the check scripts. No package manager, no third-party packages.

# Related Modules
- Parent: [../](../README.md) — repo root: layout, agents, mechanical checks, the Copilot build
- Sibling: [../agents/](../agents/AGENTS.md) — the subagent definitions, which preload skills from here
