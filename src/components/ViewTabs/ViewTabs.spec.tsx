import type { Page } from '@playwright/test';
import type { SearchFilterModel } from 'types/certificate';
import type { ListViewColumnModel, ListViewModel, ViewSlice } from 'types/listViews';
import {
    FilterConditionOperator,
    FilterFieldSource,
    FilterFieldType,
    Resource,
    type SearchFieldDataByGroupDto,
    SortDirection,
} from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import { expect, test } from '../../../playwright/ct-test';
import ViewTabsWithStore from './ViewTabsWithStore';

const field = (identifier: string, label: string, overrides: Record<string, unknown> = {}) => ({
    fieldIdentifier: identifier,
    fieldLabel: label,
    type: FilterFieldType.String,
    conditions: [],
    displayable: true,
    sortable: true,
    ...overrides,
});

const catalogue = [
    {
        filterFieldSource: FilterFieldSource.Property,
        searchFieldData: [field('COMMON_NAME', 'Common Name'), field('SERIAL_NUMBER', 'Serial Number'), field('NOT_AFTER', 'Expires At')],
    },
    {
        filterFieldSource: FilterFieldSource.Custom,
        searchFieldData: [field('environment', 'Environment', { sortable: false })],
    },
] as unknown as SearchFieldDataByGroupDto[];

const column = (identifier: string, catalogueLabel: string, fieldSource = FilterFieldSource.Property): ColumnDefinition => ({
    fieldSource,
    fieldIdentifier: identifier,
    catalogueLabel,
});

const commonName = column('COMMON_NAME', 'Common Name');
const serialNumber = column('SERIAL_NUMBER', 'Serial Number');
const standardColumns = [commonName, serialNumber];

const stored = (identifier: string, fieldSource = FilterFieldSource.Property, label?: string): ListViewColumnModel => ({
    fieldSource,
    fieldIdentifier: identifier,
    ...(label ? { label } : {}),
});

const stateFilter: SearchFilterModel = {
    fieldSource: FilterFieldSource.Property,
    fieldIdentifier: 'CERTIFICATE_STATE',
    condition: FilterConditionOperator.Equals,
    value: 'issued',
};

/** A view of the two columns the catalogue publishes, under a filter and an ordering of its own. */
const expiryWatch = (overrides: Partial<ListViewModel> = {}): ListViewModel => ({
    uuid: 'view-1',
    name: 'Expiry watch',
    resource: Resource.Certificates,
    columns: [stored('COMMON_NAME'), stored('NOT_AFTER', FilterFieldSource.Property, 'Expires')],
    filters: [stateFilter],
    sort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER', direction: SortDirection.Asc },
    defaultView: false,
    ...overrides,
});

const audit = (overrides: Partial<ListViewModel> = {}): ListViewModel => ({
    uuid: 'view-2',
    name: 'Audit',
    resource: Resource.Certificates,
    columns: [stored('environment', FilterFieldSource.Custom)],
    filters: [],
    defaultView: false,
    ...overrides,
});

type MountOptions = {
    views?: ListViewModel[];
    isMutating?: boolean;
    hasLoaded?: boolean;
    withheldCatalogue?: boolean;
    driftColumn?: ColumnDefinition;
    driftSort?: { fieldSource: FilterFieldSource; fieldIdentifier: string; direction: 'asc' | 'desc' };
    driftFilter?: SearchFilterModel;
};

const strip = ({
    views = [expiryWatch()],
    isMutating,
    hasLoaded,
    withheldCatalogue,
    driftColumn,
    driftSort,
    driftFilter,
}: MountOptions = {}) => (
    <ViewTabsWithStore
        resource={Resource.Certificates}
        views={views}
        catalogue={catalogue}
        standardColumns={standardColumns}
        isMutating={isMutating}
        hasLoaded={hasLoaded}
        withheldCatalogue={withheldCatalogue}
        driftColumn={driftColumn}
        driftSort={driftSort}
        driftFilter={driftFilter}
    />
);

type DispatchedAction = { type: string; payload?: Record<string, unknown> };

const dispatchedActions = async (page: Page): Promise<DispatchedAction[]> =>
    JSON.parse((await page.getByTestId('dispatched').textContent()) ?? '[]') as DispatchedAction[];

