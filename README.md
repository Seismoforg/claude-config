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
Two classes (`analysis`, read-only · `executor`, writes in an isolated worktree), three harness
constraints that bind both, and the `FRICTION:` reporting channel — all documented beside the code
they govern, in [agents/AGENTS.md](agents/AGENTS.md). Not repeated here: one home per rule.

## Mechanical checks
Run them all after editing anything they cover. Each exits 1 on a violation, printing `file  rule  detail`.
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
file are both violations, so the corpus cannot grow by adding files either. It counts runs of
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
node scripts/build-copilot.mjs . --install-skills # also install them for this user
node scripts/build-copilot.mjs . --check          # re-derive and diff, write nothing
```
- **`github_build/`** — a portable `.github/` tree for a REPO: every skill at `.github/skills/<name>/`,
  the 6 subagents at `.github/agents/`, `CLAUDE.md` as `copilot-instructions.md`. Git-ignored; build
  it when you want it.
- **`--install-skills`** — the per-machine install, into `~/.copilot/skills` (or `=<dir>`). Writes
  only the skill folders it emits, never deletes, and names anything there it did not write.
- **`--check`** — answers "did my edit change the translation?". Not a gate: nothing is committed,
  so nothing goes stale.

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

## Related Modules
- [skills/](skills/AGENTS.md) — the skills: layout, what loads when, pointer style, naming
- [agents/](agents/AGENTS.md) — the subagents: two classes, three harness constraints, the FRICTION channel

Neither edge is counted by `check-docs.mjs` — it only builds edges between AGENTS.md files, and this
is a README. The child ends link back to each other, which is the pair the script does verify.

## Portability
This setup uses Windows junctions + `@import` to link the config into Claude Code's
expected location. On Mac/Linux, the equivalent is a symlink (`ln -s`) instead of a
junction — for both `skills/` and `agents/`, same `@import` structure otherwise. Not tested
on Mac/Linux; adjust the link steps if you ever set this up there.
