---
status: accepted
date: 2026-08-01
---

# Context
[ADR 0002](0002-commit-the-generated-copilot-build.md) committed the generated Copilot build to
`github_build/` so that a diff would show what each skill edit did to the translation, and added
`node scripts/build-copilot.mjs . --check` to catch a stale build.

In practice the cost lands on every commit. The build is 47 files. One edit to a widely-referenced
skill regenerates a large share of them, so a two-line rule change arrives as a twenty-file diff. The
translation churn buries the source change it came from — the opposite of what committing it was
meant to achieve.

# Decision
Git-ignore `github_build/`. Rebuild locally with `node scripts/build-copilot.mjs .` when a Copilot
export is wanted. `--check` is no longer a repo gate.

# Rationale
The review value 0002 wanted assumed someone reads the translation diff. A diff nobody can read
through is not review, and the churn made every source diff harder to read as well.

`--check` cannot survive the change and is not kept as a token: with nothing committed, a fresh clone
has no `github_build/` at all, so every file reports `missing` and the check can never pass. Run
after a local build it passes trivially, comparing a build against itself. Either way it stops being
a gate, so it comes out of the mechanical-check set rather than staying there as one that "usually
passes".

# Consequences
- Mechanical checks drop from four to three: `check-agents`, `check-features`, `check-docs`.
  **Amended 20260804 (no ADR — check scripts added since):** that count is stale, and so was the
  20260803 amendment that put it back at four. `README.md` is the live roster. What still stands is
  this ADR's decision: `--check` is not one of them and is not a gate.
- Nothing detects a stale build, because there is no committed build to go stale. The build is
  produced on demand and is correct by construction at that moment.
- A skill edit no longer has a mandatory rebuild step. Anyone exporting to Copilot runs the build
  themselves.
- The `github_build/** text eol=lf` rule left `.gitattributes` — it governed files git no longer
  stores. `scripts/*.mjs text eol=lf` stays: the check scripts are still copied verbatim into the
  build, and CRLF on the source would make the copy differ from it.
- Reversing this means re-tracking 47 files and re-reading 0002, including the measured
  line-ending trap: with `core.autocrlf=true` and no `.gitattributes` rule, a fresh checkout produced
  22 drifts against a re-derive.
- `scripts/build-copilot.mjs` keeps `--check`. It is still useful ad hoc ("did my edit change the
  translation?"); it is just not something CI or a contributor is expected to run.
