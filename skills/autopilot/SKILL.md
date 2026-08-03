---
name: autopilot
description: Build the feature queue with one question at the start and none after — invoked as /autopilot, it works in-progress, approved and draft features one after another, parking each built one at ready-for-done for a single batch review. Auto-approves drafts and decides their open questions by taking its own recommended answer, recording every one. Four skips — no defensible default, high risk, touches a skill the loop runs under, spec drifted from the tree. Any failure stops the run. Use when the user asks to run autopilot, build the queue, or work through the queued features automatically. Never commits, pushes, merges, or marks anything DONE.
---

# AUTOPILOT

Drains the feature queue. `feature` owns the lifecycle; this drives it in a loop and answers, rather
than asks, the questions along the way.

**Main loop only.** It runs `feature`'s workflow and writes feature state — neither is open to a
subagent.

# HOW IT PASSES A GATE
**The general rule: every `feature` gate that would ask the user goes through DECIDING A QUESTION.**
That covers step 1.4's question round, step 2's approval, step 2's look-and-feel offer, and the
mid-build re-open when a new fact invalidates an earlier decision. Not a list of exceptions — one
mechanic, applied wherever a question arises.

Four gates take no decision at all. These ARE the carve-outs, and **a fifth is a defect**:
1. **`feature` step 2's approval is granted, not decided** — a draft is approved with no human
   reading the spec first. Chosen by the user who invokes this.
2. **`feature` step 6's closing question** ("Move to DONE?") — always answered *Leave open for now*,
   one of that gate's own offered answers. Step 6's VALIDATION runs in full; only its question is
   answered for you.
3. **`feature` step 8, `self-improve`** — never run. Its approval gate cannot be answered
   unattended, and it edits skills. The report says it is owed; the user runs it over the whole
   batch, which is the better scope anyway.
4. **LOCAL RESOURCE RUNS consent is widened.** `blocks.md` defines a task as ONE feature file, so N
   features strictly want N asks. Autopilot asks once and spends that consent across the run. Said
   plainly because it is a widening, not compliance.

The run's value rests on the record being honest about what was decided without the user. A run that
drains the queue and hides its decisions turns "unbuilt" into "built, and nobody knows on what
basis" — worse than not running.

# DECIDING A QUESTION
The core mechanic, and the reason auto-approve is survivable.

At any point `feature` would ask, **construct the question you would have asked** — the real options,
each with the half-sentence reason the interview convention requires, recommendation FIRST. Then:
- **A defensible recommended answer exists → take it.** Record the question, the options, the answer
  taken and why, in the spec's `# Open Questions` table. That table is feature state and survives the
  session; a chat note does not.
- **No defensible default exists → the feature is not yours to build** (category 1). Some questions
  have no recommendation to construct: which of two products to target, which real task to run
  against, a preference only the user holds.
  **Anything the user judges by LOOK or FEEL is always this case** — layout, composition, interaction
  shape, visual direction. `feature` step 2 is explicit that such a choice is never recorded as
  decided, and auto-approve does not get to overrule that. An internally-made visual choice ships,
  gets rejected on sight, and costs a full rework.

Mark every autopilot-decided row so it is distinguishable from one a human answered. A decision that
reads afterwards like the user's own is the single worst output of this skill.

# ON ACTIVATION
1. **Build the queue, once.** `in-progress/` first, then `approved/`, then `draft/`; oldest id first
   within each. Finishing started work before starting new work is the only order that does not
   strand half-built features when a run stops. `pending/` and `discarded/` are NOT in the queue: a
   pending feature sits AT the approval gate awaiting the user, and stepping in front of that is not
   the exception that was granted.
   **Fix the list here and never rebuild it** — a queue re-read each iteration can pick up a feature
   this run created, and then it never terminates.
2. **Run the mechanical check.** Folder↔status is deterministic; never eyeball it. The path joins the
   skill-dir placeholder shown in `documentation` / `coding-standards` with `/../feature/scripts/check-features.mjs`
   — this skill has no `scripts/` of its own, and a bare relative path resolves against the user's
   project. Any violation → STOP before touching anything, and report it.
