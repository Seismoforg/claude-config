# DISPATCH TIERS

Two mechanisms live here, and the filename names only the first.

- **Rating** — which agent writes a piece of work. A procedure, run once per task in a wave.
- **Recon** — a read-only worker the main loop fires to look something up. Deliberately not rated,
  and not part of the procedure at all. See RECON below.

Read by models, never by a script:

- **`feature` step 6**, once per task in a wave, to rate that task and dispatch it.
- **The four [../agents/](../agents/AGENTS.md) definitions**, which name this file as what rated them.
- **The main loop**, whenever it wants a lookup rather than an edit.

Nothing else reads it. It is not in CLAUDE.md's routing table, because a routing table row is for a
change SURFACE and this is a dispatch decision.

# DISPATCH IS THE PRESUMPTION
The wave build exists to spend a cheaper model and to write several tasks at once. A task the main
loop writes itself buys neither. So the question at each task is not "is this worth dispatching" but
**"what stops this from being dispatched"** — and the answer has to be one of the two below, written
down, or the task is dispatched.

This is a reversal of how this file used to read, and it is the whole point of the rework.

# RATING WRITE WORK

Rate by the KIND of change, never by its size. A pattern repeated over twenty files is cheap. One
line carrying a decision is not.

## Gate 0 — does the task edit what the dispatch itself runs under?
Yes → **`inline`**. Mandatory, no judgment, and the procedure stops here. The list is closed:

- `CLAUDE.md`
- `rules/dispatch-tiers.md` (this file)
- `rules/agent-worker.md`
- any file under `agents/`
- `skills/feature/SKILL.md`
- `skills/feature/reference/waves.md`

Sending a worker to rewrite the rules it is at that moment obeying leaves nothing recording which
version it followed. `SKILL.md` is on the list because its step 6 *is* the dispatch procedure — the
list was missing it, which made the one file that actually performs the dispatch the one file a
worker was allowed to rewrite mid-dispatch.

**This list has one home.** Anywhere else that needs it points here rather than restating it. Two
copies of a list nothing greps drift, and the drift surfaces as a worker dispatched onto a file
somebody had already protected.

## Gates 1 and 2 — both are evaluated, and the HIGHER tier wins
Not first-match. Run both, take `max(gate 1, gate 2)` on the order `fable` > `opus` > `sonnet`.

- **Gate 1 — are the task's steps unknowable up front?** → **`fable`**.
  Knowability, never size. Work whose steps can already be listed is `opus` or below, however many
  steps there are. This is the most expensive tier, and a task routed here that `opus` could have
  taken is money spent on nothing.

- **Gate 2 — does the task settle something?** → **`opus`**. Any one of:
  - it states a rule in prose,
  - an exported signature or a module boundary moves,
  - it touches auth, sessions, input handling or external payloads,
  - the spec still lists it as an `Open assumption:`.

  **Bound on the prose disjunct.** "States a rule" means prose a reader must OBEY. Prose that
  DESCRIBES a rule settled elsewhere — a README section, an ADR recording a decision already made, an
  `AGENTS.md` file listing — settles nothing and falls through to the floor. Without this bound gate 2
  fires on nearly every task in a prose repo, everything rates `opus`, and the ladder collapses to one
  rung.

- **Floor — neither gate fired** → **`sonnet`**. A new file, script or component whose content the
  brief settles and whose form comes from the repo.

**Taking the max is what replaces judgment here.** A task with unlistable steps that also settles
something is `fable`, and neither gate can swallow the other. The old version of this file needed a
tiebreak — *unclear → rate up* — because five rows read at a glance did not separate. A combining
rule decides mechanically what taste decided before.

`haiku` is not a gate outcome. It writes nothing; see RECON.

