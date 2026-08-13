# claude-config

Versioned Claude Code global config: user `CLAUDE.md` + custom skills + custom subagents.

## Layout
- `CLAUDE.md` — global user instructions (behavioral guidelines).
- `skills/`   — custom skills (coding-standards, feature, feature-brainstorming, crew, autopilot, debugging, security-review, documentation, git-commit, audit-solution, self-improve, simple-language, fableize, drunken-genius).
- `agents/`   — custom subagents. Analysis (read-only): audit-scout, security-auditor, standards-reviewer, pm, tester. Executor (write, worktree): dev.
- `experiments/` — measurement runs over the rule corpus, one directory each. **Git-ignored**: local working data, not part of the config the harness loads, and outside every check script's corpus. See "Measuring a cut" below.

Per skill: `SKILL.md` is the always-loaded body. Addenda → `<skill>/reference/` (load on demand,
never at the skill root). Check scripts → `<skill>/scripts/`. Shared rule text → `skills/_shared/blocks.md`.

## Agents
Two classes (`analysis`, read-only · `executor`, writes in an isolated worktree), three constraints
that bind both — two from the harness, one this repo's own policy — and the `FRICTION:` reporting
channel. All documented beside the code they govern, in [agents/AGENTS.md](agents/AGENTS.md). Not
repeated here: one home per rule.

## Mechanical checks
Run them all after editing anything they cover. Each exits 1 on a violation, printing `file  rule  detail`.
A bad ROOT exits 2 in all six — a broken invocation, never a pass. An EMPTY corpus splits them, and the
split is deliberate: `check-frontmatter` and `check-size` exit 2, because their corpus IS this repo and
its absence means nothing was examined; `check-agents`, `check-features` and `check-docs` exit 0 with an
explicit "nothing to check" line, because another repo may legitimately have no `features/` and no
`AGENTS.md`. So read the COUNT each prints, not just the code — exit 0 over an empty corpus is not a pass.
```
node agents/scripts/check-agents.mjs
node skills/feature/scripts/check-features.mjs
node skills/documentation/scripts/check-docs.mjs
node scripts/check-pointers.mjs
node scripts/check-frontmatter.mjs
node scripts/check-size.mjs
```
`check-size` holds a word cap per rule file — its size when `20260804-0003` cut it, plus 15% headroom
— and ENFORCES a corpus total on top of them, printed on every run. A cap is editable, so it is not
a hard constraint on its own; the total is what stops raised caps from growing the corpus past the
ceiling, and exceeding it exits 1. A file with no cap and a cap with no
file are both violations, so the corpus cannot grow by adding files either. Files that are DATA this
config WRITES rather than rule prose it loads — the templates seeding `self-improve`'s findings log
and its archive — are excluded by NAME in `DATA_FILES`, one entry each, and an entry naming a missing
file is a violation too. The two gitignored files those templates seed sit in `RUNTIME_DATA_FILES`
instead: excluded the same way, but never stale-checked, because a fresh clone has neither until the
skill writes one. It counts runs of
non-whitespace, which disagrees with `wc -w` by ~3% on this corpus; regenerate caps with the script's
own counter, never with `wc`.
`check-frontmatter` is the other repo-wide one: every `skills/*/SKILL.md` and agent definition must
have frontmatter a YAML parser accepts, plus a non-empty `name` and `description`. It exists because
that failure is SILENT — an unquoted `description:` holding a colon-space is a nested mapping, the
block is dropped, the file still loads, and a skill with no description never matches
auto-delegation. It owns YAML validity for both areas; `check-agents` keeps agent semantics.
`check-pointers` is the repo-wide one: it resolves every `reference/` and skill-dir-script pointer in
live rule prose at exact on-disk case, and enforces the `design-` prefix on design addenda. Its corpus
is an ALLOWLIST (`skills/`, `agents/`, `CLAUDE.md`, `README.md`) — a new top-level directory joins it
only by being added to `CORPUS_DIRS`, never silently.

## Starting a feature
`skills/feature/scripts/new-feature.mjs` claims a feature-file id and prints the path it created.
```
node skills/feature/scripts/new-feature.mjs <slug> [--folder <state>] [--root <project>]
```
Not in the check list above — it produces, it does not check. Exit 0 = a file was claimed; exit 2 =
invalid invocation or no free id, with nothing left behind.

The id used to be derived by the model. Measured over 56 specs that produced a counter every time
(`0001`..`0010`) and never a clock time, because a model has no clock. This reads one, so `YYYYMMDD-HHMM`
finally means what it says. It CREATES the file empty with `wx`: that claim is atomic, so two sessions
in the same minute get different ids instead of colliding once both have written. `check-features`
reports an empty spec as `abandoned-claim` — fix in place, never the `no-frontmatter` STOP.

