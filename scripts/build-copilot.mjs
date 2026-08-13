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
//   node scripts/build-copilot.mjs [root] --install       install for the CURRENT USER
//   node scripts/build-copilot.mjs [root] --install=<dir> ... into <dir> as the Copilot home
//   node scripts/build-copilot.mjs [root] --install --force   ... overwriting copilot-instructions.md
//
// --install copies the emitted config into the personal locations Copilot reads, under `~/.copilot`
// by default. github_build/ is a portable artifact for a REPO; this is the per-machine install.
//
//   .github/skills/<name>/**      -> <home>/skills/<name>/**
//   .github/agents/*.agent.md     -> <home>/agents/*.agent.md
//   .github/copilot-instructions.md -> <home>/copilot-instructions.md
//
// It writes only what it emits and never deletes: a folder it does not own is reported, not removed.
// One destination is a FILE rather than a folder, and that is the sharp edge — an existing
// copilot-instructions.md may be the user's own. It is never overwritten without --force; without it
// the install reports the path and leaves the file alone.
//
// Not installed: blocks.md, the scripts, UNMAPPED.md and the folder AGENTS.md. Copilot documents no
// personal location for them, and inventing one puts files where nothing loads them. The pointers
// that cite blocks.md and the scripts are rewritten for this target instead.
//
// Exit 1 = a violation or drift. Exit 2 = bad root.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';

const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const FORCE = argv.includes('--force');
const installArg = argv.find((a) => a === '--install' || a.startsWith('--install='));
// The COPILOT HOME, not the skills folder. `--install-skills` pointed at `~/.copilot/skills` because
// skills were all it wrote; `--install` writes three kinds to three documented locations under
// `~/.copilot`, so the base has to be their common parent. An `=<dir>` argument therefore names the
// home now, and `=<dir>/skills` is where its skills land.
const INSTALL_HOME = installArg
  ? (installArg.includes('=') ? resolve(installArg.slice(installArg.indexOf('=') + 1)) : join(homedir(), '.copilot'))
  : null;
const root = resolve(argv.find((a) => !a.startsWith('--')) ?? '.');
const OUT = join(root, 'github_build');

if (CHECK && INSTALL_HOME) {
  console.error('build-copilot: --check and --install are mutually exclusive; --check writes nothing');
  process.exit(2);
}

