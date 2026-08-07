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

# Decision
`# Tasks` is mirrored into the harness todo list, and a Stop hook blocks the turn from ending while
the two lists disagree.

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
- **The hook fires in every project and every worktree, not just this repo.** That is the point, and
  it is also the blast radius: a misfire blocks the end of every turn everywhere. Bounded by fail-open,
  by one block per signature, and by the fact that removal is deleting three named lines.
- **Seeding the mirror becomes effectively mandatory for every feature.** The first turn after a spec
  reaches `in-progress/` draws one block until the todo list is seeded, and adding a task mid-build
  draws another until it is re-seeded.
- **The annotation vocabulary now lives in two standalone scripts.** `check-features.mjs` owns
  `ANNOTATED` (`BLOCKED` / `NOT DONE` / a feature id) and the check scripts are deliberately not
  shared. Adding a fourth marker to one and not the other makes the check go green on a spec the hook
  blocks. Both files carry a comment naming the other; nothing enforces it.
- **`skills/feature/SKILL.md` and three other skills ship to Copilot, where hooks do not exist.**
  `scripts/build-copilot.mjs` exports every `SKILL.md` to `.github/skills/` and emits
  `skills/<name>/scripts/*.mjs` alongside. The script therefore ships to an environment that will
  never run it, and the prose must state the RULE as the rule, naming the hook as this harness's
  enforcement rather than as something that will stop you.
- **`skills/audit-solution/SKILL.md:69` becomes false.** It states that the mechanical half cannot
  reach audit remediations, because they never run step 1.5 and so carry no `# Premortem`. The hook
  does not read `# Premortem`. That sentence shares no string with anything else changed here.
- **The hook cannot detect its own absence.** Nothing in a git-ignored `features/` tree or an
  unversioned settings file can. If it is removed after misbehaving, `feature` step 5 keeps promising
  an enforcement that is gone. Accepted; bounded only by making removal deliberate rather than easy.
- `check-size` is unaffected — it walks only `.md`. `check-pointers` DOES walk the new `.mjs`
  (`CORPUS_EXT = /\.(?:md|mjs)$/`), so the file may carry no unresolvable `reference/` pointer and no
  `${CLAUDE_SKILL_DIR}` token, which outside a skill body is an `unresolvable-pointer`.
