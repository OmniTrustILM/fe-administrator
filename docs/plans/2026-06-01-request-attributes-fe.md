# Request Attributes — Frontend (fe-administrator / czertainly-administrator) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:executing-plans` or `superpowers:subagent-driven-development`. Checkbox tracking. Follow the **Definition of Done** (spec §17, FE-adapted) at the end of this doc.

> **⚠️ REPO RECONCILIATION — READ FIRST.**
> The master program plan (`core/docs/plans/2026-06-01-request-attributes-IMPLEMENTATION-PROGRAM.md` §2) names the FE workstream repo as `CZERTAINLY-FE-Operator (develop)`. **That repository is a frozen 2022-era Create-React-App artifact** (HEAD `142ac6b`, v1.1.1-SNAPSHOT, `react-scripts`, MDB/reactstrap, `ts-rest-client`) — it has **no** AttributeEditor, no RTK ducks, no OpenAPI type generation, and none of the screens this epic touches. The **actual, current operator frontend** the program plan describes (Vite + Vitest + Playwright-CT + Biome, RTK ducks, `openapi-generator-cli` types) is the **`fe-administrator`** repo (`OmniTrustILM/fe-administrator`, `czertainly-administrator` v2.17.x), checked out locally at `/Users/romancinkais/Development/GitHub-CZERTAINLY/fe-administrator`.
> **Every path, component, duck, type, and test command in this plan is real against `fe-administrator`.** Per the brief, this doc is *written* to the `CZERTAINLY-FE-Operator/docs/plans/` location, but **all work executes in `fe-administrator`**. At execution time, confirm the canonical FE repo with the team (the program-plan §2 cell should be corrected to point at `fe-administrator`). Wherever this plan says "the FE repo", it means `fe-administrator`.

**Goal:** Build all request-attribute **UI** across the operator frontend: (0b) the OID-registry "Certificate Extension" category in custom-OID create/edit; (1) the dynamic request-attribute issue form with friendly labels + constraints and the generate-CSR-with-platform-key flow; (2) the RA-Profile strict/lenient toggle + external-CSR compliance-error display; (3) the RA-Profile Request-attributes authoring UI + platform default-set editor + connector-overlay editor; (4) the register/placeholder UI with preconfigured attributes, register→issue binding, and `PENDING_REGISTRATION`/`REGISTERED` states; (6) collection-backed cascading-select pickers.

**Architecture.** The frontend's central reuse asset is `components/Attributes/AttributeEditor`, which already renders any v3 `DataAttribute` (friendly `properties.label`, `required`, `description`, and regexp-constraint pattern/description — see `AttributeFieldInput.tsx`). **A request attribute is a `DataAttribute` carrying `fieldMapping`** (spec §4.1); presence of `fieldMapping` is the sole marker. Because the editor already handles `DataAttribute`, **most request-attribute rendering is achieved by feeding the resolved descriptor set into the existing editor** — the net-new FE surface is: a small `fieldMapping`-aware affordance layer (badges/help showing where a value lands), the OID-extension form branch, the RA-Profile authoring + default-set + overlay editors, the register flow, and cascading collection selects.

**Coverage-aware placement (critical, see DoD).** Sonar `sonar.coverage.exclusions` **excludes `src/components/_pages/**`** (page components are Orchestrators — exempt) **and** `src/types/openapi/**`. New-code coverage is therefore measured on **ducks (`src/ducks/**`), utils (`src/utils/**`), and reusable components NOT under `_pages/`** (e.g. `src/components/Attributes/**`, new `src/components/RequestAttributes/**`). **Push all testable logic into ducks/utils/reusable components**; keep `_pages/*` files as thin wiring. Vitest measures `src/*`, `src/utils/**`, `src/ducks/**`; Playwright-CT (istanbul) measures `src/**/*.{ts,tsx}` for components. Both lcovs feed Sonar (`sonar.javascript.lcov.reportPaths`).

**Tech Stack:** React 18 + TypeScript, Vite, `react-hook-form` (Controller/FormProvider/useWatch), RTK `createSlice` ducks + `redux-observable` epics, Biome (lint/format), Vitest (happy-dom) for logic + `@playwright/experimental-ct-react` for components, `@openapitools/openapi-generator-cli` (`typescript-rxjs`) for types. Interfaces models are Java/Maven (`interfaces`, `feature/authority-provider-v3`).

**Spec ref:** §4 (definition layer / fieldMapping / valueSource), §5 (OID registry extension), §6 (content model), §7 (modes A/B/C/E), §9 (operations), §4.6 + §14-Phase6 (collections), §17 (quality gates). **Master program plan:** matrix §3 FE column for phases 0b/1/2/3/4/6.

**Dependencies on earlier phases (contract-first, program-plan §5).** Each FE task group consumes a backend contract that must merge first and be reflected in the FE's OpenAPI snapshot:
- **0b** depends on **IF Phase 0a/0b**: `OidCategory.CertificateExtension` + `CertificateExtensionOidPropertiesDto` (`{ defaultCritical, valueEncoding }`) folded into the OID `additionalProperties` union; `PlatformEnum` entries for `OidCategory` (already wired) and a value-encoding enum.
- **1** depends on **CO Phase 1**: the resolved request-attribute set surfaced on the existing CSR-attributes endpoint (`getCsrAttributes` → descriptors now carry `fieldMapping`); `DataAttribute.fieldMapping` on the shared model (IF 0a).
- **2** depends on **CO Phase 2 + IF Phase 2**: RA-Profile strict/lenient field on the RA-Profile DTOs; structured compliance-error response on external-CSR submit.
- **3** depends on **CO Phase 3 + IF Phase 3**: `RaProfileRequestAttribute` (static set) DTOs, `RaProfileAttributeOverlay` DTOs, platform default-set DTOs/endpoints.
- **4** depends on **CO Phase 4 + IF Phase 4**: register (Mode E) endpoint + `requestContent` DTOs, `CERTIFICATE_REGISTRATION`/`CERTIFICATE_REQUEST_STRUCTURED` capability surfacing, certificate `PENDING_REGISTRATION`/`REGISTERED` states (`CertificateState` enum additions).
- **6** depends on **CO Phase 6 + IF Phase 6**: `valueSource` `COLLECTION` provider + collection list/value endpoints; cascading `params`.

**Type-regeneration rule (applies to every group).** After each `interfaces`/`core` OpenAPI change merges and the Core OpenAPI is published, refresh the FE type layer:
```bash
# from the FE repo root (fe-administrator)
# 1. update the committed local spec copy from the merged Core OpenAPI, then:
JAVA_HOME=$(/usr/libexec/java_home -v 21) npm run generate-types-local   # reads ./src/doc-openapi-ilm-core.yaml
# or, against the published remote spec:
JAVA_HOME=$(/usr/libexec/java_home -v 21) npm run generate-types          # https://api.otilm.com/main/doc-openapi-ilm-core.yaml
```
`openapi-generator-cli` runs on the JVM; pin `JAVA_HOME=$(/usr/libexec/java_home -v 21)` for the generate-types calls and for **all `interfaces` Maven** verification. The generator rewrites `src/types/openapi/**`; commit the regenerated models. **Until a backend type exists in `src/types/openapi/**`, the consuming FE code is marked `[JIT: verify <type> against Phase N output]`** and must not be hand-fabricated.

---

## Preamble (run once, before any group)

- [ ] **Confirm canonical FE repo** with the team (see Repo Reconciliation). Proceed in `fe-administrator`.
- [ ] **Branch off the FE repo's current branch** (the current branch is `feat/pending-cert-operations-ui`; do **not** commit to it directly):
  ```bash
  git -C /Users/romancinkais/Development/GitHub-CZERTAINLY/fe-administrator switch -c feature/request-attributes-fe
  ```
  > If the team rebases this work onto `develop`, branch from `origin/develop` instead — confirm at execution time.
