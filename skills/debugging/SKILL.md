---
name: debugging
description: Use for an ad-hoc bug hunt outside a feature lifecycle — "why is this crashing", "this is broken", "why does this behave wrong". Reproduce → isolate → fix root cause → verify. Hands off to /feature if the fix turns structural.
---

# DEBUGGING

Ad-hoc bug hunt not tied to a `feature` draft. Composes with `coding-standards`
(how to write the fix) and `feature` (hand-off when the fix turns structural).

- **Step 1 — Reproduce first.** No fix attempt before you can reliably trigger the bug
  on demand. Intermittent → characterize the trigger condition before touching code.
  A repro run that qualifies under LOCAL RESOURCE RUNS (`skills/_shared/blocks.md`) asks
  the user first — one bug hunt is one task, so you ask once, not per attempt. Declined →
  the hunt stops on your side. Say plainly that you cannot reproduce it without that run,
  and hand over the exact command. Never fix blind instead; this step forbids it.
- **Step 2 — Isolate.** Binary-search the change (`git bisect` if it's a regression),
  minimal repro (strip unrelated code/config until the smallest case that still fails),
  or bisect the stack/log for where behavior diverges from expectation.
  Output EMERGES from interacting parts (a simulation, solver, scheduler, layout,
  retry/backoff)? Do NOT tune a constant. Drive it headlessly and COUNT the defect
  (that drive is subject to LOCAL RESOURCE RUNS too),
  then bisect by disabling each contributing part in turn — the one whose removal
  clears it is the cause. Tuning without that measurement is a guess that passes
  review and repeats for rounds.
- **Step 3 — Fix the root cause, not the symptom.** If the fix is a workaround rather
  than a root-cause fix, say so explicitly and explain why (upstream bug, time constraint) —
  AND file it as a feature DRAFT in `/features/draft/` before the hunt ends. A hunt has no
  feature file to note it in, so the two-step deferral does not apply here: write the DRAFT
  straight away or it is gone. TECHNICAL DEBT in `skills/_shared/blocks.md` owns the rule.
  Already handed off as a feature draft (see the hand-off line below, when the user chose to keep
  a structural fix ad-hoc) → that draft IS the record. One shortcut, one file; never two.
- **Step 4 — Verify.** Same failure-loop rule as `feature` step 6: fails again after a
  fix attempt → stop, report the failure and diagnosis, don't weaken/skip the check or
  keep guessing; ask before a third attempt.
- **Tests.** Per `coding-standards` TESTS section — bug fix gets a reproduction test
  first where the project has tests. Don't restate it here.

Hand-off: if the fix needs a structural change (per `coding-standards` REFACTOR RULES
threshold), stop the ad-hoc hunt and capture it as a `feature` draft instead — UNLESS
the user, told it's structural, explicitly chose to keep it an ad-hoc fix; then continue
but stay surgical.

See `skills/_shared/blocks.md` for WHEN UNCERTAIN / AFTER THE TASK / LANGUAGE / LOCAL RESOURCE RUNS / TECHNICAL DEBT.
