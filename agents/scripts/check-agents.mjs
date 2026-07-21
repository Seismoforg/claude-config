#!/usr/bin/env node
// agents — mechanical checks for subagent definitions.
// Enforces what is deterministic: frontmatter parses, name matches filename, declared tools are
// known to THIS checker's list (see KNOWN_TOOLS — best-effort, not the harness's truth),
// analysis agents hold no write tools while executor agents may, no agent holds Agent (a subagent
// cannot nest), preloaded skills exist, some skill dispatches the agent.
// Two classes (frontmatter `class:`): analysis (default, read-only) and executor (may write, runs
// in an isolated worktree). Absent = analysis, so the existing read-only agents are unaffected.
// Whether an agent LAUNCHES and whether `skills:` actually preloads is NOT here — that needs a
// live dispatch, which may take a later turn or a restart; registration is not guaranteed
// immediate. Being NAMED is static and checked; being dispatchable is not.
// Usage: node check-agents.mjs [root]   Exit 1 = at least one violation.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
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
// Write/Edit/NotebookEdit are the only WRITE capability this check can prove. Bash/PowerShell also
// write (rm, >, git reset) and cannot be checked statically — an analysis agent holding one is
// read-only only by its own prose briefing. So a clean exit means "an analysis agent declares no
// write TOOL", never "cannot write". Adding a shell to an analysis agent obliges you to brief it
// read-only by hand. Executor agents are ALLOWED these — they write by design; their containment
// is the worktree (a dispatch-time flag this check cannot see), so it requires the briefing instead.
const WRITE_TOOLS = ['Write', 'Edit', 'NotebookEdit'];
const SHELL_TOOLS = ['Bash', 'PowerShell'];
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

// An agent nothing names is dead on arrival — a description alone does not route work to it.
// Text of every .md that could dispatch one. agents/ is the definition itself; README.md only
// documents the roster; features/ records past work — none of the three wires anything, so none
// counts as being wired.
// statSync, never Dirent.isDirectory(): a Windows junction reports false as a Dirent, so a
// junctioned skills/ would vanish and every agent would read as orphaned. This repo is reached
// via exactly such a junction. Same SKIP_DIRS + statSync shape as check-docs.mjs.
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage']);
const walk = (dir) => readdirSync(dir).flatMap((e) => {
  if (SKIP_DIRS.has(e) || e.startsWith('.')) return [];
  const p = join(dir, e);
  return statSync(p).isDirectory() ? walk(p) : (e.endsWith('.md') ? [p] : []);
});
const dispatchText = walk(root)
  .filter((p) => {
    const r = rel(p);
    return !r.startsWith('agents/') && !r.startsWith('features/') && r !== 'README.md';
  })
  .map((p) => readFileSync(p, 'utf8'))
  .join('\n');

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
  // Skills name these agents, but auto-delegation still leans on description — keep it explicit.
  if (description && description.length < 80) {
    violations.push(`${rel(path)}  thin-description  too short to attract auto-delegation; state WHEN to delegate`);
  }

  // Word-boundary so "audit-scout" never matches "audit-scouts". Re-test the name shape rather
  // than trusting bad-name above to have stopped us: it only REPORTS, it does not skip, and an
  // unescaped metacharacter here throws a SyntaxError instead of printing a violation.
  // Proves the name APPEARS in a skill, never that the dispatch works.
  if (name && /^[a-z0-9-]+$/.test(name) && !new RegExp(`\\b${name}\\b`).test(dispatchText)) {
    violations.push(`${rel(path)}  orphaned  no skill names "${name}" — nothing dispatches it; name it in the skill that owns its job, in the step that fans out (README/features do not count as wiring)`);
  }

  // Class gates the write rules below. Absent = analysis, so untagged agents stay read-only.
  const klass = str(fm.class) ?? 'analysis';
  if (klass !== 'analysis' && klass !== 'executor') {
    violations.push(`${rel(path)}  bad-class  class "${klass}" — expected analysis or executor`);
  }
  const isExecutor = klass === 'executor';
  const body = readFileSync(path, 'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');

  // Omitting tools: is NOT neutral — it inherits every tool, Write/Edit AND Agent included. The
  // allowlist rule therefore has to fail on the ABSENCE of the line, not just on a bad value.
  const declared = str(fm.tools);
  if (!declared) {
    violations.push(`${rel(path)}  no-tools  no tools: — inherits ALL tools incl. Write/Edit and Agent; declare an explicit allowlist`);
  } else {
    const tools = declared.split(',').map((s) => s.trim()).filter(Boolean);
    for (const t of tools) {
      if (!KNOWN_TOOLS.has(t)) {
        violations.push(`${rel(path)}  unknown-tool  "${t}" not in this checker's known-tool list — verify against the harness; a name it does not accept prevents launch`);
      }
    }
    // No agent nests — a subagent cannot dispatch another subagent (README). Both classes.
    if (tools.includes('Agent')) {
      violations.push(`${rel(path)}  no-nesting  holds Agent; a subagent cannot dispatch another — dispatch stays in the main loop`);
    }
    // Write tools: analysis agents are read-only; executors write by design, so skip them.
    if (!isExecutor) {
      for (const w of WRITE_TOOLS) {
        if (tools.includes(w)) violations.push(`${rel(path)}  not-read-only  holds ${w}; analysis agents are read-only. An agent that must write declares class: executor (see README)`);
      }
    }
    // A shell is allowed but not free. Analysis: the body must spell out the read-only limit
    // itself, because nothing downstream enforces it. Presence-only heuristic — it proves a
    // briefing was WRITTEN, never that it is correct or that the agent obeys it. Prose asserting
    // the opposite would pass. Deliberately not clever: a stricter regex teaches authors to write
    // around it. Body only — every analysis description opens with "Read-only", so scanning the
    // frontmatter would let that sentence satisfy the rule and green-light an unbriefed agent.
    // Executor: its shell legitimately writes, so this read-only briefing does not apply; the
    // worktree check below covers its containment instead.
    for (const s of SHELL_TOOLS) {
      if (!tools.includes(s) || isExecutor) continue;
      const briefed = body.split(/\r?\n/).some((l) => l.includes(s) && /READ-ONLY/i.test(l));
      if (!briefed) {
        violations.push(`${rel(path)}  unbriefed-shell  holds ${s} but no body line marks it READ-ONLY; a shell writes (rm, >, git reset) and this checker cannot stop it — brief it by hand`);
      }
    }
  }

  // An executor writes — its blast radius is contained only by running in an isolated worktree,
  // which is a dispatch-time flag this check cannot see. So it demands the briefing be present,
  // same presence-only logic (and same limits) as unbriefed-shell.
  if (isExecutor) {
    const briefed = body.split(/\r?\n/).some((l) => /worktree/i.test(l));
    if (!briefed) {
      violations.push(`${rel(path)}  unbriefed-executor  class: executor but no body line mentions its worktree isolation; it must be dispatched with isolation: worktree and say so — brief it by hand`);
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
  console.log('Static only. Launch + skills: preload still need a live dispatch (maybe a later turn).');
  // The pass path is the one people read — disclose here, not only in the failure message.
  console.log('"Clean" for an analysis agent = declares no write TOOL; for an executor = declares its');
  console.log('worktree briefing. Either can still write via Bash/PowerShell, and an executor writes by');
  console.log('design — that containment is prose + a dispatch-time worktree flag, unenforceable here.');
  console.log('Read its briefing yourself.');
  process.exit(0);
}
console.log(violations.join('\n'));
console.log(`\ncheck-agents: ${violations.length} violation(s) across ${files.length} agent definition(s).`);
process.exit(1);
