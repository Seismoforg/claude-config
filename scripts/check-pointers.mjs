#!/usr/bin/env node
// pointers — repo-wide check that every rule-prose pointer resolves, and that the two skills
// ADR 0005 folded into coding-standards leave nothing pointing at them.
// Enforces what is deterministic: the three sanctioned pointer forms (skills/self-improve/SKILL.md,
// SKILL LIFECYCLE) resolve to a file that EXISTS, at its exact on-disk spelling; the retired skill
// directories are gone; no live rule prose still names them as a path; every design addendum under
// coding-standards/reference/ carries the design- prefix; README's published skill roster equals
// the roster on disk.
// NOT here, and not checkable by any script in this repo: whether a pointer leads to the RIGHT
// file, whether prose still ROUTES work to it, and whether a frontmatter description still MATCHES
// a request. All three fail SILENTLY — a fresh-model trace is the only evidence for them.
// The 1024-char description cap is deliberately NOT re-checked: scripts/build-copilot.mjs:198-200
// already fails the build over it, and two checks for one rule drift apart.
//
// CORPUS IS AN ALLOWLIST — never a list of places to ignore (skills/feature/SKILL.md, step 6).
// A check that proves an ABSENCE goes green for a reason nobody wrote down the moment a new
// directory is added, and excluding the one that defeated it only waits for the next one.
// IN: skills/, agents/, CLAUDE.md, README.md — the live rule prose a model loads and obeys.
// OUT, by construction rather than by exemption:
//   docs/         ADRs are dated history. 0004 and 0005 both name the retired skills, correctly,
//                 and so will every later ADR about them. Recording what was true is the file
//                 type's job, so no ADR can ever be a violation here.
//   scripts/      executable code, not model-read rule prose. (This checker lives there and spells
//                 both retired names in its own patterns; a corpus holding it would be circular.)
//   features/     git-ignored, absent from a worktree, and every spec names the skills it retired.
//   github_build/ git-ignored generated output, derived FROM this corpus. A stale name there means
//                 a stale name in a source file, which this check already catches — and whether it
//                 exists at all depends on who last ran the build.
// A new top-level directory joins the corpus only by being added to CORPUS_DIRS, deliberately.
// Usage: node check-pointers.mjs [root]   Exit 1 = at least one violation.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

// Default to the repo this script ships in — never the shell CWD, which drifts. Same rule as
// check-agents.mjs; this file sits at <repo>/scripts/, so the root is one level up.
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] ?? join(here, '..'));

const CORPUS_DIRS = ['skills', 'agents'];
const CORPUS_FILES = ['CLAUDE.md', 'README.md'];
// .mjs as well as .md: a skill's own check script carries pointer comments too
// (skills/coding-standards/scripts/preflight.mjs:2 cites reference/design.md).
const CORPUS_EXT = /\.(?:md|mjs)$/;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage']);

const RETIRED = ['web-standards', 'taste', 'crew'];
// `web-standards` is never an English word, so any spelling of it is a live reference.
// `taste` IS one — skills/self-improve/SKILL.md, SKILL LIFECYCLE ("not by taste") and
// skills/coding-standards/reference/design.md:27 ("not your taste") are both correct English and
// must stay green — so it counts only in a PATH or skill-name position: `taste/`, `/taste`,
// backticked `taste`, or the all-caps heading form the deleted SKILL.md used.
// GAP, stated rather than hidden: a bare mid-sentence "taste" that MEANS the skill is
// indistinguishable from the word here. Prose review owns that one; this script cannot.
// `crew` is the same shape as `taste` — an ordinary English word, and this corpus uses it that way
// ("a role that must see an earlier worker's output", "the crew skill was retired"). So it counts only
// in a PATH or skill-name position, and the same GAP applies: a bare mid-sentence "crew" meaning the
// skill is invisible here. That is deliberate — it is what lets a historical note keep naming what was
// retired, which `agents/AGENTS.md` and `agents/scripts/check-agents.mjs` both do on purpose.
const RETIRED_PATTERNS = [
  [/web-standards/i, 'web-standards'],
  [/[`/]taste\b|\btaste[`/]/i, 'taste (path or skill name)'],
  [/\bTASTE\b/, 'TASTE (heading form)'],
  [/[`/]crew\b|\bcrew[`/]/i, 'crew (path or skill name)'],
  [/\bCREW\b/, 'CREW (heading form)'],
];

