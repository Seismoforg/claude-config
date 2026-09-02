# Purpose
The rule sets this config hands to a working agent. Plain markdown, no frontmatter, nothing
auto-loads. A rule file reaches a model only because CLAUDE.md's routing table told it to read one.

That is the whole difference from `../skills/`: a skill activates itself off its `description:`, a
rule is pulled. So a rule may be long — it costs nothing on a task that never loads it.

# Responsibilities
- Hold the coding rules, split by what a change touches
- Carry the mechanical checks that belong to a rule, in `scripts/`
- Stay self-contained: a rule file names only other rule files, never a skill's internals

# File Structure
- `core.md`            — every code change, any language. The other stack files add to it
- `backend.md`         — layering, API conventions, scheduled work
- `typescript.md`      — TS/JS: arrow-const style, types, style-prop units
- `react.md`           — Atomic Design layout, components, hooks, state
- `web.md`             — responsive, WCAG AA, Core Web Vitals, motion, data states, live verification
- `design.md`          — anti-slop visual design; `design/*.md` are its appendices
- `python.md`          — Python and ML work
- `security.md`        — auth, input validation, secrets, pre-release checks
- `dependencies.md`    — adding and upgrading packages
- `documentation.md`   — AGENTS.md, ADRs, comments, docstrings
- `debugging.md`       — reproduce, isolate, root cause, verify
- `processes.md`       — Windows/PowerShell/bash mechanics for launching and ending a process
- `asking.md`          — what an `AskUserQuestion` owes its reader
- `design/*.md`        — design appendices, loaded only when `design.md` points at one
- `scripts/*.mjs`      — checks a rule invokes: `preflight.mjs` (design §14 pass 1),
                         `check-adr.mjs` (ADR status and successor pointer)

# Key Components

## Why a rule's script lives in this tree
This tree is junctioned into the Claude config home, so it travels to every project. A rule that says
"run this script" needs the script to travel with it. The repo-root script folder holds only checks
whose corpus IS this repo, and those never leave it.

Rule prose invokes them by the junction path, so the command works from any project rather than only
from this checkout. `design.md` §14 carries the one live example.

## Pointer style
A rule points at a sibling rule by bare filename (`web.md`), at an appendix by folder
(`design/ai-tells.md`), and from an appendix back up with `../design.md`. No absolute paths in prose,
no `reference/` prefix — that was the old skill layout.

## What does NOT belong here
A workflow. Rules say how something is written; a lifecycle with gates and state is a skill. If a
rule file grows a "step 1 / step 2 / wait for the user" spine, it is in the wrong tree.

# Dependencies
Node (`node:` builtins only) for the two check scripts. No package manager, no third-party packages.

# Related Modules
- Parent: [../](../README.md) — repo root: layout, the routing table, the Copilot build
- Sibling: [../skills/](../skills/AGENTS.md) — the three workflow skills that pull these rules
