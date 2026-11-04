# claude-config

Global Claude Code config: rules, skills and agents, used by every project on this machine.

## Contents

- `CLAUDE.md`: global instructions. Loaded through an `@import` line in `~/.claude/CLAUDE.md`.
- `rules/core.md`: coding rules, read before every code change. The stack files named in
  `CLAUDE.md` (`typescript.md`, `web.md`, ...) are not in this repo yet.
- `skills/plan/`: `SKILL.md` and `template.md`. Runs `/plan`: plans with the user, builds,
  verifies, then closes the plan through the commit skill.
- `skills/commit/`: `SKILL.md`. Proposes commit splits, commits, merges and pushes. Each step
  waits for the user's yes.
- `agents/worker.md`: builds one task of a plan (sonnet).
- `agents/verify.md`: checks a finished plan against its diff. Read-only (sonnet).
- `agents/e2e.md`: tests frontend changes in a visible browser through the Playwright MCP
  server. Read-only (sonnet). Spawned by the plan skill.

## Install

What `~/.claude` holds on this machine:

- `agents`, `rules` and `skills` are directory junctions. Each points to the folder of the
  same name in this repo. `dir /AL ~/.claude` lists them as `<JUNCTION>`.
- `CLAUDE.md` is a plain file with one line: `@<path to this repo>/CLAUDE.md`.

Because the skills are junctioned, every project sees the same skills. Edits in this repo
take effect at once.

## Playwright MCP (one-time setup)

The `e2e` agent needs the Playwright MCP server. Register it once, at user scope:

```
claude mcp add --scope user playwright -- npx @playwright/mcp@0.0.83
```

Check the registration:

```
claude mcp get playwright
```

Notes:

- The registration is stored in `~/.claude.json`, not in this repo. Per-project `.mcp.json`
  files are not used.
- The version is pinned on purpose. Bump it only after a smoke test.
- The browser is headed (visible) by default.
- No separate browser install was needed on this machine (smoke test, 2026-11-05).
- The server writes screenshots, snapshots and console logs only inside the project, to
  `.playwright-mcp/`. The plan skill moves that folder out after each run.
- In the VS Code extension `claude` is not on PATH. Use the bundled binary:
  `~/.vscode/extensions/anthropic.claude-code-<version>-win32-x64/resources/native-binary/claude.exe`.

On a web project, `/plan` asks after a passing verify whether to run the browser check. On yes
it starts the dev server, runs the `e2e` agent, then stops the server and checks the port is free.
