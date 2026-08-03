#!/usr/bin/env node
// build-copilot — translate this config's skills, agents and CLAUDE.md into GitHub Copilot formats.
//
// Deterministic by construction: DATA drives everything, no model is involved, and the same input
// always produces the same bytes. That is the whole point — a converter you cannot diff is a
// converter you cannot trust.
//
// Usage:
//   node scripts/build-copilot.mjs [root]                  write github_build/
//   node scripts/build-copilot.mjs [root] --check          re-derive and exit 1 if github_build/ differs
//   node scripts/build-copilot.mjs [root] --install-skills install the skills for the CURRENT USER
//   node scripts/build-copilot.mjs [root] --install-skills=<dir>   ... into <dir> instead
//
// --install-skills copies the emitted skills into a personal skills directory Copilot reads,
// default `~/.copilot/skills`. github_build/ is a portable artifact for a REPO; this is the
// per-machine install. It writes only the skill folders it emits and never deletes anything —
// a folder it does not own is reported, not removed.
//
// Exit 1 = a violation or drift. Exit 2 = bad root.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';

const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const installArg = argv.find((a) => a === '--install-skills' || a.startsWith('--install-skills='));
const INSTALL_DIR = installArg
  ? (installArg.includes('=') ? resolve(installArg.slice(installArg.indexOf('=') + 1)) : join(homedir(), '.copilot', 'skills'))
  : null;
const root = resolve(argv.find((a) => !a.startsWith('--')) ?? '.');
const OUT = join(root, 'github_build');

if (CHECK && INSTALL_DIR) {
  console.error('build-copilot: --check and --install-skills are mutually exclusive; --check writes nothing');
  process.exit(2);
}

if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`build-copilot: not a directory: ${root}`);
  process.exit(2);
}

// ─── TABLE 1: skills need no classification ───────────────────────────────────
// A skill translates to a Copilot SKILL.md, one for one. No table, no split.
//
// There USED to be one. Copilot had no skill concept, so every skill was forced into `instructions`
// (fires on an applyTo glob) or `agents` (invoked by name), and each row carried a `why` because the
// choice was a judgement call. Copilot shipped Agent Skills on 2025-12-18 with the same SKILL.md
// shape this repo already writes, so the workaround and its table are gone.
//
// What the split cost, now that it does not exist: `coding-standards` (applyTo `**`),
// `web-standards` and `taste` (web-file globs) and `documentation` (`**/*.md`) were ALWAYS applied
// to a matching file. As skills they load when Copilot judges them relevant instead. That is a real
// behaviour change and the reason the split is worth remembering — restoring always-on for one of
// them means emitting it as an instruction as well, deliberately, not by accident.

// ─── TABLE 2: tool mapping ────────────────────────────────────────────────────
// THE dangerous table. A wrong row hands a read-only worker the ability to write, and nothing
// downstream catches it: every read-only agent's BODY still says "never fixes anything", and the
// body is what a reviewer reads. `capability` is asserted below, not trusted.
// `verified` = the Copilot name was confirmed against the VS Code docs. Unverified names still
// build, but land in UNMAPPED.md so they are never mistaken for checked facts.
const TOOL_MAP = {
  Read:  { copilot: 'search/codebase', capability: 'read',  verified: true },
  Grep:  { copilot: 'search/codebase', capability: 'read',  verified: true },
  Glob:  { copilot: 'search/codebase', capability: 'read',  verified: true },
  Write: { copilot: 'edit',            capability: 'write', verified: true },
  Edit:  { copilot: 'edit',            capability: 'write', verified: true },
  Bash:  { copilot: 'runCommands',     capability: 'exec',  verified: false },
};

// The two INDEPENDENT facts the read-only assertion compares. They must not be derived from
// TOOL_MAP, and this is not a style preference — the first version of that assertion read both
// sides out of TOOL_MAP and was therefore tautological: corrupt a row and BOTH sides moved
// together, so it passed. Measured, not reasoned about: mapping Read→edit built 47 files at
// exit 0. `coding-standards` HARD RULES names the shape — two consumers of shared code asserted
// to agree cannot fail on a defect in that shared code.
// Left column: Claude tool names that cannot modify anything. Right: Copilot targets that can.
const CLAUDE_READ_ONLY = new Set(['Read', 'Grep', 'Glob']);
const COPILOT_WRITE_CAPABLE = new Set(['edit', 'runCommands']);

