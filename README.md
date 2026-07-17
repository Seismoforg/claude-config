# claude-config

Versioned Claude Code global config: user `CLAUDE.md` + custom skills + custom subagents.

## Layout
- `CLAUDE.md` — global user instructions (behavioral guidelines).
- `skills/`   — custom skills (coding-standards, web-standards, taste, feature, debugging, security-review, documentation, git-commit, audit-solution, self-improve, simple-language, fableize, drunken-genius).
- `agents/`   — custom subagents (audit-scout, security-auditor, standards-reviewer).

Per skill: `SKILL.md` is the always-loaded body. Addenda → `<skill>/reference/` (load on demand,
never at the skill root). Check scripts → `<skill>/scripts/`. Shared rule text → `skills/_shared/blocks.md`.

## Agents — scope rule
All agents here are **read-only analysis workers**. Three constraints drive that:
- Subagents cannot call `AskUserQuestion` — they have no user channel. So a gate-bound skill
  (`feature`, `git-commit`, `self-improve`) can never run inside one; it would guess or stall.
  **Agents analyse, the main loop keeps the gates.** A subagent also cannot dispatch another
  subagent — a skill that delegates must mark that section main-loop-only.
- Skills are NOT auto-discovered inside a subagent the way they are in the main loop. Each agent
  preloads what it needs via the `skills:` frontmatter field. `CLAUDE.md` is inherited automatically
  (except by the built-in `Explore`/`Plan` agents, which skip it — that is why these exist).
  `skills/_shared/blocks.md` is NOT inherited → an agent needing a shared rule keeps its own
  word-identical copy. An agent's cwd is the audited repo, so hand it ABSOLUTE paths.
- **A read-only `tools:` list is a narrowed blast radius, not a sandbox.** `Bash`/`PowerShell`
  write too (`rm`, `>`, `git reset`); `check-agents.mjs` cannot catch that statically. An agent
  holding a shell is read-only only by its own prose — so the check requires that briefing to be
  present (`unbriefed-shell`). Grant a shell only when a mandated command needs it:
  `standards-reviewer` (fetch a diff), `security-auditor` (CVE scan).

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
