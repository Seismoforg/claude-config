# claude-config

Versioned Claude Code global config: user `CLAUDE.md` + custom skills.

## Layout
- `CLAUDE.md` — global user instructions (behavioral guidelines).
- `skills/`   — custom skills (coding-standards, web-standards, taste, feature, debugging, security-review, documentation, git-commit, audit-solution, self-improve, caveman, drunken-genius).

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

## Portability
This setup uses a Windows junction + `@import` to link the config into Claude Code's
expected location. On Mac/Linux, the equivalent is a symlink (`ln -s`) instead of a
junction — same `@import` structure otherwise. Not tested on Mac/Linux; adjust the link
step if you ever set this up there.
