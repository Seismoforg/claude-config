# CORE CODING RULES

Load for every code change, in any language. The stack files (`typescript.md`, `react.md`,
`python.md`, `backend.md`) add to this; they never replace it.

# CLASSIFY THE CHANGE FIRST
Sets how much you read:
- **Small change** — bug fix, localized edit. Read the relevant files only. Don't scan the repo.
- **Feature** — new behavior. Read the affected modules. Widen scope only when you must.
- **Refactor** — structural. Full impact analysis allowed. Significant changes need approval first
  (REFACTORS below defines "significant").

# MATCH THE REPO
Repo patterns beat the defaults in this file. A deviation the whole repo shares is a convention,
not a finding. Never impose a structure the project does not use.

Two limits on that:
- A HARD RULE is never overridden. A repo-wide unsafe pattern — hardcoded secrets, weakened tests,
  logic in controllers — stays a defect however consistently it is repeated.
- The brief is to change how something LOOKS → the existing look is what is being replaced, not a
  convention to preserve. `design.md` owns that call.

# PRINCIPLES
Prefer: separation of concerns · small focused modules · reusable components · explicit
dependencies · consistent patterns.

Avoid: monolithic files · duplicated logic · hidden side effects · premature abstraction.

Write the minimum that solves the problem. No features beyond what was asked, no abstraction for
single-use code, no configurability nobody requested, no error handling for impossible cases.
200 lines that could be 50 → rewrite it.

Prefer a primitive that makes a rule unnecessary over rules patching a primitive's gaps. One
invariant needing three or more restatements means the mechanic is wrong, not the wording.

**Remove imports, variables and functions YOUR change orphaned.**

# FILE SIZE
Target 300–500 lines. Soft cap 700. Guidelines, not failures — a cohesive file slightly over beats
an arbitrary split. Too large → extract along seams (components, hooks, services, helpers). Never
split mid-responsibility.

# COMMENTS
A comment carries the WHY, in the fewest words that carry it. The code already says what.

- **One line is the default.** Two or three when the reason genuinely needs them.
- **A block over ~5 lines needs a reason to exist**, and "this logic is complicated" is not one. The
  reasons that qualify: a non-obvious constraint, a measured fact, a bug or ADR the code works
  around. Complicated logic is a naming or a splitting problem, not a commenting one.
- **A file-header essay, a section banner, a changelog, a summary of what your change did, and
  commented-out code are all deleted, never written.** Git holds every one of them.
- Never restate the next line, narrate a function step by step, or repeat the docstring in prose.
- A docstring states the CONTRACT — params, return, raises, side effects — not the implementation.
- Needing more than a few lines to explain a piece of code means the code is unclear. Rename it or
  split it; do not annotate around it.

Language, scope of edits and doc-level rules: `documentation.md`.

# CHANGE STRATEGY
**Never write or patch file content through the SHELL.** Three routes, all bad: a heredoc
(`cat > f <<'EOF'`, `python - <<EOF`), an inline interpreter (`node -e`, `perl -e`), a pattern
patcher (`sed -i`, `perl -i`). The payload is mangled in transit — backslashes eaten (`\n` lands as
a real newline, `\d` as a bare `d`), apostrophes breaking the quoting, CRLF defeating a multi-line
pattern. A QUOTED heredoc delimiter does not save it. Every route reports SUCCESS on a zero-match or
a corrupted write; the file-editing tool errors instead. This binds the SEARCH PATTERN as much as
the content. A multi-file sweep, a throwaway script, or an edit you will revert are not exceptions —
they are where it bites hardest: a mangled needle matches nothing, every replacement no-ops, and a
red proof reads as green.

Before an in-place edit of any prose or rule file, confirm the exact current text on disk. A
snapshot from earlier in the same session drifts once intervening edits shifted the file, and an
inexact match fails the edit.

Introducing a whole-repo formatter or linter alongside other edits → run the format pass FIRST, or
commit the functional changes before formatting, so mechanical churn lands in its own commit.

# REFACTORS
Before: identify affected files, assess risk, preserve behavior.

**"Significant" means ANY of:** more than 3 files touched · a public API or exported signature
changes · a module boundary moves · a folder or module is renamed or split.

Significant → capture it as a `feature` draft before touching code. Below the bar → an inline
approval question is enough, no feature file.

Moving, renaming or splitting files: TRACKED → `git mv`, to keep history. UNTRACKED → plain `mv`
(`git mv` fails with "not under version control"). Rewrite every affected import in one pass, then
run the project's typecheck or build. A missed reference fails silently until built.

