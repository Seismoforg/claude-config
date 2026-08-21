# Findings C — ruling on `dispatch.md` §4 THE INVARIANT

Source read: `d:/Projects/claude-config/skills/feature/reference/dispatch.md`, §4, lines 119-136 (main
checkout, absolute path as handed).

Observer: Set C worker, worktree `D:/Projects/claude-config/.claude/worktrees/agent-a8d54ee2ff2cf1fa1`,
branch `worktree-agent-a8d54ee2ff2cf1fa1`, HEAD `8fba0705b1e7575784c65ea1b039a4befe4c9392`.
All observations taken between 17:01 and 17:06 on 2026-08-21, from inside that worktree.

The round moved under me while I worked. That is not noise — it is the single most useful thing this
set observed, and several verdicts below depend on it.

## Observations

Each is a command run inside my own worktree, or a file read with its `path:line`.

**O1 — worktree topology.**
```
$ git rev-parse --show-toplevel
D:/Projects/claude-config/.claude/worktrees/agent-a8d54ee2ff2cf1fa1
$ git rev-parse --git-dir
D:/Projects/claude-config/.git/worktrees/agent-a8d54ee2ff2cf1fa1
$ git rev-parse --git-common-dir
D:/Projects/claude-config/.git
```
The object store is SHARED with the main checkout. Only the index and HEAD are private.

**O2 — `git worktree list` at 17:03:39.**
```
D:/Projects/claude-config                                           8fba070 [feature/dispatch-smoke-test]
D:/Projects/claude-config/.claude/worktrees/agent-a1266cf3d66eb3ae9 8fba070 [worktree-agent-a1266cf3d66eb3ae9] locked
D:/Projects/claude-config/.claude/worktrees/agent-a4109ed99b82ccea3 8fba070 [worktree-agent-a4109ed99b82ccea3] locked
D:/Projects/claude-config/.claude/worktrees/agent-a8d54ee2ff2cf1fa1 8fba070 [worktree-agent-a8d54ee2ff2cf1fa1] locked
D:/Projects/claude-config/.claude/worktrees/agent-ae9b118f98981baea 06035ca [worktree-agent-ae9b118f98981baea] locked
```

**O3 — the same command at 17:06:09.**
```
D:/Projects/claude-config                                           44e7db8 [feature/dispatch-smoke-test]
D:/Projects/claude-config/.claude/worktrees/agent-a1266cf3d66eb3ae9 151913b [worktree-agent-a1266cf3d66eb3ae9]
D:/Projects/claude-config/.claude/worktrees/agent-a8d54ee2ff2cf1fa1 8fba070 [worktree-agent-a8d54ee2ff2cf1fa1] locked
D:/Projects/claude-config/.claude/worktrees/agent-ae9b118f98981baea 06035ca [worktree-agent-ae9b118f98981baea]
```
Three changes in 150 seconds: the round branch moved `8fba070` to `44e7db8`, worktree
`agent-a4109ed99b82ccea3` was REMOVED, and two siblings were unlocked. My own entry did not move.

**O4 — how my worktree's base was chosen.**
```
$ git reflog show --date=iso worktree-agent-a8d54ee2ff2cf1fa1
8fba070 worktree-agent-a8d54ee2ff2cf1fa1@{2026-08-21 17:01:27 +0200}: branch: Created from origin/main
```
The start-point git recorded is `origin/main` — not the checked-out branch, not `HEAD`.
Filesystem confirms the timing: `.git/worktrees/agent-a8d54ee2ff2cf1fa1` has mtime
`2026-08-21 17:01:31 +0200`.

**O5 — when the session was already running.**
```
$ git reflog show --date=iso feature/dispatch-smoke-test
1edfc3b feature/dispatch-smoke-test@{2026-08-21 17:03:17 +0200}: merge 06035ca4e0163c1895e6cc5c8553e2a5d3f17cf9: Merge made by the 'ort' strategy.
8fba070 feature/dispatch-smoke-test@{2026-08-21 16:59:07 +0200}: branch: Created from HEAD
```
The round branch existed at 16:59:07. My worktree was cut at 17:01:27 — 2m20s later. The first
worker merge landed at 17:03:17, while three workers including me were still building.

