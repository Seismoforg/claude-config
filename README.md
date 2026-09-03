# claude-config

Versioned Claude Code global config: user `CLAUDE.md` + a pulled `rules/` tree + three workflow
skills + four subagent tiers a feature wave dispatches to.

## Layout
- `CLAUDE.md` — global user instructions. Style, work discipline, the **routing table** that says
  which rule file to read for which kind of change, and the three skills.
- `rules/`    — the rule files. Plain markdown, no frontmatter, **nothing loads automatically**. A
  rule reaches a model only because the routing table sent it there. See
  [rules/AGENTS.md](rules/AGENTS.md).
- `skills/`   — the three workflow skills: `feature`, `git-commit`, `self-improve`. A skill is a
  LIFECYCLE — gates, state, a wait for the user. See [skills/AGENTS.md](skills/AGENTS.md).
- `agents/`   — the four subagent tiers, one per model, that a `feature` wave dispatches its tasks
  to. Discovered by existing, not pulled. See [agents/AGENTS.md](agents/AGENTS.md).
- `docs/adr/` — hard-to-reverse decisions, superseded rather than edited.
- `scripts/`  — checks whose corpus IS this repo, plus the Copilot export.

**Rules or skills?** A rule says HOW something is written and is pulled. A skill is a workflow with
gates. New material with no gates in it is a rule file, never a fourth skill.

Per skill: `SKILL.md` is the always-loaded body. Addenda → `<skill>/reference/` (load on demand,
never at the skill root). Scripts → `<skill>/scripts/`.

## Mechanical checks
Run each after editing anything it covers. Each exits 1 on a violation: the three repo checks print
`file  rule  detail`, `preflight` prints `file:line:col  rule (§)  detail`. A bad ROOT exits 2 — a
broken invocation, never a pass.

```
node scripts/check-frontmatter.mjs
node skills/feature/scripts/check-features.mjs
node rules/scripts/check-adr.mjs
node rules/scripts/preflight.mjs <changed files or dir>
```

An EMPTY corpus splits them, and the split is deliberate. `check-frontmatter` exits 2, because its
corpus IS this repo and its absence means nothing was examined. `check-features` and `check-adr` exit
0 with an explicit "nothing to check" line, because another repo may legitimately have no `features/`
and no `docs/adr/`. So read the COUNT each prints, not just the exit code — exit 0 over an empty
corpus is not a pass.

- **`check-frontmatter`** — every `skills/*/SKILL.md` must have frontmatter a YAML parser accepts,
  plus a non-empty `name` and `description`, `name` matching the folder. It exists because that
  failure is SILENT: an unquoted `description:` holding a colon-space is a nested mapping, the block
  is dropped, the file still loads, and a skill with no description never matches auto-delegation.
- **`check-features`** — folder↔status agreement, filename shape, task-list currency. The `feature`
  skill's MECHANICAL CHECK section owns what each violation means.
- **`check-adr`** — an ADR marked `status: superseded` must name another EXISTING ADR in its first 10
  body lines, and `status:` must be one of the three `rules/documentation.md` allows. It proves the
  pointer exists and resolves, never that the ADR named is the one that actually replaced this
  decision. That is semantic and unenforceable.
- **`preflight`** — the mechanical subset of `rules/design.md` §14: em-dash, eyebrow count, scroll
  listener, banned fonts and palettes, AI-tell strings. **Exit 2 = the run was INVALID and checked
  nothing** (no target, unreadable path, zero matching files). A 2 is never a pass.

`check-adr` and `preflight` live under `rules/scripts/` rather than `scripts/` because they travel
with the rule that invokes them, through the `~/.claude/rules` junction, and are meant to run in
other projects.

## Starting a feature
`skills/feature/scripts/new-feature.mjs` claims a feature-file id and prints the path it created.
```
node skills/feature/scripts/new-feature.mjs <slug> [--folder <state>] [--root <project>]
```
Not in the check list above — it produces, it does not check. Exit 0 = a file was claimed; exit 2 =
invalid invocation or no free id, with nothing left behind.

The id used to be derived by the model. Measured over 56 specs, that produced a counter every time
(`0001`..`0010`) and never a clock time, because a model has no clock. This reads one, so
`YYYYMMDD-HHMM` finally means what it says. It CREATES the file empty with `wx`: that claim is
atomic, so two sessions in the same minute get different ids instead of colliding once both have
written. `check-features` reports an empty spec as `abandoned-claim` — fix it in place, never treat
it as the `no-frontmatter` STOP.

## Task-tick hooks
A feature's `# Tasks` checklist is not maintained by hand. Two hooks in `skills/feature/scripts/` keep
it in step with the harness todo list. They are the counterpart to `check-features.mjs`, which only
ever sees a spec's FINAL state and so could never tell ticking-as-you-go from reconciling at the
validation gate.

**`tick-sync.mjs` — PostToolUse, `matcher: "TodoWrite"`.** It writes the checkbox. Every time the todo
list changes, each `in-progress/` spec has its boxes set to follow: a `completed` todo ticks its box,
anything else clears it. So the model moves the todo and the box follows in the same turn.

