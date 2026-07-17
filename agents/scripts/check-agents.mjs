#!/usr/bin/env node
// agents — mechanical checks for subagent definitions.
// Enforces what is deterministic: frontmatter parses, name matches filename, tools resolve,
// read-only agents hold no write tools, preloaded skills exist. Whether an agent LAUNCHES and
// whether `skills:` actually preloads is NOT here — that needs a live dispatch in a fresh
// session (agent types are enumerated at session start; files are not hot-reloaded).
// Usage: node check-agents.mjs [root]   Exit 1 = at least one violation.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Default to the repo this script ships in — never the shell CWD, which drifts.
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] ?? join(here, '..', '..'));

// Best-effort list — the harness owns the real one, so this WILL drift as tools are added or
// renamed. An entry missing here is a false alarm, not a broken agent: the check reports
// "not in this checker's list", never "will fail". Only WRITE_TOOLS is authoritative — it is
// this repo's own read-only rule, not a harness fact.
const KNOWN_TOOLS = new Set(['Read', 'Grep', 'Glob', 'Bash', 'PowerShell', 'Write', 'Edit',
  'NotebookEdit', 'Agent', 'Skill', 'Task', 'WebFetch', 'WebSearch', 'TodoWrite', 'Artifact',
  'Workflow', 'ToolSearch', 'SendMessage', 'TaskOutput', 'TaskStop', 'Monitor', 'ReportFindings']);
const WRITE_TOOLS = ['Write', 'Edit', 'NotebookEdit'];
// Alias, alias with a variant suffix (opus[1m]), or a full model id (claude-sonnet-5).
const MODEL_RE = /^(?:(?:sonnet|opus|haiku|fable|inherit)(?:\[[^\]]+\])?|claude-[a-z0-9.\-\[\]]+)$/;

const rel = (p) => relative(root, p).split('\\').join('/') || '.';
// A key with no value parses to [] (a block list may follow). [] is truthy — so never test a
// field for presence with a bare truthiness check.
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

// Minimal frontmatter reader: `key: value` + `  - item` block lists. Enough for agent defs.
const frontmatter = (src) => {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  const fm = {};
  let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z]+):\s*(.*)$/);
    const item = line.match(/^\s+-\s+(.+)$/);
    if (kv) { key = kv[1]; fm[key] = kv[2] === '' ? [] : kv[2]; }
    else if (item && key) { if (!Array.isArray(fm[key])) fm[key] = []; fm[key].push(item[1].trim()); }
    else if (line.trim()) return { __bad: line };
  }
  return fm;
};

const agentsDir = join(root, 'agents');
if (!existsSync(agentsDir)) {
  console.error(`check-agents: no agents/ under ${root}`);
  process.exit(2);
}

const files = readdirSync(agentsDir).filter((f) => f.endsWith('.md'));
const violations = [];

for (const file of files) {
  const path = join(agentsDir, file);
  const fm = frontmatter(readFileSync(path, 'utf8'));

  if (!fm) { violations.push(`${rel(path)}  no-frontmatter  agent definition needs a --- block`); continue; }
  if (fm.__bad) { violations.push(`${rel(path)}  bad-frontmatter  unparsable line: ${fm.__bad}`); continue; }

  // Required fields. Missing either => agent cannot be dispatched.
  const name = str(fm.name);
  const description = str(fm.description);
  if (!name) violations.push(`${rel(path)}  missing-field  name is required`);
  if (!description) violations.push(`${rel(path)}  missing-field  description is required`);

  const expect = file.replace(/\.md$/, '');
  if (name && name !== expect) {
    violations.push(`${rel(path)}  name-mismatch  name "${name}" != filename "${expect}"`);
  }
  if (name && !/^[a-z0-9-]+$/.test(name)) {
    violations.push(`${rel(path)}  bad-name  must be lowercase-kebab: ${name}`);
  }
  // Dispatch leans entirely on description (no skill points at these agents by name).
  if (description && description.length < 80) {
    violations.push(`${rel(path)}  thin-description  too short to attract auto-delegation; state WHEN to delegate`);
  }

  // Omitting tools: is NOT neutral — it inherits every tool, Write and Edit included. The
  // read-only rule therefore has to fail on the ABSENCE of the line, not just on a bad value.
  const declared = str(fm.tools);
  if (!declared) {
    violations.push(`${rel(path)}  not-read-only  no tools: — inherits ALL tools incl. Write/Edit; declare an explicit allowlist`);
  } else {
    const tools = declared.split(',').map((s) => s.trim()).filter(Boolean);
    for (const t of tools) {
      if (!KNOWN_TOOLS.has(t)) {
        violations.push(`${rel(path)}  unknown-tool  "${t}" not in this checker's known-tool list — verify against the harness; a name it does not accept prevents launch`);
      }
    }
    for (const w of WRITE_TOOLS) {
      if (tools.includes(w)) violations.push(`${rel(path)}  not-read-only  holds ${w}; agents here are analysis-only (see README)`);
    }
  }

  // Preloaded skills must exist — skills are NOT auto-discovered inside a subagent.
  const skills = Array.isArray(fm.skills) ? fm.skills : (fm.skills ? [String(fm.skills)] : []);
  for (const s of skills) {
    if (!existsSync(join(root, 'skills', s, 'SKILL.md'))) {
      violations.push(`${rel(path)}  unknown-skill  skills: "${s}" has no skills/${s}/SKILL.md`);
    }
  }

  const model = str(fm.model);
  if (model && !MODEL_RE.test(model)) {
    violations.push(`${rel(path)}  unknown-model  "${model}" — expected an alias (sonnet|opus|haiku|fable|inherit), an alias with a variant suffix (opus[1m]), or a full claude-* id`);
  }
}

if (!violations.length) {
  console.log(`check-agents: clean — ${files.length} agent definition(s) under ${rel(agentsDir)}`);
  console.log('Static only. Launch + skills: preload still need a live dispatch in a fresh session.');
  process.exit(0);
}
console.log(violations.join('\n'));
console.log(`\ncheck-agents: ${violations.length} violation(s) across ${files.length} agent definition(s).`);
process.exit(1);
