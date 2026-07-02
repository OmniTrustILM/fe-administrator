# Pencil Design System — AI Instructions

This file tells AI agents (Claude Code + Pencil MCP) how to create and maintain `.pen` design files for this project.

---

## 1. Setup: Always Apply Tokens First

When creating a **new `.pen` file**, call `set_variables` with the full palette from `src/design-system/tokens.json` before inserting any nodes.

```js
// Read tokens.json → pass directly to set_variables
mcp__pencil__set_variables({ filePath: "...", variables: <tokens.json contents> })
```

After that, use `$color.*` variable references everywhere — never hardcode hex values except for one-off canvas backgrounds (`#0d0d0d` etc.).

---

## 2. File Convention

| Rule | Value |
|------|-------|
| One `.pen` file per component | `src/components/Button/Button.pen` |
| File name matches folder name | `Checkbox/Checkbox.pen`, `Card/Card.pen` |
| Always two pages: Light + Dark | Side by side, `x:0` and `x:740` (or wider if needed) |
| Page size | `width:700, height:auto` (let vertical layout size it), `clip:true` |
| Page corner radius | `cornerRadius:12` |
| Page padding | `[44, 40, 40, 40]` (top, right, bottom, left) |
| Page gap | `gap:28` between sections |

### Light page frame
```js
{ type:"frame", x:0, y:0, width:700, cornerRadius:12, clip:true,
  fill:"$color.white", stroke:"$color.gray-200", strokeWidth:1, strokeAlignment:"inner",
  layout:"vertical", gap:28, padding:[44,40,40,40] }
```

### Dark page frame
```js
{ type:"frame", x:740, y:0, width:700, cornerRadius:12, clip:true,
  fill:"$color.neutral-900", stroke:"$color.neutral-700", strokeWidth:1, strokeAlignment:"inner",
  layout:"vertical", gap:28, padding:[44,40,40,40] }
```

---

## 3. Page Structure (sections in order)

Every page uses this vertical section order:

```
1. Header          — title + subtitle
2. States Table    — grid: rows=variants, columns=states
3. [Section Divider]
4. Sizes           — (if component has size variants)
5. [Section Divider]
6. Examples        — real-world usage examples
```

Not all sections are needed for every component. Use what's relevant.

### 3.1 Header Section
```js
// Vertical frame, fill_container width, gap:6
{ type:"frame", name:"Header", layout:"vertical", gap:6, width:"fill_container" }
  // Title
  { type:"text", name:"Title", content:"ComponentName", fontFamily:"Inter", fontSize:20, fontWeight:"600",
    fill: light?"$color.gray-900":"$color.white" }
  // Subtitle
  { type:"text", name:"Subtitle", content:"Component design system — states, sizes & examples",
    fontFamily:"Inter", fontSize:12, fill: light?"$color.gray-700":"$color.neutral-300" }
```

### 3.2 States Table Section
Grid layout: rows = variant types, columns = interactive states.

**Standard columns:** Default · Hover · Focus · Disabled

**Column header row**
```js
{ type:"frame", name:"Header Row", layout:"horizontal", width:"fill_container",
  alignItems:"center", padding:[0,0,12,0] }
  // First cell = label placeholder
  { type:"frame", width:90 }   // or 120 for longer row labels
  // State columns — fill_container, text centered
  { type:"frame", width:"fill_container", layout:"horizontal",
    justifyContent:"center", alignItems:"center" }
    { type:"text", content:"Default", fontFamily:"Inter", fontSize:11, fontWeight:"500",
      fill: light?"$color.gray-700":"$color.neutral-300" }
```

**Data row (one per variant)**
```js
// Separator before each data row
{ type:"rectangle", name:"Divider", fill: light?"$color.gray-200":"$color.neutral-700",
  width:"fill_container", height:1 }

{ type:"frame", name:"Primary Row", layout:"horizontal", width:"fill_container",
  alignItems:"center", padding:[16,0] }
  // Label cell
  { type:"frame", width:90, layout:"horizontal", alignItems:"center" }
    { type:"text", content:"Primary", fontFamily:"Inter", fontSize:13, fontWeight:"500",
      fill: light?"$color.gray-700":"$color.neutral-300" }
  // State cells — one per column
  { type:"frame", width:"fill_container", layout:"horizontal",
    justifyContent:"center", alignItems:"center" }
    // The actual component preview goes here
```

