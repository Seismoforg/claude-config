# offload-summarize — compact once, then work from the note

For any input too big to keep re-reading (long file, log, doc, thread): summarize it into a note
file ONCE, then work only from the note.

## Where

The session scratchpad directory announced at session start — it is outside the user's project, so
a note can never pollute the repo or get committed by accident. Never the project's `docs/`. One
note per source. Name: `note-<source-slug>.md`.

## Note template

```markdown
# note: <source name>
source: <path or URL>            # so the original is one click away
created: <date>

## Facts
- <one fact per bullet, each with its pointer: file:line / section / timestamp>
- <5–15 bullets. Need more? The source needs TWO notes with narrower scopes.>

## Open
- <what the source did NOT answer — so you don't re-read it hoping>
```

## Rules

1. Facts only — no interpretation in the note. Interpretation happens in the reply.
2. Every bullet carries its pointer. A fact without a pointer cannot be re-checked.
3. Once the note exists: never re-read the original front to back. Re-open it only at a specific
   pointer, only when a detail is needed.
4. A value or fact needed twice goes into the note the second time it comes up.
5. The note is disposable working memory. Never cite it as a source — cite the original via the
   pointer.

## Example

A 4000-line log → a note with the source path, 8 bullets ("first ERROR at line 2841: connection
refused to :5432", …), and one Open entry ("no timestamp for the first retry"). All further
reasoning uses the 8 bullets; line 2841 is re-opened only if the exact stack trace is needed.
