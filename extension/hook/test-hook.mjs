#!/usr/bin/env node
// Exercises doorman.mjs by piping recorded hook JSON at it and asserting which path it took.
// Node builtins only, no test framework — the repo has none and this is not the place to add one.
//
// Every case runs against a THROWAWAY home built in a temp dir, with USERPROFILE/HOME repointed at
// it. os.homedir() reads those, so the script under test never sees the real ~/.claude and no test
// line ever lands in the real doorman.log.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
// The settings merge is imported, not spawned: it is a library, not a hook. It takes every path as
// a parameter, so a throwaway home is passed in rather than faked through the environment.
import { registerHooks, isRegistered } from './settings-merge.cjs';

const HOOK = join(dirname(fileURLToPath(import.meta.url)), 'doorman.mjs');
const REAL_RUBRIC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'rules', 'doorman-tiers.md');

const WORKSPACE = 'D:\\Projects\\example';

/** Build a throwaway home. `rubric: null` omits it; `agents: false` omits the agent files. */
const makeHome = ({ rubric = 'real', agents = true } = {}) => {
  const home = mkdtempSync(join(tmpdir(), 'doorman-test-'));
  mkdirSync(join(home, '.claude', 'rules'), { recursive: true });
  mkdirSync(join(home, '.claude', 'agents'), { recursive: true });
  if (rubric === 'real') {
    cpSync(REAL_RUBRIC, join(home, '.claude', 'rules', 'doorman-tiers.md'));
  } else if (typeof rubric === 'string') {
    writeFileSync(join(home, '.claude', 'rules', 'doorman-tiers.md'), rubric, 'utf8');
  }
  if (agents) {
    for (const t of ['haiku', 'sonnet', 'opus', 'fable']) {
      writeFileSync(join(home, '.claude', 'agents', `${t}-agent.md`), '---\nname: x\n---\n', 'utf8');
    }
  }
  return home;
};

const run = (home, input) => {
  const r = spawnSync(process.execPath, [HOOK], {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf8',
    env: { ...process.env, USERPROFILE: home, HOME: home },
  });
  const logPath = join(home, '.claude', 'doorman.log');
  const lines = existsSync(logPath)
    ? readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
    : [];
  let out = null;
  if (r.stdout.trim()) {
    try {
      out = JSON.parse(r.stdout);
    } catch {
      out = 'UNPARSEABLE';
    }
  }
  return { status: r.status, out, last: lines.at(-1), stderr: r.stderr };
};

const prompt = (n) => 'x'.repeat(n);
let failed = 0;
const check = (name, cond, detail) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${name}${cond ? '' : `  — ${detail}`}`);
  if (!cond) failed++;
};

// 1. A long prompt with no slash_command classifies. This is also the absent-field case: the hook
//    input for a normal prompt carries no slash_command at all, and absence must mean "classify".
{
  const home = makeHome();
  const r = run(home, { cwd: WORKSPACE, prompt: prompt(200), hook_event_name: 'UserPromptSubmit' });
  check('long prompt, no slash_command → rubric injected', r.last?.path === 'rubric', JSON.stringify(r.last));
  check('  ...and it emits additionalContext', !!r.out?.hookSpecificOutput?.additionalContext, JSON.stringify(r.out));
  check('  ...and it does NOT emit updatedPrompt', !r.out?.hookSpecificOutput?.updatedPrompt, 'updatedPrompt present');
  check(
    '  ...and the config block is stripped from what the model sees',
    !String(r.out?.hookSpecificOutput?.additionalContext).includes('doorman:config'),
    'config block leaked into the model context'
  );
  check(
    '  ...and the mid-turn reminder block is stripped too',
    !String(r.out?.hookSpecificOutput?.additionalContext).includes('doorman:reminder'),
    'reminder markers leaked into the model context'
  );
  check(
    '  ...leaving no duplicate short tier list before the full table',
    !/inline` do it yourself/.test(String(r.out?.hookSpecificOutput?.additionalContext)),
    'the condensed tier list survived into the door injection'
  );
  rmSync(home, { recursive: true, force: true });
}

