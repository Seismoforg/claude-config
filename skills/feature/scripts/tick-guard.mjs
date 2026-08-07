#!/usr/bin/env node
// feature — Stop-hook guard keeping `# Tasks` and the harness todo list in step.
//
// `feature` step 5 says tick a box the MOMENT its task lands. That rule was written at four sites and
// held at none: `features/` is git-ignored, so no check can see the difference between ticking as you
// go and reconciling in one pass at step 6. This runs at TURN END, where the difference is still
// visible, and blocks the turn while the two lists disagree.
//
// Registered in ~/.claude/settings.json (NOT a project .claude/settings.json) so it reaches every
// project and worktree the feature lifecycle is used in. It finds `features/` from the hook's own
// `cwd`, never from where this file lives. ADR 0006 has the reasoning.
//
// Reads the Stop hook JSON on stdin. Writes a decision to stdout. ALWAYS exits 0 — see FAIL OPEN.

import { openSync, fstatSync, readSync, closeSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// FAIL OPEN, deliberately against this repo's grain. Every other check here treats "exited clean
// having examined nothing" as a defect. Here the costs are asymmetric: a false negative is a missed
// reminder, a false positive is a turn that cannot end. So every internal error exits 0, silent.
const bail = () => process.exit(0);

// Annotation vocabulary. DUPLICATED from check-features.mjs `ANNOTATED` on purpose — the check
// scripts are standalone so both stay reachable through the ~/.claude junction and the real path.
// CHANGE BOTH IN THE SAME COMMIT. Add a marker here only, and the check goes green on a spec this
// hook blocks; add it there only, and a legitimately-annotated box blocks every turn.
const ANNOTATED = /\bBLOCKED\b|\bNOT DONE\b|\b\d{8}-\d{4}\b/;

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
// `isSidechain` skips a dispatched worker's own todo list. Under `crew` a dev writes into this same
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

// Walk `# Tasks`. Same three traps check-features.mjs documents: an annotation may sit on a
// CONTINUATION line, a fence inside the section would read as tasks, and an unclosed fence must not
// silently swallow the rest. Here an unclosed fence just ends the walk — this is a nudge, not an
// audit, and check-features.mjs already reports `unterminated-fence` as a violation.
const tasksOf = (src) => {
  const lines = src.split(/\r?\n/);
  const start = lines.findIndex((l) => /^# Tasks\s*$/i.test(l));
  if (start === -1) return [];
  const out = [];
  let fenced = false;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^# /.test(line)) break;
    if (/^\s*```/.test(line)) { fenced = !fenced; continue; }
    if (fenced) continue;
    const m = line.match(/^- \[([ xX])\]\s*(.*)$/);
    if (m) {
      out.push({ line: i + 1, checked: m[1] !== ' ', text: m[2], raw: line });
      continue;
    }
    if (out.length && /^\s+\S/.test(line)) out[out.length - 1].raw += '\n' + line;  // continuation
  }
  return out;
};

// Todos are seeded VERBATIM from the task text, so an exact compare after light normalisation is
// enough. Backticks and ** are stripped because a model re-typing a task tends to drop the markup
// before it drops a word.
const norm = (s) => String(s ?? '')
  .replace(/[`*]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

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

    // No mirror at all is condition 1's degenerate case, not a separate rule.
    const byText = new Map((todos ?? []).map((t) => [norm(t.content), t]));

    for (const task of tasks) {
      const todo = byText.get(norm(task.text));

      // Condition 1 — a task with no todo. Covers "never seeded" and "seeded, then a task was added
      // mid-build", which `feature` step 5 explicitly allows. Those late tasks are the ones most
      // likely to be forgotten, so they are exactly the ones that must not fall outside the check.
      if (!todo) {
        problems.push(`${file}:${task.line} not mirrored — "${task.text}"`);
        continue;
      }
      // Condition 2 — declared done, box still bare. An annotated box is a deliberate open item.
      if (todo.status === 'completed' && !task.checked && !ANNOTATED.test(task.raw)) {
        problems.push(`${file}:${task.line} todo completed but box still "- [ ]" — "${task.text}"`);
        continue;
      }
      // Condition 3 — box ticked, todo never moved. Catches a mirror seeded once to clear condition 1
      // and then abandoned, which would otherwise satisfy this hook forever.
      if (task.checked && todo.status !== 'completed') {
        problems.push(`${file}:${task.line} box ticked but todo still "${todo.status}" — "${task.text}"`);
      }
    }
    // A todo matching no task is IGNORED. The todo list is general-purpose and legitimately holds
    // items unrelated to any spec; condition 1 already runs the comparison the other way.
  }

  if (!problems.length) bail();

  const reason = [
    `# Tasks and the todo list disagree (${problems.length}):`,
    ...problems.map((p) => `  - ${p}`),
    'Tick the boxes that landed and re-sync the todo list. A box open on purpose needs BLOCKED, NOT DONE, or a feature id on its line.',
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
