#!/usr/bin/env node
// documentation — mechanical doc-structure checks.
// Enforces the HARD RULES that are deterministic: CLAUDE.md sibling, bidirectional
// # Related Modules links, unbroken relative links. Prose quality (terse/simple-language,
// English, "is this the right doc") is NOT here: that needs judgment.
// Usage: node check-docs.mjs [root]   Exit 1 = at least one violation.

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, relative, resolve, isAbsolute, posix } from 'node:path';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage']);
const root = resolve(process.argv[2] ?? '.');

const rel = (p) => relative(root, p).split('\\').join('/') || '.';
const violations = [];

// statSync throws ENOENT on a dangling symlink/junction, which killed the whole run with a raw
// stack trace. Report the entry and keep walking — a broken link is a finding, not a crash.
const statOr = (p) => {
  try { return statSync(p); } catch (e) {
    violations.push(`${rel(p)}  unreadable-path  ${e.code ?? e.message} — dangling symlink/junction or unreadable entry`);
    return null;
  }
};

const findAgents = (dir, out = []) => {
  for (const e of readdirSync(dir)) {
    if (SKIP_DIRS.has(e)) continue;
    const p = join(dir, e);
    const st = statOr(p);
    if (!st) continue;
    if (st.isDirectory()) findAgents(p, out);
    else if (e === 'AGENTS.md') out.push(p);
  }
  return out;
};

// existsSync is CASE-INSENSITIVE on Windows/NTFS, so a link written `docs/agents.md` resolves
// against `docs/AGENTS.md` and a genuinely broken link passes. Worse, the edges Map is keyed by
// the on-disk spelling, so the mis-cased path never matches and a valid pair reads as one-way.
// Walk the segments below root and demand readdirSync's exact spelling for each.
const existsExact = (abs) => {
  if (!existsSync(abs)) return false;
  const relPath = relative(root, abs);
  const parts = relPath.split(/[\\/]/).filter((p) => p && p !== '.');
  // Outside root there is nothing of ours to compare against — existsSync is the only answer.
  // A target on another drive relativizes to an absolute path with no `..`, so test both.
  if (isAbsolute(relPath) || parts.includes('..')) return true;
  let dir = root;
  for (const part of parts) {
    let entries;
    try { entries = readdirSync(dir); } catch { return false; }
    if (!entries.includes(part)) return false;
    dir = join(dir, part);
  }
  return true;
};
// Markdown links, minus external + pure-anchor targets.
const links = (src) =>
  [...src.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
    .map((m) => m[1].split('#')[0].trim())
    .filter((t) => t && !/^(https?:|mailto:)/.test(t));

const section = (src, heading) => {
  const re = new RegExp(`^#+\\s*${heading}\\s*$`, 'im');
  const m = re.exec(src);
  if (!m) return '';
  const rest = src.slice(m.index + m[0].length);
  const next = /^#+\s/m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
};

// isDirectory() as well as existsSync: a FILE passed as root reached readdirSync and died on a
// raw ENOTDIR stack trace instead of reporting anything.
if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`check-docs: not a directory: ${root}`);
  process.exit(2);
}

const agents = findAgents(root);
const edges = new Map(); // AGENTS.md abs path -> Set of linked AGENTS.md abs paths

for (const file of agents) {
  const src = readFileSync(file, 'utf8');
  const dir = dirname(file);

  // HARD RULE: every AGENTS.md has a CLAUDE.md sibling containing @AGENTS.md.
  const sibling = join(dir, 'CLAUDE.md');
  if (!existsSync(sibling)) {
    violations.push(`${rel(file)}  missing-sibling  no CLAUDE.md beside it. Create one containing exactly: @AGENTS.md`);
  } else if (!/^@AGENTS\.md\s*$/m.test(readFileSync(sibling, 'utf8'))) {
    violations.push(`${rel(sibling)}  bad-sibling  must contain the line @AGENTS.md (source of truth stays in AGENTS.md)`);
  }

  // Broken relative links, anywhere in the file.
  for (const target of links(src)) {
    if (!existsExact(resolve(dir, target))) {
      violations.push(`${rel(file)}  broken-link  ${target} does not resolve`);
    }
  }

  // Related Modules edges, for the bidirectional check.
  const set = new Set();
  for (const target of links(section(src, 'Related Modules'))) {
    const abs = resolve(dir, target);
    const asAgents = abs.endsWith('AGENTS.md') ? abs : join(abs, 'AGENTS.md');
    // Exact spelling required: the Map is keyed by findAgents' on-disk paths, so a mis-cased
    // edge would never match its key and would fabricate a one-way-link.
    if (existsExact(asAgents)) set.add(asAgents);
  }
  edges.set(file, set);
}

// HARD RULE: parent lists child, child links back. Both ends, same change.
for (const [from, tos] of edges) {
  for (const to of tos) {
    if (!edges.get(to)?.has(from)) {
      violations.push(`${rel(to)}  one-way-link  ${rel(from)} links here under # Related Modules, but there is no link back`);
    }
  }
}

if (!violations.length) {
  console.log(`check-docs: clean — ${agents.length} AGENTS.md file(s) under ${rel(root) === '.' ? root : rel(root)}`);
  process.exit(0);
}
console.log(violations.join('\n'));
console.log(`\ncheck-docs: ${violations.length} violation(s) across ${agents.length} AGENTS.md file(s). Structure only — prose style/coverage still needs review.`);
process.exit(1);
