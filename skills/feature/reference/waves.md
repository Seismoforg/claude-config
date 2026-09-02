# WAVES

The method behind `feature` step 4's cut and step 6's build. SKILL.md owns the RULES — what a wave
is, the two ordering rules, the merge rule, the batch cap. This file owns the PROCEDURE: how to
derive the lists those rules operate on, how to brief a worker, what happens when one fails, and
where verification sits.

Loaded twice: at step 4 to cut, at step 6 to dispatch. Nothing here runs a gate or moves a file.

**Not exported to Copilot.** It names subagents, which that target does not have.

# 1. THE THREE COLUMNS

Every `# Tasks` item gets three lists. They are the whole input to the cut; everything else follows
from them.

- **reads** — paths the task must read to do its job. Include the rule files its surface requires,
  and the spec itself.
- **writes** — paths the task will create or modify. This is the load-bearing column. A path you are
  unsure about goes in.
- **depends on** — the task whose OUTPUT this one needs, or nothing.

**Deriving `writes` is reading work, not guessing work.** Grep the symbol, the section heading or
the string the task changes, and let the hit list be the column. A task described as "update the
export script" that turns out to touch two lists in one file and a note in another is a two-file
task, and the grep is what tells you.

**`depends on` is about OUTPUT, not about topic.** Two tasks on the same subject are not dependent.
Task B depends on task A only when B must read something A writes. A rule file and the ADR recording
that rule are independent; a script and the exclusion list naming that script are not.

**Unknown is a dependency.** Cannot tell whether B needs A's output → say it does. That is SKILL.md's
rule; here is why it is cheap: a wrong dependency costs one wave of wall-clock time, a wrong
independence costs a silently lost edit that no check in this repo reads for.

# 2. APPLYING THE CUT

SKILL.md step 4 owns the three cut rules and their order. Run them against the columns from §1. Two
things it does not say, which is why this section exists.

**A rule-3 survivor is a rule-1 miss.** Two tasks in one wave still sharing a `writes` path means the
merge was incomplete. Go back and merge them. Pushing one of them a wave later satisfies the letter of
rule 3 and produces exactly the column of one-task waves the merge rule exists to prevent.

**The worked failure the disjointness rule prevents.** Two tasks, both editing one rule file: one adds a hard rule,
one rewrites a section heading. Dispatched into one wave, the second worker reads the file before
the first has written, and its edit either fails on a stale anchor or succeeds against a stale copy
and drops the first worker's paragraph. Nothing reports it. The mechanical checks in this repo read
folder structure, ADR frontmatter and export coverage; none of them reads rule prose for content.

**Write the cut down as `# Waves`** — per wave, its tasks with their three columns. The section is
prose. No check script reads it, exactly as `# Milestones` and `# Dispatch` before it.

# 3. THE DISPATCH BRIEF

`rules/dispatch-tiers.md` already lists what any brief owes a worker: its slice and nothing else,
absolute paths for anything outside the repo (a spec under `features/` above all — that directory is
git-ignored, so a repo-relative path resolves to nothing), the rule files the surface needs by
absolute path, and authorization for any run that spends the machine. Read that list; it is not
restated here.

**What a wave brief adds:**
- **The task's `writes` paths, named as the only paths this worker may write.** The wave's safety
  rests entirely on that boundary being respected, and the worker is the only actor who can respect
  it.
- **Its `reads` paths**, so the worker does not go looking and widen its own footprint.

The return format is `agent-worker.md`'s existing `HEAD` / `CHANGED` / `VERIFIED` / `DEBT` /
`FRICTION` / `BLOCKED` block. Do not ask for a diff and do not invent a second format: two formats
drift, and this one is already what the four agents are built to emit.

# 4. RUNNING A WAVE

SKILL.md step 6 owns the rating, the batch cap and the stay-inline carve-out. The mechanics:

**Send a wave's dispatches in ONE message**, or they queue instead of running together. Over the cap,
send full batches in order and wait for each. The wave is not finished until every batch has returned,
and nothing about the next wave starts before that.

**Why a reported failure is allowed to run its wave out**, since the instinct is to cancel: running
workers cannot be recalled at all, so cancelling only the not-yet-started batches leaves a partly-run
wave. Nothing on disk distinguishes that from a finished one, so the next attempt cannot tell which of
its tasks to redo. Let the wave finish, then stop at its boundary with a report.

# 5. WHEN A TASK FAILS

One retry, dispatched one tier up: `haiku` → `sonnet` → `opus` → `fable`. A task already at `fable`
has no tier above it and skips straight to the last bullet.

**The retry brief must say that the state on disk is partial and is not the retry worker's own
work.** Without that sentence the worker reads a half-written file as the repo's existing convention
and matches it.

A second failure is not retried. The task becomes a `BLOCKED` line in `# Tasks` with its reason, per
SKILL.md step 7, and `core.md`'s rule against guessing at a third patch binds from there.

# 6. WHERE VERIFICATION SITS

At the wave boundary, over the whole result — not per worker. A worker's report is taken at face
value and its todo moves on it. Then run the project's own build, typecheck and tests, plus
`check-features.mjs`, plus `check-adr.mjs` or `preflight.mjs` where the surface calls for them.

**The gap this leaves, stated rather than assumed away:** a false claim about a file that no check
reads survives to step 7. In a config repo that is most files, because most of them are prose. The
failure mode is not hypothetical — it has been measured here twice, in
`features/done/20260821-1723-worker-isolation-and-report-accuracy.md`: once as a false prose claim,
once as a fabricated commit SHA that git resolved by prefix. It is accepted knowingly, in exchange
for not re-reading every changed file on every wave.

Then write the wave's line under `# Waves`: what you ran and what you saw. A wave that left nothing
sensibly runnable says exactly that. **A failed check stops the NEXT wave.**

Ticking stays with the main loop. `tick-sync.mjs` skips a subagent's own todo list by design, so a
worker's `TodoWrite` never moves a spec's boxes.

# 7. WHEN IT DEGRADES

No subagent mechanism reachable — a target without agents, a session that cannot dispatch — → every
wave runs sequentially in the main loop and the wave plan is a build order, nothing more. The merge
rule and the dependency order still earn their place there; only the concurrency is lost.

Say so once, plainly, rather than filing each unrun dispatch as friction.
