#!/usr/bin/env node
// launcher — the STABLE path that ~/.claude/settings.json points at.
//
// It exists because the extension's own install path changes on every version upgrade, and a
// registration naming that path keeps firing a hook that is no longer there. Worse, VS Code does not
// reliably run deactivate() on uninstall, so a stale registration would outlive the extension and
// fail on every prompt in every project, forever.
//
// This file is copied to ~/.claude/ once and never moves. It reads a pointer the extension rewrites
// on each activation, then hands over to the real hook.
//
// Usage, from settings.json:  node <home>/.claude/doorman-launcher.mjs doorman.mjs
//
// FAIL-OPEN, at every step. No pointer, unreadable pointer, no target: exit 0, silently. That is
// exactly the uninstall case, and a prompt must not notice.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';

const POINTER = join(homedir(), '.claude', 'doorman-install.json');

const script = process.argv[2];
if (!script || !/^[a-z0-9-]+\.mjs$/.test(script)) process.exit(0);

if (!existsSync(POINTER)) process.exit(0);

let hookDir;
try {
  hookDir = JSON.parse(readFileSync(POINTER, 'utf8')).hookDir;
} catch {
  process.exit(0);
}
if (typeof hookDir !== 'string' || !hookDir) process.exit(0);

const target = join(hookDir, script);
if (!existsSync(target)) process.exit(0);

// The hook scripts run their work on import, and they own their own exit. Importing rather than
// spawning keeps this to one process: a second node start would double the per-prompt cost of
// something that runs before every prompt.
await import(pathToFileURL(target).href);