- [ ] **Toolchain:** `node -v` (repo Node), `npm ci`. `JH="JAVA_HOME=$(/usr/libexec/java_home -v 21)"` for type-gen + interfaces Maven.
- [ ] **Baseline green:** `npm run lint && npm run test:vitest && npm run test:chromium` pass on the branch tip before adding work.
- [ ] **Group branching:** each phase group (0b/1/2/3/4/6) lands as its own sub-branch off `feature/request-attributes-fe` → PR → green gate → merge, in the dependency order above. A group starts only after its backend contract is merged and types are regenerated.
- [ ] **Commit trailer (every commit):** each commit's `Step 5` message MUST end with the trailer below. Where a task says "+ Co-Authored-By trailer", append exactly:
  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  ```

## File Structure (net-new + modified)

| File | Action | Group |
|---|---|---|
| `src/types/openapi/**` | **regen** (`generate-types-local`) after each IF/CO merge | all |
| `src/types/oids.ts` | **modify** — re-export any new OID props model `[JIT]` | 0b |
| `src/ducks/oids.ts` | (no change expected) verify additionalProperties pass-through | 0b |
| `src/utils/oid.ts` *(new)* | **create** — pure helpers: category-branch predicate, encoding options, default-critical normalizer | 0b |
| `src/utils/oid.spec.ts` *(new)* | **create** — Vitest unit tests for the helpers | 0b |
| `src/components/_pages/custom-oid/form/index.tsx` | **modify** — add `CertificateExtension` branch (defaultCritical, valueEncoding) | 0b |
| `src/components/_pages/custom-oid/detail/index.tsx` | **modify** — render extension props when category is `CertificateExtension` | 0b |
| `src/components/_pages/custom-oid/form/CustomOIDFormTestWrapper.tsx` *(new)* | **create** — CT mount wrapper | 0b |
| `src/components/_pages/custom-oid/form/index.spec.tsx` *(new)* | **create** — Playwright-CT tests | 0b |
| `src/utils/requestAttributes.ts` *(new)* | **create** — pure: `isRequestAttribute(descriptor)`, `fieldMappingSummary(descriptor)` | 1 |
| `src/utils/requestAttributes.spec.ts` *(new)* | **create** — Vitest unit tests | 1 |
| `src/components/RequestAttributes/RequestAttributeMappingBadge.tsx` *(new)* | **create** — reusable badge/help showing where a value lands | 1 |
| `src/components/RequestAttributes/RequestAttributeMappingBadge.spec.tsx` *(new)* | **create** — CT tests | 1 |
| `src/components/_pages/certificates/form/index.tsx` | **modify** — wire request-attribute descriptors + platform-key Mode A path | 1 |
| `src/ducks/certificates.ts` | **modify (verify)** — `getCsrAttributes` now returns fieldMapping-bearing descriptors `[JIT]` | 1 |
| `src/utils/raProfileValidation.ts` *(new)* | **create** — pure: strict/lenient request-validation form ↔ DTO mapping | 2 |
| `src/utils/raProfileValidation.spec.ts` *(new)* | **create** — Vitest unit tests | 2 |
| `src/components/_pages/ra-profiles/RequestValidationDialogBody.tsx` *(new)* | **create** — strict/lenient toggle (mirrors `CertificateValidationDialogBody`) | 2 |
| `src/components/_pages/ra-profiles/RequestValidationDialogBody.spec.tsx` *(new)* | **create** — CT tests | 2 |
| `src/components/_pages/ra-profiles/detail/index.tsx` | **modify** — surface strict/lenient + open dialog | 2 |
| `src/components/CertificateAttributes/**` or new compliance panel | **modify/create** — external-CSR compliance-error display | 2 |
| `src/utils/requestAttributeAuthoring.ts` *(new)* | **create** — pure: authoring form ↔ `RaProfileRequestAttribute` DTO; merge-mode + overlay mapping | 3 |
| `src/utils/requestAttributeAuthoring.spec.ts` *(new)* | **create** — Vitest unit tests | 3 |
| `src/components/RequestAttributes/RequestAttributeAuthoringEditor.tsx` *(new)* | **create** — reusable authoring editor (reuses custom-attribute authoring UX) | 3 |
| `src/components/RequestAttributes/RequestAttributeAuthoringEditor.spec.tsx` *(new)* | **create** — CT tests | 3 |
| `src/ducks/raProfileRequestAttributes.ts` *(new)* | **create** — slice for static set + overlay + default set | 3 |
| `src/ducks/raProfileRequestAttributes.spec.ts` *(new)* | **create** — Vitest reducer tests | 3 |
| `src/ducks/raProfileRequestAttributes-epics.ts` *(new)* | **create** — API epics `[JIT endpoints]` | 3 |
| `src/components/_pages/ra-profiles/form/index.tsx` | **modify** — add "Request Attributes" authoring tab | 3 |
| `src/components/_pages/platform-settings/requestAttributes/*` *(new)* | **create** — platform default-set editor page | 3 |
| `src/utils/certificateRegistration.ts` *(new)* | **create** — pure: register payload mapping; state predicates | 4 |
| `src/utils/certificateRegistration.spec.ts` *(new)* | **create** — Vitest unit tests | 4 |
| `src/ducks/certificates.ts` | **modify** — register action(s) + `PENDING_REGISTRATION`/`REGISTERED` handling `[JIT]` | 4 |
| `src/components/_pages/certificates/RegisterCertificateForm/*` *(new)* | **create** — register/placeholder UI + register→issue binding | 4 |
| `src/components/_pages/certificates/CertificateStatus/*` | **modify** — render new states | 4 |
| `src/utils/collectionValueSource.ts` *(new)* | **create** — pure: option loading + cascading param resolution | 6 |
| `src/utils/collectionValueSource.spec.ts` *(new)* | **create** — Vitest unit tests | 6 |
| `src/components/RequestAttributes/CollectionPicker.tsx` *(new)* | **create** — cascading select component | 6 |
| `src/components/RequestAttributes/CollectionPicker.spec.tsx` *(new)* | **create** — CT tests | 6 |
| `src/ducks/collections.ts` (+ `-epics.ts`, `.spec.ts`) *(new)* | **create** — collection list/values slice + epics `[JIT endpoints]` | 6 |

> Tests follow the repo conventions: **Vitest** files are `*.spec.ts` (logic in `ducks`/`utils`) or `*.unit.spec.tsx`; **Playwright-CT** files are `*.spec.tsx` (components), each with a sibling `*TestWrapper.tsx` that wires `Provider`/`MemoryRouter`/`FormProvider` (mirror `AttributeEditorTestWrapper.tsx`, `MultipleValueTextInputTestWrapper.tsx`).

---

# GROUP 0b — OID-registry: Certificate Extension category

**Spec §5 / §11; program-plan matrix 0b (FE cell).** Add the `CertificateExtension` category to the custom-OID create/edit form (`oid`, `name`, `defaultCritical`, `valueEncoding`) and to the detail view. The form already conditionally reveals fields for `OidCategory.RdnAttributeType` (`code`/`alternativeCode`); we add a parallel branch for `CertificateExtension`.

**[JIT: verify against IF Phase 0a/0b output]** — Before starting, regenerate types and confirm in `src/types/openapi`:
- `OidCategory` enum contains `CertificateExtension` (current values: `RdnAttributeType`, `ExtendedKeyUsage`, `Generic` — see `src/types/openapi/models/OidCategory.ts`).
- A `CertificateExtensionOidPropertiesDto` (shape `{ defaultCritical: boolean; valueEncoding: <Enc enum> }`) is a member of the `CustomOidEntryUpdateRequestDtoAdditionalProperties` / `CustomOidEntryDetailResponseDtoAdditionalProperties` unions (today those unions are just `RdnAttributeTypeOidPropertiesDto`).
- The value-encoding enum (`ExtensionValueEncoding` or equivalent) is exported and present in `PlatformEnum` (the form will populate the encoding dropdown from `enumSelectors.platformEnum(PlatformEnum.<encoding>)`, mirroring how the category dropdown reads `PlatformEnum.OidCategory`). Final enum membership is open (spec §16) — read the actual enum, do not hardcode the list.

## Task 0b.1 — pure OID helpers (Vitest, counts toward coverage)

**Files:** create `src/utils/oid.ts`, `src/utils/oid.spec.ts`.

- [ ] **Step 1 — failing test** `src/utils/oid.spec.ts`:
```ts
import { describe, expect, test } from 'vitest';
import { OidCategory } from 'types/openapi';
import { buildOidAdditionalProperties, isCertificateExtensionCategory } from './oid';

describe('oid helpers', () => {
    test('isCertificateExtensionCategory true only for CertificateExtension', () => {
        // [JIT] OidCategory.CertificateExtension must exist after 0a/0b type regen
        expect(isCertificateExtensionCategory(OidCategory.CertificateExtension)).toBe(true);
        expect(isCertificateExtensionCategory(OidCategory.RdnAttributeType)).toBe(false);
        expect(isCertificateExtensionCategory(OidCategory.Generic)).toBe(false);
    });

    test('buildOidAdditionalProperties returns rdn props for RdnAttributeType', () => {
        const props = buildOidAdditionalProperties(OidCategory.RdnAttributeType, {
            code: 'CN',
            altCodes: ['commonName'],
            defaultCritical: undefined,
            valueEncoding: undefined,
        });
        expect(props).toEqual({ code: 'CN', altCodes: ['commonName'] });
    });

    test('buildOidAdditionalProperties returns extension props for CertificateExtension', () => {
        const props = buildOidAdditionalProperties(OidCategory.CertificateExtension, {
            code: undefined,
            altCodes: undefined,
            defaultCritical: true,
            valueEncoding: 'DER',
        });
        expect(props).toEqual({ defaultCritical: true, valueEncoding: 'DER' });
    });

    test('buildOidAdditionalProperties returns undefined for Generic (no extra props)', () => {
        expect(
            buildOidAdditionalProperties(OidCategory.Generic, {
                code: undefined,
                altCodes: undefined,
                defaultCritical: undefined,
                valueEncoding: undefined,
            }),
        ).toBeUndefined();
    });

    test('CertificateExtension defaultCritical defaults to false when omitted', () => {
        const props = buildOidAdditionalProperties(OidCategory.CertificateExtension, {
            code: undefined,
            altCodes: undefined,
            defaultCritical: undefined,
            valueEncoding: 'UTF8String',
        });
        expect(props).toEqual({ defaultCritical: false, valueEncoding: 'UTF8String' });
    });
});
```
- [ ] **Step 2 — run, expect FAIL** (module missing):
  ```bash
  cd /Users/romancinkais/Development/GitHub-CZERTAINLY/fe-administrator && npm run test:vitest -- src/utils/oid.spec.ts
  ```
- [ ] **Step 3 — implement** `src/utils/oid.ts`:
```ts
import { OidCategory } from 'types/openapi';

export interface OidAdditionalPropertyInputs {
    code?: string;
    altCodes?: string[];
    defaultCritical?: boolean;
    valueEncoding?: string;
}

export const isCertificateExtensionCategory = (category: OidCategory | string | undefined): boolean =>
    category === OidCategory.CertificateExtension;

/**
 * Build the polymorphic `additionalProperties` payload for a custom-OID create/update,
 * keyed by category. Returns `undefined` for categories without extra properties.
 */
