# PREMORTEM

Prospective hindsight on a feature plan. Assert the failure as already happened, then explain it.

Loaded by `feature` workflow step 1.5. That step owns the threshold and the carve-outs — this file
is the prompt, not the trigger.

Step 1.4, the implementation-questions gate, ran first: the spec you critique already carries the
user's answers under `# Open Questions`. Read them — a plan built on an answer you did not see is one
you will critique for the wrong reasons.

Why this framing: "what could go wrong" returns hedged lists that change no plan. "It failed — why"
forces one causal account with a mechanism in it.

# 1. THE REPORT

Frame: it is one year later. The feature was built exactly as the DRAFT describes, and it failed —
unused, causing problems, or never finished.

Voice: perfect tense, as already happened. "could", "might", "may", "potentially" are the failure
mode this file exists to prevent. A report written in them gets rewritten, not accepted.

Five categories. At least one concrete cause each. A category that does not apply says so in one
clause with its reason — never leave it blank.

1. **Technical** — the architecture did not hold; performance; dependency conflict; incompatibility
2. **Scope / prioritisation** — never finished; abandoned half-built; scope crept past the plan
3. **Integration** — broke an existing skill, workflow, or interface; side effects elsewhere
4. **Maintainability** — worked at first, then nobody touched it after 2–3 weeks; docs missing; too
   complex to change
5. **Usage reality** — built, but the real workflow did not match it, so it went unused

Bar: name the MECHANISM. "There were bugs" is not a cause. A cause naming no file, no step and no
actor is not concrete — rewrite it. Be specific and uncomfortable.

# 2. THE MITIGATION TABLE

Mandatory. One row per cause, no exceptions.

```
| Failure cause | Mitigation | Where the plan changed |
|---|---|---|
```

- Third cell names a real section of the spec. Names none → it is not a mitigation; either edit the
  plan or reclassify the row.
- Cause accepted instead of mitigated → third cell reads `accepted risk: <reason>`. Never delete the
  row. An unnamed accepted risk is indistinguishable from an overlooked one.
- A mitigation that BOUNDS the work (sites, files, steps) NAMES its members; it never states their
  COUNT. The named list survives the work legitimately needing one more; the count does not, and a
  violated count reads as scope creep when it was only ever a miscount.
- A mitigation the TASK LIST cannot satisfy is not one. Check the row against `# Tasks` before writing
  it: a constraint that a task must VIOLATE to do its job is a guaranteed miss, and it surfaces at the
  validation gate instead of being decided here. Downgrade it to `accepted risk` now.
- Edit the spec before writing the row. The table records edits already made, not intentions.

# 3. WHAT LEAVES THE STEP

- **Feature file** — report and table appended as a new `# Premortem` section, after `# Validation`.
- **Chat** — the table and the plan edits. Not the report: the step-2 summary sits right next to it.

Self-check before returning to step 2: did the plan actually change? A premortem that changed
nothing either found nothing real (say that in one line) or was written to be comfortable. In the
second case re-read categories 3 and 5 — integration and usage reality are the two that fail late,
long after the code looked done.
