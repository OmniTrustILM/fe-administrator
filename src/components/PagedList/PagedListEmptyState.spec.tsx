import type { Page } from '@playwright/test';
import type { SearchFieldListModel, SearchRequestModel } from 'types/certificate';
import { FilterConditionOperator, FilterFieldSource, FilterFieldType } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import { expect, test } from '../../../playwright/ct-test';
import PagedListColumnsWithStore from './PagedListColumnsWithStore';

const catalogue = [
    {
        filterFieldSource: FilterFieldSource.Property,
        searchFieldData: [
            {
                fieldIdentifier: 'COMMON_NAME',
                fieldLabel: 'Common Name',
                type: FilterFieldType.String,
                conditions: [],
                displayable: true,
                sortable: true,
            },
        ],
    },
] as unknown as SearchFieldListModel[];

const standardColumns: ColumnDefinition[] = [
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', catalogueLabel: 'Common Name' },
];

const filters = [
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'COMMON_NAME',
        condition: FilterConditionOperator.Contains,
        value: 'nothing-matches',
    },
];

const listRequests = async (page: Page): Promise<SearchRequestModel[]> =>
    JSON.parse((await page.getByTestId('list-requests').textContent()) ?? '[]') as SearchRequestModel[];

test.describe('PagedList empty state', () => {
    test('shows No items to show without Clear all while no filter is active', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={[]} standardColumns={standardColumns} catalogue={catalogue} />);

        await expect(page.getByText('No items to show')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Clear all' })).toHaveCount(0);
    });

    test('clears every filter and lists again from Clear all', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={[]} standardColumns={standardColumns} catalogue={catalogue} typedFilters={filters} />);
        await page.getByTestId('type-filters').click();

        await expect(page.getByText('No items match the filters')).toBeVisible();
        await expect.poll(async () => (await listRequests(page)).at(-1)?.filters).toEqual(filters);
        const requestsBeforeClear = (await listRequests(page)).length;

        await page.getByRole('button', { name: 'Clear all' }).click();

        await expect(page.getByTestId('current-filters')).toHaveText('[]');
        await expect.poll(async () => (await listRequests(page)).length).toBeGreaterThan(requestsBeforeClear);
        const last = (await listRequests(page)).at(-1);
        expect(last?.filters).toEqual([]);
        await expect(page.getByText('No items to show')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Clear all' })).toHaveCount(0);
    });
});