// ─── TABLE 3: agent frontmatter keys ──────────────────────────────────────────
// map → renamed/translated. drop → no Copilot equivalent, recorded in UNMAPPED.md. A key in
// NEITHER list FAILS the build: a converter that silently ignores an unrecognised key rots the
// first time someone adds one.
const AGENT_KEYS = {
  name:        { action: 'map',  to: 'name' },
  description: { action: 'map',  to: 'description' },
  tools:       { action: 'map',  to: 'tools' },
  skills:      { action: 'map',  to: null,  note: 'inlined into the body — Copilot has no skill-preloading concept' },
  model:       { action: 'map',  to: 'model' },
  color:       { action: 'drop', note: 'no Copilot equivalent' },
  class:       { action: 'drop', note: 'this config\'s own taxonomy; no Copilot equivalent' },
};

// ─── frontmatter ──────────────────────────────────────────────────────────────
// Minimal YAML: `key: scalar` and `key:` followed by indented `- item` lines. That is the whole
// shape used by this repo's skills and agents, verified by enumeration. Anything else is not
// silently tolerated — the caller fails on keys it does not know.
const parseFrontmatter = (src) => {
  // Strip a leading BOM once, here: an editor-added U+FEFF sits in front of the opening --- and
  // makes the ^--- match below miss, so the file reads as having no frontmatter at all. Written as
  // the escape, never the raw codepoint — an invisible character in a regex is deleted by any tool
  // that normalises zero-width chars on save, and the diff shows nothing.
  const m = src.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return null;
  const data = {};
  const lines = m[1].split(/\r?\n/);
  let key = null;
  for (const line of lines) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && key) { (Array.isArray(data[key]) ? data[key] : (data[key] = [])).push(item[1].trim()); continue; }
    const kv = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (!kv) continue;
    key = kv[1];
    const val = kv[2].trim();
    data[key] = val === '' ? [] : val.replace(/^['"]|['"]$/g, '');
  }
  return { data, body: m[2] };
};

// Stable emitter: fixed key order, so the same input always yields the same bytes. Insertion order
// would drift with the source and break --check for no real reason.
const KEY_ORDER = ['name', 'description', 'applyTo', 'tools', 'model'];
const emitFrontmatter = (obj) => {
  const out = ['---'];
  for (const k of KEY_ORDER) {
    if (obj[k] === undefined || obj[k] === null) continue;
    out.push(Array.isArray(obj[k]) ? `${k}: [${obj[k].join(', ')}]` : `${k}: ${obj[k]}`);
  }
  out.push('---', '');
  return out.join('\n');
};

