# DEBUGGING

Load for a bug hunt — "why is this crashing", "this is broken", "why does this behave wrong".
Reproduce → isolate → fix the root cause → verify. `core.md` governs how the fix is written.

# 1. REPRODUCE FIRST
No fix attempt before you can trigger the bug on demand. Intermittent → characterize the trigger
condition before touching code.

A repro run that spends the machine (test suite, build, GPU, local model) asks the user first — see
`core.md` and CLAUDE.md §7. One bug hunt is one task, so you ask once, not per attempt. Declined →
the hunt stops on your side. Say plainly that you cannot reproduce it without that run and hand over
the exact command. Never fix blind instead.

# 2. ISOLATE
Binary-search the change (`git bisect` for a regression), build a minimal repro (strip unrelated
code and config until the smallest case that still fails), or bisect the stack or log for where
behavior diverges from expectation.

**Output EMERGES from interacting parts** — a simulation, solver, scheduler, layout engine,
retry/backoff? Do NOT tune a constant. Drive it headlessly and COUNT the defect, then bisect by
disabling each contributing part in turn. The one whose removal clears it is the cause. Tuning
without that measurement is a guess that passes review and comes back next round.

# 3. FIX THE ROOT CAUSE
The fix is a workaround rather than a root-cause fix → say so explicitly and say why (upstream bug,
time constraint), AND file it as a feature DRAFT before the hunt ends. A hunt has no feature file to
note debt in, so there is no two-step deferral: write the DRAFT or the record is gone. Claim the
file with `new-feature.mjs`; the `feature` skill owns the invocation.

Already handed the whole thing off as a feature draft → that draft IS the record. One shortcut, one
file, never two.

# 4. VERIFY
Same failure loop as everywhere: fails again after a fix attempt → stop, report the failure and your
diagnosis. Do not weaken the check, skip it, or keep guessing. Ask before a third attempt.

Where the project has tests, a bug fix gets its reproduction test first (`core.md` TESTS).

# HAND-OFF
The fix needs a structural change — more than 3 files, a public signature, a module boundary, a
rename or split — → stop the ad-hoc hunt and capture it as a `feature` draft instead. Unless the
user, told it is structural, explicitly chooses to keep it ad-hoc; then continue.

# HARD RULES
- **Never fix before you can reproduce.** A declined resource run does not lift this — it ends the
  hunt on your side, with the command handed over.
- **Never tune a constant on an EMERGENT output.** Measure the defect, then bisect the parts.
- **Never weaken, skip or re-guess a check that failed twice.** Ask before a third attempt.
- **A workaround is DEBT and gets its file before the hunt ends.**
