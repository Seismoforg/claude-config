# BACKEND

Load when writing server-side code, APIs, or scheduled work. Adds to `core.md`.

# LAYERING
Controllers → Services → Repositories → Domain Models.

**No business logic in controllers or UI.** It belongs in services and domain models. This is a hard
rule and no repo pattern overrides it.

# API CONVENTIONS
For anything consumed externally:
- One consistent error response shape.
- Pick one versioning strategy (URL or header) and stay with it.
- Pick one pagination pattern (cursor or offset) and stay with it.
- Mutating endpoints are idempotent.

# SCHEDULED AND POLLED WORK
Cron jobs, timers, queue pollers must not overlap themselves. Guard them: a concurrency limit, a
lock, or a lease.

Check WHEN the "handled" marker becomes visible to other runs. State persisted only at run end is
invisible to runs already in flight, so it guards nothing.
