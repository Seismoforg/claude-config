---
status: superseded
date: 2026-09-02
---

**Superseded by 0012** (`0012-remove-the-doorman-waves-dispatch-directly.md`): the `extension/` tree
this ADR licensed a build step for is deleted. No extension, no build step, so the repo is
dependency-free again and the exception below has nothing left to apply to.

# Context
Until now every executable file in this repo was a single `.mjs` using `node:` builtins only. There
was no package manager, no lockfile, no `node_modules`, no compile step. `rules/AGENTS.md` states it
as a rule: "Node (`node:` builtins only) for the two check scripts. No package manager, no
third-party packages."

That held because everything the repo ran was a check over its own markdown. Nothing needed a
library, and nothing needed to be built before it could run.

The doorman breaks the second half of that. A VS Code extension is not a script: it is a package
with a manifest VS Code reads, an entry point VS Code imports, and a `.vsix` produced by a tool. It
cannot be a hand-written `.mjs`.

The first half turned out NOT to be broken, but only after a measurement. The doorman was designed
around a `claude-haiku-4-5` call from inside the hook, which meant bundling `@anthropic-ai/sdk` — a
real runtime dependency, shipped, executing before every prompt. Milestone 1 measured that no
credential the SDK can resolve exists on this machine, the pre-decided fallback dropped the
classifier, and the runtime dependency went with it.

So the question narrowed from "this repo now ships third-party code" to "this repo now has a build
step". Those are different decisions and only the second one is being taken.

# Decision
**`extension/` may use npm, TypeScript and a build step. Nothing else in the repo may, and nothing
that runs against a user's prompts may.**

- The four hook scripts under `extension/hook/` are `node:` builtins only, uncompiled, and ship as
  the same bytes that sit in the repo. They are what runs before every prompt in every project.
- `extension/src/extension.ts` compiles to `extension/out/`. Only VS Code loads it.
- All four npm packages are `devDependencies`: `typescript`, `@vscode/vsce`, `@types/node`,
  `@types/vscode`. There is no `dependencies` block, and adding one is the thing this ADR exists to
  make deliberate.
- `extension/node_modules/`, `extension/out/` and `extension/*.vsix` are git-ignored. The lockfile is
  committed.
- Building the extension is NOT required to use the doorman. The hooks run from the repo, or from an
  installed copy, either way without a build.

# Rationale
**The blast radius is the test, not the file count.** A dependency in the hook path executes before
every prompt the user types, in every project, with a 30-second budget before the session stalls.
A dependency in the build path executes when a developer types `npm run compile`. Treating those as
one risk would either have blocked the extension or licensed an SDK call in the hook; they are not
one risk.

**A `.vsix` has no hand-rolled form.** Unlike the check scripts, there is no version of this that a
single `.mjs` could be. The alternative was not "build it without npm", it was "do not build it" —
which was offered at the design gate as a Claude Code plugin and declined.

**The rule that survives is the one that was doing the work.** "No third-party packages" was never
really about the package manager; it was about what runs on a user's machine unattended. That part is
kept, verbatim, and is now the sharper rule: the hooks stay builtins-only. The part that fell is the
weaker half, and it fell for one directory.

**What this gives up, stated plainly:**
- A fresh clone can no longer build everything in it without a network fetch. The rules, the skills
  and the check scripts still work with nothing installed; the extension does not.
- `extension/` is a toolchain with exactly one consumer. Nothing else in the repo exercises npm or
  `tsc`, so a break there will be found late and repaired by someone re-learning a stack used in one
  folder. The premortem named this and it is accepted, not solved.
- The repo now has two kinds of executable with different rules, and the difference is a sentence in
  a doc rather than something a script can check.

# Consequences
- `rules/AGENTS.md`'s dependency rule is now specific to that tree rather than repo-wide.
- `scripts/build-copilot.mjs` walks `skills`, `rules` and `scripts`. `extension/` and `agents/` are
  outside all three, so neither is exported and neither triggers `uncovered-source-file`. Correct for
  `extension/`, which is meaningless to Copilot; a real gap for `agents/`, recorded in
  `agents/AGENTS.md` rather than fixed here.
- **ADR 0009 removed the `~/.claude/agents` junction. This feature restores it**, for a different
  roster: four model-tiered workers rather than the deleted role-based crew. ADR 0009 is amended
  rather than superseded — its decision to dissolve the old agent roster stands, and this is the
  rebuilt fan-out it said would come later.
- Two new rule files, `rules/doorman-tiers.md` and `rules/doorman-worker.md`, are read by a script
  and by a subagent rather than by the routing table. Both are excluded from the Copilot export in
  two places, and the exception is named in `rules/AGENTS.md`.
