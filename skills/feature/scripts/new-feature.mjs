#!/usr/bin/env node
// feature — claim a new feature-file id and print its path.
//
// The id used to be DERIVED by the model: today's date from context, plus a time part stepped off
// whatever was already in the folder. Measured over 56 specs, that produced a counter every single
// time (0001..0010) and never a clock time, because the model has no clock. This reads one.
//
// It CREATES the file, empty, with `wx`. That is the whole point of claiming: two sessions reading
// the same minute would otherwise both see it as free, print the same path, and collide only once
// both had written. The empty file is the reservation; the caller writes the content.
//
// THE ID SHAPE HAS TWO CONSUMERS AND NEITHER IMPORTS IT. Change the shape here and change both in
// the SAME commit — nothing greps across them:
//   * check-features.mjs — derives a feature's identity as `file.slice(0, 13)`.
//   * git-commit/SKILL.md:112 — matches `????????-????-<slug>.md` to detect a feature-owned branch.
//
// Usage: node new-feature.mjs <slug> [--folder <state>] [--root <dir>]
// Exit 0 = a file was claimed and its path printed. Exit 2 = invalid invocation or no id available;
// nothing was left behind. There is no exit 1: this produces, it does not check.

import { openSync, closeSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { STATUS_BY_FOLDER } from './_shared.mjs';

// The state machine is closed: the 7 folders `_shared.mjs` defines and no others. Only the NAMES are
// needed here, and their order is the state-machine order that file's KEY ORDER note guarantees.
const STATE_FOLDERS = Object.keys(STATUS_BY_FOLDER);

// Matches the slug half of check-features.mjs's FILENAME_RE (/^\d{8}-\d{4}-[a-z0-9-]+\.md$/), minus
// a leading or trailing hyphen, which that pattern allows but which reads as a typo every time.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const die = (msg) => {
  console.error(`new-feature: ${msg}`);
  process.exit(2);
};

const pad2 = (n) => String(n).padStart(2, '0');

const args = process.argv.slice(2);
let slug = null, folder = 'draft', root = process.cwd();
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--folder') { folder = args[++i]; continue; }
  if (a === '--root') { root = args[++i]; continue; }
  if (a.startsWith('--')) die(`unknown flag ${a}`);
  if (slug !== null) die(`only one slug is accepted; got "${slug}" and "${a}"`);
  slug = a;
}

// Validate EVERYTHING before touching the filesystem, so a bad invocation cannot leave a directory
// behind either. The claim below is the only thing this script ever creates.
if (!slug) die('missing <slug>. Usage: new-feature.mjs <slug> [--folder <state>] [--root <dir>]');
if (!SLUG_RE.test(slug)) die(`slug "${slug}" must be lowercase-kebab: ${SLUG_RE}`);
if (!folder || !STATE_FOLDERS.includes(folder)) {
  die(`--folder "${folder}" is not a state: ${STATE_FOLDERS.join(', ')}`);
}
root = resolve(root);
if (!existsSync(root) || !statSync(root).isDirectory()) die(`not a directory: ${root}`);

// One clock read. The DATE is fixed for this run: a candidate rolling past 2359 wraps to 0000 of the
// SAME day rather than becoming tomorrow, so a run started at 23:59 cannot silently file under a
// date the caller never saw.
const now = new Date();
const date = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
const startMinute = now.getHours() * 60 + now.getMinutes();

// Ids already taken ANYWHERE. A feature is identified by its timestamp alone, so a collision in
// done/ is just as real as one in draft/ — check-features.mjs reports duplicate-id repo-wide.
// This is an OPTIMISATION, not the guarantee: it can be stale by the time the open happens. `wx` is
// the guarantee, because the filesystem decides.
const featuresDir = join(root, 'features');
const taken = new Set();
for (const state of STATE_FOLDERS) {
  const dir = join(featuresDir, state);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.md')) taken.add(f.slice(0, 13));
  }
}

const targetDir = join(featuresDir, folder);
mkdirSync(targetDir, { recursive: true });

for (let step = 0; step < 1440; step++) {
  const m = (startMinute + step) % 1440;
  const id = `${date}-${pad2(Math.floor(m / 60))}${pad2(m % 60)}`;
  if (taken.has(id)) continue;
  const path = join(targetDir, `${id}-${slug}.md`);
  try {
    closeSync(openSync(path, 'wx'));           // 'wx' = create, fail if it exists. This IS the claim.
  } catch (e) {
    if (e.code === 'EEXIST') continue;         // lost the race; take the next minute
    die(`could not claim ${path}: ${e.code ?? e.message}`);
  }
  console.log(relative(root, path).split('\\').join('/'));
  process.exit(0);
}

die(`every minute of ${date} is taken (1440 ids) — no free slot today`);
