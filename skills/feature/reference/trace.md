# FRESH-MODEL TRACE

Validating PROSE a model executes — a skill, workflow, rule file or prompt. Loaded by `feature`
step 6, which owns the trigger.

**A trace briefed without the BAR and the CORPUS below is INVALID: discard its findings.**

# THE BAR — three categories, nothing else
A defect is exactly one of these, cited `file:line`:

1. **Reachability** — a rule, branch or step that can never execute. Offered but unreachable · routed
   past · naming a step, section or list that does not exist · a direction word pointing the wrong way.
2. **Coherence** — two statements that cannot both be obeyed, AND a run that behaves wrong because of
   it. Quote both statements and name the run: which instruction is followed, which branch is taken,
   what the executor does that it should not. Statements that disagree while every run behaves
   identically are NOT a defect. Category 1 is exempt from this test — a rule that never executes IS
   a run behaving wrong.
3. **Convention** — the text violates a rule the repo itself states. Cite `file:line` for BOTH the
   rule and the violation. **Only MECHANICAL rules qualify**: the rule names a forbidden or required
   token, shape or count, so the violation is decidable by LOOKING. Style rules — `terse`,
   `no filler`, `plain`, `minimal diff` — are NOT citable here; they fit almost any sentence.

## Not defects — named so a tracer cannot reach for them
- a description, summary or frontmatter clause narrower or wider than the body, where nothing routes
  off the description
- wording that "could" mislead a reader who has not read the surrounding rule
- a count, an ordering or a label that no rule reads
- style, clarity, "consider adding", or whether a design decision is wise

## CLEAN is the expected result
State that in the brief. Reporting nothing is a success.

## A finding can be HALF right — split it
Accept the part the evidence shows, reject the rest, and say which half you rejected.

# THE CORPUS
This change's own diff, plus every file the spec's `# Impact Analysis` names. Wider only by saying so
and why.

# THE BRIEF
Carries BAR and CORPUS, plus:
- **At most 4 findings per round**, ranked by how wrong the behaviour is. More qualify → NAME the
  remainder; never drop one silently.
- **Every finding rejected in an earlier round, WITH THE REASON.** Agents are fresh each round and
  know nothing of each other. The reason is carried, not just the verdict — the agent may argue the
  rejection was wrong.
- **Tools the brief names must exist for that agent.** A brief saying "run this command", handed to a
  read-only agent, traces something else instead.

# ROUNDS
Ask the user for the ROUNDS, not one pass. Delegation unavailable (harness or policy forbids
unrequested agents) → say so and ask for authorization.

A trace that finds defects produces a FIX round, and those fixes are untraced prose: re-trace them,
or record them as unverified. "The trace ran" is not "the shipped text was traced".

**Never substitute your own re-read and report it validated.**

Convergence — two consecutive rounds finding only defects inside the preceding round's diff — is
`feature` step 6's blast-radius rule, not this file's.

# REPORTING TO THE USER
FOUR-LINE FINDING in `skills/_shared/blocks.md`. The agent returns the facts; the main loop presents
them in that shape.
