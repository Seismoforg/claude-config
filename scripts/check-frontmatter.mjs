#!/usr/bin/env node
// frontmatter — repo-wide check that every skill and agent definition has frontmatter a YAML parser
// will actually accept, and that it carries the two fields the harness needs.
// The defect this exists for is SILENT: an unquoted `description:` containing a colon-space is a
// nested mapping to YAML, the parser rejects the block, the file still loads, and only its
// frontmatter is lost. A skill with no description never matches auto-delegation and nothing
// reports it. Observed twice in this repo before the check existed.
//
// WHAT IT OWNS: YAML validity, for skills AND agents. agents/scripts/check-agents.mjs keeps agent
// SEMANTICS — name matches filename, tools and skills declared, analysis vs executor. Ownership
// splits by QUESTION, not by file: the same rules living in two scripts is how they drift apart.
// That is why `name` matching its location is asserted for SKILLS ONLY here — nobody checks that
// half, while check-agents already owns the agent half.
//
// NOT CHECKED, deliberately, and this list is the scope boundary — extend it on purpose, never by
// reflex after one false negative. A hand-rolled validator that accretes rules ends up disagreeing
// with the real parser in both directions, and a check that blocks valid files stops being run:
//   anchors and aliases · block scalars (| and >) beyond their leading indicator · multi-line plain
//   scalars, which are LEGAL and so must not be flagged · tabs · repeated keys · multiple documents.
// A quoted value is the author's escape hatch and is skipped whole.
// WHERE A RULE IS UNCERTAIN, DO NOT FIRE. A false negative costs one silent description; a false
// positive costs the habit of running this at all, and it is a manual check already.
//
// CORPUS IS AN ALLOWLIST — never a list of places to ignore (skills/feature/SKILL.md, step 6).
// IN: skills/*/SKILL.md and agents/*.md — the files whose frontmatter the harness reads.
// OUT, by construction: agents/AGENTS.md and agents/CLAUDE.md are documentation, not definitions
// (agents/AGENTS.md:16 records that check-agents.mjs and build-copilot.mjs skip them by name, for
// the same reason). skills/_shared/ holds no SKILL.md and so contributes nothing on its own.
// Usage: node check-frontmatter.mjs [root]   Exit 1 = at least one violation.
// Exit 2 = the run was INVALID and nothing was examined: bad root, a missing skills/ or agents/, or
// a corpus that resolved to zero files. Never read a 2 as a pass — [root] defaults to this script's
// own repo, not the shell CWD.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Default to the repo this script ships in — never the shell CWD, which drifts. Same rule as
// check-pointers.mjs; this file sits at <repo>/scripts/, so the root is one level up.
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] ?? join(here, '..'));

// A bad root must be a named error, never a quiet "nothing to check" — the two look identical in a
// log otherwise. isDirectory() as well as existsSync: a FILE passed as root reaches readdirSync and
// dies on a raw ENOTDIR stack trace.
if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`check-frontmatter: not a directory: ${root}`);
  process.exit(2);
}
const rel = (p) => relative(root, p).split(sep).join('/');

// Values starting with one of these are not the string the author meant: flow collections, aliases,
// anchors, tags, block scalars, directives, and YAML's two reserved indicators.
const INDICATORS = '[{*&!|>%@`';

const corpus = [];
const skillsDir = join(root, 'skills');
const agentsDir = join(root, 'agents');

// A corpus root that vanished must ABORT, not shrink the corpus in silence. A renamed skills/ would
// otherwise leave this check with nothing to parse and still print "clean" — the same silent
// nothing-happened failure it exists to catch inside a frontmatter block.
for (const [label, p] of [['skills', skillsDir], ['agents', agentsDir]]) {
  if (!existsSync(p) || !statSync(p).isDirectory()) {
    console.error(`check-frontmatter: corpus root missing: ${label}/ under ${root}`);
    process.exit(2);
  }
}

