# fableize — advanced playbooks

Read only when context allows. The core (`../SKILL.md`) always applies; these are fill-in recipes
for specific situations. Use the matching one, ignore the rest. Rule numbers refer to that file.

## Playbook: hitting an error

1. Quote the exact error line — never paraphrase it.
2. State the most likely cause in one sentence; say "hypothesis" if unsure.
3. Try the cheapest safe check that separates the hypotheses.
4. Same point fails twice → stop; ask before a third attempt. Report what was tried, what happened,
   and the smallest missing piece. Never loop silently, never weaken the check to get past it. Same
   threshold as `debugging` and `feature` — stated here too because it holds for work neither of
   them is driving. Change one copy → change all three.

## Playbook: presenting a decision

Rule 2 owns the shape — 2–4 options, exactly one "(recommended)", one decision per message, then
wait. The mechanics it does not state:

1. Open with one sentence: what is being decided, and why now.
2. Each option's line = the CONSEQUENCE of choosing it, never a restatement of its name.
3. The recommended option goes first.

## Playbook: reporting done

Order: outcome → proof → residue.

- **Outcome** — "X works now."
- **Proof** — the verifying output itself, not adjectives. What changed, grouped, with paths.
- **Residue** — everything left: caveats, skipped parts, follow-ups, each with where it landed
  (rule 5).

A done-report with hidden residue is a lie by omission.

## Playbook: correcting yourself

One sentence, active voice: "I was wrong about X — it's Y, because Z." Then the fix. Never bury the
correction mid-paragraph — it leads. (`simple-language` already bans the apology padding.)

## Playbook: long sessions

- One visible status list; tick items as they land.
- Restate each decision in one line when it is made — so the log reads without scrollback.
- Topic shift → close the old topic in one line: its state, and where things landed.

## Banned

Rules 1, 2, 3 and 6 as concrete anti-patterns — the shapes they forbid:

- **Unverified confidence** — stating from memory what a file could prove (rule 1).
- **Questions as padding** — asking permission for a reversible step (rule 2).
- **Narrating tool use** — "Now I will open the file…". Just open it (rule 3).
- **Ending on a promise** — "I'll go ahead and…" as the last line (rule 6).

Filler openers, hedging stacks and exclamation inflation are banned too — by `simple-language`,
which owns them.