// 1b. prompt_id is logged on every path. It is the join key the status bar needs: a subagent line
//     with no matching rubric line is a dispatch the doorman had no part in.
{
  const home = makeHome();
  const r1 = run(home, { cwd: WORKSPACE, prompt: prompt(200), prompt_id: 'PID-CLASSIFY' });
  check('promptId logged on the classifying path', r1.last?.promptId === 'PID-CLASSIFY', JSON.stringify(r1.last));
  const r2 = run(home, { cwd: WORKSPACE, prompt: 'ja', prompt_id: 'PID-WAVED' });
  check('promptId logged on a wave-through too', r2.last?.promptId === 'PID-WAVED', JSON.stringify(r2.last));
  const r3 = run(home, { cwd: WORKSPACE, prompt: prompt(200) });
  check('promptId is null when the field is absent', r3.last?.promptId === null, JSON.stringify(r3.last));
  rmSync(home, { recursive: true, force: true });
}

// 2. A slash command on the wave-through list passes untouched.
{
  const home = makeHome();
  const r = run(home, { cwd: WORKSPACE, prompt: prompt(200), slash_command: '/feature' });
  check('slash command on the list → pass', r.last?.path === 'pass' && /slash command/.test(r.last?.reason), JSON.stringify(r.last));
  check('  ...and stdout is empty', r.out === null, JSON.stringify(r.out));
  rmSync(home, { recursive: true, force: true });
}

// 3. A slash command NOT on the list still classifies.
{
  const home = makeHome();
  const r = run(home, { cwd: WORKSPACE, prompt: prompt(200), slash_command: '/some-other-command' });
  check('slash command off the list → rubric injected', r.last?.path === 'rubric', JSON.stringify(r.last));
  rmSync(home, { recursive: true, force: true });
}

// 4. A short prompt passes.
{
  const home = makeHome();
  const r = run(home, { cwd: WORKSPACE, prompt: 'ja' });
  check('short prompt → pass', r.last?.path === 'pass' && /shorter than/.test(r.last?.reason), JSON.stringify(r.last));
  rmSync(home, { recursive: true, force: true });
}

// 5. An override for THIS workspace is applied and consumed.
{
  const home = makeHome();
  const ov = join(home, '.claude', 'doorman-override.json');
  writeFileSync(ov, JSON.stringify({ tier: 'opus', cwd: WORKSPACE }), 'utf8');
  const r = run(home, { cwd: WORKSPACE, prompt: 'ja' });
  check('override on a matching cwd → applied even to a short prompt', r.last?.path === 'override' && r.last?.tier === 'opus', JSON.stringify(r.last));
  check('  ...and names the forced agent', String(r.out?.hookSpecificOutput?.additionalContext).includes('opus-agent'), 'agent not named');
  check('  ...and the override file is consumed', !existsSync(ov), 'override file survived');
  rmSync(home, { recursive: true, force: true });
}

// 6. An override for a DIFFERENT workspace is left alone. Several sessions share one ~/.claude.
{
  const home = makeHome();
  const ov = join(home, '.claude', 'doorman-override.json');
  writeFileSync(ov, JSON.stringify({ tier: 'opus', cwd: 'D:\\Projects\\other' }), 'utf8');
  const r = run(home, { cwd: WORKSPACE, prompt: prompt(200) });
  check('override for another cwd → not applied', r.last?.path === 'rubric', JSON.stringify(r.last));
  check('  ...and not consumed', existsSync(ov), 'another session\u2019s override was eaten');
  rmSync(home, { recursive: true, force: true });
}

// 7. Path comparison survives separator and case differences between the two writers.
{
  const home = makeHome();
  writeFileSync(join(home, '.claude', 'doorman-override.json'), JSON.stringify({ tier: 'haiku', cwd: 'd:/projects/example/' }), 'utf8');
  const r = run(home, { cwd: WORKSPACE, prompt: prompt(200) });
  check('override cwd differing in case and separators still matches', r.last?.path === 'override', JSON.stringify(r.last));
  rmSync(home, { recursive: true, force: true });
}

