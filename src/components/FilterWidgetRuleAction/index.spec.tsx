import { test, expect } from 'playwright/ct-test';
import { FilterWidgetRuleActionTestWrapper, type FilterWidgetRuleActionTestWrapperProps } from './FilterWidgetRuleActionTestWrapper';
import {
    complexAttrFieldDef,
    countFieldDef,
    createdAtDatetimeFieldDef,
    customAttrFieldDef,
    datesListFieldDef,
    defaultMockAvailableFilters,
    expiresAtFieldDef,
    groupsFieldDef,
    issuedOnDateFieldDef,
    issuedOnStringFieldDef,
    makeSearchFieldList,
    modeFieldDef,
    priorityEnumsHighOnly,
    priorityEnumsOverride,
    priorityListFieldDef,
    priorityStringFieldDef,
    tagsFieldDef,
    tagsFieldTwoValuesDef,
    updatedAtFieldDef,
} from './FilterWidgetRuleActionTestData';
import { FilterFieldSource } from 'types/openapi';
import type { ExecutionItemModel } from 'types/rules';

/** Open group select and choose option by label (e.g. 'Meta'). */
async function selectFieldSource(page: import('@playwright/test').Page, optionLabel: string) {
    await page.getByTestId('select-group-trigger').click();
    await page.getByRole('option', { name: optionLabel, exact: true }).click();
}

async function selectFieldSourceMeta(page: import('@playwright/test').Page) {
    await selectFieldSource(page, 'Meta');
}

/** Open field select and choose option by label. */
async function selectFieldOption(page: import('@playwright/test').Page, optionLabel: string) {
    await page.getByTestId('select-field-trigger').click();
    await page.getByRole('option', { name: optionLabel, exact: true }).click();
}

/** Focus then fill the filter value input. */
async function fillFilterValue(page: import('@playwright/test').Page, text: string) {
    const input = page.getByPlaceholder('Enter filter value');
    await input.focus();
    await input.fill(text);
}

/**
 * Open value select dropdown and pick an option by label.
 * `nativeValue` is unused in the Radix-based Select but kept for call-site compatibility.
 */
async function selectValueOption(page: import('@playwright/test').Page, optionLabel: string, _nativeValue?: string) {
    await page.getByTestId('select-value-trigger').click();
    await page.getByRole('option', { name: optionLabel, exact: true }).click();
}

/** Click a badge by its label text, then assert Update mode and expected select values. */
async function clickBadgeAndVerifyEditMode(
    page: import('@playwright/test').Page,
    badgeLabel: string,
    expectedGroup: string,
    expectedField: string,
) {
    await page.getByText(`'${badgeLabel}'`).click();
    await expect(page.getByRole('button', { name: 'Update', exact: true })).toBeVisible();
    await expect(page.getByTestId('select-group-input')).toHaveValue(expectedGroup);
    await expect(page.getByTestId('select-field-input')).toHaveValue(expectedField);
}

/** Get selected option values from the hidden native value <select> mirror. */
async function getSelectedNativeValues(page: import('@playwright/test').Page): Promise<string[]> {
    return page
        .getByTestId('select-value-input')
        .evaluate((el: HTMLSelectElement) => Array.from(el.selectedOptions).map((opt) => opt.value));
}

/** Add a string action via UI: select a Meta source, pick a field, fill value, click Add. */
async function addStringAction(page: import('@playwright/test').Page, fieldLabel: string, value: string) {
    await selectFieldSourceMeta(page);
    await selectFieldOption(page, fieldLabel);
    await fillFilterValue(page, value);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
}

type MountFn = (jsx: any) => Promise<any>;

interface ActionsCapture {
    current: unknown[];
}

async function mountWithActions(
    mount: MountFn,
    extraProps: Omit<FilterWidgetRuleActionTestWrapperProps, 'onActionsUpdate'> = {},
): Promise<ActionsCapture> {
    const capture: ActionsCapture = { current: [] };
    await mount(
        <FilterWidgetRuleActionTestWrapper
            {...extraProps}
            onActionsUpdate={(actions) => {
                capture.current = actions;
            }}
        />,
    );
    return capture;
}

