# claude-config

Versioned Claude Code global config: user `CLAUDE.md` + custom skills.

## Layout
- `CLAUDE.md` — global user instructions (behavioral guidelines).
- `skills/`   — custom skills (coding-standards, web-standards, feature, documentation, git-commit, audit-solution, self-improve, caveman, drunken-genius).

## Wiring on this machine (Windows)
- `~/.claude/skills` → **junction** to `skills/` here.
- `~/.claude/CLAUDE.md` → 1-line `@import` pointer to `CLAUDE.md` here.

## Restore on a new machine
```powershell
$repo = 'd:\Projects\claude-config'   # clone target
New-Item -ItemType Junction -Path "$HOME\.claude\skills" -Target "$repo\skills"
Set-Content "$HOME\.claude\CLAUDE.md" "@$($repo -replace '\\','/')/CLAUDE.md"
```
First session shows a one-time external-import approval dialog — approve it.
