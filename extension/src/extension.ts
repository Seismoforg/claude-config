import * as vscode from 'vscode';
import { readFileSync, writeFileSync, copyFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// Runtime state lives in ~/.claude, beside the hooks that read it. None of it is versioned.
const CLAUDE_DIR = join(homedir(), '.claude');
const SETTINGS = join(CLAUDE_DIR, 'settings.json');
const LAUNCHER = join(CLAUDE_DIR, 'doorman-launcher.mjs');
const POINTER = join(CLAUDE_DIR, 'doorman-install.json');
const DISABLED = join(CLAUDE_DIR, 'doorman-disabled');
const OVERRIDE = join(CLAUDE_DIR, 'doorman-override.json');
const LOG = join(CLAUDE_DIR, 'doorman.log');

const TIERS = ['inline', 'haiku', 'sonnet', 'opus', 'fable'] as const;

// The settings merge lives in hook/, not here, because that is where the harness can reach it. It
// rewrites a file the user owns, and beside `import * as vscode` it could not be executed outside
// VS Code and so had no checks at all. Loaded by `require` rather than `import` because it is
// CommonJS: see the header of settings-merge.cjs for why that format and not .mjs.
//
// The shape is asserted rather than checked — tsc does not read the .cjs. A drift between the two
// would compile clean, so the assertion is deliberately minimal and the module is the single source
// of the behaviour.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const settingsMerge = require('../hook/settings-merge.cjs') as {
  registerHooks: (o: { settingsPath: string; launcherPath: string }) => { ok: boolean; error?: string };
  isRegistered: (o: { settingsPath: string }) => boolean;
};

type LogLine = {
  at?: string;
  promptId?: string | null;
  path?: string;
  reason?: string;
  tier?: string | null;
  agent?: string | null;
  cwd?: string | null;
};

/** Windows paths differ in case and separator between writers. Both sides are absolute. */
const norm = (p: string) => p.replace(/[\\/]+/g, '/').replace(/\/$/, '').toLowerCase();

/**
 * Is a log line's cwd inside this workspace?
 *
 * MEASURED: the hook inherits the SESSION's working directory, which drifts into subfolders as the
 * session works — one entry came back as `...\claude-config\extension` while the workspace folder
 * was `...\claude-config`. Comparing for equality dropped exactly the entries the status bar exists
 * to show. A prefix match on a path BOUNDARY is what this needs; a bare `startsWith` would also
 * match a sibling folder called `claude-config-old`.
 */
const inWorkspace = (cwd: unknown, folder: string | undefined): boolean => {
  if (!folder) return true;
  if (typeof cwd !== 'string') return false;
  const a = norm(cwd);
  const b = norm(folder);
  return a === b || a.startsWith(`${b}/`);
};

/** Merge the doorman registrations into settings.json. The checked module does the work. */
const registerHooks = (): { ok: boolean; error?: string } =>
  settingsMerge.registerHooks({ settingsPath: SETTINGS, launcherPath: LAUNCHER });

/** True when settings.json still names our launcher for every event. */
const isRegistered = (): boolean => settingsMerge.isRegistered({ settingsPath: SETTINGS });

/** Copy the launcher to its stable path and point it at this build's hook directory. */
const install = (context: vscode.ExtensionContext): { ok: boolean; error?: string } => {
  try {
    mkdirSync(CLAUDE_DIR, { recursive: true });
    const hookDir = join(context.extensionPath, 'hook');
    copyFileSync(join(hookDir, 'launcher.mjs'), LAUNCHER);
    writeFileSync(POINTER, `${JSON.stringify({ hookDir }, null, 2)}\n`, 'utf8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
};

const readLog = (): LogLine[] => {
  try {
    if (!existsSync(LOG)) return [];
    return readFileSync(LOG, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l) as LogLine;
        } catch {
          return null;
        }
      })
      .filter((l): l is LogLine => l !== null);
  } catch {
    return [];
  }
};

/**
 * What the status bar says about the last prompt in THIS workspace.
 *
 * The pairing is the whole point, and it is not cosmetic. MEASURED during milestone 4: a subagent
 * can start on a prompt the doorman waved through. A `subagent` line on its own is therefore not
 * evidence the doorman caused anything. Influence is a `rubric` line and a `subagent` line sharing
 * one promptId; anything else is a coincidence this must not take credit for.
 */