## The way this ladder still collapses
**Rating prose `haiku`-cheap because it looks repetitive.** A rule stated in seven files is seven
decisions, because each one has a different reader and needs different words. Rated as mechanical it
comes back as seven identical sentences that fit one host and none of the others. In a config repo
that is the most common task there is. The tool list on the recon agent now makes the `haiku` version
of this mistake impossible, but the same misreading still lands such a task on `sonnet` when it is
`opus` work.

# INLINE IS THE EXCEPTION
Two ways a task is built inline, and there is no third.

1. **Gate 0.** Mandatory. The justification is naming the file.
2. **A judged exception** — dispatching is genuinely impossible or pointless. No dispatch mechanism
   is reachable on this target; or the task's entire content is already written verbatim in the spec
   and handing it over would be transcription with extra steps.

**A judged exception is written down, in the spec's `# Waves` section, on that wave's line: which
task, and why.** A wave where no task was built inline says so in the literal phrase
`no inline taken`. Silence is not distinguishable from a forgotten line, and a record that fails
exactly when it is needed is not a record. Same precedent, and same literalness, as `no debt taken`
in `# Validation`.

Stated plainly, because it is the known weakness: a reason you write for yourself is never refused.
The record's value is retrospective — a reader can see how often inline was taken and judge the
pattern — not preventive.

# RECON — the unrated dispatch
`haiku-agent` holds no `Write` and no `Edit`. It reads, searches and reports back. That is enforced by
its tool list rather than by prose, which is why the failure mode above cannot reach it.

**Fire one when you want to know something, not when you want something changed.** Sweeping a tree
for every site of a pattern, reading several files to answer one question, checking whether a symbol
is still referenced, finding the precedent for a change you are about to plan. The answer comes back
with `path:line` evidence; the main loop decides what to do with it.

**It is not rated, and that is deliberate.** The procedure above answers "who writes this", and a
recon worker writes nothing. It has no `writes` column, so it cannot collide with anything, which is
the entire reason waves have boundaries.

**It fires whenever the main loop wants it** — while writing a spec, during a step-1 grep, in the
middle of a wave, or outside a feature run altogether. This does not reopen the boundary in
[ADR 0012](../docs/adr/0012-remove-the-doorman-waves-dispatch-directly.md): that boundary governs
work that WRITES. A read-only worker cannot lose a sibling's edit.

**It does not appear in `# Tasks`.** A lookup is not a unit of work a spec tracks, and requiring one
to be planned would put it out of reach at exactly the moment it is most useful — before the task
list exists.

# IF YOU DISPATCH, THE BRIEF OWES THE WORKER
It cannot ask you anything. Anything missing here is missing for good.

- Its slice, and nothing else.
- Absolute paths for anything outside the repo it must read. A spec under `features/` above all:
  that directory is git-ignored, so a repo-relative path to one resolves to nothing.
- The rule files its surface needs, by absolute path. `CLAUDE.md`'s routing table decides which.
  **Its always row is TWO files, `core.md` and `documentation.md`**, and both go in every brief — a
  rule that "always applies" is the one most easily left out of one.
  **The worker reads those two itself as well**, per `agent-worker.md`, and it can look a missing row
  up in the table it inherits. That is a NET, not a reason to write a thinner brief: the worker's
  copy of the table is a session-start snapshot that goes stale, and only the brief knows which
  surface this slice actually touches. Both channels, every dispatch.
- Authorization for any run that spends the machine. Not in the brief means not permitted.
- Its write paths, as the only paths it may write. That boundary is the only thing keeping two
  workers in one wave from losing each other's edits, and the worker is the only actor who can
  respect it.

**A recon brief owes all of that except the last line**, which has nothing to name. Say instead that
the worker writes nothing, so a report claiming a file changed is itself the error.

# WHAT IS NOT RATED
- **Work outside a feature run.** A quick fix, a question, a bug hunt: no step rates those, and none
  is dispatched. That gap is deliberate — see
  [ADR 0012](../docs/adr/0012-remove-the-doorman-waves-dispatch-directly.md).
- **Recon.** Unrated by design rather than by omission, for the reason given above.
