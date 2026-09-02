#!/usr/bin/env node
// doorman-subagent — SubagentStart hook. Records which agent ACTUALLY started.
//
// Why this exists at all: milestone 1 removed the classifier, so the requesting side no longer
// decides a tier. Nothing else in this feature can tell whether the rubric changed what happened.
// This log is the only evidence the doorman does anything, which is why it is a milestone of its
// own rather than a nice-to-have.
//
// Fail-open like its sibling: exit 0, empty stdout, whatever goes wrong. A SubagentStart hook that
// throws must never take a subagent down with it.
import { readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const LOG = join(homedir(), '.claude', 'doorman.log');
const DEADLINE_MS = 5000;

// MEASURED 2026-09-02 against a real haiku-agent start: the field is `agent_type`, carrying
// "haiku-agent". The full payload is
//   agent_id, agent_type, cwd, hook_event_name, prompt_id, session_id, transcript_path
// so `agent_type` is first here because it is the one that was observed, not because it was the
// most plausible guess. The rest stay as cheap insurance against a payload change, and `field` is
// logged on every entry so a silent move to another name shows up in the log rather than as a
// quiet run of nulls.
const NAME_FIELDS = ['agent_type', 'agent_name', 'subagent_type', 'agentType', 'type', 'name'];

const write = (entry) => {
  try {
    appendFileSync(LOG, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, 'utf8');
  } catch {
    /* the log is diagnostics, not the feature */
  }
};

const readStdin = () =>
  new Promise((resolve) => {
    let data = '';
    const done = (v) => {
      clearTimeout(timer);
      resolve(v);
    };
    const timer = setTimeout(() => done(null), DEADLINE_MS);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => {
      data += c;
    });
    process.stdin.on('end', () => done(data));
    process.stdin.on('error', () => done(null));
  });

const main = async () => {
  const raw = await readStdin();
  if (raw === null) {
    write({ path: 'subagent', agent: null, reason: 'no stdin within deadline' });
    process.exit(0);
  }

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    write({ path: 'subagent', agent: null, reason: 'unparseable hook input' });
    process.exit(0);
  }

  const field = NAME_FIELDS.find((f) => typeof input[f] === 'string' && input[f].length > 0);
  const agent = field ? input[field] : null;

  write({
    // The join key. doorman.mjs logs the same prompt_id, so "the rubric was injected AND a
    // subagent then started" is an exact pair. A subagent line with no matching rubric line is a
    // dispatch the doorman had no part in, and must not be counted as influence.
    promptId: typeof input.prompt_id === 'string' ? input.prompt_id : null,
    path: 'subagent',
    agent,
    // Which field it came from, so a later payload change is visible in the log rather than
    // silently degrading to null.
    field: field ?? null,
    cwd: typeof input.cwd === 'string' ? input.cwd : null,
    // Keys only, never values: a payload may carry the task description, and this log is not the
    // place for it.
    keys: Object.keys(input).sort(),
  });
  process.exit(0);
};

main().catch((e) => {
  write({ path: 'subagent', agent: null, reason: `unexpected: ${e?.message ?? 'error'}` });
  process.exit(0);
});
