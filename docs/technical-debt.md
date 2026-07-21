# Technical Debt

## Crew redesign never run end-to-end  (added 2026-07-21)
- Problem: `features/done/20260721-0002-crew-integration-redesign.md` carries status DONE with one Task
  unchecked (line 126). The redesign it shipped — read-only `tester`, `git merge --no-ff` integration,
  worktrees restricted to parallel work — was never run end-to-end. It is statically verified and
  prose-traced only; the file states this at lines 177-186. The harness still served the pre-edit
  `tester` that session, so the session that shipped the design could not exercise it.
- Impact: Nothing revisits a file in `features/done/`. A future session invoking `crew` gets no signal
  that the core mechanic is unproven.
- Proposed Resolution: Run a full crew feature lifecycle in a fresh session, then check off the deferred
  task in that feature file.
