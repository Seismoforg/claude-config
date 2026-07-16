#!/usr/bin/env node
// documentation — mechanical doc-structure checks.
// Enforces the HARD RULES that are deterministic: CLAUDE.md sibling, bidirectional
// # Related Modules links, unbroken relative links. Prose quality (terse/caveman,
// English, "is this the right doc") is NOT here: that needs judgment.
// Usage: node check-docs.mjs [root]   Exit 1 = at least one violation.

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, relative, resolve, posix } from 'node:path';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage']);
const root = resolve(process.argv[2] ?? '.');

const findAgents = (dir, out = []) => {
  for (const e of readdirSync(dir)) {
    if (SKIP_DIRS.has(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) findAgents(p, out);
    else if (e === 'AGENTS.md') out.push(p);
  }
  return out;
};

const rel = (p) => relative(root, p).split('\\').join('/') || '.';
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

if (!existsSync(root)) {
  console.error(`check-docs: no such path: ${root}`);
  process.exit(2);
}

const agents = findAgents(root);
const violations = [];
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
    if (!existsSync(resolve(dir, target))) {
      violations.push(`${rel(file)}  broken-link  ${target} does not resolve`);
    }
  }

  // Related Modules edges, for the bidirectional check.
  const set = new Set();
  for (const target of links(section(src, 'Related Modules'))) {
    const abs = resolve(dir, target);
    const asAgents = abs.endsWith('AGENTS.md') ? abs : join(abs, 'AGENTS.md');
    if (existsSync(asAgents)) set.add(asAgents);
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
