#!/usr/bin/env node
// build-copilot — translate this config's skills, rules and CLAUDE.md into GitHub Copilot formats.
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
//   .github/skills/<name>/**        -> <home>/skills/<name>/**
//   .github/copilot-instructions.md -> <home>/copilot-instructions.md
//
// It writes only what it emits and never deletes: a folder it does not own is reported, not removed.
// One destination is a FILE rather than a folder, and that is the sharp edge — an existing
// copilot-instructions.md may be the user's own. It is never overwritten without --force; without it
// the install reports the path and leaves the file alone.
//
// Not installed: the rules tree, the scripts, UNMAPPED.md and the folder AGENTS.md. Copilot documents
// no personal location for them, and inventing one puts files where nothing loads them. The pointers
// that cite them are repointed at the source repo for that target instead.
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
// The COPILOT HOME, not the skills folder: `--install` writes two kinds to two documented locations
// under `~/.copilot`, so the base has to be their common parent. An `=<dir>` argument therefore names
// the home, and `=<dir>/skills` is where its skills land.
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

// ─── skills need no classification ────────────────────────────────────────────
// A skill translates to a Copilot SKILL.md, one for one. No table, no split.
//
// There USED to be one. Copilot had no skill concept, so every skill was forced into `instructions`
// (fires on an applyTo glob) or `agents` (invoked by name). Copilot shipped Agent Skills on
// 2025-12-18 with the same SKILL.md shape this repo already writes, so the workaround is gone.
//
// What the split cost, now that it does not exist: the rule sets that are now `rules/` used to be a
// skill emitted as an instruction with an applyTo glob, so they were ALWAYS applied to a matching
// file. Here they are plain markdown a skill points at, exactly as on the Claude side, where
// CLAUDE.md's routing table decides what gets read. That is a real behaviour change and the reason
// the split is worth remembering — restoring always-on for one of them means emitting it as an
// instruction as well, deliberately, not by accident.

// ─── TABLE 1: source files that deliberately do NOT travel ────────────────────
// The counterpart to the coverage check below. A source file is COVERED when a rule DECIDED it, in
// either direction — emitted, or listed here with a reason. Only a file no rule mentions at all fails
// the build.
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
  'rules/CLAUDE.md':                         'one line, `@AGENTS.md`. The file it imports travels under its own name',
  'skills/self-improve/findings.md':         'runtime data per machine — .gitignore owns the rule; the template travels instead',
  'skills/self-improve/findings-archive.md': 'runtime data per machine — .gitignore owns the rule; the template travels instead',
  'scripts/build-copilot.mjs':               'produces the export; shipping it inside the export is circular',
};

// The trees the coverage check walks. An ALLOWLIST of directories, never a list of things to ignore:
// ignore-list scoping is the permanent defect in any absence proof.
// Root CLAUDE.md is outside all three and needs no coverage — it has its own emit rule further down.
// docs/ and README.md are outside too, deliberately; a file added there is still missed, which is the
// bound this converter accepted rather than solved.
const COVERED_TREES = ['skills', 'rules', 'scripts'];

// Excluded files that are NORMALLY ABSENT, and whose absence must not be reported as a stale row.
// These two are git-ignored runtime data, so a fresh clone — the common case — simply does not have
// them. Without this the dead-row report below tells everyone who clones the repo to delete two
// CORRECT exclusions. MEASURED, not anticipated: a clean checkout via `git worktree add` produced
// exactly those two bogus rows.
const RUNTIME_DATA_FILES = new Set([
  'skills/self-improve/findings.md',
  'skills/self-improve/findings-archive.md',
]);

