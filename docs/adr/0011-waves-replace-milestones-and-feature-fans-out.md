---
status: accepted
date: 2026-09-02
---

# Context
ADR 0009 deleted `feature`'s dispatch machinery along with the agent roster it ran on, and recorded
the gap in its own consequences: *"Task fan-out will be rebuilt on a different mechanism."* Nothing
was built. Every line of every feature build has been written by the session model since, one task
after another, however independent the tasks were.

ADR 0010 brought back an `agents/` tree — four model-tiered doorman workers — and ADR 0009's
consequence bullet was amended to call that the rebuilt fan-out. It is not. The doorman rates ONE
prompt and dispatches ONE worker. It has no notion of several tasks, no dependency order, and no
notion that two workers might write the same file. It is a tier picker. The fan-out was still
missing, and the record said otherwise.

Meanwhile `feature` step 4 cut milestones — a grouping of `# Tasks` by what each slice makes
exercisable. A fan-out needs a different grouping of the same list: by dependency, and by which tasks
can safely write at the same time. Two groupings of one task list, in one file, with different
criteria and no rule for which governs where they disagree.

# Decision
**Waves replace milestones, and `feature` step 6 fans a wave out to the tier agents.**

Step 4 stops cutting milestones. It records three lists per task — reads, writes, depends-on — and
cuts waves by three rules: merge tasks that write the same path into one task, then place a task only
in a wave after everything it depends on, then verify no two tasks in one wave write the same path.
`# Milestones` is replaced by `# Waves`, everywhere. Nothing keeps both.

Step 6 builds waves in order. Each task in a wave is rated against `rules/doorman-tiers.md` and
dispatched to the matching tier agent, at most 8 at a time; `inline` remains a legitimate outcome.
The wave's brief adds one clause to what `doorman-tiers.md` already requires: the task's write paths,
as the only paths that worker may write.
**Amended by 0013:** dispatch is now the presumption and `inline` is an exception that must be
earned — gate 0 (mandatory, closed list) or a judged exception recorded on the spec's `# Waves` line.
What this bullet says about step 6 rating and dispatching each task still stands unchanged.

**Workers share the working tree. There are no worktrees and no merge step.** Write-disjointness is
the only isolation, and the rule says so rather than implying more.

The procedure lives in `skills/feature/reference/waves.md`, loaded at step 4 and again at step 6.
It is excluded from the Copilot export in both required places, because Copilot has no subagents.

**Amended by 0012:** every `doorman-tiers.md` above is now `rules/dispatch-tiers.md`, and
`doorman-worker.md`, named in `# Rationale` and `# Consequences`, is now `rules/agent-worker.md`.
Only the filenames moved. What the decision says — step 6 rates each task against that rubric and
dispatches to the matching tier agent, at most 8 at a time — stands unchanged, and so does the
`# Rationale` argument for reusing one rubric rather than writing a second.

# Rationale
- **The tier rubric already existed and had one reader too few.** Reusing `doorman-tiers.md` rather
  than writing a second tier table is the same call ADR 0008 made and for the same reason: two copies
  of one rubric drift, and the drift is silent.
- **Worktrees were measured, not assumed away.** `features/done/20260821-1723-worker-isolation-and-report-accuracy.md`
  refuted three isolation claims: the object store is shared, one worker read a sibling's commit, and
  another reached the main checkout through a path its brief never gave it. The merge step that
  worktrees require is also what introduced the fabricated-SHA failure — a worker reported a
  40-character SHA whose last 33 characters it invented, and git resolved the prefix. Removing the
  merge step removes that class.
  **Amended 20260903 (no ADR — evidence pointer marked machine-local):** the feature record cited
  above is a local one. `features/` is git-ignored, so that path resolves on the authoring machine
  only and not in a clone. The measurement it records, and every conclusion drawn from it here,
  stands unchanged.
- **Two groupings of one list is a question asked at every build.** Milestones cut by exercisability,
  waves by write-disjointness. Where they disagree nothing said which wins. One cut removes the
  question instead of answering it.
- **The merge rule is what keeps the cut honest.** Without it, four edits to one file become four
  one-task waves: sequential work in a parallel plan's clothes. With it they become one task. In this
  repo, where most features edit a handful of shared prose files, that is the common case.

# Consequences
- `# Milestones` no longer exists in `feature`. Specs in DONE and DISCARDED keep theirs as record.
- No script changed. `check-features.mjs` gated on `# Premortem` and `# Open Questions` and never
  read `# Milestones`; `# Waves` is likewise unchecked, on the same call ADR 0008 made for
  `# Dispatch`.
- `scripts/build-copilot.mjs` gained a second emit-side exclusion set, `NOT_EMITTED_SKILL_FILES`.
  `NOT_EMITTED_RULES` guards only the rules walk; a skill's `reference/` directory is emitted by a
  separate loop that never consults it. Found while building, not while planning.
- **A worker's report is believed.** Verification runs at the wave boundary over the whole result,
  not per worker. A false claim about a file that no check reads — rule prose, which is most of this
  repo — survives to the validation gate. That failure mode has been measured here twice. It is
  accepted knowingly, in exchange for not re-reading every changed file on every wave.
- **Nothing mechanically detects a write-path conflict.** If a worker writes outside its named paths,
  a sibling's edit can be lost in silence. The merge rule removes the commonest source; the residue
  is accepted and named rather than papered over.
- ADR 0009's consequence bullet crediting ADR 0010 with the rebuilt fan-out is amended to point here
  instead.
- `feature` remains in the doorman's `waveThroughSlashCommands` list. The door hook fires on the
  `/feature` prompt itself, which is interview and planning work that must stay in the main loop;
  the reconciliation this ADR performs is at step 6, which the door never sees.
  **Amended by 0012:** the doorman is removed, so the door hook and that list are gone and there is
  nothing left to exempt `feature` from. Step 6 still stands as the place dispatch happens; the
  reconciliation this bullet left pending is settled by the removal rather than by a config edit.
