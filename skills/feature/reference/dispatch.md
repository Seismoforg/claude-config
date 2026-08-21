# DISPATCH

How a milestone's tasks are split across workers, and which model each one gets.

Loaded by `feature` workflow step 5. That step owns the trigger and the carve-outs — this file is the
procedure, not the trigger.

**Main loop only.** No agent in this config holds the `Agent` tool (`agents/AGENTS.md`, "Three
constraints binding BOTH classes"), so every dispatch decision, every merge and every gate stays
here. A worker builds and reports; it never dispatches and never decides.

# 1. THE FOUR TIERS

Rated by the KIND of change, never by its size. A pattern repeated over twenty files is cheap; one
line carrying a decision is not.

| Tier | What it is |
|---|---|
| `inline` | One file, one place, the wording already fixed by the spec. The main loop writes it. |
| `haiku` | Mechanical repetition: the same pattern at N sites the spec ENUMERATES. No judgment. |
| `sonnet` | A new file or script following an existing pattern. Content fixed, form not. |
| `opus` | Judgment: rule prose carrying a decision, an interface change, any `security-review` surface, anything the spec still lists as an open assumption. |

**`haiku` EXCLUDES rule prose whose wording must differ per host file.** Seven files each stating a
rule for a different reader is seven decisions wearing one shape. In a config repo that is the most
common task there is, and it is the one way this ladder collapses: rate it `haiku`, get seven
identical sentences, escalate, and start rating everything `opus` on sight.

A SET takes the tier of its HARDEST task. The tier is decided at BUILD time, with the real file tree
in front of you, and written into `# Dispatch` (§7).

# 2. CUTTING THE SETS

**Per milestone.** Sets are cut inside one `## ` milestone and never across two. Milestones are built
in order, each exercised before the next starts (`feature` step 5); a set spanning the boundary
destroys that order.

**Disjoint files.** Two tasks touching the same file go in the same set — two worktrees editing one
file produce merges that collide.

**Deriving the files.** `# Tasks` items name no paths, and they cannot: a task's text must stay one
physical line, copyable verbatim into a todo, or `tick-sync.mjs` can never move its box. So derive
each task's files from its text plus `# Technical Plan`, and write the derived list into that set's
`# Dispatch` row. A wrong cut then surfaces at the merge with a record of what was assumed.

**Re-verify the cut before dispatching the round**, against the milestone's task list, using those
derived lists. Sets cut from one base collide the moment two of them reach the same block through
differently-worded tasks — and that surfaces at the SECOND merge, not the first.

**All tasks `inline` → short-circuit.** One line in `# Dispatch` saying so, then build. No set
cutting, no file derivation, no brief. Most milestones are this, and without the short-circuit the
decision costs more than it saves.

**A set that edits what the dispatch RUNS UNDER is `inline`, whatever the rubric rated it.** The
tier describes the work; this overrides where it runs. It covers `CLAUDE.md`, `skills/_shared/blocks.md`,
`feature` and this file, and every skill a worker PRELOADS (`coding-standards`, `documentation`) or is
handed as a surface rule. Dispatching one sends a worker to rewrite the rules it is at that moment
obeying, and nothing records that two sets in one round followed different versions of them. Same
reasoning as `autopilot`'s third skip category. In a config repo this catches most rule-prose work,
which is a real limit on how much this mechanism can save HERE — say so in `# Dispatch` rather than
routing around it.

**At most four dispatches at once.** More sets than that wait for a free slot.

**Assign every task explicitly. Verify coverage twice** — before dispatch and after merge.

# 3. THE DISPATCH BRIEF

Every dispatch carries all of it. A missing item is the dispatcher's miss, not the worker's.

- The worker's slice: its disjoint task-set, and nothing else. A worker widening its own scope is a
  defect, not initiative.
- **ABSOLUTE path to the feature spec in the MAIN checkout.** Never repo-relative: `features/` is
  git-ignored, so it does not exist inside a worktree.
- **Paths by DIRECTION.** Read-only inputs (spec, rule sources) → main-checkout absolute; they resolve
  fine from inside a worktree. Write targets → repo-relative, joined onto the worker's own worktree
  root. An edit target handed as a main-checkout absolute is REJECTED for an isolated agent.
- **The EXPECTED base — branch name AND commit** — plus "run `git rev-parse HEAD` first; behind it →
  move onto that base before editing". **This is not belt-and-braces. It is the ONLY thing standing
  between a round and a silently wrong base**, because a worktree is cut from `origin/main` (§4), never
  from your branch. Concretely: milestone 2's workers do not receive milestone 1's commits unless this
  bullet is obeyed. Naming the base is what makes the worker's own check actionable.
- The `DEBT:` line is EXPECTED. Say so, or a knowingly-left shortcut comes back as neither a report
  nor a filing. `agents/dev.md` OUTPUT owns its format.
- The shell-bound checks the task's own surface mandates — `coding-standards`' pre-flight on a design
  surface, `documentation`'s check-docs when the change touches docs.
- A run qualifying under LOCAL RESOURCE RUNS in `skills/_shared/blocks.md` needs the user's yes BEFORE
  dispatch. A worker has no `AskUserQuestion`, so its brief IS its authorization: approved → the run
  may sit in the brief; not approved → the brief must not name it.

## Rule sources — hand them as ABSOLUTE paths
A worker preloads a skill's SKILL.md BODY and nothing it points at. Skills are not auto-discovered
inside a subagent at all. So every applicable rule file is named as an absolute path, pointing at the
FILE and never the directory — `Read` on a directory errors, and the worker then builds blind.

**RE-DERIVE this list from the actual contents of `coding-standards/reference/` at dispatch time.**
What follows is a map of what exists today, not a definition. An addendum added later is invisible to
it, and a worker handed a path to a file that no longer exists falls into its read-failed branch.

- `coding-standards/reference/frontend.md` — frontend or any TS/JS work
- `coding-standards/reference/python-ml.md` — Python/ML
- `coding-standards/reference/dependencies.md` — a dependency added or upgraded
- `coding-standards/reference/web.md` — web/UI work
- `documentation/reference/agents-md-template.md` — the task creates a module doc
- `security-review/SKILL.md` — auth, sessions, input handling, external payloads. It cites
  `coding-standards/reference/dependencies.md` for its CVE check; hand that too, or name it as not
  handed.
- **A design surface takes `coding-standards/reference/design.md` + `web.md` +
  `design-ai-tells.md` — all three, never `design.md` alone.** `design.md` defers to `web.md` for
  contrast thresholds, reduced motion and the CWV targets. The remaining `design-` catalogues are
  handed BY TASK, not as a bundle: `design-redesign-protocol.md` (any redesign),
  `design-design-directives.md` (composing a look), `design-install-commands.md` and
  `design-canonical-sources.md` (installing a real design system), `design-liquid-glass.md`,
  `design-motion-skeletons.md` (motion work), `design-pattern-vocabulary.md` (naming a pattern),
  `design-block-library-schema.md` (authoring a block).

None applies → hand none and say so. Applies but unnamed → the worker builds blind and flags
`FRICTION`, which is the dispatcher's miss. Cannot hand one → say so in the brief, so the worker
flags the gap instead of assuming coverage.

# 4. THE INVARIANT

**A worker sees only its own worktree, cut from a base that may be older than yours — verify its
reported HEAD, never assume it matches.** MEASURED 2026-08-21: **the base is `origin/main`** — not the
branch tip, not current HEAD. Five worktree branches all read `branch: Created from origin/main`, one
cut while the checked-out branch stood elsewhere. An unpushed `main` is older still. §3's expected-base
bullet is what corrects for it. Earlier record and its amendment:
[ADR 0001](../../../docs/adr/0001-tester-is-read-only-not-an-executor.md).

Everything about isolation follows from that one line:
- **Every WRITING dispatch is isolated**, at every tier including `haiku`. Repo policy, not a
  preference (`agents/AGENTS.md`); `check-agents.mjs` enforces that the briefing exists. Two writers
  without it corrupt each other's diffs. The `inline` tier is what keeps a one-line change from
  paying for a worktree.
- Worktrees are for PARALLEL INDEPENDENT work. They cannot hand one worker's output to the next.
- A step that must SEE earlier work cannot be a worktree worker at all. Make it read-only so it
  returns TEXT, or do it in the main loop.
- **Never REWRITE the base under a live round — rebase, reset, force-push. Where this and §5 disagree,
  §5 governs.** Read as "never move the branch" it forbids §5's merge-immediately rule. §5 wins: a
  merge only ADDS commits, so every live worker's base stays an ancestor and nothing it built becomes
  unreachable; a rewrite is what breaks that. MEASURED 2026-08-21: a four-worker round whose branch
  moved twice mid-round lost nothing.
- Do NOT resume a finished worker for later work: its worktree is frozen at that stale base, and may
  already have been removed.

# 5. MERGING, AND WHAT ONLY YOU CAN DO

**Merge a worker in; never copy paths out.** `git merge --no-ff <worker-branch>` — `git worktree list`
names the branch. It carries deletions and renames, needs no path list, cannot half-apply, and IS the
commit. `git checkout <branch> -- <paths>` aborts on a deleted pathspec and lands NOTHING. Only after
the merge: remove the worktree and delete its branch — until then that branch is the sole copy.

Worker branches are EXEMPT from the `feature/` scheme: the harness names them when `isolation:
worktree` is set, so read the name back from `git worktree list`.

**MERGE THE WORKER'S REPORTED HEAD SHA, not the advertised branch name.** MEASURED here: the harness
reported `worktreeBranch: worktree-agent-<id>`, that ref existed, and it pointed at a commit from
BEFORE the round — the worker had committed in DETACHED HEAD, which is what `git worktree list` shows.
Merging the name would have landed NOTHING and exited 0, reading as a clean merge of an empty change.
The worker reports its HEAD first for exactly this reason (`agents/dev.md` OUTPUT). Verify what you
are about to merge — `git log --oneline -1 <sha>` and `git merge-base --is-ancestor` against your own
HEAD — before running the merge, and again by the file list the merge prints.

**Immediately after EACH merge, not "later":**
- Re-check coverage against the milestone's task list.
- Transcribe that worker's `DEBT:` line into the spec's `# Debt Found`. A worker's report is a chat
  message; untranscribed, the debt is gone when the round ends. `DEBT: none` needs nothing.
- Tick that worker's finished tasks. A worker cannot write feature state at all, and its own todo
  list never reaches the mirror — `tick-sync.mjs` bails the moment `agent_id` is set. So nothing a
  worker does can move a box for you. A task it reported blocked stays unchecked and gets its reason
  on the line (`feature` step 6 owns that form).

# 6. WHEN IT GOES WRONG

**Escalation: one step up, exactly once.** `haiku` fails → `sonnet`. `sonnet` fails → `opus`. `opus`
fails → stop and report. Never a second attempt at the same tier. This is `feature` step 6's rule
against a third attempt at the same failing check, applied to dispatch.

**Every merged `haiku` set is reviewed before the next set starts.** Dispatch `standards-reviewer`
over the diff, and NAME THE RANGE — `git diff <merge-base>...HEAD`. That agent makes the dispatcher
responsible for naming the diff (`agents/standards-reviewer.md`), and after a `--no-ff` merge a bare
`git diff` shows nothing at all.

**A fix round after a red check MAY be dispatched**, under three conditions, all required:
1. The failing state is COMMITTED on the working branch.
2. The brief names that commit as the expected base.
3. The worker runs `git rev-parse HEAD` first and moves onto it before editing.

An UNCOMMITTED failure cannot be dispatched: the worker's tree never contained it, so it would
report green on work that is red. Then the fix is main-loop work.

**Workers report, they never gate.** A `FRICTION:` line is evidence for you and for `self-improve` —
carry it, act on it. Never let a worker decide to proceed.

# 7. THE RECORD

Append `# Dispatch` to the feature file, and write into it as each milestone is decided — not
afterwards. One block per milestone:

```
## <milestone name>
- <set name> — <tier> — files: <derived list> — <one line: why that tier>
```

An all-`inline` milestone gets one line instead: that it was all inline, and why.

This section is the ONLY record of which model built what. Nothing checks that it exists, so its
absence is invisible — which is exactly why it is written as the decision is made.