export function buildOidAdditionalProperties(
    category: OidCategory | string,
    inputs: OidAdditionalPropertyInputs,
): Record<string, unknown> | undefined {
    if (category === OidCategory.RdnAttributeType) {
        return { code: inputs.code, ...(inputs.altCodes?.length ? { altCodes: inputs.altCodes } : {}) };
    }
    if (isCertificateExtensionCategory(category)) {
        return { defaultCritical: inputs.defaultCritical ?? false, valueEncoding: inputs.valueEncoding };
    }
    return undefined;
}
```
  > Returning a plain object keeps the helper unit-testable; the form casts to the regenerated `CustomOidEntry*AdditionalProperties` union type at the call site `[JIT]`. The `RdnAttributeType` branch preserves today's exact behaviour (`{ code, altCodes? }`).
- [ ] **Step 4 — run, expect PASS** (same command).
- [ ] **Step 5 — commit** `feat(oid): add Certificate Extension additionalProperties helper`
  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  ```

## Task 0b.2 — custom-OID form: Certificate Extension branch

**Files:** modify `src/components/_pages/custom-oid/form/index.tsx`; create `src/components/_pages/custom-oid/form/CustomOIDFormTestWrapper.tsx`, `src/components/_pages/custom-oid/form/index.spec.tsx`.

- [ ] **Step 1 — failing CT test** `src/components/_pages/custom-oid/form/index.spec.tsx` (mirror `AttributeEditor/index.spec.tsx` + `MultipleValueTextInput.spec.tsx` patterns: import `test, expect` from `playwright/ct-test`, `mount` the wrapper). Note: page lives under `_pages/` so it is **Sonar-coverage-exempt** — these CT tests guard behaviour, the *covered* logic is in Task 0b.1's helper.
```tsx
import { test, expect } from '../../../../../playwright/ct-test';
import { CustomOIDFormTestWrapper } from './CustomOIDFormTestWrapper';

test.describe('CustomOIDForm — Certificate Extension category', () => {
    test('reveals defaultCritical + valueEncoding when CertificateExtension is selected', async ({ mount, page }) => {
        await mount(<CustomOIDFormTestWrapper />);
        // select category = Certificate Extension (label text comes from PlatformEnum.OidCategory) [JIT verify label]
        await page.getByTestId('select-categorySelect-input').selectOption({ label: 'Certificate Extension' });
        await expect(page.getByTestId('switch-defaultCritical')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('select-valueEncodingSelect')).toBeVisible();
        // RDN-only fields must NOT show for this category
        await expect(page.getByTestId('text-input-code')).toHaveCount(0);
    });

    test('hides extension fields for RDN Attribute Type (shows code instead)', async ({ mount, page }) => {
        await mount(<CustomOIDFormTestWrapper />);
        await page.getByTestId('select-categorySelect-input').selectOption({ label: 'RDN Attribute Type' });
        await expect(page.getByTestId('text-input-code')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('switch-defaultCritical')).toHaveCount(0);
    });
});
```
  > `CustomOIDFormTestWrapper.tsx` mounts `<CustomOIDForm onCancel={() => {}} />` inside `Provider` (`createMockStore` from `utils/test-helpers`, preloading `enums.platformEnums` with the `OidCategory` + value-encoding enums) + `MemoryRouter`. **[JIT: verify the exact `data-testid` strings]** — `Select` renders `select-<id>` / `select-<id>-input` (see `select-categorySelect`/`select-selectAddCustomAttribute-input` in existing specs); `Switch` renders `switch-<id>` (see `Switch/index.tsx`). Use whichever testids the current components emit.
- [ ] **Step 2 — run, expect FAIL**:
  ```bash
  cd /Users/romancinkais/Development/GitHub-CZERTAINLY/fe-administrator && npm run test:chromium -- src/components/_pages/custom-oid/form/index.spec.tsx
  ```