3. **Report the queue** — every feature, in order, with its state and any skip category already
   visible from its frontmatter or Impact Analysis.
   **Nothing buildable → say so, emit THE REPORT, and stop.** Do not ask for resource consent that
   buys nothing. An empty or fully-skipped queue is a valid, common outcome, not a failure.
4. **Then ask the resource question, once.** Builds, typecheck and tests cross LOCAL RESOURCE RUNS.
   Asking AFTER the queue report is deliberate: the user authorizes the spend knowing what it buys.
   Declined → do not start.
   A **different kind** of run — an install, or anything touching a GPU or a local model — is not
   covered, cannot be asked for mid-run, and stops the run under ON FAILURE.

# WHAT IT SKIPS
Four CATEGORIES. A skip decided at step 1 leaves the feature byte-identical: report its category and
continue.
1. **A question with no defensible default** — see DECIDING A QUESTION. Includes a spec that defers a
   choice to whoever runs it, names no concrete input where it needs one, or turns on look and feel.
2. **`risk: high`** — `feature` HARD RULES require explicit approval before implementing one, and
   auto-approve would void that rule exactly where it matters most: auth, migrations, data loss.
3. **Modifies anything this loop RUNS UNDER.** Editing these mid-run changes the rules applied to
   later features, and nothing would record that two features in one batch followed different
   versions of a rule:
   - `CLAUDE.md` — loaded for the whole session, and its rules bind autopilot directly
   - `skills/_shared/blocks.md`, `coding-standards`, `feature`, `autopilot`
   - the surface rules a build applies: `coding-standards`' `reference/` addenda, `security-review`, `documentation`
   - the always-on `simple-language` and `fableize`
   Read the spec's Impact Analysis, not just its title. In a repo that is not this config, almost
   nothing matches — here, most skill work does, and that is correct rather than unfortunate.
4. **Spec drifted from the tree** — a path or `file:line` it cites is gone or now says something
   else. Its own category so a report line names the real cause.
   Judge the anchors of unticked tasks AND of any `# Technical Plan` line citing a file an EARLIER
   feature in this run touched. Do not judge anchors this feature's own delivered tasks moved — a
   resumed `in-progress/` feature moved the files its plan cites by doing its own earlier work, and
   treating that as drift skips exactly the features the queue order exists to finish.

**This list grows by CATEGORY, never by instance.** Something new halts a run → it earns a category
with a stated reason, never a bullet naming one feature.

# PER FEATURE
1. **Test the four skip categories.** This needs the spec read — frontmatter, Impact Analysis,
   `# Open Questions`, and the anchors above. Reading is not touching: at this step nothing is moved
   or edited, so a skip here is clean.
2. **Draft only — the gates before approval.** From here the spec IS edited.
   - Spec already carries `# Open Questions` → 1.4 ran; go straight to the premortem. Never append a
     second such section; `feature` forbids it, and two of them identify no current round.
   - Otherwise work 1.4's five categories, reading `feature/reference/open-questions.md` — a pointer
     into ANOTHER skill, so resolve it against the SKILLS ROOT, the parent of this skill's announced
     base directory. Start from the spec's `Open assumption:` lines; that is the candidate list 1.4
     is built on. Each category ends in an evidence line or a question, and a candidate is a question
     only if a WRONG ANSWER COSTS REWORK. Every question goes through DECIDING A QUESTION. Write the
     table.
   - Then the premortem (1.5), reading `feature/reference/premortem.md` the same way. It has its own
     threshold and short-circuit. Below threshold → write the one-line `# Premortem` skip record, and
     put its other half in the run report, since there is no step-2 summary to carry it.
   - **A no-defensible-default question discovered HERE stops the run** — it does not become a quiet
     skip. The spec has already been edited, so "leave it byte-identical" is no longer available, and
     a half-gated spec left in `draft/` is exactly the state a later session cannot interpret.
