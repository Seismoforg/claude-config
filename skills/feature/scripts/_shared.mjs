// feature — the pieces more than one of this folder's scripts needs.
//
// Not a check and not a hook: nothing invokes this file directly. `check-features.mjs`,
// `tick-guard.mjs` and `tick-sync.mjs` remain the entry points.
//
// The three scripts used to be standalone on purpose, each carrying its own copy. That bought
// reachability — they are reached both through the `~/.claude/skills` junction and at their real path,
// and `build-copilot.mjs` copies them flat into `.github/scripts/`. A sibling import survives all three
// (measured; see ADR 0006), so the copies bought nothing that this file does not.
//
// What they COST is recorded in ADR 0006 Consequences: nothing enforced that the copies agreed. Add a
// marker to one and the check goes green on a spec the hook blocks. That hazard is what this file ends.
//
// NOT everything here has the same importers, and that is deliberate:
//   ANNOTATED       — all three scripts
//   tasksOf, norm   — tick-guard.mjs and tick-sync.mjs only. check-features.mjs walks `# Tasks` with its
//                     own `tasksNotCurrent`, which returns violation STRINGS rather than task items, and
//                     it has no normaliser at all. Unifying those two return contracts is a separate
//                     refactor, deliberately not done here.

// An unchecked box is deliberate only if it SAYS so. These three markers are the vocabulary: the two
// in live use plus a feature id for work that moved into its own spec. Adding a fourth marker is now a
// one-line change in one place — which is the whole point of this file.
export const ANNOTATED = /\bBLOCKED\b|\bNOT DONE\b|\b\d{8}-\d{4}\b/;

// Walk `# Tasks` and return one entry per checkbox. Three things a naive regex gets wrong, all measured
// against real files in this repo:
//  1. The annotation may sit on a CONTINUATION line, not the `- [ ]` line. A task item is its first line
//     plus every following indented line — which is why `raw` accumulates them and `text` does not.
//  2. A fenced block inside the section would otherwise read as tasks.
//  3. An unclosed fence must not silently swallow the rest of the file; here the walk simply ends.
export const tasksOf = (src) => {
  const lines = src.split(/\r?\n/);
  const start = lines.findIndex((l) => /^# Tasks\s*$/i.test(l));
  if (start === -1) return [];
  const out = [];
  let fenced = false;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^# /.test(line)) break;
    if (/^\s*```/.test(line)) { fenced = !fenced; continue; }
    if (fenced) continue;
    const m = line.match(/^- \[([ xX])\]\s*(.*)$/);
    if (m) {
      out.push({ line: i + 1, checked: m[1] !== ' ', text: m[2], raw: line });
      continue;
    }
    if (out.length && /^\s+\S/.test(line)) out[out.length - 1].raw += '\n' + line;  // continuation
  }
  return out;
};

// Todos are seeded VERBATIM from the task text, so an exact compare after light normalisation is
// enough. Backticks and ** are stripped because a model re-typing a task tends to drop the markup
// before it drops a word.
export const norm = (s) => String(s ?? '')
  .replace(/[`*]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();