const describeLast = (folder: string | undefined): string => {
  const lines = readLog().filter((l) => inWorkspace(l.cwd, folder));
  const last = [...lines].reverse().find((l) => l.path !== 'subagent');
  if (!last) return 'no prompts yet';

  const dispatched = last.promptId
    ? lines.find((l) => l.path === 'subagent' && l.promptId === last.promptId)
    : undefined;

  if (last.path === 'pass') {
    // A dispatch here happened without the doorman: it never saw the prompt.
    return dispatched ? `waved through, ${dispatched.agent ?? 'agent'} ran anyway` : `waved through (${last.reason ?? '?'})`;
  }
  if (last.path === 'override') return `forced ${last.tier ?? '?'}${dispatched ? ` → ${dispatched.agent}` : ' → not dispatched'}`;
  return dispatched ? `rubric → ${dispatched.agent}` : 'rubric, no dispatch';
};

export const activate = (context: vscode.ExtensionContext): void => {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  item.command = 'claudeDoorman.toggle';
  context.subscriptions.push(item);

  const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  const refresh = (): void => {
    const off = existsSync(DISABLED);
    // Registration is checked on every refresh, not only at activation. settings.json has other
    // writers — by hand and through tooling — and a status bar reading only the log would keep
    // showing the last tier long after the hooks stopped running.
    if (!isRegistered()) {
      item.text = '$(alert) Doorman: not registered';
      item.tooltip = 'settings.json no longer names the doorman launcher. Reload the window to re-register.';
    } else if (off) {
      item.text = '$(circle-slash) Doorman: off';
      item.tooltip = 'Click to enable.';
    } else {
      item.text = `$(shield) Doorman: ${describeLast(folder)}`;
      item.tooltip = 'Click to disable. The status describes the last prompt in this workspace.';
    }
    item.show();
  };

  const installed = install(context);
  const registered = installed.ok ? registerHooks() : { ok: false, error: 'install failed' };
  if (!installed.ok || !registered.ok) {
    void vscode.window.showErrorMessage(
      `Doorman could not install itself: ${installed.error ?? registered.error}. The hooks are not active.`
    );
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeDoorman.toggle', () => {
      try {
        if (existsSync(DISABLED)) rmSync(DISABLED, { force: true });
        else writeFileSync(DISABLED, '', 'utf8');
      } catch (e) {
        void vscode.window.showErrorMessage(`Doorman: could not toggle — ${e instanceof Error ? e.message : String(e)}`);
      }
      refresh();
    }),

    vscode.commands.registerCommand('claudeDoorman.override', async () => {
      const picked = await vscode.window.showQuickPick(
        [
          { label: 'Wave the next prompt through', tier: null },
          ...TIERS.map((t) => ({ label: `Force tier: ${t}`, tier: t as string })),
        ],
        { placeHolder: 'Applies to the next prompt in this workspace only, then clears itself.' }
      );
      if (!picked) return;
      try {
        if (picked.tier === null) rmSync(OVERRIDE, { force: true });
        // The override names the workspace. Several Claude Code sessions share one ~/.claude, so an
        // unscoped one would be consumed by whichever session submits first.
        else writeFileSync(OVERRIDE, `${JSON.stringify({ tier: picked.tier, cwd: folder }, null, 2)}\n`, 'utf8');
      } catch (e) {
        void vscode.window.showErrorMessage(`Doorman: could not write the override — ${e instanceof Error ? e.message : String(e)}`);
      }
      refresh();
    }),

    vscode.commands.registerCommand('claudeDoorman.showLog', async () => {
      if (!existsSync(LOG)) {
        void vscode.window.showInformationMessage('Doorman: no log yet.');
        return;
      }
      await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(vscode.Uri.file(LOG)));
    })
  );

  // The log is appended by a separate process, so there is nothing to subscribe to. Polling is the
  // honest mechanism here; the interval is slow because this is a status line, not a readout.
  const timer = setInterval(refresh, 3000);
  context.subscriptions.push({ dispose: () => clearInterval(timer) });

  refresh();
};

export const deactivate = (): void => {
  // Deliberately empty. The registration must SURVIVE deactivation: the hooks serve the CLI and
  // every other window too, and VS Code does not reliably call this on uninstall anyway. The
  // launcher fails open once the build it points at is gone, which is what covers uninstall.
};
