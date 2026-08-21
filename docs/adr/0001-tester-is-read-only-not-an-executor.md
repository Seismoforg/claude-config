---
status: accepted
date: 2026-08-01
---

# Context
Workers in the `crew` flow come in two classes: read-only **analysis** agents that return text, and
write-capable **executor** agents that build in an isolated git worktree. Isolation is what makes an
executor safe — two devs writing the same tree corrupt each other's diffs.

The tester runs AFTER the devs. It needs to see what they built.

MEASURED: a worktree is cut from the branch tip as of SESSION START, not current HEAD. Two workers
dispatched after a commit had landed both reported the older tip. A worktree therefore cannot hand one
worker's output to the next.

**Amended 20260821 (no ADR — a replication measurement refuted the MECHANISM above, not this
decision):** the base is `origin/main`. The observation stands and agrees with that — a commit landing
locally does not move `origin/main`. Evidence: five worktree branches, each reflog reading
`branch: Created from origin/main`; one cut while the checked-out branch stood elsewhere, arriving at a
commit that predated that branch's own work. `feature/reference/dispatch.md` §4 carries the corrected
claim. Out of scope here and left unchanged: the last sentence above. The same round refuted it too —
the object store is shared, so a worktree CAN see another's committed work, by race — and that is
being handled in its own feature.

# Decision
The tester is an **analysis** agent, not an executor. It derives tests from the feature SPEC and
returns the test code as TEXT. The dispatcher writes the files and runs them.

**Amended by 0008:** the `tester` agent was deleted with the `crew` skill, so this decision's SUBJECT
no longer exists. Its PRINCIPLE stands unchanged — a role that must see an earlier worker's output is
built as analysis, never as an executor — and now lives in `feature/reference/dispatch.md` §4. Test
design returned to `feature` step 6, in the main loop.

# Rationale
A tester that WROTE its tests would need a worktree. It would then faithfully test a version of the
repo that lacks the very build it was sent to check — a green run proving nothing, with no error to
reveal it.

Making the role read-only removes the problem instead of patching around it. The alternative — an
executor with the worktree flag switched off — would carve an exception into "every executor is
isolated", the invariant that keeps parallel writers safe. One exception is enough to make that rule
something you have to check rather than something you can rely on.

# Consequences
- "Every executor is isolated" holds with no exception, so the safety argument stays a one-liner.
- The dispatcher does the file writing and test running for the tester. That work does not vanish; it
  moves to the main loop.
- Any future role that must SEE an earlier worker's output faces the same constraint and takes the
  same shape: read-only, returns text. `crew` DISPATCH RULES states this as a general rule ("a role
  that must see earlier work cannot use a worktree at all"), not a fact about the tester.
- Fix rounds after a red test are main-loop work for the same reason.
  **Amended by 0008:** reversed. A fix round MAY be dispatched when three conditions all hold — the
  failing state is committed, the brief names that commit as the expected base, and the worker
  fast-forwards onto it before editing. An UNCOMMITTED failure still stays main-loop work, for
  exactly the reason this line gave: the worker's tree never contained it.
