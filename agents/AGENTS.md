# Purpose
The four subagent definitions the doorman dispatches to. One per model tier. Claude Code discovers
them by scanning `~/.claude/agents/`, which is a junction to this folder.

Unlike `../rules/`, nothing here is pulled by a routing table and nothing is read as prose by the
main loop. A file here becomes a callable agent purely by existing with valid frontmatter.

# Responsibilities
- Define `haiku-agent`, `sonnet-agent`, `opus-agent` and `fable-agent`
- Hold ONLY what differs between tiers: the `model:` field and the judgment the tier allows
- Point at the one shared method rather than restating it

# File Structure
- `haiku-agent.md`  — mechanical repetition at enumerated sites
- `sonnet-agent.md` — a new file or script following an existing pattern
- `opus-agent.md`   — anything carrying a decision; also the default when the tier is unclear
- `fable-agent.md`  — long-horizon work whose steps cannot be listed up front

# Key Components

## Why the method is not in these files
All four share one method, and four copies of it drift. The shared half lives once, in
[../rules/doorman-worker.md](../rules/doorman-worker.md), and each agent's body is short enough that
what differs between tiers is the only thing you read.

Each agent reads that file itself, by path, at the start of its run. That is the same mechanic the
rules tree already uses, and it is the reason these four files stay small.

## Why `~` and not an absolute path
Each agent body points at `~/.claude/rules/doorman-worker.md` and tells the agent to expand the
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
