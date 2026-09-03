#!/usr/bin/env node
// feature — mechanical feature-state checks.
// Enforces the HARD RULE that is deterministic: folder and frontmatter status ALWAYS match,
// plus the filename shape. Whether a status is EARNED (work really finished, validation really
// run, tasks really ticked) is NOT here — that needs judgment and the session transcript.
// A clean exit means the state machine is internally consistent, never that the work is good.
// Usage: node check-features.mjs [root]   Exit 1 = at least one violation.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { ANNOTATED, STATUS_BY_FOLDER } from './_shared.mjs';

// Default to the shell CWD: the thing under test lives in the USER's project (features/ is
// per-project and usually VCS-ignored), not in the repo shipping this file.
const root = resolve(process.argv[2] ?? '.');

// <timestamp>-<slug>.md — YYYYMMDD-HHMM + lowercase-kebab.
const FILENAME_RE = /^\d{8}-\d{4}-[a-z0-9-]+\.md$/;

const rel = (p) => relative(root, p).split('\\').join('/') || '.';
// YAML scalar: unwrap quoting and drop a trailing ` # comment`, so `status: "DONE"  # note`
// reads as DONE.
const str = (v) => {
  if (typeof v !== 'string') return null;
  const quoted = v.trim().match(/^(['"])([\s\S]*?)\1\s*(?:#.*)?$/);
  const s = (quoted ? quoted[2] : v.replace(/(^|\s)#.*$/, '')).trim();
  return s || null;
};
const status = (src) => {
  // Strip a leading BOM first: an editor-added U+FEFF sits in front of the opening --- and makes
  // this ^--- match miss, so a perfectly good feature file reads as having no frontmatter.
  const m = src.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  const s = m[1].match(/^status:\s*(.+)$/m);
  return s ? (str(s[1]) ?? '') : '';
};

// The annotation vocabulary now has ONE definition, in `_shared.mjs` beside this file, imported below.
// It used to be duplicated here and in tick-guard.mjs with a "change both in the same commit" comment
// that nothing enforced — ADR 0006 Consequences named the failure that invited.

// Walk `# Tasks` and return violation strings. Three things a naive regex gets wrong, all of them
// measured against real files in this repo:
//  1. The annotation may sit on a CONTINUATION line, not the `- [ ]` line (see the ask-before-local-
//     resource-runs spec, whose "**NOT DONE:**" is on the line below). A task item is its first line
//     plus every following indented line.
//  2. A fence inside `# Tasks` would make its contents read as tasks. Skip fenced regions.
//  3. A fence left UNCLOSED must not silently swallow the rest of the section — a single flag that
//     never flips back turns "inspected 0 items" into a clean pass indistinguishable from a real one.
const tasksNotCurrent = (src) => {
  const lines = src.split(/\r?\n/);
  const start = lines.findIndex((l) => /^# Tasks\s*$/i.test(l));
  if (start === -1) return [];
  const out = [];
  let fenced = false, fenceLine = 0, item = null, itemLine = 0, items = 0;
  const flush = () => {
    if (item !== null && !ANNOTATED.test(item)) {
      out.push(`tasks-not-current  line ${itemLine}: unchecked task with no reason — tick it if the work landed, else say why on the line (BLOCKED / NOT DONE / a feature id). Fix in place; this one is not a STOP`);
    }
    item = null;
  };
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^# /.test(line)) break;                       // next section ends # Tasks
    if (/^\s*```/.test(line)) { if (!fenced) fenceLine = i + 1; fenced = !fenced; continue; }
    if (fenced) continue;
    if (/^- \[ \]/.test(line)) { flush(); item = line; itemLine = i + 1; items++; continue; }
    if (/^- \[[xX]\]/.test(line)) { flush(); items++; continue; }
    if (item !== null && /^\s+\S/.test(line)) { item += '\n' + line; continue; }  // continuation
    if (line.trim() === '') continue;                  // blank keeps the item open
    flush();
  }
  flush();
  if (fenced) out.push(`unterminated-fence  line ${fenceLine}: code fence opened inside # Tasks and never closed — every task after it went uninspected`);
  if (!items) out.push(`tasks-not-current  # Tasks section has no checklist items — a spec that reached this state built something`);
  return out;
};

// A bad root must be a named error, never a quiet "nothing to check" — a typo'd path and a
// project without a feature lifecycle printed the same line and the same exit 0. isDirectory()
// as well: a FILE passed as root has no features/ under it either, and would read as clean.
if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`check-features: not a directory: ${root}`);
  process.exit(2);
}

const featuresDir = join(root, 'features');
if (!existsSync(featuresDir)) {
  // Not every project runs the feature lifecycle. Nothing to check is not a failure.
  console.log(`check-features: no features/ under ${root} — nothing to check`);
  process.exit(0);
}

const violations = [];
let count = 0;
// <timestamp> → the files claiming it. Two concurrent sessions derive the next free minute from the
// same rule and land on the same id; the filenames differ by slug, so nothing else catches it, yet
// the skill identifies a feature BY timestamp. Collected across all folders, reported at the end.
const byId = new Map();

for (const entry of readdirSync(featuresDir)) {
  // statSync, never Dirent.isDirectory(): a Windows junction reports false as a Dirent, so the
  // whole folder would vanish and the run would report "clean" having checked nothing.
  // A false clean is the worst output a checker can produce.
  // It throws on a DANGLING junction, though — report that entry and carry on, never crash.
  let st;
  try { st = statSync(join(featuresDir, entry)); } catch (e) {
    violations.push(`features/${entry}  unreadable-path  ${e.code ?? e.message} — dangling symlink/junction or unreadable entry`);
    continue;
  }
  if (!st.isDirectory()) continue;
  const expected = STATUS_BY_FOLDER[entry];
  if (!expected) {
    violations.push(`features/${entry}  unknown-folder  not a state in the machine (${Object.keys(STATUS_BY_FOLDER).join(', ')})`);
    continue;
  }
  for (const file of readdirSync(join(featuresDir, entry)).filter((f) => f.endsWith('.md'))) {
    count++;
    const path = join(featuresDir, entry, file);
    if (!FILENAME_RE.test(file)) {
      violations.push(`${rel(path)}  bad-filename  expected YYYYMMDD-HHMM-lowercase-kebab.md`);
    } else {
      const id = file.slice(0, 13); // YYYYMMDD-HHMM — shape already guaranteed by FILENAME_RE
      byId.set(id, [...(byId.get(id) ?? []), rel(path)]);
      // HHMM is a real clock time now — new-feature.mjs reads the clock instead of the model
      // guessing. FILENAME_RE only proves four DIGITS, so 1265 and 2575 pass it. This catches the
      // out-of-range values a guess produces. It cannot catch a PLAUSIBLE invented time; nothing
      // can, because a generated and a typed 0914 are the same four characters.
      const hh = Number(id.slice(9, 11)), mm = Number(id.slice(11, 13));
      if (hh > 23 || mm > 59) {
        violations.push(`${rel(path)}  bad-timestamp  "${id.slice(9)}" is not a 24h time (HH<=23, MM<=59) — ids come from new-feature.mjs, which reads the clock`);
      }
    }
    // readFileSync throws the same ENOENT as the statSync above on a dangling junction. Same answer:
    // report the entry and keep walking, or one bad spec stops every later one being checked.
    let body;
    try { body = readFileSync(path, 'utf8'); } catch (e) {
      violations.push(`${rel(path)}  unreadable-path  ${e.code ?? e.message} — dangling symlink/junction or unreadable entry`);
      continue;
    }
    // An EMPTY spec is new-feature.mjs's claim with nothing written into it yet — a session that died
    // between claiming the id and writing the content. It MUST NOT fall through to no-frontmatter:
    // that is a STOP-and-report violation, so one crashed session would block every later session's
    // state check. Tested BEFORE the frontmatter read so it
    // pre-empts rather than competes, and FIXED IN PLACE — fill it or delete it. A non-empty file
    // missing its frontmatter is a real defect and keeps the STOP.
    if (body.trim() === '') {
      violations.push(`${rel(path)}  abandoned-claim  empty file — an id claimed by new-feature.mjs that was never written into. Fill it or delete it; this one is not a STOP`);
      continue;
    }
    // A spec that reached a terminal-ish state must SAY what it did about debt: the filed DRAFT ids, or
    // that none was taken. The skill records that an absent `# Debt Found` "far more often means you
    // forgot than that you were clean" — so absence is exactly what cannot be trusted, and it was the
    // one required element with no mechanical check while folder/status had one.
    // Scoped to specs carrying BOTH gate sections — that pair is the current skill's signature, so its
    // presence marks a spec the debt rule actually applied to. Without a scope every older spec fails,
    // and a check nobody can drive to zero is a check everybody ignores. `# Open Questions` alone is NOT
    // the marker: it was in use as an ad-hoc heading long before the gate that now owns the name.
    if ((entry === 'ready-for-done' || entry === 'done')
        && /^# Open Questions/im.test(body) && /^# Premortem/im.test(body)
        && !/no debt taken|# Debt Found/i.test(body)) {
      violations.push(`${rel(path)}  debt-not-recorded  # Validation must state the filed debt ids or "no debt taken" — silence is not proof`);
    }
    // `# Tasks` is a live work-list (feature step 6). By ready-for-done/done every box is ticked, or
    // says WHY it is not.
    //
    // WIDENED 20260810: it used to require `# Premortem` as well, and that gate is why the rule was
    // blind to every spec written before the 1.5 gate existed — which is most of the old ones. MEASURED
    // on a real repo, the same 150 specs either way:
    //   - premortem-gated, uncleaned corpus  -> CLEAN. 86 unchecked, unexplained boxes present.
    //   - widened, same corpus               -> 86 violations, all of them real.
    //   - widened, after those were settled  -> CLEAN.
    // So the gate was not narrowing a noisy rule; it was hiding a true one, and a green run read as
    // conformance when it meant not-checked.
    //
    // The cost is stated rather than avoided: the FIRST run in a repo that never did this pass surfaces
    // its whole backlog at once. That is the correct report — every finding names a real box — and
    // `tasks-not-current` is fix-in-place, never a STOP, so it produces a work-list and blocks nothing.
    //
    // `unterminated-fence` is emitted from this same walk and only gains reach from the widening.
    if (entry === 'ready-for-done' || entry === 'done') {
      for (const v of tasksNotCurrent(body)) violations.push(`${rel(path)}  ${v}`);
    }
    const found = status(body);
    if (found === null) {
      violations.push(`${rel(path)}  no-frontmatter  feature file needs a --- block; status is the source of truth`);
    } else if (!found) {
      violations.push(`${rel(path)}  missing-status  no status: field — folder cannot be verified against it`);
    } else if (found !== expected) {
      violations.push(`${rel(path)}  folder-status-mismatch  status "${found}" but folder expects "${expected}" — do not guess which is right; the skill says STOP and report`);
    }
  }
}

for (const [id, paths] of byId) {
  if (paths.length < 2) continue;
  violations.push(`${paths[0]}  duplicate-id  ${id} is also used by ${paths.slice(1).join(', ')} — a feature is identified by its timestamp, so renumber all but one`);
}

if (!violations.length) {
  console.log(`check-features: clean — ${count} feature file(s) under ${rel(featuresDir)}`);
  console.log('Folder/status consistency only. That a status was EARNED still needs judgment.');
  process.exit(0);
}
console.log(violations.join('\n'));
console.log(`\ncheck-features: ${violations.length} violation(s) across ${count} feature file(s).`);
process.exit(1);
