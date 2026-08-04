---
name: self-improve
description: Retrospective that turns observed failures into skill-file edits, and proposes deletions of text that no longer earns its place. Runs at the end of a skill-driven workflow, and on demand when the user asks for learnings, a retro, or how a skill could be better. A FIX needs a failure quotable from the transcript — a failed tool call, retry loop, permission denial, red build, skipped gate, a correction the user had to make, a capability that does not exist, or two skills in conflict. A CUT needs no failure, only text that is dead, duplicated, contradicted, mere justification, or a rule already withdrawn twice. Every addition names what it removes. At most 4 proposals per run, each confirmed by multiple choice.
---

# SELF-IMPROVE

Turn failures observed this session into general skill-file edits, and cut text that no longer earns
its place. Only with the user's multiple-choice approval. Only on evidence you can quote.

# WHEN TO RUN
- **On demand** — user asks for "learnings", "retro", "how could this skill be better", "self-improve".
- **End of a skill-driven workflow** — scan the transcript against FIX EVIDENCE. Other skills point here at their end. A clean-looking run still gets the scan — failures don't announce themselves.
- **Cut pass — every run.** Scan against CUT EVIDENCE. Corpus: the skills used in this run PLUS their `reference/` files, loaded this run or not — unread addenda are where text piles up. Never the whole repo; reading every rule file on every run is the context waste this pass exists to prevent.

Hard gate: **nothing meets a bar → do nothing, say nothing.** Silence is the default for fixes and cuts alike. ONE exception: a subagent FRICTION report that matched no class is still RELAYED (step 6), even on a run that proposes nothing. Relaying is not proposing.

# WHAT COUNTS

## FIX EVIDENCE — every class observable
A finding qualifies only if you can QUOTE the transcript moment. Cite the exact call or step.
- **User correction** — the user had to correct something a skill should have gotten right.
- **Failed tool call** — `Edit` old_string not found / not unique; `Read` on missing path; Write-before-Read rejection; `Bash` non-zero exit.
- **Retry loop** — same call ≥2x with mutated args to get it through.
- **Permission denial** — user rejected a call the skill told you to make.
- **Verification failure** — build/typecheck/tests red after a skill-guided change.
- **Gate violation** — approval gate skipped then backed out; folder ≠ status; state-machine drift.
- **Capability error** — skill named a tool/flag/path/field/command that does not exist, or that the actor it instructed cannot reach. A brief telling a read-only agent to run a command is this class, not a judgment call.
- **Rule collision** — two skills gave conflicting instructions; picked arbitrarily.

**Subagent `FRICTION:` report** — a dispatched agent closed with a non-`none` FRICTION line. It enters here because an agent cannot run this skill itself (no transcript, no gate, no write), so its report is the only channel it has. Cite the agent + line.
- Maps to a class above → an ordinary finding; the FRICTION line is its quote.
- Maps to NONE of them — an agent reporting a rule that "misfired" is the usual case — → it becomes no proposal, but it is **RELAYED to the user verbatim at step 6**, on every run, including one that proposes nothing. Agents are told to report broadly and not to filter (`agents/AGENTS.md`, The FRICTION channel); discarding what they send would make that instruction dead. A relayed judgment is not evidence enough to edit a rule, and is far too much to throw away.

Bar: the signal must trace to a SKILL defect. Failure the skill's own wording led you into = finding.
Failure from your typo or a transient env issue = noise.

## CUT EVIDENCE — no failure needed
Text qualifies for deletion when it:
- names a path, file, command, flag or field that does not exist
- contradicts another rule — name both
- duplicates text elsewhere — name the other site
- restates, in other words, a rule already stated in the same file
- is justification, counter-example, provenance ("measured <date>", "verified <date>"), or commentary ABOUT the text rather than an instruction to its reader
- is a rule whose FIX ROUND was itself withdrawn twice. Two withdrawn rounds is evidence the rule cannot be stated correctly at that site, not that the wording was unlucky. **Count the withdrawals from the FEATURE RECORDS and the commit log, never from session memory** — this trigger spans sessions by construction, and a transcript cannot see past the current one. It is the one signal here you go looking for on disk.

