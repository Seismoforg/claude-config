---
status: superseded
date: 2026-08-01
---

**Superseded by [0003](0003-do-not-commit-the-generated-copilot-build.md)** — the build is now
git-ignored. The reasoning below is kept as the record of what was traded away.

# Context
`scripts/build-copilot.mjs` translates this config — skills, agents, `CLAUDE.md` — into the layout
GitHub Copilot expects. The output is derived: three data tables drive it, no model is involved, and
the same input always produces the same bytes.

Generated output is normally git-ignored.

# Decision
Commit the build to `github_build/`, and verify it with
`node scripts/build-copilot.mjs . --check`, which re-derives it and exits 1 on any difference.

# Rationale
The build is the artifact a Copilot user actually consumes. Ignoring it means nobody ever sees what a
skill edit did to the translation — a rewritten rule, a dropped frontmatter field, an agent that grew
past the length Copilot will honour. Committing it makes every one of those a reviewable diff.

`--check` is the half that keeps it honest. Edit a skill and the build goes stale silently; a build
nobody re-derives serves a config that no longer exists. The check turns staleness into a failing
command.

# Consequences
- Every skill, agent or `CLAUDE.md` edit must be followed by `node scripts/build-copilot.mjs .`, and
  `--check` belongs in the mechanical-check set. Skipping it ships drift.
- The committed bytes must be reproducible on any machine, which makes determinism a hard requirement
  rather than a nicety: directory reads that feed output are sorted, and the emitter uses a fixed key
  order.
- Line endings had to be pinned. MEASURED: with `core.autocrlf=true` and no `.gitattributes`, a fresh
  checkout produced 22 drifts against a re-derive — `--check` would have failed forever for anyone who
  cloned. Fixed in two paired halves: the script normalises every output file to LF, and
  `.gitattributes` carries `github_build/** text eol=lf` so git does not rewrite them on checkout.
  Normalising in the script alone is not enough.
- Diffs are larger: one skill edit touches its source and its translation.
