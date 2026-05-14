import { test, expect } from '../../../playwright/ct-test';
import FilterWidgetTestWrapper from './FilterWidgetTestWrapper';
import { FilterConditionOperator, FilterFieldSource } from 'types/openapi';

async function chooseSelectOption(page: import('@playwright/test').Page, triggerTestId: string, optionLabel: string) {
    await page.getByTestId(triggerTestId).click();
    await page.getByRole('option', { name: optionLabel, exact: true }).click();
}

async function chooseGroupMeta(page: import('@playwright/test').Page) {
    await chooseSelectOption(page, 'select-group-trigger', 'Meta');
}

async function chooseField(page: import('@playwright/test').Page, label: string, _value: string) {
    await chooseSelectOption(page, 'select-field-trigger', label);
}

async function chooseCondition(page: import('@playwright/test').Page, label: string, _value: string) {
    await chooseSelectOption(page, 'select-conditions-trigger', label);
}

async function fillEditableInput(page: import('@playwright/test').Page, placeholder: string, value: string) {
    const input = page.getByPlaceholder(placeholder);
    await input.focus();
    await input.fill(value);
}

async function configureMetaFilter(
    page: import('@playwright/test').Page,
    fieldLabel: string,
    fieldValue: string,
    conditionLabel: string,
    conditionValue: string,
) {
    await chooseGroupMeta(page);
    await chooseField(page, fieldLabel, fieldValue);
    await chooseCondition(page, conditionLabel, conditionValue);
}

