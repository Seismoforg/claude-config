# Results — git-commit cut, 20260804

66 runs, one subagent each. 0 unscorable, 0 incomplete. Every row is a measurement.

| | Words | |
|---|---|---|
| FULL | 5,577 | today's `skills/git-commit/SKILL.md` |
| CUT | 5,120 | **8.2% removed** |

Coverage clean: 4 changed hunks, each carrying ≥2 questions · 9 frozen anchors resolve · the land
list still counts 7 steps.

# The matrix

| Q | Section | NONE | CUT | FULL | Verdict |
|---|---|:--:|:--:|:--:|---|
| Q01 | THE PR TRIGGER | ok | ok | ok | DELETE |
| Q02 | STEP 1 | no | ok | ok | KEEP THE CUT |
| Q03 | STEP 1 | ok | ok | ok | DELETE |
| Q04 | STEP 1 | ok | ok | ok | DELETE |
| Q05 | STEP 1 | ok | ok | ok | DELETE — **calibration, carries no information about the file** |
| Q06 | STEP 2 | ok | ok | ok | DELETE |
| Q07 | STEP 2 | ok | ok | ok | DELETE |
| Q08 | STEP 3 | ok | ok | ok | DELETE |
| Q09 | STEP 3 | no | ok | ok | KEEP THE CUT — **spelling, see below** |
| Q10 | STEP 3 | no | ok | ok | KEEP THE CUT |
| Q11 | STEP 4 | no | ok | ok | KEEP THE CUT — **spelling, see below** |
| Q12 | STEP 4 | ok | ok | ok | DELETE |
| Q13 | STEP 4 | no | ok | ok | KEEP THE CUT |
| Q14 | STEP 4 | ok | ok | ok | DELETE |
| Q15 | STEP 4 | ok | ok | ok | DELETE |
| Q16 | STEP 4 | ok | ok | ok | DELETE |
| Q17 | STEP 5 | ok | ok | ok | DELETE |
| Q18 | STEP 5 | ok | ok | ok | DELETE |
| Q19 | STEP 6 | ok | ok | ok | DELETE |
| Q20 | HARD RULES | ok | ok | ok | DELETE — **confounded, see below** |
| Q21 | STEP 3 | ok | ok | ok | DELETE |
| Q22 | HARD RULES | no | ok | ok | KEEP THE CUT — **spelling, see below** |

**RESTORE: none. Over-compressed: none. Defects: none.**

# What this establishes

**The 8.2% cut costs nothing.** CUT scored 22 of 22, identical to FULL. No removed sentence was
load-bearing for any rule the suite tests. It ships.

**16 rows say the model was right with no skill text at all.** That is the finding worth arguing
about, and it needs three caveats before anyone acts on it.

## Caveat 1 — three "misses" are spelling, not behaviour
Q09, Q11 and Q22 differ from the expected string in ways that do not change what happens:

| Q | NONE answered | Expected | Difference |
|---|---|---|---|
| Q09 | `--git-common-dir --git-dir` | `--git-dir --git-common-dir` | two flags in the other order |
| Q11 | `git checkout -b feature/feature-flags` | `git switch -c feature/feature-flags` | equivalent command; the slug — the actual trap — was right |
| Q22 | `git push --force-with-lease origin feature/rebase-cleanup` | `git push --force-with-lease` | explicit remote and refspec; the flag — the actual rule — was right |

Scored as misses under the pre-committed mechanical rule and **not adjusted by hand**. Read
behaviourally, the DELETE count is 19 of 22, not 16.

**The methodological point outlives this experiment:** a `command`-form question conflates "knows the
rule" with "spells the command the file's way". Only Q02, Q10 and Q13 are misses where the model
would have DONE the wrong thing.

## Caveat 2 — Q20 measures redundancy, not knowledge
`CLAUDE.md:146-149` carries the `Co-Authored-By` ban verbatim, and a subagent inherits that file. Its
✓✓✓ says this file's copy is redundant with an always-on one — still a reason to delete, but a
different reason, and the per-rule gate must be told which.

## Caveat 3 — Q05 is the control
Its ✓✓✓ is by construction. It validates the harness and says nothing about `git-commit`.

Genuine "the model knew it anyway" rows: **14**, once Q05 and Q20 are set aside.

## Caveat 4 — the limit nobody should read past
A ✓✓✓ row means the model answered **that one scenario** correctly without the file. It does not mean
the rule never matters. One question per rule is a sample, not a proof, and 22 questions cover 4 of
this file's changed regions, not all of it.

# The cap
A later rule addition raises `check-size`'s cap for this file. It is never paid for by deleting a
row this suite recorded as measured-and-kept. The corpus TOTAL is what bounds growth.

# Not done here
Every DELETE row still needs its three repeat runs and its own per-rule approval before any rule
leaves the file. Nothing in this document has been applied beyond the 8.2% cut itself.
