# DISPATCH TIERS

The rubric for choosing which agent writes a piece of work. Two readers, both models, neither a
script:

- **`feature` step 6**, once per task in a wave, to pick that task's agent.
- **The four [../agents/](../agents/AGENTS.md) definitions**, which name this file as what rated them.

Nothing else reads it. It is not in CLAUDE.md's routing table, because a routing table row is for a
change SURFACE and this is a dispatch decision.

# THE TIERS

Rate by the KIND of change, never by its size. A pattern repeated over twenty files is cheap. One
line carrying a decision is not.

| Tier | Agent | What it takes |
|---|---|---|
| `inline` | none | One place, wording already fixed. Do it yourself. |
| `haiku` | `haiku-agent` | The same edit at sites you can ENUMERATE. Wording already fixed. |
| `sonnet` | `sonnet-agent` | A new file or script following a pattern already in the repo. |
| `opus` | `opus-agent` | Anything carrying a decision. |
| `fable` | `fable-agent` | Long-horizon work whose steps cannot be listed up front. |

## The two ways this ladder collapses

**Rating prose `haiku` because it looks repetitive.** A rule stated in seven files is seven
decisions, because each one has a different reader and needs different words. Rated `haiku` it comes
back as seven identical sentences. In a config repo that is the most common task there is, and one
bad round of it teaches you to rate everything `opus` on sight, which ends the ladder.

**Rating `fable` because the task is big.** Size is not the test. Knowability is. Work whose steps
can already be listed is `opus` or below, however many steps there are.

## The rule that resolves a tie
Unclear → rate UP. Rating down produces work that has to be redone and reviewed; rating up costs
tokens. These are not the same size of mistake.

# WHEN NOT TO DISPATCH AT ALL
`inline` is a real answer and often the right one. Dispatch buys parallelism and a cheaper model; it
costs a round trip, a brief you have to write, and a worker that cannot see your context or ask you
anything. One edit in one file is not worth that.

Also stay `inline`, whatever the rubric says, when the change touches what the dispatch itself runs
under: `CLAUDE.md`, this file, `agent-worker.md`, the agent definitions, or the wave procedure in
`feature`'s `reference/waves.md`. Sending a worker to rewrite the rules it is at that moment obeying
leaves nothing recording which version it followed.

# IF YOU DISPATCH, THE BRIEF OWES THE WORKER
It cannot ask you anything. Anything missing here is missing for good.

- Its slice, and nothing else.
- Absolute paths for anything outside the repo it must read. A spec under `features/` above all:
  that directory is git-ignored, so a repo-relative path to one resolves to nothing.
- The rule files its surface needs, by absolute path. `CLAUDE.md`'s routing table decides which;
  the worker does not hold that table.
- Authorization for any run that spends the machine. Not in the brief means not permitted.
- Its write paths, as the only paths it may write. That boundary is the only thing keeping two
  workers in one wave from losing each other's edits, and the worker is the only actor who can
  respect it.

# WHAT IS NOT RATED
Work outside a `feature` run. A quick fix, a question, a bug hunt: no step rates those, and none is
dispatched. That gap is deliberate — see
[ADR 0012](../docs/adr/0012-remove-the-doorman-waves-dispatch-directly.md).
