# ASKING THE USER

Load before writing an `AskUserQuestion`. Every gate in the `feature`, `git-commit` and
`self-improve` skills points here.

Any point marked "STOP. Ask" → `AskUserQuestion`, multiple choice, never free text. Don't proceed
until it is answered. "Other" or a cancel → do nothing and report it.

# THE READER MUST BE ABLE TO DECIDE FROM WHAT IS WRITTEN
- **SUBJECT** — the question text says what is being decided and why it is being asked NOW.
- **CONSEQUENCE** — each option says what HAPPENS if it is chosen, not just what it is called.
- **PRICE** — each option names what it costs or gives up. Carve-out: a plain yes/no where the price
  IS the answer states nothing extra.
- **GLOSS** — a term, path, filename, skill name, status literal or section reference is explained in
  a half-clause at first use.
- **SHOW** — a concrete artifact under decision is displayed via the tool's `preview` field, not
  described. Single-select only; the schema forbids `preview` on a multi-select question.

These are requirements on CONTENT, never a template to fill. One that adds nothing at a site is
DROPPED, not padded — four sentences per option bury a decision as surely as one word does, and that
failure is harder to see because every box is ticked.

The **LABEL** stays short and carries the ACTION. The **DESCRIPTION** carries consequence and price.

**This is the whole rule.** A question that confuses a reader for a reason not listed above is a new
problem to solve, not a sixth bullet.

# LANGUAGE
The question and its options are in the user's language. Quoted artifact content — a path, a commit
subject, a spec section, code — stays exactly as it is on disk, untranslated.