test.describe('FilterWidget', () => {
    test('renders controls and Add disabled by default', async ({ mount, page }) => {
        await mount(<FilterWidgetTestWrapper title="Filter widget" />);
        await expect(page.getByText('Filter widget')).toBeVisible();
        await expect(page.getByTestId('select-group')).toBeVisible();
        await expect(page.getByTestId('select-field')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
    });

    test('adds text filter and shows badge content', async ({ mount, page }) => {
        let updated: any[] = [];
        await mount(
            <FilterWidgetTestWrapper
                onFilterUpdate={(filters) => {
                    updated = filters;
                }}
            />,
        );
        await configureMetaFilter(page, 'Status', 'status', 'Contains', FilterConditionOperator.Contains);
        await fillEditableInput(page, 'Enter filter value', 'active');
        await page.getByRole('button', { name: 'Add', exact: true }).click();

        const firstBadge = page.getByTestId('badge').first();
        await expect(firstBadge).toContainText("'Status'");
        await expect(firstBadge).toContainText('Contains');
        expect(updated).toHaveLength(1);
        expect(updated[0]).toMatchObject({
            fieldSource: FilterFieldSource.Meta,
            fieldIdentifier: 'status',
            condition: FilterConditionOperator.Contains,
            value: 'active',
        });
    });

    test('duplicate filter combination is not added second time', async ({ mount, page }) => {
        await mount(<FilterWidgetTestWrapper onFilterUpdate={() => {}} />);
        await configureMetaFilter(page, 'Status', 'status', 'Contains', FilterConditionOperator.Contains);
        await fillEditableInput(page, 'Enter filter value', 'one');
        await page.getByRole('button', { name: 'Add', exact: true }).click();

        await configureMetaFilter(page, 'Status', 'status', 'Contains', FilterConditionOperator.Contains);
        await fillEditableInput(page, 'Enter filter value', 'two');
        await page.getByRole('button', { name: 'Add', exact: true }).click();

        await expect(page.getByTestId('badge')).toHaveCount(1);
    });

    test('selecting badge enters update mode and can update value', async ({ mount, page }) => {
        let updated: any[] = [];
        await mount(
            <FilterWidgetTestWrapper
                onFilterUpdate={(filters) => {
                    updated = filters;
                }}
            />,
        );
        await configureMetaFilter(page, 'Status', 'status', 'Contains', FilterConditionOperator.Contains);
        await fillEditableInput(page, 'Enter filter value', 'old');
        await page.getByRole('button', { name: 'Add', exact: true }).click();

        await page.getByText("'Status'").click();
        await expect(page.getByRole('button', { name: 'Update', exact: true })).toBeVisible();
        await fillEditableInput(page, 'Enter filter value', 'new');
        await page.getByRole('button', { name: 'Update', exact: true }).click();
        expect(updated[0]?.value).toBe('new');
    });

    test('empty condition can be added without value', async ({ mount, page }) => {
        await mount(<FilterWidgetTestWrapper onFilterUpdate={() => {}} />);
        await configureMetaFilter(page, 'Custom Date', 'customDate', 'Empty', FilterConditionOperator.Empty);
        await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeEnabled();
        await page.getByRole('button', { name: 'Add', exact: true }).click();
        await expect(page.getByText("'Custom Date'")).toBeVisible();
    });

    test('regex validation disables add and shows error', async ({ mount, page }) => {
        await mount(<FilterWidgetTestWrapper />);
        await configureMetaFilter(page, 'Status', 'status', 'Matches', FilterConditionOperator.Matches);
        await fillEditableInput(page, 'Enter regex value', '(');
        await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
        await expect(page.locator('p.text-red-600')).toBeVisible();
    });

    test('interval condition renders duration input helper', async ({ mount, page }) => {
        await mount(<FilterWidgetTestWrapper />);
        await configureMetaFilter(page, 'Created', 'created', 'In past', FilterConditionOperator.InPast);
        await expect(page.getByPlaceholder('eg. 2d 30m')).toBeVisible();
    });

    test('count condition uses numeric input and blocks non-digit typing', async ({ mount, page }) => {
        await mount(<FilterWidgetTestWrapper />);
        await configureMetaFilter(page, 'Items Count', 'itemsCount', 'Count equal', FilterConditionOperator.CountEqual);
        const valueInput = page.locator('#valueSelect');
        await valueInput.evaluate((element) => {
            (element as HTMLInputElement).removeAttribute('readonly');
        });
        await valueInput.focus();
        await valueInput.fill('12');
        await expect(valueInput).toHaveValue('12');
        await valueInput.press('x');
        await expect
            .poll(async () => {
                const current = await valueInput.inputValue();
                return current.includes('x');
            })
            .toBe(false);
    });

    test('remove badge deletes selected filter', async ({ mount, page }) => {
        let updated: any[] = [];
        await mount(
            <FilterWidgetTestWrapper
                onFilterUpdate={(filters) => {
                    updated = filters;
                }}
            />,
        );
        await configureMetaFilter(page, 'Status', 'status', 'Contains', FilterConditionOperator.Contains);
        await fillEditableInput(page, 'Enter filter value', 'x');
        await page.getByRole('button', { name: 'Add', exact: true }).click();
        await expect(page.getByText("'Status'")).toBeVisible();
        await page.getByTestId('badge').first().getByRole('button', { name: 'Remove badge' }).click();
        await expect.poll(() => updated.length).toBe(0);
    });

    test('list field renders selectable value options', async ({ mount, page }) => {
        await mount(<FilterWidgetTestWrapper />);
        await configureMetaFilter(page, 'Severity', 'severity', 'Equals', FilterConditionOperator.Equals);
        await expect(page.getByTestId('select-valueSelect')).toBeVisible();
        await chooseSelectOption(page, 'select-valueSelect-trigger', 'High');
        await page.getByRole('button', { name: 'Add', exact: true }).click();
        await expect(page.getByText("'Severity'")).toBeVisible();
    });

    test('boolean field renders select and allows choosing true', async ({ mount, page }) => {
        await mount(<FilterWidgetTestWrapper />);
        await configureMetaFilter(page, 'Enabled', 'enabled', 'Equals', FilterConditionOperator.Equals);
        await expect(page.getByTestId('select-valueSelect')).toBeVisible();
        await chooseSelectOption(page, 'select-valueSelect-trigger', 'True');
        await page.getByRole('button', { name: 'Add', exact: true }).click();
        await expect(page.getByText("'Enabled'")).toBeVisible();
    });

    test('clicking preloaded badges hydrates edit state for mixed value types', async ({ mount, page }) => {
        await mount(
            <FilterWidgetTestWrapper
                initialCurrentFilters={[
                    {
                        fieldSource: FilterFieldSource.Meta,
                        fieldIdentifier: 'customDate',
                        condition: FilterConditionOperator.Equals,
                        value: '2024-01-01',
                    },
                    {
                        fieldSource: FilterFieldSource.Meta,
                        fieldIdentifier: 'expires',
                        condition: FilterConditionOperator.InNext,
                        value: 'P2D',
                    },
                    {
                        fieldSource: FilterFieldSource.Meta,
                        fieldIdentifier: 'expires',
                        condition: FilterConditionOperator.Equals,
                        value: '2024-05-01T10:20:30Z',
                    },
                    {
                        fieldSource: FilterFieldSource.Meta,
                        fieldIdentifier: 'enabled',
                        condition: FilterConditionOperator.Equals,
                        value: true,
                    },
                    {
                        fieldSource: FilterFieldSource.Meta,
                        fieldIdentifier: 'severity',
                        condition: FilterConditionOperator.Equals,
                        value: 'high',
                    },
                    {
                        fieldSource: FilterFieldSource.Meta,
                        fieldIdentifier: 'owners',
                        condition: FilterConditionOperator.Equals,
                        value: ['u1', { name: 'Alice' }] as any,
                    },
                ]}
            />,
        );

        const badges = page.getByTestId('badge');
        const count = await badges.count();
        for (let i = 0; i < count; i += 1) {
            await badges.nth(i).click();
            await expect(page.getByRole('button', { name: 'Update', exact: true })).toBeVisible();
        }
    });

    test('disableBadgeRemove and busyBadges affect badge rendering', async ({ mount, page }) => {
        await mount(
            <FilterWidgetTestWrapper
                disableBadgeRemove
                busyBadges
                initialCurrentFilters={[
                    {
                        fieldSource: FilterFieldSource.Meta,
                        fieldIdentifier: 'status',
                        condition: FilterConditionOperator.Equals,
                        value: 'queued',
                    },
                ]}
            />,
        );
        await expect(page.getByTestId('badge').first()).toBeVisible();
        await expect(page.getByText('×')).not.toBeVisible();
        await expect(page.getByText("'Status'")).not.toBeVisible();
    });

    test('extra component and two-column layout render', async ({ mount, page }) => {
        await mount(
            <FilterWidgetTestWrapper filterGridCols={2} extraFilterComponent={<div data-testid="extra-filter-content">Extra area</div>} />,
        );
        await expect(page.getByTestId('extra-filter-content')).toBeVisible();
        await expect(page.locator('.grid-cols-2')).toBeVisible();
    });

    test('preloaded date/datetime/list values render in badges', async ({ mount, page }) => {
        await mount(
            <FilterWidgetTestWrapper
                initialCurrentFilters={[
                    {
                        fieldSource: FilterFieldSource.Meta,
                        fieldIdentifier: 'created',
                        condition: FilterConditionOperator.Equals,
                        value: '2024-01-01T00:00:00Z',
                    },
                    {
                        fieldSource: FilterFieldSource.Meta,
                        fieldIdentifier: 'expires',
                        condition: FilterConditionOperator.Equals,
                        value: '2024-01-02T10:11:12Z',
                    },
                    {
                        fieldSource: FilterFieldSource.Meta,
                        fieldIdentifier: 'severity',
                        condition: FilterConditionOperator.Equals,
                        value: 'high',
                    },
                    {
                        fieldSource: FilterFieldSource.Meta,
                        fieldIdentifier: 'owners',
                        condition: FilterConditionOperator.Equals,
                        value: [{ name: 'Alice' }, { name: 'Bob' }] as any,
                    },
                ]}
            />,
        );
        await expect(page.getByText("'Created'")).toBeVisible();
        await expect(page.getByText("'Expires'")).toBeVisible();
        await expect(page.getByText("'Severity'")).toBeVisible();
        await expect(page.getByText("'Owners'")).toBeVisible();
    });
});
