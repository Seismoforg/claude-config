# OPEN QUESTIONS

Prospective implementation on a feature plan. Put yourself one day ahead, about to build it, and find
what you cannot start without.

Loaded by `feature` workflow step 1.4, the implementation-questions gate. That step owns the trigger
and the carve-outs — this file is the prompt, not the trigger.

Frame it as "you are starting tomorrow — what blocks you?", never "is anything unclear?".

# 1. THE CANDIDATE LIST — start here, not from a blank page

Read the spec's `Open assumption:` lines FIRST. They are the candidate list. `grilling`
writes one for everything its interview could not settle, and an inline spec writer produces them at
step 1. Those two are the only producers — the premortem writes none, so do not go looking for
premortem-authored assumptions on a revision.

Generating categories from scratch instead re-asks a question the user already answered.

Then walk the five categories below for what the assumption list missed.

# 2. THE FIVE CATEGORIES

Every one gets an outcome. Never blank.

1. **Data & inputs** — what actually arrives, in what shape, from where.
2. **Done-criterion** — how each task is observably finished. What "works" means, in what you can see.
3. **Contract with untouched code** — what the plan assumes about code it does NOT change: a
   signature, a default, an invariant, a call order.
4. **Edge, empty, limit, repeat** — zero items, one item, the boundary, running it twice.
5. **Order & dependency** — what must land before what, and what breaks if one part ships alone.

**Look and feel is NOT a category here.** `feature` step 2 already offers those options at the
approval gate; asked in both places, one question collects two answers.

# 3. WHAT COUNTS AS A QUESTION

**The cost test: a wrong answer must cost rework.** That is the whole bar, and it applies at every
count — not only when you have more candidates than you can ask. Naming, wording, and anything you
would shrug at either way are below it.

**Answerable by reading = not a question.** Read it, settle it.

Each candidate ends in exactly one of three forms — never a fourth, and never blank:
- a QUESTION to the user,
- `settled by <evidence>` — a repo `file:line`, an earlier answer from the user, or, when nothing
  turns on it, `no consequence either way`, or
- `deferred` — it qualified but lost the ranking in §4. Five categories can each yield a qualifying
  question against a cap of four, so this form is routine, not an edge case.

**Evidence may NEVER be the spec you are writing.** A spec that settles its own open question is
circular and always succeeds.

# 4. ASKING

One round. One `AskUserQuestion` call, max 4 questions — the harness caps it there.

**Every question goes through `AskUserQuestion`, as OPTIONS.** That tool takes no open prompt: each
question needs 2-4 choices. A question whose answer structurally cannot be an option (an exact format,
a name, a path) still gets options — the plausible candidates, with the one you would otherwise have
assumed listed first and marked as such. The user's own "Other" covers the rest. Never fall back to a
free-text question in prose.

More than 4 qualify → rank by cost of a wrong answer, ask the top 4. The rest go into the section as
deferred, each naming what it would have asked.

Nothing qualifies → ask nothing. The gate still ran; five evidence lines are its record.

# 5. THE SECTION

Append `# Open Questions` at the END of the feature file — after `# Validation` on a first run, since
no `# Premortem` can exist yet. Re-running on a revision → EXTEND that section, never append a second.

One row per category, and one row PER QUESTION where a category yields more than one — the answer and
the "what changed" cell have to read back against a single question:

```
| Category | Question / settled by | Answer | What changed in the spec |
|---|---|---|---|
```

- Edit the spec BEFORE writing the row. The last cell records edits already MADE, never intentions.
- Answer that changed nothing → say so in that cell, with why. Never leave it empty.
- User declined to decide, or answered "Other" without settling it → it becomes an `Open assumption:`
  line under `# Technical Plan`, and step 2's summary carries it to the gate.
- Deferred question (over the cap) → its own row, `deferred` in the answer cell, with what it would
  have asked.

# 6. WHAT LEAVES THE STEP

- **Feature file** — the `# Open Questions` section, plus every spec edit the answers forced.
- **Chat** — nothing on its own. Step 2's summary carries the answers to the approval gate.

Self-check before going on to 1.5: did any answer change the plan? None did, and none was even
asked → re-read categories 1 and 3. Data shape and the contract with code you are not touching are
where a plan is wrong without looking wrong.
