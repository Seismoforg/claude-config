# TYPESCRIPT / JAVASCRIPT

Load for any TS or JS file, frontend or backend. Adds to `core.md`. React-specific structure lives
in `react.md`.

# FUNCTION STYLE
Functions are **arrow-const**, never a `function` declaration or statement. This binds everything:
components, hooks, handlers, helpers, backend modules.

```ts
// yes
export const Name = (props: Props) => { … };
const helper = (x: number): string => { … };
export default someArrowConst;

// no
export function Name(props: Props) { … }
export default function Page() { … }
```

Default export → declare the arrow-const, then `export default Name`. Object and class methods
(`method() {}`) are exempt. Project-wide; never reintroduce `function`.

# TYPES
- Type the boundaries: exported functions, module APIs, external payloads. Inference is fine inside
  a function body.
- `any` needs a reason in a comment. `unknown` plus a narrowing check is almost always the better
  answer.
- Parsing external data (API response, file, env) → validate at the boundary. A TS type is erased at
  runtime and proves nothing about what actually arrived.

# STYLE-PROP UNITS
A component library's style prop may reinterpret a bare number — as a spacing-scale multiple, a
theme-token multiplier, or a 0-1 fraction read as a percentage — NOT as px. Never assume a bare
number means px. Check the library's unit semantics and prefer an explicit unit string where the
prop takes one.

A wrong assumption typechecks and builds clean, then renders wrong: a radius several times too big,
a 1px box that fills 100%. Confirm in the rendered output, not the source.
