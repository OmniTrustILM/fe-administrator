# Code review instructions

These instructions apply to Copilot code review. If you are generating or editing
code in this repository they do not apply to you - see `CLAUDE.md`.

## Shared engineering context

For PR review, read the shared engineering context in `.github/review-context/`:
`org-map.md`, `conventions/pr-and-commits.md`, `repos/interfaces.md`,
`repos/core.md`, `review-policy.md` and `cross-repo.md`. `review-policy.md` says
how to apply the others, and `manifest.json` identifies the source commit the
files were exported from. The interfaces and core profiles apply where a change
depends on the platform API this application calls. Report findings in the usual
review format.

For a cross-repo change, inspect the actual counterpart code and consumed
revision through the configured read-only GitHub tools, and say when that
context is unavailable.