const dispatchedTypes = async (page: Page): Promise<string[]> => (await dispatchedActions(page)).map((action) => action.type);

const lastDispatched = async (page: Page, type: string): Promise<DispatchedAction | undefined> =>
    (await dispatchedActions(page)).filter((action) => action.type === type).at(-1);

const appliedSlice = async (page: Page): Promise<ViewSlice> =>
    JSON.parse((await page.getByTestId('applied-slice').textContent()) ?? '{}') as ViewSlice;

const openTabMenu = async (page: Page, name: string) => {
    await page.getByRole('button', { name: `Actions for ${name}` }).click();
};

test.describe('ViewTabs', () => {
    test('puts Standard first and pins it while no stored view opens by default', async ({ mount, page }) => {
        await mount(strip({ views: [expiryWatch(), audit()] }));

        const tabs = page.getByTestId('view-tabs-strip').getByRole('tab');
        await expect(tabs).toHaveText(['Standard', 'Expiry watch', 'Audit']);

        await expect(page.getByTestId('view-tabs-tab-standard')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('view-tabs-tab-standard').getByLabel('Opens by default')).toBeVisible();
        await expect(page.getByTestId('view-tabs-tab-view-1').getByLabel('Opens by default')).toHaveCount(0);
    });

    test('opens the pinned view on load with its columns, filters and ordering', async ({ mount, page }) => {
        await mount(strip({ views: [expiryWatch({ defaultView: true }), audit()] }));

        await expect(page.getByTestId('view-tabs-tab-view-1')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('view-tabs-tab-view-1').getByLabel('Opens by default')).toBeVisible();
        await expect(page.getByTestId('view-tabs-tab-standard').getByLabel('Opens by default')).toHaveCount(0);

        const slice = await appliedSlice(page);
        expect(slice.columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME', 'NOT_AFTER']);
        expect(slice.filters).toEqual([stateFilter]);
        expect(slice.sort).toEqual({ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER', direction: 'asc' });
    });

    test('opens Standard when no view is pinned, and applies a view when its tab is picked', async ({ mount, page }) => {
        await mount(strip());

        expect((await appliedSlice(page)).columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME', 'SERIAL_NUMBER']);
        expect((await appliedSlice(page)).filters).toEqual([]);

        await page.getByTestId('view-tabs-tab-view-1').click();

        await expect(page.getByTestId('view-tabs-tab-view-1')).toHaveAttribute('aria-selected', 'true');
        const slice = await appliedSlice(page);
        expect(slice.columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME', 'NOT_AFTER']);
        expect(slice.filters).toEqual([stateFilter]);
    });

    test("names a view's own heading override rather than the catalogue label", async ({ mount, page }) => {
        await mount(strip({ views: [expiryWatch({ defaultView: true })] }));

        const slice = await appliedSlice(page);
        expect(slice.columns.map((each) => each.label ?? each.catalogueLabel)).toEqual(['Common Name', 'Expires']);
    });

    test('reduces the menu on Standard to Duplicate, which is the only action it can hold', async ({ mount, page }) => {
        await mount(strip());

        await openTabMenu(page, 'Standard');

        await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Rename…' })).toHaveCount(0);
        await expect(page.getByRole('menuitem', { name: 'Delete view' })).toHaveCount(0);
        await expect(page.getByRole('menuitem', { name: 'Edit columns…' })).toHaveCount(0);
    });

    test('offers the full menu on a stored view', async ({ mount, page }) => {
        await mount(strip());

        await page.getByTestId('view-tabs-tab-view-1').click();
        await openTabMenu(page, 'Expiry watch');

        await expect(page.getByRole('menuitem', { name: 'Edit columns…' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Rename…' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Open this view by default' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Delete view' })).toBeVisible();
    });

    test('drops the pin action from the menu of the view that is already pinned', async ({ mount, page }) => {
        await mount(strip({ views: [expiryWatch({ defaultView: true })] }));

        await openTabMenu(page, 'Expiry watch');

        await expect(page.getByRole('menuitem', { name: 'Rename…' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Open this view by default' })).toHaveCount(0);
    });

    test('pins a view from its menu', async ({ mount, page }) => {
        await mount(strip());

        await page.getByTestId('view-tabs-tab-view-1').click();
        await openTabMenu(page, 'Expiry watch');
        await page.getByRole('menuitem', { name: 'Open this view by default' }).click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const action = await lastDispatched(page, 'listViews/updateView');
        expect(action?.payload).toMatchObject({ resource: Resource.Certificates, uuid: 'view-1', view: { defaultView: true } });
    });

    test('walks the strip with the arrow keys and with Home and End', async ({ mount, page }) => {
        await mount(strip({ views: [expiryWatch(), audit()] }));

        await page.getByTestId('view-tabs-tab-standard').focus();
        await page.keyboard.press('ArrowRight');

        await expect(page.getByTestId('view-tabs-tab-view-1')).toHaveAttribute('aria-selected', 'true');
        // Roving focus: the tab left behind becomes tabIndex={-1}, so focus has to travel with the
        // selection or the next arrow key comes from an element the strip no longer tracks.
        await expect(page.getByTestId('view-tabs-tab-view-1')).toBeFocused();
        expect((await appliedSlice(page)).filters).toEqual([stateFilter]);

        await page.keyboard.press('End');
        await expect(page.getByTestId('view-tabs-tab-view-2')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('view-tabs-tab-view-2')).toBeFocused();

        await page.keyboard.press('Home');
        await expect(page.getByTestId('view-tabs-tab-standard')).toHaveAttribute('aria-selected', 'true');

        // Wrapping is deliberate: the strip is a closed loop, so ArrowLeft from the first tab is the
        // last one rather than a dead key.
        await page.keyboard.press('ArrowLeft');
        await expect(page.getByTestId('view-tabs-tab-view-2')).toHaveAttribute('aria-selected', 'true');
    });

    test('rolls the views past the visible cap into an overflow menu', async ({ mount, page }) => {
        const many = [1, 2, 3, 4, 5, 6].map((index) => audit({ uuid: `view-${index}`, name: `View ${index}` }));
        await mount(strip({ views: many }));

        await expect(page.getByTestId('view-tabs-strip').getByRole('tab')).toHaveText(['Standard', 'View 1', 'View 2', 'View 3', 'View 4']);

        await page.getByRole('button', { name: 'More saved views' }).click();
        await page.getByRole('menuitem', { name: 'View 6' }).click();

        // The selected tab is pulled onto the strip, displacing the last visible one — a tab picked
        // from the overflow has to be the one the strip shows as active.
        await expect(page.getByTestId('view-tabs-tab-view-6')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('view-tabs-tab-view-4')).toHaveCount(0);
    });

    test('marks the tab and offers to save once the ordering drifts from the view', async ({ mount, page }) => {
        await mount(strip({ driftSort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: 'desc' } }));

        await page.getByTestId('view-tabs-tab-view-1').click();
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toHaveCount(0);

        await page.getByTestId('drift-sort').click();

        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toBeVisible();
        await expect(page.getByTestId('view-tabs-summary-unsaved')).toHaveText('Unsaved changes to this view');
        await expect(page.getByTestId('view-tabs-summary-sort')).toContainText('Sorted by Common Name');

        await page.getByTestId('view-tabs-summary-save').click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const action = await lastDispatched(page, 'listViews/updateView');
        expect(action?.payload).toMatchObject({
            uuid: 'view-1',
            view: {
                name: 'Expiry watch',
                sort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: SortDirection.Desc },
            },
        });
    });

    test('reverts the drift back to what the view stores', async ({ mount, page }) => {
        await mount(strip({ driftFilter: stateFilter, views: [expiryWatch({ filters: [] })] }));

        await page.getByTestId('view-tabs-tab-view-1').click();
        await page.getByTestId('drift-filter').click();

        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toBeVisible();

        await page.getByTestId('view-tabs-summary-revert').click();

        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toHaveCount(0);
        expect((await appliedSlice(page)).filters).toEqual([]);
        expect(await dispatchedTypes(page)).not.toContain('listViews/updateView');
    });

    test('offers to keep a change to Standard as a new view, since Standard cannot hold it', async ({ mount, page }) => {
        await mount(strip({ driftColumn: column('NOT_AFTER', 'Expires At') }));

        await page.getByTestId('drift-columns').click();

        await expect(page.getByTestId('view-tabs-summary-unsaved')).toHaveText('Unsaved changes — Standard cannot hold them');
        await expect(page.getByTestId('view-tabs-summary-columns')).toHaveText('3 columns');

        await page.getByTestId('view-tabs-summary-save').click();

        await expect(page.getByTestId('view-tabs-create')).toBeVisible();
        await page.getByTestId('view-tabs-create-input').click();
        await page.getByTestId('view-tabs-create-input').fill('Expiring soon');
        await page.getByTestId('view-tabs-create').getByRole('button', { name: 'Create view' }).click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/createView');
        const action = await lastDispatched(page, 'listViews/createView');
        expect(action?.payload).toMatchObject({
            resource: Resource.Certificates,
            view: {
                name: 'Expiring soon',
                resource: Resource.Certificates,
                columns: [
                    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' },
                    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'SERIAL_NUMBER' },
                    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER' },
                ],
                defaultView: false,
            },
        });
    });

    test('creates a view from the current slice through the new-view tab', async ({ mount, page }) => {
        await mount(strip());

        await page.getByTestId('view-tabs-new').click();

        await expect(page.getByTestId('view-tabs-create-input')).toHaveValue('Standard (copy)');

        await page.getByTestId('view-tabs-create-input').click();
        await page.getByTestId('view-tabs-create-input').fill('Everything');
        await page.getByTestId('view-tabs-create').getByRole('button', { name: 'Create view' }).click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/createView');
        const action = await lastDispatched(page, 'listViews/createView');
        expect(action?.payload).toMatchObject({ view: { name: 'Everything' } });
    });

    test('refuses a name that is empty or already taken', async ({ mount, page }) => {
        await mount(strip());

        await page.getByTestId('view-tabs-new').click();
        const confirm = page.getByTestId('view-tabs-create').getByRole('button', { name: 'Create view' });

        await page.getByTestId('view-tabs-create-input').click();
        await page.getByTestId('view-tabs-create-input').fill('Expiry watch');

        await expect(page.getByTestId('view-tabs-create')).toContainText('A view of this name already exists.');
        await expect(confirm).toBeDisabled();

        await page.getByTestId('view-tabs-create-input').fill('');

        await expect(page.getByTestId('view-tabs-create')).toContainText('A view needs a name.');
        await expect(confirm).toBeDisabled();

        await page.getByTestId('view-tabs-create-input').fill('Expiring soon');

        await expect(confirm).toBeEnabled();
    });

    test('duplicates the active tab under a name that is free', async ({ mount, page }) => {
        await mount(strip({ views: [expiryWatch(), audit({ name: 'Expiry watch (copy)' })] }));

        await page.getByTestId('view-tabs-tab-view-1').click();
        await openTabMenu(page, 'Expiry watch');
        await page.getByRole('menuitem', { name: 'Duplicate' }).click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/createView');
        const action = await lastDispatched(page, 'listViews/createView');
        expect(action?.payload).toMatchObject({ view: { name: 'Expiry watch (copy) 2' } });
    });

    test('renames a view by sending the whole stored row back', async ({ mount, page }) => {
        await mount(strip());

        await page.getByTestId('view-tabs-tab-view-1').click();
        await openTabMenu(page, 'Expiry watch');
        await page.getByRole('menuitem', { name: 'Rename…' }).click();

        await expect(page.getByTestId('view-tabs-rename-input')).toHaveValue('Expiry watch');

        await page.getByTestId('view-tabs-rename-input').click();
        await page.getByTestId('view-tabs-rename-input').fill('Expiring soon');
        await page.getByTestId('view-tabs-rename').getByRole('button', { name: 'Rename' }).click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const action = await lastDispatched(page, 'listViews/updateView');
        // The API replaces the whole row, so a rename that dropped the columns would empty the view.
        expect(action?.payload).toMatchObject({
            uuid: 'view-1',
            view: {
                name: 'Expiring soon',
                columns: [
                    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' },
                    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER', label: 'Expires' },
                ],
                filters: [stateFilter],
            },
        });
    });

    test('names the view it is about to delete, and falls back to Standard', async ({ mount, page }) => {
        await mount(strip());

        await page.getByTestId('view-tabs-tab-view-1').click();
        await openTabMenu(page, 'Expiry watch');
        await page.getByRole('menuitem', { name: 'Delete view' }).click();

        await expect(page.getByTestId('view-tabs-delete')).toContainText('"Expiry watch"');

        await page.getByTestId('view-tabs-delete').getByRole('button', { name: 'Delete' }).click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/deleteView');
        const action = await lastDispatched(page, 'listViews/deleteView');
        expect(action?.payload).toMatchObject({ resource: Resource.Certificates, uuid: 'view-1' });

        await expect(page.getByTestId('view-tabs-tab-standard')).toHaveAttribute('aria-selected', 'true');
        const slice = await appliedSlice(page);
        expect(slice.columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME', 'SERIAL_NUMBER']);
        expect(slice.filters).toEqual([]);
        expect(slice.sort).toBeUndefined();
    });

    test('names a stored column this listing cannot display, and keeps it reachable in the picker', async ({ mount, page }) => {
        // Reachable because the catalogue the API validates a view against carries no notion of
        // `displayable`: a column the listing cannot render can be stored by any client and comes back
        // intact, unlike a deleted field, which the API omits on read.
        const stale = expiryWatch({
            defaultView: true,
            columns: [stored('COMMON_NAME'), stored('retired', FilterFieldSource.Custom)],
        });
        await mount(strip({ views: [stale] }));

        await expect(page.getByTestId('view-tabs-notice')).toContainText('retired cannot be shown');
        await expect(page.getByTestId('view-tabs-notice')).toContainText('showing 1 of its 2 columns');

        // Nothing is dropped server-side, so the notice's offer is to open the picker over the stored
        // list rather than to repair it silently.
        await page.getByTestId('view-tabs-notice-review').click();

        await expect(page.getByTestId('view-tabs-picker')).toBeVisible();
        await expect(page.getByTestId('selected-column-custom:retired')).toContainText('Unavailable');
    });

    test('keeps the live filters and ordering when the columns are edited from the menu', async ({ mount, page }) => {
        await mount(strip({ views: [expiryWatch({ defaultView: true })] }));

        await openTabMenu(page, 'Expiry watch');
        await page.getByRole('menuitem', { name: 'Edit columns…' }).click();

        await page.getByTestId('add-field-property:SERIAL_NUMBER').click();
        await page.getByTestId('view-tabs-picker').getByRole('button', { name: 'Save' }).click();

        const slice = await appliedSlice(page);
        expect(slice.columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME', 'NOT_AFTER', 'SERIAL_NUMBER']);
        expect(slice.filters).toEqual([stateFilter]);
        expect(slice.sort).toEqual({ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER', direction: 'asc' });

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const action = await lastDispatched(page, 'listViews/updateView');
        expect(action?.payload).toMatchObject({
            view: {
                columns: [
                    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' },
                    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER', label: 'Expires' },
                    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'SERIAL_NUMBER' },
                ],
            },
        });
    });

    test('shows the new tab before the API has answered, then follows the uuid it is given', async ({ mount, page }) => {
        await mount(strip());

        await page.getByTestId('view-tabs-new').click();
        await page.getByTestId('view-tabs-create-input').click();
        await page.getByTestId('view-tabs-create-input').fill('Everything');
        await page.getByTestId('view-tabs-create').getByRole('button', { name: 'Create view' }).click();

        // The tab appears the moment it is asked for, under the uuid the optimistic row carries.
        await expect(page.getByTestId('view-tabs-tab-pending-view')).toContainText('Everything');
        await expect(page.getByTestId('view-tabs-tab-pending-view')).toHaveAttribute('aria-selected', 'true');

        await page.getByTestId('simulate-create-success').click();

        await expect(page.getByTestId('view-tabs-tab-view-created')).toContainText('Everything');
        await expect(page.getByTestId('view-tabs-tab-view-created')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('view-tabs-tab-pending-view')).toHaveCount(0);
    });

    test('falls back to the standard columns when none of the stored ones can be shown', async ({ mount, page }) => {
        const stale = expiryWatch({
            defaultView: true,
            columns: [stored('retired', FilterFieldSource.Custom), stored('gone', FilterFieldSource.Custom)],
        });
        await mount(strip({ views: [stale] }));

        await expect(page.getByTestId('view-tabs-notice')).toContainText(
            'retired and gone cannot be shown, so it is showing the standard columns.',
        );

        const slice = await appliedSlice(page);
        expect(slice.columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME', 'SERIAL_NUMBER']);
    });

    test('falls back for a view that arrives carrying no columns at all', async ({ mount, page }) => {
        // What the API returns once every field the view was built on has been deleted: it resolves the
        // stored identifiers on read and omits the ones it cannot offer. Rendering that literally would
        // leave a table with no columns, under a tab that still claims to be a view.
        await mount(strip({ views: [expiryWatch({ defaultView: true, columns: [] })] }));

        await expect(page.getByTestId('view-tabs-notice')).toContainText('so it is showing the standard columns.');

        expect((await appliedSlice(page)).columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME', 'SERIAL_NUMBER']);

        // The dialog opens on what the table is showing, so Save writes a usable view rather than an
        // empty one.
        await page.getByTestId('view-tabs-notice-review').click();

        await expect(page.getByTestId('selected-column-property:COMMON_NAME')).toBeVisible();
        await expect(page.getByTestId('selected-column-property:SERIAL_NUMBER')).toBeVisible();
    });

    test('names the ordering even when the column it orders by is not displayed', async ({ mount, page }) => {
        const narrow = expiryWatch({
            defaultView: true,
            columns: [stored('COMMON_NAME')],
            sort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'SERIAL_NUMBER', direction: SortDirection.Desc },
        });
        await mount(strip({ views: [narrow] }));

        await expect(page.getByTestId('view-tabs-summary-columns')).toHaveText('1 column');
        // The identifier stands in for a heading the table is not showing, so the ordering stays
        // legible rather than reading as unsorted.
        await expect(page.getByTestId('view-tabs-summary-sort')).toContainText('Sorted by SERIAL_NUMBER');
        await expect(page.getByTestId('view-tabs-summary-sort').getByLabel('descending')).toBeVisible();
    });

    test('renders nothing until the view list has settled', async ({ mount, page }) => {
        // An empty read is otherwise indistinguishable from one still in flight, and the strip would
        // then read the first optimistic create as the initial result and throw the user off it.
        await mount(strip({ hasLoaded: false }));

        await expect(page.getByTestId('view-tabs')).toHaveCount(0);
    });

    test('waits for the catalogue before offering any tab', async ({ mount, page }) => {
        await mount(strip({ views: [expiryWatch({ defaultView: true })], withheldCatalogue: true }));

        // Without the catalogue every stored column resolves to nothing, so a tab applied now would
        // show the platform columns under that view's name and stay there.
        await expect(page.getByTestId('view-tabs')).toHaveCount(0);
        expect((await appliedSlice(page)).columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME', 'SERIAL_NUMBER']);

        await page.getByTestId('release-catalogue').click();

        await expect(page.getByTestId('view-tabs-tab-view-1')).toHaveAttribute('aria-selected', 'true');
        expect((await appliedSlice(page)).columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME', 'NOT_AFTER']);
        await expect(page.getByTestId('view-tabs-notice')).toHaveCount(0);
    });

    test('puts the tab back when a create fails, without dropping what it was saving', async ({ mount, page }) => {
        await mount(strip({ driftSort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: 'desc' } }));

        await page.getByTestId('view-tabs-tab-view-1').click();
        await page.getByTestId('view-tabs-new').click();
        await page.getByTestId('view-tabs-create-input').click();
        await page.getByTestId('view-tabs-create-input').fill('Everything');
        await page.getByTestId('view-tabs-create').getByRole('button', { name: 'Create view' }).click();

        await expect(page.getByTestId('view-tabs-tab-pending-view')).toHaveAttribute('aria-selected', 'true');

        await page.getByTestId('simulate-create-failure').click();

        // The rollback takes the optimistic row away, so the strip has to go back to the tab the create
        // started from rather than leave every tab unselected.
        await expect(page.getByTestId('view-tabs-tab-pending-view')).toHaveCount(0);
        await expect(page.getByTestId('view-tabs-tab-view-1')).toHaveAttribute('aria-selected', 'true');
        expect((await appliedSlice(page)).filters).toEqual([stateFilter]);
    });

    test('holds its own actions while a mutation is in flight', async ({ mount, page }) => {
        await mount(strip({ isMutating: true }));

        await expect(page.getByTestId('view-tabs-new')).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Actions for Standard' })).toBeDisabled();
    });
});
