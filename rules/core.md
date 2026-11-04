# CORE

Read before every code change, any language. Stack files add to this, never replace it.

## Scope
- Small fix → read the files involved, nothing more. Feature → the affected modules.
- Match the repo's existing patterns, naming and structure. Never impose a new one.
- Write the minimum. No unrequested features, config options or abstractions.
- Remove imports, variables and functions your change orphaned.
- Refactor touching >3 files, a public signature or a module boundary → ask first.

## Files and comments
- Target 300–500 lines per file, soft cap 700. Split along real seams only.
- A comment says WHY, one line by default. Never restate the code.
- No commented-out code, no changelog comments, no section banners.

## Docs
- Setup, usage or a public API changes → update the README in the same change.
- A removed module or API → remove its docs in the same change.

## Editing
- Edit files with the edit tools, never through the shell (`sed -i`, heredoc, `node -e`).
  Shell edits mangle content and report success on a miss.
- Moving a tracked file → `git mv`.

## Tests
- Project has tests → new behavior and bug fixes get tests. Bug fix: failing test first.
- Never delete or weaken a test to make it pass. Fix the cause.
- Project has no tests → don't invent a test stack.

## Verification
- Run checks with the project's own toolchain (its venv, lockfile, scripts), never a global one.
- A check fails twice → stop. Report the output and your diagnosis. No third guess.

## Hard rules
- **No secrets in source.** Use env vars. Never print a secret's value.
- **New parameter through a call chain** → grep it: every function declares it, every caller passes it.
- **A check guarded on a field's presence never fires when the field is absent.** Test absence.
- **Never return the same value for "failed" and "empty".** Use a result type or throw.
- **A claim about performance or behavior is measured, not reasoned**, before it goes in a
  comment or justifies a fix.
- **Unclear external API** → read the docs for the installed version. Never guess.
