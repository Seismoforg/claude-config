#!/usr/bin/env node
// feature — PostToolUse hook that writes a `# Tasks` checkbox to follow its todo.
//
// `feature` step 6 says a box and its todo move in ONE act. That was a habit restated at four sites and
// held at none: two separate records, nothing connecting them. This connects them. The model moves the
// todo — the one list the harness itself pushes on — and the box follows automatically.
//
// Direction is todo -> box, both ways. What the tasks ARE stays the spec's business; only the tick STATE
// is taken from the todo list.
//
// Registered in ~/.claude/settings.json as a PostToolUse hook with `matcher: "TodoWrite"` (NOT a project
// .claude/settings.json) so it reaches every project and worktree. It finds `features/` from the hook's
// own `cwd`, never from where this file lives. ADR 0006 has the reasoning.
//
// Reads the PostToolUse hook JSON on stdin. ALWAYS exits 0 and writes nothing to stdout — see FAIL OPEN.

import { readFileSync, writeFileSync, renameSync, unlinkSync, appendFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ANNOTATED, tasksOf, norm } from './_shared.mjs';

// FAIL OPEN, and harder than tick-guard.mjs needs to. That one risks a turn that cannot end; this one
// WRITES to the user's spec files, so every uncertain path must end in doing nothing at all. A missed
// tick is a tick the model still makes by hand. A wrong write is lost work in a git-ignored file.
const bail = () => process.exit(0);

const readStdin = () => {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
};

// Set the checkbox on a single line, leaving every other byte of it alone.
const setBox = (line, ch) => line.replace(/^- \[[ xX]\]/, `- [${ch}]`);

// Apply box edits by walking the ORIGINAL string and re-emitting its own separators. The obvious
// implementation — split, map, join('\n') — rewrites every line ending in the file. These specs are
// CRLF, so that turns a one-character change into a whole-file diff.
//
// Line numbering must match `tasksOf` exactly, which splits on /\r?\n/. A lone \r is therefore NOT a
// line break here either; adding one would shift every number after it.
const applyEdits = (src, edits) => {
  const re = /\r?\n/g;
  let out = '';
  let lastEnd = 0;
  let lineNo = 0;
  let m;
  while ((m = re.exec(src)) !== null) {
    lineNo++;
    const line = src.slice(lastEnd, m.index);
    out += edits.has(lineNo) ? setBox(line, edits.get(lineNo)) : line;
    out += m[0];
    lastEnd = re.lastIndex;
  }
  lineNo++;
  const tail = src.slice(lastEnd);
  out += edits.has(lineNo) ? setBox(tail, edits.get(lineNo)) : tail;
  return out;
};

// The two paths that do nothing are the ones worth logging: a silent skip is indistinguishable from a
// hook that stopped running. A failed log never blocks a tick and never throws.
const logTo = (path, lines) => {
  if (!lines.length) return;
  try {
    appendFileSync(path, lines.join('\n') + '\n', 'utf8');
  } catch { /* the tick already landed; losing its log line is the lesser loss */ }
};

