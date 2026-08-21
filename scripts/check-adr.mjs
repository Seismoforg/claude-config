#!/usr/bin/env node
// check-adr — a superseded ADR must name the ADR that replaced it, near the top, where a reader
// will actually see it.
//
// The defect this exists for is a READING failure, not a writing one. `skills/documentation/SKILL.md:90`
// already forbids silently editing an accepted decision and offers two correct update paths, so
// decisions can change today. What nothing checks is the POINTER. `status: superseded` sits in
// frontmatter, which is the easiest part of a file to skim past, and an agent that skims it reads an
// abandoned decision as current and proposes the approach that was already reversed.
//
// WHAT IT OWNS: two mechanical rules over `docs/adr/`.
//   superseded-without-successor — `status: superseded` with no EXISTING other ADR named in the first
//                                  SCAN_LINES lines of the body.
//   unknown-status               — `status:` absent, or not one of the three
//                                  `skills/documentation/SKILL.md:81` allows.
//
// NOT CHECKED, deliberately — this list is the scope boundary:
//   * That the named ADR is the one that actually replaced it. The check proves a pointer EXISTS and
//     resolves; it cannot read intent. An ADR whose opening lines cite a predecessor it supersedes
//     ("this replaces 0001") satisfies the rule while naming no successor. Accepted: tightening it
//     would mean matching prose like "superseded by", and a rule that fires on wording produces false
//     positives, which cost the habit of running the check at all. Same trade as
//     check-frontmatter.mjs's "where a rule is uncertain, do not fire".
//   * Filename shape, heading structure, `date:`, and whether an amendment marker is well-formed.
//     `skills/documentation/SKILL.md` owns those and no script here enforces them.
//   * Whether a superseded ADR should MOVE to its own directory. Offered and not chosen; it stays
//     available as a separate feature.
//
// A four-digit token only counts as a successor when an ADR with that id is really in the corpus.
// That is what stops a date ("2026-08-01") in the scan window reading as a pointer, and it makes the
// rule mean what it says: the successor must exist.
//
// CORPUS IS AN ALLOWLIST — never a list of places to ignore (skills/feature/SKILL.md, step 6).
// IN: docs/adr/NNNN-kebab-title.md, the filename shape skills/documentation/SKILL.md:78 sets.
// OUT: anything else in that directory. Skipped files are COUNTED and printed, so a corpus that
// quietly resolved to nothing cannot read as a clean one.
//
// Usage: node check-adr.mjs [root]   Exit 1 = at least one violation. Exit 0 = clean, INCLUDING the
// case where docs/adr/ is absent or empty — another repo may legitimately have no ADRs, so absence
// is not a broken invocation. README.md's check-list section records that split and its reason.
// Exit 2 = the run was INVALID: a bad root. [root] defaults to this script's own repo, never the
// shell CWD.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Default to the repo this script ships in — never the shell CWD, which drifts. Same rule as
// check-frontmatter.mjs and check-pointers.mjs; this file sits at <repo>/scripts/, so root is one up.
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] ?? join(here, '..'));

// A bad root must be a named error, never a quiet "nothing to check" — the two look identical in a
// log otherwise. isDirectory() as well as existsSync: a FILE passed as root reaches readdirSync and
// dies on a raw ENOTDIR stack trace.
if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`check-adr: not a directory: ${root}`);
  process.exit(2);
}

// The three `skills/documentation/SKILL.md:81` allows, and nothing else.
const STATUSES = new Set(['proposed', 'accepted', 'superseded']);

// How far into the BODY a successor pointer still counts as "near the top". 0002 puts its pointer on
// body line 2; ten leaves room for a heading, a blank line and a sentence of context without letting
// a pointer at the foot of the file pass. A whole-file grep would satisfy the letter of the rule and
// miss its entire point, which is that a reader SEES it.
const SCAN_LINES = 10;

const ADR_NAME = /^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

const adrDir = join(root, 'docs', 'adr');

// Absent docs/adr/ is a legitimate state, not a failure: this script travels to repos that keep no
// ADRs. It still says so out loud rather than printing "clean" over an empty set.
if (!existsSync(adrDir) || !statSync(adrDir).isDirectory()) {
  console.log('check-adr: nothing to check — no docs/adr/ directory under ' + root);
  process.exit(0);
}

const entries = readdirSync(adrDir, { withFileTypes: true }).filter((d) => d.isFile());
const corpus = [];
const skipped = [];
for (const d of entries) {
  const m = d.name.match(ADR_NAME);
  if (m) corpus.push({ file: d.name, id: m[1], path: join(adrDir, d.name) });
  else skipped.push(d.name);
}

if (corpus.length === 0) {
  console.log(`check-adr: nothing to check — docs/adr/ holds no NNNN-kebab-title.md file (${skipped.length} other file(s) present)`);
  process.exit(0);
}

// Every id that really exists. A token in the scan window is a successor pointer only if it is in
// here — which is what keeps a date or a version number from passing as one.
const ids = new Set(corpus.map((a) => a.id));

const violations = [];

for (const { file, id, path } of corpus) {
  const src = readFileSync(path, 'utf8');
  const rel = `docs/adr/${file}`;

  const block = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!block) {
    violations.push(`${rel}  unknown-status  no --- frontmatter block, so no status: at all`);
    continue;
  }

  const statusLine = block[1].split(/\r?\n/).find((l) => /^status:/.test(l));
  const status = statusLine ? statusLine.replace(/^status:/, '').trim().replace(/^['"]|['"]$/g, '') : null;

  if (status === null) {
    violations.push(`${rel}  unknown-status  frontmatter has no status: field; expected one of ${[...STATUSES].join(', ')}`);
    continue;
  }
  if (!STATUSES.has(status)) {
    violations.push(`${rel}  unknown-status  status "${status}" is not one of ${[...STATUSES].join(', ')} (skills/documentation/SKILL.md:81)`);
    continue;
  }
  if (status !== 'superseded') continue;

  // Body = everything after the closing ---, so a `date:` in frontmatter can never be mistaken for a
  // pointer. Line numbers below are body-relative AND file-relative: the first is what SCAN_LINES
  // means, the second is what an editor jumps to.
  const bodyStart = block[0].length;
  const offset = src.slice(0, bodyStart).split(/\r?\n/).length - 1;
  const window = src.slice(bodyStart).split(/\r?\n/).slice(0, SCAN_LINES);

  const found = [];
  window.forEach((line, i) => {
    for (const m of line.matchAll(/\d{4}/g)) {
      if (m[0] !== id && ids.has(m[0])) found.push({ n: m[0], line: i + 1 });
    }
  });

  if (found.length === 0) {
    violations.push(`${rel}  superseded-without-successor  status is superseded but the first ${SCAN_LINES} body line(s) (file lines ${offset + 1}-${offset + SCAN_LINES}) name no other existing ADR — a reader who skims the frontmatter reads a reversed decision as current`);
  }
}

// The examined count prints on BOTH paths on purpose: "0 violations" and "0 files examined" read
// identically otherwise, and a corpus that silently resolved to nothing would look like a clean one.
const tail = `${corpus.length} ADR(s) examined under docs/adr/${skipped.length ? `, ${skipped.length} non-ADR file(s) skipped: ${skipped.join(', ')}` : ''}`;

if (violations.length === 0) {
  console.log(`check-adr: clean — ${tail}`);
  console.log('Pointer existence only. That the ADR named is the one that actually replaced this');
  console.log('decision is semantic, and no script here can see it.');
  process.exit(0);
}
console.log(violations.join('\n'));
console.log(`\ncheck-adr: ${violations.length} violation(s); ${tail}.`);
process.exit(1);