for (const d of readdirSync(skillsDir, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const p = join(skillsDir, d.name, 'SKILL.md');
  if (existsSync(p)) corpus.push({ path: p, kind: 'skill', expect: d.name });
}
for (const f of readdirSync(agentsDir)) {
  if (!f.endsWith('.md') || f === 'AGENTS.md' || f === 'CLAUDE.md') continue;
  corpus.push({ path: join(agentsDir, f), kind: 'agent', expect: null });
}

// Both roots exist and still yielded nothing: an empty set is not a pass.
if (corpus.length === 0) {
  console.error(`check-frontmatter: no SKILL.md or agent definition found under ${root} — nothing checked`);
  process.exit(2);
}

const violations = [];
let parsed = 0;

for (const { path, kind, expect } of corpus) {
  const src = readFileSync(path, 'utf8');
  const block = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  // Extraction failing is a VIOLATION, never a skip. A skipped file contributes zero violations and
  // reads exactly like a clean one — the trap this check would otherwise share with the bug it hunts.
  if (!block) {
    violations.push(`${rel(path)}  no-frontmatter  no --- block a parser can read; the harness gets nothing`);
    continue;
  }
  parsed++;

  const seen = {};
  block[1].split(/\r?\n/).forEach((line, i) => {
    const kv = line.match(/^([A-Za-z_-]+)(:[ \t]*)(.*)$/);
    if (!kv) return; // continuation lines and list items: legal, and out of scope above.
    const [, key, gap, value] = kv;
    seen[key] = value;
    if (value === '' || /^['"]/.test(value)) return;

    // Line numbers are FRONTMATTER-relative because that is what the harness error reports; the file
    // line is given too, since that is what an editor jumps to. Column counts the whole line.
    const fmLine = i + 1;
    const at = (j) => `fm-line ${fmLine} col ${key.length + gap.length + j + 1} (file line ${fmLine + 1})`;

    const colon = value.indexOf(': ');
    if (colon >= 0) violations.push(`${rel(path)}  colon-in-scalar  ${key}: unquoted value has ": " at ${at(colon)} — YAML reads it as a nested mapping and drops the whole block`);
    if (/:$/.test(value)) violations.push(`${rel(path)}  colon-in-scalar  ${key}: unquoted value ends in ":" at ${at(value.length - 1)} — same defect at the end of the line`);
    const hash = value.search(/(^|\s)#/);
    if (hash >= 0) violations.push(`${rel(path)}  comment-in-scalar  ${key}: unquoted value has "#" at ${at(hash === 0 ? 0 : hash + 1)} — everything after it is a comment and is silently dropped`);
    if (INDICATORS.includes(value[0])) violations.push(`${rel(path)}  indicator-in-scalar  ${key}: unquoted value starts with "${value[0]}" at ${at(0)} — that is a YAML indicator, not text`);
  });

  for (const field of ['name', 'description']) {
    if (!(field in seen)) violations.push(`${rel(path)}  missing-${field}  the harness needs it; without it the file is loaded but never matched`);
    else if (seen[field].trim() === '') violations.push(`${rel(path)}  empty-${field}  present but blank`);
  }
  // Skills only — the agent half is check-agents.mjs's, and two checkers on one question drift.
  if (kind === 'skill' && seen.name && seen.name.trim() !== expect) {
    violations.push(`${rel(path)}  name-mismatch  name "${seen.name.trim()}" is not the folder name "${expect}"`);
  }
}

// The parsed count is printed on BOTH paths on purpose: "0 violations" and "0 files examined" print
// identically otherwise, and a corpus that silently resolved to nothing would read as a clean tree.
if (violations.length === 0) {
  console.log(`check-frontmatter: clean — ${parsed} of ${corpus.length} file(s) parsed under skills/, agents/`);
  console.log('YAML validity + the two harness fields only. That a description still MATCHES a request');
  console.log('is semantic, fails silently, and no script here can see it.');
  process.exit(0);
}
console.log(violations.join('\n'));
console.log(`\ncheck-frontmatter: ${violations.length} violation(s); ${parsed} of ${corpus.length} file(s) parsed under skills/, agents/.`);
process.exit(1);
