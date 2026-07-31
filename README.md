# claude-config

Versioned Claude Code global config: user `CLAUDE.md` + custom skills + custom subagents.

## Layout
- `CLAUDE.md` — global user instructions (behavioral guidelines).
- `skills/`   — custom skills (coding-standards, web-standards, taste, feature, feature-brainstorming, crew, debugging, security-review, documentation, git-commit, audit-solution, self-improve, simple-language, fableize, drunken-genius).
- `agents/`   — custom subagents. Analysis (read-only): audit-scout, security-auditor, standards-reviewer, pm, tester. Executor (write, worktree): dev.

Per skill: `SKILL.md` is the always-loaded body. Addenda → `<skill>/reference/` (load on demand,
never at the skill root). Check scripts → `<skill>/scripts/`. Shared rule text → `skills/_shared/blocks.md`.

## Agents
Two classes (`analysis`, read-only · `executor`, writes in an isolated worktree), three harness
constraints that bind both, and the `FRICTION:` reporting channel — all documented beside the code
they govern, in [agents/AGENTS.md](agents/AGENTS.md). Not repeated here: one home per rule.

## Mechanical checks
Run all three after editing anything they cover. Each exits 1 on a violation, printing `file  rule  detail`.
```
node agents/scripts/check-agents.mjs
node skills/feature/scripts/check-features.mjs
node skills/documentation/scripts/check-docs.mjs
```

## GitHub Copilot export
`node scripts/build-copilot.mjs .` translates this config into `github_build/` — the same skills and
agents in the formats Copilot reads. The output is git-ignored: build it when you want it.
`--check` re-derives and diffs instead of writing, which answers "did my edit change the
translation?". It is not a gate; nothing here goes stale, because nothing is committed.
Why it used to be committed and why that changed:
[ADR 0002](docs/adr/0002-commit-the-generated-copilot-build.md) →
[0003](docs/adr/0003-do-not-commit-the-generated-copilot-build.md).

## Decisions
Hard-to-reverse choices live in [docs/adr/](docs/adr/), superseded rather than edited:
- [0001](docs/adr/0001-tester-is-read-only-not-an-executor.md) — the tester is read-only, not an executor
- [0002](docs/adr/0002-commit-the-generated-copilot-build.md) — superseded by 0003
- [0003](docs/adr/0003-do-not-commit-the-generated-copilot-build.md) — the Copilot build is git-ignored

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
