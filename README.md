# claude-config

Versioned Claude Code global config: user `CLAUDE.md` + custom skills + custom subagents.

## Layout
- `CLAUDE.md` — global user instructions (behavioral guidelines).
- `skills/`   — custom skills (coding-standards, web-standards, taste, feature, crew, debugging, security-review, documentation, git-commit, audit-solution, self-improve, simple-language, fableize, drunken-genius).
- `agents/`   — custom subagents. Analysis (read-only): audit-scout, security-auditor, standards-reviewer, pm. Executor (write, worktree): dev, tester.

Per skill: `SKILL.md` is the always-loaded body. Addenda → `<skill>/reference/` (load on demand,
never at the skill root). Check scripts → `<skill>/scripts/`. Shared rule text → `skills/_shared/blocks.md`.

## Agents — two classes
Agents come in two classes, set by the `class:` frontmatter field:
- **analysis** (default, absent = this) — read-only workers: audit-scout, security-auditor,
  standards-reviewer, `pm`. Hold no write tools.
- **executor** — write-capable workers that build: `dev`, `tester`. May hold `Write`/`Edit`; they run
  in an isolated git worktree, so their writes never touch the user's live tree.

Three harness constraints bind BOTH classes — and none forbids *writing*; they forbid a worker from
*gating* or *dispatching*, which is why write-capable executors are still safe:
- Subagents cannot call `AskUserQuestion` — no user channel. A gate-bound skill (`feature`,
  `git-commit`, `self-improve`) can never run inside one; it would guess or stall. **Workers do the
  work, the main loop keeps every gate.**
- A subagent cannot dispatch another subagent. All dispatch stays in the main loop, and
  `check-agents.mjs` forbids the `Agent` tool on any agent (`no-nesting`). A skill that delegates marks
  that section main-loop-only — see `crew`, which runs a PM + devs + tester as a hub with the main loop
  as Teamleiter.
- Skills are NOT auto-discovered inside a subagent. Each agent preloads what it needs via the `skills:`
  field. `CLAUDE.md` is inherited automatically (except the built-in `Explore`/`Plan` agents, which skip
  it — that is why they exist). `skills/_shared/blocks.md` is NOT inherited → an agent needing a shared
  rule keeps its own word-identical copy. An agent's cwd is the target repo, so hand it ABSOLUTE paths.

**A `tools:` list narrows the blast radius; it is not a sandbox.** `Bash`/`PowerShell` write too
(`rm`, `>`, `git reset`); the check cannot catch that statically. So the limit is prose, and the check
demands the briefing be present:
- **analysis** + a shell → a body line marking it READ-ONLY (`unbriefed-shell`). Grant a shell only
  when a mandated command needs it: `standards-reviewer` (fetch a diff), `security-auditor` (CVE scan).
- **executor** → a body line documenting its worktree isolation (`unbriefed-executor`). The worktree
  is a dispatch-time flag (`isolation: worktree`) the check cannot set, so the Teamleiter must pass it.
  An executor writes by design — its containment is the worktree, not a read-only briefing.

Each agent's report closes with a `FRICTION:` line — a defect in the SKILLS, not the audited code
(tool it lacked, rule it could not apply, rule that misfired). An agent cannot run `self-improve`
itself (no transcript, no gate, no write), so this is the only channel back; the main loop feeds it
to `self-improve` as evidence.

Editing an agent definition → run the mechanical check, don't eyeball it:
```
node agents/scripts/check-agents.mjs
```
Exit 1 = violations as `file  rule  detail`. Static only — it cannot prove an agent launches or
that `skills:` preloads. **Agent types are enumerated at session start; new or edited files need a
session restart before they can be dispatched at all.**

## Wiring on this machine (Windows)
- `~/.claude/skills` → **junction** to `skills/` here.
- `~/.claude/agents` → **junction** to `agents/` here.
- `~/.claude/CLAUDE.md` → 1-line `@import` pointer to `CLAUDE.md` here.

## Restore on a new machine
```powershell
$repo = 'd:\Projects\claude-config'   # clone target
New-Item -ItemType Junction -Path "$HOME\.claude\skills" -Target "$repo\skills"
New-Item -ItemType Junction -Path "$HOME\.claude\agents" -Target "$repo\agents"
# BOM-free — a byte-order mark before @ breaks the @import
[IO.File]::WriteAllText("$HOME\.claude\CLAUDE.md", "@$($repo -replace '\\','/')/CLAUDE.md", (New-Object Text.UTF8Encoding $false))
```
First session shows a one-time external-import approval dialog — approve it.

## Portability
This setup uses Windows junctions + `@import` to link the config into Claude Code's
expected location. On Mac/Linux, the equivalent is a symlink (`ln -s`) instead of a
junction — for both `skills/` and `agents/`, same `@import` structure otherwise. Not tested
on Mac/Linux; adjust the link steps if you ever set this up there.