- [ ] **Step 3 — implement** in `src/components/_pages/custom-oid/form/index.tsx`:
  - Extend `FormValues` with `defaultCritical?: boolean` and `valueEncoding?: string`.
  - Add a value-encoding enum selector: `const valueEncodingEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.<Encoding>));` and build `valueEncodingOptions` exactly as `categoryList` is built `[JIT enum name]`.
  - In `defaultValues`, seed from `oid?.additionalProperties?.defaultCritical` / `?.valueEncoding` (cast to the regenerated union `[JIT]`).
  - In `onSubmit`, replace the inline `RdnAttributeType`-only `additionalProperties` spread with a single call:
    ```tsx
    const additionalProperties = buildOidAdditionalProperties(values.category, {
        code: values.code,
        altCodes: values.alternativeCode ?? undefined,
        defaultCritical: values.defaultCritical,
        valueEncoding: values.valueEncoding,
    }) as CustomOidEntryUpdateRequestDtoAdditionalProperties | undefined;   // [JIT union member]
    const newOID = { oid: values.oid, displayName: values.displayName, description: values.description,
                     category: values.category as OidCategory, ...(additionalProperties ? { additionalProperties } : {}) };
    ```
  - Add a `{watchedCategory === OidCategory.CertificateExtension && (...)}` block, parallel to the existing `RdnAttributeType` block, containing:
    - a `Controller name="defaultCritical"` rendering `<Switch id="defaultCritical" label="Default Critical" .../>` (default `false`);
    - a `Controller name="valueEncoding"` (rule `validateRequired()`) rendering `<Select id="valueEncodingSelect" label="Value Encoding" options={valueEncodingOptions} .../>`.
  - Import `buildOidAdditionalProperties` from `utils/oid`, `Switch` from `components/Switch`.
  > Reuse the file's existing `react-hook-form` Controller/`buildValidationRules`/`getFieldErrorMessage`/`Select`/`TextInput` patterns verbatim — no new form library, no AI-smell helper sprawl (DoD).
- [ ] **Step 4 — run, expect PASS** (same command); also run the existing `npm run test:chromium` to confirm no regression in the RDN branch.
- [ ] **Step 5 — commit** `feat(custom-oid): add Certificate Extension category (defaultCritical, valueEncoding)` + Co-Authored-By trailer.

## Task 0b.3 — custom-OID detail: render extension properties

**Files:** modify `src/components/_pages/custom-oid/detail/index.tsx`.

