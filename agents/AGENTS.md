# Purpose
Custom subagent definitions for this config. One file per agent; the frontmatter is what the harness
reads, the body is the agent's brief.

# Responsibilities
- Define each worker's role, scope, method and output contract
- Declare its tool set and which skills it preloads
- Carry, inline, any shared rule text it needs — a subagent inherits neither `skills/_shared/blocks.md`
  nor skills

# File Structure
- `<name>.md`            — one agent definition; filename must equal its `name:` field
- `scripts/check-agents.mjs` — mechanical check over every definition here: agent SEMANTICS
- `../scripts/check-frontmatter.mjs` — the other half: that the frontmatter is valid YAML at all, and
  carries a non-empty `name` and `description`. Ownership splits by QUESTION, not by file — the reader
  in `check-agents.mjs` is deliberately lenient and stays that way, because the same rules living in
  two scripts is how they drift. Name-matches-filename stays here; that is semantics

`AGENTS.md` and `CLAUDE.md` in this folder are docs, not definitions. Both `scripts/check-agents.mjs`
and the Copilot build skip them when reading agent DEFINITIONS; without that they parse as agents and
fail with `no-frontmatter`. Skipped there is not the same as dropped: the build emits this file as a
folder doc under its own name, and excludes `CLAUDE.md` only because it is a one-line `@AGENTS.md`
import of this very file.

# Key Components

## Two classes, set by the `class:` frontmatter field
- **analysis** (default, absent = this) — read-only workers: `audit-scout`, `security-auditor`,
  `standards-reviewer`, `pm`, `tester`. Hold no write tools; they return findings or code as TEXT.
- **executor** — write-capable workers that build: `dev`. May hold `Write`/`Edit`, and ALWAYS runs in
  an isolated git worktree, so its writes never touch the user's live tree (`unbriefed-executor`
  enforces that the briefing exists).

**A role that must SEE an earlier worker's output cannot be an executor.** A worktree is cut from the
branch tip as of SESSION START, so it cannot carry one worker's output to the next. That is why
`tester` is analysis: it returns test code and the dispatcher runs it. Full reasoning and the
measurement behind it: [ADR 0001](../docs/adr/0001-tester-is-read-only-not-an-executor.md).

## Three constraints binding BOTH classes
Two come from the harness; the third is this repo's own policy, and the bullet says which.
None forbids *writing*; they forbid a worker from *gating* or *dispatching*, which is why
write-capable executors are still safe.
- Subagents cannot call `AskUserQuestion` — no user channel. A gate-bound skill (`feature`,
  `git-commit`, `self-improve`, `grilling`) can never run inside one; it would guess or
  stall. **Workers do the work, the main loop keeps every gate.**
- No agent here dispatches another — **repo POLICY, not a harness limit.** The harness allows nesting
  (three layers by default, `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`); withholding the `Agent` tool is
  its documented opt-out, and `check-agents.mjs` enforces exactly that (`no-nesting`). So that check
  is the ONLY thing keeping dispatch in the main loop — relax it for an agent that "cannot nest
  anyway" and every gate resting on it reopens. A skill that delegates marks that section
  main-loop-only — see `crew`, which runs a PM + devs + tester as a hub with the main loop as
  Teamleiter.
- Skills are NOT auto-discovered inside a subagent. Each agent preloads what it needs via the
  `skills:` field. `CLAUDE.md` is inherited automatically (except the built-in `Explore`/`Plan`
  agents, which skip it — that is why they exist). `skills/_shared/blocks.md` is NOT inherited → an
  agent needing a shared rule keeps its own word-identical copy. A preloaded skill arrives as its
  SKILL.md body ALONE — not the `reference/...` files it points at — so a needed addendum is handed
  over as an absolute path (`crew` DISPATCH RULES owns that). An agent's cwd is the target repo, so
  hand it ABSOLUTE paths.
  **A PRELOADED skill may announce its base directory**, with the skill-dir placeholder inside that
  body already substituted — so a preloaded pointer is worth attempting. The hand-off rule stands
  regardless: it is unambiguous, free, and the only option for a HANDED file, which announces no base
  directory and whose own pointers really are dead.

## A `tools:` list narrows the blast radius; it is not a sandbox
`Bash`/`PowerShell` write too (`rm`, `>`, `git reset`); the check cannot catch that statically. So the
limit is prose, and the check demands the briefing be present:
- **analysis** + a shell → a body line marking it READ-ONLY (`unbriefed-shell`). Grant a shell only
  when a mandated command needs it: `standards-reviewer` (fetch a diff), `security-auditor` (CVE scan).
- **executor** → a body line documenting its worktree isolation (`unbriefed-executor`). The worktree
  is a dispatch-time flag (`isolation: worktree`) the check cannot set, so the Teamleiter must pass it.
  An executor writes by design — its containment is the worktree, not a read-only briefing.

## The FRICTION channel
Each agent's report closes with a `FRICTION:` line — a defect in the SKILLS, not the audited code
(tool it lacked, rule it could not apply, rule that misfired). An agent cannot run `self-improve`
itself (no transcript, no gate, no write), so this is the only channel back. Report broadly — the main
loop carries the line to `self-improve`, and its FIX EVIDENCE classes decide whether it qualifies.
Filtering is not your job; staying silent about it is the only real failure.
Exception: `pm` closes with `OPEN:` instead, because everything it surfaces at plan time is a question
for the USER, not yet a skill defect. The dispatcher still has to split that list — a genuine skill
defect hiding in it (a rule source that applied but was never handed over) is `self-improve` evidence
and must not be answered at the approval gate as if it were a scope question.

## Editing a definition
Run the mechanical check, don't eyeball it:
```
node agents/scripts/check-agents.mjs
```
Exit 1 = violations as `file  rule  detail`. Static only — it cannot prove an agent launches or that
`skills:` preloads. **A new or edited agent may not be dispatchable immediately** — read the
harness-registration rule in `self-improve`'s SKILL LIFECYCLE before you call an agent broken or
clean; a not-found error right after writing proves neither.

# Dependencies
Node (`node:` builtins only) for the check script. No package manager, no third-party packages.

# Related Modules
- Parent: [../](../README.md) — repo root: layout, skills, the Copilot build, machine wiring
- Sibling: [../skills/](../skills/AGENTS.md) — the skills these agents preload via `skills:`
