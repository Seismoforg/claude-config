---
name: self-improve
description: Retrospective in two separate modes. MODE 1 runs at the end of a skill workflow and appends ONE observed failure to findings.md as a log entry — it never edits a skill file. MODE 2 runs only when the user asks to look at the findings, at the learnings, or for a retro; it groups the log, and a group of at least two entries becomes one minimal diff proposal for the target skill, confirmed by multiple choice before anything is applied. A log entry needs a failure quotable from the transcript — a failed tool call, retry loop, permission denial, red build, skipped gate, a correction the user had to make, a capability that does not exist, or two skills in conflict.
---

# SELF-IMPROVE

Two modes, kept apart on purpose. MODE 1 runs automatically and only WRITES DOWN what went wrong.
MODE 2 turns a repeated pattern into a rule, and runs only when the user asks for it.

**A rule is never written from a single incident.** That is what the split is for.

# MODE 1 — LOG (automatic, after every task)

Runs at the end of a skill-driven workflow; AFTER THE TASK in `skills/_shared/blocks.md` owns the
trigger. A clean-looking run still gets the scan — failures don't announce themselves.

Scan the transcript against FIX EVIDENCE below.
- **Nothing qualifies** → do nothing, say nothing. Silence is the default.
- **Something qualifies** → append ONE entry to `findings.md`, joined onto this skill's announced
  base directory:
  ```
  ## <YYYY-MM-DD> · <skill or file it points at, or "unclear">
  Symptom: <what went wrong, 1 line>
  Context: <which call, step or situation — file:line where possible>
  Suspected cause: <1 line, a guess — never a rule, never "should do X">
  ```

`findings.md` and `findings-archive.md` sit at this skill's ROOT. They are DATA this skill writes,
not rule prose a model loads, so SKILL LIFECYCLE's `reference/` rule does not reach them and
`check-size` names them outside its word corpus. Both are gitignored — only their empty base ships,
as `findings.template.md` and `findings-archive.template.md` beside them. **Either file missing →
copy its template to that name, then write.** A fresh clone has neither.

Limits on this mode:
- **Never edit a SKILL.md, CLAUDE.md or AGENTS.md here.** It writes `findings.md` and nothing else.
- **Never formulate a rule.** `Suspected cause` is a guess. Wording the fix is MODE 2's job, on
  purpose — a rule drafted while one incident is fresh is a rule fitted to that one incident.
- **One entry per task** is the norm. Several symptoms → log the most important. Genuinely distinct
  causes → one entry each, never a bundled list.
- **A clearly one-off failure gets no entry** — a typo in a prompt, a transient timeout, a
  misunderstanding the user corrected that no skill rule touches. The test: would a SECOND occurrence
  of the SAME pattern say something about a skill rule? No → don't log it.

## FIX EVIDENCE — the log bar
An entry qualifies only if you can QUOTE the transcript moment. Cite the exact call or step.
- **User correction** — the user had to correct something a skill should have gotten right.
- **Failed tool call** — `Edit` old_string not found / not unique; `Read` on missing path; Write-before-Read rejection; `Bash` non-zero exit.
- **Retry loop** — same call ≥2x with mutated args to get it through.
- **Permission denial** — user rejected a call the skill told you to make.
- **Verification failure** — build/typecheck/tests red after a skill-guided change.
- **Gate violation** — approval gate skipped then backed out; folder ≠ status; state-machine drift.
- **Capability error** — skill named a tool/flag/path/field/command that does not exist, or that the actor it instructed cannot reach. A brief telling a read-only agent to run a command is this class, not a judgment call.
- **Rule collision** — two skills gave conflicting instructions; picked arbitrarily.

Bar: the signal must trace to a SKILL defect. Failure the skill's own wording led you into = log it.
Failure from your typo or a transient env issue = noise.

**Subagent `FRICTION:` report** — a dispatched agent closed with a non-`none` FRICTION line. It enters here because an agent cannot run this skill itself (no transcript, no gate, no write), so its report is the only channel it has. Cite the agent + line.
- Maps to a class above → log it; the FRICTION line is its quote.
- Maps to NONE of them — an agent reporting a rule that "misfired" is the usual case — → no entry, but **RELAY it to the user verbatim**, on every run, including one that logs nothing. Agents are told to report broadly and not to filter (`agents/AGENTS.md`, The FRICTION channel); discarding what they send would make that instruction dead. A relayed judgment is not evidence enough to log against a rule, and is far too much to throw away.