Deleting or merging a SECTION of prose (doc, config) needs the same rigour with none of the safety
net — prose has no compiler. Before deleting, grep for BOTH pointers to it and the content itself.

# TESTS
Match the project's testing setup. Don't invent one it lacks.
- Project has tests → new behavior and bug fixes get tests. Bug fix: write the reproduction test
  first, then make it pass.
- Match the existing framework, layout and naming. Don't add a new test stack unasked.
- Never delete or weaken a test to make it green — fix the cause.
- No test setup at all → don't force one. Note the gap if the change is risky.

# RESEARCH ORDER
Local first: 1) relevant files 2) nearest `AGENTS.md` upward 3) `/features` specs 4) `/docs` and
ADRs 5) existing code.

Before offering a keep-vs-change choice about existing behavior, read the code that implements it.

Go external only for third-party APIs, framework/SDK updates, or version-specific behavior. Prefer
official docs, and check the INSTALLED version's docs. Consuming or pinning an external artifact at
a ref → read its API AT that ref, not a local copy that may be dirty or ahead of the pin.

Still unclear after local context → search the web. Never guess.

Adding or upgrading a dependency → also read `dependencies.md`.

# VERIFICATION
- Run compile/tests/smoke against the project's OWN toolchain — its virtualenv, lockfile,
  interpreter — never a global install.
- Long-running verification launched in the background must print UNBUFFERED (`PYTHONUNBUFFERED`,
  `stdbuf`, equivalent). A buffered pipe hides all progress until exit.
- A path that can run concurrently (scheduled, triggered, multi-user) gets exercised with runs
  OVERLAPPING. Green unit tests prove logic, never timing.
- A check fails again after a fix attempt → stop. Report the failure and your diagnosis. Do not
  weaken the check, skip it, or keep guessing at patches. Ask before a third attempt.

# HARD RULES
Non-obvious and high-severity only. The sections above are not repeated here.

- **Never hardcode secrets, API keys, tokens or credentials** in source. Use env vars or a secret
  manager, per the project's existing pattern. Notice one already committed → flag it immediately,
  don't silently fix unrelated instances. Reading a config or state file that may hold secrets →
  read only the keys you need; never dump the whole file into output or logs.
- **Threading a new param through a call chain:** confirm every function declares it AND every
  caller passes it — grep the name. A value used in a helper but only added to the outer function
  is a runtime error that typechecks.
- **A check guarded on a field's presence never fires when the field is ABSENT.**
  `if (cfg.x) validate(cfg.x)` passes everything when `x` is omitted. On a default-permissive
  setting, absence IS the dangerous case. Test for it explicitly.
- **Changing a DEFAULT another layer can also send** (client form, config file, CLI flag): grep
  every layer that supplies that value. The caller's own default silently overrides the new one,
  and it typechecks.
- **A field's value domain is set by its PRODUCER, not its type.** `string` hides how many values it
  emits — read the producing code before branching on it. A two-way test on an N-value field
  mislabels every other value.
- **A return value that conflates FAILURE with EMPTY reports false success.** Returning
  `[]`/`null`/`""`/`0` for both "failed" and "legitimately produced nothing" leaves the caller
  unable to tell them apart. Use a discriminated result (`{ ok, value | error }`), a status flag, or
  a thrown error. Most critical right before persisting or reporting an outcome.
- **A claim about how a backend BEHAVES is a claim, not a fact.** Its cost ("cheap", "negligible")
  or its failure mode ("X evicts Y", "X is the bottleneck") gets MEASURED on the target before it
  enters a comment, doc, rationale or a fix built on it. A cause reasoned from plausibility is not a
  measurement. Target is NON-DETERMINISTIC (generative model, sampler, timing, concurrency) → one
  run is not a measurement. Repeat the whole RUN, not more samples inside one: tight agreement
  inside a run is the harness being warm, not the target being stable. Before crediting a difference
  to your change, establish that it exceeds the spread between runs of the unchanged one.
- **Probe a CAPABILITY on an actor that HOLDS it.** Reading a command is not running it, and "the
  path is present" is not "the path works".

# BEFORE YOU CALL IT DONE
- [ ] No obvious duplication introduced
- [ ] File sizes within guidelines
- [ ] Architecture consistent with the surrounding code
- [ ] Existing patterns respected
- [ ] No unnecessary complexity or premature abstraction
- [ ] Orphaned imports, variables and functions your change made unused are removed
- [ ] Comments earn their lines — no essays, no banners, no restating the code
- [ ] Verification ran against the project's own toolchain