**O6 — every candidate ref pointed at one commit at cut time.**
```
$ git for-each-ref --points-at 8fba070 --format='%(refname)'
refs/heads/feature/dispatch-smoke-test
refs/heads/main
refs/heads/worktree-agent-a1266cf3d66eb3ae9
refs/heads/worktree-agent-a8d54ee2ff2cf1fa1
refs/remotes/origin/HEAD
refs/remotes/origin/main
```
At 17:06 they had separated: `feature/dispatch-smoke-test` = `44e7db8`, `origin/main` = `8fba070`.

**O7 — I can read another worker's committed work.**
```
$ git show --stat --oneline 06035ca
06035ca Set B: record output of five git commands in report-b.md
 sandbox/dispatch-smoke/report-b.md | 28 ++++++++++++++++++++++++++++
 1 file changed, 28 insertions(+)
$ git merge-base --is-ancestor 06035ca HEAD
(exit 1)
```
That commit is in my object store (O1) but is not an ancestor of my HEAD.

**O8 — I can read another worker's UNCOMMITTED files.**
```
$ ls -R D:/Projects/claude-config/.claude/worktrees/agent-a1266cf3d66eb3ae9/sandbox
.../sandbox/dispatch-smoke:
probe.mjs
seta-output.md
```
Names only; I did not open them. At that instant neither file was committed anywhere.

**O9 — I can read the main checkout.**
```
$ ls D:/Projects/claude-config/features/in-progress
20260821-1650-dispatch-smoke-test.md
```
`features/` does not exist inside my worktree (`ls features` gives `No such file or directory`), but
the main checkout's copy is reachable by absolute path.

**O10 — isolation is enforced by a command-shape heuristic, not a boundary.**
A compound command containing a loop over the `.git/worktrees/` directory was refused:
> This agent is isolated in the worktree ... but this command is too complex to verify that it stays
> inside the worktree. Refusing to run it

The plain `ls` in O8 and O9, targeting the same region, ran without objection.

**O11 — the main checkout stayed clean until the dispatcher merged.**
`ls D:/Projects/claude-config/sandbox` at 17:03 gave `No such file or directory`. The same command at
17:06, after two merges, gave `probe.mjs  report-a.md  report-b.md`.

**O12 — my HEAD is attached, not detached.**
```
$ git rev-parse --symbolic-full-name HEAD
refs/heads/worktree-agent-a8d54ee2ff2cf1fa1
```
`git branch --show-current` printed `worktree-agent-a8d54ee2ff2cf1fa1`, not empty.

**O13 — file reads.**
- `docs/adr/0001-tester-is-read-only-not-an-executor.md:13-15` — "MEASURED: a worktree is cut from
  the branch tip as of SESSION START, not current HEAD. Two workers dispatched after a commit had
  landed both reported the older tip."
- `agents/AGENTS.md:30-32` — an executor "ALWAYS runs in an isolated git worktree".
- `agents/scripts/check-agents.mjs:235-239` — an `isExecutor` branch that tests whether any body line
  mentions a worktree, case-insensitive, and pushes a violation when none does.
- `agents/scripts/check-agents.mjs:229-231` — its own comment: the worktree "is a dispatch-time flag
  this check cannot see. So it demands the briefing be present, same presence-only logic".

**O14 — worktree cost.** `du -sh` on my checkout gave `734K`.

## Verdicts