### 3.3 Section Divider
```js
{ type:"rectangle", name:"Section Divider",
  fill: light?"$color.gray-200":"$color.neutral-700",
  width:"fill_container", height:1 }
```

### 3.4 Sizes Section
```js
{ type:"frame", name:"Sizes", layout:"vertical", width:"fill_container", gap:14 }
  { type:"text", name:"Section: Sizes", content:"Sizes", fontFamily:"Inter",
    fontSize:13, fontWeight:"600", fill: light?"$color.gray-900":"$color.white" }
  { type:"frame", name:"Size Demos", layout:"horizontal", gap:48, alignItems:"center" }
    // One sub-frame per size showing: label above + component demo
```

### 3.5 Examples Section
```js
{ type:"frame", name:"Examples", layout:"vertical", width:"fill_container", gap:18 }
  { type:"text", name:"Section: Examples", content:"Examples", fontFamily:"Inter",
    fontSize:13, fontWeight:"600", fill: light?"$color.gray-900":"$color.white" }
  // 2-4 real-world usage rows — horizontal frames with the component + context
```

---

## 4. Focus Ring (interactive components)

Use shadow effect for focus rings — NOT a separate border frame:
```js
effect: { type:"shadow", shadowType:"outer", offset:{x:0,y:0}, spread:2, blur:0, color:"$color.blue-300" }
```

For danger focus: `color:"$color.red-400"`
For warning focus: `color:"$color.yellow-400"`

---

## 5. Typography Scale

| Use | Size | Weight | Token |
|-----|------|--------|-------|
| Page title | 20px | 600 | gray-900 / white |
| Page subtitle | 12px | 400 | gray-700 / neutral-300 |
| Section heading | 13px | 600 | gray-900 / white |
| Column header | 11px | 500 | gray-700 / neutral-300 |
| Row label | 13px | 500 | gray-700 / neutral-300 |
| Body / label text | 14px | 400 | gray-500 / neutral-400 |
| Small / caption | 12px | 500 | gray-700 / neutral-300 |

All text uses `fontFamily:"Inter"`.

---

## 6. Naming Convention

Always set `name` on every node. Use descriptive, hierarchical names:

```
"Light"               ← page frame
  "Header"            ← section
    "Title"
    "Subtitle"
  "States Table"
    "Header Row"
    "Divider"
    "Primary Row"
    "Danger Row"
  "Section Divider"
  "Sizes"
    "Section: Sizes"
    "Size Demos"
  "Section Divider"
  "Examples"
    "Section: Examples"
    "Settings Row"
```

---

## 7. Light vs Dark Color Map

| Role | Light | Dark |
|------|-------|------|
| Page background | `$color.white` | `$color.neutral-900` |
| Page border | `$color.gray-200` | `$color.neutral-700` |
| Page title | `$color.gray-900` | `$color.white` |
| Subtitle / meta | `$color.gray-700` | `$color.neutral-300` |
| Body text | `$color.gray-500` | `$color.neutral-400` |
| Divider | `$color.gray-200` | `$color.neutral-700` |
| Subtle bg / surface | `$color.gray-100` | `$color.neutral-800` |
| Border on surface | `$color.gray-200` | `$color.neutral-700` |

---

## 8. Existing Component Files

