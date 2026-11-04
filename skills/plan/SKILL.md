---
name: plan
description: Plan a change with the user through multiple-choice questions, store it in docs/plans/, then build it with parallel subagents, verify it and close it via the commit skill. Use when the user wants to plan, build or resume a feature, or runs /plan.
---

# PLAN

You are the orchestrator. You run in the main session: only you can ask the user and spawn
subagents. Workers and the verifier never ask anything.

## Invocation
- `/plan` → new plan: Setup, then Interview.
- `/plan <name>` → find that plan in `docs/plans/` and continue from its folder's phase.
- `/plan block <name>` → Block.

## Folders and files
The folder IS the status. Never write a status field into the plan.

```
docs/plans/draft/      planned, not started
docs/plans/progress/   being built
docs/plans/testing/    being verified
docs/plans/done/       merged to main
docs/plans/blocked/    stopped by the user (created on first use)
```

Filename: `YYYY-MM-DD-<slug>.md`. Date = today from context. Slug = short English kebab-case title.
Plans are git-ignored: move them with plain `mv`, never `git mv`.

## 1. Setup — first run in a project only
- No git repo → ask whether to run `git init -b main`. No → stop.
- Create `draft/`, `progress/`, `testing/`, `done/` under `docs/plans/`.
- Add `docs/plans/` to `.gitignore` (create the file if missing). Skip if already listed.

## 2. Interview
1. Read the relevant code first. Wide search → spawn a `worker` with `model: haiku`, read-only brief.
2. Ask only what the code cannot answer. `AskUserQuestion`, max 4 questions per round, each option
   says what happens and what it costs. Recommended option first.
3. Repeat until these are clear: goal, out of scope, acceptance criteria, every task with its files.
4. Write the plan from `template.md`. Record every answer under `## Decisions`.
5. Show the plan. Ask: approve / change. Approved → save to `draft/`.
6. Ask: start now / later. Later → stop here.

## 3. Start
1. Working tree dirty → ask how to proceed (stash / commit first / stop). Never discard changes.
2. `git switch -c feature/<slug> main`.
3. Move the plan to `progress/`. Add a `## Log` line.

## 4. Build
Assign each task a model, by this rule:
- `opus` — the task decides something (architecture, interface, auth, data model) or its steps
  are not clear up front.
- `sonnet` — the plan already says exactly what to build.
- `haiku` — search, read, write docs.

Group tasks into waves. Tasks in one wave share no file and do not depend on each other.
Spawn one `worker` per task of a wave, all in one message, each with its `model`. The brief holds:
- the task, and nothing else
- the absolute path of the plan file (plans are git-ignored)
- the files it may write — the only ones
- the rule files by absolute path: `rules/core.md` always, plus the stack files per `CLAUDE.md`
- any approved run over ~30s it may start; none listed → it starts none

After each wave: tick the tasks in the plan, add a `## Log` line, tell the user in one line what
finished and what runs next. Stop and ask only on a blocked task or a failed worker.

A worker reports a knowingly weaker solution than planned → write it as a new plan in `draft/`.

## 5. Verify
1. Move the plan to `testing/`.
2. Find the project's test and build commands. Any run over ~30s → ask the user first.
3. Spawn `verify` with the plan path, the base branch `main` and the approved commands.
4. Write its report under `## Verification`.
5. Gaps → add them as new tasks, move the plan back to `progress/`, go to Build.
   Second failed verify in a row → stop and ask the user (fix / block / accept).

### Playwright check — only after a verify with no gaps
1. Detect: the diff against `main` (tracked + untracked) touches `.html .css .scss .js .jsx .ts .tsx
   .vue .svelte` outside test folders, AND `package.json` has a `dev` or `start` script.
   Otherwise go to Close.
2. `AskUserQuestion` in the user's language, e.g. "Möchtest du per Playwright testen?". The option
   names the exact command it will run (e.g. `npm run dev`). This yes approves that run. No → Close.
3. Start the dev server in the background. Read its output for the local URL; wait until it answers.
4. Spawn `e2e` with the plan path, the URL and the changed frontend files.
5. Move `.playwright-mcp/` from the project root to the scratchpad (the MCP server writes only
   inside the project). Write the report under `## Playwright` with the moved screenshot paths.
6. Always afterwards: kill the dev server's process tree, check the port is free.
7. GAPS → add them as new tasks, move the plan back to `progress/`, go to Build. This counts toward
   the "second failed verify in a row" rule. No gaps → Close.
8. Server does not start, or the `mcp__playwright__*` tools are missing → report to the user and
   ask (fix / skip to Close).

## 6. Close
1. Invoke the `commit` skill for branch `feature/<slug>`.
2. Merged to `main` → move the plan to `done/`, add a `## Log` line (note if not pushed).
   Not merged → the plan stays in `testing/`. Say so.

## Block
Ask for the reason (multiple choice plus Other). Create `blocked/` if missing. Move the plan
there and add the reason to `## Log`. The feature branch stays; say that it exists.