| Claim (quoted or closely paraphrased) | Verdict | Evidence |
|---|---|---|
| "A worker sees only its own worktree" | refuted | O1, O2, O7, O8, O9. I see all four sibling worktrees by name and commit, read a sibling's committed diffstat through the shared object store, list a sibling's uncommitted files, and read the main checkout. What is private is my INDEX and HEAD, not my view. O10 shows the containment is a heuristic on command shape: the same target region was refused in a loop and allowed in a plain `ls`. |
| "cut from a base that may be older than yours" | confirmed | O3. At 17:06 the dispatcher's checkout is at `44e7db8` and my HEAD is `8fba070`. Observed live, not inferred. At cut time (O4, O6) they were equal — the gap opened during the round. |
| "verify its reported HEAD, never assume it matches" | unverifiable from here | An instruction addressed to the dispatcher. Its compliance is an act performed outside my worktree and after my report ends, so no command of mine can observe it. Its premise is confirmed by the row above. Note against the §5 trap it guards: my HEAD is attached to a real branch ref (O12), so the detached-HEAD case §5 measured did not reproduce here. |
| "A worktree is cut from the branch tip as of SESSION START" — the TIMING half | refuted | O4 + O5. The round branch was created at 16:59:07, so the session was already running then. My worktree branch was created at 17:01:27 and its git dir at 17:01:31 — after. The cut happened at DISPATCH time. Limit: because no commit landed between 16:59:07 and 17:01:27, either timing would have produced the same SHA, so this refutes the mechanism and not the outcome. |
| "...from the branch tip ..., not current HEAD" — the SOURCE REF half | refuted | O4. Git recorded the start-point as `origin/main`. That is neither of the two options the sentence offers: the checked-out branch was `feature/dispatch-smoke-test` and current HEAD was the same commit. Limit: all candidate refs pointed at `8fba070` at cut time (O6), so no divergent SHA was produced. The refutation rests on git's own record of which ref was passed, not on an observed difference. |
| "The measurement lives in [ADR 0001]" | confirmed | O13. `docs/adr/0001-tester-is-read-only-not-an-executor.md:13-15` holds a paragraph beginning "MEASURED:". The relative link `../../../docs/adr/0001-...` resolves from `skills/feature/reference/`. This confirms the text is there; whether that measurement still holds is the two rows above, which contradict it. |
| "Every WRITING dispatch is isolated" | confirmed | O2, O11. Four writing dispatches in this round, four worktrees under `.claude/worktrees/`. The main checkout had no `sandbox/` at 17:03 while a sibling worktree already held unmerged files (O8). Scope limit: confirmed for this round only — "every" over all dispatches is not reachable from one worker. |
| "...at every tier including `haiku`" | unverifiable from here | The isolation half is confirmed for all four observed sets (row above), but nothing inside a worktree records which TIER dispatched which set. The only mapping is the feature spec, which my brief bars as evidence. A worker cannot read its own tier. |
| "Repo policy, not a preference (`agents/AGENTS.md`)" | confirmed | O13. `agents/AGENTS.md:30-32` states an executor "ALWAYS runs in an isolated git worktree", with `unbriefed-executor` named. It is written as policy, not preference. |
| "`check-agents.mjs` enforces that the briefing exists" | confirmed | O13. `agents/scripts/check-agents.mjs:235-239` pushes an `unbriefed-executor` violation when no body line mentions a worktree. The wording in §4 is exactly right and deliberately narrow — the check's own comment at 229-231 says it cannot see the dispatch-time flag and is "presence-only". Caveat: I READ the script, I did not RUN it; my brief authorises only git and filesystem inspection. So "the rule is implemented" is confirmed; "it fires in the pipeline" is not. |
| "Two writers without it corrupt each other's diffs" | unverifiable from here | A counterfactual about a configuration that does not exist. Producing it needs two un-isolated writers dispatched at once, which one worker cannot do and repo policy forbids — `check-agents.mjs:232-234` states outright "no un-isolated executor exists". |
| "The `inline` tier is what keeps a one-line change from paying for a worktree" | unverifiable from here | A design rationale about work that by definition never becomes a worker. An `inline` change happens in the main loop, so it leaves no trace any worker can inspect. The one half I can price: a worktree checkout costs `734K` on disk (O14), which says nothing about whether the tier exists for that reason. |
| "Worktrees are for PARALLEL INDEPENDENT work. They cannot hand one worker's output to the next." | refuted | O7, O8. I read a sibling's committed diffstat and listed a sibling's uncommitted files, both from inside my own worktree. The output CAN be handed over — through the shared object store (O1) and the shared filesystem. What is true is narrower: it does not arrive in my checkout or at my HEAD (`merge-base --is-ancestor` exits 1), and it arrives only if that worker happened to have written first. I saw `06035ca` by race, not by mechanism. |
| "A step that must SEE earlier work cannot be a worktree worker at all" | refuted | Same evidence, O7 and O8. As worded ("at all") it is false: I am a worktree worker and I saw earlier work. The design conclusion still stands, but for a different reason than the sentence gives — not impossibility, but unreliability. Had I looked before 17:02:01 there would have been nothing to see, and nothing tells a worker which case it is in. That is the more dangerous property, and the current wording hides it. |
| "Dispatch a round from a base you will not change until that round is merged" | refuted | O5 + O3. The round branch moved at 17:03:17 (first merge) and again to `44e7db8` by 17:06, while three of four workers were still building. It was not followed, and it could not be: §5 of the same file mandates merging "Immediately after EACH merge, not later". The two sections contradict each other. Harm here was nil — my base `8fba070` is still an ancestor of `44e7db8` and my worktree never moved — because the base a late worker would be cut from is `origin/main` (O4), which stayed at `8fba070` (O6). |
| "Do NOT resume a finished worker ... its worktree is frozen at that stale base" | confirmed | O3. My worktree sat at `8fba070` while the round branch reached `44e7db8`. Nothing advanced my HEAD, and the base I hold went stale during my own run. Both halves observed, live. |
| "...and may already have been removed" | confirmed | O2 vs O3. Worktree `agent-a4109ed99b82ccea3` was present and locked at 17:03:39 and absent at 17:06:09 — removed after its merge, while the round was still live. Two siblings were also unlocked in that window, which is what removal is preceded by. |

