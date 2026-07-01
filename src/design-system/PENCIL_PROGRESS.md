# Pencil Epic #1516 — Batch Progress & Resume Doc

**Read this FIRST each session** (after `/compact` or a fresh start), together with
`PENCIL_DAILY.md` (runbook) and `PENCIL.md` (conventions + Design.pen sync rule).

This batch builds **all remaining epic #1516 components on ONE branch, in ONE PR opened only at the very end.**

---

## Git workflow (CURRENT — overrides PENCIL_DAILY.md Step 7)

- **Single shared branch:** `pencil-remaining-components` (branched off `main`).
- **Do NOT** create a per-component branch. **Do NOT** open a PR until the whole batch is finished.
- **One commit per component** on this branch:
  ```
  Pencil - <Name> component

  Closes #<issue>

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```
- Each commit includes 4 files: `src/components/<Name>/<Name>.pen`, `src/design-system/Design.pen`,
  `src/design-system/PENCIL.md`, and this file (`PENCIL_PROGRESS.md`).
- **The user must ⌘S each `.pen` in Pencil before committing** — Pencil edits stay in-session until saved.
  Verify on disk with `git status` + file size (`ls -l`) BEFORE `git commit`. A 0-byte `.pen` = unsaved.
- After each component: update the checklist below, commit, then remind the user to `/compact`
  (Claude cannot self-trigger compaction).

## Design.pen placement policy (CURRENT)

The showcase Body (`W3Yt2`) is ~3120 wide but rows historically only reached ~1000–1280, leaving the
right half empty. **Extend existing rows RIGHTWARD** (append groups to a row until it approaches ~3000
wide) before starting a new row. Prefer placing a new component next to a semantically related group.
See PENCIL.md §9 for the current per-row contents and reusable IDs.

---

## Per-component loop (what to do each session)

1. Pick the next unchecked component below (lowest issue number).
2. Read its source: `src/components/<Name>/index.tsx` (+ subcomponents) for props/states/variants/sizes.
3. Ask the user to create + open `src/components/<Name>/<Name>.pen` in Pencil and make it the active doc.
   Confirm via `get_editor_state`.
4. Build: `set_variables` (tokens.json) on the new file → Light (`x:0`) + Dark (`x:740`) pages →
   Header → States Table → (Sizes) → (Examples). `$color.*` only, name every node, focus rings = shadow.
5. Verify with `snapshot_layout` (use `problemsOnly:true` on the page) + a screenshot.
   Remove `placeholder:true` when done. (Note: `get_screenshot` sometimes returns all-white — trust
   `snapshot_layout` and re-screenshot a parent to confirm.)
6. Sync Design.pen: user opens Design.pen as active doc → add reusable(s) in the source strip
   (`y:3600`) → append a component Group into a row per the rightward policy → update PENCIL.md §8/§9.
7. User ⌘S both `.pen` files → verify on disk → commit on `pencil-remaining-components`.
8. Tick the checklist, commit this doc, remind user to `/compact`.

---

## Checklist

Already built in earlier sessions (own `.pen` + Design.pen group; issues #1712–#1720 still open pending
their older PRs — NOT part of this batch): BooleanBadge, StatusBadge, StatusCircle, Label, Spinner,
Tooltip, Tabs, Dialog, Pagination.

**This batch (branch `pencil-remaining-components`):**

- [x] #1721 ProgressButton — commit `c1fd9d52` (Row 1 group `NFq1g`, reusable `ProgressButton/Loading` `bjqC3`)
- [x] #1722 Alerts — Row 5 group `aNggh`; reusables `Alerts/Success` `gNmMe` + `Alerts/Error` `e4bLs9`; added `teal-100/200/800` + `red-200` tokens to Design.pen
- [x] #1723 Container — Row 5 group `eKo82` (plain layout demo, no reusable; layout primitive has no visual chrome); Container.pen shows BEHAVIOR + GAP VARIANTS (gap-2/4/8) + marginTop example
- [x] #1724 Widget — Row 5 group `B7v2S8` (plain widget-card demo, no reusable — composite of Button/Spinner/WidgetButtons/WidgetLock); Widget.pen shows ANATOMY + TITLE SIZES (small/medium/large/larger) + STATES (Default / Busy / No Border / Locked) + EXAMPLES (list widget + open info card)
- [ ] #1725 WidgetButtons
- [ ] #1726 WidgetLock
- [ ] #1727 CustomTable

## When the batch is complete

Open ONE PR from `pencil-remaining-components` → `main`, title e.g. `Pencil - remaining epic #1516 components`,
body listing every `Closes #<issue>` for the components in this batch. Report the PR URL.
