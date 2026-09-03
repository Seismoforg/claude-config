---
status: accepted
date: 2026-08-07
---

# Context
`feature`'s `# Tasks` is specified as a live work-list: tick a box the moment its task lands. The rule
is written at four sites — `skills/feature/SKILL.md:184`, `skills/crew/SKILL.md:112`,
`skills/autopilot/SKILL.md:125`, and a pointer at `skills/audit-solution/SKILL.md:69`. It does not
hold at any of them. Boxes get ticked in one reconciling pass at the step-6 validation gate, which is
the moment the model re-reads the file anyway.

`coding-standards` CORE PRINCIPLES names the shape: "one invariant needing three or more restatements
means the mechanic is wrong, not the wording."

Feature `20260731-0004-tasks-stay-current` already tried. It delivered the END-STATE half — the
`tasks-not-current` violation in `check-features.mjs` — and stated at its own approval gate that the
CADENCE half was unenforceable, because `features/` is git-ignored: no history, nothing to diff, and
a check that only ever sees the final state cannot distinguish ticking-as-you-go from reconciling at
the end. Its `# Validation` records that its own boxes were ticked in one pass at the end, within the
hour. Its premortem named the successor and declined to build it: "A live mirror of `# Tasks` into the
harness todo list would make cadence visible, but that is a different feature."

Two facts, both established by measurement rather than assumption, make that successor buildable:
- A Stop hook receives `transcript_path`, and `{"decision":"block","reason":…}` "Prevents Claude from
  stopping, continues the conversation" (https://code.claude.com/docs/en/hooks). So a live artifact
  IS reachable, even though the git history is not.
- `TodoWrite` had never been called in this repo — 0 occurrences across 12 transcripts, 6635 JSONL
  lines, 1584 tool_use blocks. The mirror was not a habit that slips; it had never existed once.

**Amended 20260807 (no ADR — the Stop hook could not see the cadence failure it was built for, so a
PostToolUse hook now WRITES the box and this hook shrinks to one condition):** everything above still
stands as the reason the mechanism exists and as the record of what the first attempt was. What follows
replaces its mechanism, not its motivation.

The Stop hook shipped and did not solve the problem it was built for. Measured
by running `tick-guard.mjs` directly against a synthetic spec and transcript: mirror seeded with every
todo `pending` and every box bare → silent, exit 0. Everything flipped at once at the step-6 reconcile →
silent, exit 0. Only "no mirror" and "todo completed over a bare box" blocked.

All three conditions were DIVERGENCE checks, and the failure being fixed is not a divergence. Both lists
frozen until the end and then flipped together is perfectly consistent, so it is green. The hook could
enforce that a mirror exists and that the lists do not drift; it could not enforce cadence, because its
only evidence for "work landed" was a `completed` status the model writes itself, at a moment it chooses
— one unreliable self-report checked against a second.

The mechanism was reached for without asking the prior question: why is the box drawn by hand at all?
`PostToolUse` exists, its `matcher` filters on tool name, and a hook may write files. Measured against a
probe registered at `~/.claude/settings.json`: a `TodoWrite` call delivers the full list as
`tool_input.todos`, `agent_id`/`agent_type` are `undefined` from the main loop, and the registration takes
effect immediately without a session restart. So the box can simply FOLLOW the todo, and there is no
cadence rule left to enforce.

# Decision
`# Tasks` is mirrored into the harness todo list. A PostToolUse hook WRITES the box to follow its todo,
and a Stop hook blocks the turn while any task is missing from the mirror.

**`tick-sync.mjs` — PostToolUse, `matcher: "TodoWrite"`.** Sets every `in-progress/` spec's boxes from the
todo list, both directions: `completed` ticks, anything else clears. It never guesses — no matching todo,
an annotated line, or a task text present in two `in-progress/` specs, and the line is untouched. It
re-reads and compares byte-for-byte before writing, so a mid-turn edit by the model is never clobbered;
it writes atomically via temp-file rename; and it logs every write, ambiguity skip and abandonment to
`features/.tick-sync.log`.

**`tick-guard.mjs` shrinks to one condition:** a `# Tasks` item with no todo. That is the input side of
the auto-tick — an unmirrored task is one whose box can never move. The two divergence conditions were
REMOVED rather than kept: with the box following the todo they cannot fire except when `tick-sync.mjs`
itself is broken, and a silent self-test of another component is not a guard.

**`ANNOTATED`, `tasksOf` and `norm` move to `_shared.mjs`.** `ANNOTATED` is imported by all three scripts;
`tasksOf` and `norm` by the two hooks only, since `check-features.mjs` has no normaliser and its
`tasksNotCurrent` returns violation strings rather than task items.

The original decision below stands as written except where this amendment names otherwise.

- **Script:** `skills/feature/scripts/tick-guard.mjs`, beside `check-features.mjs` — inside the skill,
  not in the repo root `scripts/`.
- **Registration:** `~/.claude/settings.json`, by absolute path through the `~/.claude/skills`
  junction. NOT this repo's `.claude/settings.json`.
