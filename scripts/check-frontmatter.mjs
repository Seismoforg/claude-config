#!/usr/bin/env node
// frontmatter — repo-wide check that every skill and every agent has frontmatter a YAML parser will
// actually accept, and that it carries the fields the harness needs.
// The defect this exists for is SILENT: an unquoted `description:` containing a colon-space is a
// nested mapping to YAML, the parser rejects the block, the file still loads, and only its
// frontmatter is lost. A skill with no description never matches auto-delegation and nothing
// reports it. Observed twice in this repo before the check existed.
//
// WHAT IT OWNS: YAML validity of the frontmatter, plus `name` matching what resolves the file — its
// folder for a skill, its filename for an agent. Nothing else — the BODY is prose and no script here
// judges it. PRESENCE and non-emptiness only: this check never reads a field's VALUE beyond `name`,
// so a `tools:` line that grew a new entry passes. That is the accepted limit, and the alternative
// was refused on purpose — a rule naming one agent file goes silent the moment the file is renamed.
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
// CORPUS IS AN ALLOWLIST — never a list of places to ignore. Two trees, both IN.
// IN: skills/*/SKILL.md — the files whose frontmatter the harness reads to load a skill.
// IN: agents/*.md — the four subagent definitions, whose frontmatter the harness reads to register
// one. Not covered before this, and agents/AGENTS.md recorded them as verified by nothing.
// OUT, by construction and for the same reason in both trees: AGENTS.md and CLAUDE.md are the
// FOLDER's own documentation, not a unit the harness loads, and they carry no frontmatter to check.
// A skills/ folder holding no SKILL.md contributes nothing. The rules/ tree is outside this check
// entirely: a rule file has no frontmatter and nothing auto-loads it.
// Usage: node check-frontmatter.mjs [root]   Exit 1 = at least one violation.
// Exit 2 = the run was INVALID and nothing was examined: bad root, a missing skills/ or agents/, or
// EITHER corpus resolving to zero files. Never read a 2 as a pass — [root] defaults to this script's
// own repo, not the shell CWD.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Default to the repo this script ships in — never the shell CWD, which drifts. This file sits at
// <repo>/scripts/, so the root is one level up.
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

// The two corpora differ in exactly two things — the required-field LIST and how `expect` is
// derived — and in nothing else. Everything downstream is one loop over one entry shape, so a rule
// tightened for skills is tightened for agents by construction rather than by somebody remembering.
const SKILL_FIELDS = ['name', 'description'];
// `tools` and `model` are required of an agent because their ABSENCE is the dangerous case: a
// definition with no `tools:` line inherits every tool the harness has, silently, and a missing
// `model:` picks one nobody chose. Presence and non-emptiness only — see WHAT IT OWNS above.
const AGENT_FIELDS = ['name', 'description', 'tools', 'model'];
// The folder's own documentation, excluded exactly as skills/AGENTS.md and skills/CLAUDE.md are.
const FOLDER_DOCS = new Set(['AGENTS.md', 'CLAUDE.md']);

// A corpus root that vanished must ABORT, not shrink the corpus in silence. A renamed skills/ would
// otherwise leave this check with nothing to parse and still print "clean" — the same silent
// nothing-happened failure it exists to catch inside a frontmatter block.
const corpusRoot = (name) => {
  const dir = join(root, name);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    console.error(`check-frontmatter: corpus root missing: ${name}/ under ${root}`);
    process.exit(2);
  }
  return dir;
};

const corpus = [];

const skillsDir = corpusRoot('skills');
for (const d of readdirSync(skillsDir, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const p = join(skillsDir, d.name, 'SKILL.md');
  // The harness resolves a skill by its FOLDER, so that is what `name` has to equal.
  if (existsSync(p)) corpus.push({ path: p, kind: 'skill', expect: d.name, required: SKILL_FIELDS });
}

const agentsDir = corpusRoot('agents');
for (const d of readdirSync(agentsDir, { withFileTypes: true })) {
  if (!d.isFile() || !d.name.endsWith('.md') || FOLDER_DOCS.has(d.name)) continue;
  // An agent is resolved by its FILENAME, so `name` has to equal the stem: haiku-agent.md → haiku-agent.
  const expect = d.name.slice(0, -'.md'.length);
  corpus.push({ path: join(agentsDir, d.name), kind: 'agent', expect, required: AGENT_FIELDS });
}

// A root that exists and still yielded nothing: an empty set is not a pass. Counted PER CORPUS, so
// an agents/ tree that resolved to zero files cannot hide inside a healthy skills count.
const totals = { skill: 0, agent: 0 };
const parsed = { skill: 0, agent: 0 };
for (const { kind } of corpus) totals[kind]++;
for (const [kind, n] of Object.entries(totals)) {
  if (n === 0) {
    console.error(`check-frontmatter: no ${kind} file found under ${root} — nothing checked`);
    process.exit(2);
  }
}

const violations = [];

for (const { path, kind, expect, required } of corpus) {
  const src = readFileSync(path, 'utf8');
  // Strip a leading BOM first: an editor-added U+FEFF sits in front of the opening --- and makes
  // this ^--- match miss, so a perfectly good file is reported as `no-frontmatter` — a true failure
  // under a misleading name, which sends the reader hunting for a --- block that is already there.
  // Written as the escape, never the raw codepoint, which any tool normalising zero-width
  // characters on save would delete invisibly.
  const block = src.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  // Extraction failing is a VIOLATION, never a skip. A skipped file contributes zero violations and
  // reads exactly like a clean one — the trap this check would otherwise share with the bug it hunts.
  if (!block) {
    violations.push(`${rel(path)}  no-frontmatter  no --- block a parser can read; the harness gets nothing`);
    continue;
  }
  parsed[kind]++;

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

  for (const field of required) {
    if (!(field in seen)) violations.push(`${rel(path)}  missing-${field}  the harness needs it; without it the ${kind} still loads and the gap is silent`);
    else if (seen[field].trim() === '') violations.push(`${rel(path)}  empty-${field}  present but blank`);
  }
  // The harness resolves a skill by its folder and an agent by its filename; a `name` that disagrees
  // makes every pointer to it in prose name something the tool cannot find.
  if (seen.name && seen.name.trim() !== expect) {
    const source = kind === 'skill' ? 'folder name' : 'file stem';
    violations.push(`${rel(path)}  name-mismatch  name "${seen.name.trim()}" is not the ${source} "${expect}"`);
  }
}

// The parsed count is printed on BOTH paths on purpose: "0 violations" and "0 files examined" print
// identically otherwise, and a corpus that silently resolved to nothing would read as a clean tree.
// The two corpora are counted SEPARATELY for the same reason one level down: "0 agents examined"
// added into a healthy skills count is invisible, which is the failure this line exists to prevent.
const counted = `${parsed.skill} of ${totals.skill} skill file(s) under skills/ and ${parsed.agent} of ${totals.agent} agent file(s) under agents/`;

if (violations.length === 0) {
  console.log(`check-frontmatter: clean — parsed ${counted}`);
  console.log('YAML validity + the required harness fields only. That a description still MATCHES a');
  console.log('request, or that a tools list is the RIGHT one, is semantic and no script here sees it.');
  process.exit(0);
}
console.log(violations.join('\n'));
console.log(`\ncheck-frontmatter: ${violations.length} violation(s); parsed ${counted}.`);
process.exit(1);
