import type { Page } from '@playwright/test';
import type { SearchFieldListModel, SearchRequestModel } from 'types/certificate';
import type { ListViewModel } from 'types/listViews';
import { FilterConditionOperator, FilterFieldSource, FilterFieldType, Resource } from 'types/openapi';
import { expect, test } from '../../../playwright/ct-test';
import PagedListReturnWithStore from './PagedListReturnWithStore';

const catalogue = [
    {
        filterFieldSource: FilterFieldSource.Property,
        searchFieldData: [
            {
                fieldIdentifier: 'COMMON_NAME',
                fieldLabel: 'Name',
                type: FilterFieldType.String,
                conditions: [],
                displayable: true,
                sortable: true,
            },
        ],
    },
] as unknown as SearchFieldListModel[];

const standardColumns = [
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', catalogueLabel: 'Name', sortable: true },
];

const nameContains = (value: string) => ({
    fieldSource: FilterFieldSource.Property,
    fieldIdentifier: 'COMMON_NAME',
    condition: FilterConditionOperator.Contains,
    value,
});

const pinned: ListViewModel = {
    uuid: 'view-1',
    name: 'Production',
    resource: Resource.Secrets,
    columns: [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' }],
    filters: [nameContains('prod')],
    defaultView: true,
};

const unfiltered: ListViewModel = {
    uuid: 'view-2',
    name: 'Everything',
    resource: Resource.Secrets,
    columns: [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' }],
    filters: [],
    defaultView: false,
};

const typed = [nameContains('typed-by-the-user')];

const props = {
    rows: [{ uuid: 'secret-1', name: 'db-password' }],
    standardColumns,
    catalogue,
    views: [pinned, unfiltered],
    typedFilters: typed,
};

const lastRequest = async (page: Page): Promise<SearchRequestModel | undefined> =>
    (JSON.parse((await page.getByTestId('list-requests').textContent()) ?? '[]') as SearchRequestModel[]).at(-1);

const openSecretAndComeBack = async (page: Page) => {
    await page.getByTestId('open-secret').click();
    await page.getByTestId('back-to-list').click();
};

test.describe('PagedList · coming back from a detail page', () => {
    test('keeps the filters the list was left with, on the tab it was on', async ({ mount, page }) => {
        await mount(<PagedListReturnWithStore {...props} />);
        await page.getByRole('tab', { name: 'Everything' }).click();
        await page.getByTestId('type-filters').click();
        await expect(page.getByTestId('current-filters')).toContainText('typed-by-the-user');

        await openSecretAndComeBack(page);

        await expect(page.getByRole('tab', { name: 'Everything' })).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('current-filters')).toContainText('typed-by-the-user');
        await expect.poll(async () => (await lastRequest(page))?.filters).toEqual(typed);
        await expect(page.getByTestId('view-tabs-summary-unsaved')).toContainText('Unsaved changes to this view');
    });

    test('keeps a drill-down it was left showing, still claiming no view', async ({ mount, page }) => {
        await mount(<PagedListReturnWithStore {...props} drillDownFilters={[nameContains('from-the-dashboard')]} />);
        await expect(page.getByTestId('view-tabs-summary-drill-down')).toBeVisible();

        await openSecretAndComeBack(page);

        await expect(page.getByTestId('view-tabs-summary-drill-down')).toBeVisible();
        await expect(page.getByRole('tab', { selected: true })).toHaveCount(0);
        await expect(page.getByTestId('current-filters')).toContainText('from-the-dashboard');
    });

    test('opens the pinned view with its own filters once the list is left for elsewhere', async ({ mount, page }) => {
        await mount(<PagedListReturnWithStore {...props} />);
        await page.getByTestId('type-filters').click();
        await page.getByTestId('open-secret').click();
        await page.getByTestId('back-to-list').click();
        await expect(page.getByRole('tab', { name: 'Production' })).toBeVisible();

        await page.getByTestId('go-elsewhere').click();
        await page.getByTestId('open-secrets').click();

        await expect(page.getByRole('tab', { name: 'Production' })).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('current-filters')).toContainText('prod');
        await expect(page.getByTestId('current-filters')).not.toContainText('typed-by-the-user');
        await expect(page.getByTestId('view-tabs-summary-unsaved')).toHaveCount(0);
    });
});
