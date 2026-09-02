# Purpose
The doorman: four hook scripts that put the tier rubric in front of the model, and a VS Code
extension that installs and operates them.

The split matters more than it looks. The **hooks** are the feature; they run before every prompt in
every project, from the CLI as readily as from VS Code. The **extension** only installs them and
shows what they did. Everything that can affect a prompt lives in `hook/`.

# Responsibilities
- Attach the rubric at the door, and the short reminder when a task starts
- Record every decision, and which agent actually started, to one log
- Install a launcher at a stable path and keep `settings.json` pointing at it
- Never stall, never block, never fail a prompt

# File Structure
- `hook/doorman.mjs`          — `UserPromptSubmit`: the full rubric as `additionalContext`
- `hook/doorman-todo.mjs`     — `PostToolUse`/`TodoWrite`: the short reminder on a task start
- `hook/doorman-subagent.mjs` — `SubagentStart`: which agent really started
- `hook/launcher.mjs`         — the stable path `settings.json` names
- `hook/settings-merge.mjs`   — the `settings.json` registration merge. A library, not a hook
- `hook/test-hook.mjs`        — the checks over the hooks and the merge. Dev only, excluded from
                                the `.vsix`
- `src/extension.ts`          — activation, status bar, three commands
- `.vscodeignore`             — what stays out of the package

# Key Components

## Two toolchains, one rule about which
`hook/` is `node:` builtins only, uncompiled, shipped as the same bytes that sit here. `src/` is
TypeScript and needs npm. The line is not stylistic: a dependency in `hook/` executes before every
prompt with a 30-second budget before the session stalls, while a dependency in `src/` executes when
someone types `npm run compile`. [ADR 0010](../docs/adr/0010-a-build-step-enters-a-dependency-free-repo.md)
owns that decision. There is no `dependencies` block in `package.json`, and adding one is the thing
that ADR exists to make deliberate.

## Why a launcher instead of registering the extension's own path
The extension's install path carries its version, so it changes on every upgrade, and VS Code does
not reliably run `deactivate()` on uninstall. A registration naming that path directly would keep
firing a hook that is no longer there — on every prompt, in every project, after the extension is
gone. `settings.json` therefore names `~/.claude/doorman-launcher.mjs`, which reads a pointer file
and hands over. Missing pointer, malformed pointer, missing target: exit 0, silently. That silence
IS the uninstall path.

## Fail-open, and why the log is not part of it
Every failure ends as exit 0 with empty stdout. The log is written on a best-effort `try` and its
failure is swallowed: diagnostics must never be able to take down the thing they diagnose.

## The two path traps, both measured
- **The hook's `cwd` is the SESSION's**, and it drifts into subfolders as work proceeds. Comparing it
  to the workspace folder for EQUALITY drops real entries and would have made the override never
  apply. Both sides use a prefix match that ends at a path boundary; a bare `startsWith` would also
  match a sibling `…-old`.
- **`prompt_id` is the join key.** A `subagent` line alone proves nothing — a dispatch can follow a
  prompt the doorman waved through. Influence is a `rubric` line and a `subagent` line sharing one
  `promptId`.

## Packaging is a denylist, deliberately
`.vscodeignore`, not `files` in `package.json`. vsce refuses both. The first `.vsix` built here
shipped one of four hook scripts because `files` was an allowlist with a forgotten entry, and vsce
exited 0. A denylist fails towards shipping something unnecessary, which is the harmless direction.

## The development loop, and what is live without one
Three things reach a running session by different routes, and only one of them needs a build:

| Changed | Reaches the session |
|---|---|
| `../rules/doorman-tiers.md` | immediately, via the `rules` junction. Never packaged |
| `../agents/*.md` | immediately, via the `agents` junction. Measured: no restart needed |
| `hook/*` | only through the pointer — see below |
| `src/extension.ts` | only after compile, package, reinstall and a window reload |

`~/.claude/doorman-install.json` decides which copy of `hook/` runs. **The extension rewrites it to
its own install path on every activation**, so pointing it at this repo is a per-session state that a
window reload silently undoes. Testing against the shipping state is therefore the default and needs
no maintenance; testing against the working tree means repointing after every reload, and being wrong
about which one is live looks exactly like a change that did not work.

`cat ~/.claude/doorman-install.json` answers which is running. A path under `.vscode/extensions` is
the shipping copy.

Shipping-state loop, in order: `npm run compile`, `npm run package`, install the `.vsix`, reload the
window. `cmp` the installed `hook/` against this tree to confirm what you are actually testing.

## Testing
`node hook/test-hook.mjs` — no framework, builtins only; it prints one line per check and its own
count. Every case runs against a throwaway home in a temp dir with `USERPROFILE`/`HOME` repointed, so
no test line reaches the real `~/.claude`. The merge checks reach a throwaway dir the same way, but
by PARAMETER rather than by environment: `settings-merge.mjs` reads no `homedir()`, so its caller
says where `~/.claude` is. A count is not repeated here on purpose: nothing greps for a number in
prose, so it would be wrong by the next check added.

## The merge is checked, and the checked copy is the running one
The `settings.json` merge is the riskiest code here — it rewrites a file holding the user's model,
permissions, env and their own hooks. It lives in `hook/settings-merge.cjs`, with checks over what it
must not damage: unrelated keys, a hook on an untouched event, the user's own hook on an event we do
share, idempotence across activations, replacing a stale launcher path rather than appending, the
matcher, and the missing and malformed file. `src/extension.ts` calls that module and holds no copy
of the logic.

**Why `.cjs` — the one file in `hook/` that is not `.mjs`.** It has two callers needing different
module systems: `test-hook.mjs` imports it as ESM, and the compiled extension requires it as
CommonJS. CommonJS is the only format both load natively. MEASURED: tsc 5.7.2 under
`"module": "commonjs"` downlevels `await import("./x.mjs")` to `require("./x.mjs")`, and whether
that works against an ESM target depends on the Node inside whichever VS Code build is running —
which `engines.vscode: ^1.90.0` does not pin. Also measured, both directions: `require` from
`out/extension.js`'s position resolves all four exports, and the harness's ESM import passes.

The remaining seam is the type assertion in `extension.ts`: tsc does not read the `.cjs`, so a drift
between the module and the asserted shape would compile clean. The assertion is kept minimal for
that reason, and the module stays the single source of the behaviour.

# Dependencies
Four npm packages, all `devDependencies`: `typescript`, `@vscode/vsce`, `@types/node`,
`@types/vscode`. The hooks depend on nothing.

# Related Modules
- Parent: [../](../README.md) — repo root, and the doorman section of the README
- [../rules/doorman-tiers.md](../rules/doorman-tiers.md) — the rubric and every tuning value
- [../agents/](../agents/AGENTS.md) — the four tiers a dispatch can name