## Task-tick hooks
A feature's `# Tasks` checklist is not maintained by hand. Two hooks in `skills/feature/scripts/` keep it
in step with the harness todo list, and they are the counterpart to `check-features.mjs`, which only ever
sees a spec's FINAL state and so could never tell ticking-as-you-go from reconciling at the validation
gate.

**`tick-sync.mjs` — PostToolUse, `matcher: "TodoWrite"`.** It writes the checkbox. Every time the todo
list changes, each `in-progress/` spec has its boxes set to follow: a `completed` todo ticks its box,
anything else clears it. So the model moves the todo and the box follows in the same turn.

It never guesses, because a wrong tick reports work that never happened. A todo is matched to a task by
exact text after light normalisation; no match, an annotated line (`BLOCKED`, `NOT DONE`, a feature id),
or a task text living in two `in-progress/` specs at once, and the line is left alone. It writes
atomically, re-reads and compares before writing so a mid-turn edit by the model is never clobbered, and
records every write, skip and abandonment in `features/.tick-sync.log` (git-ignored with the rest of
`features/`).

**`tick-guard.mjs` — Stop hook.** One job left: block the turn while any `# Tasks` item has no todo. That
is the input side of the auto-tick — an unmirrored task is one whose box can never move on its own. It
blocks once per signature and then only advises, so it cannot wedge a session. It used to carry two
divergence checks as well; with the box now following the todo, the two lists cannot diverge, so they
were removed rather than kept as a silent self-test.

Both fail open on any internal error. Both live inside the skill, not in `scripts/`, because the feature
lifecycle travels through the `~/.claude/skills` junction and is used in other projects and worktrees.
Both find `features/` from the hook's own `cwd`, so one registration serves every checkout. They share
`_shared.mjs` with `check-features.mjs` — one definition of the annotation vocabulary, which used to be
duplicated with nothing enforcing the pair. [ADR 0006](docs/adr/0006-tick-guard-hook.md) has the
reasoning, including why `~/.claude/settings.json` is not symlinked into this repo.

**Registration is per machine and not versioned** — the same status as the junctions below. Without it
you keep the prose rule and lose the enforcement: you tick the boxes yourself. Degraded, not broken.

## Measuring a cut
Shortening a rule file used to be a guess: nobody could tell what a cut COST, so every cut stopped
at the first line that felt risky. `scripts/behaviour-suite.mjs` measures it instead.

The same scenario is put to three fresh models — NONE sees no text, CUT sees the shortened file,
FULL sees today's file — and the three results decide, per rule, whether its prose is load-bearing:
common knowledge (delete it), carried by the short form (keep the cut), load-bearing (restore it),
or actively misleading in short form (over-compressed).

```
node scripts/behaviour-suite.mjs <experiment-dir> --build --docs <dir>   # write the arm prompts
node scripts/behaviour-suite.mjs <experiment-dir> --score                # matrix + per-rule verdict
node scripts/behaviour-suite.mjs <experiment-dir> --coverage             # is the cut actually tested?
```
- **No model runs in the script.** Like `build-copilot`, it is deterministic text assembly and
  scoring, so a result can be re-derived and diffed. Dispatching the arms is the caller's job.
- **Nothing about a particular file is hardcoded** — target, frozen anchors and invariants come from
  the experiment's own `questions.md` frontmatter. The experiment directory is the argument.
- **`--build` hands the two text arms NEUTRAL copies** (`doc-a` / `doc-b`), so an answering model
  cannot tell the cut from the original, and the NONE arm gets no path at all.
- **`--score` is mechanical or it is nothing.** Answers take one of three forms — an exact command,
  a lettered choice, or yes/no plus a numbered reason. Anything else is reported UNSCORABLE and
  blocks the result; hand-scoring puts the expected answer back in front of the scorer's eyes.
- **`--coverage` guards the blind spots**: every changed hunk needs ≥2 questions citing lines inside
  it, every frozen section anchor must survive, and a numbered procedure another file cites by step
  NUMBER must keep its count. That last one catches a cut that merges two steps while every heading
  still matches and every other check stays green.

## GitHub Copilot export
Copilot reads the same `SKILL.md` format this repo writes, so a skill translates one for one.
```
node scripts/build-copilot.mjs .                  # build github_build/
node scripts/build-copilot.mjs . --install        # also install for this user
node scripts/build-copilot.mjs . --check          # re-derive and diff, write nothing
```
- **`github_build/`** — a portable `.github/` tree for a REPO: every skill at `.github/skills/<name>/`,
  the 6 subagents at `.github/agents/`, `CLAUDE.md` as `copilot-instructions.md`, the folder
  `AGENTS.md` docs at their mirrored positions. Git-ignored; build it when you want it.
- **`--install`** — the per-machine install, into `~/.copilot` (or `=<dir>`, which names the Copilot
  HOME). Writes skills, the 6 agents and `copilot-instructions.md` to the three locations Copilot
  documents. Never deletes, and names anything there it did not write. It refuses to replace an
  existing, differing `copilot-instructions.md` — that one is a FILE and may be yours; `--force`
  overrides. Installed text differs from the export on purpose: `blocks.md` is inlined and pointers
  are rewritten, because a Copilot home has no `.github/`.
