---
name: debugging
description: Use for an ad-hoc bug hunt outside a feature lifecycle — "why is this crashing", "this is broken", "why does this behave wrong". Reproduce → isolate → fix root cause → verify. Hands off to /feature if the fix turns structural.
---

# DEBUGGING

Ad-hoc bug hunt not tied to a `feature` draft. Composes with `coding-standards`
(how to write the fix) and `feature` (hand-off when the fix turns structural).

- **Step 1 — Reproduce first.** No fix attempt before you can reliably trigger the bug
  on demand. Intermittent → characterize the trigger condition before touching code.
- **Step 2 — Isolate.** Binary-search the change (`git bisect` if it's a regression),
  minimal repro (strip unrelated code/config until the smallest case that still fails),
  or bisect the stack/log for where behavior diverges from expectation.
- **Step 3 — Fix the root cause, not the symptom.** If the fix is a workaround rather
  than a root-cause fix, say so explicitly and explain why (upstream bug, time constraint).
- **Step 4 — Verify.** Same failure-loop rule as `feature` step 6: fails again after a
  fix attempt → stop, report the failure and diagnosis, don't weaken/skip the check or
  keep guessing; ask before a third attempt.
- **Tests.** Per `coding-standards` TESTS section — bug fix gets a reproduction test
  first where the project has tests. Don't restate it here.

Hand-off: if the fix needs a structural change (per `coding-standards` REFACTOR RULES
threshold), stop the ad-hoc hunt and capture it as a `feature` draft instead — UNLESS
the user, told it's structural, explicitly chose to keep it an ad-hoc fix; then continue
but stay surgical.

See `skills/_shared/blocks.md` for WHEN UNCERTAIN / AFTER THE TASK / LANGUAGE.
