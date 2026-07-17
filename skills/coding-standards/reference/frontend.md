# FRONTEND / TS-JS SPECIFICS

Load when building or editing frontend / TS-JS code. Not applicable to non-frontend
work (Python, scripts, backend-only, ML).

# FRONTEND ARCHITECTURE
> Web/frontend UI work also triggers `web-standards` (invoke it alongside). This
> section = code STRUCTURE; web-standards = EXPERIENCE.

Greenfield default = Atomic Design:
```text
/components/atoms
/components/molecules
/components/organisms
/components/templates
/components/pages
```
Project already organizes UI differently (feature-folders, route groups) → follow THAT.
Tier = the highest tier a component composes: a wrapper that composes an organism IS an
organism — never demote it to molecule (inverts the dependency).

# TS/JS — FUNCTION STYLE
Functions are **arrow-const**, never `function` declaration/statement. Applies to
EVERYTHING: components, hooks, handlers, helpers.
```ts
// yes
export const Name = (props: Props) => { … };
const helper = (x: number): string => { … };
export default someArrowConst;
// no
export function Name(props: Props) { … }
export default function Page() { … }
```
Default export → declare arrow-const then `export default Name`. Object/class methods
(`method() {}`) are exempt. Project-wide; never reintroduce `function`.