It never guesses, because a wrong tick reports work that never happened. A todo is matched to a task
by exact text after light normalisation; no match, an annotated line (`BLOCKED`, `NOT DONE`, a feature
id), or a task text living in two `in-progress/` specs at once, and the line is left alone. It writes
atomically, re-reads and compares before writing so a mid-turn edit by the model is never clobbered,
and records every write, skip and abandonment in `features/.tick-sync.log`.

**`tick-guard.mjs` — Stop hook.** One job: block the turn while any `# Tasks` item has no todo. That
is the input side of the auto-tick — an unmirrored task is one whose box can never move on its own.
It blocks once per signature and then only advises, so it cannot wedge a session.

Both fail open on any internal error. Both live inside the skill, not in `scripts/`, because the
feature lifecycle travels through the `~/.claude/skills` junction and is used in other projects and
worktrees. Both find `features/` from the hook's own `cwd`, so one registration serves every checkout.
They share `_shared.mjs` with `check-features.mjs` — one definition of the annotation vocabulary.
[ADR 0006](docs/adr/0006-tick-guard-hook.md) has the reasoning, including why `~/.claude/settings.json`
is not symlinked into this repo.

**Registration is per machine and not versioned** — the same status as the junctions below. Without it
you keep the prose rule and lose the enforcement: you tick the boxes yourself. Degraded, not broken.

## Dispatching a wave
`feature` step 4 cuts a spec's tasks into waves: which can be written at the same time, which have to
wait. Step 6 then builds one wave by rating every task in it against
[rules/dispatch-tiers.md](rules/dispatch-tiers.md) and sending it to the matching agent in `agents/`,
at most 8 at once. Rating is an ordered gate procedure, not a table, and lands each task on `sonnet`,
`opus` or `fable`. Dispatch is the presumption: building a task inline needs a reason, either the
fixed list of files the dispatch itself runs under, or a judged exception written onto the spec's
`# Waves` line. A wave that took no inline task says so in the literal phrase `no inline taken`.

Each brief carries the worker's write paths as the only paths it may write. Several workers edit one
working tree at once, and that boundary is the only thing keeping them off each other's files, so it
is the dispatcher's job to name it. Recon carries no such boundary, having nothing to write. The
method every agent reads first is [rules/agent-worker.md](rules/agent-worker.md) — one copy, so four
agent files cannot drift apart; it says at the top which of its rules a read-only worker skips.

**A quick fix, a question, a bug hunt outside a feature run is still not rated** — ADR 0012 records
that gap. `haiku-agent` is the one exception: it holds no `Write` or `Edit`, is not rated by the
procedure at all, and the main loop fires it for a read-only lookup, inside or outside a feature run.

## GitHub Copilot export
Copilot reads the same `SKILL.md` format this repo writes, so a skill translates one for one. The
rules tree travels as plain markdown at a stable path, with every pointer rewritten.
```
node scripts/build-copilot.mjs .                  # build github_build/
node scripts/build-copilot.mjs . --install        # also install for this user
node scripts/build-copilot.mjs . --check          # re-derive and diff, write nothing
```
- **`github_build/`** — a portable `.github/` tree for a REPO: every skill at
  `.github/skills/<name>/`, the rules at `.github/rules/`, `CLAUDE.md` as `copilot-instructions.md`,
  the folder `AGENTS.md` docs at their mirrored positions. Git-ignored; build it when you want it.
- **`--install`** — the per-machine install, into `~/.copilot` (or `=<dir>`, which names the Copilot
  HOME). Writes the skills and `copilot-instructions.md` to the two locations Copilot documents.
  Never deletes, and names anything there it did not write. It refuses to replace an existing,
  differing `copilot-instructions.md` — that one is a FILE and may be yours; `--force` overrides.
  The rules tree and the scripts are NOT installed: Copilot documents no personal location for them,
  so their pointers are repointed at this repo and the install says so.
- **`--check`** — answers "did my edit change the translation?". Not a gate: nothing is committed, so
  nothing goes stale.
- **Every source file is carried or explicitly excluded.** A file under `skills/`, `rules/` or
  `scripts/` that no rule mentions FAILS the build with `uncovered-source-file`, rather than being
  dropped in silence.

Verify in VS Code with `/skills` in Copilot Chat, or the gear icon → Agent Customizations → Skills.

Decisions behind this: [0002](docs/adr/0002-commit-the-generated-copilot-build.md) →
[0003](docs/adr/0003-do-not-commit-the-generated-copilot-build.md) (why the build is not committed),
and [0004](docs/adr/0004-export-skills-as-copilot-agent-skills.md) (why skills are skills again).

