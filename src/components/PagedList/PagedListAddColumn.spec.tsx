import type { Page } from '@playwright/test';
import type { SearchFieldListModel, SearchRequestModel } from 'types/certificate';
import type { ListViewModel } from 'types/listViews';
import { AttributeContentType, FilterFieldSource, FilterFieldType, Resource } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import { expect, test } from '../../../playwright/ct-test';
import PagedListColumnsWithStore, { type StubRow } from './PagedListColumnsWithStore';

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
        searchFieldData: [
            field('COMMON_NAME', 'Common Name'),
            field('NOT_AFTER', 'Expires At', { type: FilterFieldType.Datetime }),
            // Advertised as a column but the page registers no renderer, so the menu must not offer it.
            field('SUBJECT_ALTERNATIVE_NAMES', 'Subject Alternative Names'),
        ],
    },
    {
        filterFieldSource: FilterFieldSource.Custom,
        searchFieldData: [field('department|STRING', 'Department', { sortable: false, attributeContentType: AttributeContentType.String })],
    },
] as unknown as SearchFieldListModel[];

const column = (identifier: string, catalogueLabel: string): ColumnDefinition => ({
    fieldSource: FilterFieldSource.Property,
    fieldIdentifier: identifier,
    catalogueLabel,
    sortable: true,
});

const standardColumns = [column('COMMON_NAME', 'Common Name'), column('NOT_AFTER', 'Expires At')];

const rows: StubRow[] = [
    {
        uuid: 'cert-1',
        commonName: 'acme.example',
        notAfter: '2027-01-01',
        attributeValues: { [FilterFieldSource.Custom]: { 'department|STRING': [{ data: 'Platform' }] } },
    },
    { uuid: 'cert-2', commonName: 'beta.example', notAfter: '2028-06-30' },
];

