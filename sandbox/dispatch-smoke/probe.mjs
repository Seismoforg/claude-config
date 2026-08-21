#!/usr/bin/env node
// probe — dispatch-smoke Set A. Prints facts about the worktree it runs in: git's own view of
// toplevel/git-dir/HEAD/branch, whether features/ exists there, and the readability of whatever
// path arguments it is given. Exists to test whether git behaves inside a worker's worktree the
// way dispatch.md predicts.
// See features/in-progress/20260821-1650-dispatch-smoke-test.md, Technical Plan, "Set A".
//
// node: builtins only, no dependencies.
// Usage: node probe.mjs [path ...]
// Exit 0 = printed. Exit 2 = bad invocation — an argument starting with "-" looks like a flag,
// and this script takes positional paths only.

import { execFileSync } from 'node:child_process';
import { accessSync, constants, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);

const badArg = args.find((a) => a.startsWith('-'));
if (badArg !== undefined) {
  console.error(`probe: bad argument "${badArg}" — positional paths only, no flags`);
  process.exit(2);
}

const git = (gitArgs) => execFileSync('git', gitArgs, { encoding: 'utf8' }).trim();

const toplevel = git(['rev-parse', '--show-toplevel']);
const gitDir = git(['rev-parse', '--git-dir']);
const head = git(['rev-parse', 'HEAD']);
const branch = git(['branch', '--show-current']);

console.log(`toplevel: ${toplevel}`);
console.log(`git-dir: ${gitDir}`);
console.log(`HEAD: ${head}`);
console.log(`branch: ${branch === '' ? 'DETACHED' : branch}`);
console.log(`features/: ${existsSync(join(toplevel, 'features')) ? 'present' : 'absent'}`);

// One labelled line per path argument, in the order given: readable + byte size, or not readable.
args.forEach((arg, i) => {
  try {
    accessSync(arg, constants.R_OK);
    const { size } = statSync(arg);
    console.log(`arg[${i}] ${arg}: readable, ${size} bytes`);
  } catch {
    console.log(`arg[${i}] ${arg}: not readable`);
  }
});

process.exit(0);
