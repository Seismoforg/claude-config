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
- `core.md`            — every code change, any language. The other stack files add to it. One of the
                         two files in the routing table's always row
- `backend.md`         — layering, API conventions, scheduled work
- `typescript.md`      — TS/JS: arrow-const style, types, style-prop units
- `react.md`           — Atomic Design layout, components, hooks, state
- `web.md`             — responsive, WCAG AA, Core Web Vitals, motion, data states, live verification
- `design.md`          — anti-slop visual design; `design/*.md` are its appendices
- `python.md`          — Python and ML work
- `security.md`        — auth, input validation, secrets, pre-release checks
- `dependencies.md`    — adding and upgrading packages
- `documentation.md`   — AGENTS.md, ADRs, comments, docstrings. The always row's second file: every
                         code change writes comments, and a rule pulled only on architectural work
                         never reaches them
- `debugging.md`       — reproduce, isolate, root cause, verify
- `processes.md`       — Windows/PowerShell/bash mechanics for launching and ending a process
- `asking.md`          — what an `AskUserQuestion` owes its reader
- `dispatch-tiers.md`  — the tier rubric: which agent gets a task, or none. Not pulled by the table
- `agent-worker.md`    — the shared method for the four `../agents/` tiers, pulled by each agent
- `design/*.md`        — design appendices, loaded only when `design.md` points at one
- `scripts/*.mjs`      — checks a rule invokes: `preflight.mjs` (design §14 pass 1),
                         `check-adr.mjs` (ADR status and successor pointer)

# Key Components

## Why a rule's script lives in this tree
This tree is junctioned into the Claude config home, so it travels to every project. A rule that says
"run this script" needs the script to travel with it. The repo-root script folder holds only checks
whose corpus IS this repo, and those never leave it.

Rule prose invokes them by the junction path, so the command works from any project rather than only
from this checkout. Two live examples: `design.md` §14 invokes `preflight.mjs`, and
`documentation.md`'s ADR section invokes `check-adr.mjs`.

## Pointer style
A rule points at a sibling rule by bare filename (`web.md`), at an appendix by folder
(`design/ai-tells.md`), and from an appendix back up with `../design.md`. No absolute paths in prose,
no `reference/` prefix — that was the old skill layout.

A shell command in a rule file names its script by the junction path
(`~/.claude/rules/scripts/<name>.mjs`), never a repo-relative one.

A path CONTAINING a `~` expands in a POSIX shell only, so every command carrying one also tells a
PowerShell reader to put `$HOME` where the `~` is. Measured 2026-09-03: invoking a script through a
`~`-prefixed path runs under Git Bash and fails under PowerShell 5.1 with
`Cannot find module '<cwd>\~\.claude\rules\scripts\check-adr.mjs'` — PowerShell takes the tilde as a
literal directory name. A path with no `~` in it needs no such clause.

## The two dispatch files are not pulled by the routing table, on purpose
The opening claim — a rule reaches a model only because CLAUDE.md's routing table sent it there —
has exactly two exceptions, and they are named here rather than left to be inferred from the file
list. Both are read; neither is routed. A routing table row is for a change SURFACE, and these two
files are about who does the work, not about what the work touches.

- **`dispatch-tiers.md` is read by a SKILL and by the agent definitions.** `feature`'s SKILL.md
  step 6 opens it once per task in a wave, to rate that task and pick its agent; each of the four
  [../agents/](../agents/AGENTS.md) definitions names it as the rubric that rated them. Nothing
  else reads it.
- **`agent-worker.md` is pulled by an AGENT, not by the table.** Each of those four definitions
  reads it by path at the start of its run, because four copies of one method drift apart.

Both are excluded from the Copilot export in TWO places in `../scripts/build-copilot.mjs`:
`SOURCE_EXCLUSIONS` answers the coverage check, and `NOT_EMITTED_RULES` stops the emit. Listing a
file in only the first ships it anyway, silently — Copilot has no subagents, so both files would
name a mechanism that cannot exist there.

**A third file carries the same exclusion from the other tree**: `../skills/feature/reference/waves.md`,
which holds the procedure for dispatching those same subagents. Same two-place requirement and same
silent failure if only one place is filled in, but the emit-side list is a different one —
`NOT_EMITTED_SKILL_FILES`, because a skill's `reference/` walk is a separate loop that
`NOT_EMITTED_RULES` never reaches.

## What does NOT belong here
A workflow. Rules say how something is written; a lifecycle with gates and state is a skill. If a
rule file grows a "step 1 / step 2 / wait for the user" spine, it is in the wrong tree.

# Dependencies
Node (`node:` builtins only) for the two check scripts. No package manager, no third-party packages.

# Related Modules
- Parent: [../](../README.md) — repo root: layout, the routing table, the Copilot build
- Sibling: [../skills/](../skills/AGENTS.md) — the three workflow skills that pull these rules
- Sibling: [../agents/](../agents/AGENTS.md) — the four agent tiers, which pull `agent-worker.md`
