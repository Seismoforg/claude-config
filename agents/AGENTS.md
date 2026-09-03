# Purpose
Four subagent definitions. Claude Code discovers them by scanning `~/.claude/agents/`, which is a
junction to this folder.

**Three of them write, and have one caller.** `sonnet-agent`, `opus-agent` and `fable-agent` are
dispatched by `feature` workflow step 6, which cuts the task list into waves at step 4 and then builds
each wave by rating every task against
[../rules/dispatch-tiers.md](../rules/dispatch-tiers.md) and sending one agent per task. Nothing else
dispatches those three, so write work outside a feature run never reaches them — see
[ADR 0012](../docs/adr/0012-remove-the-doorman-waves-dispatch-directly.md).

**`haiku-agent` is the exception and is not one of them.** It holds no `Write` and no `Edit`: it is
recon, fired by the main loop whenever it wants to look something up rather than change something.
That happens inside a wave, while a spec is still being written, or with no feature in flight at all.
It is not rated by the procedure, has no place in the retry ladder, and never appears as a `# Tasks`
item. `dispatch-tiers.md` owns why; do not restate it here.

Unlike `../rules/`, nothing here is pulled by a routing table and nothing is read as prose by the
main loop. A file here becomes a callable agent purely by existing with valid frontmatter.

# Responsibilities
- Define `haiku-agent`, `sonnet-agent`, `opus-agent` and `fable-agent`
- Hold ONLY what differs between them: the `model:` field, the tool list, and the judgment allowed
- Point at the one shared method rather than restating it

# File Structure
- `haiku-agent.md`  — read-only recon: lookup, search, report with `path:line`. No write tools
- `sonnet-agent.md` — a new file or script following an existing pattern
- `opus-agent.md`   — anything carrying a decision; also the default when the tier is unclear
- `fable-agent.md`  — long-horizon work whose steps cannot be listed up front

# Key Components

## Why the method is not in these files
All four share one method, and four copies of it drift. The shared half lives once, in
[../rules/agent-worker.md](../rules/agent-worker.md), and each agent's body is short enough that
what differs between tiers is the only thing you read.

Each agent reads that file itself, by path, at the start of its run. That is the same mechanic the
rules tree already uses, and it is the reason these four files stay small.

`haiku-agent` reads it too, even though most of it is written for a worker that changes files. That is
deliberate: giving recon its own method file would create the second copy this arrangement exists to
prevent. `agent-worker.md` handles it by saying at the TOP which of its rules do not apply to a
read-only worker, and by carrying the recon report format in its own section at the end. The
disclaimer is at the top rather than only beside that section because a worker follows the rules it
reads first.

## Why `~` and not an absolute path
Each agent body points at `~/.claude/rules/agent-worker.md` and tells the agent to expand the
tilde if its file-reading tool rejects one. This repo is public, so a hardcoded user home would
publish a real machine's path and break on every other machine.

## What is NOT here
Frontmatter beyond `name`, `description`, `tools`, `model` and `color`. The `skills:` and `class:`
fields the deleted `agents/` tree used are gone with it: `skills:` named a skill layout that no
longer exists, and `class:` was checked by a script that was deleted in the same commit. A field
nothing reads is a field that goes stale silently.

## Unchecked, and known to be
`../scripts/check-frontmatter.mjs` covers `skills/*/SKILL.md` only. These four files' frontmatter is
verified by nothing. `claude plugin validate <dir>` will report a file whose frontmatter does not
parse, but it is not wired into this repo's checks.

# Dependencies
None. Plain markdown read by Claude Code.

# Related Modules
- Parent: [../](../README.md) — repo root: layout, the routing table, the Copilot build
- Sibling: [../rules/](../rules/AGENTS.md) — holds the shared worker method and the tier rubric
- Sibling: [../skills/](../skills/AGENTS.md) — the three workflow skills