// ─── pointer rewriting ────────────────────────────────────────────────────────
// Rewritten relative to `.github/`, the root that TRAVELS. Rewriting relative to github_build/
// resolves inside the build and breaks the moment `.github/` is copied to a real repo — which is
// the entire purpose of the output.
// Every skill now has ONE home, so this is a constant shape rather than a lookup.
const homeOf = (skill) => `skills/${skill}`;
const rewritePointers = (text, skill, skillNames) => text
  .replace(/`?skills\/_shared\/blocks\.md`?/g, '`.github/blocks.md`')
  .replace(/\$\{CLAUDE_SKILL_DIR\}\/scripts\//g, '.github/scripts/')
  // A pointer may name ANOTHER skill's reference — audit-solution cites coding-standards/reference/design-ai-tells.md,
  // security-review cites coding-standards/reference/dependencies.md. Resolve to the OWNING skill's
  // home when one is named; only a bare `reference/x.md` belongs to the citing skill. Assuming the
  // citing skill always owns it silently invented 3 paths that exist nowhere.
  .replace(/`?(?:skills\/)?(?:([a-z-]+)\/)?reference\/([a-z0-9._-]+\.md)`?/g, (m, owner, f) => {
    const s = owner && skillNames.has(owner) ? owner : skill;
    // Unattributable: no owner in the path AND no citing skill (an agent body, CLAUDE.md,
    // blocks.md). Leave it EXACTLY as written. Guessing a home used to emit
    // `.github/agents/reference/<f>`, a path that exists in no build — the same invented-pointer
    // failure the comment above describes, arriving through the fallback instead of the lookup.
    if (!s) return m;
    return `\`.github/${homeOf(s)}/reference/${f}\``;
  });

// ─── build ────────────────────────────────────────────────────────────────────
const files = new Map();               // build-relative path -> contents
const unmapped = [];                   // {file, key, note}
const fail = [];                       // hard violations

// Every output file is normalised to LF. Sources on Windows carry CRLF while this script's own
// templates emit LF, so without this the build mixes both and its bytes depend on the checkout that
// produced them — which is the one thing a deterministic converter must not do.
// MEASURED, not anticipated: with core.autocrlf=true and no .gitattributes, a fresh checkout of the
// committed build produced 22 drifts against a re-derive. `--check` would have failed forever for
// anyone who cloned the repo. The paired half of this fix is the `github_build/** text eol=lf` rule
// in .gitattributes — normalising here alone is not enough, because git rewrites on checkout.
const put = (p, c) => files.set(p, c.replace(/\r\n/g, '\n'));

const skillsDir = join(root, 'skills');
const agentsDir = join(root, 'agents');
// .sort(): readdirSync order is not guaranteed, and skillNames drives both the emit order and the
// pointer-rewrite lookup. Same determinism rule as the agents loop below.
const skillNames = readdirSync(skillsDir).filter((d) => existsSync(join(skillsDir, d, 'SKILL.md'))).sort();
const skillNameSet = new Set(skillNames);

const skillBody = (s) => {
  const fm = parseFrontmatter(readFileSync(join(skillsDir, s, 'SKILL.md'), 'utf8'));
  if (!fm) { fail.push(`skills/${s}/SKILL.md  no-frontmatter  needs a --- block`); return null; }
  return fm;
};

for (const s of skillNames) {
  const fm = skillBody(s);
  if (!fm) continue;
  // Only `name` and `description` are emitted: those two are the Agent Skills standard's required
  // fields and the whole of what this repo's skills declare. Everything else a SKILL.md may carry
  // (`context`, `user-invocable`, `disable-model-invocation`, `allowed-tools`) is a Claude Code
  // extension — not invented here, and not passed through if a source file ever grows one.
  const head = { name: fm.data.name ?? s, description: fm.data.description };
  if (!head.description) fail.push(`skills/${s}/SKILL.md  missing-description  required by the Agent Skills standard`);
  // The standard caps description at 1024 chars. Over it, the skill may be rejected outright, and a
  // skill that never loads is indistinguishable from one that Copilot judged irrelevant.
  if (head.description && head.description.length > 1024) {
    fail.push(`skills/${s}/SKILL.md  description-too-long  ${head.description.length} chars, cap is 1024`);
  }
  put(`.github/${homeOf(s)}/SKILL.md`, emitFrontmatter(head) + rewritePointers(fm.body, s, skillNameSet));
  // references travel with their skill, inside its own folder — the standard's own layout
  const refDir = join(skillsDir, s, 'reference');
  if (existsSync(refDir)) {
    for (const f of readdirSync(refDir).filter((f) => f.endsWith('.md')).sort()) {
      put(`.github/${homeOf(s)}/reference/${f}`, rewritePointers(readFileSync(join(refDir, f), 'utf8'), s, skillNameSet));
    }
  }
}

// agents
// .sort(): the unmapped[] rows below accumulate in THIS loop's order and are rendered unsorted into
// UNMAPPED.md, so readdirSync's order becomes output bytes. Node guarantees none, so a different
// filesystem re-derives the same build with reordered rows and --check reports drift that isn't
// there. Same reason the hash and the size table sort. Sorting the OUTER loop only, on purpose:
// within one file the rows follow the source frontmatter, which is already deterministic.
// AGENTS.md/CLAUDE.md are the folder's own docs, not agent definitions — without the filter they
// parse as agents and fail the build with no-frontmatter.
const AGENT_DOC_FILES = new Set(['AGENTS.md', 'CLAUDE.md']);
for (const f of readdirSync(agentsDir).filter((f) => f.endsWith('.md') && !AGENT_DOC_FILES.has(f)).sort()) {
  const src = readFileSync(join(agentsDir, f), 'utf8');
  const fm = parseFrontmatter(src);
  if (!fm) { fail.push(`agents/${f}  no-frontmatter  needs a --- block`); continue; }
  const head = {};
  const srcTools = typeof fm.data.tools === 'string' ? fm.data.tools.split(',').map((t) => t.trim()).filter(Boolean) : [];

  for (const [k, v] of Object.entries(fm.data)) {
    const rule = AGENT_KEYS[k];
    if (!rule) { fail.push(`agents/${f}  unknown-frontmatter-key  "${k}" is in no table — decide map or drop before this can build`); continue; }
    if (rule.action === 'drop') { unmapped.push({ file: `agents/${f}`, key: k, note: rule.note }); continue; }
    if (k === 'skills') { if (v.length) unmapped.push({ file: `agents/${f}`, key: k, note: rule.note }); continue; }
    if (k === 'tools') {
      const mapped = [];
      for (const t of srcTools) {
        const tm = TOOL_MAP[t];
        if (!tm) { fail.push(`agents/${f}  unknown-tool  "${t}" is not in TOOL_MAP`); continue; }
        if (!tm.verified) unmapped.push({ file: `agents/${f}`, key: `tools/${t}`, note: `mapped to "${tm.copilot}" — name NOT verified against the Copilot docs` });
        if (!mapped.includes(tm.copilot)) mapped.push(tm.copilot);
      }
      head.tools = mapped;
      continue;
    }
    if (k === 'model' && v === 'inherit') { unmapped.push({ file: `agents/${f}`, key: k, note: '"inherit" has no Copilot equivalent — key omitted so Copilot uses its own default' }); continue; }
    head[rule.to] = v;
  }

  // THE assertion. Derived from the SOURCE tools, never from a hardcoded agent list — an agent whose
  // Claude tools are all read-capability must not gain a write- or exec-capable tool in translation.
  // Stated as a build failure, not a verification step: the guarantee lives in frontmatter, while
  // every one of these agents still SAYS "never fixes anything" in its body.
  const srcReadOnly = srcTools.length > 0 && srcTools.every((t) => CLAUDE_READ_ONLY.has(t));
  if (srcReadOnly) {
    const leaked = (head.tools ?? []).filter((t) => COPILOT_WRITE_CAPABLE.has(t));
    if (leaked.length) fail.push(`agents/${f}  read-only-breach  every source tool is read-only (${srcTools.join(', ')}) but the mapping emits write/exec: ${leaked.join(', ')}`);
  }

  // `skills:` preloading has no Copilot concept. Inline the bodies — that is literally what
  // preloading does on the Claude side, so behaviour is preserved and the output stays portable.
  let body = rewritePointers(fm.body, null, skillNameSet);
  const preload = Array.isArray(fm.data.skills) ? fm.data.skills : [];
  for (const s of preload) {
    const sf = skillNameSet.has(s) ? skillBody(s) : null;
    if (!sf) { fail.push(`agents/${f}  unknown-preloaded-skill  "${s}" has no skills/${s}/SKILL.md`); continue; }
    body += `\n\n---\n\n# PRELOADED SKILL: ${s}\n`
          + `<!-- Inlined from skills/${s}/SKILL.md by build-copilot. The skill also ships standalone\n`
          + `     at .github/skills/${s}/, but preloading is not something a Copilot agent can declare,\n`
          + `     so the text is carried here too. Edit the source, not this copy. -->\n\n`
          + rewritePointers(sf.body, s, skillNameSet);
  }
  put(`.github/agents/${f.replace(/\.md$/, '.agent.md')}`, emitFrontmatter(head) + body);
}

// CLAUDE.md → always-on repo instructions. Converted rather than relying on Copilot reading
// CLAUDE.md natively, so github_build/ is portable to a repo that has none.
if (existsSync(join(root, 'CLAUDE.md'))) {
  put('.github/copilot-instructions.md', rewritePointers(readFileSync(join(root, 'CLAUDE.md'), 'utf8'), null, skillNameSet));
}

// blocks.md is not a skill and has no SKILL.md, but the footers of nearly every skill point at it.
// Omitted, every one of those pointers dangles in the build.
const blocks = join(skillsDir, '_shared', 'blocks.md');
if (existsSync(blocks)) put('.github/blocks.md', rewritePointers(readFileSync(blocks, 'utf8'), null, skillNameSet));

// scripts: copied, not inlined — an executable cannot be text, and ${CLAUDE_SKILL_DIR} has no
// Copilot equivalent, so invocations are rewritten to .github/scripts/ above.
for (const d of [skillsDir, agentsDir]) {
  for (const sub of readdirSync(d)) {
    const sd = join(d, sub, 'scripts');
    const direct = join(d, 'scripts');
    for (const cand of [sd, sub === 'scripts' ? direct : null]) {
      if (!cand || !existsSync(cand) || !statSync(cand).isDirectory()) continue;
      for (const f of readdirSync(cand).filter((f) => f.endsWith('.mjs'))) {
        put(`.github/scripts/${f}`, readFileSync(join(cand, f), 'utf8'));
      }
    }
  }
}

// Source-set hash, so a stale build is identifiable without re-running the converter.
const srcHash = createHash('sha256');
for (const p of [...files.keys()].sort()) srcHash.update(p).update(files.get(p));
const hash = srcHash.digest('hex').slice(0, 16);

const agentSizes = [...files.keys()].filter((p) => p.endsWith('.agent.md')).sort()
  .map((p) => `| \`${p}\` | ${files.get(p).split('\n').length} |`).join('\n');

put('UNMAPPED.md', `# Unmapped source fields

Generated by \`scripts/build-copilot.mjs\`. Source-set hash: \`${hash}\`.
A field here had no Copilot equivalent and was dropped or translated lossily. A field in NEITHER
this report nor a mapping table fails the build instead of landing here.

| Source file | Field | What happened |
|---|---|---|
${unmapped.map((u) => `| \`${u.file}\` | \`${u.key}\` | ${u.note} |`).join('\n') || '| — | — | nothing dropped |'}