- **`--check`** — answers "did my edit change the translation?". Not a gate: nothing is committed,
  so nothing goes stale.
- **Every source file is carried or explicitly excluded.** A file under `skills/`, `agents/` or
  `scripts/` that no rule mentions FAILS the build with `uncovered-source-file`, rather than being
  dropped in silence. Add a file there and you decide once, then, what happens to it.

Verify in VS Code with `/skills` in Copilot Chat, or the gear icon → Agent Customizations → Skills.

Decisions behind this: [0002](docs/adr/0002-commit-the-generated-copilot-build.md) →
[0003](docs/adr/0003-do-not-commit-the-generated-copilot-build.md) (why the build is not committed),
and [0004](docs/adr/0004-export-skills-as-copilot-agent-skills.md) (why skills are skills again, and
what the old split bought that this gives up).

## Decisions
Hard-to-reverse choices live in [docs/adr/](docs/adr/), superseded rather than edited:
- [0001](docs/adr/0001-tester-is-read-only-not-an-executor.md) — the tester is read-only, not an executor
- [0002](docs/adr/0002-commit-the-generated-copilot-build.md) — superseded by 0003
- [0003](docs/adr/0003-do-not-commit-the-generated-copilot-build.md) — the Copilot build is git-ignored
- [0004](docs/adr/0004-export-skills-as-copilot-agent-skills.md) — skills export as Copilot Agent Skills
- [0005](docs/adr/0005-merge-surface-skills-into-coding-standards.md) — the web and design skills become coding-standards addenda
- [0006](docs/adr/0006-tick-guard-hook.md) — hooks enforce the `# Tasks` tick cadence: a PostToolUse hook writes the box, a Stop hook guards the mirror; why they live in the skill and are registered user-level
- [0007](docs/adr/0007-install-the-whole-config-not-only-skills.md) — every source file is carried or explicitly excluded, and `--install` installs the whole config rather than only skills

## Wiring on this machine (Windows)
- `~/.claude/skills` → **junction** to `skills/` here.
- `~/.claude/agents` → **junction** to `agents/` here.
- `~/.claude/CLAUDE.md` → 1-line `@import` pointer to `CLAUDE.md` here.
- `~/.claude/settings.json` → holds the `Stop` registration for `tick-guard.mjs` and the `PostToolUse`
  one for `tick-sync.mjs`. A real file, NOT a symlink into this repo: a file symlink needs elevation on
  Windows (a junction does not, which is why the two above are junctions), and this repo is public, so
  versioning personal settings would publish every key added to them. ADR 0006 records both measurements.

## Restore on a new machine
```powershell
$repo = 'd:\Projects\claude-config'   # clone target
New-Item -ItemType Junction -Path "$HOME\.claude\skills" -Target "$repo\skills"
New-Item -ItemType Junction -Path "$HOME\.claude\agents" -Target "$repo\agents"
# BOM-free — a byte-order mark before @ breaks the @import
[IO.File]::WriteAllText("$HOME\.claude\CLAUDE.md", "@$($repo -replace '\\','/')/CLAUDE.md", (New-Object Text.UTF8Encoding $false))
```
First session shows a one-time external-import approval dialog — approve it.

Fourth step, by hand: merge this into `~/.claude/settings.json` to register BOTH task-tick hooks. Spell
the paths out in full — `%USERPROFILE%` is cmd syntax and will not expand under a POSIX shell, and
`$CLAUDE_PROJECT_DIR` points at whichever project is active, not at where the scripts live.
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
**Both entries, or neither.** `tick-sync.mjs` alone loses the guard that keeps every task mirrored, which
is what gives it something to tick. `tick-guard.mjs` alone leaves you blocked over a mirror whose only
purpose was to drive a hook that is not there.

Hook entries MERGE across user and project settings rather than replacing each other, so do not also
add them to a project `.claude/settings.json` — they would run twice per turn, and `tick-sync.mjs` writes.

## Related Modules
- [skills/](skills/AGENTS.md) — the skills: layout, what loads when, pointer style, naming
- [agents/](agents/AGENTS.md) — the subagents: two classes, three binding constraints, the FRICTION channel

Neither edge is counted by `check-docs.mjs` — it only builds edges between AGENTS.md files, and this
is a README. The child ends link back to each other, which is the pair the script does verify.

## Portability
This setup uses Windows junctions + `@import` to link the config into Claude Code's
expected location. On Mac/Linux, the equivalent is a symlink (`ln -s`) instead of a
junction — for both `skills/` and `agents/`, same `@import` structure otherwise. Not tested
on Mac/Linux; adjust the link steps if you ever set this up there.