## Decisions
Hard-to-reverse choices live in [docs/adr/](docs/adr/), superseded rather than edited:
- [0001](docs/adr/0001-tester-is-read-only-not-an-executor.md) — superseded by 0009
- [0002](docs/adr/0002-commit-the-generated-copilot-build.md) — superseded by 0003
- [0003](docs/adr/0003-do-not-commit-the-generated-copilot-build.md) — the Copilot build is git-ignored
- [0004](docs/adr/0004-export-skills-as-copilot-agent-skills.md) — skills export as Copilot Agent Skills
- [0005](docs/adr/0005-merge-surface-skills-into-coding-standards.md) — superseded by 0009
- [0006](docs/adr/0006-tick-guard-hook.md) — hooks enforce the `# Tasks` tick cadence
- [0007](docs/adr/0007-install-the-whole-config-not-only-skills.md) — every source file is carried or explicitly excluded
- [0008](docs/adr/0008-dissolve-crew-into-feature-dispatch.md) — superseded by 0009
- [0009](docs/adr/0009-rules-tree-replaces-most-skills.md) — coding rules become a pulled `rules/` tree; three skills remain; the subagent roster is removed
- [0010](docs/adr/0010-a-build-step-enters-a-dependency-free-repo.md) — superseded by 0012
- [0011](docs/adr/0011-waves-replace-milestones-and-feature-fans-out.md) — a spec's tasks are cut into waves, and a wave dispatches one agent per task
- [0012](docs/adr/0012-remove-the-doorman-waves-dispatch-directly.md) — the doorman is removed; the wave build dispatches the tier agents directly
- [0013](docs/adr/0013-dispatch-presumption-inverts-and-haiku-becomes-recon.md) — dispatch becomes the presumption, inline an earned exception, and `haiku-agent` becomes read-only recon

## Wiring on this machine (Windows)
- `~/.claude/skills` → **junction** to `skills/` here.
- `~/.claude/rules`  → **junction** to `rules/` here.
- `~/.claude/agents` → **junction** to `agents/` here. Without it Claude Code finds no `haiku-agent`,
  `sonnet-agent`, `opus-agent` or `fable-agent`: a `feature` wave has nothing to dispatch to, and the
  main loop has no recon worker for a read-only lookup.
- `~/.claude/CLAUDE.md` → 1-line `@import` pointer to `CLAUDE.md` here.
- `~/.claude/settings.json` → holds the `Stop` registration for `tick-guard.mjs` and the `PostToolUse`
  one for `tick-sync.mjs`. A real file, NOT a symlink into this repo: a file symlink needs elevation
  on Windows (a junction does not, which is why the two above are junctions), and this repo is public,
  so versioning personal settings would publish every key added to them. ADR 0006 records both
  measurements.

## Restore on a new machine
```powershell
$repo = 'd:\Projects\claude-config'   # clone target
New-Item -ItemType Junction -Path "$HOME\.claude\skills" -Target "$repo\skills"
New-Item -ItemType Junction -Path "$HOME\.claude\rules"  -Target "$repo\rules"
New-Item -ItemType Junction -Path "$HOME\.claude\agents" -Target "$repo\agents"
# BOM-free — a byte-order mark before @ breaks the @import
[IO.File]::WriteAllText("$HOME\.claude\CLAUDE.md", "@$($repo -replace '\\','/')/CLAUDE.md", (New-Object Text.UTF8Encoding $false))
```
First session shows a one-time external-import approval dialog — approve it.

Fourth step, by hand: merge this into `~/.claude/settings.json` to register BOTH task-tick hooks.
Spell the paths out in full — `%USERPROFILE%` is cmd syntax and will not expand under a POSIX shell,
and `$CLAUDE_PROJECT_DIR` points at whichever project is active, not at where the scripts live.
```json
{
  "hooks": {
    "Stop": [
      { "hooks": [ { "type": "command",
        "command": "node \"C:/Users/<you>/.claude/skills/feature/scripts/tick-guard.mjs\"" } ] }
    ],
    "PostToolUse": [
      { "matcher": "TodoWrite",
        "hooks": [ { "type": "command",
          "command": "node \"C:/Users/<you>/.claude/skills/feature/scripts/tick-sync.mjs\"" } ] }
    ]
  }
}
```
**Both entries, or neither.** `tick-sync.mjs` alone loses the guard that keeps every task mirrored,
which is what gives it something to tick. `tick-guard.mjs` alone leaves you blocked over a mirror
whose only purpose was to drive a hook that is not there.

Hook entries MERGE across user and project settings rather than replacing each other, so do not also
add them to a project `.claude/settings.json` — they would run twice per turn, and `tick-sync.mjs`
writes.

## Related Modules
- [rules/](rules/AGENTS.md) — the rule files: what each covers, pointer style, why the scripts sit there
- [skills/](skills/AGENTS.md) — the three skills: layout, what loads when, the skill-dir placeholder

## Portability
This setup uses Windows junctions + `@import` to link the config into Claude Code's expected location.
On Mac/Linux the equivalent is a symlink (`ln -s`) instead of a junction — for `skills/`, `rules/`
and `agents/`, same `@import` structure otherwise. Not tested on Mac/Linux; adjust the link steps if
you ever set this up there.
