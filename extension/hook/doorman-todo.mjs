#!/usr/bin/env node
// doorman-todo — PostToolUse hook on TodoWrite. The doorman DURING the work.
//
// UserPromptSubmit fires once per user message; everything the main loop does afterwards in the
// same turn happens where the door hook cannot see, and that is most of the work. This fires each
// time a task starts, which is when a new piece of work is chosen.
//
// MEASURED 2026-09-02: a PostToolUse hook CAN inject context the model sees mid-turn, with no new
// user prompt. The payload carries `tool_input.todos` (content, status, activeForm), plus prompt_id
// and cwd, so the filter needs nothing the hook cannot see.
//
// Fail-open, like its siblings. This runs after every TodoWrite in every project.
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CLAUDE_DIR = join(homedir(), '.claude');
const RUBRIC = join(CLAUDE_DIR, 'rules', 'doorman-tiers.md');
const LOG = join(CLAUDE_DIR, 'doorman.log');
const DISABLED = join(CLAUDE_DIR, 'doorman-disabled');
// One line of state per session: the task we last announced. The payload carries only the NEW list,
// so a TRANSITION to in_progress is not visible without remembering what was in progress before.
// Without this the hook fires on every TodoWrite, including bulk re-seeds and completion sweeps,
// which are not moments where work is chosen.
const STATE_DIR = join(CLAUDE_DIR, 'doorman-state');

const DEADLINE_MS = 5000;

let promptId = null;

const log = (entry) => {
  try {
    appendFileSync(LOG, `${JSON.stringify({ at: new Date().toISOString(), promptId, ...entry })}\n`, 'utf8');
  } catch {
    /* diagnostics, not the feature */
  }
};

const quit = (entry) => {
  if (entry) log(entry);
  process.exit(0);
};

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

/** The short mid-turn form, delimited in the rubric so both forms live in one file. */
const readReminder = () => {
  try {
    const m = readFileSync(RUBRIC, 'utf8').match(
      /<!--\s*doorman:reminder:start\s*-->([\s\S]*?)<!--\s*doorman:reminder:end\s*-->/
    );
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
};

const main = async () => {
  // Silent exits, not logged: this hook runs after EVERY TodoWrite, and logging the ones it
  // deliberately ignores would bury the entries that mean something.
  if (existsSync(DISABLED)) quit(null);

  const raw = await readStdin();
  if (raw === null) quit(null);

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    quit(null);
  }

  promptId = typeof input.prompt_id === 'string' ? input.prompt_id : null;
  const sessionId = typeof input.session_id === 'string' ? input.session_id : null;
  const cwd = typeof input.cwd === 'string' ? input.cwd : null;

  const todos = input.tool_input?.todos;
  if (!Array.isArray(todos)) quit(null);

  const active = todos.filter((t) => t && t.status === 'in_progress');
  // Zero means a sweep or a re-seed. More than one means the list is being rebuilt wholesale, not a
  // single task being picked up. Neither is a moment where one new piece of work starts.
  if (active.length !== 1) quit(null);

  const current = typeof active[0].content === 'string' ? active[0].content : '';
  if (!current) quit(null);

  // Compare against what was last announced for this session.
  const stateFile = sessionId ? join(STATE_DIR, `${sessionId.replace(/[^a-zA-Z0-9-]/g, '')}.txt`) : null;
  let previous = null;
  if (stateFile && existsSync(stateFile)) {
    try {
      previous = readFileSync(stateFile, 'utf8');
    } catch {
      previous = null;
    }
  }
  if (previous === current) quit(null);

  const reminder = readReminder();
  if (!reminder) quit({ path: 'todo', reason: 'reminder block missing from the rubric', cwd });

  if (stateFile) {
    try {
      mkdirSync(STATE_DIR, { recursive: true });
      writeFileSync(stateFile, current, 'utf8');
    } catch {
      // Losing the state only costs a repeated reminder on the next write. Never a reason to stop.
    }
  }

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `${reminder}\n\nThe task starting now: ${current}`,
      },
    })
  );
  // `path: 'todo'` rather than 'rubric': the status bar and the calibration reading must be able to
  // tell a mid-turn reminder from a door injection, and they share one log.
  log({ path: 'todo', task: current, cwd });
  process.exit(0);
};

main().catch(() => process.exit(0));