if (FORCE && !INSTALL_HOME) {
  console.error('build-copilot: --force only means anything with --install; it overwrites an existing copilot-instructions.md');
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
// exit 0. `feature` STEP 6's validation gate names the shape — two consumers of shared code
// asserted to agree cannot fail on a defect in that shared code.
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

// ─── TABLE 4: source files that deliberately do NOT travel ────────────────────
// The counterpart to the coverage check below. A source file is COVERED when a rule DECIDED it, in
// either direction — emitted, or listed here with a reason. Only a file no rule mentions at all fails
// the build, which is the same standard TABLE 3 sets for an unrecognised frontmatter key.
//
// Two disciplines, stated here because a table teaches by its rows:
//  1. A ROW IS A DECISION, NOT A PARKING SPACE. A stray file in a source tree is deleted or moved,
//     never excluded. The hard fail makes adding a row the cheapest way out of a red build, and a
//     list that only grows ends as a list nobody reads.
//  2. The two `findings*.md` rows CITE .gitignore rather than restating its reasoning. That rule
//     already lives there; two places stating one rule is how they drift, and the drift would be a
//     silent drop — the exact defect this table exists to end.
const SOURCE_EXCLUSIONS = {
  'skills/CLAUDE.md':                        'one line, `@AGENTS.md`. The file it imports travels under its own name',
  'agents/CLAUDE.md':                        'one line, `@AGENTS.md`. The file it imports travels under its own name',
  'skills/self-improve/findings.md':         'runtime data per machine — .gitignore:22-23 owns the rule; the template travels instead',
  'skills/self-improve/findings-archive.md': 'runtime data per machine — .gitignore:22-23 owns the rule; the template travels instead',
  'scripts/build-copilot.mjs':               'produces the export; shipping it inside the export is circular',
  'scripts/behaviour-suite.mjs':             'measures what cutting rule text costs — unrelated to Copilot',
};

// The trees the coverage check walks. An ALLOWLIST of directories, never a list of things to ignore:
// `feature` STEP 6 names ignore-list scoping as the permanent defect in any absence proof.
// Root CLAUDE.md is outside all three and needs no coverage — it has its own emit rule further down.
// docs/ and README.md are outside too, deliberately; a file added there is still missed, which is the
// bound this feature accepted rather than solved.
const COVERED_TREES = ['skills', 'agents', 'scripts'];

// Excluded files that are NORMALLY ABSENT, and whose absence must not be reported as a stale row.
// These two are git-ignored runtime data, so a fresh clone — the common case — simply does not have
// them. Without this the dead-row report below tells everyone who clones the repo to delete two
// CORRECT exclusions. MEASURED, not anticipated: a clean checkout via `git worktree add` covered 61
// sources instead of 63 and produced exactly those two bogus rows.
const EXPECTED_ABSENT = new Set([
  'skills/self-improve/findings.md',
  'skills/self-improve/findings-archive.md',
]);

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
  // `../scripts/` is how the folder docs reach the repo-root scripts — correct here, wrong in the
  // export, where every script lands flat in .github/scripts/. Only reachable since those docs began
  // travelling. Blast radius COUNTED, not estimated: 4 occurrences repo-wide, at skills/AGENTS.md:5,
  // :47 and agents/AGENTS.md:14, :20 — all inside the two files this rule exists for.
  .replace(/\.\.\/scripts\//g, '.github/scripts/')
  // Links back to the REPO ROOT — `../README.md`, `../docs/adr/x.md`, `../../docs/adr/x.md`. The
  // export contains neither README nor docs/, by decision, so these resolve nowhere in it. Named as
  // the source repo rather than deleted: a deleted pointer is an invisible loss.
  // Counted, not estimated: 4 occurrences — skills/AGENTS.md:74, agents/AGENTS.md:37, :99, and
  // skills/crew/SKILL.md:235. That last one has been dead in every build to date; it travelled
  // already and nothing checked it, because check-docs only ever looked at AGENTS.md files.
  .replace(/(?:\.\.\/)+(README\.md|docs\/)/g, '<claude-config>/$1')
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

// Every SOURCE file the build reads, recorded as it is read. The coverage check below subtracts this
// set from what is actually on disk, so a source nothing reads cannot slip through unnoticed.
// Reading is the right event to hook, not emitting: a file read and deliberately dropped mid-loop is
// still a file a rule DECIDED about.
const sourcesRead = new Set();
const srcKey = (p) => relative(root, p).replace(/\\/g, '/');
const readSrc = (p) => { sourcesRead.add(srcKey(p)); return readFileSync(p, 'utf8'); };

const skillsDir = join(root, 'skills');
const agentsDir = join(root, 'agents');
// .sort(): readdirSync order is not guaranteed, and skillNames drives both the emit order and the
// pointer-rewrite lookup. Same determinism rule as the agents loop below.
const skillNames = readdirSync(skillsDir).filter((d) => existsSync(join(skillsDir, d, 'SKILL.md'))).sort();
const skillNameSet = new Set(skillNames);

const skillBody = (s) => {
  const fm = parseFrontmatter(readSrc(join(skillsDir, s, 'SKILL.md')));
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
      put(`.github/${homeOf(s)}/reference/${f}`, rewritePointers(readSrc(join(refDir, f)), s, skillNameSet));
    }
  }
  // Templates are DATA the skill copies at runtime, not prose the model reads as rules — so they
  // travel VERBATIM. Pointer rewriting is deliberately not applied: a `${CLAUDE_SKILL_DIR}` or a
  // `reference/` string inside a template would be silently rewritten in a file the skill later
  // copies to a live name. self-improve/SKILL.md:29-33 tells the model to copy these when the live
  // file is missing, so without them that recovery path names files the export does not contain.
  for (const f of readdirSync(join(skillsDir, s)).filter((f) => f.endsWith('.template.md')).sort()) {
    put(`.github/${homeOf(s)}/${f}`, readSrc(join(skillsDir, s, f)));
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
  const src = readSrc(join(agentsDir, f));
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
if (existsSync(blocks)) put('.github/blocks.md', rewritePointers(readSrc(blocks), null, skillNameSet));

// Folder docs → the SAME name at the mirrored position. Copilot reads nested AGENTS.md, so this is
// the identical mechanic under the identical filename rather than a translation. Verified against
// the GitHub docs, not inferred: nested AGENTS.md is supported, discovery follows the path of the
// file being worked on, and `@relative/path` includes work inside these files.
//
// `null` as the citing skill is deliberate. These docs cite SEVERAL skills, and the pointer rewriter
// leaves a bare `reference/x.md` alone when no skill owns it (see its comment above) — which is
// right here, and would be wrong if a home were guessed.
for (const [dir, dest] of [[skillsDir, '.github/skills'], [agentsDir, '.github/agents']]) {
  const doc = join(dir, 'AGENTS.md');
  if (existsSync(doc)) put(`${dest}/AGENTS.md`, rewritePointers(readSrc(doc), null, skillNameSet));
}

// scripts: copied, not inlined — an executable cannot be text, and ${CLAUDE_SKILL_DIR} has no
// Copilot equivalent, so invocations are rewritten to .github/scripts/ above.
for (const d of [skillsDir, agentsDir]) {
  for (const sub of readdirSync(d)) {
    const sd = join(d, sub, 'scripts');
    const direct = join(d, 'scripts');
    for (const cand of [sd, sub === 'scripts' ? direct : null]) {
      if (!cand || !existsSync(cand) || !statSync(cand).isDirectory()) continue;
      for (const f of readdirSync(cand).filter((f) => f.endsWith('.mjs'))) {
        put(`.github/scripts/${f}`, readSrc(join(cand, f)));
      }
    }
  }
}

// The repo-root checks travel too, because the folder docs CITE them — skills/AGENTS.md:5 names
// check-frontmatter.mjs as the guard on skill frontmatter, :47 names check-pointers.mjs. Carried by
// name rather than by a glob over scripts/: build-copilot.mjs would be circular and
// behaviour-suite.mjs has nothing to do with Copilot, both recorded in SOURCE_EXCLUSIONS.
// NOT verified, and stated so it is not mistaken for a checked fact: check-size.mjs and
// check-pointers.mjs were written against THIS repo's structure. Run inside a consuming repo they
// may report against a tree they were not written for.
for (const f of ['check-frontmatter.mjs', 'check-pointers.mjs', 'check-size.mjs']) {
  const p = join(root, 'scripts', f);
  if (existsSync(p)) put(`.github/scripts/${f}`, readSrc(p));
}

// ─── coverage: no source file leaves without a decision ───────────────────────
// The generalisable half of this converter's honesty. TABLE 3 already fails on an unrecognised
// frontmatter KEY, for the reason stated there — a converter that silently ignores one rots the first
// time someone adds one. The same was never true of FILES: a file matching no emit rule simply
// vanished, with no error and no row in UNMAPPED.md. This closes that.
//
// Reports the EXAMINED count beside the violation count on purpose. A walk that found nothing exits
// clean and looks identical to a walk that found everything, and a set-quantified rule ("every source
// is covered") is satisfied vacuously by the empty set — `feature` STEP 6 names both traps.
const walkSources = (d, base) => existsSync(d) && statSync(d).isDirectory()
  ? readdirSync(d).flatMap((e) => {
      const p = join(d, e);
      const rp = `${base}/${e}`;
      return statSync(p).isDirectory() ? walkSources(p, rp) : [rp];
    })
  : [];

const actualSources = COVERED_TREES.flatMap((t) => walkSources(join(root, t), t)).sort();
const uncovered = actualSources.filter((p) => !sourcesRead.has(p) && !(p in SOURCE_EXCLUSIONS));
for (const p of uncovered) {
  fail.push(`${p}  uncovered-source-file  no emit rule read it and SOURCE_EXCLUSIONS does not list it — carry it, or exclude it with a reason`);
}
// An exclusion naming a file that no longer exists is dead weight that makes the table lie about the
// export. Reported rather than failed: it blocks nothing, and failing on it would make deleting a
// file harder than adding one, which is the wrong incentive.
for (const p of Object.keys(SOURCE_EXCLUSIONS)) {
  if (!actualSources.includes(p) && !EXPECTED_ABSENT.has(p)) {
    unmapped.push({ file: p, key: 'SOURCE_EXCLUSIONS', note: 'excluded, but no such file exists any more — drop the row' });
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

# Scripts that travel but do not RUN here

Every \`.mjs\` under \`.github/scripts/\` is copied verbatim. Two of them are HOOKS on the Claude side —
\`tick-guard.mjs\` (Stop) and \`tick-sync.mjs\` (PostToolUse) — registered per machine in
\`~/.claude/settings.json\`. Copilot has no equivalent registration, so nothing invokes them here and
they never fire. That is not a defect in this build; it is a capability the target does not have.

What fills the gap: \`feature\` step 5 states the tick rule for exactly this case — where no hook runs,
the box is ticked by hand, in the same act as moving the todo.

The rest are commands a skill tells you to RUN by name (\`check-features.mjs\`, \`new-feature.mjs\`,
\`check-frontmatter.mjs\`, \`check-pointers.mjs\`, \`check-size.mjs\`, \`check-agents.mjs\`,
\`check-docs.mjs\`, \`preflight.mjs\`). Those work here, with one caveat: \`check-size.mjs\` and
\`check-pointers.mjs\` were written against the source repo's structure, not against \`.github/\`.

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
  console.log(`\nbuild-copilot: ${fail.length} violation(s) — ${actualSources.length} source file(s) examined. Nothing written.`);
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
// The examined count is printed on SUCCESS too, not only on failure. A coverage check that walked an
// empty tree passes silently and reads exactly like one that walked everything.
console.log(`  ${actualSources.length} source file(s) covered across ${COVERED_TREES.join(', ')}`);
console.log(`  ${unmapped.length} unmapped field(s) recorded in github_build/UNMAPPED.md`);

// ─── the install text variant ─────────────────────────────────────────────────
// The export is written for a REPO, where `.github/` is the root that travels. A personal install has
// no `.github/` at all, so every pointer the export writes is dead the moment it lands in the Copilot
// home. That was true before this feature and made the whole command decorative; widening what it
// installs without fixing it would only have shipped more dead pointers.
//
// Two targets, two different repairs, because the two files differ in kind:
//   blocks.md  — rule TEXT. Inlined, so the rules arrive with the skill that needs them. Not a new
//                mechanism: the agent loop above already inlines a preloaded skill's body for exactly
//                this reason, that the target has no concept to point at.
//   scripts    — EXECUTABLES. Cannot be inlined into prose. Repointed at the source repo, which is
//                where they genuinely live, and named as absent in the appended note. A pointer
//                deleted instead would be an invisible loss — the defect this feature exists to end.
// A third class of pointer, found by the `.github/` grep this feature requires rather than by
// reasoning: `.github/skills/<name>/reference/<f>.md`. Unlike blocks.md and the scripts, those files
// ARE installed — only at `<home>/skills/...`. They need no note and no inlining, just the real path.
const BLOCKS_ANCHOR = 'the SHARED RULE BLOCKS section at the end of this file';
const homeSlash = () => String(INSTALL_HOME).replace(/\\/g, '/').replace(/\/$/, '');
const installText = (text) => {
  const citesBlocks = text.includes('.github/blocks.md');
  const citesScripts = text.includes('.github/scripts/');
  if (!text.includes('.github/')) return text;

  let out = text
    .replace(/`?\.github\/blocks\.md`?/g, BLOCKS_ANCHOR)
    .replace(/\.github\/scripts\//g, '<claude-config>/scripts/')
    .replace(/\.github\/(skills|agents)\//g, `${homeSlash()}/$1/`);

  // The note deliberately avoids writing the literal repo-root path token. Validation for this
  // feature is a plain grep for it across the install, and a note containing the very string being
  // hunted makes the instrument report its own text — measured, not guessed: it returned 28 files,
  // every one of them this comment.
  const notes = ['\n\n---\n\n# PERSONAL INSTALL NOTES\n',
    '<!-- Added by build-copilot --install. The export writes paths rooted at the repo GitHub folder,',
    '     which does not exist in a personal Copilot home. Edit the source, not this copy. -->\n'];
  if (citesScripts) {
    notes.push('`<claude-config>/scripts/` names the source repo this config was built from. Those'
      + ' scripts are NOT installed here — Copilot documents no personal location for them. A rule'
      + ' that tells you to run one still holds; run it from a checkout of that repo, or follow the'
      + ' rule by hand where the skill says what to do without it.\n');
  }
  if (citesBlocks) {
    const blocks = files.get('.github/blocks.md');
    if (blocks === undefined) fail.push('scripts/build-copilot.mjs  install-missing-blocks  a skill cites blocks.md but the build emitted none');
    notes.push(`\n# SHARED RULE BLOCKS\n\n${(blocks ?? '').replace(/^# /gm, '## ')}`);
  }
  return out + notes.join('\n');
};

if (INSTALL_HOME) {
  const SKILLS_PREFIX = '.github/skills/';
  const AGENTS_PREFIX = '.github/agents/';
  const installed = new Set();
  let count = 0;

  // Every install write goes through installText. A path missed here is a file that keeps its dead
  // `.github/` pointers, which is why the transform sits at the single write point rather than at
  // each call site. Binary-ish files never reach this branch; only markdown is installed.
  const writeTo = (target, c) => { mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, installText(c)); count++; };

  for (const [p, c] of files) {
    if (p.startsWith(SKILLS_PREFIX)) {
      const relPath = p.slice(SKILLS_PREFIX.length);
      // A path with NO directory component is not a skill. `.github/skills/AGENTS.md` is the folder
      // doc, and without this guard it would be written loose into the personal skills directory and
      // counted as a skill named "AGENTS.md". Worse, it would then be invisible: the stray report
      // below filters on isDirectory(), so a loose file is neither installed-as-skill nor reported.
      if (!relPath.includes('/')) continue;
      installed.add(relPath.split('/')[0]);
      writeTo(join(INSTALL_HOME, 'skills', relPath), c);
      continue;
    }
    if (p.startsWith(AGENTS_PREFIX)) {
      const relPath = p.slice(AGENTS_PREFIX.length);
      if (!relPath.endsWith('.agent.md')) continue;   // the folder doc again, by the same reasoning
      writeTo(join(INSTALL_HOME, 'agents', relPath), c);
    }
  }

  // The one destination that is a FILE, and the only place this command can destroy work. Every other
  // write either creates a folder or replaces a file this build owns; `copilot-instructions.md` at the
  // Copilot home may be the user's own. ADR 0004 records the standing promise — writes only what it
  // emits, never deletes — and overwriting a hand-written file is that promise broken in the one
  // direction no rebuild undoes. Identical content is not an overwrite, so it passes silently.
  const instrSrc = files.get('.github/copilot-instructions.md');
  let refused = null;
  if (instrSrc !== undefined) {
    const target = join(INSTALL_HOME, 'copilot-instructions.md');
    // Compare against what WOULD BE WRITTEN, not against the export text. `writeTo` transforms on the
    // way out, so comparing the raw export would find a difference against this command's own last
    // install and refuse on every re-run — turning a safety guard into a permanent false alarm.
    const wanted = installText(instrSrc);
    const exists = existsSync(target);
    const same = exists && readFileSync(target, 'utf8') === wanted;
    if (!exists || same || FORCE) writeTo(target, instrSrc);
    else refused = target;
  }

  console.log(`build-copilot: installed ${installed.size} skill(s), ${count} file(s), to ${INSTALL_HOME}`);

  // What inlining COSTS, printed where it is paid. The UNMAPPED.md size table covers agent files and
  // cannot cover these: the install variant only exists once a home is known, so it has no size until
  // this moment. Same honesty as that table — nothing here can measure whether Copilot honours a file
  // of a given length, so no threshold is invented. The growth factor is shown and judged by a human.
  const grown = [...files.keys()]
    .filter((p) => p.startsWith(SKILLS_PREFIX) && p.endsWith('/SKILL.md'))
    .map((p) => {
      const before = files.get(p).split('\n').length;
      const after = installText(files.get(p)).split('\n').length;
      return { name: p.slice(SKILLS_PREFIX.length).replace(/\/SKILL\.md$/, ''), before, after };
    })
    .filter((r) => r.after > r.before)
    .sort((a, b) => b.after - a.after);
  if (grown.length) {
    const worst = grown.slice(0, 3).map((r) => `${r.name} ${r.before}→${r.after}`).join(', ');
    console.log(`  ${grown.length} skill(s) grew from inlining the shared blocks; largest: ${worst} lines`);
  }

  if (refused) {
    console.log(`  NOT written: ${refused} already exists and differs — left untouched. Re-run with --force to replace it.`);
  }
  // Never delete. A folder we did not write is either the user's own skill or one left by a skill
  // that has since been removed from this repo — and nothing here can tell those apart. Naming it
  // is the honest move; deleting it would eventually eat somebody's own work.
  const skillsDirInstalled = join(INSTALL_HOME, 'skills');
  const strays = existsSync(skillsDirInstalled)
    ? readdirSync(skillsDirInstalled).filter((e) => !installed.has(e) && statSync(join(skillsDirInstalled, e)).isDirectory())
    : [];
  if (strays.length) {
    console.log(`  ${strays.length} folder(s) there are not from this build, left untouched: ${strays.join(', ')}`);
  }
}
