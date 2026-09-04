import type { Page } from '@playwright/test';
import type { SearchFieldListModel, SearchRequestModel } from 'types/certificate';
import type { ListViewModel } from 'types/listViews';
import { AttributeContentType, FilterConditionOperator, FilterFieldSource, FilterFieldType, Resource, SortDirection } from 'types/openapi';
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
            // Advertised as a column but the page registers no renderer, so it must not be offered.
            field('SUBJECT_ALTERNATIVE_NAMES', 'Subject Alternative Names'),
        ],
    },
    {
        filterFieldSource: FilterFieldSource.Custom,
        searchFieldData: [field('department|STRING', 'Department', { sortable: false, attributeContentType: AttributeContentType.String })],
    },
] as unknown as SearchFieldListModel[];

const column = (identifier: string, catalogueLabel: string, overrides: Partial<ColumnDefinition> = {}): ColumnDefinition => ({
    fieldSource: FilterFieldSource.Property,
    fieldIdentifier: identifier,
    catalogueLabel,
    sortable: true,
    ...overrides,
});

const standardColumns = [column('COMMON_NAME', 'Common Name'), column('NOT_AFTER', 'Expires At')];

/**
 * The platform set as a real page ships it: no `sortable`, unlike `column()` above, which defaults it
 * to `true`. See `withCatalogueSortability`.
 */
const shippedColumns: ColumnDefinition[] = [
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', catalogueLabel: 'Common Name' },
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER', catalogueLabel: 'Expires At' },
];

const rows: StubRow[] = [
    {
        uuid: 'cert-1',
        commonName: 'acme.example',
        notAfter: '2027-01-01',
        attributeValues: { [FilterFieldSource.Custom]: { 'department|STRING': [{ data: 'Platform' }] } },
    },
    { uuid: 'cert-2', commonName: 'beta.example', notAfter: '2028-06-30' },
];

const stateFilter = {
    fieldSource: FilterFieldSource.Property,
    fieldIdentifier: 'COMMON_NAME',
    condition: FilterConditionOperator.Contains,
    value: 'acme',
};

