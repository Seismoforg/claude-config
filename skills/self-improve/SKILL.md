---
name: self-improve
description: Retrospective mechanism that detects weaknesses in the skills/workflows just used, lists them, and asks via multiple choice whether to codify improvements into the skill files. Runs at the end of a skill-driven workflow when concrete friction occurred OR an observable failure appears in the transcript (failed tool call, retry loop, permission denial, red build, skipped gate), and on demand when the user asks for learnings, a retro, or how a skill could be better. Only surfaces when there is a real, evidence-backed weakness — stays silent otherwise.
---

# SELF-IMPROVE

Turn friction and failures observed this session into general skill-file edits. Only with the
user's multiple-choice approval. Only on a real, observed weakness.

# WHEN TO RUN
- **On demand** — user asks for "learnings", "retro", "how could this skill be better", "self-improve".
- **End of a skill-driven workflow** — when you saw concrete friction OR a failure signal tracing to a skill (see WHAT COUNTS). Other skills point here at their end. A clean-looking run still gets a transcript scan — failures don't announce themselves.
- **Brevity pass** — also scan the just-used skill(s) for bloat/redundancy; propose trims (same approval gate). Tight skills yield nothing → silence.

Hard gate: **no evidence-backed weakness AND no real bloat → do nothing, say nothing.** Silence is default. A prompt needs real evidence.

# WHAT COUNTS (evidence required — cite what happened this session)

## FRICTION SIGNALS (human — user noticed)
- User had to correct something a skill should have gotten right.
- A skill instruction misfired, was wrong, or conflicted with reality.
- A gap forced you to improvise a decision the skill should cover.
- Same friction recurred, or a foreseeable case wasn't handled.
- A rule produced a worse outcome than ignoring it would have.

## FAILURE SIGNALS (observable — scan the transcript, don't wait for a complaint)
These fire with no user input. Evidence is already in the transcript — cite the exact call/step.
- **Failed tool call** — `Edit` old_string not found / not unique; `Read` on missing path; Write-before-Read rejection; `Bash` non-zero exit.
- **Retry loop** — same call ≥2x with mutated args to get it through.
- **Permission denial** — user rejected a call the skill told you to make.
- **Verification failure** — build/typecheck/tests red after a skill-guided change.
- **Gate violation** — approval gate skipped then backed out; folder ≠ status; state-machine drift.
- **Capability error** — skill named a tool/flag/path/field/command that does not exist.
- **Ambiguity stall** — had to ask the user what the skill should have predetermined.
- **Rule collision** — two skills gave conflicting instructions; picked arbitrarily.
- **Context waste** — loaded a large skill/reference a change never needed.
- **Subagent FRICTION report** — a dispatched agent closed with a non-`none` FRICTION line (tool it lacked, rule it could not apply, rule that misfired). Already evidence; cite the agent + line. An agent cannot run this skill itself (no transcript, no gate, no write), so its report is the only channel — dropping it loses the finding.

Bar for both lists: the signal must trace to a SKILL defect. Failure the skill's own wording led
you into = finding. Failure from your typo or a transient env issue = noise.

Does NOT count (never manufacture):
- Normal work, no friction.
- One-off project specifics → project docs/memory, not a skill.
- Style hunches.
- Anything you can't tie to a concrete session moment.
- Tool failure from a typo or transient env issue, not traceable to a skill instruction.

