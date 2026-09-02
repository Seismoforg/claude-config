# REACT / FRONTEND STRUCTURE

Load when building or editing React components. Adds to `core.md` and `typescript.md`. The user
EXPERIENCE half — responsive, accessibility, performance, motion — is `web.md`; read it alongside
for anything user-facing.

# COMPONENT LAYOUT
Greenfield default is Atomic Design:
```text
/components/atoms
/components/molecules
/components/organisms
/components/templates
/components/pages
```

The project already organizes UI differently (feature folders, route groups) → follow THAT.

A component's tier is the highest tier it composes. A wrapper that composes an organism IS an
organism — never demote it to molecule, that inverts the dependency.

# COMPONENTS
- One component per file, named after the file.
- Props typed at the boundary. No `any` on a public prop.
- A component that both fetches and renders is two components. Split the data edge from the view
  once it grows past trivial.
- Derived values are computed during render, not stored in state. State that mirrors a prop drifts.

# HOOKS
- Extract a hook when the same stateful logic appears twice, not before.
- Every effect declares its full dependency list. A dependency deliberately omitted carries a
  one-line comment saying why.
- An effect that only derives a value does not need to be an effect.
- Cleanup is part of the effect: subscriptions, timers, aborts.

# STATE
- Keep state as local as the component that reads it. Lift only when a second reader appears.
- Server data belongs in whatever the project already uses for it (query cache, store, loader) — do
  not introduce a second mechanism.
- Never store a rendered string in state when the raw value plus a format call would do.
