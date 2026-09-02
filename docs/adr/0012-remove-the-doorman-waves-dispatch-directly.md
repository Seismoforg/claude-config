---
status: accepted
date: 2026-09-02
---

# Context
The doorman was three hooks plus a VS Code extension whose only job was to install and display them.
ADR 0010 exists for the build step that extension introduced into a dependency-free repo.

It never became what it was designed to be. The independent classifier it was built around could not
be built — no credential the SDK can resolve exists on this machine — so the pre-decided fallback
dropped the classifier and left the hook injecting the rubric for the main loop to rate itself
against. Its own feature spec says it in those words: **"the doorman is a notice board that every
prompt must pass, not a judge."**

ADR 0011 then gave the same tier rubric a better reader. `feature` step 6 rates each task in a wave
and dispatches it. That reader arrives with the task in hand and acts on its own rating immediately.
The hook's rating is advice attached to a prompt, delivered by three node starts that fire in every
project on every prompt, to put a rubric in front of a loop that the only actual dispatcher already
reads for itself.

# Decision
**The doorman is removed. `feature` step 6's wave build dispatches the tier agents directly.**

- Delete the `extension/` tree, and unregister its three hooks — `UserPromptSubmit`, the `TodoWrite`
  `PostToolUse` entry pointing at `doorman-launcher.mjs`, and `SubagentStart`.
- **Keep all four tier agents.** They are what a wave dispatches to. Only their prose changes.
- Rename `rules/doorman-tiers.md` to `rules/dispatch-tiers.md`, cut to the tier table. The hook
  config block, the `~/.claude/doorman-disabled` on/off mechanism and the mid-turn reminder form go
  with the hook that read them.
- Rename `rules/doorman-worker.md` to `rules/agent-worker.md`. Four agents read it so four copies
  cannot drift; the doorman going does not touch that reason.

**The rubric stays a RULE file rather than moving into the `feature` skill.** The four agent
definitions reach it by the `~/.claude/rules/` junction path, which resolves from any project. A path
inside the skill would not.

# Rationale
- **The hook delivered advice; step 6 delivers a dispatch.** One of those two readers acts on the
  rating. Keeping both means paying for the one that does not.
- **Three node starts per prompt, in every project, for a rubric the only dispatcher already reads.**
  That is the whole running cost of the notice board, and it buys nothing step 6 does not already do.
- **`waveThroughSlashCommands` disappearing settles ADR 0011's pending exemption rather than dropping
  it.** That list existed to keep the door out of `/feature`, and 0011 recorded the reconciliation as
  still owed. With no door, there is nothing to exempt.

# Consequences
- **Work outside a feature run gets no tier rating at all.** A quick fix, a question, a bug hunt: all
  of it runs in the session model, as it did before the doorman. Chosen deliberately over adding a
  line to `CLAUDE.md`, on the ground that such a line would be the same notice board, minus the log.
- **Nothing records which agent ran any more.** The `SubagentStart` log is gone with no replacement.
- **The machine-level registrations depend on a manual VS Code uninstall this repo cannot perform or
  verify.** The installed extension rewrites the launcher and all three registrations on every
  activation, so the cleanup only holds after the user uninstalls by hand.
- ADR 0010 is superseded by this one. Its whole subject is the build step the extension introduced;
  no extension, no build step.
- ADR 0011 is amended, not superseded. Its decision stands; its consequence bullet naming the
  doorman's wave-through list names a list that no longer exists.