## Does NOT count (never manufacture)
- Anything whose evidence is your own inference rather than a quotable moment. This is the whole filter — a class is easy to assert, a quote is not.
- Normal work, no friction.
- One-off project specifics → project docs/memory, not this log.
- Style hunches.
- Tool failure from a typo or transient env issue, not traceable to a skill instruction.

# MODE 2 — REVIEW (only when the user asks)

Trigger: the user asks to look at the findings — "review the self-improve findings", "learnings",
"retro", "how could this skill be better". **NEVER automatically, NEVER as part of MODE 1**, however
full the log is.

1. **Read `findings.md` end to end.**
2. **Group by similarity** — same symptom, same file, same suspected cause.
3. **A group needs at least TWO entries to become a proposal.** A lone entry stays in the log,
   untouched. One incident proves an incident, not a pattern.
4. **One minimal diff per qualifying group.** Never a rule wider than its entries prove. It may
   tighten, extend or DELETE text — whatever the entries actually support.
   - **Check the target skill for a rule that already covers it.** There is one → sharpen that line;
     never append a second rule beside it.
   - GENERAL, never project-specific: no repo names, paths, languages, frameworks, task specifics.
     State the rule, not the anecdote. Name exact target file + section.
   - Write in **`simple-language`** style (invoke the skill): terse, imperative, zero filler — every
     MUST/NEVER preserved. Skill files load into context on activation; tight wording saves tokens.
   - **Grep the rule repo-wide BEFORE the gate** (`grep -rn` a distinctive phrase). Copy count is NOT
     knowable by inspection. Every copy is part of the same edit — a scoped edit leaving a stale copy
     ships a defeated change. Rule states a CONVENTION (path shape, form, naming) → also grep for
     sites that VIOLATE it, and fix those in the same pass, or the rule is fiction.
   - The proposal carries: `file:line` · current text (if any) · proposed text · one-sentence reason ·
     how many findings stand behind it. FINDING SHAPE (`skills/_shared/blocks.md`) owns how it reaches
     the user.