const expiryWatch: ListViewModel = {
    uuid: 'view-1',
    name: 'Expiry watch',
    resource: Resource.Certificates,
    columns: [
        { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' },
        { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER' },
    ],
    filters: [],
    defaultView: true,
};

const withRetiredColumn: ListViewModel = {
    uuid: 'view-2',
    name: 'Retired field',
    resource: Resource.Certificates,
    columns: [
        { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' },
        // Published by no source, so the table cannot show it and only the dialog can take it away.
        { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'legacy|STRING' },
        { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER' },
    ],
    filters: [],
    defaultView: true,
};

const headings = async (page: Page): Promise<string[]> => {
    const ids = await page.locator('thead th[data-id]').evaluateAll((cells) => cells.map((cell) => cell.getAttribute('data-id') ?? ''));
    return ids.filter((id) => id !== '' && id !== '__checkbox__');
};

const lastRequest = async (page: Page): Promise<SearchRequestModel | undefined> => {
    const requests = JSON.parse((await page.getByTestId('list-requests').textContent()) ?? '[]') as SearchRequestModel[];
    return requests.at(-1);
};

const requestColumns = async (page: Page): Promise<SearchRequestModel['columns']> => (await lastRequest(page))?.columns;

const dispatchedTypes = async (page: Page): Promise<string[]> => {
    const dispatched = JSON.parse((await page.getByTestId('dispatched').textContent()) ?? '[]') as Array<{ type: string }>;
    return dispatched.map((action) => action.type);
};

const openMenu = async (page: Page) => {
    await page.getByTestId('add-column-menu-trigger').click();
    await expect(page.getByTestId('add-column-menu')).toBeVisible();
};

test.describe('PagedList · add column menu', () => {
    test('puts the control in a trailing header cell of the column-driven table', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);

        await expect.poll(() => headings(page)).toEqual(['property:COMMON_NAME', 'property:NOT_AFTER']);

        const trigger = page.getByTestId('add-column-menu-trigger');
        await expect(trigger).toBeVisible();
        expect(await trigger.evaluate((node) => node.closest('th') === node.closest('tr')?.lastElementChild)).toBe(true);
    });

    test('keeps a cell on every row for the trailing column', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);

        await expect.poll(() => headings(page)).toHaveLength(2);
        await expect
            .poll(async () => {
                const headerCells = await page.locator('thead th').count();
                const bodyCells = await page.locator('tbody tr').first().locator('td').count();
                return { headerCells, bodyCells };
            })
            .toEqual({ headerCells: 4, bodyCells: 4 });
    });

    test('offers only the property columns the page can render', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await openMenu(page);

        await expect(page.getByTestId('add-column-menu-field-property:COMMON_NAME')).toBeVisible();
        await expect(page.getByTestId('add-column-menu-field-property:SUBJECT_ALTERNATIVE_NAMES')).toHaveCount(0);
    });

    test('appends a checked field to the table and to the listing request', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await openMenu(page);

        await page.getByTestId('add-column-menu-field-custom:department|STRING').check();

        await expect.poll(() => headings(page)).toEqual(['property:COMMON_NAME', 'property:NOT_AFTER', 'custom:department|STRING']);
        await expect
            .poll(() => requestColumns(page))
            .toContainEqual({
                fieldSource: FilterFieldSource.Custom,
                fieldIdentifier: 'department|STRING',
            });

        await page.keyboard.press('Escape');
        await expect(page.getByText('Platform')).toBeVisible();
    });

    test('takes the column away again when the field is unchecked', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await openMenu(page);

        await page.getByTestId('add-column-menu-field-property:NOT_AFTER').uncheck();

        await expect.poll(() => headings(page)).toEqual(['property:COMMON_NAME']);
    });

    test('keeps the last column standing, so no request can be sent without one', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={[standardColumns[0]]} catalogue={catalogue} />);
        await openMenu(page);

        await expect(page.getByTestId('add-column-menu-field-property:COMMON_NAME')).toBeDisabled();
    });

    test('stores nothing, leaving the change for the summary bar to save', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await openMenu(page);

        await page.getByTestId('add-column-menu-field-custom:department|STRING').check();
        await expect.poll(() => headings(page)).toHaveLength(3);

        await page.keyboard.press('Escape');

        await expect(page.getByTestId('view-tabs-summary-unsaved')).toBeVisible();
        await expect(page.getByTestId('view-tabs-summary-save')).toHaveText('Save as view…');
        expect(await dispatchedTypes(page)).toEqual(['listViews/listViews']);
    });

    test('goes back to the first page when a toggle takes the ordering away', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} withPagingControl />);

        await page.getByRole('button', { name: 'Expires At' }).click();
        await expect.poll(async () => (await lastRequest(page))?.sort?.fieldIdentifier).toBe('NOT_AFTER');

        await page.getByTestId('go-to-page-two').click();
        await expect.poll(async () => (await lastRequest(page))?.pageNumber).toBe(2);

        await openMenu(page);
        await page.getByTestId('add-column-menu-field-property:NOT_AFTER').uncheck();

        await expect.poll(async () => (await lastRequest(page))?.pageNumber).toBe(1);
        expect(await lastRequest(page)).not.toHaveProperty('sort');
    });

    test('stays on the page it is on when a toggle leaves the ordering intact', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} withPagingControl />);

        await page.getByRole('button', { name: 'Expires At' }).click();
        await expect.poll(async () => (await lastRequest(page))?.sort?.fieldIdentifier).toBe('NOT_AFTER');

        await page.getByTestId('go-to-page-two').click();
        await expect.poll(async () => (await lastRequest(page))?.pageNumber).toBe(2);

        await openMenu(page);
        await page.getByTestId('add-column-menu-field-custom:department|STRING').check();

        await expect.poll(() => requestColumns(page)).toHaveLength(3);
        const request = await lastRequest(page);
        expect(request?.pageNumber).toBe(2);
        expect(request?.sort?.fieldIdentifier).toBe('NOT_AFTER');
    });

    test('does not bring a dropped ordering back when its column is added again', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);

        await page.getByRole('button', { name: 'Expires At' }).click();
        await expect.poll(async () => (await lastRequest(page))?.sort?.fieldIdentifier).toBe('NOT_AFTER');

        await openMenu(page);
        await page.getByTestId('add-column-menu-field-property:NOT_AFTER').uncheck();
        await expect.poll(() => headings(page)).toEqual(['property:COMMON_NAME']);

        await page.getByTestId('add-column-menu-field-property:NOT_AFTER').check();

        await expect.poll(() => headings(page)).toEqual(['property:COMMON_NAME', 'property:NOT_AFTER']);
        expect(await lastRequest(page)).not.toHaveProperty('sort');
    });

    test('does not bring one back when the column dialog is what took it away', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);

        await page.getByRole('button', { name: 'Expires At' }).click();
        await expect.poll(async () => (await lastRequest(page))?.sort?.fieldIdentifier).toBe('NOT_AFTER');

        await openMenu(page);
        await page.getByTestId('add-column-menu-edit-columns').click();

        const picker = page.getByTestId('view-tabs-picker');
        await expect(picker).toBeVisible();
        await picker.getByTestId('selected-column-property:NOT_AFTER-remove').click();
        await picker.getByRole('button', { name: 'Apply' }).click();

        await expect.poll(() => headings(page)).toEqual(['property:COMMON_NAME']);
        expect(await lastRequest(page)).not.toHaveProperty('sort');

        await openMenu(page);
        await page.getByTestId('add-column-menu-field-property:NOT_AFTER').check();

        await expect.poll(() => headings(page)).toEqual(['property:COMMON_NAME', 'property:NOT_AFTER']);
        expect(await lastRequest(page)).not.toHaveProperty('sort');
    });

    test('leaves a stored view dirty rather than writing to it', async ({ mount, page }) => {
        await mount(
            <PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} views={[expiryWatch]} />,
        );
        await expect(page.getByTestId('view-tabs-tab-view-1')).toBeVisible();

        await openMenu(page);
        await page.getByTestId('add-column-menu-field-custom:department|STRING').check();
        await expect.poll(() => headings(page)).toHaveLength(3);

        await page.keyboard.press('Escape');

        await expect(page.getByTestId('view-tabs-summary-save')).toHaveText('Save to view');
        expect(await dispatchedTypes(page)).toEqual(['listViews/listViews']);
    });

    test("reaches the strip's own column dialog, opened on the columns the table is showing", async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await openMenu(page);

        // Added first: the dialog must open on what the table shows, not on the stored view, or Save
        // would put this column straight back.
        await page.getByTestId('add-column-menu-field-custom:department|STRING').check();
        await expect.poll(() => headings(page)).toHaveLength(3);

        await page.getByTestId('add-column-menu-edit-columns').click();

        const picker = page.getByTestId('view-tabs-picker');
        await expect(picker).toBeVisible();
        await expect(picker.getByTestId('selected-column-custom:department|STRING')).toBeVisible();

        await expect(picker.getByRole('button', { name: 'Apply' })).toBeVisible();
        await expect(picker.getByRole('button', { name: 'Save' })).toHaveCount(0);

        await picker.getByRole('button', { name: 'Move Expires At earlier' }).click();
        await picker.getByRole('button', { name: 'Apply' }).click();

        await expect.poll(() => headings(page)).toEqual(['property:NOT_AFTER', 'property:COMMON_NAME', 'custom:department|STRING']);
        expect(await dispatchedTypes(page)).toEqual(['listViews/listViews']);
    });

    test('offers a real Save in that dialog once a stored view is what it would write into', async ({ mount, page }) => {
        await mount(
            <PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} views={[expiryWatch]} />,
        );
        await expect(page.getByTestId('view-tabs-tab-view-1')).toBeVisible();

        await openMenu(page);
        await page.getByTestId('add-column-menu-edit-columns').click();

        const picker = page.getByTestId('view-tabs-picker');
        await expect(picker.getByRole('button', { name: 'Save' })).toBeVisible();

        await picker.getByRole('button', { name: 'Save' }).click();

        await expect.poll(() => dispatchedTypes(page)).toContain('listViews/updateView');
    });

    test('opens that dialog on a stored column the table cannot show, at the position the view keeps it', async ({ mount, page }) => {
        await mount(
            <PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} views={[withRetiredColumn]} />,
        );
        await expect.poll(() => headings(page)).toEqual(['property:COMMON_NAME', 'property:NOT_AFTER']);

        await openMenu(page);
        await page.getByTestId('add-column-menu-field-custom:department|STRING').check();
        await expect.poll(() => headings(page)).toHaveLength(3);

        await page.getByTestId('add-column-menu-edit-columns').click();
        await expect(page.getByTestId('view-tabs-picker')).toBeVisible();

        await expect
            .poll(() =>
                page
                    .locator('[data-testid="selected-columns-list"] > [data-testid^="selected-column-"]')
                    .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-testid') ?? '')),
            )
            .toEqual([
                'selected-column-property:COMMON_NAME',
                'selected-column-custom:legacy|STRING',
                'selected-column-property:NOT_AFTER',
                'selected-column-custom:department|STRING',
            ]);
    });

    test('offers no way through to the dialog before the strip that holds it is up', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} withheldCatalogue />);
        await openMenu(page);

        await expect(page.getByTestId('view-tabs')).toHaveCount(0);
        await expect(page.getByTestId('add-column-menu-edit-columns')).toHaveCount(0);
    });

    test('offers no way through while the view list is still in flight either', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} withheldViews />);
        await openMenu(page);

        await expect(page.getByTestId('add-column-menu-field-custom:department|STRING')).toBeVisible();
        await expect(page.getByTestId('view-tabs')).toHaveCount(0);
        await expect(page.getByTestId('add-column-menu-edit-columns')).toHaveCount(0);
    });

    test('accepts no toggle before the opening view has been applied, which would overwrite it', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} withheldViews />);
        await openMenu(page);

        await expect(page.getByTestId('add-column-menu-field-custom:department|STRING')).toBeDisabled();
        await expect(page.getByTestId('add-column-menu-hint')).toBeVisible();
    });

    test('hands focus back to the plus control when that dialog closes', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await openMenu(page);

        await page.getByTestId('add-column-menu-edit-columns').click();
        await expect(page.getByTestId('view-tabs-picker')).toBeVisible();

        await page.getByTestId('view-tabs-picker').getByRole('button', { name: 'Cancel' }).click();

        await expect(page.getByTestId('add-column-menu-trigger')).toBeFocused();
    });
});
