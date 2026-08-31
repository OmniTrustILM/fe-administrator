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

The same split governs `Badge`, whose `fill` prop defaults to `surface`. A badge that carries text
must stay on the tinted `-surface`/plain-text treatment; `fill="solid"` paints the vivid `-solid`
fill and is only for icon-only indicators such as `StatusCircle`, where the 3:1 non-text threshold
applies. Never paint a raw status hex onto a `Badge` as an inline background either — map the
status to a `BadgeColor` instead (see `getCertificateStatusBadgeColor`), because the indicator
hexes sit at a luminance where neither black nor white text reaches 4.5:1.

Hand-written CSS must reference the tier-2 variable directly — `var(--surface-raised)`, never
`var(--color-surface-raised)` — because `@theme inline` does not emit `--color-*` custom properties
into `:root`; it only feeds Tailwind's utility generator. Using the `--color-*` name in hand-written
CSS fails silently: the declaration parses but resolves to nothing.

**Recharts and reactflow take colours as JS props, not classes**, so components that colour them
(`components/FlowChart`, the dashboard chart components) call `useTheme()` from
`components/ThemeProvider` and select a colour palette keyed on `resolvedTheme`. `JsonViewer`
does the same, since it builds syntax-highlighted HTML in JS rather than with Tailwind classes.

Chart series and status dots are the exception: they are picked per *datum*, not per theme, so a
theme-keyed palette would have to be duplicated for every status. They instead use one
theme-invariant colour drawn from a mid-luminance band that clears 3:1 against `surface-raised` in
both themes. `src/utils/chart-contrast.ts` holds the rule (`meetsChartContrast`, and `toChartHex`
for the generated overflow hues), and `chart-contrast.spec.ts` asserts every certificate status,
secret status and donut palette entry satisfies it — so a new status colour has to be picked inside
the band, not at either extreme.

**Runtime.** `src/utils/theme.ts` owns theme resolution, persistence and DOM application, and is
framework-free. There are four modes: `light` and `dark` are the platform's own themes, `systemLight`
and `systemDark` are the operator's branded theme in its two compositions, and are offered only once
branding is configured. Each resolves to one of the two `ResolvedTheme` values that the stylesheet
actually renders.

Resolution follows a strict precedence: the user's own stored choice, then the operator's default
(`defaultTheme` from public branding), then the OS preference. The OS is therefore consulted only on
the fallback path — where the `matchMedia` listener does keep the theme moving live — and is ignored
once either of the first two exists.

`components/ThemeProvider` exposes `useTheme()` (mode, resolvedTheme, setMode, modes — `modes` being
the list the control may offer, two without branding and four with it). It is store-free so a
component test can mount it directly; `components/ThemeProvider/ConnectedThemeProvider` is the
wrapper that feeds it the branding read from the `branding` duck, and withholds it while the read is
in flight or has failed, because a failed read settles the slice on the platform default and would
otherwise be indistinguishable from a live "not branded" answer. `useTheme()` throws when called
outside the provider, so any component test harness that renders a theme-consuming component needs a
`ThemeProvider` wrapper.

The operator default is cached in `localStorage` under `theme-operator-default`, written only from a
live branding response. An inline script in `index.html` applies the stored mode, or that cache, or
the OS preference before first paint so nobody sees a white flash; it duplicates the resolution logic
from `theme.ts` deliberately, because it runs before any module has loaded, and the two must be kept
in step by hand. The user-facing control is a header dropdown (`components/ThemeToggle`) listing the
available modes as a Radix radio group, with the active one marked.

**Accessibility.** `src/utils/theme-tokens.spec.ts` parses the semantic tokens out of the stylesheet
and asserts WCAG AA (4.5:1) contrast for every text/background pairing, in both themes, plus AA
non-text contrast (WCAG 1.4.11, 3:1) for `outline` and each `-solid` status token against
`surface-raised`. Changing a token value to something that fails either threshold fails the suite.

### Code Style

Biome enforces linting and formatting: 4-space indent, 140-char line width, single quotes, trailing commas everywhere, semicolons required. Suppress rules only with a justified `biome-ignore` comment.

## Git & Pull Requests

- Do NOT put a PR number or issue number in the PR title. Describe the change itself. (Referencing the issue in the PR body, e.g. "Closes #NNNN", is fine.)
- DO write the PR description by hand. Describe only what the change does, factual and properly markdown formatted. No AI or assistant attribution, no follow-up/task/plan sections, and no unrelated context such as links to other pull requests. An empty body stays empty — nothing backfills it.

## CI Workflows

Container builds call first-party reusable workflows from `OmniTrustILM/.github`, referenced as
`@main` on purpose: edits there are meant to reach every repo without a version bump here.

| Workflow | Trigger | Reusable workflow | Result |
|---|---|---|---|
| `publish_docker.yaml` | push to `main`, tags | `containers-build-and-push.yml` | `ilm/frontend-administrator` |
| `test_docker_image.yaml` | pull request | `containers-test.yml` | builds and scans, pushes nothing |
| `build_preview_docker.yml` | `workflow_dispatch` | `containers-build-and-push.yml` | `ilm-preview/frontend-administrator` |

### Preview image pipeline

A preview image cannot be built on `pull_request`, because a fork PR has no access to registry
credentials. Three workflows relay the context instead:

1. `prepare_preview.yml` — `pull_request`, gated on the `preview` label. Writes `pr-context.json`
   (`pr_number`, `head_sha`, `head_repo`, `head_branch`, `base_ref`) as an artifact. A fork PR runs
   this file from its own head, so the gate here is an optimisation, not the authorisation.
2. `dispatch-preview-docker.yml` — `workflow_run` on the above. Has secrets, and carries the
   authorisation. It accepts only `pr_number` from the artifact, then re-reads the PR through the
   API: the PR must be open and carry the `preview` label, and its head repository and branch must
   match the triggering run, so a forged number cannot drive another PR's builds. A head SHA that
   has moved on skips, because the push that moved it starts its own run. Every dispatch input comes
   from that API response, and the build is dispatched on the default branch rather than on
   `base_ref`, so a base branch cannot supply its own copy of the build workflow.
3. `build_preview_docker.yml` — `workflow_dispatch`. Calls the reusable workflow with
   `ref: <head_sha>`, and reports a `Docker preview build` check against that commit because a
   dispatched run does not attach to the PR on its own.

`dispatch-sonar.yml` consumes the same `pr-context.json` to drive `sonar.yml`, so changing what
`prepare_preview.yml` writes affects both paths.

Passing the head SHA works for a fork PR because fork objects live in this repository's network, so
`actions/checkout` resolves them without a `repository` override. Pinning the commit rather than the
branch also keeps the published tag honest when a push lands mid-run.

The preview call passes `sign: false` and `push-readme: false`: a preview is not a release, so it
carries no cosign signature and must not overwrite the registry README from a fork branch. It also
overrides `tag-rules` with a single `pr-<number>-<sha>` tag, because the default rules would publish
rolling `develop-latest` and `develop-<sha>` tags onto the preview path.

Trivy gates the preview build under the org-default policy. Per-architecture images are pushed by
digest before the scan runs, so a PR introducing a CRITICAL or HIGH vulnerability still leaves those
digests in the registry — but no `pr-<number>-<sha>` tag or multiarch manifest is published.
`test_docker_image.yaml` already fails that same PR.

## Environment Variables (Runtime)

Injected via `window.__ENV__` at runtime (not build time):

- `API_URL` — Backend API base URL
- `LOGIN_URL`, `LOGOUT_URL` — Auth endpoints
- `BASE_URL` — App base path (used in Docker deployments)
