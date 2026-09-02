#!/usr/bin/env node
// doorman — UserPromptSubmit hook. Decides which of three paths a prompt takes, and on the
// classifying path attaches the tier rubric as hook context so the main loop rates its own work.
//
// Node builtins only, on purpose. Milestone 1 measured that no credential the Anthropic SDK can
// resolve exists here, so there is no classifier, no network call and nothing to install.
//
// FAIL-OPEN IS THE WHOLE CONTRACT. This runs before every prompt in every project. Anything that
// goes wrong ends as exit 0 with empty stdout and a log line — never a stall, never a block. A
// UserPromptSubmit hook that hangs freezes the session until the 30s timeout.
import { readFileSync, appendFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const HOME = homedir();
const CLAUDE_DIR = join(HOME, '.claude');
const RUBRIC = join(CLAUDE_DIR, 'rules', 'doorman-tiers.md');
const AGENTS_DIR = join(CLAUDE_DIR, 'agents');
const LOG = join(CLAUDE_DIR, 'doorman.log');
const OVERRIDE = join(CLAUDE_DIR, 'doorman-override.json');
// Off is the PRESENCE of this file. One switch, not two: an `enabled` flag in the rubric would live
// in a git-tracked file and get committed by accident, and two switches for one thing is how they
// end up disagreeing. Untracked and per machine, like the rest of the runtime state.
const DISABLED = join(CLAUDE_DIR, 'doorman-disabled');

// Well under the hook's 30s. The work is two file reads, so this only ever catches stdin never
// arriving — the one thing here that can block indefinitely.
const DEADLINE_MS = 5000;

const TIERS = ['inline', 'haiku', 'sonnet', 'opus', 'fable'];

const DEFAULTS = { minPromptChars: 40, waveThroughSlashCommands: [] };

// Set once, as soon as the input parses. Every log line carries it, so the call sites do not have
// to remember to pass it — ten sites each repeating one field is how one of them ends up missing it.
let promptId = null;

/** Append one JSON line. Never throws: a failed log must not take the prompt down with it. */
const log = (entry) => {
  try {
    appendFileSync(LOG, `${JSON.stringify({ at: new Date().toISOString(), promptId, ...entry })}\n`, 'utf8');
  } catch {
    /* the log is diagnostics, not the feature */
  }
};

/** Emit nothing and leave the prompt alone. Every failure path ends here. */
const passThrough = (entry) => {
  log(entry);
  process.exit(0);
};

/**
 * Does this prompt's cwd fall inside the workspace the override names?
 *
 * Windows paths differ in case and separator between the two writers, so compare normalised. But
 * equality alone is wrong, and MEASURED to be wrong: the extension writes the WORKSPACE folder,
 * while the hook receives the SESSION's working directory, which drifts into subfolders as the
 * session works. One real entry read `...\claude-config\extension` against a workspace of
 * `...\claude-config`. Compared for equality, an override would silently never apply.
 *
 * The prefix must end at a path boundary. A bare startsWith would also match a sibling directory
 * named `claude-config-old`, which is a different project.
 */
const inWorkspace = (cwd, folder) => {
  if (typeof cwd !== 'string' || typeof folder !== 'string' || !folder) return false;
  const norm = (p) => p.replace(/[\\/]+/g, '/').replace(/\/$/, '').toLowerCase();
  const a = norm(cwd);
  const b = norm(folder);
  return a === b || a.startsWith(`${b}/`);
};

/**
 * Split the rubric into the script's half and the model's half. The config block is an HTML
 * comment so the file still reads as plain markdown, and it is STRIPPED before the rest is handed
 * to the model — config values are not instructions.
 * A missing or malformed block yields defaults rather than an error: the prose is the important
 * half, and a typo in the JSON must not silently disable the doorman.
 */
const parseRubric = (src) => {
  const m = src.match(/<!--\s*doorman:config\s*([\s\S]*?)-->/);
  let config = { ...DEFAULTS };
  let configOk = true;
  if (m) {
    try {
      config = { ...DEFAULTS, ...JSON.parse(m[1]) };
    } catch {
      configOk = false;
    }
  } else {
    configOk = false;
  }
  const prose = (m ? src.replace(m[0], '') : src)
    // The mid-turn reminder block goes too, markers and content. It is a condensed copy of the tier
    // table for the TodoWrite hook; a prompt arriving at the door gets the full table below it, so
    // shipping both would send the same list twice with the shorter one first.
    .replace(/<!--\s*doorman:reminder:start\s*-->[\s\S]*?<!--\s*doorman:reminder:end\s*-->/, '')
    .trim();
  return { config, prose, configOk };
};

/** Read stdin with a deadline. Sync reads cannot be timed out, so this one is async on purpose. */
const readStdin = () =>
  new Promise((resolve) => {
    let data = '';
    const done = (v) => {
      clearTimeout(timer);
      resolve(v);
    };
    const timer = setTimeout(() => done(null), DEADLINE_MS);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => {
      data += c;
    });
    process.stdin.on('end', () => done(data));
    process.stdin.on('error', () => done(null));
  });