// The five references under skills/coding-standards/reference/ that are NOT design addenda.
// Everything else there must be design-<name>.md. Enumerated on purpose: a new non-design addendum
// turns this RED until someone adds it here, which is the point — the naming decision gets made
// once, in writing, instead of a tenth design file landing as motion.md while nothing errors.
const NON_DESIGN_REFS = new Set(['dependencies.md', 'design.md', 'frontend.md', 'python-ml.md', 'web.md']);

// The two sanctioned markdown pointer forms (self-improve SKILL LIFECYCLE, the addendum bullet):
// `reference/<f>.md` inside the owning skill, `<skill>/reference/<f>.md` across skills, either
// optionally spelled from the repo root as `skills/<skill>/reference/<f>.md`.
// The lookbehind excludes `<` and `/`, so the TEMPLATE spellings in self-improve itself
// (`reference/<file>.md`, `skills/<name>/reference/`) are not read as real pointers.
// The name classes accept UPPERCASE deliberately, though every real file here is lowercase.
// MEASURED: with `[a-z0-9._-]` a miscased pointer did not go red — it stopped matching the pointer
// form at all, so four broken pointers silently left the corpus and the run printed "clean" with
// the count down from 104 to 100. A check whose corpus shrinks when its subject breaks is worse
// than no check. Matching is case-tolerant so existsExact below can do the case comparison; a
// miscased `reference/` segment itself is still invisible, and widening that literal would start
// matching ordinary prose.
const POINTER_RE = /(?<![\w<>./-])(?:skills\/)?(?:([A-Za-z0-9-]+)\/)?reference\/([A-Za-z0-9._-]+\.md)/g;
// The third form (same bullet): the skill-dir placeholder + /scripts/<file>.mjs, optionally
// hopping to a sibling skill (`/../feature/scripts/...`). Matched by SHAPE, never by the
// placeholder's name — spelling that token would be teaching a token that substitutes itself
// (self-improve SKILL LIFECYCLE, the substitution bullet).
const SCRIPT_RE = /\$\{[A-Za-z_][A-Za-z0-9_]*\}((?:\/\.\.)*(?:\/[A-Za-z0-9-]+)*\/scripts\/[A-Za-z0-9._-]+\.mjs)/g;

const rel = (p) => relative(root, p).split('\\').join('/') || '.';
const violations = [];

// statSync throws ENOENT on a dangling symlink/junction, which would kill the run with a raw stack
// trace. Report the entry and keep walking — a broken link is a finding, not a crash.
const statOr = (p) => {
  try { return statSync(p); } catch (e) {
    violations.push(`${rel(p)}  unreadable-path  ${e.code ?? e.message} — dangling symlink/junction or unreadable entry`);
    return null;
  }
};
const readOr = (p) => {
  try { return readFileSync(p, 'utf8'); } catch (e) {
    violations.push(`${rel(p)}  unreadable-path  ${e.code ?? e.message} — dangling symlink/junction or unreadable entry`);
    return null;
  }
};

// statSync, never Dirent.isDirectory(): a Windows junction reports false as a Dirent, so a
// junctioned skills/ would vanish and the whole run would report clean having checked nothing.
// Same shape as check-agents.mjs / check-docs.mjs. A false clean is the worst output here.
const walk = (dir) => readdirSync(dir).flatMap((e) => {
  if (SKIP_DIRS.has(e) || e.startsWith('.')) return [];
  const p = join(dir, e);
  const st = statOr(p);
  if (!st) return [];
  return st.isDirectory() ? walk(p) : (CORPUS_EXT.test(e) ? [p] : []);
});

// readdirSync gives the EXACT on-disk spelling. existsSync is case-INSENSITIVE on Windows/NTFS, so
// a pointer written `reference/Design.md` resolves against design.md and a genuinely broken pointer
// passes — the defect check-docs.mjs documents. Cached: the same reference dir is hit ~90 times.
const dirCache = new Map();
const entries = (dir) => {
  if (!dirCache.has(dir)) {
    let e;
    try { e = readdirSync(dir); } catch { e = null; }
    dirCache.set(dir, e);
  }
  return dirCache.get(dir);
};
const existsExact = (abs) => {
  const list = entries(dirname(abs));
  return list !== null && list.includes(abs.split(/[\\/]/).pop());
};