## What a single worker can never settle

Four of the seventeen rows are `unverifiable from here`, and they fail for two different reasons that
no amount of care by one worker can fix.

The first reason is POSITION. Three claims — "verify its reported HEAD", "at every tier including
`haiku`", and the `inline` tier's purpose — are about decisions the DISPATCHER makes. A worker never
learns its own tier, never sees an `inline` change, and stops before the verification step it is
being told about. These are not hard to reach; they are on the other side of the dispatch boundary.
Settling them needs the dispatcher to record, per set, the tier it chose and whether a worktree was
created — the `# Dispatch` block already has the shape for it, so what is missing is the isolation
flag per row, not a new instrument.

The second reason is that the claim describes a state the system refuses to enter. "Two writers
without it corrupt each other's diffs" needs two un-isolated writers on one tree. Repo policy forbids
it and `check-agents.mjs:232-234` says no such executor exists. No observation settles this; only a
deliberate, throwaway violation would, and it is fair to decide that the claim stays an argument
rather than a measurement. If so, §4 should say it is an argument.

Separately, two rows are `refuted` on a mechanism while their OUTCOME stayed indistinguishable — the
session-start timing and the `origin/main` source ref. Both survive on git's reflog rather than on a
divergent SHA, because every candidate ref pointed at `8fba070` when the round was cut. That is
exactly the ambiguity the previous run left open, and it is now cheap to close: as of 17:06 the repo
is in the state that separates them, with `feature/dispatch-smoke-test` at `44e7db8` and `origin/main`
still at `8fba070`. A round dispatched from THAT state settles it in one command — if the next
worker reports HEAD `8fba070`, the base is `origin/main` and §4's sentence is wrong on both halves;
if it reports `44e7db8`, §4 is right and my reflog reading is wrong. One worker, one line of output,
no coordination. It has to be dispatched before anything pushes or fast-forwards `origin/main`,
because that is the only thing that would collapse the two answers back together.

What no single round can settle at all is whether any of this is STABLE. Every timing figure here
comes from one round on one machine. The three findings I would defend hardest — the base going
stale mid-round, the sibling worktree disappearing mid-round, and §4 contradicting §5 about whether
the base may move — are structural rather than statistical, so a second round agreeing would make
them safe to act on. The `origin/main` reading is the opposite: it is one string in one reflog, and
it should be replicated before a word of `dispatch.md` changes on the strength of it.