// 7b. The override names the WORKSPACE; the hook receives the SESSION cwd, which drifts into
//     subfolders as the session works. Measured on a real entry, where they differed and an
//     equality check would have dropped it.
{
  const home = makeHome();
  writeFileSync(join(home, '.claude', 'doorman-override.json'), JSON.stringify({ tier: 'opus', cwd: WORKSPACE }), 'utf8');
  const r = run(home, { cwd: `${WORKSPACE}\\extension`, prompt: prompt(200) });
  check('override applies when the session sits in a subfolder', r.last?.path === 'override', JSON.stringify(r.last));
  rmSync(home, { recursive: true, force: true });
}

// 7c. ...but a SIBLING whose name merely starts the same is a different project. A bare startsWith
//     would swallow it.
{
  const home = makeHome();
  const ov = join(home, '.claude', 'doorman-override.json');
  writeFileSync(ov, JSON.stringify({ tier: 'opus', cwd: WORKSPACE }), 'utf8');
  const r = run(home, { cwd: `${WORKSPACE}-old`, prompt: prompt(200) });
  check('a sibling path sharing a prefix does NOT match', r.last?.path === 'rubric', JSON.stringify(r.last));
  check('  ...and the override survives for its own workspace', existsSync(ov), 'override was eaten by a sibling');
  rmSync(home, { recursive: true, force: true });
}

// 8. The doorman-disabled marker file turns it off without touching settings.json or the rubric.
{
  const home = makeHome();
  writeFileSync(join(home, '.claude', 'doorman-disabled'), '', 'utf8');
  const r = run(home, { cwd: WORKSPACE, prompt: prompt(200) });
  check('doorman-disabled present → pass', r.last?.path === 'pass' && r.last?.reason === 'disabled', JSON.stringify(r.last));
  rmSync(home, { recursive: true, force: true });
}

// 8b. ...and removing it turns the doorman back on, with no other state involved.
{
  const home = makeHome();
  const marker = join(home, '.claude', 'doorman-disabled');
  writeFileSync(marker, '', 'utf8');
  run(home, { cwd: WORKSPACE, prompt: prompt(200) });
  rmSync(marker, { force: true });
  const r = run(home, { cwd: WORKSPACE, prompt: prompt(200) });
  check('marker removed → classifies again', r.last?.path === 'rubric', JSON.stringify(r.last));
  rmSync(home, { recursive: true, force: true });
}

// 9. Fail-open: no rubric at all.
{
  const home = makeHome({ rubric: null });
  const r = run(home, { cwd: WORKSPACE, prompt: prompt(200) });
  check('rubric missing → pass, exit 0', r.last?.reason === 'rubric missing' && r.status === 0, JSON.stringify(r.last));
  rmSync(home, { recursive: true, force: true });
}

// 10. Fail-open: agent files missing, so no directive can name a real agent.
{
  const home = makeHome({ agents: false });
  const r = run(home, { cwd: WORKSPACE, prompt: prompt(200) });
  check('agent files missing → pass', r.last?.path === 'pass' && /agent files missing/.test(r.last?.reason), JSON.stringify(r.last));
  rmSync(home, { recursive: true, force: true });
}

// 11. Fail-open: unparseable stdin.
{
  const home = makeHome();
  const r = run(home, 'not json at all');
  check('unparseable input → pass, exit 0', r.last?.reason === 'unparseable hook input' && r.status === 0, JSON.stringify(r.last));
  rmSync(home, { recursive: true, force: true });
}

// 12. Fail-open: a malformed config block keeps the prose working on defaults, and is reported.
{
  const home = makeHome({ rubric: '<!-- doorman:config\n{oops\n-->\nprose' });
  const r = run(home, { cwd: WORKSPACE, prompt: prompt(200) });
  check('malformed config → still injects, flagged configOk:false', r.last?.path === 'rubric' && r.last?.configOk === false, JSON.stringify(r.last));
  rmSync(home, { recursive: true, force: true });
}