// ─── frontmatter ──────────────────────────────────────────────────────────────
// Minimal YAML: `key: scalar` and `key:` followed by indented `- item` lines. That is the whole
// shape used by this repo's skills, verified by enumeration.
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
const KEY_ORDER = ['name', 'description'];
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
// Every skill has ONE home, so this is a constant shape rather than a lookup.
const homeOf = (skill) => `skills/${skill}`;
const rewritePointers = (text, skill, skillNames) => text
  // Rule-tree pointers. A skill reaches a rule through the ~/.claude junction, which no Copilot
  // target has. The SCRIPTS rule must run FIRST: rules/scripts/*.mjs land flat in .github/scripts/
  // like every other script, so the generic rules rewrite below would send them to the wrong place.
  .replace(/~\/\.claude\/rules\/scripts\//g, '.github/scripts/')
  .replace(/`?~\/\.claude\/rules\/([a-z0-9./_-]+\.md)`?/g, '`.github/rules/$1`')
  // The bare directory mention, with no filename after it — CLAUDE.md's routing-table header says
  // where the rule files live. Runs AFTER the filename rule so it cannot eat a pointer's path.
  .replace(/`?~\/\.claude\/rules\/?`?/g, '`.github/rules/`')
  .replace(/\$\{CLAUDE_SKILL_DIR\}\/scripts\//g, '.github/scripts/')
  // `../scripts/` is how the folder docs reach the repo-root scripts — correct here, wrong in the
  // export, where every script lands flat in .github/scripts/.
  .replace(/\.\.\/scripts\//g, '.github/scripts/')
  // Links back to the REPO ROOT — `../README.md`, `../docs/adr/x.md`. The export contains neither
  // README nor docs/, by decision, so these resolve nowhere in it. Named as the source repo rather
  // than deleted: a deleted pointer is an invisible loss.
  .replace(/(?:\.\.\/)+(README\.md|docs\/)/g, '<claude-config>/$1')
  // Folder-doc cross-links between the two trees: `../rules/` and `../skills/`.
  .replace(/\[\.\.\/(rules|skills)\/\]\(\.\.\/(?:rules|skills)\/AGENTS\.md\)/g, '[.github/$1/](.github/$1/AGENTS.md)')
  // A pointer may name ANOTHER skill's reference file. Resolve to the OWNING skill's home when one is
  // named; only a bare `reference/x.md` belongs to the citing skill. Assuming the citing skill always
  // owns it silently invented paths that exist nowhere.
  .replace(/`?(?:skills\/)?(?:([a-z-]+)\/)?reference\/([a-z0-9._-]+\.md)`?/g, (m, owner, f) => {
    const s = owner && skillNames.has(owner) ? owner : skill;
    // Unattributable: no owner in the path AND no citing skill (a folder doc, CLAUDE.md). Leave it
    // EXACTLY as written. Guessing a home used to emit paths that exist in no build.
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
// committed build produced 22 drifts against a re-derive. The paired half of this fix is the
// `github_build/** text eol=lf` rule in .gitattributes — normalising here alone is not enough,
// because git rewrites on checkout.
const put = (p, c) => files.set(p, c.replace(/\r\n/g, '\n'));

// Every SOURCE file the build reads, recorded as it is read. The coverage check below subtracts this
// set from what is actually on disk, so a source nothing reads cannot slip through unnoticed.
// Reading is the right event to hook, not emitting: a file read and deliberately dropped mid-loop is
// still a file a rule DECIDED about.
const sourcesRead = new Set();
const srcKey = (p) => relative(root, p).replace(/\\/g, '/');
const readSrc = (p) => { sourcesRead.add(srcKey(p)); return readFileSync(p, 'utf8'); };

const skillsDir = join(root, 'skills');
const rulesDir = join(root, 'rules');
// .sort(): readdirSync order is not guaranteed, and skillNames drives both the emit order and the
// pointer-rewrite lookup.
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
  // is a Claude Code extension — not invented here, and not passed through if a source file ever
  // grows one.
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
  // travel VERBATIM. Pointer rewriting is deliberately not applied: a skill-dir token or a
  // `reference/` string inside a template would be silently rewritten in a file the skill later
  // copies to a live name. self-improve tells the model to copy these when the live file is missing,
  // so without them that recovery path names files the export does not contain.
  for (const f of readdirSync(join(skillsDir, s)).filter((f) => f.endsWith('.template.md')).sort()) {
    put(`.github/${homeOf(s)}/${f}`, readSrc(join(skillsDir, s, f)));
  }
}

// rules → .github/rules/, mirroring the source layout including the design/ appendices.
// `null` as the citing skill is deliberate: a rule file belongs to no skill, and the pointer
// rewriter leaves a bare `reference/x.md` alone when nothing owns it, which is right here.
// scripts/ is skipped in this walk — it is copied flat into .github/scripts/ below, and the pointer
// rewriter above sends every rule's invocation there.
const walkRules = (d, base) => readdirSync(d).flatMap((e) => {
  const p = join(d, e);
  if (statSync(p).isDirectory()) return e === 'scripts' ? [] : walkRules(p, `${base}/${e}`);
  return e.endsWith('.md') ? [{ p, rel: `${base}/${e}` }] : [];
});
if (existsSync(rulesDir)) {
  // .sort(): readdirSync order is not guaranteed, and the emitted order feeds the source-set hash.
  for (const { p, rel: r } of walkRules(rulesDir, 'rules').sort((a, b) => a.rel.localeCompare(b.rel))) {
    if (r === 'rules/CLAUDE.md') continue;   // SOURCE_EXCLUSIONS owns the reason; not read, not emitted
    put(`.github/${r}`, rewritePointers(readSrc(p), null, skillNameSet));
  }
}

// CLAUDE.md → always-on repo instructions. Converted rather than relying on Copilot reading
// CLAUDE.md natively, so github_build/ is portable to a repo that has none.
if (existsSync(join(root, 'CLAUDE.md'))) {
  put('.github/copilot-instructions.md', rewritePointers(readFileSync(join(root, 'CLAUDE.md'), 'utf8'), null, skillNameSet));
}

// Folder docs → the SAME name at the mirrored position. Copilot reads nested AGENTS.md, so this is
// the identical mechanic under the identical filename rather than a translation. Verified against
// the GitHub docs, not inferred: nested AGENTS.md is supported, and discovery follows the path of
// the file being worked on.
// rules/AGENTS.md is emitted by the walk above, which already covers every .md in that tree.
{
  const doc = join(skillsDir, 'AGENTS.md');
  if (existsSync(doc)) put('.github/skills/AGENTS.md', rewritePointers(readSrc(doc), null, skillNameSet));
}

// scripts: copied, not inlined — an executable cannot be text, and the skill-dir token has no
// Copilot equivalent, so invocations are rewritten to .github/scripts/ above.
for (const cand of [...skillNames.map((s) => join(skillsDir, s, 'scripts')), join(rulesDir, 'scripts')]) {
  if (!existsSync(cand) || !statSync(cand).isDirectory()) continue;
  for (const f of readdirSync(cand).filter((f) => f.endsWith('.mjs')).sort()) {
    put(`.github/scripts/${f}`, readSrc(join(cand, f)));
  }
}

// The repo-root check travels too, because skills/AGENTS.md CITES it as the guard on skill
// frontmatter. Carried by name rather than by a glob over scripts/: build-copilot.mjs would be
// circular, and SOURCE_EXCLUSIONS records that decision.
for (const f of ['check-frontmatter.mjs']) {
  const p = join(root, 'scripts', f);
  if (existsSync(p)) put(`.github/scripts/${f}`, readSrc(p));
}

// ─── coverage: no source file leaves without a decision ───────────────────────
// A file matching no emit rule used to simply vanish, with no error and no row in UNMAPPED.md.
// This closes that.
//
// Reports the EXAMINED count beside the violation count on purpose. A walk that found nothing exits
// clean and looks identical to a walk that found everything, and a set-quantified rule ("every source
// is covered") is satisfied vacuously by the empty set.
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
  if (!actualSources.includes(p) && !RUNTIME_DATA_FILES.has(p)) {
    unmapped.push({ file: p, key: 'SOURCE_EXCLUSIONS', note: 'excluded, but no such file exists any more — drop the row' });
  }
}

// Source-set hash, so a stale build is identifiable without re-running the converter.
const srcHash = createHash('sha256');
for (const p of [...files.keys()].sort()) srcHash.update(p).update(files.get(p));
const hash = srcHash.digest('hex').slice(0, 16);

put('UNMAPPED.md', `# Unmapped source fields

Generated by \`scripts/build-copilot.mjs\`. Source-set hash: \`${hash}\`.
A field here had no Copilot equivalent and was dropped or translated lossily. A field in NEITHER
this report nor a mapping table fails the build instead of landing here.

| Source file | Field | What happened |
|---|---|---|
${unmapped.map((u) => `| \`${u.file}\` | \`${u.key}\` | ${u.note} |`).join('\n') || '| — | — | nothing dropped |'}

# The rules tree

\`.github/rules/\` mirrors the source \`rules/\` tree. On the Claude side those files are reached
through a \`~/.claude/rules\` junction and are pulled by CLAUDE.md's routing table; here they are
plain markdown at a stable path, and \`copilot-instructions.md\` carries the same table with the
paths rewritten. Nothing loads them automatically on either side, so the behaviour is the same.

# Scripts that travel but do not RUN here

Every \`.mjs\` under \`.github/scripts/\` is copied verbatim. Two of them are HOOKS on the Claude side —
\`tick-guard.mjs\` (Stop) and \`tick-sync.mjs\` (PostToolUse) — registered per machine in
\`~/.claude/settings.json\`. Copilot has no equivalent registration, so nothing invokes them here and
they never fire. That is not a defect in this build; it is a capability the target does not have.

What fills the gap: \`feature\` step 6 states the tick rule for exactly this case — where no hook runs,
the box is ticked by hand, in the same act as moving the todo.

The rest are commands a skill or a rule tells you to RUN by name (\`check-features.mjs\`,
\`new-feature.mjs\`, \`check-frontmatter.mjs\`, \`check-adr.mjs\`, \`preflight.mjs\`). Those work here.
\`check-frontmatter.mjs\` was written against the source repo's structure, not against \`.github/\`.
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
// home.
//
// Two targets, two different repairs, because the two differ in kind:
//   rules   — prose the skills POINT AT. Copilot documents no personal location for a rules tree, so
//             they are not installed. Repointed at the source repo and named as absent in the
//             appended note. A pointer deleted instead would be an invisible loss.
//   scripts — EXECUTABLES. Cannot be inlined into prose. Same treatment, same reason.
// A third class of pointer: `.github/skills/<name>/reference/<f>.md`. Unlike the two above, those
// files ARE installed — only at `<home>/skills/...`. They need no note, just the real path.
const homeSlash = () => String(INSTALL_HOME).replace(/\\/g, '/').replace(/\/$/, '');
const installText = (text) => {
  const citesRules = text.includes('.github/rules/');
  const citesScripts = text.includes('.github/scripts/');
  if (!text.includes('.github/')) return text;

  const out = text
    .replace(/\.github\/rules\//g, '<claude-config>/rules/')
    .replace(/\.github\/scripts\//g, '<claude-config>/scripts/')
    .replace(/\.github\/skills\//g, `${homeSlash()}/skills/`);

  // The note deliberately avoids writing the literal repo-root path token. Validation for this is a
  // plain grep for it across the install, and a note containing the very string being hunted makes
  // the instrument report its own text.
  const notes = ['\n\n---\n\n# PERSONAL INSTALL NOTES\n',
    '<!-- Added by build-copilot --install. The export writes paths rooted at the repo GitHub folder,',
    '     which does not exist in a personal Copilot home. Edit the source, not this copy. -->\n'];
  if (citesScripts) {
    notes.push('`<claude-config>/scripts/` names the source repo this config was built from. Those'
      + ' scripts are NOT installed here — Copilot documents no personal location for them. A rule'
      + ' that tells you to run one still holds; run it from a checkout of that repo, or follow the'
      + ' rule by hand where the skill says what to do without it.\n');
  }
  if (citesRules) {
    notes.push('`<claude-config>/rules/` names that same source repo. The rule files are NOT installed'
      + ' here either, for the same reason. Read them from a checkout when a pointer above sends you'
      + ' to one.\n');
  }
  return out + notes.join('\n');
};

if (INSTALL_HOME) {
  const SKILLS_PREFIX = '.github/skills/';
  const installed = new Set();
  let count = 0;

  // Every install write goes through installText. A path missed here is a file that keeps its dead
  // `.github/` pointers, which is why the transform sits at the single write point rather than at
  // each call site.
  const writeTo = (target, c) => { mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, installText(c)); count++; };

  for (const [p, c] of files) {
    if (!p.startsWith(SKILLS_PREFIX)) continue;
    const relPath = p.slice(SKILLS_PREFIX.length);
    // A path with NO directory component is not a skill. `.github/skills/AGENTS.md` is the folder
    // doc, and without this guard it would be written loose into the personal skills directory and
    // counted as a skill named "AGENTS.md". Worse, it would then be invisible: the stray report
    // below filters on isDirectory(), so a loose file is neither installed-as-skill nor reported.
    if (!relPath.includes('/')) continue;
    installed.add(relPath.split('/')[0]);
    writeTo(join(INSTALL_HOME, 'skills', relPath), c);
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
