import type { Page } from '@playwright/test';
import type { SearchFilterModel } from 'types/certificate';
import type { ListViewColumnModel, ListViewModel, ViewSlice } from 'types/listViews';
import {
    AttributeContentType,
    FilterConditionOperator,
    FilterFieldSource,
    FilterFieldType,
    ListViewFieldStatus,
    Resource,
    type SearchFieldDataByGroupDto,
    SortDirection,
} from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import type { ColumnSort } from 'utils/tableColumns';
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

/** A catalogue that loaded successfully but publishes nothing the listing can show as a column. */
const undisplayableCatalogue = [
    {
        filterFieldSource: FilterFieldSource.Property,
        searchFieldData: [field('SIGNATURE', 'Signature', { displayable: false })],
    },
] as unknown as SearchFieldDataByGroupDto[];

/** A catalogue whose custom source publishes a secret attribute, which the filter widget offers. */
const secretCatalogue = [
    ...catalogue,
    {
        filterFieldSource: FilterFieldSource.Custom,
        searchFieldData: [field('vaultToken', 'Vault Token', { displayable: false, attributeContentType: AttributeContentType.Secret })],
    },
] as unknown as SearchFieldDataByGroupDto[];

const secretFilter: SearchFilterModel = {
    fieldSource: FilterFieldSource.Custom,
    fieldIdentifier: 'vaultToken',
    condition: FilterConditionOperator.Equals,
    value: 'hunter2',
};

/** The catalogue after an attribute named like a deleted one was created again. */
const withRetired = [
    ...catalogue,
    { filterFieldSource: FilterFieldSource.Custom, searchFieldData: [field('retired', 'Retired')] },
] as unknown as SearchFieldDataByGroupDto[];

/** As `withRetired`, with the re-created attribute published as one the listing cannot display. */
const hiddenRetired = [
    ...catalogue,
    { filterFieldSource: FilterFieldSource.Custom, searchFieldData: [field('retired', 'Retired', { displayable: false })] },
] as unknown as SearchFieldDataByGroupDto[];

const retiredFilter: SearchFilterModel = {
    fieldSource: FilterFieldSource.Custom,
    fieldIdentifier: 'retired',
    condition: FilterConditionOperator.Equals,
    value: 'true',
};

/** A stored column or filter whose attribute Core reports as replaced by another definition under the same name. */
const replaced = <T extends object>(entry: T): T & { status: ListViewFieldStatus } => ({ ...entry, status: ListViewFieldStatus.Replaced });

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
    fields?: SearchFieldDataByGroupDto[];
    standardColumns?: ColumnDefinition[];
    isMutating?: boolean;
    hasLoaded?: boolean;
    isRefreshing?: boolean;
    refreshedViews?: ListViewModel[];
    withheldCatalogue?: boolean;
    dropsUnshownSort?: boolean;
    isCatalogueLoaded?: boolean;
    renderableProperties?: string[];
    driftColumn?: ColumnDefinition;
    driftSort?: { fieldSource: FilterFieldSource; fieldIdentifier: string; direction: 'asc' | 'desc' };
    driftFilter?: SearchFilterModel;
    returnTo?: { viewId: string; filters: SearchFilterModel[] };
};

const strip = ({
    views = [expiryWatch()],
    fields = catalogue,
    standardColumns: standard = standardColumns,
    isMutating,
    hasLoaded,
    isRefreshing,
    refreshedViews,
    withheldCatalogue,
    dropsUnshownSort,
    isCatalogueLoaded,
    renderableProperties,
    driftColumn,
    driftSort,
    driftFilter,
    returnTo,
}: MountOptions = {}) => (
    <ViewTabsWithStore
        resource={Resource.Certificates}
        views={views}
        catalogue={fields}
        standardColumns={standard}
        isMutating={isMutating}
        hasLoaded={hasLoaded}
        isRefreshing={isRefreshing}
        refreshedViews={refreshedViews}
        withheldCatalogue={withheldCatalogue}
        dropsUnshownSort={dropsUnshownSort}
        isCatalogueLoaded={isCatalogueLoaded}
        renderableProperties={renderableProperties}
        driftColumn={driftColumn}
        driftSort={driftSort}
        driftFilter={driftFilter}
        returnTo={returnTo}
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

// A slice applied from an effect renders a frame later, so asserting that something did not happen has to wait for it.
const settle = async (page: Page) => {
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)))));
};

const openTabMenu = async (page: Page, name: string) => {
    await page.getByRole('button', { name: `Actions for ${name}` }).click();
};

/** Expiry watch, then enough views to push the last two past the strip's cap. */
const overflowing = (overrides: Record<string, Partial<ListViewModel>> = {}): ListViewModel[] => [
    expiryWatch(overrides['view-1']),
    ...[2, 3, 4, 5, 6].map((index) => audit({ uuid: `view-${index}`, name: `View ${index}`, ...overrides[`view-${index}`] })),
];

const openOverflowActions = async (page: Page, name: string) => {
    await page.getByRole('button', { name: 'More saved views' }).click();
    await page.getByRole('menuitem', { name: `Actions for ${name}` }).click();
};

const ownFilter: SearchFilterModel = { ...retiredFilter, value: 'false' };

/** A default view whose Retired column is held back, with the user's own Retired filter ready to apply. */
const heldBackStrip = (options: MountOptions = {}) =>
    strip({
        views: [
            expiryWatch({
                defaultView: true,
                columns: [stored('COMMON_NAME'), replaced(stored('retired', FilterFieldSource.Custom))],
                filters: [replaced(retiredFilter)],
                sort: undefined,
            }),
        ],
        fields: withRetired,
        driftFilter: ownFilter,
        ...options,
    });

