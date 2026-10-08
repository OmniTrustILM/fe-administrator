import type { Page } from '@playwright/test';
import type { SearchFieldListModel, SearchRequestModel } from 'types/certificate';
import type { ListViewModel } from 'types/listViews';
import { FilterConditionOperator, FilterFieldSource, FilterFieldType, Resource, SortDirection } from 'types/openapi';
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

const byName: ListViewModel = {
    uuid: 'view-3',
    name: 'By name',
    resource: Resource.Secrets,
    columns: [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' }],
    filters: [],
    sort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: SortDirection.Desc },
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

    test('keeps the page and page size it was left on', async ({ mount, page }) => {
        await mount(<PagedListReturnWithStore {...props} totalItems={60} />);
        await page.getByRole('tab', { name: 'Everything' }).click();
        await page.getByTestId('type-filters').click();
        await page.getByTestId('turn-page').click();
        await expect.poll(async () => (await lastRequest(page))?.pageNumber).toBe(2);

        await openSecretAndComeBack(page);

        await expect(page.getByRole('tab', { name: 'Everything' })).toHaveAttribute('aria-selected', 'true');
        await expect.poll(async () => await lastRequest(page)).toMatchObject({ pageNumber: 2, itemsPerPage: 20, filters: typed });
    });

    test('keeps the page of a sorted view it comes back to under the same ordering', async ({ mount, page }) => {
        await mount(<PagedListReturnWithStore {...props} views={[pinned, byName]} totalItems={60} />);
        await page.getByRole('tab', { name: 'By name' }).click();
        await page.getByTestId('turn-page').click();
        await expect.poll(async () => (await lastRequest(page))?.pageNumber).toBe(2);

        await openSecretAndComeBack(page);

        await expect(page.getByRole('tab', { name: 'By name' })).toHaveAttribute('aria-selected', 'true');
        await expect.poll(async () => await lastRequest(page)).toMatchObject({ pageNumber: 2, sort: { direction: SortDirection.Desc } });
    });

    test('opens on the first page when the sorted view it was left on has gone', async ({ mount, page }) => {
        await mount(<PagedListReturnWithStore {...props} views={[pinned, byName]} viewsOnDetail={[pinned]} totalItems={60} />);
        await page.getByRole('tab', { name: 'By name' }).click();
        await page.getByTestId('turn-page').click();
        await expect.poll(async () => (await lastRequest(page))?.pageNumber).toBe(2);

        await page.getByTestId('open-secret').click();
        await page.getByTestId('replace-views').click();
        await page.getByTestId('back-to-list').click();

        await expect(page.getByRole('tab', { name: 'Standard' })).toHaveAttribute('aria-selected', 'true');
        await expect.poll(async () => (await lastRequest(page))?.pageNumber).toBe(1);
    });

    test('opens on the first page once the list is left for elsewhere', async ({ mount, page }) => {
        await mount(<PagedListReturnWithStore {...props} totalItems={60} />);
        await page.getByTestId('turn-page').click();
        await expect.poll(async () => (await lastRequest(page))?.pageNumber).toBe(2);

        await page.getByTestId('go-elsewhere').click();
        await page.getByTestId('open-secrets').click();

        await expect(page.getByRole('tab', { name: 'Production' })).toHaveAttribute('aria-selected', 'true');
        await expect.poll(async () => (await lastRequest(page))?.pageNumber).toBe(1);
    });

    test('keeps a drill-down it was left showing, on Standard', async ({ mount, page }) => {
        await mount(<PagedListReturnWithStore {...props} drillDownFilters={[nameContains('from-the-dashboard')]} />);
        await expect(page.getByTestId('view-tabs-summary-unsaved')).toContainText('Filtered from the Dashboard');

        await openSecretAndComeBack(page);

        await expect(page.getByRole('tab', { name: 'Standard' })).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('view-tabs-summary-unsaved')).toContainText('Filtered from the Dashboard');
        await expect(page.getByTestId('current-filters')).toContainText('from-the-dashboard');
    });

    test("comes back with the user's own filters once a drill-down was edited back to the Dashboard ones", async ({ mount, page }) => {
        const fromTheDashboard = [nameContains('from-the-dashboard')];
        await mount(<PagedListReturnWithStore {...props} drillDownFilters={fromTheDashboard} retypedFilters={fromTheDashboard} />);
        await expect(page.getByTestId('view-tabs-summary-unsaved')).toContainText('Filtered from the Dashboard');
        await page.getByTestId('type-filters').click();
        await page.getByTestId('retype-filters').click();
        await expect(page.getByTestId('view-tabs-summary-unsaved')).toHaveText('Unsaved changes — Standard cannot hold them');

        await openSecretAndComeBack(page);

        await expect(page.getByRole('tab', { name: 'Standard' })).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('current-filters')).toContainText('from-the-dashboard');
        await expect(page.getByTestId('view-tabs-summary-unsaved')).toHaveText('Unsaved changes — Standard cannot hold them');
    });

    test('comes back on Standard when the view it was left on has gone', async ({ mount, page }) => {
        await mount(<PagedListReturnWithStore {...props} viewsOnDetail={[pinned]} />);
        await page.getByRole('tab', { name: 'Everything' }).click();
        await page.getByTestId('type-filters').click();

        await page.getByTestId('open-secret').click();
        await page.getByTestId('replace-views').click();
        await page.getByTestId('back-to-list').click();

        await expect(page.getByRole('tab', { name: 'Standard' })).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByRole('tab', { name: 'Production' })).toHaveAttribute('aria-selected', 'false');
        await expect(page.getByTestId('current-filters')).toContainText('typed-by-the-user');
        await expect(page.getByTestId('view-tabs-summary-save')).toHaveText('Save as view…');
    });

    test('comes back on Standard when it opened there and a view was pinned meanwhile', async ({ mount, page }) => {
        await mount(<PagedListReturnWithStore {...props} views={[unfiltered]} viewsOnDetail={[{ ...unfiltered, defaultView: true }]} />);
        await expect(page.getByRole('tab', { name: 'Standard' })).toHaveAttribute('aria-selected', 'true');
        await page.getByTestId('type-filters').click();

        await page.getByTestId('open-secret').click();
        await page.getByTestId('replace-views').click();
        await page.getByTestId('back-to-list').click();

        await expect(page.getByRole('tab', { name: 'Standard' })).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByRole('tab', { name: 'Everything' })).toHaveAttribute('aria-selected', 'false');
        await expect(page.getByTestId('current-filters')).toContainText('typed-by-the-user');
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
