# claude-config

Versioned Claude Code global config: user `CLAUDE.md` + custom skills + custom subagents.

## Layout
- `CLAUDE.md` — global user instructions (behavioral guidelines).
- `skills/`   — custom skills (coding-standards, web-standards, taste, feature, debugging, security-review, documentation, git-commit, audit-solution, self-improve, caveman, drunken-genius).
- `agents/`   — custom subagents (audit-scout, security-auditor, standards-reviewer).

## Agents — scope rule
All agents here are **read-only analysis workers**. Two constraints drive that:
- Subagents cannot call `AskUserQuestion` — they have no user channel. So a gate-bound skill
  (`feature`, `git-commit`, `self-improve`) can never run inside one; it would guess or stall.
  **Agents analyse, the main loop keeps the gates.**
- Skills are NOT auto-discovered inside a subagent the way they are in the main loop. Each agent
  preloads what it needs via the `skills:` frontmatter field. `CLAUDE.md` is inherited automatically
  (except by the built-in `Explore`/`Plan` agents, which skip it — that is why these exist).

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