/** A view carrying a column set, a filter and an ordering none of which is Standard's. */
const expiryWatch: ListViewModel = {
    uuid: 'view-1',
    name: 'Expiry watch',
    resource: Resource.Certificates,
    columns: [
        { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER' },
        { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'department|STRING' },
    ],
    filters: [stateFilter],
    sort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER', direction: SortDirection.Desc },
    defaultView: true,
};

const listRequests = async (page: Page): Promise<SearchRequestModel[]> =>
    JSON.parse((await page.getByTestId('list-requests').textContent()) ?? '[]') as SearchRequestModel[];

const lastRequest = async (page: Page): Promise<SearchRequestModel | undefined> => (await listRequests(page)).at(-1);

/**
 * The displayed columns, by column key. Read from the header ids rather than the visible text: the
 * checkbox column has no label and a heading may carry a legend beside its own, so text is the wrong
 * handle for "which columns are shown".
 */
const headings = async (page: Page): Promise<string[]> => {
    const ids = await page.locator('thead th[data-id]').evaluateAll((cells) => cells.map((cell) => cell.getAttribute('data-id') ?? ''));
    return ids.filter((id) => id !== '' && id !== '__checkbox__');
};

test.describe('PagedList · configurable columns', () => {
    test('renders the platform default column set as the table headings', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);

        await expect.poll(() => headings(page)).toEqual(['property:COMMON_NAME', 'property:NOT_AFTER']);
        // The labels are the catalogue's, so a user who never opens the picker sees what shipped before.
        await expect(page.getByRole('button', { name: 'Common Name' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Expires At' })).toBeVisible();
        await expect(page.getByText('acme.example')).toBeVisible();
        await expect(page.getByText('2028-06-30')).toBeVisible();
    });

    test('keeps a heading legend beside the label rather than inside the sort button', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);

        const legend = page.getByTestId('cn-legend');
        await expect(legend).toBeVisible();
        await expect(page.getByRole('button', { name: 'Common Name' })).toBeVisible();
        expect(await legend.evaluate((node) => node.closest('button') !== null)).toBe(false);
    });

    // The compatibility guarantee: Standard carries no ordering, so `sort` is absent from the request
    // it drives, while the columns it displays are named.
    test('names the displayed columns and no ordering under Standard', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);

        await expect.poll(async () => (await listRequests(page)).length).toBeGreaterThan(0);
        const request = await lastRequest(page);

        expect(request?.columns).toEqual([
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' },
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER' },
        ]);
        expect(request).not.toHaveProperty('sort');
    });

    test('reports a header click as an ordering of the whole result set', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);

        await page.getByRole('button', { name: 'Expires At' }).click();

        await expect
            .poll(async () => (await lastRequest(page))?.sort)
            .toEqual({ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER', direction: SortDirection.Asc });
    });

    test('turns the ordering around on a second click of the same heading', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);

        const heading = page.getByRole('button', { name: 'Expires At' });
        await heading.click();
        await expect.poll(async () => (await lastRequest(page))?.sort?.direction).toBe(SortDirection.Asc);

        await heading.click();
        await expect.poll(async () => (await lastRequest(page))?.sort?.direction).toBe(SortDirection.Desc);
    });

    test('returns to page 1 and clears the selection when the ordering changes, because page 2 of one ordering is not page 2 of another', async ({
        mount,
        page,
    }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} withPagingControl />);

        // Moved off page 1 with a row checked only after the opening view has applied: on page 1 with
        // nothing checked the assertions below hold whether or not the resets under test run at all.
        await page.getByTestId('go-to-page-two').click();
        await expect.poll(async () => (await lastRequest(page))?.pageNumber).toBe(2);

        await page.getByRole('button', { name: 'Expires At' }).click();

        await expect.poll(async () => (await lastRequest(page))?.pageNumber).toBe(1);
        await expect(page.locator('input[type="checkbox"]:checked')).toHaveCount(0);
    });

    /**
     * Withheld in the catalogue, not on the column: the catalogue is the authority on what the API can
     * order by, and the platform set is merged against it in both directions, so a `sortable: false`
     * written on a shipped column would be corrected rather than obeyed.
     */
    test('renders no sort button on a column the catalogue cannot order on', async ({ mount, page }) => {
        const withoutExpiry = [
            {
                filterFieldSource: FilterFieldSource.Property,
                searchFieldData: [field('COMMON_NAME', 'Common Name'), field('NOT_AFTER', 'Expires At', { sortable: false })],
            },
        ] as unknown as SearchFieldListModel[];
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={withoutExpiry} />);

        await expect(page.getByRole('button', { name: 'Common Name' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Expires At' })).toHaveCount(0);
    });

    test('puts the tab strip above the filter widget, because a view contains its filters', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);

        await expect(page.getByTestId('view-tabs')).toBeVisible();
        const order = await page.evaluate((title) => {
            const strip = document.querySelector('[data-testid="view-tabs"]');
            const filter = [...document.querySelectorAll('*')].find((node) => node.textContent?.trim() === title);
            if (!strip || !filter) return 'missing';
            return strip.compareDocumentPosition(filter) & Node.DOCUMENT_POSITION_FOLLOWING ? 'strip-first' : 'filter-first';
        }, 'Certificate Inventory Filter');

        expect(order).toBe('strip-first');
    });

    test('applies a view: its columns, its filters and its ordering together', async ({ mount, page }) => {
        await mount(
            <PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} views={[expiryWatch]} />,
        );

        await expect.poll(() => headings(page)).toEqual(['property:NOT_AFTER', 'custom:department|STRING']);

        await expect
            .poll(async () => (await lastRequest(page))?.columns)
            .toEqual([
                { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER' },
                { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'department|STRING' },
            ]);

        expect((await lastRequest(page))?.sort).toEqual({
            fieldSource: FilterFieldSource.Property,
            fieldIdentifier: 'NOT_AFTER',
            direction: SortDirection.Desc,
        });

        // The filters reach the filters duck, which is where the filter widget reads them from — a view
        // that only changed the table would leave the widget showing conditions the rows do not honour.
        await expect(page.getByTestId('current-filters')).toContainText('acme');
    });

    test('renders an attribute column from the projected values, and the empty state where there are none', async ({ mount, page }) => {
        await mount(
            <PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} views={[expiryWatch]} />,
        );

        await expect.poll(() => headings(page)).toEqual(['property:NOT_AFTER', 'custom:department|STRING']);
        await expect(page.getByText('Platform')).toBeVisible();
        // One row carries a Department value and the other does not, so exactly one cell is empty.
        await expect(page.getByTestId('empty-cell')).toHaveCount(1);
    });

    test('does not offer a property column the page registers no renderer for', async ({ mount, page }) => {
        await mount(
            <PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} views={[expiryWatch]} />,
        );

        await page.getByRole('button', { name: 'Actions for Expiry watch' }).click();
        await page.getByRole('menuitem', { name: 'Edit columns…' }).click();

        await expect(page.getByTestId('add-field-custom:department|STRING')).toHaveCount(0);
        await expect(page.getByTestId('add-field-property:COMMON_NAME')).toBeVisible();
        await expect(page.getByTestId('add-field-property:SUBJECT_ALTERNATIVE_NAMES')).toHaveCount(0);
    });

    /**
     * A view stores its columns and its ordering independently, so a column edit can leave the ordering
     * naming a column that is no longer displayed. An ordering no header can paint is one the user can
     * neither see nor clear, and it would keep ordering every page they fetch.
     */
    test('drops an ordering whose column the applied view does not display', async ({ mount, page }) => {
        const orphaned: ListViewModel = {
            ...expiryWatch,
            columns: [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' }],
            sort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER', direction: SortDirection.Desc },
        };
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} views={[orphaned]} />);

        await expect.poll(() => headings(page)).toEqual(['property:COMMON_NAME']);
        await expect.poll(async () => (await lastRequest(page))?.sort).toBeUndefined();
        await expect(page.locator('th[aria-sort]')).toHaveCount(0);
    });

    test('never renders a table with no columns when the config arrives with the platform set', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} withheldCatalogue />);

        await expect(page.getByTestId('view-tabs')).toHaveCount(0);
        await expect.poll(() => headings(page)).toEqual(['property:COMMON_NAME', 'property:NOT_AFTER']);
        await expect(page.getByText('acme.example')).toBeVisible();
    });

    /**
     * The configuration a page passes depends on a catalogue it is still fetching, so the host's first
     * render has none at all. An applied set initialised from that absent config and never revisited
     * would leave the table empty for good.
     */
    test('applies the platform set when the config arrives after the first render', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} withDeferredConfig />);

        await expect.poll(() => headings(page)).toEqual(['property:COMMON_NAME', 'property:NOT_AFTER']);
        await expect(page.getByText('acme.example')).toBeVisible();
    });

    test('withholds the strip until the catalogue has settled, so no view resolves to nothing', async ({ mount, page }) => {
        await mount(
            <PagedListColumnsWithStore
                rows={rows}
                standardColumns={standardColumns}
                catalogue={catalogue}
                views={[expiryWatch]}
                withheldCatalogue
            />,
        );

        await expect(page.getByTestId('list-requests')).toBeVisible();
        await expect(page.getByTestId('view-tabs')).toHaveCount(0);
        await expect.poll(() => headings(page)).toEqual(['property:COMMON_NAME', 'property:NOT_AFTER']);
    });

    /** See `withCatalogueSortability` for why a shipped set cannot declare this itself. */
    test('makes the Standard tab sortable from the catalogue, though the shipped set cannot declare it', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={shippedColumns} catalogue={catalogue} />);

        await expect.poll(() => headings(page)).toEqual(['property:COMMON_NAME', 'property:NOT_AFTER']);
        await expect(page.getByRole('button', { name: 'Common Name' })).toBeVisible();

        await page.getByRole('button', { name: 'Expires At' }).click();

        await expect
            .poll(async () => (await lastRequest(page))?.sort)
            .toEqual({ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER', direction: SortDirection.Asc });
    });

    test('leaves a shipped column the catalogue cannot order on unsortable', async ({ mount, page }) => {
        const withUnorderable: ColumnDefinition[] = [
            ...shippedColumns,
            { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'department|STRING', catalogueLabel: 'Department' },
        ];
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={withUnorderable} catalogue={catalogue} />);

        await expect.poll(() => headings(page)).toContain('custom:department|STRING');
        // Published as `sortable: false`, so the heading is a label rather than a button.
        await expect(page.getByRole('button', { name: 'Department' })).toHaveCount(0);
    });

    test('keeps a heading the page shipped rather than taking the catalogue label with the sort flag', async ({ mount, page }) => {
        const relabelled = [
            {
                filterFieldSource: FilterFieldSource.Property,
                searchFieldData: [field('COMMON_NAME', 'Subject Common Name'), field('NOT_AFTER', 'Not After')],
            },
        ] as unknown as SearchFieldListModel[];
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={shippedColumns} catalogue={relabelled} />);

        await expect(page.getByRole('button', { name: 'Common Name' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Subject Common Name' })).toHaveCount(0);
    });

    /**
     * The strip opens its pinned view once the catalogue settles, which is after the page has mounted.
     * A dashboard link or a deep link from a certificate's detail page has put its filters in the duck
     * by then, and replacing them with the view's would discard the rows the user actually asked for -
     * a moment after they asked. The view's columns and ordering still apply.
     */
    test('keeps filters that arrived with the page when the pinned view opens', async ({ mount, page }) => {
        const incoming = [
            {
                fieldSource: FilterFieldSource.Property,
                fieldIdentifier: 'COMMON_NAME',
                condition: FilterConditionOperator.Contains,
                value: 'from-a-deep-link',
            },
        ];
        await mount(
            <PagedListColumnsWithStore
                rows={rows}
                standardColumns={standardColumns}
                catalogue={catalogue}
                views={[expiryWatch]}
                initialFilters={incoming}
            />,
        );

        await expect.poll(() => headings(page)).toEqual(['property:NOT_AFTER', 'custom:department|STRING']);

        await expect(page.getByTestId('current-filters')).toContainText('from-a-deep-link');
        await expect(page.getByTestId('current-filters')).not.toContainText('acme');
        await expect.poll(async () => (await lastRequest(page))?.filters).toEqual(incoming);
    });

    /** Only the first application defers: a tab switch afterwards is the user's own act. */
    test('replaces those filters on the next tab switch', async ({ mount, page }) => {
        const incoming = [
            {
                fieldSource: FilterFieldSource.Property,
                fieldIdentifier: 'COMMON_NAME',
                condition: FilterConditionOperator.Contains,
                value: 'from-a-deep-link',
            },
        ];
        await mount(
            <PagedListColumnsWithStore
                rows={rows}
                standardColumns={standardColumns}
                catalogue={catalogue}
                views={[expiryWatch]}
                initialFilters={incoming}
            />,
        );
        await expect(page.getByTestId('current-filters')).toContainText('from-a-deep-link');

        await page.getByRole('tab', { name: 'Standard' }).click();

        await expect(page.getByTestId('current-filters')).not.toContainText('from-a-deep-link');
    });

    /** Why a page must not assemble its own refresh request is on `refreshToken`. */
    test('refetches its own request, columns and ordering included, when the page asks for a refresh', async ({ mount, page }) => {
        await mount(
            <PagedListColumnsWithStore
                rows={rows}
                standardColumns={standardColumns}
                catalogue={catalogue}
                views={[expiryWatch]}
                withRefreshControl
            />,
        );
        await expect.poll(() => headings(page)).toEqual(['property:NOT_AFTER', 'custom:department|STRING']);
        const before = (await listRequests(page)).length;

        await page.getByTestId('page-refresh').click();

        await expect.poll(async () => (await listRequests(page)).length).toBeGreaterThan(before);

        const request = await lastRequest(page);

        expect(request?.columns).toEqual([
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER' },
            { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'department|STRING' },
        ]);
        expect(request?.sort).toEqual({
            fieldSource: FilterFieldSource.Property,
            fieldIdentifier: 'NOT_AFTER',
            direction: SortDirection.Desc,
        });
        expect(request?.filters).toEqual([stateFilter]);
    });
});