const main = () => {
  const raw = readStdin();
  if (!raw.trim()) bail();

  let input;
  try { input = JSON.parse(raw); } catch { bail(); }

  if (input?.tool_name !== 'TodoWrite') bail();

  // A dispatched worker's private todo list must never tick the dispatcher's spec. MEASURED: both fields
  // are `undefined` from the main loop. The positive case is inferred from the hook docs ("when in
  // subagent") and is NOT measured — see the spec's open assumption. It fails safe for the case that
  // matters most anyway: a dispatched dev works in a worktree, and `features/` is git-ignored, so a
  // worktree has no `features/in-progress/` for the dir check below to find.
  if (input?.agent_id !== undefined || input?.agent_type !== undefined) bail();

  const cwd = input?.cwd;
  const todos = input?.tool_input?.todos;
  if (!cwd || !Array.isArray(todos) || !todos.length) bail();

  const featuresDir = join(cwd, 'features');
  const dir = join(featuresDir, 'in-progress');
  let specs;
  try {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) bail();
    specs = readdirSync(dir).filter((f) => f.endsWith('.md'));
  } catch { bail(); }
  if (!specs.length) bail();

  // Read every spec ONCE, up front. The same copy is walked, decided against, and later compared
  // byte-for-byte before the write.
  const loaded = [];
  for (const file of specs) {
    try {
      const src = readFileSync(join(dir, file), 'utf8');
      const tasks = tasksOf(src);
      if (tasks.length) loaded.push({ file, path: join(dir, file), src, tasks });
    } catch { /* unreadable spec is not this hook's problem */ }
  }
  if (!loaded.length) bail();

  // AMBIGUITY, built across all specs before any decision. A task text living in two in-progress specs
  // gives the hook no way to know which one a todo belongs to — "Update the docs" is exactly that shape.
  // Guessing is the one thing a writing hook must never do, so those lines are skipped everywhere.
  const seen = new Map();
  for (const spec of loaded) {
    for (const t of new Set(spec.tasks.map((t) => norm(t.text)))) {
      seen.set(t, (seen.get(t) ?? 0) + 1);
    }
  }
  const ambiguous = new Set([...seen].filter(([, n]) => n > 1).map(([t]) => t));

  const byText = new Map(todos.map((t) => [norm(t.content), t]));
  const logPath = join(featuresDir, '.tick-sync.log');
  const stamp = new Date().toISOString();
  const logLines = [];

  for (const spec of loaded) {
    const edits = new Map();
    // Held back until the write SUCCEEDS. Logging a TICK beside the decision would put a line in the
    // audit trail for a box that an abandoned or failed write never actually changed — and reading the
    // log after a suspect tick is the only reason it exists.
    const pending = [];
    for (const task of spec.tasks) {
      const key = norm(task.text);
      if (ambiguous.has(key)) {
        // A skip is not conditional on a write, so it is recorded either way.
        logLines.push(`${stamp} SKIP-AMBIGUOUS ${spec.file}:${task.line} "${task.text}"`);
        continue;
      }
      // A line annotated BLOCKED / NOT DONE / with a feature id is a deliberate open item. Never touched,
      // in either direction. The annotation may sit on a continuation line, which is why `raw` is tested.
      if (ANNOTATED.test(task.raw)) continue;
      const todo = byText.get(key);
      if (!todo) continue;  // no todo -> no opinion. tick-guard.mjs reports this one.

      const want = todo.status === 'completed';
      if (want === task.checked) continue;
      edits.set(task.line, want ? 'x' : ' ');
      pending.push(`${stamp} ${want ? 'TICK  ' : 'UNTICK'} ${spec.file}:${task.line} "${task.text}"`);
    }
    if (!edits.size) continue;

    // RE-READ AND COMPARE. This hook runs while the turn is live, and adding a task to `# Tasks` is a
    // normal step-5 act that happens right beside a TodoWrite. Writing a buffer built from a stale read
    // would silently discard whatever the model wrote in between. Different -> abandon this spec
    // entirely; the next TodoWrite picks the work up again from a fresh read.
    let current;
    try { current = readFileSync(spec.path, 'utf8'); } catch { continue; }
    if (current !== spec.src) {
      logLines.push(`${stamp} ABANDON ${spec.file} changed under the hook; ${edits.size} edit(s) dropped`);
      continue;
    }

    // Atomic: write a sibling temp file, then rename over the original. A crash between truncate and
    // write would otherwise leave an empty spec, which check-features.mjs reports as `abandoned-claim` —
    // a small, recoverable-looking violation standing in for the whole content of a feature.
    const tmp = `${spec.path}.tick-sync-${process.pid}.tmp`;
    try {
      writeFileSync(tmp, applyEdits(spec.src, edits), 'utf8');
      renameSync(tmp, spec.path);
      logLines.push(...pending);  // the boxes really moved; only now do they enter the trail
    } catch {
      try { unlinkSync(tmp); } catch { /* nothing left to clean */ }
      logLines.push(`${stamp} FAILED ${spec.file} write failed; ${edits.size} edit(s) dropped`);
    }
  }

  logTo(logPath, logLines);
  process.exit(0);
};

try { main(); } catch { bail(); }
