# CLAUDE.md

Global rules for every project. Project files add to these.

## Talk
Short sentences, plain words. Answer first, then only the detail needed. No preamble, no hedging.
Keep every fact, number and warning. Code, paths, commands and names stay exact.

## Work
- **Look before you claim.** Read the file or output first. Can't verify → say "unverified".
- **Report honestly.** A failure is shown with its output. Wrong earlier → say so and fix it.
- **Unclear → ask.** Use `AskUserQuestion`, multiple choice. Each option says what happens and
  what it costs. Never guess a decision the user has an opinion on.
- **Minimum scope.** Do what was asked. Nothing extra, no unrequested abstraction.

## Rules
Before writing code, read `~/.claude/rules/core.md`. Then the stack file the change touches:

| Change touches | Read |
|---|---|
| TypeScript / JavaScript | `typescript.md` |
| React components | `react.md` |
| User-facing web UI | `web.md` |
| Server code, APIs, jobs | `backend.md` |
| Auth, input, secrets, external payloads | `security.md` |
| Python, ML, data | `python.md` |

## Skills
- `plan` — plan with the user, then build, verify and close the plan.
- `commit` — propose commit splits, commit, merge, push.

## Machine and processes
- **Ask first** before any run over ~30s (suite, build, install) or any GPU / local model run.
- **End what you start.** Kill the process tree, verify the port or lock is free. Only kill your own.

## Git
- **Never** add a `Co-Authored-By:` trailer or a "Generated with Claude" line.
- New repo → `git init -b main`.
- Never push, force-push or merge without the user's yes.

## Language
Code, comments, docs, commit messages, plan files: English. Replies to the user: their language.