const main = async () => {
  const raw = await readStdin();
  if (raw === null) passThrough({ path: 'pass', reason: 'no stdin within deadline' });

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    passThrough({ path: 'pass', reason: 'unparseable hook input' });
  }

  const cwd = typeof input.cwd === 'string' ? input.cwd : '';
  const prompt = typeof input.prompt === 'string' ? input.prompt : '';
  // Both this hook and SubagentStart receive prompt_id, so pairing "the rubric was injected" with
  // "a subagent then started" is an exact join rather than a guess by timestamp. Without it a
  // dispatch that followed a WAVED-THROUGH prompt is indistinguishable from one the doorman caused.
  promptId = typeof input.prompt_id === 'string' ? input.prompt_id : null;
  // ABSENT means "not a slash command", which means classify. Never treat absence as a match:
  // on this hook a normal prompt simply has no such field.
  const slash = typeof input.slash_command === 'string' ? input.slash_command.replace(/^\//, '') : null;

  // Checked before the rubric is even read: the cheapest possible path for the off state, since
  // this runs before every prompt in every project.
  if (existsSync(DISABLED)) passThrough({ path: 'pass', reason: 'disabled', cwd });

  if (!existsSync(RUBRIC)) passThrough({ path: 'pass', reason: 'rubric missing', cwd });

  let rubric;
  try {
    rubric = readFileSync(RUBRIC, 'utf8');
  } catch (e) {
    passThrough({ path: 'pass', reason: `rubric unreadable: ${e.code ?? 'error'}`, cwd });
  }

  const { config, prose, configOk } = parseRubric(rubric);

  // An override is consumed exactly once, and only by the workspace it names. Several sessions in
  // different projects share this one file; unscoped, the first prompt anywhere would eat it.
  let forced = null;
  if (existsSync(OVERRIDE)) {
    try {
      const ov = JSON.parse(readFileSync(OVERRIDE, 'utf8'));
      const mine = inWorkspace(cwd, ov.cwd);
      if (mine && TIERS.includes(ov.tier)) forced = ov.tier;
      if (mine) rmSync(OVERRIDE, { force: true });
    } catch {
      // A malformed override is removed rather than left to fail on every future prompt.
      try {
        rmSync(OVERRIDE, { force: true });
      } catch {
        /* nothing more to try */
      }
    }
  }

  if (!forced) {
    const list = Array.isArray(config.waveThroughSlashCommands) ? config.waveThroughSlashCommands : [];
    if (slash !== null && list.includes(slash)) {
      passThrough({ path: 'pass', reason: `slash command /${slash}`, cwd });
    }
    const min = Number.isFinite(config.minPromptChars) ? config.minPromptChars : DEFAULTS.minPromptChars;
    if (prompt.trim().length < min) {
      passThrough({ path: 'pass', reason: `shorter than ${min} chars`, cwd });
    }
  }

  if (forced === 'inline') passThrough({ path: 'override', tier: 'inline', cwd });

  // A directive naming an agent that does not exist makes the main loop improvise instead of
  // failing visibly. The junction is per machine and a fresh clone does not have it.
  const missing = TIERS.filter((t) => t !== 'inline').filter(
    (t) => !existsSync(join(AGENTS_DIR, `${t}-agent.md`))
  );
  if (missing.length) {
    passThrough({ path: 'pass', reason: `agent files missing: ${missing.join(', ')}`, cwd });
  }

  const header = forced
    ? `The doorman has forced tier \`${forced}\`. Dispatch this request to \`${forced}-agent\`.`
    : 'Rate the request against the rubric below and dispatch accordingly.';

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: `${header}\n\n${prose}`,
      },
    })
  );
  log({ path: forced ? 'override' : 'rubric', tier: forced ?? null, cwd, configOk });
  process.exit(0);
};

// Last resort. Anything unanticipated still leaves the prompt untouched.
main().catch((e) => passThrough({ path: 'pass', reason: `unexpected: ${e?.message ?? 'error'}` }));
