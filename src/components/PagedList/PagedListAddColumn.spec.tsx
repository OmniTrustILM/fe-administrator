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
            field('SERIAL_NUMBER', 'Serial Number'),
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

const headings = async (page: Page): Promise<string[]> => {
    const ids = await page.locator('thead th[data-id]').evaluateAll((cells) => cells.map((cell) => cell.getAttribute('data-id') ?? ''));
    return ids.filter((id) => id !== '' && id !== '__checkbox__');
};

const lastRequest = async (page: Page): Promise<SearchRequestModel | undefined> => {
    const requests = JSON.parse((await page.getByTestId('list-requests').textContent()) ?? '[]') as SearchRequestModel[];
    return requests.at(-1);
};

const requestColumns = async (page: Page): Promise<SearchRequestModel['columns']> => (await lastRequest(page))?.columns;

const requestCount = async (page: Page): Promise<number> =>
    (JSON.parse((await page.getByTestId('list-requests').textContent()) ?? '[]') as SearchRequestModel[]).length;

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

    test('puts a checked field first in the table and into the listing request', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await openMenu(page);

        await page.getByTestId('add-column-menu-field-custom:department|STRING').check();

        await expect.poll(() => headings(page)).toEqual(['custom:department|STRING', 'property:COMMON_NAME', 'property:NOT_AFTER']);
        await expect
            .poll(() => requestColumns(page))
            .toContainEqual({
                fieldSource: FilterFieldSource.Custom,
                fieldIdentifier: 'department|STRING',
            });

        await page.keyboard.press('Escape');
        await expect(page.getByText('Platform')).toBeVisible();
    });

    test('adds a property column without listing again, because the rows already carry its value', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await openMenu(page);
        const before = await requestCount(page);

        await page.getByTestId('add-column-menu-field-property:SERIAL_NUMBER').check();

        await expect.poll(() => headings(page)).toEqual(['property:SERIAL_NUMBER', 'property:COMMON_NAME', 'property:NOT_AFTER']);
        expect(await requestCount(page)).toBe(before);
    });

    test('takes a column away without listing again', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await openMenu(page);
        const before = await requestCount(page);

        await page.getByTestId('add-column-menu-field-property:NOT_AFTER').uncheck();

        await expect.poll(() => headings(page)).toEqual(['property:COMMON_NAME']);
        expect(await requestCount(page)).toBe(before);
    });

    test('lists again when the column taken away is the one the table is ordered by', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);

        await page.getByRole('button', { name: 'Expires At', exact: true }).click();
        await expect.poll(async () => (await lastRequest(page))?.sort?.fieldIdentifier).toBe('NOT_AFTER');
        const before = await requestCount(page);

        await openMenu(page);
        await page.getByTestId('add-column-menu-field-property:NOT_AFTER').uncheck();

        // The ordering goes with the column, and a different ordering is a different page of rows.
        await expect.poll(() => requestCount(page)).toBe(before + 1);
        expect(await lastRequest(page)).not.toHaveProperty('sort');
    });

    test('lists again for an attribute column, whose values only the server can project', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await openMenu(page);
        const before = await requestCount(page);

        await page.getByTestId('add-column-menu-field-custom:department|STRING').check();

        await expect.poll(() => requestCount(page)).toBe(before + 1);
        await expect
            .poll(() => requestColumns(page))
            .toContainEqual({
                fieldSource: FilterFieldSource.Custom,
                fieldIdentifier: 'department|STRING',
            });
    });

    test('lists again for an attribute column taken away and put back, whose values a later request dropped', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await openMenu(page);

        await page.getByTestId('add-column-menu-field-custom:department|STRING').check();
        await expect.poll(() => headings(page)).toContain('custom:department|STRING');

        await page.getByTestId('add-column-menu-field-custom:department|STRING').uncheck();
        await expect.poll(() => headings(page)).not.toContain('custom:department|STRING');

        // A fetch for another reason re-sends the narrowed column set, so the rows stop carrying it.
        await page.keyboard.press('Escape');
        await page.getByRole('button', { name: 'Common Name', exact: true }).click();
        await expect.poll(async () => (await lastRequest(page))?.sort?.fieldIdentifier).toBe('COMMON_NAME');
        const before = await requestCount(page);

        await openMenu(page);
        await page.getByTestId('add-column-menu-field-custom:department|STRING').check();

        await expect.poll(() => requestCount(page)).toBe(before + 1);
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

        await page.getByRole('button', { name: 'Expires At', exact: true }).click();
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

        await page.getByRole('button', { name: 'Expires At', exact: true }).click();
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

        await page.getByRole('button', { name: 'Expires At', exact: true }).click();
        await expect.poll(async () => (await lastRequest(page))?.sort?.fieldIdentifier).toBe('NOT_AFTER');

        await openMenu(page);
        await page.getByTestId('add-column-menu-field-property:NOT_AFTER').uncheck();
        await expect.poll(() => headings(page)).toEqual(['property:COMMON_NAME']);

        await page.getByTestId('add-column-menu-field-property:NOT_AFTER').check();

        await expect.poll(() => headings(page)).toEqual(['property:NOT_AFTER', 'property:COMMON_NAME']);
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

    test('accepts no toggle before the opening view has been applied, which would overwrite it', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} withheldViews />);
        await openMenu(page);

        await expect(page.getByTestId('add-column-menu-field-custom:department|STRING')).toBeDisabled();
        await expect(page.getByTestId('add-column-menu-hint')).toBeVisible();
    });
});
