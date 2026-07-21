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

# Linting
npm run lint                # ESLint + Prettier check

# Type generation
npm run generate-types      # Generate TypeScript types from remote OpenAPI spec
npm run generate-types-local # Generate from local OpenAPI spec
```

**Running a single test file:**

```bash
npx vitest run src/utils/myfile.spec.ts
npx playwright test --ct src/components/MyComponent.spec.tsx
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

### Code Style

Prettier enforced via ESLint: 4-space indent, 140-char line width, single quotes, trailing commas everywhere, semicolons required.

## Git & Pull Requests

- Do NOT put a PR number or issue number in the PR title. Describe the change itself. (Referencing the issue in the PR body, e.g. "Closes #NNNN", is fine.)
- Do NOT write a PR description/body — Copilot generates it automatically. Create PRs with the title only (and, if needed, a short issue reference like "Closes #NNNN"); leave the body empty otherwise.

## Environment Variables (Runtime)

Injected via `window.__ENV__` at runtime (not build time):

- `API_URL` — Backend API base URL
- `LOGIN_URL`, `LOGOUT_URL` — Auth endpoints
- `BASE_URL` — App base path (used in Docker deployments)
