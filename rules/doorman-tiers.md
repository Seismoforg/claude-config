# DOORMAN TIERS

**This file has two readers and they consume different halves.**

The `UserPromptSubmit` hook script parses the config block below, strips it, and hands everything
after it to the model as hook context on every prompt it does not wave through. So the prose here is
not read the way the rest of `rules/` is read: nothing routes to it, and no model chooses to open
it. It arrives whether or not it is wanted. Keep it short for that reason.

Editing this file changes the doorman's behaviour immediately. There is no rebuild and no restart.

<!-- doorman:config
{
  "minPromptChars": 40,
  "waveThroughSlashCommands": ["feature", "git-commit", "self-improve", "clear", "compact", "config", "help", "artifacts", "loop", "schedule"]
}
-->

## What the config block means
- **`minPromptChars`** — a prompt shorter than this is waved through untouched. It exists to keep
  "yes", "go on" and "weiter" from carrying a rubric they cannot use. It is a filter for *there is
  nothing here to decide*, never a proxy for complexity: a short prompt can name enormous work, and
  that case is accepted as the price of not annotating every confirmation.
- **`waveThroughSlashCommands`** — a prompt whose `slash_command` is in this list is waved through.
  These commands own their own gates and their own dispatch.
  **`feature` in this list is the doorman's largest blind spot, and it is deliberate.** The dispatch
  ladder this rubric descends from lived inside that workflow. Waving it through means the doorman is
  absent from exactly the work it came from. Removing it from this list is a one-word edit; do that
  when the two mechanisms are reconciled, not before.
  **The field is absent from the hook input on a normal prompt.** Absent means not a slash command,
  which means classify. Never treat absence as a match.
**There is no `enabled` flag here, deliberately.** Off is the presence of the file
`~/.claude/doorman-disabled`, which is what the extension's toggle writes and removes. One switch,
not two. This file is git-tracked, so an `enabled: false` here would turn up in `git status` and get
committed by accident; the marker file is per machine and untracked, like every other piece of
doorman runtime state.

Turning the doorman off by hand, with no extension: create that file. Turning it back on: delete it.

---

<!-- doorman:reminder:start -->
**Doorman.** A new piece of work is starting. Rate it before you begin:
`inline` do it yourself · `haiku` the same edit at sites you can enumerate · `sonnet` a new file
following an existing pattern · `opus` anything carrying a decision · `fable` steps you cannot list
up front. Unclear rates UP. Touching `CLAUDE.md`, the doorman's own files or the agent definitions
stays `inline`.
<!-- doorman:reminder:end -->

**The block above is the MID-TURN form**, injected by the `TodoWrite` hook each time a task starts.
The door hook strips it, because a prompt entering through the door gets everything below it
anyway. Keeping both forms in this one file is what stops the tier names drifting apart; there is no
second place to edit.

It is deliberately short. At twenty task transitions the full rubric would be 85 KB of identical
repeated text. The price of that: the collapse rules and the reasoning below are absent exactly
where misratings happen, so the reminder carries only the tie-break and the one hard exception.

---

# THE TIERS

Rate by the KIND of change, never by its size. A pattern repeated over twenty files is cheap. One
line carrying a decision is not.

| Tier | Agent | What it takes |
|---|---|---|
| `inline` | none | One place, wording already fixed. Do it yourself. |
| `haiku` | `haiku-agent` | The same edit at sites you can ENUMERATE. Wording already fixed. |
| `sonnet` | `sonnet-agent` | A new file or script following a pattern already in the repo. |
| `opus` | `opus-agent` | Anything carrying a decision. |
| `fable` | `fable-agent` | Long-horizon work whose steps cannot be listed up front. |

## The two ways this ladder collapses

**Rating prose `haiku` because it looks repetitive.** A rule stated in seven files is seven
decisions, because each one has a different reader and needs different words. Rated `haiku` it comes
back as seven identical sentences. In a config repo that is the most common task there is, and one
bad round of it teaches you to rate everything `opus` on sight, which ends the ladder.

**Rating `fable` because the task is big.** Size is not the test. Knowability is. Work whose steps
can already be listed is `opus` or below, however many steps there are.

## The rule that resolves a tie
Unclear → rate UP. Rating down produces work that has to be redone and reviewed; rating up costs
tokens. These are not the same size of mistake.

## When NOT to dispatch at all
`inline` is a real answer and usually the right one. Dispatch buys parallelism and a cheaper model;
it costs a round trip, a brief you have to write, and a worker that cannot see your context or ask
you anything. One edit in one file is not worth that.

Also stay `inline`, whatever the rubric says, when the change touches what the dispatch itself runs
under: `CLAUDE.md`, this file, `doorman-worker.md`, or the agent definitions. Sending a worker to
rewrite the rules it is at that moment obeying leaves nothing recording which version it followed.

# IF YOU DISPATCH, THE BRIEF OWES THE WORKER
It cannot ask you anything. Anything missing here is missing for good.

- Its slice, and nothing else.
- Absolute paths for anything outside the repo it must read. A spec under `features/` above all:
  that directory is git-ignored, so a repo-relative path to one resolves to nothing.
- The rule files its surface needs, by absolute path. `CLAUDE.md`'s routing table decides which;
  the worker does not hold that table.
- Authorization for any run that spends the machine. Not in the brief means not permitted.