const saveOwnFilter = async (page: Page) => {
    await expect(page.getByTestId('view-tabs-returned')).toBeVisible();
    await page.getByTestId('drift-filter').click();
    await page.getByTestId('view-tabs-summary-save').click();
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
    });

    test('offers the full menu on a stored view', async ({ mount, page }) => {
        await mount(strip());

        await page.getByTestId('view-tabs-tab-view-1').click();
        await openTabMenu(page, 'Expiry watch');

        await expect(page.getByRole('menuitem', { name: 'Rename…' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Open this view by default' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Delete view' })).toBeVisible();
    });

    test('offers to unpin the view that is already pinned in place of pinning it', async ({ mount, page }) => {
        await mount(strip({ views: [expiryWatch({ defaultView: true })] }));

        await openTabMenu(page, 'Expiry watch');

        await expect(page.getByRole('menuitem', { name: 'Rename…' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Stop opening this view by default' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Open this view by default' })).toHaveCount(0);
    });

    test('offers no unpin action on a view that is not pinned', async ({ mount, page }) => {
        await mount(strip());

        await page.getByTestId('view-tabs-tab-view-1').click();
        await openTabMenu(page, 'Expiry watch');

        await expect(page.getByRole('menuitem', { name: 'Open this view by default' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Stop opening this view by default' })).toHaveCount(0);
    });

    test('unpins a view from its menu and leaves the rest of the view untouched', async ({ mount, page }) => {
        await mount(strip({ views: [expiryWatch({ defaultView: true })] }));

        await openTabMenu(page, 'Expiry watch');
        await page.getByRole('menuitem', { name: 'Stop opening this view by default' }).click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const action = await lastDispatched(page, 'listViews/updateView');
        expect(action?.payload).toEqual({
            resource: Resource.Certificates,
            uuid: 'view-1',
            view: {
                name: 'Expiry watch',
                columns: [stored('COMMON_NAME'), stored('NOT_AFTER', FilterFieldSource.Property, 'Expires')],
                filters: [stateFilter],
                sort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER', direction: SortDirection.Asc },
                defaultView: false,
            },
        });
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
        await page.getByRole('menuitem', { name: 'View 6', exact: true }).click();

        // The selected tab is pulled onto the strip, displacing the last visible one — a tab picked
        // from the overflow has to be the one the strip shows as active.
        await expect(page.getByTestId('view-tabs-tab-view-6')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('view-tabs-tab-view-4')).toHaveCount(0);
    });

    test('counts every saved view in the overflow menu', async ({ mount, page }) => {
        await mount(strip({ views: overflowing() }));

        await page.getByRole('button', { name: 'More saved views' }).click();

        await expect(page.getByTestId('view-tabs-overflow-count')).toHaveText('6 saved views');
    });

    test('deletes a view from the overflow without applying it', async ({ mount, page }) => {
        await mount(strip({ views: overflowing() }));
        await page.getByTestId('view-tabs-tab-view-1').click();

        await openOverflowActions(page, 'View 6');
        await page.getByRole('menuitem', { name: 'Delete view' }).click();
        await expect(page.getByTestId('view-tabs-delete')).toContainText('"View 6"');
        await page.getByTestId('view-tabs-delete').getByRole('button', { name: 'Delete' }).click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/deleteView');
        expect((await lastDispatched(page, 'listViews/deleteView'))?.payload).toMatchObject({ uuid: 'view-6' });
        await expect(page.getByTestId('view-tabs-tab-view-1')).toHaveAttribute('aria-selected', 'true');
        expect((await appliedSlice(page)).filters).toEqual([stateFilter]);
    });

    test('renames a view from the overflow without applying it', async ({ mount, page }) => {
        await mount(strip({ views: overflowing() }));
        await page.getByTestId('view-tabs-tab-view-1').click();

        await openOverflowActions(page, 'View 6');
        await page.getByRole('menuitem', { name: 'Rename…' }).click();
        await expect(page.getByTestId('view-tabs-rename-input')).toHaveValue('View 6');
        await page.getByTestId('view-tabs-rename-input').click();
        await page.getByTestId('view-tabs-rename-input').fill('Retired');
        await page.getByTestId('view-tabs-rename').getByRole('button', { name: 'Rename' }).click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        expect((await lastDispatched(page, 'listViews/updateView'))?.payload).toMatchObject({
            uuid: 'view-6',
            view: { name: 'Retired', columns: [stored('environment', FilterFieldSource.Custom)] },
        });
        await expect(page.getByTestId('view-tabs-tab-view-1')).toHaveAttribute('aria-selected', 'true');
        expect((await appliedSlice(page)).filters).toEqual([stateFilter]);
    });

    test('pins a view from the overflow', async ({ mount, page }) => {
        await mount(strip({ views: overflowing() }));

        await openOverflowActions(page, 'View 6');
        await page.getByRole('menuitem', { name: 'Open this view by default' }).click();
        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        expect((await lastDispatched(page, 'listViews/updateView'))?.payload).toMatchObject({
            uuid: 'view-6',
            view: { defaultView: true },
        });
    });

    test('offers to unpin a pinned view held in the overflow', async ({ mount, page }) => {
        await mount(strip({ views: overflowing({ 'view-6': { defaultView: true } }) }));
        await page.getByTestId('view-tabs-tab-standard').click();

        await openOverflowActions(page, 'View 6');
        await page.getByRole('menuitem', { name: 'Stop opening this view by default' }).click();
        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        expect((await lastDispatched(page, 'listViews/updateView'))?.payload).toMatchObject({
            uuid: 'view-6',
            view: { defaultView: false },
        });
    });

    test('keeps the active view and its unsaved changes while the overflow actions are walked with the arrow keys', async ({
        mount,
        page,
    }) => {
        const driftSort = { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: 'desc' as const };
        await mount(strip({ views: overflowing(), driftSort }));
        await page.getByTestId('view-tabs-tab-view-1').click();
        await page.getByTestId('drift-sort').click();

        await page.getByRole('button', { name: 'More saved views' }).click();
        const actions = page.getByRole('menuitem', { name: 'Actions for View 6' });
        await actions.focus();
        await page.keyboard.press('ArrowRight');
        await expect(page.getByRole('menuitem', { name: 'Rename…' })).toBeFocused();
        await page.keyboard.press('ArrowLeft');
        await expect(actions).toBeFocused();

        await expect(page.getByTestId('view-tabs-tab-view-1')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toBeVisible();
        expect((await appliedSlice(page)).sort).toEqual(driftSort);
    });

    test('holds the overflow actions while a mutation is in flight, but not the views themselves', async ({ mount, page }) => {
        await mount(strip({ views: overflowing(), isMutating: true }));

        await page.getByRole('button', { name: 'More saved views' }).click();

        await expect(page.getByRole('menuitem', { name: 'Actions for View 6' })).toHaveAttribute('aria-disabled', 'true');
        await expect(page.getByRole('menuitem', { name: 'View 6', exact: true })).not.toHaveAttribute('aria-disabled', 'true');
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

    test('starts a new view from the Standard columns rather than the active view', async ({ mount, page }) => {
        await mount(strip());

        await page.getByTestId('view-tabs-tab-view-1').click();
        await page.getByTestId('view-tabs-new').click();

        await expect(page.getByTestId('view-tabs-create-input')).toHaveValue('New view');

        await page.getByTestId('view-tabs-create').getByRole('button', { name: 'Create view' }).click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/createView');
        const view = (await lastDispatched(page, 'listViews/createView'))?.payload?.view as Record<string, unknown>;
        expect(view).toMatchObject({
            name: 'New view',
            columns: [
                { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' },
                { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'SERIAL_NUMBER' },
            ],
            filters: [],
            defaultView: false,
        });
        expect(view.sort).toBeUndefined();

        const applied = await appliedSlice(page);
        expect(applied.columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME', 'SERIAL_NUMBER']);
        expect(applied.filters).toEqual([]);
        expect(applied.sort).toBeUndefined();
        await expect(page.getByTestId('view-tabs-tab-pending-view')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('view-tabs-tab-pending-view-dirty')).toHaveCount(0);
    });

    test('numbers the offered new-view name once it is taken', async ({ mount, page }) => {
        await mount(strip({ views: [expiryWatch(), audit({ name: 'New view' })] }));

        await page.getByTestId('view-tabs-new').click();

        await expect(page.getByTestId('view-tabs-create-input')).toHaveValue('New view 2');
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

    test('refuses the name of the Standard tab for a new view, though Standard is not a stored view', async ({ mount, page }) => {
        await mount(strip());

        await page.getByTestId('view-tabs-new').click();
        await page.getByTestId('view-tabs-create-input').click();
        await page.getByTestId('view-tabs-create-input').fill('Standard');

        await expect(page.getByTestId('view-tabs-create')).toContainText('A view of this name already exists.');
        await expect(page.getByTestId('view-tabs-create').getByRole('button', { name: 'Create view' })).toBeDisabled();
    });

    test('refuses to rename a view to the name of the Standard tab', async ({ mount, page }) => {
        await mount(strip());

        await page.getByTestId('view-tabs-tab-view-1').click();
        await openTabMenu(page, 'Expiry watch');
        await page.getByRole('menuitem', { name: 'Rename…' }).click();
        await page.getByTestId('view-tabs-rename-input').click();
        await page.getByTestId('view-tabs-rename-input').fill('Standard');

        await expect(page.getByTestId('view-tabs-rename')).toContainText('A view of this name already exists.');
        await expect(page.getByTestId('view-tabs-rename').getByRole('button', { name: 'Rename' })).toBeDisabled();
    });

    test('duplicates the active tab under a name that is free', async ({ mount, page }) => {
        await mount(strip({ views: [expiryWatch(), audit({ name: 'Expiry watch (copy)' })] }));

        await page.getByTestId('view-tabs-tab-view-1').click();
        await openTabMenu(page, 'Expiry watch');
        await page.getByRole('menuitem', { name: 'Duplicate' }).click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/createView');
        const action = await lastDispatched(page, 'listViews/createView');
        expect(action?.payload).toMatchObject({
            view: {
                name: 'Expiry watch (copy) 2',
                columns: [stored('COMMON_NAME'), stored('NOT_AFTER', FilterFieldSource.Property, 'Expires')],
                filters: [stateFilter],
                sort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER', direction: SortDirection.Asc },
            },
        });
        expect((await appliedSlice(page)).filters).toEqual([stateFilter]);
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

    test('names a stored column this listing cannot display', async ({ mount, page }) => {
        const stale = expiryWatch({
            defaultView: true,
            columns: [stored('COMMON_NAME'), stored('retired', FilterFieldSource.Custom)],
        });
        await mount(strip({ views: [stale] }));

        await expect(page.getByTestId('view-tabs-notice')).toContainText('retired cannot be shown');
        await expect(page.getByTestId('view-tabs-notice')).toContainText('showing 1 of its 2 columns');
    });

    test('takes a column it cannot show out of the view, which has no header to remove it from', async ({ mount, page }) => {
        const stale = expiryWatch({
            defaultView: true,
            columns: [stored('COMMON_NAME'), stored('retired', FilterFieldSource.Custom)],
        });
        await mount(strip({ views: [stale] }));
        await expect(page.getByTestId('view-tabs-notice')).toBeVisible();

        await page.getByTestId('view-tabs-notice-remove').click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const action = await lastDispatched(page, 'listViews/updateView');
        expect(action?.payload).toMatchObject({ view: { columns: [{ fieldIdentifier: 'COMMON_NAME' }] } });
    });

    test('refuses the notice removal while another view write is still out', async ({ mount, page }) => {
        const stale = expiryWatch({
            defaultView: true,
            columns: [stored('COMMON_NAME'), stored('retired', FilterFieldSource.Custom)],
        });
        await mount(strip({ views: [stale], isMutating: true }));

        await expect(page.getByTestId('view-tabs-notice')).toBeVisible();
        await expect(page.getByTestId('view-tabs-notice-remove')).toBeDisabled();
    });

    test('offers no removal when nothing resolved, where the table is showing the platform set instead', async ({ mount, page }) => {
        const stale = expiryWatch({
            defaultView: true,
            columns: [stored('retired', FilterFieldSource.Custom), stored('gone', FilterFieldSource.Custom)],
        });
        await mount(strip({ views: [stale] }));

        await expect(page.getByTestId('view-tabs-notice')).toContainText('showing the standard columns');
        await expect(page.getByTestId('view-tabs-notice-remove')).toHaveCount(0);
    });

    test('offers no such removal on Standard, which stores nothing to remove from', async ({ mount, page }) => {
        await mount(strip());

        await expect(page.getByTestId('view-tabs-notice-remove')).toHaveCount(0);
    });

    test('shows the new tab before the API has answered, then follows the uuid it is given', async ({ mount, page }) => {
        await mount(strip());

        await page.getByTestId('view-tabs-new').click();
        await page.getByTestId('view-tabs-create-input').click();
        await page.getByTestId('view-tabs-create-input').fill('Everything');
        await page.getByTestId('view-tabs-create').getByRole('button', { name: 'Create view' }).click();

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

    test('puts the tab back when a create from the current slice fails, without dropping what it was saving', async ({ mount, page }) => {
        await mount(strip({ driftSort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: 'desc' } }));

        await page.getByTestId('drift-sort').click();
        await page.getByTestId('view-tabs-summary-save').click();
        await page.getByTestId('view-tabs-create').getByRole('button', { name: 'Create view' }).click();

        await expect(page.getByTestId('view-tabs-tab-pending-view')).toHaveAttribute('aria-selected', 'true');

        await page.getByTestId('simulate-create-failure').click();

        await expect(page.getByTestId('view-tabs-tab-standard')).toHaveAttribute('aria-selected', 'true');
        expect((await appliedSlice(page)).sort).toEqual({
            fieldSource: FilterFieldSource.Property,
            fieldIdentifier: 'COMMON_NAME',
            direction: 'desc',
        });
    });

    test('puts the tab and its unsaved rows back when a new view fails to create', async ({ mount, page }) => {
        const nameFilter: SearchFilterModel = {
            fieldSource: FilterFieldSource.Property,
            fieldIdentifier: 'COMMON_NAME',
            condition: FilterConditionOperator.Contains,
            value: 'example',
        };
        await mount(strip({ driftFilter: nameFilter }));

        await page.getByTestId('view-tabs-tab-view-1').click();
        await page.getByTestId('drift-filter').click();
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toBeVisible();
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
        expect((await appliedSlice(page)).filters).toEqual([nameFilter]);
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toBeVisible();
    });

    test('opens on a catalogue that loaded carrying nothing the listing can show', async ({ mount, page }) => {
        // A settled read that published only non-displayable fields is not a read still in flight, and
        // Standard needs no catalogue field of its own — gating on the displayable ones would hide the
        // strip for good on such a resource.
        await mount(strip({ fields: undisplayableCatalogue, views: [] }));

        await expect(page.getByTestId('view-tabs-tab-standard')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('view-tabs-new')).toBeEnabled();
    });

    test('keeps a filter on secret content out of the view it saves', async ({ mount, page }) => {
        await mount(strip({ fields: secretCatalogue, views: [], driftFilter: secretFilter }));

        await page.getByTestId('drift-filter').click();

        // A view is stored verbatim by Core and read back by every client that opens it, so the value
        // must not reach the request — and, since the view cannot hold it, it is not drift either.
        await expect(page.getByTestId('view-tabs-summary-unsaved')).toHaveCount(0);

        await page.getByTestId('view-tabs-new').click();
        await page.getByTestId('view-tabs-create-input').click();
        await page.getByTestId('view-tabs-create-input').fill('Everything');
        await page.getByTestId('view-tabs-create').getByRole('button', { name: 'Create view' }).click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/createView');
        const action = await lastDispatched(page, 'listViews/createView');
        expect(action?.payload).toMatchObject({ view: { filters: [] } });
        expect(JSON.stringify(action)).not.toContain('hunter2');
    });

    test('drops a stored filter on secret content from a rename, and does not read it as drift', async ({ mount, page }) => {
        // Such a view cannot be written by this client, but it can arrive from one that predates the
        // rule. A rename sends the whole row back, so the plaintext would be rewritten on every one.
        const legacy = expiryWatch({ filters: [stateFilter, secretFilter] });
        await mount(strip({ fields: secretCatalogue, views: [legacy] }));

        await page.getByTestId('view-tabs-tab-view-1').click();

        // Drift is measured against what a save would keep, or the view reads as permanently drifted
        // and offers a Save that changes nothing.
        await expect(page.getByTestId('view-tabs-summary-unsaved')).toHaveCount(0);

        await openTabMenu(page, 'Expiry watch');
        await page.getByRole('menuitem', { name: 'Rename…' }).click();
        await page.getByTestId('view-tabs-rename-input').click();
        await page.getByTestId('view-tabs-rename-input').fill('Expiring soon');
        await page.getByTestId('view-tabs-rename').getByRole('button', { name: 'Rename' }).click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const action = await lastDispatched(page, 'listViews/updateView');
        expect(action?.payload).toMatchObject({ view: { name: 'Expiring soon', filters: [stateFilter] } });
        expect(JSON.stringify(action)).not.toContain('hunter2');
    });

    test('drops a stored filter on secret content from a pin, which names no filters at all', async ({ mount, page }) => {
        await mount(strip({ fields: secretCatalogue, views: [expiryWatch({ filters: [secretFilter] })] }));

        await page.getByTestId('view-tabs-tab-view-1').click();
        await openTabMenu(page, 'Expiry watch');
        await page.getByRole('menuitem', { name: 'Open this view by default' }).click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const action = await lastDispatched(page, 'listViews/updateView');
        expect(action?.payload).toMatchObject({ view: { defaultView: true, filters: [] } });
        expect(JSON.stringify(action)).not.toContain('hunter2');
    });

    test('keeps a column it cannot show when the ordering alone is saved', async ({ mount, page }) => {
        const stale = expiryWatch({
            defaultView: true,
            columns: [stored('COMMON_NAME'), stored('vaultToken', FilterFieldSource.Custom)],
        });
        await mount(
            strip({
                fields: secretCatalogue,
                views: [stale],
                driftSort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: 'desc' },
            }),
        );

        await page.getByTestId('drift-sort').click();
        await page.getByTestId('view-tabs-summary-save').click();

        // The table never showed the column, so the user was never offered the choice to drop it. Only
        // the picker removes one, because it is the only place one is shown.
        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const action = await lastDispatched(page, 'listViews/updateView');
        expect(action?.payload).toMatchObject({
            view: {
                columns: [
                    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' },
                    { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'vaultToken' },
                ],
            },
        });
    });

    test('drops a display-only column the catalogue does not publish when duplicating', async ({ mount, page }) => {
        await mount(
            strip({ views: [], standardColumns: [commonName, { ...column('CK_ASSOCIATIONS', 'Associations'), displayOnly: true }] }),
        );

        await openTabMenu(page, 'Standard');
        await page.getByRole('menuitem', { name: 'Duplicate' }).click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/createView');
        const action = await lastDispatched(page, 'listViews/createView');
        expect(action?.payload).toMatchObject({
            view: { columns: [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' }] },
        });
        expect(JSON.stringify(action)).not.toContain('CK_ASSOCIATIONS');

        await page.getByTestId('simulate-create-success').click();

        await expect(page.getByTestId('view-tabs-tab-view-created')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('view-tabs-tab-view-created-dirty')).toHaveCount(0);
        expect((await appliedSlice(page)).columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME']);
    });

    for (const { outcome, settle, tab, columns } of [
        { outcome: 'is created', settle: 'simulate-create-success', tab: 'view-tabs-tab-view-created', columns: ['COMMON_NAME'] },
        { outcome: 'fails', settle: 'simulate-create-failure', tab: 'view-tabs-tab-standard', columns: ['COMMON_NAME', 'CK_ASSOCIATIONS'] },
    ]) {
        test(`keeps an ordering chosen while a trimmed duplicate is out when it ${outcome}`, async ({ mount, page }) => {
            const sortByName: ColumnSort = { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: 'desc' };
            await mount(
                strip({
                    views: [],
                    standardColumns: [commonName, { ...column('CK_ASSOCIATIONS', 'Associations'), displayOnly: true }],
                    driftSort: sortByName,
                }),
            );

            await openTabMenu(page, 'Standard');
            await page.getByRole('menuitem', { name: 'Duplicate' }).click();
            await expect.poll(() => dispatchedTypes(page)).toContain('listViews/createView');

            await page.getByTestId('drift-sort').click();
            await page.getByTestId(settle).click();

            await expect(page.getByTestId(tab)).toHaveAttribute('aria-selected', 'true');
            expect((await appliedSlice(page)).sort).toEqual(sortByName);
            expect((await appliedSlice(page)).columns.map((each) => each.fieldIdentifier)).toEqual(columns);
        });
    }

    test('puts back the columns a trimmed duplicate left out when the create fails', async ({ mount, page }) => {
        await mount(
            strip({ views: [], standardColumns: [commonName, { ...column('CK_ASSOCIATIONS', 'Associations'), displayOnly: true }] }),
        );

        await openTabMenu(page, 'Standard');
        await page.getByRole('menuitem', { name: 'Duplicate' }).click();
        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/createView');

        await page.getByTestId('simulate-create-failure').click();

        await expect(page.getByTestId('view-tabs-tab-standard')).toHaveAttribute('aria-selected', 'true');
        expect((await appliedSlice(page)).columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME', 'CK_ASSOCIATIONS']);
    });

    test('puts a left-out filter back beside one set while a trimmed duplicate is out when the create fails', async ({ mount, page }) => {
        const deadFilter: SearchFilterModel = {
            fieldSource: FilterFieldSource.Custom,
            fieldIdentifier: 'retired',
            condition: FilterConditionOperator.Equals,
            value: 'x',
        };
        const nameFilter: SearchFilterModel = {
            fieldSource: FilterFieldSource.Property,
            fieldIdentifier: 'COMMON_NAME',
            condition: FilterConditionOperator.Contains,
            value: 'example',
        };
        await mount(strip({ views: [expiryWatch({ defaultView: true, filters: [stateFilter, deadFilter] })], driftFilter: nameFilter }));

        await openTabMenu(page, 'Expiry watch');
        await page.getByRole('menuitem', { name: 'Duplicate' }).click();
        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/createView');
        expect((await appliedSlice(page)).filters).toEqual([stateFilter]);

        await page.getByTestId('drift-filter').click();
        await page.getByTestId('simulate-create-failure').click();

        await expect(page.getByTestId('view-tabs-tab-view-1')).toHaveAttribute('aria-selected', 'true');
        expect((await appliedSlice(page)).filters).toEqual([nameFilter, deadFilter]);
    });

    test('stores a platform column the catalogue leaves out, so the new view opens unchanged', async ({ mount, page }) => {
        const certificateType = column('CERTIFICATE_TYPE', 'Certificate Type');
        await mount(strip({ views: [], standardColumns: [commonName, certificateType] }));

        await page.getByTestId('view-tabs-new').click();
        await page.getByTestId('view-tabs-create').getByRole('button', { name: 'Create view' }).click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/createView');
        const action = await lastDispatched(page, 'listViews/createView');
        expect(action?.payload).toMatchObject({ view: { columns: [stored('COMMON_NAME'), stored('CERTIFICATE_TYPE')] } });

        await page.getByTestId('simulate-create-success').click();

        await expect(page.getByTestId('view-tabs-tab-view-created')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('view-tabs-tab-view-created-dirty')).toHaveCount(0);
    });

    test('saves a platform column the catalogue leaves out into the view', async ({ mount, page }) => {
        const certificateType = column('CERTIFICATE_TYPE', 'Certificate Type');
        await mount(
            strip({
                views: [expiryWatch({ defaultView: true, columns: [stored('CERTIFICATE_TYPE')] })],
                standardColumns: [commonName, certificateType],
                driftSort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: 'desc' },
            }),
        );

        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toHaveCount(0);
        await page.getByTestId('drift-sort').click();
        await page.getByTestId('view-tabs-summary-save').click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const action = await lastDispatched(page, 'listViews/updateView');
        expect(action?.payload).toMatchObject({ view: { columns: [stored('CERTIFICATE_TYPE')] } });
    });

    test('keeps a column whose field is gone, in place, when the view is saved', async ({ mount, page }) => {
        const dormant = expiryWatch({
            defaultView: true,
            columns: [stored('retired', FilterFieldSource.Custom), stored('COMMON_NAME')],
        });
        await mount(
            strip({
                views: [dormant],
                driftSort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: 'desc' },
            }),
        );

        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toHaveCount(0);
        await page.getByTestId('drift-sort').click();
        await page.getByTestId('view-tabs-summary-save').click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const action = await lastDispatched(page, 'listViews/updateView');
        expect((action?.payload?.view as { columns: unknown } | undefined)?.columns).toEqual([
            stored('retired', FilterFieldSource.Custom),
            stored('COMMON_NAME'),
        ]);
    });

    test('carries a column whose field is gone through a rename', async ({ mount, page }) => {
        const dormant = expiryWatch({ defaultView: true, columns: [stored('COMMON_NAME'), stored('retired', FilterFieldSource.Custom)] });
        await mount(strip({ views: [dormant] }));

        await openTabMenu(page, 'Expiry watch');
        await page.getByRole('menuitem', { name: 'Rename…' }).click();
        await page.getByTestId('view-tabs-rename-input').click();
        await page.getByTestId('view-tabs-rename-input').fill('Expiring soon');
        await page.getByTestId('view-tabs-rename').getByRole('button', { name: 'Rename' }).click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const action = await lastDispatched(page, 'listViews/updateView');
        expect((action?.payload?.view as { columns: unknown } | undefined)?.columns).toEqual([
            stored('COMMON_NAME'),
            stored('retired', FilterFieldSource.Custom),
        ]);
    });

    test('opens a view that fell back to a platform set with a display-only column unchanged', async ({ mount, page }) => {
        const dormant = expiryWatch({ defaultView: true, columns: [stored('retired', FilterFieldSource.Custom)] });
        await mount(
            strip({ views: [dormant], standardColumns: [commonName, { ...column('CK_ASSOCIATIONS', 'Associations'), displayOnly: true }] }),
        );

        await expect(page.getByTestId('view-tabs-notice')).toContainText('showing the standard columns');
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toHaveCount(0);
    });

    test('offers Revert on Standard once a display-only column it ships is taken off', async ({ mount, page }) => {
        await mount(
            strip({ views: [], standardColumns: [commonName, { ...column('CK_ASSOCIATIONS', 'Associations'), displayOnly: true }] }),
        );

        await expect(page.getByTestId('view-tabs-tab-standard-dirty')).toHaveCount(0);
        await page.getByTestId('drift-drop-last-column').click();

        await expect(page.getByTestId('view-tabs-tab-standard-dirty')).toBeVisible();
    });

    test('leaves a filter whose field is gone out of a duplicate', async ({ mount, page }) => {
        const deadFilter: SearchFilterModel = {
            fieldSource: FilterFieldSource.Custom,
            fieldIdentifier: 'retired',
            condition: FilterConditionOperator.Equals,
            value: 'x',
        };
        await mount(strip({ views: [expiryWatch({ defaultView: true, filters: [stateFilter, deadFilter] })] }));

        await openTabMenu(page, 'Expiry watch');
        await page.getByRole('menuitem', { name: 'Duplicate' }).click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/createView');
        const action = await lastDispatched(page, 'listViews/createView');
        expect(JSON.stringify(action)).not.toContain('retired');
        expect(action?.payload).toMatchObject({ view: { filters: [stateFilter] } });

        await page.getByTestId('simulate-create-success').click();

        await expect(page.getByTestId('view-tabs-tab-view-created')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('view-tabs-tab-view-created-dirty')).toHaveCount(0);
        expect((await appliedSlice(page)).filters).toEqual([stateFilter]);
    });

    test('hides the notice about an unavailable column when it is dismissed', async ({ mount, page }) => {
        const dormant = expiryWatch({ defaultView: true, columns: [stored('COMMON_NAME'), stored('retired', FilterFieldSource.Custom)] });
        await mount(strip({ views: [dormant] }));

        await expect(page.getByTestId('view-tabs-notice')).toContainText('retired cannot be shown');

        await page.getByTestId('view-tabs-notice-dismiss').click();

        await expect(page.getByTestId('view-tabs-notice')).toHaveCount(0);
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toHaveCount(0);
    });

    test('keeps the notice about an unavailable column up until it is dismissed, however long it stands', async ({ mount, page }) => {
        await page.clock.install();
        const dormant = expiryWatch({ defaultView: true, columns: [stored('COMMON_NAME'), stored('retired', FilterFieldSource.Custom)] });
        await mount(strip({ views: [dormant] }));
        await expect(page.getByTestId('view-tabs-notice')).toContainText('retired cannot be shown');

        await page.clock.fastForward('30:00');

        await expect(page.getByTestId('view-tabs-notice')).toContainText('retired cannot be shown');
        await expect(page.getByTestId('view-tabs-notice-remove')).toBeEnabled();
    });

    test('holds back a column Core reports as replaced, with its filter, without reporting an edit', async ({ mount, page }) => {
        const view = expiryWatch({
            defaultView: true,
            columns: [stored('COMMON_NAME'), replaced(stored('retired', FilterFieldSource.Custom))],
            filters: [stateFilter, replaced(retiredFilter)],
        });
        await mount(strip({ views: [view], fields: withRetired }));

        await expect(page.getByTestId('view-tabs-returned')).toContainText('Retired is available again');
        await expect(page.getByTestId('view-tabs-returned')).toContainText('this view is not showing or filtering by it');
        expect((await appliedSlice(page)).columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME']);
        expect((await appliedSlice(page)).filters).toEqual([stateFilter]);
        await expect(page.getByTestId('view-tabs-notice')).toHaveCount(0);
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toHaveCount(0);
    });

    test('shows a column Core reports as available without asking', async ({ mount, page }) => {
        const view = expiryWatch({
            defaultView: true,
            columns: [stored('COMMON_NAME'), { ...stored('retired', FilterFieldSource.Custom), status: ListViewFieldStatus.Available }],
        });
        await mount(strip({ views: [view], fields: withRetired }));

        await expect(page.getByTestId('view-tabs-tab-view-1')).toHaveAttribute('aria-selected', 'true');
        expect((await appliedSlice(page)).columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME', 'retired']);
        await expect(page.getByTestId('view-tabs-returned')).toHaveCount(0);
    });

    test('puts a shown column back in its stored place with its filter, and rebinds both in the view', async ({ mount, page }) => {
        const view = expiryWatch({
            defaultView: true,
            columns: [replaced(stored('retired', FilterFieldSource.Custom)), stored('COMMON_NAME')],
            filters: [stateFilter, replaced(retiredFilter)],
        });
        await mount(strip({ views: [view], fields: withRetired }));
        await expect(page.getByTestId('view-tabs-returned')).toBeVisible();

        await page.getByTestId('view-tabs-returned-show').click();

        await expect(page.getByTestId('view-tabs-returned')).toHaveCount(0);
        await expect
            .poll(async () => (await appliedSlice(page)).columns.map((each) => each.fieldIdentifier))
            .toEqual(['retired', 'COMMON_NAME']);
        expect((await appliedSlice(page)).filters).toEqual([stateFilter, retiredFilter]);
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toHaveCount(0);
        const update = await lastDispatched(page, 'listViews/updateView');
        expect(update?.payload).toMatchObject({
            view: {
                columns: [{ ...stored('retired', FilterFieldSource.Custom), rebind: true }, stored('COMMON_NAME')],
                filters: [stateFilter, { ...retiredFilter, rebind: true }],
            },
        });
        const written = update?.payload?.view as { columns: { rebind?: boolean }[] } | undefined;
        expect(written?.columns[1]).not.toHaveProperty('rebind');

        await page.getByTestId('simulate-update-success').click();
        await page.getByTestId('remount-strip').click();

        await expect(page.getByTestId('view-tabs-tab-view-1')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('view-tabs-returned')).toHaveCount(0);
        expect((await appliedSlice(page)).columns.map((each) => each.fieldIdentifier)).toEqual(['retired', 'COMMON_NAME']);
    });

    test('holds a shown column back again when the write confirming it fails', async ({ mount, page }) => {
        await mount(heldBackStrip());
        await page.getByTestId('view-tabs-returned-show').click();
        await expect
            .poll(async () => (await appliedSlice(page)).columns.map((each) => each.fieldIdentifier))
            .toEqual(['COMMON_NAME', 'retired']);

        await page.getByTestId('simulate-update-failure').click();

        await expect(page.getByTestId('view-tabs-returned')).toContainText('Retired is available again');
        await expect.poll(async () => (await appliedSlice(page)).columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME']);
        expect((await appliedSlice(page)).filters).toEqual([]);
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toHaveCount(0);
    });

    test('refuses Show in view while another view write is still out', async ({ mount, page }) => {
        await mount(heldBackStrip({ isMutating: true }));

        await expect(page.getByTestId('view-tabs-returned-show')).toBeDisabled();
    });

    test('writes the filter of the user in place of the stored one it masks when the held-back column is shown', async ({
        mount,
        page,
    }) => {
        await mount(heldBackStrip());
        await expect(page.getByTestId('view-tabs-returned')).toBeVisible();
        await page.getByTestId('drift-filter').click();

        await page.getByTestId('view-tabs-returned-show').click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const written = (await lastDispatched(page, 'listViews/updateView'))?.payload?.view as { filters: SearchFilterModel[] } | undefined;
        expect(written?.filters).toEqual([{ ...ownFilter, rebind: true }]);
    });

    test('takes a shown column off the table when a later answer reports it replaced', async ({ mount, page }) => {
        const shown = expiryWatch({
            defaultView: true,
            columns: [stored('COMMON_NAME'), stored('retired', FilterFieldSource.Custom)],
            filters: [retiredFilter],
            sort: { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'retired', direction: SortDirection.Desc },
        });
        const answer = {
            ...shown,
            columns: [stored('COMMON_NAME'), replaced(stored('retired', FilterFieldSource.Custom))],
            filters: [replaced(retiredFilter)],
            sort: undefined,
        };
        await mount(strip({ views: [shown], fields: withRetired, refreshedViews: [answer] }));
        await expect
            .poll(async () => (await appliedSlice(page)).columns.map((each) => each.fieldIdentifier))
            .toEqual(['COMMON_NAME', 'retired']);

        await page.getByTestId('simulate-list-success').click();

        await expect(page.getByTestId('view-tabs-returned')).toContainText('Retired is available again');
        const slice = await appliedSlice(page);
        expect(slice.columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME']);
        expect(slice.filters).toEqual([]);
        expect(slice.sort).toBeUndefined();
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toHaveCount(0);
    });

    test('keeps the filter of the user over the stored one on the same field when the held-back column is shown', async ({
        mount,
        page,
    }) => {
        await mount(heldBackStrip());
        await expect(page.getByTestId('view-tabs-returned')).toBeVisible();
        await page.getByTestId('drift-filter').click();

        await page.getByTestId('view-tabs-returned-show').click();

        await expect
            .poll(async () => (await appliedSlice(page)).columns.map((each) => each.fieldIdentifier))
            .toEqual(['COMMON_NAME', 'retired']);
        expect((await appliedSlice(page)).filters).toEqual([ownFilter]);
    });

    test('puts back the filter on a held-back column the user adds from the column menu, and confirms both on save', async ({
        mount,
        page,
    }) => {
        await mount(heldBackStrip({ driftColumn: column('retired', 'Retired', FilterFieldSource.Custom) }));
        await expect(page.getByTestId('view-tabs-returned')).toBeVisible();
        expect((await appliedSlice(page)).filters).toEqual([]);

        await page.getByTestId('drift-columns').click();

        await expect.poll(async () => (await appliedSlice(page)).filters).toEqual([retiredFilter]);
        await expect(page.getByTestId('view-tabs-returned')).toHaveCount(0);
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toBeVisible();

        await page.getByTestId('view-tabs-summary-save').click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        expect((await lastDispatched(page, 'listViews/updateView'))?.payload).toMatchObject({
            view: {
                columns: [stored('COMMON_NAME'), { ...stored('retired', FilterFieldSource.Custom), rebind: true }],
                filters: [{ ...retiredFilter, rebind: true }],
            },
        });
        await page.getByTestId('simulate-update-success').click();
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toHaveCount(0);
    });

    test('keeps the stored filter of a held-back column the user added when a duplicate fails and the strip returns', async ({
        mount,
        page,
    }) => {
        await mount(heldBackStrip({ driftColumn: column('retired', 'Retired', FilterFieldSource.Custom) }));
        await expect(page.getByTestId('view-tabs-returned')).toBeVisible();
        await page.getByTestId('drift-columns').click();
        await expect.poll(async () => (await appliedSlice(page)).filters).toEqual([retiredFilter]);

        await openTabMenu(page, 'Expiry watch');
        await page.getByRole('menuitem', { name: 'Duplicate' }).click();
        await page.getByTestId('simulate-create-failure').click();

        await expect(page.getByTestId('view-tabs-tab-view-1')).toHaveAttribute('aria-selected', 'true');
        await settle(page);
        const slice = await appliedSlice(page);
        expect(slice.columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME', 'retired']);
        expect(slice.filters).toEqual([retiredFilter]);
    });

    test('takes the stored filter off again when the user removes a held-back column they added, and rebinds nothing', async ({
        mount,
        page,
    }) => {
        await mount(
            heldBackStrip({
                driftColumn: column('retired', 'Retired', FilterFieldSource.Custom),
                driftSort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: 'asc' },
            }),
        );
        await expect(page.getByTestId('view-tabs-returned')).toBeVisible();
        await page.getByTestId('drift-columns').click();
        await expect.poll(async () => (await appliedSlice(page)).filters).toEqual([retiredFilter]);

        await page.getByTestId('drift-drop-last-column').click();

        await expect.poll(async () => (await appliedSlice(page)).filters).toEqual([]);
        await expect(page.getByTestId('view-tabs-returned')).toContainText('this view is not showing or filtering by it');

        await page.getByTestId('drift-sort').click();
        await page.getByTestId('view-tabs-summary-save').click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const view = (await lastDispatched(page, 'listViews/updateView'))?.payload?.view as
            | { columns: { rebind?: boolean }[]; filters: { rebind?: boolean }[] }
            | undefined;
        expect([...(view?.columns ?? []), ...(view?.filters ?? [])].some((entry) => entry.rebind)).toBe(false);
        expect((await appliedSlice(page)).columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME']);
    });

    test('keeps the filter of the user over the stored one on the same field when the column menu adds the held-back column', async ({
        mount,
        page,
    }) => {
        await mount(heldBackStrip({ driftColumn: column('retired', 'Retired', FilterFieldSource.Custom) }));
        await expect(page.getByTestId('view-tabs-returned')).toBeVisible();
        await page.getByTestId('drift-filter').click();

        await page.getByTestId('drift-columns').click();
        await expect(page.getByTestId('view-tabs-returned')).toHaveCount(0);
        await settle(page);

        expect((await appliedSlice(page)).filters).toEqual([ownFilter]);
    });

    test('confirms a held-back column when the view is saved with a filter of the user on it', async ({ mount, page }) => {
        await mount(heldBackStrip());
        await saveOwnFilter(page);

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        expect((await lastDispatched(page, 'listViews/updateView'))?.payload).toMatchObject({
            resource: Resource.Certificates,
            view: {
                columns: [stored('COMMON_NAME'), { ...stored('retired', FilterFieldSource.Custom), rebind: true }],
                filters: [{ ...ownFilter, rebind: true }],
            },
        });
        await expect
            .poll(async () => (await appliedSlice(page)).columns.map((each) => each.fieldIdentifier))
            .toEqual(['COMMON_NAME', 'retired']);
        await expect(page.getByTestId('view-tabs-returned')).toHaveCount(0);

        await page.getByTestId('simulate-update-success').click();

        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toHaveCount(0);
        await page.getByTestId('view-tabs-tab-standard').click();
        await page.getByTestId('view-tabs-tab-view-1').click();

        const slice = await appliedSlice(page);
        expect(slice.columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME', 'retired']);
        expect(slice.filters).toEqual([ownFilter]);
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toHaveCount(0);
    });

    test('keeps an edit made while a save confirming a held-back column is in flight', async ({ mount, page }) => {
        await mount(heldBackStrip({ driftColumn: serialNumber }));
        await saveOwnFilter(page);
        await expect
            .poll(async () => (await appliedSlice(page)).columns.map((each) => each.fieldIdentifier))
            .toEqual(['COMMON_NAME', 'retired']);
        await page.getByTestId('drift-columns').click();
        await page.getByTestId('simulate-update-success').click();

        await expect
            .poll(async () => (await appliedSlice(page)).columns.map((each) => each.fieldIdentifier))
            .toEqual(['COMMON_NAME', 'retired', 'SERIAL_NUMBER']);
        expect((await appliedSlice(page)).filters).toEqual([ownFilter]);
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toBeVisible();
    });

    test('holds the column back again when the save that would confirm it fails, keeping the filter of the user', async ({
        mount,
        page,
    }) => {
        await mount(heldBackStrip());
        await saveOwnFilter(page);
        await page.getByTestId('simulate-update-failure').click();

        await expect(page.getByTestId('view-tabs-returned')).toContainText('Retired is available again');
        await expect.poll(async () => (await appliedSlice(page)).columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME']);
        expect((await appliedSlice(page)).filters).toEqual([ownFilter]);
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toBeVisible();

        await page.getByTestId('view-tabs-summary-revert').click();

        await expect(page.getByTestId('view-tabs-returned')).toContainText('Retired is available again');
        expect((await appliedSlice(page)).filters).toEqual([]);
    });

    test('keeps the held-back column and its filter unconfirmed when the view is saved for another change', async ({ mount, page }) => {
        const nameFilter: SearchFilterModel = { ...stateFilter, fieldIdentifier: 'COMMON_NAME', value: 'example' };
        await mount(heldBackStrip({ driftFilter: nameFilter }));
        await expect(page.getByTestId('view-tabs-returned')).toBeVisible();

        await page.getByTestId('drift-filter').click();
        await page.getByTestId('view-tabs-summary-save').click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const view = (await lastDispatched(page, 'listViews/updateView'))?.payload?.view as {
            columns: { rebind?: boolean }[];
            filters: { rebind?: boolean }[];
        };
        expect(view).toMatchObject({
            columns: [stored('COMMON_NAME'), stored('retired', FilterFieldSource.Custom)],
            filters: [retiredFilter, nameFilter],
        });
        expect([...view.columns, ...view.filters].some((entry) => entry.rebind)).toBe(false);
        await expect(page.getByTestId('view-tabs-returned')).toBeVisible();
    });

    test('withholds a filter on a held-back field that came back as one the listing cannot display', async ({ mount, page }) => {
        await mount(heldBackStrip({ fields: hiddenRetired }));
        await expect(page.getByTestId('view-tabs-tab-view-1')).toHaveAttribute('aria-selected', 'true');

        expect((await appliedSlice(page)).filters).toEqual([]);
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toHaveCount(0);

        await page.getByTestId('drift-filter').click();
        await page.getByTestId('view-tabs-summary-save').click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const update = await lastDispatched(page, 'listViews/updateView');
        expect(update?.payload).toMatchObject({ view: { filters: [{ ...ownFilter, rebind: true }] } });

        await page.getByTestId('simulate-update-success').click();
        await page.getByTestId('view-tabs-tab-standard').click();
        await page.getByTestId('view-tabs-tab-view-1').click();

        expect((await appliedSlice(page)).filters).toEqual([ownFilter]);
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toHaveCount(0);
    });

    test('drops the stored filter with a held-back column the listing cannot display when the user removes it', async ({ mount, page }) => {
        await mount(heldBackStrip({ fields: hiddenRetired }));
        await expect(page.getByTestId('view-tabs-notice')).toContainText('retired cannot be shown');

        await page.getByTestId('view-tabs-notice-remove').click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const update = await lastDispatched(page, 'listViews/updateView');
        expect(update?.payload).toMatchObject({ view: { columns: [stored('COMMON_NAME')], filters: [] } });
    });

    test('stops saying the view is not filtering by a held-back column once the user filters by it', async ({ mount, page }) => {
        await mount(heldBackStrip());
        await expect(page.getByTestId('view-tabs-returned')).toContainText('this view is not showing or filtering by it.');

        await page.getByTestId('drift-filter').click();

        await expect(page.getByTestId('view-tabs-returned')).toContainText('this view is not showing it.');
        expect((await appliedSlice(page)).filters).toEqual([ownFilter]);
    });

    test('offers to remove a missing column beside a held-back one, keeping the held-back column', async ({ mount, page }) => {
        const mixed = expiryWatch({
            defaultView: true,
            columns: [replaced(stored('retired', FilterFieldSource.Custom)), stored('withdrawn', FilterFieldSource.Custom)],
            filters: [],
            sort: undefined,
        });
        await mount(strip({ views: [mixed], fields: withRetired }));
        await expect(page.getByTestId('view-tabs-notice')).toContainText('withdrawn cannot be shown');

        await page.getByTestId('view-tabs-notice-remove').click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const action = await lastDispatched(page, 'listViews/updateView');
        expect(action?.payload).toMatchObject({ view: { columns: [stored('retired', FilterFieldSource.Custom)] } });
    });

    test('drops the stored filter on a held-back field when the list comes back from a detail page with it', async ({ mount, page }) => {
        await mount(heldBackStrip({ returnTo: { viewId: 'view-1', filters: [retiredFilter] } }));
        await expect(page.getByTestId('view-tabs-tab-view-1')).toHaveAttribute('aria-selected', 'true');
        await expect.poll(async () => (await appliedSlice(page)).filters).toEqual([]);
        await expect(page.getByTestId('view-tabs-returned')).toContainText('not showing or filtering by it');
    });

    test('keeps the filter of the user on a held-back field when the list comes back from a detail page', async ({ mount, page }) => {
        await mount(heldBackStrip({ returnTo: { viewId: 'view-1', filters: [ownFilter] } }));
        await expect(page.getByTestId('view-tabs-tab-view-1')).toHaveAttribute('aria-selected', 'true');
        await settle(page);

        expect((await appliedSlice(page)).filters).toEqual([ownFilter]);
    });

    test('saves a view whose every column is held back as the table showed it, filter of the user included', async ({ mount, page }) => {
        const only = expiryWatch({
            defaultView: true,
            columns: [replaced(stored('retired', FilterFieldSource.Custom))],
            filters: [],
            sort: undefined,
        });
        await mount(heldBackStrip({ views: [only] }));
        await saveOwnFilter(page);
        await page.getByTestId('simulate-update-success').click();

        await expect(page.getByTestId('view-tabs-returned')).toHaveCount(0);
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toHaveCount(0);
        const saved = await appliedSlice(page);
        expect(saved.columns.map((each) => each.fieldIdentifier)).toEqual(['retired', 'COMMON_NAME', 'SERIAL_NUMBER']);
        expect(saved.filters).toEqual([ownFilter]);

        await page.getByTestId('view-tabs-tab-standard').click();
        await page.getByTestId('view-tabs-tab-view-1').click();

        const reopened = await appliedSlice(page);
        expect(reopened.columns.map((each) => each.fieldIdentifier)).toEqual(['retired', 'COMMON_NAME', 'SERIAL_NUMBER']);
        expect(reopened.filters).toEqual([ownFilter]);
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toHaveCount(0);
    });

    test('names only the held-back columns the view is not filtering by when the user filters by one of them', async ({ mount, page }) => {
        const withBoth = [
            ...catalogue,
            {
                filterFieldSource: FilterFieldSource.Custom,
                searchFieldData: [field('retired', 'Retired'), field('decom', 'Decom')],
            },
        ] as unknown as SearchFieldDataByGroupDto[];
        const decomFilter: SearchFilterModel = { ...retiredFilter, fieldIdentifier: 'decom' };
        const filtered = expiryWatch({
            defaultView: true,
            columns: [
                stored('COMMON_NAME'),
                replaced(stored('retired', FilterFieldSource.Custom)),
                replaced(stored('decom', FilterFieldSource.Custom)),
            ],
            filters: [replaced(retiredFilter), replaced(decomFilter)],
        });
        await mount(strip({ views: [filtered], fields: withBoth, driftFilter: ownFilter }));
        await expect(page.getByTestId('view-tabs-returned')).toContainText(
            'Retired and Decom are available again, but may be different attributes with the same names and content types, so this view is not showing or filtering by them.',
        );

        await page.getByTestId('drift-filter').click();

        await expect(page.getByTestId('view-tabs-returned')).toContainText(
            'Retired and Decom are available again, but may be different attributes with the same names and content types, so this view is not showing them, and is not filtering by Decom.',
        );
        expect((await appliedSlice(page)).filters).toEqual([ownFilter]);
    });

    test('takes the filter of a held-back column out of the view with the column', async ({ mount, page }) => {
        const view = expiryWatch({
            defaultView: true,
            columns: [stored('COMMON_NAME'), replaced(stored('retired', FilterFieldSource.Custom))],
            filters: [stateFilter, replaced(retiredFilter)],
        });
        await mount(strip({ views: [view], fields: withRetired }));

        await page.getByTestId('view-tabs-returned-remove').click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const action = await lastDispatched(page, 'listViews/updateView');
        expect(action?.payload).toMatchObject({ view: { columns: [stored('COMMON_NAME')], filters: [stateFilter] } });
    });

    test('keeps a column the user added to the fallback when the held-back column is shown', async ({ mount, page }) => {
        const only = expiryWatch({ defaultView: true, columns: [replaced(stored('retired', FilterFieldSource.Custom))], sort: undefined });
        await mount(
            strip({ views: [only], fields: withRetired, driftColumn: column('environment', 'Environment', FilterFieldSource.Custom) }),
        );
        await expect(page.getByTestId('view-tabs-returned')).toBeVisible();

        await page.getByTestId('drift-columns').click();
        await page.getByTestId('view-tabs-returned-show').click();

        await expect
            .poll(async () => (await appliedSlice(page)).columns.map((each) => each.fieldIdentifier))
            .toEqual(['retired', 'environment']);
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toBeVisible();
    });

    test('takes a held-back column out of the view and leaves a still-missing one in place', async ({ mount, page }) => {
        const view = expiryWatch({
            defaultView: true,
            columns: [
                stored('COMMON_NAME'),
                replaced(stored('retired', FilterFieldSource.Custom)),
                stored('withdrawn', FilterFieldSource.Custom),
            ],
        });
        await mount(strip({ views: [view], fields: withRetired }));
        await expect(page.getByTestId('view-tabs-notice')).toContainText('withdrawn cannot be shown');

        await page.getByTestId('view-tabs-returned-remove').click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const action = await lastDispatched(page, 'listViews/updateView');
        expect(action?.payload).toMatchObject({
            view: { columns: [stored('COMMON_NAME'), stored('withdrawn', FilterFieldSource.Custom)] },
        });
    });

    test('keeps holding a column back in one view when the user adds its attribute in another', async ({ mount, page }) => {
        const first = expiryWatch({
            defaultView: true,
            columns: [stored('COMMON_NAME'), replaced(stored('retired', FilterFieldSource.Custom))],
        });
        const second = audit({ columns: [stored('COMMON_NAME')] });
        await mount(
            strip({ views: [first, second], fields: withRetired, driftColumn: column('retired', 'Retired', FilterFieldSource.Custom) }),
        );
        await expect(page.getByTestId('view-tabs-returned')).toBeVisible();

        await page.getByTestId('view-tabs-tab-view-2').click();
        await page.getByTestId('drift-columns').click();
        await expect
            .poll(async () => (await appliedSlice(page)).columns.map((each) => each.fieldIdentifier))
            .toEqual(['COMMON_NAME', 'retired']);
        await page.getByTestId('view-tabs-tab-view-1').click();

        await expect(page.getByTestId('view-tabs-returned')).toContainText('Retired is available again');
        expect((await appliedSlice(page)).columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME']);
    });

    test('offers no removal when every column of the view is held back, which would leave it with none', async ({ mount, page }) => {
        const only = expiryWatch({ defaultView: true, columns: [replaced(stored('retired', FilterFieldSource.Custom))] });
        await mount(strip({ views: [only], fields: withRetired }));

        await expect(page.getByTestId('view-tabs-returned')).toContainText('Retired is available again');
        await expect(page.getByTestId('view-tabs-returned-show')).toBeVisible();
        await expect(page.getByTestId('view-tabs-returned-remove')).toHaveCount(0);
        await expect(page.getByTestId('view-tabs-notice')).toHaveCount(0);
    });

    test('names a held filter on a field the view shows no column for, and applies it once the user chooses to', async ({
        mount,
        page,
    }) => {
        const view = expiryWatch({ defaultView: true, columns: [stored('COMMON_NAME')], filters: [stateFilter, replaced(retiredFilter)] });
        await mount(strip({ views: [view], fields: withRetired }));

        await expect(page.getByTestId('view-tabs-held-filters')).toContainText(
            'Retired may be a different attribute with the same name and content type, so this view is not applying the filter on it.',
        );
        expect((await appliedSlice(page)).filters).toEqual([stateFilter]);
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toHaveCount(0);

        await page.getByTestId('view-tabs-held-filters-apply').click();

        await expect(page.getByTestId('view-tabs-held-filters')).toHaveCount(0);
        await expect.poll(async () => (await appliedSlice(page)).filters).toEqual([stateFilter, retiredFilter]);
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toHaveCount(0);
        expect((await lastDispatched(page, 'listViews/updateView'))?.payload).toMatchObject({
            view: { columns: [stored('COMMON_NAME')], filters: [stateFilter, { ...retiredFilter, rebind: true }] },
        });
    });

    test('speaks of the filters when one held field carries several of them', async ({ mount, page }) => {
        const notEmpty = { ...retiredFilter, condition: FilterConditionOperator.NotEmpty, value: undefined };
        const view = expiryWatch({
            defaultView: true,
            columns: [stored('COMMON_NAME')],
            filters: [replaced(retiredFilter), replaced(notEmpty)],
        });
        await mount(strip({ views: [view], fields: withRetired }));

        await expect(page.getByTestId('view-tabs-held-filters')).toContainText(
            'Retired may be a different attribute with the same name and content type, so this view is not applying the filters on it.',
        );
        await expect(page.getByTestId('view-tabs-held-filters-apply')).toHaveText('Apply filters');
        await expect(page.getByTestId('view-tabs-held-filters-remove')).toHaveText('Remove filters');
    });

    test('names a held filter whose column this page cannot display', async ({ mount, page }) => {
        await mount(heldBackStrip({ fields: hiddenRetired }));

        await expect(page.getByTestId('view-tabs-held-filters')).toContainText('Retired may be a different attribute');
        expect((await appliedSlice(page)).filters).toEqual([]);

        await page.getByTestId('view-tabs-held-filters-apply').click();

        await expect.poll(async () => (await appliedSlice(page)).filters).toEqual([retiredFilter]);
        expect((await lastDispatched(page, 'listViews/updateView'))?.payload).toMatchObject({
            view: { filters: [{ ...retiredFilter, rebind: true }] },
        });
    });

    test('takes a held filter on a field the view shows no column for out of the view', async ({ mount, page }) => {
        const view = expiryWatch({ defaultView: true, columns: [stored('COMMON_NAME')], filters: [stateFilter, replaced(retiredFilter)] });
        await mount(strip({ views: [view], fields: withRetired }));

        await page.getByTestId('view-tabs-held-filters-remove').click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        expect((await lastDispatched(page, 'listViews/updateView'))?.payload).toMatchObject({ view: { filters: [stateFilter] } });
    });

    test('rebinds an ordering the user chooses again on a held-back column when the view is saved', async ({ mount, page }) => {
        const byRetired = { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'retired', direction: 'desc' as const };
        await mount(
            heldBackStrip({
                driftColumn: column('retired', 'Retired', FilterFieldSource.Custom),
                driftSort: byRetired,
                dropsUnshownSort: true,
            }),
        );
        await expect(page.getByTestId('view-tabs-returned')).toBeVisible();
        await page.getByTestId('drift-columns').click();
        await page.getByTestId('drift-sort').click();

        await page.getByTestId('view-tabs-summary-save').click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        expect((await lastDispatched(page, 'listViews/updateView'))?.payload).toMatchObject({
            view: {
                sort: { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'retired', direction: SortDirection.Desc, rebind: true },
            },
        });
    });

    test('keeps a held-back column when the unavailable one beside it is removed', async ({ mount, page }) => {
        const view = expiryWatch({
            defaultView: true,
            columns: [
                stored('COMMON_NAME'),
                replaced(stored('retired', FilterFieldSource.Custom)),
                stored('withdrawn', FilterFieldSource.Custom),
            ],
        });
        await mount(strip({ views: [view], fields: withRetired }));

        await page.getByTestId('view-tabs-notice-remove').click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const action = await lastDispatched(page, 'listViews/updateView');
        expect(action?.payload).toMatchObject({ view: { columns: [stored('COMMON_NAME'), stored('retired', FilterFieldSource.Custom)] } });
    });

    test('keeps a notice dismissed on one view while the notice of another is dismissed too', async ({ mount, page }) => {
        const first = expiryWatch({ defaultView: true, columns: [stored('COMMON_NAME'), stored('retired', FilterFieldSource.Custom)] });
        const second = audit({ columns: [stored('COMMON_NAME'), stored('withdrawn', FilterFieldSource.Custom)] });
        await mount(strip({ views: [first, second] }));

        await page.getByTestId('view-tabs-notice-dismiss').click();
        await page.getByTestId('view-tabs-tab-view-2').click();
        await expect(page.getByTestId('view-tabs-notice')).toContainText('withdrawn cannot be shown');
        await page.getByTestId('view-tabs-notice-dismiss').click();

        await page.getByTestId('view-tabs-tab-view-1').click();

        await expect(page.getByTestId('view-tabs-tab-view-1')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('view-tabs-notice')).toHaveCount(0);
    });

    test('leaves a filter whose field is gone out of a save when the view did not already hold it', async ({ mount, page }) => {
        const deadFilter: SearchFilterModel = {
            fieldSource: FilterFieldSource.Custom,
            fieldIdentifier: 'retired',
            condition: FilterConditionOperator.Equals,
            value: 'x',
        };
        await mount(strip({ views: [expiryWatch({ defaultView: true })], driftFilter: deadFilter }));

        await page.getByTestId('drift-filter').click();
        await page.getByTestId('view-tabs-summary-save').click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
        const action = await lastDispatched(page, 'listViews/updateView');
        expect((action?.payload?.view as { filters: unknown } | undefined)?.filters).toEqual([]);
    });

    for (const { title, deadFilter, saved } of [
        {
            title: 'keeps a presence filter whose field is gone through a save when the view already held it',
            deadFilter: { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'retired', condition: FilterConditionOperator.NotEmpty },
            saved: 'both',
        },
        {
            title: 'leaves the value of a filter whose field is gone out of a save, since it may be secret content',
            deadFilter: {
                fieldSource: FilterFieldSource.Custom,
                fieldIdentifier: 'retired',
                condition: FilterConditionOperator.Equals,
                value: 'x',
            },
            saved: 'state only',
        },
    ] satisfies { title: string; deadFilter: SearchFilterModel; saved: 'both' | 'state only' }[]) {
        test(title, async ({ mount, page }) => {
            await mount(
                strip({
                    views: [expiryWatch({ defaultView: true, filters: [stateFilter, deadFilter] })],
                    driftSort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: 'desc' },
                }),
            );

            await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toHaveCount(0);
            await page.getByTestId('drift-sort').click();
            await page.getByTestId('view-tabs-summary-save').click();

            await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
            const action = await lastDispatched(page, 'listViews/updateView');
            expect((action?.payload?.view as { filters: unknown } | undefined)?.filters).toEqual(
                saved === 'both' ? [stateFilter, deadFilter] : [stateFilter],
            );
        });
    }

    test('opens on the list its own read returns, not on the one an earlier visit left', async ({ mount, page }) => {
        const earlier = expiryWatch({ defaultView: true, columns: [stored('COMMON_NAME')] });
        const current = expiryWatch({ defaultView: true, columns: [stored('COMMON_NAME'), stored('SERIAL_NUMBER')] });
        await mount(strip({ views: [earlier], isRefreshing: true, refreshedViews: [current] }));

        await expect(page.getByTestId('view-tabs')).toHaveCount(0);

        await page.getByTestId('simulate-list-success').click();

        await expect(page.getByTestId('view-tabs-tab-view-1')).toHaveAttribute('aria-selected', 'true');
        expect((await appliedSlice(page)).columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME', 'SERIAL_NUMBER']);
        await expect(page.getByTestId('view-tabs-tab-view-1-dirty')).toHaveCount(0);
    });

    test('reads the list again when its answer is set aside, and opens on the one that lands', async ({ mount, page }) => {
        const earlier = expiryWatch({ defaultView: true, columns: [stored('COMMON_NAME')] });
        const current = expiryWatch({ defaultView: true, columns: [stored('COMMON_NAME'), stored('SERIAL_NUMBER')] });
        await mount(strip({ views: [earlier], isRefreshing: true, refreshedViews: [current] }));

        await page.getByTestId('simulate-list-set-aside').click();

        await expect(page.getByTestId('view-tabs')).toHaveCount(0);
        await expect.poll(async () => (await dispatchedTypes(page)).filter((type) => type === 'listViews/listViews').length).toBe(2);

        await page.getByTestId('simulate-list-success').click();

        await expect(page.getByTestId('view-tabs-tab-view-1')).toHaveAttribute('aria-selected', 'true');
        expect((await appliedSlice(page)).columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME', 'SERIAL_NUMBER']);
    });

    test('drops a column whose field is gone from the table once a duplicate that leaves it out exists', async ({ mount, page }) => {
        await mount(strip({ views: [], driftColumn: column('deleted', 'deleted', FilterFieldSource.Custom) }));

        await page.getByTestId('drift-columns').click();
        await openTabMenu(page, 'Standard');
        await page.getByRole('menuitem', { name: 'Duplicate' }).click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/createView');
        expect(JSON.stringify(await lastDispatched(page, 'listViews/createView'))).not.toContain('deleted');

        await page.getByTestId('simulate-create-success').click();

        await expect(page.getByTestId('view-tabs-tab-view-created')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('view-tabs-tab-view-created-dirty')).toHaveCount(0);
        expect((await appliedSlice(page)).columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME', 'SERIAL_NUMBER']);
    });

    test('shows a new view only the Standard columns it can store', async ({ mount, page }) => {
        await mount(strip({ standardColumns: [commonName, { ...column('CK_ASSOCIATIONS', 'Associations'), displayOnly: true }] }));

        await page.getByTestId('view-tabs-tab-view-1').click();
        await page.getByTestId('view-tabs-new').click();
        await page.getByTestId('view-tabs-create').getByRole('button', { name: 'Create view' }).click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/createView');
        const view = (await lastDispatched(page, 'listViews/createView'))?.payload?.view as Record<string, unknown>;
        expect(view.columns).toEqual([{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' }]);
        expect((await appliedSlice(page)).columns.map((each) => each.fieldIdentifier)).toEqual(['COMMON_NAME']);
        await expect(page.getByTestId('view-tabs-tab-pending-view')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('view-tabs-tab-pending-view-dirty')).toHaveCount(0);
    });

    test('puts the tab back when a delete fails, and the rows with it', async ({ mount, page }) => {
        await mount(strip());

        await page.getByTestId('view-tabs-tab-view-1').click();
        await openTabMenu(page, 'Expiry watch');
        await page.getByRole('menuitem', { name: 'Delete view' }).click();
        await page.getByTestId('view-tabs-delete').getByRole('button', { name: 'Delete' }).click();

        await expect(page.getByTestId('view-tabs-tab-standard')).toHaveAttribute('aria-selected', 'true');

        await page.getByTestId('simulate-delete-failure').click();

        // The row is back, so the tab has to come back with it: reporting a failed delete while leaving
        // the user on another view's rows says the deletion happened.
        await expect(page.getByTestId('view-tabs-tab-view-1')).toHaveAttribute('aria-selected', 'true');
        expect((await appliedSlice(page)).filters).toEqual([stateFilter]);
    });

    test('holds its own actions while a mutation is in flight', async ({ mount, page }) => {
        await mount(strip({ isMutating: true }));

        await expect(page.getByTestId('view-tabs-new')).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Actions for Standard' })).toBeDisabled();
    });
});
