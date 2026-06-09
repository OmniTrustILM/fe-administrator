# Pencil Daily Task — Runbook

This is the standing procedure for adding **one (or more) Pencil design-system component(s) per day**.
A fresh Claude Code session should read this file end-to-end, then execute it.

- **Repo:** `OmniTrustILM/fe-administrator`
- **Epic:** #1516 (*Analyse Pencil as a design tool for the project*) — every component is a sub-issue of it.
- **Conventions:** `src/design-system/PENCIL.md` (read this too — it is the source of truth for layout, tokens, sections, naming).
- **Tokens:** `src/design-system/tokens.json`
- **Showcase:** `src/design-system/Design.pen` (must be kept in sync — see PENCIL.md §9).

---

## Step 1 — Pick a free task

List the **open** sub-issues of the epic and choose one:

```bash
gh api repos/OmniTrustILM/fe-administrator/issues/1516/sub_issues \
  --jq '.[] | select(.state=="open") | "#\(.number) \(.title)"'
```

Selection rule (unless the user names a specific component):
1. Prefer **Tier 1** (core primitives) over **Tier 2** (layout/containers) — lower issue numbers are Tier 1.
2. Among those, pick the **lowest issue number that has no open PR** already linked.
3. Skip any issue with a `🚧 in progress` comment or an open linked PR.

Check whether an issue is already being worked on:

```bash
gh issue view <N> --repo OmniTrustILM/fe-administrator --json comments,title
gh pr list --repo OmniTrustILM/fe-administrator --state open --search "in:title <Name>"
```

**Announce the component you picked and wait for the user to confirm before building.**

## Step 2 — Open the `.pen` file in the editor (USER ACTION — required)

The Pencil MCP **ignores any filePath argument and always targets the active editor document.**
So before any design work, the user must:

1. Create the file `src/components/<Name>/<Name>.pen` (if it does not exist).
2. **Open it in the Pencil editor and make it the active/focused document.**

Verify the active doc is correct before proceeding:

```
mcp__pencil__get_editor_state({ include_schema: true })
```

If the active file is not `<Name>.pen`, stop and ask the user to open it. Do not build into the wrong file.

## Step 3 — Build the design

Follow `src/design-system/PENCIL.md` exactly. Summary:

1. Read the component source `src/components/<Name>/` (props, states, variants, sizes).
2. `set_variables` with the full contents of `tokens.json` (only needed for a brand-new file).
3. Create **Light** (`x:0`) and **Dark** (`x:740`) page frames per the page convention.
4. Build sections in order: `Header → States Table → [Sizes] → [Examples]` (use what is relevant).
5. Use `$color.*` tokens everywhere — no hardcoded hex. Focus rings = shadow effects.
6. Set a descriptive `name` on every node.

## Step 4 — Verify

- `mcp__pencil__get_screenshot` of both pages; fix any collapsed/overflowing layout.
- Confirm no hardcoded hex, all states/variants present, naming is clean.
- Remove `placeholder:true` from the pages when done.

## Step 5 — Sync `Design.pen` (CRITICAL — PENCIL.md §9)

Add/update the reusable component definition(s) in `src/design-system/Design.pen` and add a column to the showcase. This requires opening `Design.pen` as the active editor doc.

## Step 6 — Update the docs

- Add the new component to the **Existing Component Files** table in `PENCIL.md` (§8).
- Add its reusable IDs to the **Design.pen** table (§9) if applicable.

## Step 7 — Ship it

```bash
git switch -c pencil-<name>-component        # branch off main; never commit straight to main
git add -A && git commit                     # message: "Pencil - <Name> component"
gh pr create --repo OmniTrustILM/fe-administrator \
  --title "Pencil - <Name> component" \
  --body "Closes #<issue-number>\n\n<short summary>"
```

Using `Closes #<issue-number>` makes GitHub auto-close the sub-issue (and tick it off the epic) when the PR merges. Report the PR URL back to the user.

---

## Definition of Done (per component)

- [ ] Light & Dark pages, correct sections
- [ ] All states / variants / sizes covered
- [ ] Tokenised colors only (no hardcoded hex)
- [ ] Screenshots verified, no layout breakage, `placeholder` removed
- [ ] `Design.pen` synced + showcase column added
- [ ] `PENCIL.md` tables updated
- [ ] PR opened with `Closes #<issue>`
