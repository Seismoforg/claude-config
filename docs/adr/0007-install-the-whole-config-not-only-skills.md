---
status: accepted
date: 2026-08-13
---

# Context
Two defects in `scripts/build-copilot.mjs`, found together because they are the same question asked
about the two things it produces — the repo export and the personal install.

**The export dropped files in silence.** It decided what travels by an allowlist per source kind:
`SKILL.md`, `reference/*.md`, `<skill>/scripts/*.mjs`, the agent definitions, root `CLAUDE.md`,
`blocks.md`. A file matching none of those was not carried, not reported, and not recorded in
`UNMAPPED.md` — which tracks unmapped FIELDS and has never tracked files. Counted at the time of this
change: 13 of 63 files under `skills/`, `agents/` and `scripts/` reached the export in no form.

Two of them mattered beyond tidiness. `self-improve/SKILL.md` tells the model to copy
`findings.template.md` when the live log is missing; neither template was exported, so that recovery
path named files the export did not contain. And both folder `AGENTS.md` docs were dropped — the
agents loop filtered them by name so they would not parse as agent definitions, which was correct,
and then discarded them entirely, which was not.

The build already held the right principle one level down. An unrecognised agent frontmatter key
FAILS the build, on the stated grounds that "a converter that silently ignores an unrecognised key
rots the first time someone adds one". That was never extended from keys to files.

**The personal install produced dead pointers.** `--install-skills` copied the emitted skill bytes
into `~/.copilot/skills/`. Those bytes name `.github/` paths, because the export is written for a
repo where `.github/` is the root that travels. No `.github/` exists in a Copilot home, so every
pointer in every personally-installed skill resolved to nothing. This had been true since the command
was added in [0004](0004-export-skills-as-copilot-agent-skills.md) and made the install decorative.

# Decision
**Coverage, not a longer allowlist.** After assembling its output the build compares every source file
it READ against everything present under ~~`skills/`, `agents/` and `scripts/`~~.
**Amended by 0009:** now `skills/`, `rules/` and `scripts/` (`scripts/build-copilot.mjs:124`'s
`COVERED_TREES`); `agents/` left with the agent export and `rules/` arrived in its place. A file in
neither set, and not in an explicit `SOURCE_EXCLUSIONS` table, is an `uncovered-source-file` violation
that fails the build and writes nothing. A file is COVERED when a rule decided it in either direction —
carried, or excluded with a reason.

**`--install-skills` becomes `--install`**, and stops being skills-only. It writes the three
locations Copilot documents under `~/.copilot`:

| Emitted | Installed to |
|---|---|
| `.github/skills/<name>/**` | `<home>/skills/<name>/**` |
| ~~`.github/agents/*.agent.md`~~ | ~~`<home>/agents/*.agent.md`~~ |
| `.github/copilot-instructions.md` | `<home>/copilot-instructions.md` |

**Amended by 0009:** the agent row above no longer happens. `agents/` was deleted and nothing exports
agent definitions to Copilot anymore; the install now writes only the skills and instructions rows.

An `=<dir>` argument now names the Copilot HOME rather than the skills folder, since three kinds need
a common parent.

**The install derives its own text.** ~~`blocks.md` is inlined into each skill that cites it, under an
appended `# SHARED RULE BLOCKS` heading.~~ **Amended by 0009:** `skills/_shared/blocks.md` was
dissolved; each block moved to the rule file that owns it (`rules/core.md`, `rules/asking.md`,
`rules/documentation.md`, `CLAUDE.md`). There is nothing left to inline. Skill and agent
cross-references are rewritten to the real
install paths. Script invocations are repointed at `<claude-config>/scripts/` — where they genuinely
live — and an appended note states they are not installed and what to do without them.

**`copilot-instructions.md` is never overwritten without `--force`.** It is the one destination that
is a FILE and may hold the user's own work. Without the flag the install writes everything else,
leaves that file alone, and reports the path.

# Rationale
A longer allowlist would have fixed the 13 files and left the mechanism that lost them. The coverage
check makes the next omission impossible rather than unlikely: adding a file to a source tree now
forces one decision, once, at the moment it is added, and the build states which file and why it
stopped.

Excluding rather than emitting is a first-class outcome because several files genuinely must not
travel — a one-line `@AGENTS.md` import, runtime data `.gitignore` already keeps out of the repo, the
converter itself. Making those silent again would have rebuilt the defect inside the fix.

Inlining `blocks.md` is not a new mechanism. The agent loop already inlines a preloaded skill's body
for the same reason: the target has no concept to point at. Scripts cannot be inlined, so they are
repointed and named as absent — deleting the pointer would be an invisible loss, which is the failure
this whole change exists to end.

Refusing to overwrite continues [0004](0004-export-skills-as-copilot-agent-skills.md)'s promise that
the install writes only what it emits and never deletes. Overwrite-with-backup was considered and
rejected: a second run overwrites the first backup, so the protection lasts exactly one pass.

# Consequences
- **Adding a file under `skills/`, `agents/` or `scripts/` now fails the build until it is
  classified.** That is the point, and it is a real cost — a scratch file blocks a rebuild. The
  `SOURCE_EXCLUSIONS` header states the intended response: delete or move a stray file, do not
  exclude it. A row is a decision, not a parking space.
- **`docs/` and root `README.md` are outside the walked trees.** A file added there is still missed
  exactly as before. The defect is bounded, not eliminated repo-wide.
- **The two `findings*.md` exclusion rows cite `.gitignore` rather than restating it.** Un-ignoring
  those files would leave the build still excluding them, so the rows point at the rule instead of
  copying it.
- **The install now writes to two locations it never touched**, one of them a single file at the
  Copilot home root. `--force` exists precisely because that file can be the user's.
  **Amended by 0009:** one of those two was the agents directory, which is no longer written. What
  remains is the single file, and `--force` still guards exactly it.
- ~~**Installed skills are longer than exported ones.** Inlining the shared blocks grew all 14 skills;
  the largest went 326 → 450 lines. Nothing here can measure whether Copilot honours a file of a given
  length, so no threshold is asserted — `--install` prints the growth and a human judges it. Same
  honesty as the agent-size table in `UNMAPPED.md`, and the same limitation.~~
  **Amended by 0009:** `blocks.md` was dissolved into the rule files that own each block (`rules/core.md`,
  `rules/asking.md`, `rules/documentation.md`, `CLAUDE.md`); nothing is inlined into a skill body
  anymore, so this bullet's growth no longer occurs. The skills that remain are `feature`,
  `git-commit` and `self-improve`.
- **`--check` still compares `github_build/` only.** The install variant is derived at install time
  and never committed, so both remain deterministic functions of the same sources.
- ~~**`build-copilot.mjs` is 639 lines**, inside `coding-standards`' 700 soft cap but past its 300–500
  target~~, and it now holds two jobs: translate sources into an export, and install an export into a
  home. The seam is clean — the installer consumes the emitted `files` map and reads no source.
  **Amended by 0009:** `coding-standards` is deleted; the file-size rule it carried now lives in
  `rules/core.md` FILE SIZE. The line count above is stale and is not restated with a new number here,
  to avoid the same drift repeating. The extraction to `scripts/install-copilot.mjs` was deliberately
  NOT done here, to avoid moving a module boundary over freshly verified code; the next change touching
  the installer should do it, and will need a `SOURCE_EXCLUSIONS` row for the new file.
  **Amended 20260903 (no ADR — the extraction still has not happened):** the promise above remains
  unkept. It is not filed as a feature here — CLAUDE.md §7 treats debt this pass did not create as
  something to mention, not something to file — so it still lives only in this bullet, unread.