- **Scope resolution:** the script locates `features/in-progress/` from the hook's `cwd`, never from
  its own location.
- **Three block conditions**, all the same comparison read in different directions: a task line with
  no matching todo; a `completed` todo whose box is still bare; a ticked box whose todo is still
  `pending`.
- **Fail open.** Any internal error — unreadable transcript, malformed JSONL, missing spec — exits 0
  silently.
- **Block once per signature**, then fall through to `hookSpecificOutput.additionalContext`.

Personal settings are NOT brought under version control, and `~/.claude/settings.json` is NOT
symlinked into the repo. That was explicitly requested and is explicitly rejected; see Rationale.

# Rationale
**The script lives in the skill because the skill travels.** `skills/AGENTS.md` File Structure already
assigns `<name>/scripts/*.mjs` to "that skill's mechanical checks", and `check-features.mjs` is there.
Root `scripts/` holds repo-wide checks over THIS repo's own corpus — `check-size`, `check-pointers`,
`check-frontmatter` — none of which mean anything outside it. The feature lifecycle is used in other
projects and other worktrees, reached through the `~/.claude/skills` junction. A guard for it that
lived in the repo root would be unreachable from everywhere the thing it guards is used.

**Amended by 0009:** `check-size` and `check-pointers` no longer exist. `check-frontmatter` is the
only one of the three still in root `scripts/`; the reasoning above still holds for it.

**Registration is user-level because that is the only level with the required reach.** Project-level
`.claude/settings.json` is the committable, shareable location and was the first choice for exactly
that reason. It is blind in every other project. Hooks MERGE across levels rather than replacing, so
registering at both would fire the hook twice per turn and need dedupe logic that exists only to undo
a decision made wrongly. One level, chosen for reach.

The cost is that the registration is not versioned. This is accepted rather than solved: it is the
same status the three junctions in README's "Restore on a new machine" already have, and it gains a
fourth step there. A machine that skips it loses the hook and keeps the prose rule — degraded, not
broken.

**The symlink was rejected on two independent findings.** The request was to move
`~/.claude/settings.json` into the repo and symlink it back, so the settings would be versioned.

1. `New-Item -ItemType SymbolicLink` fails without elevation — measured, it returned "Für diesen
   Vorgang sind Administratorrechte erforderlich" with the session not admin and
   `AppModelUnlock\AllowDevelopmentWithoutDevLicense` unset. A hard link avoids elevation but cannot
   cross volumes (`C:` → `D:`). This is why README uses directory junctions for `skills/`/`agents/`
   and an `@import` line for `CLAUDE.md`: neither needs admin. On its own this would only have made
   the symlink a documented user step.
2. The repository is public. Versioning `~/.claude/settings.json` publishes every key added to it from
   then on — `env`, `apiKeyHelper`, anything a future session puts there. The hazard is standing, not
   one-time, and it is invisible at the moment the mistake is made.

The hook never needed it. Three lines in the file as it already stands are enough.

**The scripts stopped being standalone, and that reverses a decision recorded above.** They were separate
copies so each stayed reachable through the `~/.claude/skills` junction and at its real path, and through
`build-copilot.mjs`, which copies a skill's `scripts/*.mjs` FLAT into `.github/scripts/`. A sibling import
survives all three — the flattening puts `_shared.mjs` in the same directory as its importers, and a
relative import is transparent through a junction. So the copies bought reachability that was never at
risk, while costing exactly what Consequences below predicted: nothing enforced that they agreed. Adding a
THIRD copy for `tick-sync.mjs` would have made a known hazard worse, so the property was traded. This
paragraph exists because deleting a rationale from the code without recording where it went is how it gets
re-derived wrongly later.

**Untick is symmetric, and that fights the old habit on purpose.** A box ticked by hand while its todo
still reads `pending` is cleared on the next `TodoWrite`. Under this decision the todo list is
authoritative for tick STATE — what the tasks ARE stays the spec's business — so one-way ticking would let
a spec permanently claim more than the todo list does, with no way to notice. The cost is real: for as
long as the hand-ticking habit survives, specs will visibly oscillate. That is why every clearing is
logged and why `feature` step 5 now states outright that the box is not yours to draw.

**Amended 20260903 (no ADR — a step was inserted ahead of it in the wave cut):** every `feature`
step 5 named below, here and in Consequences, is now step 6. The content is unchanged; only its
number moved.

**Fail open, against this repo's usual grain.** Every check script here treats "a clean exit that
examined nothing" as a defect. The hook inverts that deliberately: a false negative is a missed
reminder, a false positive is a session that cannot end its turn. The cost is asymmetric, so the
default is.

**Three conditions rather than one.** The obvious single condition — a `completed` todo with an
unticked box — was the original plan and would have shipped inert. Unticked boxes are the normal state
of `in-progress/`, so the hook has no signal at all until a mirror exists, and the measurement says
one never does. Requiring FULL mirror coverage also catches a task ADDED mid-build, which `feature`
step 5 explicitly permits: under a weaker condition those late-discovered tasks — the ones most likely
to be forgotten — would have been the only ones the mechanism never watched. The third condition, a
ticked box whose todo never moved, closes the remaining path: a mirror seeded once to clear the first
condition and then abandoned.

