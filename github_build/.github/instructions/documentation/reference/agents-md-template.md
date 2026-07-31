# AGENTS.md — STRUCTURE + EXAMPLE

Load only when creating or restructuring an AGENTS.md file.

## Structure (all sections required)
```md
# Purpose
# Responsibilities
# File Structure
# Key Components
# Dependencies
# Related Modules
```

## Example
```md
# Purpose
Theme configuration and the SSR-safe MUI provider chain.

# Responsibilities
- Define the global default MUI theme
- Provide Emotion cache + ThemeProvider for the App Router

# File Structure
- theme.ts          — global createTheme() definition
- ThemeRegistry.tsx — AppRouterCacheProvider → ThemeProvider → CssBaseline

# Key Components
- ThemeRegistry — mounted once in app/layout.tsx

# Dependencies
@mui/material, @emotion/react, @mui/material-nextjs

# Related Modules
- Parent: ../  (src)
```