# Generated agent file sizes

Inlining a preloaded skill makes an agent file long, and a file too long to be honoured behaves like
a generic assistant while its format stays perfectly correct. Nothing here can measure whether Copilot
honours it — the sizes are printed so the cost is at least visible.

| File | Lines |
|---|---|
${agentSizes}
`);

// ─── emit or check ────────────────────────────────────────────────────────────
if (fail.length) {
  console.log(fail.join('\n'));
  console.log(`\nbuild-copilot: ${fail.length} violation(s). Nothing written.`);
  process.exit(1);
}

if (CHECK) {
  const drift = [];
  for (const [p, c] of files) {
    const disk = join(OUT, p);
    if (!existsSync(disk)) { drift.push(`${p}  missing  not in github_build/`); continue; }
    if (readFileSync(disk, 'utf8') !== c) drift.push(`${p}  stale  differs from the sources`);
  }
  const walk = (d, base = '') => existsSync(d) ? readdirSync(d).flatMap((e) => {
    const p = join(d, e); const rp = base ? `${base}/${e}` : e;
    return statSync(p).isDirectory() ? walk(p, rp) : [rp];
  }) : [];
  for (const p of walk(OUT)) if (!files.has(p)) drift.push(`${p}  orphan  in github_build/ but not derivable from the sources`);
  if (drift.length) {
    console.log(drift.join('\n'));
    console.log(`\nbuild-copilot: ${drift.length} drift(s). Re-run without --check.`);
    process.exit(1);
  }
  console.log(`build-copilot: github_build/ matches the sources — ${files.size} file(s), hash ${hash}`);
  process.exit(0);
}

rmSync(OUT, { recursive: true, force: true });
for (const [p, c] of files) {
  const target = join(OUT, p);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, c);
}
console.log(`build-copilot: wrote ${files.size} file(s) to ${relative(root, OUT) || 'github_build'} — hash ${hash}`);
console.log(`  ${unmapped.length} unmapped field(s) recorded in github_build/UNMAPPED.md`);

if (INSTALL_DIR) {
  const PREFIX = '.github/skills/';
  const installed = new Set();
  let count = 0;
  for (const [p, c] of files) {
    if (!p.startsWith(PREFIX)) continue;
    const relPath = p.slice(PREFIX.length);
    installed.add(relPath.split('/')[0]);
    const target = join(INSTALL_DIR, relPath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, c);
    count++;
  }
  console.log(`build-copilot: installed ${installed.size} skill(s), ${count} file(s), to ${INSTALL_DIR}`);
  // Never delete. A folder we did not write is either the user's own skill or one left by a skill
  // that has since been removed from this repo — and nothing here can tell those apart. Naming it
  // is the honest move; deleting it would eventually eat somebody's own work.
  const strays = existsSync(INSTALL_DIR)
    ? readdirSync(INSTALL_DIR).filter((e) => !installed.has(e) && statSync(join(INSTALL_DIR, e)).isDirectory())
    : [];
  if (strays.length) {
    console.log(`  ${strays.length} folder(s) there are not from this build, left untouched: ${strays.join(', ')}`);
  }
}