// A bad root must be a named error, never a quiet "nothing to check" — the two look identical in a
// log otherwise. isDirectory() as well as existsSync: a FILE passed as root reaches readdirSync and
// dies on a raw ENOTDIR stack trace.
if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`check-pointers: not a directory: ${root}`);
  process.exit(2);
}
// An allowlisted root that vanished must ABORT, not shrink the corpus in silence. A renamed
// skills/ would otherwise leave every rule below with nothing to inspect and still print "clean".
for (const d of CORPUS_DIRS) {
  const p = join(root, d);
  if (!existsSync(p) || !statSync(p).isDirectory()) {
    console.error(`check-pointers: allowlisted corpus root missing: ${d}/ under ${root}`);
    process.exit(2);
  }
}

const skillsDir = join(root, 'skills');
const corpus = [];
for (const d of CORPUS_DIRS) corpus.push(...walk(join(root, d)));
for (const f of CORPUS_FILES) {
  const p = join(root, f);
  if (existsSync(p)) corpus.push(p);
  else violations.push(`${f}  missing-corpus-file  allowlisted rule file is absent — the corpus silently shrank`);
}

// A skill is a directory under skills/ holding a SKILL.md. skills/_shared/ has none and is
// correctly not a skill.
const skillNames = readdirSync(skillsDir).filter((e) => {
  if (SKIP_DIRS.has(e) || e.startsWith('.')) return false;
  const st = statOr(join(skillsDir, e));
  return !!st && st.isDirectory() && existsSync(join(skillsDir, e, 'SKILL.md'));
});

// --- The retired skill directories are gone (ADR 0005). ---
for (const name of RETIRED) {
  if (existsSync(join(skillsDir, name))) {
    violations.push(`skills/${name}  retired-skill-dir  ADR 0005 merged it into coding-standards; the directory must not exist`);
  }
}

// --- README publishes the roster that is actually on disk. ---
// Pins "16 skills become 14" WITHOUT hardcoding 14: a measured count is not an invariant, and a
// literal would go red on the next legitimate skill. Set equality stays true as the roster changes.
const readmeSrc = readOr(join(root, 'README.md'));
if (readmeSrc !== null) {
  const rosterLine = readmeSrc.split(/\r?\n/).find((l) => l.includes('`skills/`') && l.includes('('));
  if (!rosterLine) {
    // Loud, not skipped: an unparsable roster line means this rule verified NOTHING, and silence
    // there is indistinguishable from a pass.
    violations.push('README.md  roster-unparsable  no `skills/` layout line carrying a (…) skill list — the roster comparison inspected nothing; fix the line or fix this check');
  } else {
    const listed = rosterLine
      .slice(rosterLine.indexOf('(') + 1, rosterLine.lastIndexOf(')'))
      .split(',').map((s) => s.trim()).filter(Boolean);
    for (const n of skillNames) {
      if (!listed.includes(n)) violations.push(`README.md  roster-missing  skills/${n}/SKILL.md exists but README's skill list omits it (self-improve SKILL LIFECYCLE)`);
    }
    for (const n of listed) {
      if (!skillNames.includes(n)) violations.push(`README.md  roster-stale  README lists "${n}" but skills/${n}/SKILL.md does not exist`);
    }
  }
}

// --- Every design addendum carries the design- prefix. ---
const csRefDir = join(skillsDir, 'coding-standards', 'reference');
if (!existsSync(csRefDir)) {
  violations.push('skills/coding-standards/reference  missing-dir  the addendum tree ADR 0005 created is gone');
} else {
  for (const f of readdirSync(csRefDir).filter((e) => e.endsWith('.md'))) {
    if (NON_DESIGN_REFS.has(f) || /^design-[a-z0-9-]+\.md$/.test(f)) continue;
    violations.push(`skills/coding-standards/reference/${f}  unprefixed-design-ref  a design addendum is design-<name>.md (coding-standards/SKILL.md NAMING RULE). Not a design file? Add it to NON_DESIGN_REFS in this script — deliberately, so the decision is written down instead of assumed`);
  }
}

// --- The NAMING RULE is written where the next author reads it. ---
// PRESENCE-ONLY, and weak on purpose: it proves the rule is still stated in the SKILL.md a future
// author loads, never that the wording is right. The directory scan above is what proves the rule
// HOLDS. Both are needed — the premortem's failure mode is a rule deleted as redundant, leaving the
// obligation owned by nobody.
const csSkill = readOr(join(skillsDir, 'coding-standards', 'SKILL.md'));
if (csSkill !== null && !/NAMING RULE[\s\S]{0,200}?design-/.test(csSkill)) {
  violations.push('skills/coding-standards/SKILL.md  naming-rule-missing  no NAMING RULE naming the design- prefix. It cannot live only in a features/ file — done/ is never revisited, so the next design addendum lands unprefixed');
}