# HOW IT WORKS
1. **Detect.** Scan the session transcript against BOTH signal lists (failure signals are mechanical — check them, don't rely on memory of the run feeling fine). None meets the bar → stop (say "no skill weaknesses observed" only if user asked).
2. **Draft — GENERAL, never project-specific.** Smallest edit that fixes it, holds in ANY project:
   - No repo names, paths, languages, frameworks, task specifics.
   - State the rule, not the anecdote.
   - Minimal diff; extend an existing section; don't duplicate an implied rule.
   - Lean: when an edit obsoletes wording, cut it same pass. Net-neutral or shorter, never bloat.
   - Write in **`simple-language`** style (invoke the skill): terse, imperative, zero filler — every MUST/NEVER preserved. Skill files load into context on activation; tight wording saves tokens.
   - Name exact target file + section.
   - Grep the rule repo-wide BEFORE the gate (`grep -rn` a distinctive phrase). Copy count is NOT knowable by inspection. Every copy is part of the same edit — a scoped edit leaving a stale copy ships a defeated change.
   - Rule states a CONVENTION (path shape, form, naming) → also grep for sites that VIOLATE it, not just copies of it. A convention with existing violators ships already-defeated; the same commit that writes the rule can break it. Fix the violators in that pass, or the rule is fiction.
3. **Confirm via AskUserQuestion (REQUIRED).** Multi-select (`multiSelect: true`), one option per improvement, labelled with target skill + one-line summary; description holds before/after wording. User picks. Never edit a skill file without this.
4. **Apply** only selected, minimal surgical edits, to every copy step 2's grep found. Leave the rest. Before saving: check the new wording doesn't contradict an existing rule.
5. **Report** which skills changed, in one or two lines.

# HARD RULES
- General, not project-specific — top rule. A project "lesson" → project docs/memory, not a skill edit.
- Minimal diffs; match the target skill's structure, tone, headings.
- Keep skills tight — every line loads into context. Concise, unambiguous, no repetition. Shorter-same-meaning always wins; net-longer needs justification.
- Evidence-based only; never invent weaknesses.
- Multiple-choice approval mandatory before any skill edit.
- Don't touch skills unrelated to the observed weakness.
- No contradictions: a new rule must not clash with an existing one; a rule duplicated across skills stays identical in every copy — fix all or none.
- Unsure a tool/capability/convention exists? Verify with `WebSearch`/`WebFetch` before codifying — never encode an assumption.
- Improving THIS skill goes through the same gate.
- NEVER run this skill forked (`context: fork`, or delegated to a subagent). A forked context has
  no conversation history — the session transcript IS the evidence base, so a forked run detects
  nothing and reports silence as "no weaknesses".
- Shared rules live in `skills/_shared/blocks.md` — its header owns the edit-once rule. Two files cannot point at it and MUST keep an inline copy: agent definitions (a subagent inherits neither blocks.md nor skills) and CLAUDE.md (agents inherit it, so a pointer there strands them). Copy stays word-identical to the block; a block edit is unfinished until every copy matches. Never move a SITE-LOCAL guard there — a one-liner whose whole value is being AT the step it guards (e.g. "subagent → skip this section"). Its reader may be a subagent, which cannot resolve the pointer, so it strands the exact reader it targets. Repeated wording is not the same as a shared rule: inline is correct, not a duplicate to dedupe.

# SKILL LIFECYCLE
- New skill added → add one line to README.md's skill list AND to CLAUDE.md's trigger index. Both, same pass, not just one. Workflow/content skill → section 6; output-mode skill (not a workflow, e.g. `simple-language`) → section 0.
- Editing `simple-language`'s RULES → ask ONE question: must this bind a subagent, which inherits CLAUDE.md but never the skill? No (most rules) → skill only, §0 untouched. Yes → add it to §0 too, same pass. §0 is a FLOOR, not a mirror — it deliberately omits rules a subagent cannot use (e.g. "match the user's language": a subagent has no user channel, see README). A mirror was tried and failed inside one pass: no script can diff prose, so "restate every rule" drifts the moment it is written. Don't restore it.
- Skill removed or merged into another → `grep -rln "skill-name"` across the whole repo, remove every reference (README, CLAUDE.md, other skills' cross-references), don't leave a dangling pointer.
- New agent added → wire it, or it is dead on arrival. A description alone does NOT get it dispatched: name it in the skill that owns its job, in the step that fans out. Then verify its `tools:` and `skills:` actually carry what its description promises — an agent told to run a check it has no shell for, or to apply a rule no preloaded skill defines, cannot obey its own brief. Grep agent names repo-wide: nothing outside its own file and the README → nothing dispatches it.
- New addendum file (not a full skill) added under an existing skill → lives in `skills/<name>/reference/`; a check script lives in `skills/<name>/scripts/`. Never at the skill root. Does NOT get its own README/CLAUDE.md entry — only a pointer inside its parent skill's SKILL.md. Pointer style, by consumer — not by taste:
  - **Model reads its OWN skill's file** → skill-relative (`reference/<file>.md`). Skill load announces the skill's base directory — YOU join the pointer onto it; `Read` resolves a bare relative path against CWD (the user's project), not the base dir. This is the convention; match it.
  - **Model reads ANOTHER skill's file** → skills-root-relative (`<skill>/reference/<file>.md`); skills root = the parent of your announced base directory. A bare `reference/` prefix resolves inside YOUR skill dir — wrong file or none.
  - **Path goes into a SHELL command** → the skill-dir placeholder + `/scripts/<file>.mjs` (spelled out live in `documentation` / `taste` SKILL.md — copy it from there). It substitutes to an absolute path on load. A shell inherits the CWD, not the base directory, and CWD is the user's project — a skill-relative path there is a guaranteed ENOENT.
  - **Path handed to a SUBAGENT** → resolve to absolute first. A subagent gets neither the base directory nor your CWD.
- Skill/agent frontmatter/config change → may not register in the SAME turn; a later turn often picks it up, a restart is NOT always needed. A not-found error right after writing is not proof it's broken — re-check later before concluding. Probing a field on a live skill can strip tools for the rest of the turn.
- Skill body text is SUBSTITUTED before the model sees it. Placeholders: dollar-sign + ARGUMENTS · dollar-sign + digit · the skill-dir token (dollar-brace CLAUDE_SKILL_DIR). Each is replaced before you read the line, silently corrupting any rule holding one (prices, regex, shell vars, paths).
  - **USE** one inside a command you want executed → correct; that IS the mechanism.
  - **TEACH** one — any rule ABOUT the token — → it substitutes ITSELF and ships a rule teaching garbage (a price becomes an argument, a skill-dir token becomes one hardcoded absolute path). Name it in prose instead ("the skill-dir placeholder"); never spell it.
  - Grep new text for `\$[0-9]` and for the skill-dir token; every hit that TEACHES rather than USES → rephrase.