async function mountWithExecution(
    mount: MountFn,
    opts: {
        source: FilterFieldSource;
        fieldIdentifier: string;
        data: unknown;
        fieldDef?: Record<string, unknown>;
        extraProps?: Omit<FilterWidgetRuleActionTestWrapperProps, 'availableFilters' | 'ExecutionsList'>;
    },
): Promise<void> {
    const { source, fieldIdentifier, data, fieldDef, extraProps } = opts;
    const availableFilters = fieldDef ? makeSearchFieldList(source, [fieldDef]) : undefined;
    const execution = { fieldSource: source, fieldIdentifier, data } as ExecutionItemModel;
    await mount(
        <FilterWidgetRuleActionTestWrapper
            {...(availableFilters ? { availableFilters } : {})}
            {...extraProps}
            ExecutionsList={[execution]}
        />,
    );
}

async function clickBadgeAndExpectUpdate(page: import('@playwright/test').Page, badgeLabel: string) {
    await page.getByText(`'${badgeLabel}'`).click();
    await expect(page.getByRole('button', { name: 'Update', exact: true })).toBeVisible();
}

function firstAction(actions: unknown[]): Record<string, any> {
    return (actions as Record<string, any>[])[0];
}

test.describe('FilterWidgetRuleAction', () => {
    test('renders Widget with title and Field Source / Field / Value controls', async ({ mount, page }) => {
        await mount(<FilterWidgetRuleActionTestWrapper title="Rule actions" />);
        await expect(page.getByText('Rule actions')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('select-group')).toBeVisible();
        await expect(page.getByTestId('select-field')).toBeVisible();
        await expect(page.getByPlaceholder('Enter filter value')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();
    });

    test('Add button is disabled when nothing selected', async ({ mount, page }) => {
        await mount(<FilterWidgetRuleActionTestWrapper />);
        await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
    });

    test('selecting Field Source enables Field dropdown and shows options', async ({ mount, page }) => {
        await mount(<FilterWidgetRuleActionTestWrapper />);
        await selectFieldSourceMeta(page);
        await expect(page.getByTestId('select-field')).toBeEnabled();
        await selectFieldOption(page, 'Status');
        await expect(page.getByPlaceholder('Enter filter value')).toBeVisible();
    });

    test('selecting Field Source and Field enables value input and Add', async ({ mount, page }) => {
        await mount(<FilterWidgetRuleActionTestWrapper />);
        await selectFieldSourceMeta(page);
        await selectFieldOption(page, 'Status');
        await fillFilterValue(page, 'active');
        await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeEnabled();
    });

    test('Add creates a badge and calls onActionsUpdate', async ({ mount, page }) => {
        const actions = await mountWithActions(mount);
        await addStringAction(page, 'Status', 'active');

        await expect(page.getByText("'Status'")).toBeVisible();
        await expect(page.getByText('active')).toBeVisible();
        expect(actions.current).toHaveLength(1);
        expect(firstAction(actions.current)).toMatchObject({ fieldSource: 'meta', fieldIdentifier: 'status', data: 'active' });
    });

    test('Boolean field shows True/False select', async ({ mount, page }) => {
        await mount(<FilterWidgetRuleActionTestWrapper />);
        await selectFieldSourceMeta(page);
        await selectFieldOption(page, 'Enabled');
        await expect(page.getByTestId('select-value')).toBeVisible();
        await page.getByTestId('select-value-trigger').click();
        await expect(page.getByRole('option', { name: 'True', exact: true })).toBeVisible();
        await expect(page.getByRole('option', { name: 'False', exact: true })).toBeVisible();
    });

    test('List field shows object value selector', async ({ mount, page }) => {
        await mount(<FilterWidgetRuleActionTestWrapper />);
        await selectFieldSourceMeta(page);
        await selectFieldOption(page, 'Kind');
        await expect(page.getByTestId('select-value')).toBeVisible();
    });

    test('clicking badge selects filter and shows Update button', async ({ mount, page }) => {
        await mount(<FilterWidgetRuleActionTestWrapper onActionsUpdate={() => {}} />);
        await addStringAction(page, 'Status', 'active');

        await expect(page.getByRole('button', { name: 'Update', exact: true })).not.toBeVisible();
        await page.getByText("'Status'").click();
        await expect(page.getByRole('button', { name: 'Update', exact: true })).toBeVisible();
    });

    test('editing selected badge and Update calls onActionsUpdate', async ({ mount, page }) => {
        const actions = await mountWithActions(mount);
        await addStringAction(page, 'Status', 'draft');

        await page.getByText("'Status'").click();
        await fillFilterValue(page, 'published');
        await page.getByRole('button', { name: 'Update', exact: true }).click();

        expect(actions.current).toHaveLength(1);
        const action = firstAction(actions.current);
        expect(action.data).toBe('published');
        expect(action.fieldIdentifier === 'status' || action.fieldIdentifier?.value === 'status').toBe(true);
    });

    test('remove badge via × removes action and calls onActionsUpdate', async ({ mount, page }) => {
        const actions = await mountWithActions(mount);
        await addStringAction(page, 'Status', 'x');

        await expect(page.getByText("'Status'")).toBeVisible();
        await page.getByText('×').click();
        await expect(page.getByText("'Status'")).not.toBeVisible();
        expect(actions.current).toHaveLength(0);
    });

    for (const key of ['Enter', 'Space'] as const) {
        test(`remove badge via keyboard ${key} triggers remove`, async ({ mount, page }) => {
            const actions = await mountWithActions(mount);
            await addStringAction(page, 'Status', key);

            await page.getByText('×').focus();
            await page.keyboard.press(key);
            await expect(page.getByText("'Status'")).not.toBeVisible();
            expect(actions.current).toHaveLength(0);
        });
    }

    test('disableBadgeRemove hides remove control in badge', async ({ mount, page }) => {
        await mount(<FilterWidgetRuleActionTestWrapper disableBadgeRemove onActionsUpdate={() => {}} />);
        await addStringAction(page, 'Status', 'z');

        await expect(page.getByText("'Status'")).toBeVisible();
        await expect(page.getByText('×')).not.toBeVisible();
    });

    test('busyBadges hides badge content', async ({ mount, page }) => {
        await mount(<FilterWidgetRuleActionTestWrapper busyBadges onActionsUpdate={() => {}} />);
        await addStringAction(page, 'Status', 'busy');

        const badge = page.getByTestId('badge').first();
        await expect(badge).toBeVisible();
        await expect(badge.getByText("'Status'")).not.toBeVisible();
    });

    test('ExecutionsList syncs actions into badges', async ({ mount, page }) => {
        await mountWithExecution(mount, { source: FilterFieldSource.Meta, fieldIdentifier: 'status', data: 'synced' });
        await expect(page.getByText("'Status'")).toBeVisible();
        await expect(page.getByText('synced')).toBeVisible();
    });

    test('clicking existing execution item badge hydrates Field and Value inputs', async ({ mount, page }) => {
        await mountWithExecution(mount, { source: FilterFieldSource.Meta, fieldIdentifier: 'status', data: 'synced' });
        await clickBadgeAndVerifyEditMode(page, 'Status', 'meta', 'status');
        await expect(page.getByPlaceholder('Enter filter value')).toHaveValue('synced');
    });

    test('clicking existing select execution item hydrates selected option', async ({ mount, page }) => {
        await mountWithExecution(mount, { source: FilterFieldSource.Meta, fieldIdentifier: 'kind', data: 'k2' });
        await clickBadgeAndVerifyEditMode(page, 'Kind', 'meta', 'kind');
        await expect(page.getByTestId('select-value-input')).toHaveValue('k2');
    });

    test('edit mode keeps current selected option in value dropdown', async ({ mount, page }) => {
        await mountWithExecution(mount, { source: FilterFieldSource.Meta, fieldIdentifier: 'kind', data: 'k2' });
        await page.getByText("'Kind'").click();
        await expect(page.getByTestId('select-value-input')).toHaveValue('k2');

        await page.getByTestId('select-value-trigger').click();
        await expect(page.getByRole('option', { name: 'Kind Two', exact: true })).toBeVisible();
    });

    test('clicking existing select execution item hydrates from object data', async ({ mount, page }) => {
        await mountWithExecution(mount, {
            source: FilterFieldSource.Meta,
            fieldIdentifier: 'kind',
            data: { uuid: 'k1', name: 'Kind One' },
        });
        await clickBadgeAndVerifyEditMode(page, 'Kind', 'meta', 'kind');
        await expect(page.getByTestId('select-value-input')).toHaveValue('k1');
    });

    test('multi value field hydrates on first click even when execution data has a single string', async ({ mount, page }) => {
        await mountWithExecution(mount, {
            source: FilterFieldSource.Property,
            fieldDef: groupsFieldDef,
            fieldIdentifier: 'groups',
            data: 'g1',
        });

        await clickBadgeAndExpectUpdate(page, 'Groups');
        await expect(page.getByTestId('select-group-input')).toHaveValue('property');
        await expect(page.getByTestId('select-field-input')).toHaveValue('groups');

        const selectedValues = await getSelectedNativeValues(page);
        expect(selectedValues).toContain('g1');
    });

    test('custom attribute option with reference/data hydrates selected value', async ({ mount, page }) => {
        await mountWithExecution(mount, {
            source: FilterFieldSource.Custom,
            fieldDef: customAttrFieldDef,
            fieldIdentifier: 'customAttr',
            data: { name: 'Option One' },
        });
        await clickBadgeAndVerifyEditMode(page, 'Custom Attr', 'custom', 'customAttr');
        await expect(page.getByTestId('select-value-input')).toHaveValue('r1');
    });

    test('boolean execution item hydrates value when backend sends string', async ({ mount, page }) => {
        await mountWithExecution(mount, { source: FilterFieldSource.Meta, fieldIdentifier: 'enabled', data: 'FALSE' });
        await clickBadgeAndVerifyEditMode(page, 'Enabled', 'meta', 'enabled');
        await expect(page.getByTestId('select-value-input')).toHaveValue('false');
    });

    test('boolean selector allows selecting false and persists boolean false on Add', async ({ mount, page }) => {
        const actions = await mountWithActions(mount);

        await selectFieldSourceMeta(page);
        await selectFieldOption(page, 'Enabled');
        await selectValueOption(page, 'False', 'false');

        await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeEnabled();
        await page.getByRole('button', { name: 'Add', exact: true }).click();

        expect(actions.current).toHaveLength(1);
        expect(firstAction(actions.current)).toMatchObject({ fieldSource: 'meta', fieldIdentifier: 'enabled', data: false });
    });

    test('date list execution item hydrates multi values and update maps them to UTC strings', async ({ mount, page }) => {
        const actions = await mountWithActions(mount, {
            availableFilters: makeSearchFieldList(FilterFieldSource.Meta, [expiresAtFieldDef]),
            ExecutionsList: [{ fieldSource: FilterFieldSource.Meta, fieldIdentifier: 'expiresAt', data: ['2026-03-01T10:00:00Z'] }],
        });

        await clickBadgeAndExpectUpdate(page, 'Expires At');

        const selectedValues = await getSelectedNativeValues(page);
        expect(selectedValues).toContain('2026-03-01T10:00:00Z');

        await page.getByRole('button', { name: 'Update', exact: true }).click();
        expect(actions.current).toHaveLength(1);
        expect(Array.isArray(firstAction(actions.current).data)).toBe(true);
        expect(firstAction(actions.current).data[0]).toContain('2026-03-01T10:00:00');
    });

    test('date list execution item with plain-date data pre-selects matching ISO option', async ({ mount, page }) => {
        const actions = await mountWithActions(mount, {
            availableFilters: makeSearchFieldList(FilterFieldSource.Custom, [datesListFieldDef]),
            ExecutionsList: [{ fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'customDates', data: ['2026-03-29'] }],
        });

        await clickBadgeAndExpectUpdate(page, 'Custom Dates');

        const selectedValues = await getSelectedNativeValues(page);
        expect(selectedValues).toContain('2026-03-29T00:00:00Z');

        await page.getByRole('button', { name: 'Update', exact: true }).click();
        expect(Array.isArray(firstAction(actions.current).data)).toBe(true);
        expect(firstAction(actions.current).data[0]).toBe('2026-03-29');
    });

    test('date list scalar execution item wraps value for multi-select and pre-selects', async ({ mount, page }) => {
        await mountWithActions(mount, {
            availableFilters: makeSearchFieldList(FilterFieldSource.Custom, [datesListFieldDef]),
            ExecutionsList: [{ fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'customDates', data: '2026-03-29' }],
        });

        await clickBadgeAndExpectUpdate(page, 'Custom Dates');

        const selectedValues = await getSelectedNativeValues(page);
        expect(selectedValues).toContain('2026-03-29T00:00:00Z');
    });

    test('date scalar execution item hydrates formatted date input and keeps update enabled', async ({ mount, page }) => {
        const actions = await mountWithActions(mount, {
            availableFilters: makeSearchFieldList(FilterFieldSource.Meta, [issuedOnDateFieldDef]),
            ExecutionsList: [{ fieldSource: FilterFieldSource.Meta, fieldIdentifier: 'issuedOn', data: '2026-03-03T00:00:00Z' }],
        });

        await clickBadgeAndExpectUpdate(page, 'Issued On');
        await expect(page.locator('#valueSelect')).toHaveValue(/2026/);

        await page.getByRole('button', { name: 'Update', exact: true }).click();
        expect(actions.current).toHaveLength(1);
        expect(Array.isArray(firstAction(actions.current).data)).toBe(true);
    });

    test('string options list keeps selected primitive value in edit mode', async ({ mount, page }) => {
        await mountWithExecution(mount, {
            source: FilterFieldSource.Meta,
            fieldDef: modeFieldDef,
            fieldIdentifier: 'mode',
            data: 'beta',
        });
        await page.getByText("'Mode'").click();
        await expect(page.getByTestId('select-value-input')).toHaveValue('beta');
    });

    test('object execution data with nested value.data.uuid hydrates single select value', async ({ mount, page }) => {
        await mountWithExecution(mount, {
            source: FilterFieldSource.Custom,
            fieldDef: complexAttrFieldDef,
            fieldIdentifier: 'complexAttr',
            data: { value: { data: { uuid: 'cx2', name: 'Complex Two' } } },
        });
        await clickBadgeAndVerifyEditMode(page, 'Complex Attr', 'custom', 'complexAttr');
        await expect(page.getByTestId('select-value-input')).toHaveValue('cx2');
    });

    test('clearing Field Source clears Field and Value', async ({ mount, page }) => {
        await mount(<FilterWidgetRuleActionTestWrapper />);
        await selectFieldSourceMeta(page);
        await selectFieldOption(page, 'Status');
        await fillFilterValue(page, 'clear');
        await page.getByTestId('select-group-clear').click();
        await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
    });

    test('single non-array datetime in list-type field hydrates label/value pair', async ({ mount, page }) => {
        await mountWithExecution(mount, {
            source: FilterFieldSource.Meta,
            fieldDef: createdAtDatetimeFieldDef,
            fieldIdentifier: 'createdAt',
            data: '2026-04-01T08:00:00Z',
        });
        await clickBadgeAndExpectUpdate(page, 'Created At');
    });

    test('selecting a value from single-select list and adding it calls onActionsUpdate', async ({ mount, page }) => {
        const actions = await mountWithActions(mount);

        await selectFieldSourceMeta(page);
        await selectFieldOption(page, 'Kind');
        await selectValueOption(page, 'Kind One', 'k1');

        await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeEnabled();
        await page.getByRole('button', { name: 'Add', exact: true }).click();

        expect(actions.current).toHaveLength(1);
        expect(firstAction(actions.current)).toMatchObject({ fieldSource: 'meta', fieldIdentifier: 'kind' });
    });

    test('selecting values in multi-select list and adding calls onActionsUpdate', async ({ mount, page }) => {
        const actions = await mountWithActions(mount, {
            availableFilters: makeSearchFieldList(FilterFieldSource.Property, [groupsFieldDef]),
        });

        await selectFieldSource(page, 'Property');
        await selectFieldOption(page, 'Groups');
        await selectValueOption(page, 'Group One', 'g1');

        await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeEnabled();
        await page.getByRole('button', { name: 'Add', exact: true }).click();

        expect(actions.current).toHaveLength(1);
        expect(firstAction(actions.current).fieldIdentifier).toBe('groups');
    });

    test('toggling selected badge deselects it and resets to Add', async ({ mount, page }) => {
        await mountWithExecution(mount, { source: FilterFieldSource.Meta, fieldIdentifier: 'status', data: 'val' });
        await clickBadgeAndExpectUpdate(page, 'Status');

        await page.getByText("'Status'").click();
        await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();
    });

    test('ExecutionsList with non-multiValue array data unwraps to single value', async ({ mount, page }) => {
        await mountWithExecution(mount, {
            source: FilterFieldSource.Meta,
            fieldDef: { ...defaultMockAvailableFilters[0].searchFieldData![2], multiValue: false },
            fieldIdentifier: 'kind',
            data: [{ uuid: 'k1', name: 'Kind One' }],
        });
        await clickBadgeAndExpectUpdate(page, 'Kind');
        await expect(page.getByTestId('select-value-input')).toHaveValue('k1');
    });

    test('badge displays platformEnum label when field has platformEnum', async ({ mount, page }) => {
        await mountWithExecution(mount, {
            source: FilterFieldSource.Meta,
            fieldDef: priorityListFieldDef,
            fieldIdentifier: 'priority',
            data: 'high',
            extraProps: { platformEnumsOverride: priorityEnumsOverride },
        });
        await expect(page.getByText('High Priority')).toBeVisible();
    });

    test('number field execution item hydrates value and renders number input', async ({ mount, page }) => {
        await mountWithExecution(mount, {
            source: FilterFieldSource.Meta,
            fieldDef: countFieldDef,
            fieldIdentifier: 'count',
            data: 42,
        });
        await clickBadgeAndExpectUpdate(page, 'Count');
        await expect(page.locator('#valueSelect')).toHaveValue('42');
    });

    test('updating an existing list field execution item via Update button', async ({ mount, page }) => {
        const actions = await mountWithActions(mount, {
            ExecutionsList: [{ fieldSource: FilterFieldSource.Meta, fieldIdentifier: 'kind', data: 'k1' }],
        });
        await clickBadgeAndExpectUpdate(page, 'Kind');
        await expect(page.getByTestId('select-value-input')).toHaveValue('k1');

        await selectValueOption(page, 'Kind Two', 'k2');
        await page.getByRole('button', { name: 'Update', exact: true }).click();
        expect(actions.current).toHaveLength(1);
    });

    test('multi-value list execution item with array of objects hydrates as array', async ({ mount, page }) => {
        await mountWithExecution(mount, {
            source: FilterFieldSource.Property,
            fieldDef: tagsFieldDef,
            fieldIdentifier: 'tags',
            data: [
                { uuid: 't1', name: 'Tag One' },
                { uuid: 't2', name: 'Tag Two' },
            ],
        });
        await clickBadgeAndExpectUpdate(page, 'Tags');

        const selectedValues = await getSelectedNativeValues(page);
        expect(selectedValues.length).toBeGreaterThanOrEqual(1);
    });

    test('badge with platformEnum falls back to string when enum entry missing', async ({ mount, page }) => {
        await mountWithExecution(mount, {
            source: FilterFieldSource.Meta,
            fieldDef: priorityStringFieldDef,
            fieldIdentifier: 'priority',
            data: 'unknown_value',
            extraProps: { platformEnumsOverride: priorityEnumsHighOnly },
        });
        await expect(page.getByText('unknown_value')).toBeVisible();
    });

    for (const scenario of [
        {
            title: 'datetime scalar data formats the date',
            fieldDef: updatedAtFieldDef,
            fieldIdentifier: 'updatedAt',
            data: '2026-05-15T14:30:00Z',
            label: 'Updated At',
        },
        {
            title: 'date scalar data formats as date',
            fieldDef: issuedOnStringFieldDef,
            fieldIdentifier: 'issuedOn',
            data: '2026-06-01',
            label: 'Issued On',
        },
    ]) {
        test(`badge with ${scenario.title}`, async ({ mount, page }) => {
            await mountWithExecution(mount, {
                source: FilterFieldSource.Meta,
                fieldDef: scenario.fieldDef,
                fieldIdentifier: scenario.fieldIdentifier,
                data: scenario.data,
            });
            await expect(page.getByText(`'${scenario.label}'`)).toBeVisible();
            await expect(page.getByText(/2026/)).toBeVisible();
        });
    }

    test('changing field clears value and disables Add', async ({ mount, page }) => {
        await mount(<FilterWidgetRuleActionTestWrapper />);
        await selectFieldSourceMeta(page);
        await selectFieldOption(page, 'Status');
        await fillFilterValue(page, 'test');
        await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeEnabled();

        await selectFieldOption(page, 'Enabled');
        await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
    });

    for (const key of ['Enter', 'Space'] as const) {
        test(`unselectFilters via keyboard ${key} clears selection`, async ({ mount, page }) => {
            await mount(<FilterWidgetRuleActionTestWrapper onActionsUpdate={() => {}} />);
            await addStringAction(page, 'Status', key);
            await page.getByText("'Status'").click();
            await expect(page.getByRole('button', { name: 'Update', exact: true })).toBeVisible();
            await page.locator('#unselectFilters').focus();
            await page.keyboard.press(key);
            await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();
        });
    }

    for (const data of ['true', true] as const) {
        test(`boolean execution item hydrates true when backend sends ${typeof data} true`, async ({ mount, page }) => {
            await mountWithExecution(mount, { source: FilterFieldSource.Meta, fieldIdentifier: 'enabled', data });
            await clickBadgeAndVerifyEditMode(page, 'Enabled', 'meta', 'enabled');
            await expect(page.getByTestId('select-value-input')).toHaveValue('true');
        });
    }

    test('remove badge triggers uuid extraction for multi-value object array data', async ({ mount, page }) => {
        const actions = await mountWithActions(mount, {
            availableFilters: [...defaultMockAvailableFilters, ...makeSearchFieldList(FilterFieldSource.Property, [tagsFieldTwoValuesDef])],
            ExecutionsList: [
                { fieldSource: FilterFieldSource.Meta, fieldIdentifier: 'status', data: 'val' },
                { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'tags', data: [{ uuid: 't1', name: 'Tag One' }] as any },
            ],
        });

        const statusBadge = page.getByTestId('badge').filter({ hasText: 'Status' });
        await statusBadge.getByRole('button').click();
        expect(actions.current).toHaveLength(1);
        expect(firstAction(actions.current).fieldIdentifier).toBe('tags');
        expect(firstAction(actions.current).data[0]).toBe('t1');
    });

    test('badge with object data shows name property', async ({ mount, page }) => {
        await mountWithExecution(mount, { source: FilterFieldSource.Meta, fieldIdentifier: 'kind', data: { name: 'Kind One' } });
        await expect(page.getByText('Kind One')).toBeVisible();
    });
});