// --- Per-file scan: retired paths + pointer resolution. ---
let pointers = 0;
for (const file of corpus) {
  const src = readOr(file);
  if (src === null) continue;
  const relPath = rel(file);
  // The owning skill of a bare `reference/…` pointer is the skills/<name>/ it sits in. A file
  // outside skills/ has none — that is a violation, not a resolution.
  const owning = relPath.startsWith('skills/') ? relPath.split('/')[1] : null;
  const lines = src.split(/\r?\n/);

  lines.forEach((line, i) => {
    const n = i + 1;

    for (const [re, label] of RETIRED_PATTERNS) {
      if (re.test(line)) {
        violations.push(`${relPath}  retired-skill-path  line ${n}: names the retired skill ${label}. ADR 0005 merged it into coding-standards — repoint to coding-standards/reference/web.md or /design.md, or to a design-<name>.md`);
      }
    }

    for (const m of line.matchAll(POINTER_RE)) {
      pointers++;
      const skill = m[1] ?? owning;
      if (!skill) {
        violations.push(`${relPath}  unresolvable-pointer  line ${n}: "${m[0]}" — a bare reference/ pointer resolves inside the WRITER's skill dir, and this file belongs to no skill. Use <skill>/reference/<file>.md (self-improve SKILL LIFECYCLE), or an absolute path if a subagent reads it`);
        continue;
      }
      if (!existsExact(join(skillsDir, skill, 'reference', m[2]))) {
        violations.push(`${relPath}  dangling-pointer  line ${n}: "${m[0]}" — skills/${skill}/reference/${m[2]} does not exist (exact spelling required; NTFS would accept the wrong case). A dangling markdown pointer errors only when a model tries to follow it`);
      }
    }

    for (const m of line.matchAll(SCRIPT_RE)) {
      pointers++;
      if (!owning) {
        violations.push(`${relPath}  unresolvable-pointer  line ${n}: "${m[0]}" — the skill-dir placeholder substitutes at skill LOAD and this file is not a skill body, so it would ship as a literal token`);
        continue;
      }
      const target = posix.normalize(`skills/${owning}${m[1].split('\\').join('/')}`);
      if (target.startsWith('..')) {
        violations.push(`${relPath}  unresolvable-pointer  line ${n}: "${m[0]}" — resolves outside the repo`);
        continue;
      }
      if (!existsExact(join(root, ...target.split('/')))) {
        violations.push(`${relPath}  dangling-script-pointer  line ${n}: "${m[0]}" — ${target} does not exist. A shell inherits the CWD, not the skill dir, so this is a guaranteed ENOENT at run time`);
      }
    }
  });
}

const roots = [...CORPUS_DIRS.map((d) => `${d}/`), ...CORPUS_FILES].join(', ');
if (!violations.length) {
  // Zero pointers is NOT a clean bill of health — it is an empty set, and a regex that stopped
  // matching produces exactly this while still printing "clean". Say so in different words.
  if (pointers === 0) {
    console.log(`check-pointers: 0 pointers found across ${corpus.length} file(s) under ${roots} — NOTHING about the pointer graph was verified. Either the corpus is wrong or the pointer forms changed.`);
  } else {
    console.log(`check-pointers: clean — ${pointers} pointer(s) across ${corpus.length} file(s) under ${roots}; ${skillNames.length} live skill(s)`);
  }
  console.log('Corpus is an ALLOWLIST: docs/ (ADRs are dated history), scripts/ (code, not model-read');
  console.log('rule prose), features/ and github_build/ (git-ignored, absent from a worktree) are out of');
  console.log('corpus BY CONSTRUCTION, not by exemption. A new top-level directory joins it only by being');
  console.log('added to CORPUS_DIRS in this file.');
  console.log('Resolution only. That a pointer leads to the RIGHT file, that prose still ROUTES work to');
  console.log('it, and that a description still MATCHES a request are semantic and fail silently — a');
  console.log('fresh-model trace is the only evidence for those.');
  process.exit(0);
}
console.log(violations.join('\n'));
console.log(`\ncheck-pointers: ${violations.length} violation(s) across ${corpus.length} file(s) under ${roots}.`);
process.exit(1);