| Component | File |
|-----------|------|
| Button | `src/components/Button/Button.pen` |
| Checkbox | `src/components/Checkbox/Checkbox.pen` |
| Card | `src/components/Card/Card.pen` |
| Switch | `src/components/Switch/Switch.pen` |
| Breadcrumb | `src/components/Breadcrumb/Breadcrumb.pen` |
| TextInput | `src/components/TextInput/TextInput.pen` |
| Input | `src/components/Input/Input.pen` |
| NumberInput | `src/components/NumberInput/NumberInput.pen` |
| TextArea | `src/components/TextArea/TextArea.pen` |
| Select | `src/components/Select/Select.pen` |
| Dropdown | `src/components/Dropdown/Dropdown.pen` |
| RadioRow | `src/components/RadioRow/RadioRow.pen` |
| DatePicker | `src/components/DatePicker/DatePicker.pen` |
| Badge | `src/components/Badge/Badge.pen` |
| BooleanBadge | `src/components/BooleanBadge/BooleanBadge.pen` |
| StatusBadge | `src/components/StatusBadge/StatusBadge.pen` |
| StatusCircle | `src/components/StatusCircle/StatusCircle.pen` |
| Label | `src/components/Label/Label.pen` |
| Spinner | `src/components/Spinner/Spinner.pen` |
| Tooltip | `src/components/Tooltip/Tooltip.pen` |
| Tabs | `src/components/Tabs/Tabs.pen` |
| Dialog | `src/components/Dialog/Dialog.pen` |
| Pagination | `src/components/Pagination/Pagination.pen` |
| ProgressButton | `src/components/ProgressButton/ProgressButton.pen` |
| Alerts | `src/components/Alerts/Alerts.pen` |
| Container | `src/components/Container/Container.pen` |
| Widget | `src/components/Widget/Widget.pen` |
| WidgetButtons | `src/components/WidgetButtons/WidgetButtons.pen` |
| WidgetLock | `src/components/WidgetLock/WidgetLock.pen` |
| CustomTable | `src/components/CustomTable/CustomTable.pen` |

Button.pen is the most complete reference — it has 6 pages (Light/Dark × Solid/Outline/Transparent) showing all 5 color variants across 4 states.

Switch.pen has the richest single-page structure: States Table + Sizes + Examples sections.

---

## 9. Design.pen Sync Rule — CRITICAL

`src/design-system/Design.pen` is the **component library showcase**. It contains independent copies of components from the individual `.pen` doc files. Pencil has no cross-file references, so **Design.pen does NOT auto-update** when Button.pen, Checkbox.pen, Card.pen, or Switch.pen change.

### When to update Design.pen

**Any time you edit a component `.pen` doc file** (Button.pen, Checkbox.pen, Card.pen, Switch.pen, or any future component `.pen`), you MUST also update the corresponding reusable component in Design.pen.

### What to check and update

