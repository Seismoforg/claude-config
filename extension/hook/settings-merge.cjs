// settings-merge — the doorman's registration in ~/.claude/settings.json.
//
// It lives in hook/ rather than in src/ for one reason: the harness runs here. This is the riskiest
// code in the extension — it rewrites a file the user owns, holding their model, permissions, env
// and their own hooks — and while it sat in src/extension.ts beside `import * as vscode` it could
// not be executed outside VS Code, so it had no checks at all.
//
// node: builtins only, and no vscode import, so hook/test-hook.mjs can import it directly.
// Every path is a PARAMETER; nothing here reads homedir(). The caller owns where ~/.claude is,
// which is also what lets a check point the whole thing at a temp dir.
//
// .cjs, not .mjs, and it is the one file in hook/ that is not. It is a LIBRARY rather than a hook,
// with two callers that need different module systems: hook/test-hook.mjs imports it as ESM, and
// src/extension.ts compiles to CommonJS and requires it. CommonJS is the only format both load
// natively. MEASURED: tsc 5.7.2 under `"module": "commonjs"` downlevels `await import("./x.mjs")`
// to `require("./x.mjs")`, and whether that works on an ESM target depends on the Node inside
// whichever VS Code build is running — which `engines.vscode: ^1.90.0` does not pin. This format
// removes that dependency entirely.
const { readFileSync, writeFileSync, existsSync } = require('node:fs');

/**
 * The doorman's three registrations. `matcher` is only set where the event needs one.
 *
 * The PostToolUse entry is registered BESIDE the user's own TodoWrite hook rather than instead of
 * it: hooks on one event merge, and the matcher below narrows ours to TodoWrite.
 */
const HOOKS = /** @type {ReadonlyArray<{ event: string, script: string, matcher?: string }>} */ ([
  { event: 'UserPromptSubmit', script: 'doorman.mjs' },
  { event: 'SubagentStart', script: 'doorman-subagent.mjs' },
  { event: 'PostToolUse', script: 'doorman-todo.mjs', matcher: 'TodoWrite' },
]);

/** The command string settings.json stores. Forward slashes, because JSON would escape the others. */
const hookCommand = (launcherPath, script) => `node "${launcherPath.replace(/\\/g, '/')}" ${script}`;

/** An entry is OURS when it names the launcher, whatever path it named it by. */
const isOurs = (entry) => JSON.stringify(entry).includes('doorman-launcher');

/**
 * Merge the doorman registrations into settings.json.
 *
 * NEVER rewrites the file wholesale. It already carries the user's own hooks — the task-tick
 * registrations among them — and their model, permissions and env settings. Anything not ours is
 * read and written back untouched.
 *
 * Returns `{ ok: false, error }` rather than throwing: the caller is an activation path that must
 * report the failure, not die on it.
 */
const registerHooks = ({ settingsPath, launcherPath }) => {
  try {
    const raw = existsSync(settingsPath) ? readFileSync(settingsPath, 'utf8') : '{}';
    const settings = JSON.parse(raw);
    const hooks = settings.hooks ?? {};

    for (const { event, script, matcher } of HOOKS) {
      const entries = Array.isArray(hooks[event]) ? [...hooks[event]] : [];
      // Drop any previous doorman entry for this event, whatever path it named, then add the
      // current one. Matching on "doorman-launcher" rather than on the exact string is what makes
      // an upgrade idempotent instead of appending a duplicate on every activation. It also means
      // entries that are NOT ours — the user's task-tick hooks on this same event — are kept.
      const kept = entries.filter((e) => !isOurs(e));
      kept.push({
        ...(matcher ? { matcher } : {}),
        hooks: [{ type: 'command', timeout: 15, command: hookCommand(launcherPath, script) }],
      });
      hooks[event] = kept;
    }

    settings.hooks = hooks;
    writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
};

/** True when settings.json still names our launcher for every event. Any failure reads as false. */
const isRegistered = ({ settingsPath }) => {
  try {
    if (!existsSync(settingsPath)) return false;
    const hooks = JSON.parse(readFileSync(settingsPath, 'utf8')).hooks ?? {};
    return HOOKS.every(({ event, script }) => {
      const s = JSON.stringify(hooks[event] ?? []);
      return s.includes('doorman-launcher') && s.includes(script);
    });
  } catch {
    return false;
  }
};

// CommonJS is the format both callers load natively: an ESM `import` from the harness and a
// `require` from the compiled extension. Named exports survive both.
module.exports = { HOOKS, hookCommand, registerHooks, isRegistered };
