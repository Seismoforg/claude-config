---
status: accepted
date: 2026-08-21
---

# Context
The `crew` skill held every piece of task-splitting machinery this config had: cutting an approved
feature's tasks into file-disjoint sets, dispatching `dev` workers into isolated git worktrees,
merging them back, re-checking coverage, transcribing each worker's `DEBT:` line. On top of that it
carried a role fiction — a Teamleiter seat, a PM ("Rieke"), two dev seats ("Kern", "Mara") and a
tester ("Vera").

It was opt-in. It ran only when someone asked for "the team".

`feature` step 5 had no dispatch concept at all, so an ordinary `/feature` run built every line in
the session model. The one lever `crew` offered was a single bullet — "downgrade a cheap mechanical
task-set to a smaller model" — with no definition of "cheap" and no list of models to pick from.

So the only place that knew how to dispatch was the one place a normal feature build never went.

# Decision
Dissolve `crew`. Keep its EXECUTOR half, in `skills/feature/reference/dispatch.md`, loaded by
`feature` step 5 on every milestone.

Step 5 now cuts a milestone's tasks into file-disjoint sets, rates each set by the KIND of change it
needs, and routes it to one of four tiers: `inline` (the main loop writes it), `haiku`, `sonnet` or
`opus`. A set takes the tier of its hardest task. The decision is made at build time and recorded in
the feature file's `# Dispatch` section.

Delete the `pm` and `tester` agents with the skill. Planning returns to `feature` step 1 and test
design to step 6, both main-loop work. `dev` survives as the only executor.

# Rationale
- **The rules could live in one place only.** Restating `crew`'s dispatch procedure inside `feature`
  to make it reachable is exactly the duplication `skills/_shared/blocks.md` forbids in its first
  four lines.
- **The role fiction was not load-bearing.** A seat name decided nothing. A tier does.
- **Rate by KIND, not size.** A pattern repeated across twenty files is cheap; one line carrying a
  decision is not. Counting files ranks surface area, which is the mistake
  `skills/self-improve/findings.md` already records.
- **Precedent exists.** ADR 0005 retired two skills into `coding-standards`, and
  `scripts/check-pointers.mjs` holds the `RETIRED` list that enforces nothing still points at them.
  `crew` joins that list, with the same path-or-name-position handling built for `taste`, because it
  is likewise an ordinary English word.

# Consequences
- **`/crew` stops existing, with no replacement entry point.** Dispatch is the default now, so there
  is nothing left to invoke.
- **The `pm` and `tester` agent types stop existing.** Any `Agent` call naming them fails. Planning
  and test design lose their subagent path and spend main-loop context instead.
- **A set that edits what the dispatch RUNS UNDER is `inline`, whatever the rubric rated it** —
  `CLAUDE.md`, `skills/_shared/blocks.md`, `feature`, `dispatch.md` itself, and every skill a worker
  preloads or is handed. Dispatching one sends a worker to rewrite the rules it is obeying. Same
  reasoning as `autopilot`'s third skip category. In a config repo this catches most rule-prose work,
  so the mechanism saves far less HERE than in a codebase where the rules and the code are different
  files.
- **A fix round after a red check may now be dispatched**, under three required conditions: the
  failing state is committed, the brief names that commit as the expected base, and the worker
  fast-forwards onto it before editing. This reverses ADR 0001's last consequence line.
- **MEASURED, and only ONCE:** the first dispatched worktree was cut from the branch tip AT DISPATCH
  TIME, not the session-start tip ADR 0001 records — its base `22f1386` was a commit made in the same
  session. One run is not a measurement of harness behaviour, so nothing in this decision rests on it
  and `dispatch.md` §4 still states the invariant as ADR 0001 measured it. Recorded to be replicated.
- **MEASURED:** the harness advertises a `worktreeBranch` ref that can point at a commit from BEFORE
  the round while the worker commits in detached HEAD. `git merge --no-ff <that name>` lands nothing
  and exits 0, reading as a clean merge. `dispatch.md` §5 therefore requires merging the worker's
  reported HEAD SHA, verified first.
