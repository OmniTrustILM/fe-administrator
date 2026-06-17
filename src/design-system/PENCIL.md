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
| NumberInput visual (container, stepper buttons, value) | `NumberInput` |
| Input sub-component visual (any of the 6 types) | `Input/DurationInput`, `Input/HostnameListInput`, `Input/FileUpload`, `Input/MultipleValueTextInput`, `Input/CodeEditor`, `Input/DynamicContent` |
| New component `.pen` created | Add new reusable components + a new column in the showcase |
| Color token changed in `tokens.json` | Call `set_variables` on Design.pen with the updated tokens |

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
