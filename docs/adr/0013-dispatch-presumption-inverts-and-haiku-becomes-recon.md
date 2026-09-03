---
status: accepted
date: 2026-09-03
---

# Context
`rules/dispatch-tiers.md` argued against its own mechanism. Its `WHEN NOT TO DISPATCH AT ALL` section
opened with *"`inline` is a real answer and often the right one"*, `README.md` repeated the sentence,
and `skills/feature/SKILL.md` step 6 repeated it again as *"`inline` is a real outcome"*. Three files
argued for not dispatching; nothing argued for dispatching. A wave build kept writing most of its own
tasks, buying neither the parallelism nor the cheaper model the mechanism exists for.

The tier table itself was five rows read at a glance plus a tiebreak: *"unclear → rate up"*. That
sentence existed because the rows did not separate cleanly, which made the outcome taste rather than
a derived result.

`haiku` sat on the write ladder with its own documented failure mode: a rule repeated across several
files, each with a different reader, rated cheap because it looked like repetition, came back as
identical sentences fitting one host and none of the others. The warning had been in the file since it
was written and had not stopped the misrating it described.

# Decision
**Three changes to `rules/dispatch-tiers.md` and the agents around it, all already built.**

1. **Dispatch became the presumption; `inline` became an exception that must be earned.** There are
   exactly two ways a task is built inline now: gate 0, mandatory and closed-list, or a judged
   exception written into the spec's `# Waves` line naming the task and why. A wave with no inline
   task states the literal phrase `no inline taken` — the same literalness `# Validation` already uses
   for `no debt taken`.
2. **The five-row table became an ordered gate procedure.** Gate 0 fires first and stops the
   procedure. Gates 1 (`fable` — are the steps unknowable up front?) and 2 (`opus` — does the task
   settle something?) are BOTH evaluated, and `max(gate 1, gate 2)` decides, on the order
   `fable` > `opus` > `sonnet`. Neither gate can swallow the other, and the old judgment tiebreak
   (*"unclear → rate up"*) is gone: the combining rule decides mechanically what taste decided before.
   Gate 2's prose disjunct is bounded to prose a reader must OBEY — stating a rule. Prose that
   DESCRIBES a rule already settled elsewhere (a README section, an ADR recording a decision already
   made, an `AGENTS.md` listing) settles nothing and falls to the floor, `sonnet`. Without that bound,
   gate 2 fires on nearly every task in a prose repo and the ladder collapses onto `opus` alone.
3. **`haiku` left the write ladder and became read-only recon.** `agents/haiku-agent.md`'s `tools:`
   dropped `Write` and `Edit`, leaving `Read, Grep, Glob, Bash` — the only enforcement in this system
   that is not prose. It is not rated by the procedure, has no place in the retry ladder (now
   `sonnet` → `opus` → `fable`), never appears as a `# Tasks` item, and fires whenever the main loop
   wants a lookup rather than a change — inside a wave, while a spec is still being written, or
   entirely outside a feature run. `rules/agent-worker.md` gained a short read-only report variant
   (`FOUND` / `SOURCES` / `COVERED` / `FRICTION` / `BLOCKED`) rather than a second method file.

`skills/feature/SKILL.md` was also added to gate 0's closed list — its step 6 IS the dispatch
procedure, and the list had been missing the one file that performs the dispatch. `SKILL.md`'s own
duplicate copy of that list was deleted, not updated: it now points at `dispatch-tiers.md`'s list
instead of restating it, so the list has one home.

# Rationale
- **A mechanism nobody argues for gets used as an exception, not a default.** Rewriting the sentence
  that told a builder inline was fine was the whole point; leaving it in place while changing the
  procedure around it would have left the presumption inverted in form only.
- **A combining rule replaces a tiebreak that admitted the rows did not separate.** `max(gate 1,
  gate 2)` derives the same answer every time from the same two yes/no questions; "unclear → rate up"
  depended on a reader's sense of where the ambiguity sat.
- **`haiku`'s failure mode was closed by removing the capability, not by warning harder.** The
  documented misrating survived years of the warning sitting in the file. A tool list a worker cannot
  bypass is enforcement; a sentence a rater can skim past is not.

# Consequences
- **A self-written inline justification is never refused by anyone.** The record's value is
  retrospective — a reader can see how often inline was taken and judge the pattern — rather than
  preventive. A closed list of permitted judged-exception cases was considered and rejected in favour
  of this recorded reason, because a closed list is exactly what constraining the reason's content
  would reinstate.
- **`dispatch-tiers.md` now describes two mechanisms under a filename naming one:** the rating
  procedure for write work, and the unrated recon dispatch. Renaming the file was rejected — it would
  break the pointer in all four agent definitions, in `README.md`, and in the two exclusion-table keys
  in `scripts/build-copilot.mjs` that name it by that filename. The file's own opening now names both
  mechanisms instead.
- `haiku` leaving the retry ladder means a task that would once have been retried `haiku` → `sonnet`
  is no longer rated `haiku` in the first place — the path is unreachable rather than broken.
- Recon firing outside a feature run does not reopen [ADR 0012](0012-remove-the-doorman-waves-dispatch-directly.md)'s
  boundary. That boundary governs work that WRITES; a read-only worker cannot lose a sibling's edit,
  which is the entire reason the wave boundary exists.
- ADR 0011 is amended, not superseded: its decision that step 6 rates and dispatches stands, and only
  its bullet naming `inline` as a legitimate outcome without qualification goes stale.
- ADR 0012 is amended, not superseded: its decision to remove the doorman stands, and only its
  consequence bullet claiming no tier rating at all outside a feature run is narrowed to write work.