- [ ] **Step 1 — failing test:** add to the existing detail flow a CT test (or extend 0b.2's spec set with a detail wrapper) asserting that when `oid.category === CertificateExtension`, the "Additional Properties" widget shows `Default Critical` and `Value Encoding` rows. Today `showAdditionalProperties` is hardcoded to `oid.category === OidCategory.RdnAttributeType` and `additionalPropertiesData` only emits `Code`/`Alternative Codes`.
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implement:** broaden `showAdditionalProperties` to also return `true` for `isCertificateExtensionCategory(oid.category)`; make `additionalPropertiesData` category-aware:
  ```tsx
  const additionalPropertiesData = useMemo<TableDataRow[]>(() => {
      if (!oid) return [];
      if (isCertificateExtensionCategory(oid.category)) {
          return [
              createTableDataRow('Default Critical', String(oid.additionalProperties?.defaultCritical ?? false)),
              createTableDataRow('Value Encoding', oid.additionalProperties?.valueEncoding),  // [JIT field]
          ];
      }
      return [
          createTableDataRow('Code', oid.additionalProperties?.code),
          createTableDataRow('Alternative Codes', oid.additionalProperties?.altCodes?.join(', ')),
      ];
  }, [oid]);
  ```
  Import `isCertificateExtensionCategory` from `utils/oid`.
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** `feat(custom-oid): render Certificate Extension properties on detail` + trailer.

## Group 0b verification
- [ ] `npm run lint && npm run test:vitest -- src/utils/oid.spec.ts && npm run test:chromium -- src/components/_pages/custom-oid` green.
- [ ] New-code coverage ≥80% (the covered surface is `src/utils/oid.ts`; the `_pages` form/detail are Sonar-coverage-exempt but still CT-guarded).
- [ ] Types regenerated and committed; no hand-edited files under `src/types/openapi/**`.
- [ ] Copilot review → SHIP, all findings fixed. PR → green Sonar gate → merge.

---

# GROUP 1 — Dynamic request-attribute issue form + generate-CSR-with-platform-key

**Spec §4.1, §6, §7 (Mode A); program-plan matrix 1 (FE cell).** The issue form (`src/components/_pages/certificates/form/index.tsx`) already has the two ingredients:
1. A **"Request Attributes" tab** rendering `<AttributeEditor id="csrAttributes" attributeDescriptors={csrAttributeDescriptors} .../>` — fed by `certificateActions.getCsrAttributes()` → `certificateSelectors.csrAttributeDescriptors`.
2. The **platform-key flow** ("Existing Key" source → `RenderTokenProfile` + `RenderRequestKey`, vs "External" source → CSR upload + parse).

Because `AttributeEditor`/`AttributeFieldInput` already render `properties.label` (friendly name), `required`, `description`, and regexp-constraint pattern/help for any `DataAttribute`, **the request-attribute set renders for free once the backend returns fieldMapping-bearing descriptors** on the CSR-attributes endpoint. The net-new FE surface is a small affordance that surfaces *where a value lands* (the `fieldMapping`) so operators understand "Server FQDN → CN + dNSName", plus verifying the Mode A submit path.

**[JIT: verify against CO Phase 1 + IF Phase 0a output]:**
- `DataAttributeModel` (derived from generated `DataAttribute`) now carries `fieldMapping` after regen (it's an `Omit<DataAttributeDto, ...>` so the new field flows through automatically).
- `certificateSelectors.csrAttributeDescriptors` returns the **resolved request-attribute set** (with friendly labels + `fieldMapping` + constraints) for the selected RA Profile context. Confirm whether the endpoint becomes RA-Profile-scoped (today `getCsrAttributes()` takes no args) — if Phase 1 changes the contract, update the dispatch in the form accordingly `[JIT]`.

## Task 1.1 — pure request-attribute helpers (Vitest)

**Files:** create `src/utils/requestAttributes.ts`, `src/utils/requestAttributes.spec.ts`.

- [ ] **Step 1 — failing test** `src/utils/requestAttributes.spec.ts`:
```ts
import { describe, expect, test } from 'vitest';
import { AttributeContentType, AttributeType } from 'types/openapi';
import type { DataAttributeModel } from 'types/attributes';
import { isRequestAttribute, fieldMappingSummary } from './requestAttributes';

function dataAttr(fieldMapping?: unknown): DataAttributeModel {
    return {
        type: AttributeType.Data, name: 'serverFqdn', uuid: 'u1', contentType: AttributeContentType.String,
        properties: { label: 'Server FQDN', required: true, readOnly: false, visible: true, list: false, multiSelect: false },
        ...(fieldMapping ? { fieldMapping } : {}),
    } as unknown as DataAttributeModel;
}

describe('requestAttributes helpers', () => {
    test('isRequestAttribute true only when a non-empty fieldMapping is present', () => {
        // [JIT] fieldMapping shape from IF Phase 0a: { objectType, fields: [{ fieldKind, rdn?, generalNameType?, extensionOid? }] }
        expect(isRequestAttribute(dataAttr({ objectType: 'X509_CERTIFICATE', fields: [{ fieldKind: 'RDN', rdn: 'CN' }] }))).toBe(true);
        expect(isRequestAttribute(dataAttr())).toBe(false);
        expect(isRequestAttribute(dataAttr({ objectType: 'X509_CERTIFICATE', fields: [] }))).toBe(false);
    });

    test('fieldMappingSummary renders a human label of target fields', () => {
        const summary = fieldMappingSummary(
            dataAttr({ objectType: 'X509_CERTIFICATE', fields: [{ fieldKind: 'RDN', rdn: 'CN' }, { fieldKind: 'SAN', generalNameType: 'DNS_NAME' }] }),
        );
        expect(summary).toContain('CN');
        expect(summary).toContain('DNS');
    });

    test('fieldMappingSummary returns empty string for non-request attribute', () => {
        expect(fieldMappingSummary(dataAttr())).toBe('');
    });
});
```
- [ ] **Step 2 — run, expect FAIL**:
  ```bash
  cd /Users/romancinkais/Development/GitHub-CZERTAINLY/fe-administrator && npm run test:vitest -- src/utils/requestAttributes.spec.ts
  ```
- [ ] **Step 3 — implement** `src/utils/requestAttributes.ts` — read `descriptor.fieldMapping` defensively (the generated type member name is `[JIT]`; treat as optional), return `true` when `fields?.length > 0`; `fieldMappingSummary` joins each field's human token (RDN code, SAN general-name type, extension OID). Keep it pure and string-only; no JSX. **Do not** hardcode the `FieldKind`/`GeneralNameType` enum string set — read the values off the mapping. Mark the `fieldMapping` member access `[JIT: align with generated DataAttribute.fieldMapping]`.
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** `feat(request-attrs): add fieldMapping detection + summary helpers` + trailer.

## Task 1.2 — `RequestAttributeMappingBadge` reusable component (CT, counts toward coverage)

**Files:** create `src/components/RequestAttributes/RequestAttributeMappingBadge.tsx`, `.spec.tsx`. (Placed under `components/`, **not** `_pages/`, so it counts toward Sonar coverage.)

- [ ] **Step 1 — failing CT test** asserting: given a request-attribute descriptor, the badge shows the mapping summary; given a non-request attribute, it renders nothing.
- [ ] **Step 2 — run, expect FAIL** (`npm run test:chromium -- src/components/RequestAttributes/RequestAttributeMappingBadge.spec.tsx`).
- [ ] **Step 3 — implement** a tiny presentational component using the existing `Badge`/`Tooltip` components and `fieldMappingSummary` from Task 1.1; returns `null` when `!isRequestAttribute(descriptor)`. Reuse `components/Badge`, `components/Tooltip` (existing).
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** `feat(request-attrs): add mapping badge component` + trailer.

## Task 1.3 — wire request attributes + Mode A submit into the issue form

**Files:** modify `src/components/_pages/certificates/form/index.tsx` (Sonar-coverage-exempt page; CT-guarded).

- [ ] **Step 1 — failing CT test** (extend or add `index.spec.tsx` for the cert form via a wrapper): with `csrAttributeDescriptors` containing a request attribute (label "Server FQDN", `required`, a regexp constraint) and "Existing Key" source + a token profile selected, assert the "Request Attributes" tab shows the friendly label + the mapping badge, and the field is required-marked. **[JIT: confirm a feasible CT mount]** — the cert form pulls many selectors; if a full mount is too heavy, prefer testing the rendered request-attribute affordance via the `AttributeEditor` + `RequestAttributeMappingBadge` composition in a focused wrapper rather than mounting the whole page (DoD: avoid brittle mock-only page tests; pages are coverage-exempt anyway).
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implement:**
  - Render `<RequestAttributeMappingBadge descriptor={d} />` next to request-attribute fields in the "Request Attributes" tab (e.g. by mapping over `csrAttributeDescriptors` to annotate, or by composing the badge into the tab header/help). Keep `AttributeEditor` as the field renderer.
  - **Mode A submit path:** the existing `submitCallback` already assembles `csrAttributes` via `collectFormAttributes('csrAttributes', csrAttributeDescriptors, combinedValues)` and sends them on `signRequest` with `keyUuid`/`tokenProfileUuid` (platform key) — this is the Mode A wire. Verify the request-attribute values are collected under the `csrAttributes` editor id and included; adjust the descriptor source if Phase 1 made the endpoint RA-Profile-scoped `[JIT]`. **Do not** change the External (Mode B) branch here (that is Group 2).
  - Friendly labels/constraints require **no editor change** — `AttributeFieldInput` already renders `properties.label`, `required`, `description`, and `getRegexpConstraint` pattern/help.
- [ ] **Step 4 — run, expect PASS**; run full `npm run test:chromium -- src/components/_pages/certificates` to confirm no issue-form regression.
- [ ] **Step 5 — commit** `feat(certificates): surface request-attribute mapping on platform-key issue (Mode A)` + trailer.

## Group 1 verification
- [ ] `npm run lint && npm run test:vitest -- src/utils/requestAttributes.spec.ts && npm run test:chromium -- src/components/RequestAttributes src/components/_pages/certificates` green.
- [ ] New-code coverage ≥80% on `src/utils/requestAttributes.ts` + `src/components/RequestAttributes/RequestAttributeMappingBadge.tsx`.
- [ ] Types regenerated/committed; Copilot SHIP; PR → green gate → merge.

---

# GROUP 2 — Strict/lenient RA-Profile toggle + external-CSR compliance display

**Spec §7 (Mode B), §8 (Validate reverse), §13.3; program-plan matrix 2 (FE cell).** Two surfaces:
1. **RA-Profile strict/lenient toggle** — a per-RA-Profile setting governing whether an external CSR that violates the request-attribute set is rejected (strict) or accepted-with-warnings (lenient). Mirror the existing `CertificateValidationDialogBody.tsx` + `RaProfileCertificateValidationSettings*` pattern (a dialog opened from the RA-Profile detail page, `usePlatformSettings` + `enabled`-style booleans).
2. **External-CSR compliance-error display** — on the issue form's "External" source, when the backend rejects/annotates a CSR against the set, show the structured compliance errors (today the form shows `parseError` + `CertificateAttributes csr`).

**[JIT: verify against CO Phase 2 + IF Phase 2 output]:**
- The RA-Profile DTOs gain a request-validation field (strict/lenient). Confirm exact DTO field name + whether it lands on `RaProfileDto` / a dedicated settings DTO (mirroring `RaProfileCertificateValidationSettingsDto`). Re-export in `src/types/ra-profiles.ts`.
- The external-CSR submit error carries a **structured** compliance-error payload (not a raw string). Confirm its shape (list of `{ field, message, severity }` or similar) so the display can list per-field violations. Until then, mark the display mapping `[JIT]`.

## Task 2.1 — pure strict/lenient mapping (Vitest)

**Files:** create `src/utils/raProfileValidation.ts`, `.spec.ts`.

- [ ] **Step 1 — failing test:** form values `{ mode: 'STRICT' | 'LENIENT', usePlatformDefault: boolean }` ↔ the request-validation DTO `[JIT field names]`; round-trip + defaults (e.g. default `STRICT`, platform-default true). Cover both directions and the platform-default short-circuit.
- [ ] **Step 2 — run, expect FAIL** (`npm run test:vitest -- src/utils/raProfileValidation.spec.ts`).
- [ ] **Step 3 — implement** the pure mapping functions `toRequestValidationDto(form)` / `fromRequestValidationDto(dto)`. No React. Mark DTO field accesses `[JIT]`.
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** `feat(ra-profiles): add strict/lenient request-validation mapping` + trailer.

## Task 2.2 — `RequestValidationDialogBody` (CT)

**Files:** create `src/components/_pages/ra-profiles/RequestValidationDialogBody.tsx`, `.spec.tsx`. (Logic already lives in Task 2.1's util; this is the dialog body, mirroring `CertificateValidationDialogBody.tsx`.)

- [ ] **Step 1 — failing CT test:** mount the dialog body; assert a strict/lenient `Select` (or `Switch`) renders, defaults per `fromRequestValidationDto`, and a save calls the provided `onSave` with the `toRequestValidationDto` payload.
- [ ] **Step 2 — run, expect FAIL** (`npm run test:chromium -- src/components/_pages/ra-profiles/RequestValidationDialogBody.spec.tsx`).
- [ ] **Step 3 — implement** the dialog body using `react-hook-form` + `Select`/`Switch` + `ProgressButton`, reading/writing via Task 2.1 helpers. Dispatch the RA-Profile update via the existing `ra-profiles` duck action `[JIT new action if a dedicated settings endpoint exists]`.
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** `feat(ra-profiles): strict/lenient request-validation dialog` + trailer.

## Task 2.3 — RA-Profile detail: surface the toggle

**Files:** modify `src/components/_pages/ra-profiles/detail/index.tsx`.

- [ ] **Step 1 — failing CT test:** detail page shows the request-validation mode and a button opening `RequestValidationDialogBody`. (Page is coverage-exempt; CT-guarded.)
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implement:** add a "Request Validation" row/widget + an edit button wired to the dialog (mirror how certificate-validation settings are surfaced on the detail page).
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** `feat(ra-profiles): show request-validation mode on detail` + trailer.

## Task 2.4 — external-CSR compliance-error display on the issue form

**Files:** create `src/components/RequestAttributes/ComplianceErrorsPanel.tsx` (+ `.spec.tsx`) under `components/` (covered); modify `src/components/_pages/certificates/form/index.tsx` to render it on the External branch.

- [ ] **Step 1 — failing CT test** for `ComplianceErrorsPanel`: given a structured compliance-error list, it renders each violation with its field + message + severity; given an empty/undefined list it renders nothing.
- [ ] **Step 2 — run, expect FAIL** (`npm run test:chromium -- src/components/RequestAttributes/ComplianceErrorsPanel.spec.tsx`).
- [ ] **Step 3 — implement** `ComplianceErrorsPanel` (presentational; reuse `components/Alerts` styling). Then in the cert form's External branch, render `<ComplianceErrorsPanel errors={...} />` from the issue/parse-failure selector `[JIT: confirm where the structured errors land — `parseError` is a string today; Phase 2 must surface a structured field]`. Ensure the displayed text is the backend's shaped message only (spec §12.4 — no raw exception detail; the backend gates this, FE just renders).
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** `feat(certificates): display external-CSR compliance errors (Mode B)` + trailer.

## Group 2 verification
- [ ] `npm run lint && npm run test:vitest -- src/utils/raProfileValidation.spec.ts && npm run test:chromium -- src/components/RequestAttributes src/components/_pages/ra-profiles` green.
- [ ] New-code coverage ≥80% on `src/utils/raProfileValidation.ts` + `src/components/RequestAttributes/ComplianceErrorsPanel.tsx`.
- [ ] Types regenerated/committed; Copilot SHIP; PR → green gate → merge.

---

# GROUP 3 — RA-Profile Request-attributes authoring + platform default-set + overlay editor

**Spec §4.3, §4.5, §4.6; program-plan matrix 3 (FE cell).** Three authoring surfaces, all reusing the **custom-attribute authoring UX** (spec §4.5 — "Reuses the `BaseAttribute` definition shape … and the custom-attribute authoring UX"):
1. **RA-Profile static request-attribute set** — a new "Request Attributes" tab on the RA-Profile form that authors platform-owned `RaProfileRequestAttribute` definitions (label, contentType, constraints, `fieldMapping`, optional `valueSource`).
2. **Platform default-set editor** — the same authoring editor under `platform-settings` for the platform-wide default set (becomes admin-editable in Phase 3 per spec §14/§16).
3. **Connector-overlay editor** — attach a `valueSource` overlay (`RaProfileAttributeOverlay`) to a dynamically-fetched connector definition, keyed by name/uuid (spec §4.6).

The existing custom-attribute authoring lives in `src/components/_pages/custom-attributes/form/index.tsx` (study it for the BaseAttribute-shape authoring UX) and `src/components/Attributes/AttributeDescriptorViewer`.

**[JIT: verify against CO Phase 3 + IF Phase 3 output]:**
- `RaProfileRequestAttribute` DTOs (static-set definition shape — `BaseAttribute` + `fieldMapping` + `valueSource`), `RaProfileAttributeOverlay` DTOs (`{ raProfileUuid, attributeUuid|attributeName, valueSourceKind, collectionRef, params }`), and the platform default-set DTOs/endpoints. Re-export in a new `src/types/requestAttributes.ts` from the regenerated models.
- The merge-mode enum (`STATIC_ONLY | CONNECTOR_ONLY | MERGE`) and the `ValueSourceKind` enum (`NONE | CONNECTOR_CALLBACK | COLLECTION | STATIC_LIST`).

## Task 3.1 — pure authoring mapping (Vitest)

**Files:** create `src/utils/requestAttributeAuthoring.ts`, `.spec.ts`.

- [ ] **Step 1 — failing test:** map authoring form state → `RaProfileRequestAttribute` DTO and back; build a `RaProfileAttributeOverlay` from `{ attribute, valueSourceKind, collectionRef, params }`; default merge-mode = `MERGE`. Cover the `valueSource` branch (`COLLECTION` requires `collectionRef`; `NONE` omits it) and the name-vs-uuid overlay key fallback (spec §4.3/§4.6).
- [ ] **Step 2 — run, expect FAIL** (`npm run test:vitest -- src/utils/requestAttributeAuthoring.spec.ts`).
- [ ] **Step 3 — implement** the pure mappers. Mark all DTO field/enum accesses `[JIT]`.
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** `feat(request-attrs): authoring + overlay DTO mapping` + trailer.

## Task 3.2 — request-attribute ducks (Vitest)

**Files:** create `src/ducks/raProfileRequestAttributes.ts`, `.spec.ts`, and `-epics.ts`.

- [ ] **Step 1 — failing reducer test** (mirror `src/ducks/oids.spec.ts`): `list/get/upsert/delete` for the static set, the overlay, and the default set — assert loading flags + success/failure transitions and `resetState`.
- [ ] **Step 2 — run, expect FAIL** (`npm run test:vitest -- src/ducks/raProfileRequestAttributes.spec.ts`).
- [ ] **Step 3 — implement** the slice (RTK `createSlice`, mirror `oids.ts` exactly: `State`, `initialState`, reducers, `createSelector`s, `selectors`, `actions`). Implement `-epics.ts` against the real endpoints `[JIT: verify endpoint methods on the regenerated `*Api` client and the `api.ts` registration]`. Ducks are coverage-included — keep epics thin and reducers fully tested.
- [ ] **Step 4 — run, expect PASS** (reducers); epics verified at integration time.
- [ ] **Step 5 — commit** `feat(request-attrs): ra-profile request-attribute + overlay + default-set duck` + trailer.

## Task 3.3 — `RequestAttributeAuthoringEditor` (CT)

**Files:** create `src/components/RequestAttributes/RequestAttributeAuthoringEditor.tsx`, `.spec.tsx` (under `components/`, covered).

- [ ] **Step 1 — failing CT test:** mount the editor with an initial set; assert it lists authored request attributes, supports add (label/contentType/constraint/`fieldMapping` target/`valueSource`), edit, remove, and emits the mapped DTO via `onChange`/`onSave` (using Task 3.1 helpers). Reuse the custom-attribute authoring fields.
- [ ] **Step 2 — run, expect FAIL** (`npm run test:chromium -- src/components/RequestAttributes/RequestAttributeAuthoringEditor.spec.tsx`).
- [ ] **Step 3 — implement** the editor by composing the existing custom-attribute authoring UX (study `_pages/custom-attributes/form`) plus a `fieldMapping` target picker (objectType=X509 fixed for now; FieldKind=RDN/SAN/EXTENSION; target OID/code/general-name-type) and an optional `valueSource` selector (`NONE`/`STATIC_LIST`/`COLLECTION` — `COLLECTION` ref input is a stub here, fully wired in Group 6). Keep all mapping logic in Task 3.1's util.
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** `feat(request-attrs): authoring editor component` + trailer.

## Task 3.4 — RA-Profile form: "Request Attributes" tab; platform default-set page

**Files:** modify `src/components/_pages/ra-profiles/form/index.tsx`; create `src/components/_pages/platform-settings/requestAttributes/index.tsx` (+ route in `AppRouter.tsx`). Both `_pages` → coverage-exempt; CT-guarded.

- [ ] **Step 1 — failing CT test:** RA-Profile form shows a third `TabLayout` tab "Request Attributes" rendering `RequestAttributeAuthoringEditor`; the platform-settings page renders the same editor bound to the default-set duck actions.
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implement:** add the tab to the RA-Profile form's `TabLayout` (alongside "Connector Attributes"/"Custom Attributes"), wired to `raProfileRequestAttributes` duck; on submit, include the static set + overlay in the RA-Profile update payload `[JIT: confirm whether the static set is part of the RA-Profile edit DTO or a separate endpoint]`. Create the platform default-set page + register a route (mirror existing `platform-settings` pages and `AppRouter` `Resource`-keyed routes).
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** `feat(ra-profiles): request-attribute authoring tab + platform default-set editor` + trailer.

## Group 3 verification
- [ ] `npm run lint && npm run test:vitest -- src/utils/requestAttributeAuthoring.spec.ts src/ducks/raProfileRequestAttributes.spec.ts && npm run test:chromium -- src/components/RequestAttributes src/components/_pages/ra-profiles src/components/_pages/platform-settings` green.
- [ ] New-code coverage ≥80% on the util + duck + `RequestAttributeAuthoringEditor`.
- [ ] Types regenerated/committed; Copilot SHIP; PR → green gate → merge.

---

# GROUP 4 — Register/placeholder UI + register→issue binding + PENDING_REGISTRATION/REGISTERED states

**Spec §7 (Mode E register, Mode C register-bound issue), §9 (register `meta` persistence, operations flow); program-plan matrix 4 (FE cell).** Three surfaces:
1. **Register/placeholder UI** — a "Register" flow that creates a placeholder certificate record from preconfigured request attributes (no CSR, no key — Mode E). It reuses the request-attribute editor for the preconfigured set.
2. **Register→issue binding** — from a `REGISTERED` placeholder, an "Issue" action that submits the bound issue (Mode C — CSR for key/POP + the authoritative identity from the registration; the register `meta` is replayed by the backend).
3. **New certificate states** — render `PENDING_REGISTRATION` and `REGISTERED` in the certificate status badge + list/detail.

**[JIT: verify against CO Phase 4 + IF Phase 4 output]:**
- `CertificateState` (or `CertificateStatus`) enum additions `PENDING_REGISTRATION`, `REGISTERED` in the regenerated types + their `PlatformEnum` entries (the status badge reads enum labels).
- The register endpoint + `requestContent`/register DTOs; the certificate `register` and register-bound `issue` actions on the `certificates` duck `[JIT]`.
- The RA-Profile / authority capability that gates whether register is available (`CERTIFICATE_REGISTRATION`) — used to show/hide the Register action.

## Task 4.1 — pure registration mapping + state predicates (Vitest)

**Files:** create `src/utils/certificateRegistration.ts`, `.spec.ts`.

- [ ] **Step 1 — failing test:** build the register payload from preconfigured request-attribute values (no CSR/key); `isRegistered(state)`, `isPendingRegistration(state)`, `canIssueFromRegistration(state)` predicates over the new enum values `[JIT enum]`; the register-bound issue payload mapping.
- [ ] **Step 2 — run, expect FAIL** (`npm run test:vitest -- src/utils/certificateRegistration.spec.ts`).
- [ ] **Step 3 — implement** the pure mappers + predicates. Mark enum/DTO accesses `[JIT]`.
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** `feat(certificates): registration payload mapping + state predicates` + trailer.

## Task 4.2 — certificate duck: register + bound issue + new states (Vitest)

**Files:** modify `src/ducks/certificates.ts`; extend `src/ducks/certificates.spec.ts` (or create if absent).

- [ ] **Step 1 — failing reducer test:** new `registerCertificate` / `registerCertificateSuccess|Failure` (+ a bound-issue action if separate) toggling an `isRegistering` flag; verify the success stores the placeholder.
- [ ] **Step 2 — run, expect FAIL** (`npm run test:vitest -- src/ducks/certificates.spec.ts`).
- [ ] **Step 3 — implement** the reducers + selectors (mirror the existing `issueCertificate*` reducers in `certificates.ts`); add the epic against the register endpoint `[JIT endpoint]`.
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** `feat(certificates): register action + state handling` + trailer.

## Task 4.3 — status badge + Register/Issue UI (CT)

**Files:** modify `src/components/_pages/certificates/CertificateStatus/*` and certificate list/detail; create `src/components/_pages/certificates/RegisterCertificateForm/*` (page; coverage-exempt; CT-guarded). Any reusable state→variant logic goes in a covered util.

- [ ] **Step 1 — failing CT tests:** (a) the status badge renders `PENDING_REGISTRATION`/`REGISTERED` with distinct variants `[JIT label/variant]`; (b) the Register form mounts the preconfigured request-attribute editor and submits via the duck; (c) a `REGISTERED` certificate detail shows an "Issue" action enabled by `canIssueFromRegistration`.
- [ ] **Step 2 — run, expect FAIL.**
- [ ] **Step 3 — implement:** extend the status component (read new enum labels), create `RegisterCertificateForm` (reuse `RequestAttributeAuthoringEditor`/`AttributeEditor` for the preconfigured set), add the register→issue binding action on detail. Put any state→badge-variant mapping in `src/utils/certificateRegistration.ts` (covered) and import it.
- [ ] **Step 4 — run, expect PASS**; full `npm run test:chromium -- src/components/_pages/certificates` green.
- [ ] **Step 5 — commit** `feat(certificates): register/placeholder UI + register→issue binding + new states` + trailer.

## Group 4 verification
- [ ] `npm run lint && npm run test:vitest -- src/utils/certificateRegistration.spec.ts src/ducks/certificates.spec.ts && npm run test:chromium -- src/components/_pages/certificates` green.
- [ ] New-code coverage ≥80% on `src/utils/certificateRegistration.ts` + the duck additions.
- [ ] Types regenerated/committed; Copilot SHIP; PR → green gate → merge.

---

# GROUP 6 — Collection-backed pickers (cascading selects)

**Spec §4.6, §14-Phase6; program-plan matrix 6 (FE cell).** Add the `COLLECTION` value-source provider UI: a request attribute whose `valueSource.kind === COLLECTION` is rendered as a select preloaded from a registered collection, with optional **cascading** dependency params (e.g. datacenter → server list). Composes with `fieldMapping` (the chosen value still projects to the mapped field).

**[JIT: verify against CO Phase 6 + IF Phase 6 output]:**
- The collection list/values endpoints and DTOs (`collectionRef`, the value page shape) on the regenerated `*Api`.
- `valueSource.params` cascading-dependency shape (mirrors callback `mappings`, per spec §4.6).

## Task 6.1 — pure collection/cascade resolution (Vitest)

**Files:** create `src/utils/collectionValueSource.ts`, `.spec.ts`.

- [ ] **Step 1 — failing test:** `resolveCascadeFilters(valueSource, currentFormValues)` → the request filter for the dependent collection; `shouldReload(prevFilters, nextFilters)`; option-mapping from a collection value page to `{ label, value }[]`. Cover the no-dependency case and a two-level cascade (datacenter→server).
- [ ] **Step 2 — run, expect FAIL** (`npm run test:vitest -- src/utils/collectionValueSource.spec.ts`).
- [ ] **Step 3 — implement** the pure functions. Mark DTO accesses `[JIT]`.
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** `feat(collections): cascade-filter + option mapping helpers` + trailer.

## Task 6.2 — collections duck (Vitest)

**Files:** create `src/ducks/collections.ts`, `.spec.ts`, `-epics.ts`.

- [ ] **Step 1 — failing reducer test:** `listCollections` and `loadCollectionValues({ collectionRef, filters })` with loading flags + success/failure; keyed cache by `collectionRef`+filter signature.
- [ ] **Step 2 — run, expect FAIL** (`npm run test:vitest -- src/ducks/collections.spec.ts`).
- [ ] **Step 3 — implement** the slice (mirror `oids.ts`) + epics `[JIT endpoints]`.
- [ ] **Step 4 — run, expect PASS** (reducers).
- [ ] **Step 5 — commit** `feat(collections): collection list/values duck` + trailer.

## Task 6.3 — `CollectionPicker` cascading select (CT)

**Files:** create `src/components/RequestAttributes/CollectionPicker.tsx`, `.spec.tsx` (covered).

- [ ] **Step 1 — failing CT test:** mount with a `COLLECTION` value-source; assert it renders a `Select` populated from the (mocked) collection values, and that changing a parent field reloads the dependent options (cascade) per `resolveCascadeFilters`/`shouldReload`.
- [ ] **Step 2 — run, expect FAIL** (`npm run test:chromium -- src/components/RequestAttributes/CollectionPicker.spec.tsx`).
- [ ] **Step 3 — implement** `CollectionPicker` using `components/Select`, the `collections` duck, and Task 6.1 helpers; integrate it into the request-attribute rendering path so an attribute with `valueSource.kind === COLLECTION` uses the picker instead of a free input (in the editor composition from Groups 1/3). Keep resolution logic in the util.
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — commit** `feat(collections): collection-backed cascading picker` + trailer.

## Group 6 verification
- [ ] `npm run lint && npm run test:vitest -- src/utils/collectionValueSource.spec.ts src/ducks/collections.spec.ts && npm run test:chromium -- src/components/RequestAttributes/CollectionPicker.spec.tsx` green.
- [ ] New-code coverage ≥80% on the util + duck + `CollectionPicker`.
- [ ] Types regenerated/committed; Copilot SHIP; PR → green gate → merge.

---

## Final verification (run before each group's PR; full suite before the last merge)

- [ ] **Lint/format:** `npm run lint` clean (Biome). `npm run format:check` clean.
- [ ] **Unit (Vitest):** `npm run test:vitest` green (all new `src/utils/**` + `src/ducks/**` logic).
- [ ] **Component (Playwright-CT):** `npm run test:chromium` green (re-runs `clean-lcov.js`); optionally `test:firefox`/`test:webkit` per CI.
- [ ] **Coverage (DoD ≥80% new-code, line+branch):**
  - `npm run test:vitest:cov` → `./coverage-vitest/lcov.info`; `npm run test:chromium` → `./coverage-playwright/lcov.info`.
  - Both feed Sonar via `sonar.javascript.lcov.reportPaths`. Replicate the gate locally over `git diff origin/<base>...HEAD`, applying `sonar.coverage.exclusions` (**`src/components/_pages/**`, `src/types/openapi/**`, `*.spec.*`, `*WithStore.tsx`, `src/utils/test-helpers.tsx`, configs** — full list in `sonar-project.properties`). This is why all testable logic was placed in `src/utils/**`, `src/ducks/**`, and reusable `src/components/RequestAttributes/**` (covered), not in `_pages/*`.
  - `new_coverage = (covered_lines + covered_branches) / (lines_to_cover + branches_to_cover)` — count branches, not lines only.
- [ ] **Types:** `src/types/openapi/**` regenerated from the merged Core OpenAPI (`generate-types-local`, `JAVA_HOME=$(/usr/libexec/java_home -v 21)`) and committed; **no** hand-edits to generated files. Every `[JIT]` marker resolved against the actual regenerated model/enum.
- [ ] **a11y:** new interactive controls use the existing accessible components (`Select`, `Switch`, `TextInput`, `Label htmlFor`, `Dialog`) with labels/`data-testid`; tooltips have accessible text; no raw `<div onClick>` for actionable controls.
- [ ] **No new Sonar issues; duplication <3%.** Recurring findings fixed structurally, not suppressed.
- [ ] **Dependencies:** no new CRITICAL/HIGH-vuln deps (`npm audit` / CI scan clean); reuse existing libs — **no new runtime dependency is required by this plan**.
- [ ] **Copilot review** on each group's diff, iterated to **SHIP**, every finding fixed.
- [ ] **Branching/PR:** all work on `feature/request-attributes-fe` (+ per-group sub-branches), never on the repo's current branch directly; PR → green Sonar + Copilot → merge, in dependency order (0b → 1 → 2 → 3 → 4 → 6, contract-first).

## Self-Review

- **Spec coverage:** 0b = OID Certificate-Extension category (§5/§11); 1 = dynamic request-attribute issue form + platform-key Mode A (§4.1/§6/§7); 2 = strict/lenient + external-CSR compliance (§7-B/§8); 3 = static authoring + default set + overlay (§4.3/§4.5/§4.6); 4 = register/placeholder + binding + states (§7-E/§9); 6 = collection cascading pickers (§4.6/§14-Phase6).
- **Reuse honored:** request attributes render through the existing `AttributeEditor`/`AttributeFieldInput` (friendly label/required/description/regexp already supported) — the net-new is the `fieldMapping` affordance, OID form branch, authoring/default/overlay editors, register flow, and collection picker. No new form library; existing `react-hook-form` + `Controller`/`Select`/`Switch`/`Dialog`/`TabLayout` patterns mirrored from `custom-oid/form`, `ra-profiles/form`, `CertificateValidationDialogBody`.
- **Coverage strategy is deliberate:** Sonar excludes `src/components/_pages/**` (Orchestrators) and `src/types/openapi/**`; therefore each group front-loads a **pure util** (Vitest) + a **reusable component** (CT) under `src/components/RequestAttributes/**` to carry the ≥80% new-code coverage, keeping `_pages/*` edits thin and CT-guarded only.
- **Test-runner split is correct:** logic → Vitest (`*.spec.ts`), components → Playwright-CT (`*.spec.tsx`) with sibling `*TestWrapper.tsx` (mirroring `AttributeEditorTestWrapper`). `data-testid` conventions taken from existing specs (`select-<id>`/`select-<id>-input`, `switch-<id>`, `text-input-<id>`) and marked `[JIT]` where exact strings must be re-confirmed against the current components.
- **`[JIT]` markers (no fabricated APIs):** every backend-dependent type/enum/endpoint is explicitly marked `[JIT: verify against Phase N output]` — `OidCategory.CertificateExtension` + `CertificateExtensionOidPropertiesDto` + value-encoding enum (0a/0b); `DataAttribute.fieldMapping` member + RA-Profile-scoped CSR-attrs (1); RA-Profile request-validation field + structured compliance-error shape (2); `RaProfileRequestAttribute`/`RaProfileAttributeOverlay`/default-set DTOs + merge-mode/`ValueSourceKind` enums + endpoints (3); `CertificateState` `PENDING_REGISTRATION`/`REGISTERED` + register endpoints/DTOs + `CERTIFICATE_REGISTRATION` capability (4); collection endpoints/DTOs + cascade `params` (6).
- **Repo discrepancy surfaced, not hidden:** the program plan's `CZERTAINLY-FE-Operator` cell points at a dead 2022 CRA repo; the real frontend is `fe-administrator`. This plan executes against `fe-administrator` (every path verified there) and flags the program-plan correction as an open item.
- **Out of scope:** backend projection/render/validate/register/collection logic (CO phases); interfaces model/DTO/enum + OpenAPI (IF phases); connector structured-content consumption (CN); docs (DOC); CRMF build / SSH / key-secret object types (deferred).
