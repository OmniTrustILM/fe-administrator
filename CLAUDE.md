# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run start               # Start Vite dev server

# Build
npm run build               # Production build → build/

# Testing
npm run test:vitest         # Run unit tests (Vitest)
npm run test:vitest:watch   # Unit tests in watch mode
npm run test:vitest:cov     # Unit tests with coverage → coverage-vitest/
npm run test:playwright     # Component tests (Playwright CT)
npm run test:all            # Run all tests

# Linting & formatting
npm run lint                # Biome check (lint + format verification)
npm run format              # Biome format --write

# Typechecking
npm run typecheck           # Typecheck hand-written code (use this; plain `tsc --noEmit` fails on known config deprecations)

# Type generation
npm run generate-types      # Generate TypeScript types from remote OpenAPI spec
npm run generate-types-local # Generate from local OpenAPI spec
```

**Running a single test file:**

```bash
npx vitest run src/utils/myfile.spec.ts
npx playwright test -c playwright-ct.config.ts src/components/MyComponent.spec.tsx
```

## Architecture

### State Management: Redux Toolkit + Redux Observable

All application state lives in `src/ducks/`. Each feature domain has two files:

- `feature.ts` — Redux slice (state shape, reducers, actions, selectors)
- `feature-epics.ts` — RxJS Observable side effects (API calls, async logic)

**Async action pattern:** Every async operation has three actions: `action`, `actionSuccess`, `actionFailure`. Epics listen for `action`, call the API, then dispatch `actionSuccess` or `actionFailure`.

State is combined in `src/ducks/reducers.ts`. The `AppState` type and combined epic are exported from `src/ducks/index.ts`.

### API Layer

`src/api.ts` instantiates all OpenAPI-generated API clients (~40+). The backend URL is read from `window.__ENV__.API_URL` or defaults to `/api`. A secondary "utils" backend client is configured separately via `updateBackendUtilsClients()`.

Types are auto-generated from OpenAPI specs into `src/types/openapi/` — do not edit these files manually.

### Routing & Pages

React Router with `HashRouter`. All routes are defined in `src/components/AppRouter.tsx`. Page components live in `src/components/_pages/` following a list/detail/form pattern.

### Module Aliases

Vite is configured with path aliases — always use these instead of relative paths:

- `components/` → `src/components/`
- `ducks/` → `src/ducks/`
- `types/` → `src/types/`
- `utils/` → `src/utils/`

### Testing Strategy

- **Unit tests (Vitest):** For utilities (`src/utils/**/*.spec.ts`) and Redux slices/epics (`src/ducks/**/*.spec.ts`). Environment: happy-dom.
- **Component tests (Playwright CT):** For React components (`src/**/*.spec.tsx`). Multi-browser (Chromium, Firefox, WebKit). Test server runs on port 3100.

### Styling

Tailwind CSS 4 with Preline UI components. The main CSS entry is `src/tailwindcss.css`.

### Theming

The application supports light, dark and system themes, defaulting to system. Colour is expressed
through semantic tokens, never through raw palette utilities or `dark:` colour variants.

**Three tiers in `src/tailwindcss.css`:**

1. **Primitives** — the `@theme` palette (`--color-blue-*`, `--color-gray-*`). Raw values, never
   themed, not used directly by components.
2. **Semantic custom properties** — declared once under `:root` (light values) and again under
   `.dark` (dark values), e.g. `--surface-raised`, `--content`, `--brand-solid`.
3. **`@theme inline`** — maps each semantic property onto a `--color-*` Tailwind token (e.g.
   `--color-surface-raised: var(--surface-raised)`). The `inline` keyword is essential: it makes
   Tailwind emit `var(--surface-raised)` into the generated utility instead of baking in a literal
   value, which is what lets the theme flip at runtime by toggling the `.dark` class.

**Always use semantic tokens in components:**

```tsx
<div className="bg-surface-raised text-content border border-divider" />
```

Never write `bg-white`, `text-gray-700`, or a `dark:` colour utility — the token already carries
both themes, so a `dark:` colour utility is a sign the wrong token was chosen. A `dark:` utility on
a *non-colour* property is fine, e.g. `border-divider dark:border`: `border` alone is a width
utility, so it can toggle per theme while the colour token stays unconditional. This is how a
component gets a border in dark mode only.

**Semantic roles**, grouped by tier-2 custom property name (same name minus the `--` prefix is the
Tailwind utility suffix, e.g. `--surface-raised` → `bg-surface-raised`):

| Group | Tokens |
|---|---|
| Surfaces | `surface`, `surface-raised`, `surface-sunken`, `surface-hover`, `surface-active`, `surface-inverse`, `surface-header` |
| Content | `content`, `content-muted`, `content-subtle`, `content-inverse`, `content-on-brand` |
| Lines | `divider`, `outline` |
| Brand | `brand`, `brand-solid`, `brand-solid-hover`, `brand-hover`, `brand-subtle` |
| Status | `success`, `danger`, `warning`, `info`, each with a `-surface` and `-solid` variant (`danger` and `warning` also have `-fill`/`-fill-hover`) |

`code-color` is a semantic custom property too (used by `.server-content code`), but it has no
`@theme inline` mapping, so there is no `text-code-color` utility — it is only reachable from
hand-written CSS via `var(--code-color)`.

A further `node-*` token family (`node-valid`, `node-expired`, `node-revoked`, `node-expiring`,
`node-invalid`, `node-unchecked`, `node-failed`, `node-inactive`, `node-default`,
`node-default-text`, `node-default-fill`, `node-danger-action`, `node-icon`, `node-icon-inverse`)
exists solely for `components/FlowChart` — per-certificate-status node and expand-button colours,
used with Tailwind opacity modifiers (e.g. `!bg-node-valid/62`). Don't reach for these outside the
flow chart; they are not part of the general vocabulary.

**Foreground and fill roles are separate tokens.** `brand` is for text, links and icons, and
lightens in dark mode for contrast. `brand-solid` is the button fill and stays the same dark blue in
both themes so white text keeps contrast against it; `brand-solid-hover` is its hover state.
`brand-hover` is the *foreground* hover (for text/links built on `brand`) — using it as a fill hover
drops white text to a contrast ratio that fails accessibility. Status colours split the same way:
the plain token for text and icons, `-surface` for tinted backgrounds, `-solid` for non-text
indicators such as status dots and chart series.

`danger` and `warning` additionally have `-fill`/`-fill-hover` tokens, theme-invariant like
`brand-solid`. They exist because `-solid` is tuned to be a vivid *indicator* colour (a status dot,
a chart series), not a button fill — white text on `danger-solid`/`warning-solid` fails AA, and no
amount of darkening the text fixes it, since the fill itself is too light. A solid `danger` or
`warning` `Button` therefore uses `danger-fill`/`warning-fill` (and their `-hover` variants) so
`content-on-brand` white text stays AA in both themes, while `-solid` is left alone for dots and
chart series.

`content-inverse` is light in both themes, because `surface-inverse` (tooltips) is dark in both.

Hand-written CSS must reference the tier-2 variable directly — `var(--surface-raised)`, never
`var(--color-surface-raised)` — because `@theme inline` does not emit `--color-*` custom properties
into `:root`; it only feeds Tailwind's utility generator. Using the `--color-*` name in hand-written
CSS fails silently: the declaration parses but resolves to nothing.

**Recharts and reactflow take colours as JS props, not classes**, so components that colour them
(`components/FlowChart`, the dashboard chart components) call `useTheme()` from
`components/ThemeProvider` and select a colour palette keyed on `resolvedTheme`. `JsonViewer`
does the same, since it builds syntax-highlighted HTML in JS rather than with Tailwind classes.

**Runtime.** `src/utils/theme.ts` owns theme resolution, persistence and DOM application, and is
framework-free. `components/ThemeProvider` exposes `useTheme()` (mode, resolvedTheme, setMode,
cycleMode) and tracks the OS preference live via a `matchMedia` listener; `useTheme()` throws when
called outside the provider, so any component test harness that renders a theme-consuming component
needs a `ThemeProvider` wrapper. An inline script in `index.html` applies the persisted theme before
first paint so dark-mode users never see a white flash; it duplicates the resolution logic from
`theme.ts` deliberately, because it runs before any module has loaded, and the two must be kept in
step by hand. The user-facing control is a single header icon (`components/ThemeToggle`) that cycles
System → Light → Dark → System.

**Accessibility.** `src/utils/theme-tokens.spec.ts` parses the semantic tokens out of the stylesheet
and asserts WCAG AA (4.5:1) contrast for every text/background pairing, in both themes, plus AA
non-text contrast (WCAG 1.4.11, 3:1) for `outline` and each `-solid` status token against
`surface-raised`. Changing a token value to something that fails either threshold fails the suite.

### Code Style

Biome enforces linting and formatting: 4-space indent, 140-char line width, single quotes, trailing commas everywhere, semicolons required. Suppress rules only with a justified `biome-ignore` comment.

## Git & Pull Requests

- Do NOT put a PR number or issue number in the PR title. Describe the change itself. (Referencing the issue in the PR body, e.g. "Closes #NNNN", is fine.)
- Do NOT write a PR description/body — Copilot generates it automatically. Create PRs with the title only (and, if needed, a short issue reference like "Closes #NNNN"); leave the body empty otherwise.

## Environment Variables (Runtime)

Injected via `window.__ENV__` at runtime (not build time):

- `API_URL` — Backend API base URL
- `LOGIN_URL`, `LOGOUT_URL` — Auth endpoints
- `BASE_URL` — App base path (used in Docker deployments)