# Consequences
**Amended 20260807 (no ADR — a second hook was added and the scripts began sharing a module):** bullets
below that said "the hook" now say "the hooks", the rollback count went from three lines to two entries,
and the Copilot and `check-pointers` bullets now cover three `.mjs` files instead of one. Those are
mechanical consequences of the amendment above, listed here rather than as four separate markers. Bullets
whose SUBSTANCE changed carry their own marker in place.

**Amended by 0009:** `check-size` and `check-pointers`, named in the last bullet below, no longer
exist — ADR 0009 deleted both. The skill roster named below is stale too: the skills that ship to
Copilot alongside `skills/feature/SKILL.md` are now `skills/git-commit/SKILL.md` and
`skills/self-improve/SKILL.md`, and no other skill remains to ship.

- **The hooks fire in every project and every worktree, not just this repo.** That is the point, and
  it is also the blast radius: a misfire blocks the end of every turn everywhere. Bounded by fail-open,
  by one block per signature, and by the fact that removal is deleting two named entries.
- **Seeding the mirror becomes effectively mandatory for every feature.** The first turn after a spec
  reaches `in-progress/` draws one block until the todo list is seeded, and adding a task mid-build
  draws another until it is re-seeded.
- ~~**The annotation vocabulary now lives in two standalone scripts.**~~
  **Amended 20260807 (no ADR — the copies were merged into `_shared.mjs`):** `ANNOTATED` now has one
  definition, imported by all three scripts, so adding a fourth marker is a one-line change in one place.
  This bullet's hazard is what made a third copy unacceptable when `tick-sync.mjs` needed the same value.
- **A hook now WRITES to the user's spec files, unattended, in every project.** This is the amendment's
  real blast radius and it is larger than the original's. A defect can mark work as done that never
  happened. Bounded by: never guessing (exact match or nothing), never touching an annotated line,
  re-reading and comparing before writing, atomic rename, and a log of every write. Rollback is removing
  one entry from `~/.claude/settings.json`.
- **The auto-tick goes quiet exactly where several specs share task wording.** `autopilot` is the case:
  queued specs built to the same shape repeat lines like `Update the docs`, and the ambiguity rule skips
  those in all of them. Accepted — the alternative is guessing which spec a todo belongs to. Every skip is
  logged, and `check-features.mjs`'s `tasks-not-current` still catches the unticked boxes at the gate.
  **Amended by 0009:** `autopilot` no longer exists — ADR 0009 deleted it, so this illustrating case is
  gone. The behaviour it illustrated still holds: `tick-sync.mjs`'s `ambiguous` set still skips a task
  line shared by more than one `in-progress/` spec, whichever specs those are.
- **`skills/feature/SKILL.md` and three other skills ship to Copilot, where hooks do not exist.**
  `scripts/build-copilot.mjs` exports every `SKILL.md` to `.github/skills/` and emits
  `skills/<name>/scripts/*.mjs` alongside. Both hook scripts and `_shared.mjs` therefore ship to an
  environment that will never run them, and the prose must state the RULE as the rule, naming the hooks
  as this harness's enforcement rather than as something that will stop you. There, the box IS drawn by
  hand again.
- ~~**`skills/audit-solution/SKILL.md:69` becomes false.**~~ It states that the mechanical half cannot
  reach audit remediations, because they never run step 1.5 and so carry no `# Premortem`. Neither hook
  reads `# Premortem`. That sentence shares no string with anything else changed here.
  **Amended 20260807 (no ADR — a second hook was added):** its count of mechanical halves went from two
  to three at the same time, which is a second way the same sentence had to be rewritten.
  **Amended by 0009:** `skills/audit-solution/` no longer exists — ADR 0009 deleted the whole skill,
  so there is no `SKILL.md:69` left to become false or stay true.
- **The hooks cannot detect their own absence — but the writing one now leaves a trace.** Nothing in a
  git-ignored `features/` tree or an unversioned settings file can announce that a hook stopped running.
  `features/.tick-sync.log` narrows it: a build with no new lines in it is a build where the auto-tick did
  nothing, which is visible if anyone looks. Still not self-announcing, and `feature` step 5 keeps
  promising an enforcement that a bare checkout does not have. Accepted.
- **Both entries or neither.** `tick-sync.mjs` without `tick-guard.mjs` loses the guarantee that every
  task is mirrored, which is what gives the auto-tick anything to write. `tick-guard.mjs` without
  `tick-sync.mjs` blocks over a mirror whose only consumer is missing. README's restore steps say so.
- `check-size` is unaffected — it walks only `.md`. `check-pointers` DOES walk every `.mjs`
  (`CORPUS_EXT = /\.(?:md|mjs)$/`), so none of the three files may carry an unresolvable `reference/`
  pointer or a `${CLAUDE_SKILL_DIR}` token, which outside a skill body is an `unresolvable-pointer`.