// 12b. The mid-turn hook. It fires on a task STARTING, and must stay silent on everything else:
//      it runs after every TodoWrite, so a hook that talks too much is worse than none.
{
  const TODO_HOOK = join(dirname(fileURLToPath(import.meta.url)), 'doorman-todo.mjs');
  const runTodo = (home, todos, extra = {}) => {
    const r = spawnSync(process.execPath, [TODO_HOOK], {
      input: JSON.stringify({
        cwd: WORKSPACE,
        session_id: 'SESSION-1',
        prompt_id: 'PID-MID',
        tool_name: 'TodoWrite',
        tool_input: { todos },
        ...extra,
      }),
      encoding: 'utf8',
      env: { ...process.env, USERPROFILE: home, HOME: home },
    });
    let ctx = null;
    if (r.stdout.trim()) {
      try {
        ctx = JSON.parse(r.stdout).hookSpecificOutput?.additionalContext ?? null;
      } catch {
        ctx = 'UNPARSEABLE';
      }
    }
    return { status: r.status, ctx };
  };
  const todo = (content, status) => ({ content, status, activeForm: content });

  const home = makeHome();
  const first = runTodo(home, [todo('Task A', 'in_progress'), todo('Task B', 'pending')]);
  check('one task in_progress → reminder injected', !!first.ctx, `ctx=${first.ctx}`);
  check('  ...and it names the task that is starting', String(first.ctx).includes('Task A'), `ctx=${first.ctx}`);
  check('  ...and it is short, not the full rubric', String(first.ctx).length < 900, `${String(first.ctx).length} bytes`);

  const repeat = runTodo(home, [todo('Task A', 'in_progress'), todo('Task B', 'completed')]);
  check('same task still in_progress → silent, no repeat', repeat.ctx === null, `ctx=${repeat.ctx}`);

  const moved = runTodo(home, [todo('Task A', 'completed'), todo('Task B', 'in_progress')]);
  check('a different task starts → reminder again', String(moved.ctx).includes('Task B'), `ctx=${moved.ctx}`);

  const sweep = runTodo(home, [todo('Task A', 'completed'), todo('Task B', 'completed')]);
  check('nothing in_progress → silent', sweep.ctx === null, `ctx=${sweep.ctx}`);

  const reseed = runTodo(home, [todo('X', 'in_progress'), todo('Y', 'in_progress')]);
  check('two in_progress, a wholesale rebuild → silent', reseed.ctx === null, `ctx=${reseed.ctx}`);

  const otherSession = runTodo(home, [todo('Task B', 'in_progress')], { session_id: 'SESSION-2' });
  check('a second session tracks its own last task', String(otherSession.ctx).includes('Task B'), `ctx=${otherSession.ctx}`);

  writeFileSync(join(home, '.claude', 'doorman-disabled'), '', 'utf8');
  const off = runTodo(home, [todo('Task C', 'in_progress')]);
  check('disabled → silent mid-turn too', off.ctx === null, `ctx=${off.ctx}`);
  rmSync(join(home, '.claude', 'doorman-disabled'), { force: true });
  rmSync(home, { recursive: true, force: true });

  const noRubric = makeHome({ rubric: 'no reminder block here' });
  const missing = runTodo(noRubric, [todo('Task D', 'in_progress')]);
  check('reminder block missing → silent, exit 0', missing.ctx === null && missing.status === 0, `status=${missing.status}`);
  rmSync(noRubric, { recursive: true, force: true });
}

// 13. The launcher. It is the stable path settings.json names, so every one of its failure modes
//     is a hook firing on every prompt in every project. All of them must exit 0 in silence.
{
  const launcher = join(dirname(fileURLToPath(import.meta.url)), 'launcher.mjs');
  const home = makeHome();
  const runLauncher = (args, extra = {}) =>
    spawnSync(process.execPath, [launcher, ...args], {
      input: JSON.stringify({ cwd: WORKSPACE, prompt: prompt(200) }),
      encoding: 'utf8',
      env: { ...process.env, USERPROFILE: home, HOME: home, ...extra },
    });

  const noPointer = runLauncher(['doorman.mjs']);
  check('launcher, no pointer file → exit 0, silent', noPointer.status === 0 && !noPointer.stdout.trim(), `status=${noPointer.status}`);

  writeFileSync(join(home, '.claude', 'doorman-install.json'), '{ not json', 'utf8');
  const badPointer = runLauncher(['doorman.mjs']);
  check('launcher, malformed pointer → exit 0, silent', badPointer.status === 0 && !badPointer.stdout.trim(), `status=${badPointer.status}`);

  // This is the uninstall case: the pointer survives, the build it names does not.
  writeFileSync(join(home, '.claude', 'doorman-install.json'), JSON.stringify({ hookDir: join(home, 'gone') }), 'utf8');
  const gone = runLauncher(['doorman.mjs']);
  check('launcher, target build removed → exit 0, silent', gone.status === 0 && !gone.stdout.trim(), `status=${gone.status}`);

  const badArg = runLauncher(['../../etc/passwd']);
  check('launcher rejects a script name that is a path', badArg.status === 0 && !badArg.stdout.trim(), `status=${badArg.status}`);

  // And the happy path: pointed at the real hook directory, it must behave exactly as a direct call.
  writeFileSync(
    join(home, '.claude', 'doorman-install.json'),
    JSON.stringify({ hookDir: dirname(fileURLToPath(import.meta.url)) }),
    'utf8'
  );
  const ok = runLauncher(['doorman.mjs']);
  let ctx = null;
  try {
    ctx = JSON.parse(ok.stdout).hookSpecificOutput?.additionalContext ?? null;
  } catch {
    /* asserted below */
  }
  check('launcher, valid pointer → hands over and the hook injects', !!ctx, `stdout=${ok.stdout.slice(0, 80)} stderr=${ok.stderr.slice(0, 200)}`);

  rmSync(home, { recursive: true, force: true });
}

