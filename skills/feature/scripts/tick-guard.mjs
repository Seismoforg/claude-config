#!/usr/bin/env node
// feature — Stop-hook guard: every `# Tasks` item must exist in the harness todo list.
//
// It has ONE job, and it is the input side of the auto-tick. `tick-sync.mjs` sets a box from its todo,
// so a task with NO todo is a task nothing can ever tick. This runs at turn end and blocks while any
// such task exists — which makes seeding the mirror, and re-seeding after a task is added mid-build,
// the one manual step the mechanism still needs.
//
// It used to carry two more conditions: a `completed` todo over a bare box, and a ticked box whose todo
// never moved. Both were DIVERGENCE checks, and with the box now following the todo automatically the
// two lists cannot diverge. They were removed rather than left as a silent self-test of tick-sync.
//
// Registered in ~/.claude/settings.json (NOT a project .claude/settings.json) so it reaches every
// project and worktree the feature lifecycle is used in. It finds `features/` from the hook's own
// `cwd`, never from where this file lives. ADR 0006 has the reasoning.
//
// Reads the Stop hook JSON on stdin. Writes a decision to stdout. ALWAYS exits 0 — see FAIL OPEN.

import { openSync, fstatSync, readSync, closeSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { tasksOf, norm } from './_shared.mjs';

// FAIL OPEN, deliberately against this repo's grain. Every other check here treats "exited clean
// having examined nothing" as a defect. Here the costs are asymmetric: a false negative is a missed
// reminder, a false positive is a turn that cannot end. So every internal error exits 0, silent.
const bail = () => process.exit(0);

// Tail window. A transcript grows all session and this runs at EVERY turn end, so a full read is not
// affordable. Start small, grow ONCE, then give up rather than read an unbounded file.
const TAIL_BYTES = 512 * 1024;
const TAIL_BYTES_MAX = 4 * 1024 * 1024;

const readStdin = () => {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
};

// Read the last `bytes` of a file without loading the whole thing. The first line of the window is
// almost always a partial record, so it is dropped unless the window covers the entire file.
const readTail = (path, bytes) => {
  let fd;
  try {
    fd = openSync(path, 'r');
    const size = fstatSync(fd).size;
    const start = Math.max(0, size - bytes);
    const len = size - start;
    const buf = Buffer.allocUnsafe(len);
    readSync(fd, buf, 0, len, start);
    const lines = buf.toString('utf8').split(/\r?\n/);
    if (start > 0) lines.shift();
    return lines;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) try { closeSync(fd); } catch { /* already gone */ }
  }
};

// The last TodoWrite in the session IS the whole mirror: the tool's schema says "Send the full list
// each call; it replaces the previous one." So one record is the entire state, and scanning backwards
// to the first hit is both correct and the cheap direction.
//
// `isSidechain` skips a dispatched worker's own todo list. A dispatched dev writes into this same
// JSONL; without the filter its private list becomes "the last TodoWrite", matches nothing in the
// spec, and fires condition 1 against a mirror that was seeded correctly. MEASURED: the field is on
// all 5316 message records in this repo's transcripts. It fails OPEN — a record missing the field is
// treated as main-loop, so a rename costs a missed filter, never a false block.
const lastTodos = (lines) => {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line || !line.includes('TodoWrite')) continue;
    let rec;
    try { rec = JSON.parse(line); } catch { continue; }
    if (rec?.isSidechain === true) continue;
    const content = rec?.message?.content;
    if (!Array.isArray(content)) continue;
    for (let j = content.length - 1; j >= 0; j--) {
      const c = content[j];
      if (c?.type === 'tool_use' && c?.name === 'TodoWrite' && Array.isArray(c?.input?.todos)) {
        return c.input.todos;
      }
    }
  }
  return null;
};

const main = () => {
  const raw = readStdin();
  if (!raw.trim()) bail();

  let input;
  try { input = JSON.parse(raw); } catch { bail(); }

  const cwd = input?.cwd;
  const transcript = input?.transcript_path;
  const sessionId = input?.session_id;
  if (!cwd || !transcript) bail();

  // Scope comes from the HOOK's cwd, never from this file's location. That is what lets one
  // user-level registration serve every project and every worktree.
  const dir = join(cwd, 'features', 'in-progress');
  let specs;
  try {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) bail();
    specs = readdirSync(dir).filter((f) => f.endsWith('.md'));
  } catch { bail(); }
  if (!specs.length) bail();

  let lines = readTail(transcript, TAIL_BYTES);
  if (lines === null) bail();
  let todos = lastTodos(lines);
  if (todos === null) {
    lines = readTail(transcript, TAIL_BYTES_MAX);
    if (lines === null) bail();
    todos = lastTodos(lines);
  }

  const problems = [];
  for (const file of specs) {
    let body;
    try { body = readFileSync(join(dir, file), 'utf8'); } catch { continue; }
    const tasks = tasksOf(body);
    if (!tasks.length) continue;

    // No mirror at all is the degenerate case of the same rule, not a separate one.
    const mirrored = new Set((todos ?? []).map((t) => norm(t.content)));

    for (const task of tasks) {
      // A task with no todo. Covers "never seeded" and "seeded, then a task was added mid-build", which
      // `feature` step 6 explicitly allows. Those late tasks are the ones most likely to be forgotten,
      // so they are exactly the ones that must not fall outside the check — and with the auto-tick they
      // are also the only tasks whose box can never move on its own.
      if (!mirrored.has(norm(task.text))) {
        problems.push(`${file}:${task.line} not mirrored — "${task.text}"`);
      }
    }
    // A todo matching no task is IGNORED. The todo list is general-purpose and legitimately holds
    // items unrelated to any spec; the check above already runs the comparison the other way.
  }

  if (!problems.length) bail();

  const reason = [
    `# Tasks items missing from the todo list (${problems.length}):`,
    ...problems.map((p) => `  - ${p}`),
    'Add them to the todo list, content copied verbatim. Until a task is mirrored, tick-sync.mjs cannot tick its box.',
  ].join('\n');

  // LOOP GUARD. The Stop hook input carries no `stop_hook_active`, so a condition the model cannot
  // satisfy would block forever. Block once per signature; if the same problems survive the next
  // turn, fall through to non-blocking feedback and let the turn end.
  const sigFile = join(tmpdir(), `claude-tick-guard-${String(sessionId ?? 'nosession').replace(/[^A-Za-z0-9_-]/g, '')}.json`);
  const signature = problems.join('|');
  let seen = null;
  try { seen = JSON.parse(readFileSync(sigFile, 'utf8'))?.signature ?? null; } catch { /* first run */ }

  if (seen === signature) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'Stop', additionalContext: reason },
    }));
    process.exit(0);
  }

  try { writeFileSync(sigFile, JSON.stringify({ signature }), 'utf8'); } catch { /* nudge still fires */ }
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
  process.exit(0);
};

try { main(); } catch { bail(); }
