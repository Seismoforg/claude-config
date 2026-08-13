---
status: accepted
date: 2026-08-03
---

# Context
Three skills governed overlapping ground and had to be invoked together: `coding-standards` (all code),
`web-standards` (web/UI) and `taste` (frontend design). A frontend task needed all three. Nothing
enforced that, and a missed one silently did not apply — no error, no output difference, just rules that
never loaded.

The cost was spread across the repo rather than concentrated. `CLAUDE.md` §6 listed three routes and §7
spelled out how they composed. Every worker brief (`agents/dev.md`, `agents/pm.md`, `agents/tester.md`),
every `crew` dispatch rule, and two `audit-solution` dimensions named them separately. Each of those was
a place the set could be got wrong.

# Decision
`coding-standards` becomes the single entry point for any code work. The other two move into its
`reference/` tree and load on demand — the pattern the skill already used for `frontend.md`,
`python-ml.md` and `dependencies.md`.

- `web-standards/SKILL.md` → `coding-standards/reference/web.md`
- `taste/SKILL.md` → `coding-standards/reference/design.md`
- taste's nine reference files → `coding-standards/reference/design-<name>.md`
- `taste/scripts/preflight.mjs` → `coding-standards/scripts/preflight.mjs`
- `skills/web-standards/` and `skills/taste/` are deleted

The layout is FLAT with a `design-` prefix, not a nested `reference/design/`. Every future design
addendum is named `design-<name>.md`.

The pre-flight invocation line lives in `coding-standards/SKILL.md`, not in `reference/design.md`.

Content moves verbatim minus frontmatter. No rule is re-judged, rewritten or compressed.

# Rationale
**Addenda, not one file.** `coding-standards/SKILL.md` is preloaded on every code task. Inlining the
design material would make a backend Python edit carry banned hex palettes, marquee caps and
liquid-glass recipes. Addenda give one entry point without that cost.

**Flat, not nested.** Two mechanical reasons, both read from the build script:
`scripts/build-copilot.mjs:205` copies references with
`readdirSync(refDir).filter((f) => f.endsWith('.md'))` — non-recursive, and a subdirectory name fails
the `.md` filter, so a nested folder is silently dropped rather than errored. Its pointer regex at
`:150` ends with `([a-z0-9._-]+\.md)`, a character class that excludes `/`, so a two-level pointer
matches nothing and is emitted unrewritten. Flat costs zero build-script change.
`skills/self-improve/SKILL.md:91-92` also sanctions exactly two pointer forms, `reference/<file>.md` and
`<skill>/reference/<file>.md`; a second directory level fits neither. The `design-` prefix supplies the
grouping the nesting was reaching for.

**Pre-flight's invocation stays in SKILL.md.** The skill-dir placeholder substitutes at skill LOAD, not
on `Read`. A `reference/` file is only ever `Read`, so an invocation placed there would ship a literal
token to every reader.

# Consequences
- 16 skills become 14.
- Any invocation of `/web-standards` or `/taste` stops resolving. Local only.
- **Pre-flight ownership moves.** `coding-standards` is preloaded by every worker, so its placeholder
  now substitutes for a `dev`, which holds `Bash`. The `dev` runs pre-flight in its own worktree and the
  crew dispatch brief must name that run; the Teamleiter's run covers the integrated whole, which no
  worker can see. Before this change the run was Teamleiter-only because a worker that merely READ the
  file could not perform it — that reason is now false, and leaving it stated would have got the rule
  deleted as redundant with nothing replacing it.
- **Activation is the real risk and nothing checks it.** `coding-standards`' `description` now carries
  the web and design triggers too. `scripts/build-copilot.mjs:198-199` fails the build over 1024 chars,
  and that is the ONLY mechanical check on that field. Whether a design phrasing still MATCHES it is
  semantic, unverifiable by any script here, and fails silently — the rules simply stop loading. Same
  for `CLAUDE.md` §6's collapsed routing line. Both are checked by a fresh-model trace, not by a gate.
- No build-script change is required beyond one comment: the flat `reference/*.md` loop handles the new
  files, and the scripts loop already emits any `skills/<name>/scripts/*.mjs`.
- `~/.copilot/skills` keeps stale `web-standards/` and `taste/` folders after the next
  `--install-skills`. `scripts/build-copilot.mjs:379` never deletes, by design, and reports them
  instead.
  **Amended by [0007](0007-install-the-whole-config-not-only-skills.md)** — the flag is now
  `--install`. The stale-folder behaviour is unchanged: it still never deletes, and still reports
  them.