// 14. The settings.json merge. It rewrites a file the user owns — their model, permissions, env and
//     their own hooks — so every case below is about what it must NOT damage.
{
  const LAUNCHER = 'C:\\Users\\someone\\.claude\\doorman-launcher.mjs';
  const OLD_LAUNCHER = 'C:/Users/someone/AppData/old-build/doorman-launcher.mjs';

  const makeSettings = (contents) => {
    const home = mkdtempSync(join(tmpdir(), 'doorman-settings-'));
    mkdirSync(join(home, '.claude'), { recursive: true });
    const settingsPath = join(home, '.claude', 'settings.json');
    if (contents !== null) {
      writeFileSync(settingsPath, typeof contents === 'string' ? contents : JSON.stringify(contents, null, 2), 'utf8');
    }
    return { home, settingsPath, launcherPath: LAUNCHER };
  };
  const readSettings = (settingsPath) => JSON.parse(readFileSync(settingsPath, 'utf8'));
  /** Every entry on one event that names the launcher, ours or a stale one. */
  const ourEntries = (settings, event) =>
    (settings.hooks?.[event] ?? []).filter((e) => JSON.stringify(e).includes('doorman-launcher'));
  const commandsOn = (settings, event) =>
    (settings.hooks?.[event] ?? []).flatMap((e) => (e.hooks ?? []).map((h) => h.command));

  // 14a. Everything that is not ours survives: other top-level settings, a hook on an event we do
  //      not touch, and the user's OWN hook on an event we do.
  {
    const { home, settingsPath, launcherPath } = makeSettings({
      model: 'opus',
      permissions: { allow: ['Bash(git status)'] },
      hooks: {
        PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'node user-guard.mjs' }] }],
        PostToolUse: [{ matcher: 'TodoWrite', hooks: [{ type: 'command', command: 'node user-tick.mjs' }] }],
      },
    });
    const r = registerHooks({ settingsPath, launcherPath });
    const s = readSettings(settingsPath);
    check('merge: reports ok', r.ok === true, JSON.stringify(r));
    check('  ...unrelated top-level settings survive', s.model === 'opus' && s.permissions?.allow?.[0] === 'Bash(git status)', JSON.stringify(s).slice(0, 200));
    check('  ...a hook on an untouched event survives byte for byte',
      JSON.stringify(s.hooks.PreToolUse) === JSON.stringify([{ matcher: 'Bash', hooks: [{ type: 'command', command: 'node user-guard.mjs' }] }]),
      JSON.stringify(s.hooks.PreToolUse));
    check('  ...the user\u2019s own hook on OUR event survives', commandsOn(s, 'PostToolUse').includes('node user-tick.mjs'), JSON.stringify(s.hooks.PostToolUse));
    check('  ...and ours is added beside it', ourEntries(s, 'PostToolUse').length === 1, JSON.stringify(s.hooks.PostToolUse));
    rmSync(home, { recursive: true, force: true });
  }

  // 14b. Idempotence. This runs on EVERY activation, so a merge that appends would grow the file
  //      without bound and fire the doorman twice per prompt.
  {
    const { home, settingsPath, launcherPath } = makeSettings({});
    registerHooks({ settingsPath, launcherPath });
    registerHooks({ settingsPath, launcherPath });
    const s = readSettings(settingsPath);
    for (const event of ['UserPromptSubmit', 'SubagentStart', 'PostToolUse']) {
      check(`merge twice: exactly one doorman entry on ${event}`, ourEntries(s, event).length === 1, JSON.stringify(s.hooks[event]));
    }
    rmSync(home, { recursive: true, force: true });
  }

  // 14c. Upgrade. The old registration names a path inside a build that no longer exists. It must be
  //      REPLACED — a second entry would keep a dead launcher firing on every prompt.
  {
    const { home, settingsPath, launcherPath } = makeSettings({
      hooks: {
        UserPromptSubmit: [{ hooks: [{ type: 'command', timeout: 15, command: `node "${OLD_LAUNCHER}" doorman.mjs` }] }],
      },
    });
    registerHooks({ settingsPath, launcherPath });
    const s = readSettings(settingsPath);
    check('upgrade: still exactly one doorman entry', ourEntries(s, 'UserPromptSubmit').length === 1, JSON.stringify(s.hooks.UserPromptSubmit));
    check('  ...naming the new launcher path', commandsOn(s, 'UserPromptSubmit').some((c) => c.includes('/.claude/doorman-launcher.mjs')), JSON.stringify(commandsOn(s, 'UserPromptSubmit')));
    check('  ...and no longer the old one', !JSON.stringify(s).includes('old-build'), JSON.stringify(s.hooks.UserPromptSubmit));
    rmSync(home, { recursive: true, force: true });
  }

  // 14d. The matcher. Without it the TodoWrite reminder would fire after every tool call.
  {
    const { home, settingsPath, launcherPath } = makeSettings({});
    registerHooks({ settingsPath, launcherPath });
    const s = readSettings(settingsPath);
    check('matcher kept on the event that needs one', ourEntries(s, 'PostToolUse')[0]?.matcher === 'TodoWrite', JSON.stringify(s.hooks.PostToolUse));
    check('  ...and no matcher invented on the events that do not', !('matcher' in (ourEntries(s, 'UserPromptSubmit')[0] ?? {})), JSON.stringify(s.hooks.UserPromptSubmit));
    rmSync(home, { recursive: true, force: true });
  }

  // 14e. No settings.json at all — a fresh install. It must be created, not crashed on.
  {
    const { home, settingsPath, launcherPath } = makeSettings(null);
    check('missing settings.json: not registered beforehand', isRegistered({ settingsPath }) === false, 'reported registered against a file that does not exist');
    let threw = null;
    let r;
    try {
      r = registerHooks({ settingsPath, launcherPath });
    } catch (e) {
      threw = e;
    }
    check('missing settings.json: does not throw', threw === null, String(threw));
    check('  ...reports ok and writes the file', r?.ok === true && existsSync(settingsPath), JSON.stringify(r));
    check('  ...and isRegistered now agrees', isRegistered({ settingsPath }) === true, readFileSync(settingsPath, 'utf8').slice(0, 200));
    rmSync(home, { recursive: true, force: true });
  }

  // 14f. Malformed settings.json. The user is mid-edit with a trailing comma. Reporting the failure
  //      is the ONLY acceptable outcome: overwriting the file would destroy settings we cannot read.
  {
    const broken = '{ "model": "opus", }';
    const { home, settingsPath, launcherPath } = makeSettings(broken);
    let threw = null;
    let r;
    try {
      r = registerHooks({ settingsPath, launcherPath });
    } catch (e) {
      threw = e;
    }
    check('malformed settings.json: does not throw', threw === null, String(threw));
    check('  ...reports the failure instead of ok', r?.ok === false && !!r.error, JSON.stringify(r));
    check('  ...and leaves the file untouched', readFileSync(settingsPath, 'utf8') === broken, readFileSync(settingsPath, 'utf8'));
    check('  ...and isRegistered reads false rather than throwing', isRegistered({ settingsPath }) === false, 'threw or reported registered');
    rmSync(home, { recursive: true, force: true });
  }
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