5. **At most 4 proposals per run.** More qualify → NAME the remainder in one line ("3 further groups
   not proposed"). A silently dropped group is indistinguishable from one nobody found.
6. **Confirm via AskUserQuestion (REQUIRED).** Multi-select (`multiSelect: true`), one option per proposal, labelled with target skill + one-line summary. **What this question's descriptions carry is the FINDING** — the transcript evidence behind the proposal, which is the only thing that makes an edit to a skill file judgeable; APPROVAL GATES (`skills/_shared/blocks.md`) owns the rest. Multi-select rules `preview` out. User picks. Never edit a skill file without this. **Exactly ONE proposal → the harness REJECTS a single-option question** (`expected array to have >=2 items`); ask "Apply" / "Don't apply" instead. Under this bar one proposal is the common case, not an edge one.
7. **Apply** only selected, minimal surgical edits, to every copy step 4's grep found. Leave the rest. Before saving: check the new wording doesn't contradict an existing rule.
8. **Move the settled entries to `findings-archive.md`**, each with what became of it — the resulting
   commit or `file:line` for an applied proposal, `rejected <date>` for one the user turned down. Both
   count as settled: an archived rejection is what stops the next review re-proposing it. Entries that
   did not qualify stay in `findings.md`, unchanged.
9. **Report** which skills changed, in one or two lines.

# HARD RULES
- **MODE 1 never edits a skill file.** `findings.md` only.
- **MODE 2 never runs on its own**, not even with a log full of entries.
- **No entry without Symptom, Context AND Suspected cause** — all three, every time.
- **A rule never comes from a single finding.** The threshold is two.
- General, not project-specific — top rule for any proposal. A project "lesson" → project docs/memory, not a skill edit.
- Minimal diffs; match the target skill's structure, tone, headings.
- Keep skills tight — every line loads into context. Concise, unambiguous, no repetition. Shorter-same-meaning always wins.
- **Evidence-based only.** No QUOTED transcript moment → no entry. Never invent weaknesses.
- **At most 4 proposals per review.** Name what you did not propose.
- Multiple-choice approval mandatory before any skill edit.
- Don't touch skills unrelated to the observed weakness.
- No contradictions: a new rule must not clash with an existing one; a rule duplicated across skills stays identical in every copy — fix all or none.
- Unsure a tool/capability/convention exists? Verify with `WebSearch`/`WebFetch` before codifying — never encode an assumption.
- Improving THIS skill goes through the same gate.
- NEVER run this skill forked (`context: fork`, or delegated to a subagent). A forked context has
  no conversation history — the transcript is the whole evidence base for MODE 1, so a forked run
  logs nothing and reports silence as "no weaknesses".
- Shared rules live in `skills/_shared/blocks.md` — its header owns the edit-once rule. Two files cannot point at it and MUST keep an inline copy: agent definitions (a subagent inherits neither blocks.md nor skills) and CLAUDE.md (agents inherit it, so a pointer there strands them). Every copy NAMES the block it comes from — unnamed, a repo-wide grep for the rule misses it. It also declares WHICH KIND it is; the two have opposite upkeep:
  - **MIRROR** — word-identical (CLAUDE.md's LANGUAGE section, every agent's REPO PATTERNS block). A block edit is unfinished until every mirror matches.
  - **FLOOR** — deliberately partial, carrying only what its reader can act on (CLAUDE.md §3's TECHNICAL DEBT and LOCAL RESOURCE RUNS). A block edit checks a floor for CONTRADICTION, never for sameness; never "complete" one into a mirror.
  CLAUDE.md §0 is a floor too, but of the §0 SKILLS, not of a block here — it has no block to name, and the SKILL LIFECYCLE entry below owns it. Do not fold the two rules together. Never move a SITE-LOCAL guard into blocks.md — a one-liner whose whole value is being AT the step it guards (e.g. "subagent → skip this section"). Its reader may be a subagent, which cannot resolve the pointer. Repeated wording is not the same as a shared rule: inline is correct, not a duplicate to dedupe.

# SKILL LIFECYCLE
- New skill added → add one line to README.md's skill list AND to CLAUDE.md's trigger index. Both, same pass, not just one. Workflow/content skill → section 6; output-mode skill (not a workflow, e.g. `simple-language`) → section 0.
- Editing a §0 skill's RULES (`simple-language`, `fableize`) → ask ONE question: must this bind a subagent, which inherits CLAUDE.md but never the skill? No (most rules) → skill only, §0 untouched. Yes → add it to §0 too, same pass. §0 is a FLOOR, not a mirror — it deliberately omits rules a subagent cannot use (e.g. `simple-language`'s "CHAT matches the user's language": a subagent has no user channel, see `agents/AGENTS.md`). Quote the rule's CURRENT words when citing it here; an example anchored to changed wording is invisible to the repo-wide grep this section demands. Never restore the full mirror: no script can diff prose, so "restate every rule" drifts the moment it is written.
- Skill removed or merged into another → `grep -rln "skill-name"` across the whole repo, remove every reference (README, CLAUDE.md, other skills' cross-references), don't leave a dangling pointer.
- Rule whose FIX ROUND was itself withdrawn twice → flag it for DELETION, not a third rewording. Two withdrawn rounds is evidence the rule cannot be stated correctly at that site, not that the wording was unlucky. **Count the withdrawals from the FEATURE RECORDS and the commit log, never from session memory** — this trigger spans sessions by construction, and a transcript cannot see past the current one. Deletion goes through the same AskUserQuestion gate as any other edit.
- New agent added → wire it, or it is dead on arrival. A description alone does NOT get it dispatched: name it in the skill that owns its job, in the step that fans out. Then verify its `tools:` and `skills:` actually carry what its description promises — an agent told to run a check it has no shell for, or to apply a rule no preloaded skill defines, cannot obey its own brief. Grep the agent's name under `skills/` ONLY: no hit there → nothing dispatches it. Skills are the only thing that wires an agent, so a hit anywhere else proves nothing. `check-agents.mjs` scopes its corpus the same way — by ALLOWLIST, never by a list of places to ignore.
- New or edited step/branch in a skill's WORKFLOW → trace EVERY site that says what comes next to it: the activation/entry section, any per-state or per-status table, and prose naming the next step. A site that jumps past it leaves it dead: it reads as active and never runs. Applies to a step you only EDITED too. Grep the step's NUMBER, then READ for the sites that name it in words ("then request approval") — those share no string with your change, so the grep passes and the miss survives exactly there.
- New member added to anything a doc COUNTS — a section of a file format, a check in a runnable list, an option in a set → any prose stating the COUNT ("the 8th section", "the seven above", "run all four") goes stale, and nothing greps for a number. Count nothing: name the members and state their order.
- New addendum file (not a full skill) added under an existing skill → lives in `skills/<name>/reference/`; a check script lives in `skills/<name>/scripts/`. Never at the skill root. Does NOT get its own README/CLAUDE.md entry — only a pointer inside its parent skill's SKILL.md. Pointer style, by consumer — not by taste:
  - **Model reads its OWN skill's file** → skill-relative (`reference/<file>.md`). Skill load announces the skill's base directory — YOU join the pointer onto it; `Read` resolves a bare relative path against CWD (the user's project), not the base dir. This is the convention; match it.
  - **Model reads ANOTHER skill's file** → skills-root-relative (`<skill>/reference/<file>.md`); skills root = the parent of your announced base directory. A bare `reference/` prefix resolves inside YOUR skill dir — wrong file or none.
  - **Path goes into a SHELL command** → the skill-dir placeholder + `/scripts/<file>.mjs` (spelled out live in `documentation` / `coding-standards` SKILL.md — copy it from there). It substitutes to an absolute path on load. A shell inherits the CWD, not the base directory, so a skill-relative path there is a guaranteed ENOENT.
  - **Path handed to a SUBAGENT** → resolve to absolute first. A file you merely HAND announces no base directory at all. A PRELOADED skill may announce one, so a preloaded pointer is worth attempting — hand the absolute regardless.
  - **Enforced in THIS config's own repo**, by a pointer check whose command lives in that repo's README, not here. It resolves every pointer of the first two forms, and the shell form, at exact on-disk case. Elsewhere the forms above are yours to keep by hand.
- Skill/agent frontmatter/config change → may not register in the SAME turn; a later turn often picks it up, a restart is NOT always needed. A not-found error right after writing is not proof it's broken — re-check later before concluding. Probing a field on a live skill can strip tools for the rest of the turn.
  **Frontmatter is YAML, and an unquoted value holding `": "` silently drops the WHOLE block** — the file still loads, its description does not, and nothing reports it; a skill with no description never matches auto-delegation. Same for a trailing `:`, a leading YAML indicator, and a ` #`. Quote the value or reword the colon away. In THIS config's repo a frontmatter check enforces it, run from the check list in that repo's README. Elsewhere it is yours to keep by hand.
- Skill body text is SUBSTITUTED before the model sees it. Placeholders: dollar-sign + ARGUMENTS · dollar-sign + digit · the skill-dir token (dollar-brace CLAUDE_SKILL_DIR). Each is replaced before you read the line, silently corrupting any rule holding one.
  - **EDITING a skill file → read it from DISK first, never from the loaded body.** The body you were given is already substituted, so writing it back replaces every placeholder with one machine's absolute path. Nothing catches it: a pointer check reads `reference/` paths, not shell commands.
  - **USE** one inside a command you want executed → correct; that IS the mechanism.
  - **TEACH** one — any rule ABOUT the token — → it substitutes ITSELF and ships a rule teaching garbage (a price becomes an argument, a skill-dir token becomes one hardcoded absolute path). Name it in prose instead ("the skill-dir placeholder"); never spell it.
  - Grep new text for `\$[0-9]` and for the skill-dir token; every hit that TEACHES rather than USES → rephrase.

See `skills/_shared/blocks.md` for LANGUAGE / APPROVAL GATES.