| If you changed... | Update in Design.pen |
|-------------------|----------------------|
| Button visual style (color, radius, size) | `Button/Primary`, `Button/Danger`, `Button/Secondary`, `Button/Outline`, `Button/Ghost` |
| Checkbox visual (box style, checkmark) | `Checkbox/Unchecked`, `Checkbox/Checked`, `Checkbox/Label-Unchecked`, `Checkbox/Label-Checked` |
| Switch visual (track, thumb, colors) | `Switch/Off`, `Switch/On` |
| Card visual (border, shadow, layout, typography) | `Card` |
| TextInput visual (border, radius, focus ring, padding) | `TextInput/Field` |
| TextArea visual (border, radius, focus ring, padding, height) | `TextArea/Field` |
| Select visual (trigger border, radius, focus ring, chevron, chips) | `Select/Single`, `Select/Multi` |
| Dropdown visual (trigger border/style, chevron, menu panel, items) | `Dropdown/Trigger`, `Dropdown/Menu` |
| RadioRow visual (card border/tint, radio control, selected state) | `RadioRow/Default`, `RadioRow/Selected` |
| DatePicker visual (input field, calendar popover, day cells, time footer) | `DatePicker/Input`, `DatePicker/Calendar` |
| Badge visual (pill radius, padding/size, colors, remove button) | `Badge/Solid`, `Badge/Removable` |
| BooleanBadge visual (Yes/No label, success/danger color, `invertColor`) | reuses `Badge/Solid` (override fill + Label; no dedicated reusable) |
| StatusBadge visual (enabled flag → Enabled/Disabled/Unknown; `textStatus` → Approved/Rejected/Pending/Expired; success/danger/secondary color) | reuses `Badge/Solid` (override `padding:[2,6]` for small size + fill + Label; no dedicated reusable) |
| StatusCircle visual (`status` true → success/check, false → danger/x, undefined → gray-500/circle-question-mark; small icon badge) | reuses `Badge/Solid` (override `padding:[2,6]` + fill, and **replace** the `e7K7wr` Label descendant with a 16×16 white lucide `icon`; no dedicated reusable) |
| Label visual (form field label text 14/500 `neutral-700`; optional required `*` in `red-500`; clickable variant renders as button, same visual) | plain text — no reusable; showcase `Label Group` shows default + required (`Field label` + red ` *`) |
| Spinner visual (animated ring, `border-3` + `border-t-transparent` → C-shaped arc; sizes sm/md/lg/xl = 16/24/32/40px; primary `blue-600` (dark `blue-500`), light `white`) | plain `ellipse` (`innerRadius:(d-6)/d`, `startAngle:135`, `sweepAngle:270`) — no reusable; showcase `Spinner Group` shows primary sm/md/lg + light-on-dark |
| Tooltip visual (dark hover popover below trigger; `bg #111827` (dark `neutral-700`), white `text-xs`/500, `rounded-md`, `py-1 px-2`, up-pointing arrow, `sideOffset 8`; placement `bottom` only; long content wraps at `max-w-xs`) | bubble = `frame` (`fill $color.tooltip-bg`, `cornerRadius 6`, `padding [4,8]`) + arrow `path` (`M0 6 L6 0 L12 6 Z`) in a centered vertical unit — no reusable; needs `color.tooltip-bg` (#111827) token in Design.pen; showcase `Tooltip Group` shows trigger + bubble + arrow |
| Tabs visual (horizontal pill tab bar; active tab `bg gray-200`/`text gray-800` (dark `neutral-700`/`white`), inactive `transparent`/`gray-500` (dark `neutral-500`), `text-sm`/500, `rounded-lg`, `py-3 px-4`, `gap-x-1` between tabs + `gap-x-2` for icon+label; disabled = `opacity-50`; horizontally scrollable via SimpleBar `forceVisible="x"` when tabs overflow) | tab = `frame` (`fill gray-200`/`transparent`, `cornerRadius 8`, `padding [12,16]`, optional leading lucide `icon` + `text` 14/500) — no reusable; showcase `Tabs Group` shows a 3-tab bar with the first active |
| Dialog visual (Radix modal: white card `rounded-xl` (`p-8 !pb-0`), `border gray-200` + shadow (dark `bg neutral-800`/`border neutral-700`), over a `black/50` overlay scrim; optional 48px circular icon (`bg-current/12` + 64px `bg-current/6` ring behind) — delete/destroy/warning `red-800`, check `teal-800`/`teal-100` bg, default `#6b7280`; `caption` h3 24/700, `body` `text-gray-500` (dark `white`), footer button row `justify-end gap-4`; delete/destroy are centered + borderless; sizes sm/md/lg/xl/xxl = `max-w-sm/lg/xl/4xl/6xl`) | dialog = `frame` (`fill white`/`neutral-800`, `cornerRadius 12`, outer shadow), icon circle = 2 stacked `ellipse` (outer 6%, inner 12%) + lucide `icon`, footer buttons reuse the `btn` pattern (`padding [9,13]`, `cornerRadius 8`) — no reusable; needs `teal-100`/`teal-800`/`dialog-scrim`/tint tokens; showcase `Dialog Group` shows a compact card with caption + body + Cancel/Delete footer |
| Pagination visual (horizontal nav `gap-x-1`; Previous/Next ghost buttons = lucide chevron + label `text-sm`, `text-gray-800` (dark `white`), `min-h/w-9.5`≈38px, `rounded-lg`, disabled at first/last page → `opacity-50`; page-number buttons 38px square `rounded-lg`, active `bg-gray-200`/`text-gray-800` (dark `bg-neutral-600`/`white`) else transparent; ellipsis `•••` `text-gray-400` (dark `neutral-500`) for collapsed ranges; shows all pages if `totalPages ≤ 7` else `1 … window … last`) | nav = `frame` (`gap 4`, prev/next = chevron `icon` + `text`, page = `frame` 38×38 `cornerRadius 8`, active `fill gray-200`/`neutral-600`, ellipsis `•••`) — no reusable; showcase `Pagination Group` shows a compact `‹ 1 ··· 4 [5] 6 ›` bar |
| ProgressButton visual (solid Button + inline loading state; when `inProgress` → light `Spinner size="sm"` (white C-arc) precedes `inProgressTitle`, button becomes `disabled` + `opacity-50`; plain `disabled` → `opacity-35`; always `solid` variant, color from `ButtonColor`) | reuses `Button/Primary` (`i4PcLp`) for Default/Disabled (override Label + `opacity`); dedicated `ProgressButton/Loading` (`bjqC3`) for the loading state (blue button + white spinner arc + "Saving…") |
| Alerts visual (dismissible banner list; `text-lg`/600 message, `border rounded-lg`, `px-10 py-4`, leading status icon (14) `top-5 left-4` + dismiss `X` (14) `top-2 right-2`; two variants — **success** `bg-teal-100 text-teal-800 border-teal-200` (dark `bg-teal-800/10 text-teal-500 border-teal-900`) + `CircleCheck`, **error/non-success** `bg-red-100 text-red-800 border-red-200` (dark `bg-red-800/10 text-red-500 border-red-900`) + `CircleX`; `opacity-0` fade on dismiss) | dedicated `Alerts/Success` (`gNmMe`) + `Alerts/Error` (`e4bLs9`) reusables (banner frame + leading lucide icon + bold message + `x` dismiss). Design.pen is light-only, so it needed `teal-100`/`teal-200`/`teal-800` + `red-200` tokens added (`red-100`/`red-800` already present); the component's own Alerts.pen also carries the dark tokens `teal-500/900`, `teal-800-10`, `red-500/900`, `red-800-10`. Showcase `Alerts Group` (`aNggh`) shows one success + one error banner |
| Container visual (pure layout primitive: `flex flex-col` vertical stack; gap `gap-4 md:gap-8` default or custom `gap-N`; optional `marginTop` → `mt-4 md:mt-8`; no colors/borders of its own) | plain layout demo — no reusable; showcase `Container Group` (`eKo82`) shows a bordered container with 3 stacked blocks + gap caption |
| Widget visual (card/panel shell: `rounded-xl border border-gray-200 shadow-2xs bg-white` (dark `bg-neutral-900`/`border-neutral-700`), `p-4 md:p-5`; optional header row — title (`h5`; sizes small/medium/large/larger = `text-sm/base/lg/xl`; `titleBoldness`; `titleLink` wraps in `text-blue-600`) + `refreshAction`/`resetViewAction` transparent icon buttons on the left, right-aligned `WidgetButtons` + `widgetExtraTopNode`; optional collapsible `widgetInfoCard`; body = children, or `WidgetLock` when `widgetLockName` matches an active lock; `busy` → `Spinner` + optional `white/35` (dark `neutral-900/35`) overlay; `noBorder` drops border/bg/padding/shadow) | plain widget-card demo — no reusable (composite of Button/Spinner/WidgetButtons/WidgetLock); showcase `Widget Group` (`B7v2S8`) shows a compact card with header (title + refresh/reset + search/info) + body rows |
| WidgetButtons visual (toolbar row of transparent icon `Button`s: `flex ml-2 items-center gap-1`; each = 16px lucide icon in a `p-2` transparent button, hover `bg-gray-200` (dark `neutral-700`), `disabled` → `opacity-35` (+ `disabledTooltip`); `justify` start/center/end; per-button `custom` slot renders any React node inline) | plain demo — no reusable (composite of transparent `Button`s); showcase `WidgetButtons Group` (`VEgLI`) shows a widget-header card with a `Certificates` title + a right-aligned refresh/download(hover)/search/info icon cluster |
| WidgetLock visual (error / empty-state card wrapped in a `Container`, centered `max-w-md`/`xl`/`full` by `size`: `bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl p-6 flex items-center gap-4`; danger-colored (`--status-danger` red) icon that **switches to `neutral-400` in dark mode**, varying by `lockType` (Generic/`triangle-alert`, Network/`wifi`, Permission/`lock`, Client/`house`, ServiceError/`database`, ServerError/`server`), icon size 24/32/48 by `size`; `h5` semibold title + optional `lockDetails` `Info` tooltip button; `text-sm` muted body) | plain demo — no reusable (composite of Container + icon + text); showcase `WidgetLock Group` (`i4MJSC`) shows the default lock card (`triangle-alert` + `There was some problem` title + info tooltip + muted body) |
| CustomTable visual (feature-rich data table: bordered `rounded-md` container (`border-gray-100`), `thead` (`bg-gray-50` light / `bg-neutral-700` dark) with uppercase `text-xs` `text-gray-500`/`neutral-400` `th`; sortable columns toggle an `arrow-down-up` icon; `divide-y divide-gray-200`/`neutral-700` rows on `bg-white`/`neutral-800`; optional row + select-all `Checkbox` column (checked = `blue-600`/`blue-500`); optional right-aligned `Search` input; optional bottom pagination bar (page-size `Select` + `Pagination` + `Showing X to Y of Z`); `hasDetails` opens a nested `CustomTable` in a modal; empty state = `table-properties` icon in a gray circle + `No items to show`/`No matching items`; `isLoading` → `TableSkeleton`) | plain demo — no reusable (composite of Checkbox/Select/Pagination/SimpleBar); showcase `CustomTable Group` (`ana3z`) shows a mini sortable+selectable table (select-all + `NAME`/`STATUS` headers, one checked row) |
| NumberInput visual (container, stepper buttons, value) | `NumberInput` |
| Input sub-component visual (any of the 6 types) | `Input/DurationInput`, `Input/HostnameListInput`, `Input/FileUpload`, `Input/MultipleValueTextInput`, `Input/CodeEditor`, `Input/DynamicContent` |
| New component `.pen` created | Add new reusable components + a new component group to the showcase grid (see layout note below) |
| Color token changed in `tokens.json` | Call `set_variables` on Design.pen with the updated tokens |

### Showcase layout (Component Library frame `VLhPh`)

The primitives **Body** (`W3Yt2`, vertical, gap 40, `width:3200`, padding `[40,40,48,40]` → ~3120 usable) is a **grid of rows**, not a single strip. Each row (`Row 1`…`Row 5`, horizontal, gap 40, `alignItems:start`) is a horizontal strip of component groups. A component group = vertical frame (Group Header with title + divider, then an Items frame). The reusable source symbols live in a horizontal strip below the Component Library (at `y:3600`), kept clear of the showcase frame.

**Placement policy — fill the row rightward before adding a new row.** The Body is ~3120 wide but historically each row only reached ~1000–1280, leaving the whole right half empty. **Extend existing rows to the right** (append groups to a row until it approaches ~3000 wide) before starting a new row below. Prefer placing a new component next to a semantically related group. Current rows:
- `Row 1` (`LO8oA`): `Buttons` + `Checkboxes` + `Switches` + `Cards` + `Progress Button Group` (`NFq1g`, `ProgressButton/Loading` `bjqC3`) — still has room to the right.
- `Row 2` (`OHL7N`): `Breadcrumb` + `Text Inputs` + `Number Inputs` + `Dropdowns`.
- `Row 3` (`fTPQC`): `Radio Rows` + `Date Pickers` + `Badges` + `Boolean Badge`.
- `Row 4` (`DTZVv`): `Status Badge` + `Status Circle` + `Label` + `Spinner` + `Tooltip`.
- `Row 5` (`ZxqYx`): `Tabs` + `Dialog` + `Pagination` + `Alerts Group` (`aNggh`, `Alerts/Success` `gNmMe` + `Alerts/Error` `e4bLs9`) + `Container Group` (`eKo82`, plain layout demo, no reusable) + `Widget Group` (`B7v2S8`, plain widget-card demo, no reusable) + `WidgetButtons Group` (`VEgLI`, plain toolbar demo, no reusable) + `WidgetLock Group` (`i4MJSC`, plain lock-card demo, no reusable) — ends at ~2860; Row 5 is now full (a table demo won't fit the ~260px left).
- `Row 6` (`iFVR1`): `CustomTable Group` (`ana3z`, width 460, plain mini-table demo, no reusable) — first group of a fresh row; plenty of room to the right for future components.

Below the primitives is the full-width **Input Section** (`jMZl6`) with composite form examples.

### How to update a component in Design.pen

1. Open `Design.pen` in the Pencil editor (make it the active file)
2. Read the changed component's source `.tsx` file to understand the new visual
3. Use `batch_get` to read the current reusable component node in Design.pen
4. Use `Update` or `Replace` to apply the visual changes to the source component node
5. All `ref` instances in the showcase update automatically

### Current reusable component IDs in Design.pen

These IDs change if components are ever deleted and recreated. Re-read `get_editor_state` to get current IDs before editing.

| Component | Current ID | Source doc |
|-----------|-----------|------------|
| Button/Primary | `i4PcLp` | Button.pen (Solid, Primary color) |
| Button/Danger | `E6DLJ0` | Button.pen (Solid, Danger color) |
| Button/Secondary | `dThoL` | Button.pen (Solid, Secondary color) |
| Button/Outline | `uXBGa` | Button.pen (Outline type, Primary color) |
| Button/Ghost | `sGgkm` | Button.pen (Transparent type — rename to Transparent) |
| Switch/Off | `yLFn5` | Switch.pen |
| Switch/On | `Hm8f2` | Switch.pen |
| Checkbox/Unchecked | `nyrTw` | Checkbox.pen |
| Checkbox/Checked | `H5ZN7s` | Checkbox.pen |
| Checkbox/Label-Unchecked | `BKQ1x` | Checkbox.pen |
| Checkbox/Label-Checked | `OcXD9` | Checkbox.pen |
| Card | `maUy6` | Card.pen |
| TextInput/Field | `QxVfY` | TextInput.pen |
| TextArea/Field | `RE61E` | TextArea.pen |
| Select/Single | `qkMSt` | Select.pen |
| Select/Multi | `QmsCq` | Select.pen |
| Dropdown/Trigger | `EJ5mv` | Dropdown.pen (closed bordered trigger) |
| Dropdown/Menu | `pMW71` | Dropdown.pen (open menu panel) |
| RadioRow/Default | `VkC7O` | RadioRow.pen (unchecked card) |
| RadioRow/Selected | `tXxCL` | RadioRow.pen (checked card, blue tint) |
| DatePicker/Input | `iVhII` | DatePicker.pen (filled input field) |
| DatePicker/Calendar | `WFIpF` | DatePicker.pen (open date-only calendar popover) |
| Badge/Solid | `xz3Ab` | Badge.pen (solid pill; override fill + Label for color/size) |
| Badge/Removable | `Le8f4` | Badge.pen (pill with circular X remove button) |
| ProgressButton/Loading | `bjqC3` | ProgressButton.pen (blue solid button + white spinner arc + "Saving…"; Default/Disabled reuse `Button/Primary` `i4PcLp`) |
| Alerts/Success | `gNmMe` | Alerts.pen (teal banner: `bg teal-100`/`border teal-200`/`text teal-800`, `circle-check` icon + bold message + `x` dismiss) |
| Alerts/Error | `e4bLs9` | Alerts.pen (red banner: `bg red-100`/`border red-200`/`text red-800`, `circle-x` icon + bold message + `x` dismiss) |
| NumberInput | `mXtap` | NumberInput.pen |
| Breadcrumb | `UEZoP` | Breadcrumb.pen |
| Input/DurationInput | `RLZEG` | Input.pen |
| Input/HostnameListInput | `M8MdxZ` | Input.pen |
| Input/FileUpload | `n122a2` | Input.pen |
| Input/MultipleValueTextInput | `BsErV` | Input.pen |
| Input/CodeEditor | `cTiD9` | Input.pen |
| Input/DynamicContent | `fIa5W` | Input.pen |

---

## 10. Workflow Checklist for New Component

1. Read the component source (`src/components/ComponentName/index.tsx`) to find props, states, variants
2. Create the `.pen` file (user must open it in Pencil editor first)
3. Call `set_variables` with `tokens.json` contents
4. Create Light and Dark page placeholder frames
5. Get page IDs via `snapshot_layout`
6. Spawn 1 agent for Light page, build Dark page yourself (or vice versa)
7. Each page: Header → States Table → (Sizes) → (Examples)
8. Take screenshots to verify, fix any collapsed/overflow layout issues
9. Remove `placeholder:true` from pages when done