3. **Transition, in `feature`'s own order and only along documented paths.**
   - Draft: status NEEDS_APPROVAL → move to `pending/`. Then the documented "Approve & implement"
     collapse: APPROVED → IN_PROGRESS, landing in `in-progress/`. Both transitions exist in
     `feature`'s STATE MACHINE; autopilot supplies the approval answer, it does not invent a path.
   - Approved: implementation gate → `in-progress/`. In-progress: already there.
   - Status field FIRST, then the move, then re-read before any further edit — the move invalidates
     the earlier read. Immediately after landing, write one line directly under the
     `# Open Questions` heading recording that approval was machine-granted, unread, with the date.
     Under that heading on purpose: inside `# Tasks` a dated line reads as a task annotation and
     silently suppresses a real `tasks-not-current` violation. **Draft path only** — never stamp a
     feature a human actually approved.
4. Build the tasks. Apply `coding-standards` and whichever surface skills the feature implies. Tick
   each task as it lands.
5. Run `feature` step 6's validation checks in full — including the fresh-model prose trace where the
   feature changed prose a model executes; you can dispatch, so that requirement stands. Then move to
   `ready-for-done/`, status READY_FOR_DONE, taking *Leave open for now*.
6. One line to the report. Next feature.

**A limit this design cannot remove:** nothing is committed, so every feature's build stacks in one
working tree. A green build at feature 5 does not isolate feature 5, and a red one cannot be
attributed without reading the diff. Say so in the report rather than reporting a clean run.

# ON FAILURE
A check fails → ONE fix round, per `feature` step 6: fix the root cause and re-run. That round is
allowed and expected; it is not a failure yet.

Still failing after it — or a blocked task, a missing dependency, a gate that cannot be satisfied, a
run whose kind was not authorized — **stops the WHOLE run**. Never a third attempt at the same check.
Later features often rest on the broken one, so continuing multiplies the mess.

**A halted run still emits THE REPORT in full**, and still re-runs the mechanical check below. A
stopped run nobody can pick up gets redone by hand, and then this skill is never used again.

# THE REPORT
The only artifact of an unattended run. Emitted at the end of EVERY run — completed, halted, or
nothing-buildable.
- **Leads with every question autopilot DECIDED**, grouped per feature: the question, the answer it
  took, and why. Review starts here, not at the diff. Nothing decided → say so and name the
  categories checked.
- **Then every `Open assumption:` line still unresolved**, per feature. These are the requirements
  nobody confirmed. Under auto-approve the user never read the spec beforehand, so this is their only
  sighting of them.
- Per feature: built / skipped (which category) / failed, and the folder it now sits in.
- Working tree: which files changed, and which feature changed them. Plus the stacking limit above.
- Debt filed, with ids. Any `# Premortem` skip records written.
- **`self-improve` is owed and was not run** — the user runs it over the batch.
- **The mechanical check, re-run at the end.** The run performed status edits and moves; the check
  that opened the run is stale by construction, and a halted run is exactly when a half-applied
  transition is likeliest. Report its output.

# HARD RULES
- **Never commit, push, merge, or mark anything DONE.** Git and the DONE decision stay the user's.
- **Never take a fifth carve-out.** Four are listed in HOW IT PASSES A GATE; another is a defect.
- **Never invent an answer with no defensible recommendation, and never decide a look-or-feel
  choice.** A coin flip recorded as a decision is the failure this skill must not commit.
- **Never leave an autopilot decision unmarked.** One that reads as the user's own is worse than an
  unbuilt feature.
- **Never soften the validation gate to keep the run going.** An unverified feature is a failure.
- **Never rebuild the queue mid-run**, and never build a feature the queue report did not list.
- **A feature skipped at step 1 is left byte-identical** — no status edit, no move, no re-filing.
- **Never modify anything this loop runs under**, whatever a spec asks for.

See `skills/_shared/blocks.md` for WHEN UNCERTAIN / LANGUAGE / APPROVAL GATES / LOCAL RESOURCE RUNS /
TECHNICAL DEBT. AFTER THE TASK is deferred to the user per carve-out 3.