## Does NOT count (never manufacture)
- Anything whose evidence is your own inference rather than a quotable moment or a listed cut kind. This is the whole filter — a class is easy to assert, a quote is not.
- Normal work, no friction.
- One-off project specifics → project docs/memory, not a skill.
- Style hunches.
- Tool failure from a typo or transient env issue, not traceable to a skill instruction.

# HOW IT WORKS
1. **Detect.** Scan the transcript against FIX EVIDENCE (mechanical — check the classes, don't rely on the run feeling fine), and the cut corpus against CUT EVIDENCE. Nothing meets a bar → stop (say "no skill weaknesses observed" only if user asked).
2. **Draft — GENERAL, never project-specific.** Smallest edit that fixes it, holds in ANY project:
   - No repo names, paths, languages, frameworks, task specifics.
   - State the rule, not the anecdote.
   - Minimal diff; extend an existing section; don't duplicate an implied rule.
   - **Net-zero budget — every addition NAMES the lines it removes to pay for itself.** No candidate found → the proposal still reaches the gate, labelled `grows net by N lines`. Growth stays possible; it never happens silently.
   - Write in **`simple-language`** style (invoke the skill): terse, imperative, zero filler — every MUST/NEVER preserved. Skill files load into context on activation; tight wording saves tokens.
   - Name exact target file + section.
   - Grep the rule repo-wide BEFORE the gate (`grep -rn` a distinctive phrase). Copy count is NOT knowable by inspection. Every copy is part of the same edit — a scoped edit leaving a stale copy ships a defeated change.
   - Rule states a CONVENTION (path shape, form, naming) → also grep for sites that VIOLATE it, not just copies of it. A convention with existing violators ships already-defeated; the same commit that writes the rule can break it. Fix the violators in that pass, or the rule is fiction.
3. **Rank, then write each proposal.**
   - **At most 4 per run**, fixes and cuts together. More qualify → NAME the remainder in one line ("3 further findings not proposed"). A silently dropped finding is indistinguishable from one nobody found.
   - **A FIX always outranks a CUT.** A cut never displaces a fix, whatever its apparent severity. A cut has several evidence kinds open to it against a fix's single quoted moment, so one shared ranking sorts the cheap findings to the top and pushes the real defect into the remainder.
   - **Rejected this session → not re-proposed this session.** Across sessions it may return; nothing on disk persists the rejection.
   - Write each proposal as a FOUR-LINE FINDING (`skills/_shared/blocks.md`). A cut proposal quotes the text being cut.
4. **Confirm via AskUserQuestion (REQUIRED).** Multi-select (`multiSelect: true`), one option per proposal, labelled with target skill + one-line summary; description holds the four lines. User picks. Never edit a skill file without this. **Exactly ONE proposal → the harness REJECTS a single-option question** (`expected array to have >=2 items`); ask "Apply" / "Don't apply" instead. Under this bar one proposal is the common case, not an edge one.
5. **Apply** only selected, minimal surgical edits, to every copy step 2's grep found. Leave the rest. Before saving: check the new wording doesn't contradict an existing rule.
6. **Report** which skills changed, in one or two lines. Then RELAY, verbatim, every subagent FRICTION report that matched no FIX EVIDENCE class — always, including on a run that proposed nothing and on one that was stopped at step 1.

# HARD RULES
- General, not project-specific — top rule. A project "lesson" → project docs/memory, not a skill edit.
- Minimal diffs; match the target skill's structure, tone, headings.
- Keep skills tight — every line loads into context. Concise, unambiguous, no repetition. Shorter-same-meaning always wins; every addition names what it removes, and net growth is a labelled decision, never a side effect.
- **Evidence-based only.** A fix needs a QUOTED transcript moment; a cut needs a listed CUT EVIDENCE kind. No quote and no kind → no finding. Never invent weaknesses.
- **At most 4 proposals per run, and a fix always outranks a cut.** Name what you did not propose.
- Multiple-choice approval mandatory before any skill edit.
- Don't touch skills unrelated to the observed weakness.
- No contradictions: a new rule must not clash with an existing one; a rule duplicated across skills stays identical in every copy — fix all or none.
- Unsure a tool/capability/convention exists? Verify with `WebSearch`/`WebFetch` before codifying — never encode an assumption.
- Improving THIS skill goes through the same gate.
- NEVER run this skill forked (`context: fork`, or delegated to a subagent). A forked context has
  no conversation history — the transcript is the whole evidence base for FIX EVIDENCE, so a forked
  run finds no fix and reports silence as "no weaknesses". It could still cut, which is worse: a run
  that only ever deletes, having seen none of what the deleted text was there to prevent.
- Shared rules live in `skills/_shared/blocks.md` — its header owns the edit-once rule. Two files cannot point at it and MUST keep an inline copy: agent definitions (a subagent inherits neither blocks.md nor skills) and CLAUDE.md (agents inherit it, so a pointer there strands them). Every copy NAMES the block it comes from — unnamed, nothing links the two and a repo-wide grep for the rule misses the copy entirely. It also declares WHICH KIND it is, because the two have opposite upkeep and treating one as the other is how this rule misfires:
  - **MIRROR** — word-identical (CLAUDE.md's LANGUAGE section, every agent's REPO PATTERNS block). A block edit is unfinished until every mirror matches.
  - **FLOOR** — deliberately partial, carrying only what its reader can act on (CLAUDE.md §3's TECHNICAL DEBT and LOCAL RESOURCE RUNS). A block edit checks a floor for CONTRADICTION, never for sameness; never "complete" one into a mirror.
  CLAUDE.md §0 is a floor too, but of the §0 SKILLS, not of a block here — it has no block to name, and the SKILL LIFECYCLE entry below owns it. Same shape, different source; do not fold the two rules together. Never move a SITE-LOCAL guard there — a one-liner whose whole value is being AT the step it guards (e.g. "subagent → skip this section"). Its reader may be a subagent, which cannot resolve the pointer, so it strands the exact reader it targets. Repeated wording is not the same as a shared rule: inline is correct, not a duplicate to dedupe.

# SKILL LIFECYCLE
- New skill added → add one line to README.md's skill list AND to CLAUDE.md's trigger index. Both, same pass, not just one. Workflow/content skill → section 6; output-mode skill (not a workflow, e.g. `simple-language`) → section 0.
- Editing a §0 skill's RULES (`simple-language`, `fableize`) → ask ONE question: must this bind a subagent, which inherits CLAUDE.md but never the skill? No (most rules) → skill only, §0 untouched. Yes → add it to §0 too, same pass. §0 is a FLOOR, not a mirror — it deliberately omits rules a subagent cannot use (e.g. `simple-language`'s "CHAT matches the user's language": a subagent has no user channel, see `agents/AGENTS.md`). Quote the rule's CURRENT words when citing it here: an example anchored to wording that has since changed is invisible to the repo-wide grep this section demands. A mirror was tried and failed inside one pass: no script can diff prose, so "restate every rule" drifts the moment it is written. Don't restore it.
- Skill removed or merged into another → `grep -rln "skill-name"` across the whole repo, remove every reference (README, CLAUDE.md, other skills' cross-references), don't leave a dangling pointer.
- Rule whose FIX ROUND was itself withdrawn twice → flag it for DELETION, not a third rewording. CUT EVIDENCE owns it, last kind; it is not restated here. Deletion goes through the same AskUserQuestion gate as any other edit.
- New agent added → wire it, or it is dead on arrival. A description alone does NOT get it dispatched: name it in the skill that owns its job, in the step that fans out. Then verify its `tools:` and `skills:` actually carry what its description promises — an agent told to run a check it has no shell for, or to apply a rule no preloaded skill defines, cannot obey its own brief. Grep the agent's name under `skills/` ONLY: no hit there → nothing dispatches it. Skills are the only thing that wires an agent, so a hit anywhere else proves nothing — `agents/` is the definition, README lists the roster, `docs/` records decisions, `features/` records past work, and the generated build mirrors `agents/` by source path. `check-agents.mjs` scopes its corpus the same way, and for the same reason: as a list of places to IGNORE it was defeated twice, by two different directories.
- New or edited step/branch in a skill's WORKFLOW → trace EVERY site that says what comes next to it: the activation/entry section, any per-state or per-status table, and prose naming the next step. A site that jumps past it leaves it dead: it reads as active, never runs, and every rule inside it is fiction. Applies to a step you only EDITED too — a site may have routed around it from the start. Grep the step's NUMBER, then READ for the sites that name it in words ("then request approval") — those share no string with your change, so the grep passes and the miss survives exactly there.
- New member added to anything a doc COUNTS — a section of a file format, a check in a runnable list, an option in a set → any prose stating the COUNT ("the 8th section", "the seven above", "run all four") goes stale, and nothing greps for a number. Count nothing: name the members and state their order. A count survives one addition and breaks on the next.
- New addendum file (not a full skill) added under an existing skill → lives in `skills/<name>/reference/`; a check script lives in `skills/<name>/scripts/`. Never at the skill root. Does NOT get its own README/CLAUDE.md entry — only a pointer inside its parent skill's SKILL.md. Pointer style, by consumer — not by taste:
  - **Model reads its OWN skill's file** → skill-relative (`reference/<file>.md`). Skill load announces the skill's base directory — YOU join the pointer onto it; `Read` resolves a bare relative path against CWD (the user's project), not the base dir. This is the convention; match it.
  - **Model reads ANOTHER skill's file** → skills-root-relative (`<skill>/reference/<file>.md`); skills root = the parent of your announced base directory. A bare `reference/` prefix resolves inside YOUR skill dir — wrong file or none.
  - **Path goes into a SHELL command** → the skill-dir placeholder + `/scripts/<file>.mjs` (spelled out live in `documentation` / `coding-standards` SKILL.md — copy it from there). It substitutes to an absolute path on load. A shell inherits the CWD, not the base directory, and CWD is the user's project — a skill-relative path there is a guaranteed ENOENT.
  - **Path handed to a SUBAGENT** → resolve to absolute first. It gets your CWD for nothing, and for a file you merely HAND it there is no announced base directory at all. (OBSERVED once, 20260803: a subagent DID get `Base directory for this skill:` for a skill it PRELOADS, with the skill-dir placeholder inside that body already substituted. One run against a generative target, so treat it as a lead, not a rule — and hand the absolute regardless: unambiguous, free, and the only option for a handed file.)
  - **Enforced in THIS config's own repo**, by a pointer check whose command lives in that repo's README — not spelled here, because this skill runs in every project and a repo-root path would be a guaranteed ENOENT in all of them. It resolves every pointer of the first two forms, and the shell form, at exact on-disk case. Elsewhere, the four forms above are yours to keep by hand.
- Skill/agent frontmatter/config change → may not register in the SAME turn; a later turn often picks it up, a restart is NOT always needed. A not-found error right after writing is not proof it's broken — re-check later before concluding. Probing a field on a live skill can strip tools for the rest of the turn.
  **Frontmatter is YAML, and an unquoted value holding `": "` silently drops the WHOLE block** — the file still loads, its description does not, and nothing reports it; a skill with no description never matches auto-delegation. Same for a trailing `:`, a leading YAML indicator, and a ` #`. Quote the value or reword the colon away. In THIS config's repo a frontmatter check enforces it, run from the check list in that repo's README — not spelled here, because this skill runs in every project and a repo-root path would be a guaranteed ENOENT in all of them. Elsewhere it is yours to keep by hand.
- Skill body text is SUBSTITUTED before the model sees it. Placeholders: dollar-sign + ARGUMENTS · dollar-sign + digit · the skill-dir token (dollar-brace CLAUDE_SKILL_DIR). Each is replaced before you read the line, silently corrupting any rule holding one (prices, regex, shell vars, paths).
  - **USE** one inside a command you want executed → correct; that IS the mechanism.
  - **TEACH** one — any rule ABOUT the token — → it substitutes ITSELF and ships a rule teaching garbage (a price becomes an argument, a skill-dir token becomes one hardcoded absolute path). Name it in prose instead ("the skill-dir placeholder"); never spell it.
  - Grep new text for `\$[0-9]` and for the skill-dir token; every hit that TEACHES rather than USES → rephrase.

See `skills/_shared/blocks.md` for LANGUAGE / APPROVAL GATES.
