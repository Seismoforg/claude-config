#!/usr/bin/env node
// feature — mechanical feature-state checks.
// Enforces the HARD RULE that is deterministic: folder and frontmatter status ALWAYS match,
// plus the filename shape. Whether a status is EARNED (work really finished, validation really
// run, tasks really ticked) is NOT here — that needs judgment and the session transcript.
// A clean exit means the state machine is internally consistent, never that the work is good.
// Usage: node check-features.mjs [root]   Exit 1 = at least one violation.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// Default to the shell CWD — unlike check-agents, the thing under test lives in the USER's
// project (features/ is per-project and usually VCS-ignored), not in the repo shipping this file.
const root = resolve(process.argv[2] ?? '.');

// The state machine is closed: these 7 folders and no others. An 8th is drift, not a new state.
const STATUS_BY_FOLDER = {
  'draft': 'DRAFT',
  'pending': 'NEEDS_APPROVAL',
  'approved': 'APPROVED',
  'in-progress': 'IN_PROGRESS',
  'ready-for-done': 'READY_FOR_DONE',
  'done': 'DONE',
  'discarded': 'DISCARDED',
};
// <timestamp>-<slug>.md — YYYYMMDD-HHMM + lowercase-kebab.
const FILENAME_RE = /^\d{8}-\d{4}-[a-z0-9-]+\.md$/;

const rel = (p) => relative(root, p).split('\\').join('/') || '.';
// YAML scalar: unwrap quoting and drop a trailing ` # comment`, so `status: "DONE"  # note`
// reads as DONE. Deliberately duplicated from check-agents.mjs rather than shared — these
// scripts stay standalone, reachable through both the ~/.claude junction and the real path.
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

for (const entry of readdirSync(featuresDir)) {
  // statSync, never Dirent.isDirectory(): a Windows junction reports false as a Dirent, so the
  // whole folder would vanish and the run would report "clean" having checked nothing. Matches
  // check-docs.mjs. A false clean is the worst output a checker can produce.
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
    }
    const found = status(readFileSync(path, 'utf8'));
    if (found === null) {
      violations.push(`${rel(path)}  no-frontmatter  feature file needs a --- block; status is the source of truth`);
    } else if (!found) {
      violations.push(`${rel(path)}  missing-status  no status: field — folder cannot be verified against it`);
    } else if (found !== expected) {
      violations.push(`${rel(path)}  folder-status-mismatch  status "${found}" but folder expects "${expected}" — do not guess which is right; the skill says STOP and report`);
    }
  }
}

if (!violations.length) {
  console.log(`check-features: clean — ${count} feature file(s) under ${rel(featuresDir)}`);
  console.log('Folder/status consistency only. That a status was EARNED still needs judgment.');
  process.exit(0);
}
console.log(violations.join('\n'));
console.log(`\ncheck-features: ${violations.length} violation(s) across ${count} feature file(s).`);
process.exit(1);
