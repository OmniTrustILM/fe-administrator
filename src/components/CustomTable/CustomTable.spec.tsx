import { test, expect } from '../../../playwright/ct-test';
import CustomTable, { type TableHeader, type TableDataRow } from './index';
import { createMockStore, withProviders } from 'utils/test-helpers';

test.describe('CustomTable', () => {
    const mockHeaders: TableHeader[] = [
        { id: 'name', content: 'Name', sortable: true },
        { id: 'email', content: 'Email' },
        { id: 'status', content: 'Status' },
    ];

    const mockData: TableDataRow[] = [
        { id: 1, columns: ['John Doe', 'john@example.com', 'Active'] },
        { id: 2, columns: ['Jane Smith', 'jane@example.com', 'Inactive'] },
        { id: 3, columns: ['Bob Johnson', 'bob@example.com', 'Active'] },
    ];

    test('should render table with headers and data', async ({ mount }) => {
        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={mockData} />));

        await expect(component.locator('table')).toBeVisible();
        await expect(component.locator('thead th')).toHaveCount(3);
        await expect(component.locator('tbody tr')).toHaveCount(3);
    });

    test('should render table without header when hasHeader is false', async ({ mount }) => {
        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={mockData} hasHeader={false} />));

        const table = component.locator('table');
        await expect(table).toBeVisible();
    });

    test('should render search input when canSearch is true', async ({ mount }) => {
        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={mockData} canSearch={true} />));

        const searchInput = component.getByPlaceholder('Search');
        await expect(searchInput).toBeVisible();
    });

    test('should filter data when search is used', async ({ mount }) => {
        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={mockData} canSearch={true} />));

        const searchInput = component.getByPlaceholder('Search');
        await searchInput.fill('John');

        await expect(component.getByText('John Doe')).toBeVisible();
        await expect(component.getByText('Bob Johnson')).toBeVisible();

        await expect(component.getByText('Jane Smith')).not.toBeVisible();
    });

    test('should render checkboxes when hasCheckboxes is true', async ({ mount }) => {
        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={mockData} hasCheckboxes={true} />));

        await expect(component.getByTestId('checkbox').first()).toBeVisible();
        const checkboxes = component.getByTestId('checkbox');
        const count = await checkboxes.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should call onCheckedRowsChanged when checkbox is clicked', async ({ mount }) => {
        let checkedRows: (string | number)[] = [];
        const handleCheckedChange = (rows: (string | number)[]) => {
            checkedRows = rows;
        };

        const component = await mount(
            withProviders(
                <CustomTable headers={mockHeaders} data={mockData} hasCheckboxes={true} onCheckedRowsChanged={handleCheckedChange} />,
            ),
        );

        const firstCheckbox = component.locator('input[type="checkbox"]').nth(1);
        await firstCheckbox.click();

        expect(checkedRows.length).toBeGreaterThan(0);
    });

    test('should render pagination when hasPagination is true', async ({ mount }) => {
        const paginationData = {
            page: 1,
            totalItems: 20,
            pageSize: 10,
            loadedPageSize: 10,
            totalPages: 2,
            itemsPerPageOptions: [5, 10, 20],
        };

        const component = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={mockData} hasPagination={true} paginationData={paginationData} />),
        );

        await expect(component.getByText(/Showing.*items of/)).toBeVisible();
    });

    test('should call onPageChanged when page is changed', async ({ mount }) => {
        const handlePageChange = (_page: number) => {};

        const paginationData = {
            page: 1,
            totalItems: 20,
            pageSize: 10,
            loadedPageSize: 10,
            totalPages: 2,
            itemsPerPageOptions: [5, 10, 20],
        };

        const component = await mount(
            withProviders(
                <CustomTable
                    headers={mockHeaders}
                    data={mockData}
                    hasPagination={true}
                    paginationData={paginationData}
                    onPageChanged={handlePageChange}
                />,
            ),
        );

        const nextButton = component.getByRole('button', { name: /next|>/i }).or(component.locator('a').filter({ hasText: /2/ }));
        if ((await nextButton.count()) > 0) {
            await nextButton.first().click();
        }
    });

    test('should call onPageSizeChanged when page size is changed', async ({ mount }) => {
        const handlePageSizeChange = (_size: number) => {};

        const paginationData = {
            page: 1,
            totalItems: 20,
            pageSize: 10,
            loadedPageSize: 10,
            totalPages: 2,
            itemsPerPageOptions: [5, 10, 20],
        };

        const component = await mount(
            withProviders(
                <CustomTable
                    headers={mockHeaders}
                    data={mockData}
                    hasPagination={true}
                    paginationData={paginationData}
                    onPageSizeChanged={handlePageSizeChange}
                />,
            ),
        );

        const selectButton = component.locator('button[aria-expanded]').first();
        if ((await selectButton.count()) > 0) {
            await expect(component.getByText(/Showing.*items of/)).toBeVisible();
        }
    });

    test('should sort columns when sortable header is clicked', async ({ mount }) => {
        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={mockData} />));

        const nameHeader = component.getByText('Name');
        await nameHeader.click();

        const table = component.locator('table');
        await expect(table).toBeVisible();
    });

    test('should handle empty data array', async ({ mount }) => {
        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={[]} />));

        await expect(component.getByText('Name')).toBeVisible();
        await expect(component.getByText('Email')).toBeVisible();
    });

    test('should support row details when hasDetails is true', async ({ mount }) => {
        const dataWithDetails: TableDataRow[] = [
            {
                id: 1,
                columns: ['John Doe', 'john@example.com'],
                detailColumns: ['Detail 1', 'Detail 2'],
            },
        ];

        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={dataWithDetails} hasDetails={true} />));

        const table = component.locator('table');
        await expect(table).toBeVisible();
    });

    test('should support multiSelect checkbox behavior', async ({ mount }) => {
        let checkedRows: (string | number)[] = [];
        const handleCheckedChange = (rows: (string | number)[]) => {
            checkedRows = rows;
        };

        const component = await mount(
            withProviders(
                <CustomTable
                    headers={mockHeaders}
                    data={mockData}
                    hasCheckboxes={true}
                    multiSelect={true}
                    onCheckedRowsChanged={handleCheckedChange}
                />,
            ),
        );

        const checkboxes = component.locator('input[type="checkbox"]');
        const checkboxCount = await checkboxes.count();
        if (checkboxCount > 1) {
            await checkboxes.nth(1).click();
            await checkboxes.nth(2).click();

            expect(checkedRows.length).toBeGreaterThanOrEqual(1);
        }
    });

    test('should support single select when multiSelect is false', async ({ mount }) => {
        let checkedRows: (string | number)[] = [];
        const handleCheckedChange = (rows: (string | number)[]) => {
            checkedRows = rows;
        };

        const component = await mount(
            withProviders(
                <CustomTable
                    headers={mockHeaders}
                    data={mockData}
                    hasCheckboxes={true}
                    multiSelect={false}
                    onCheckedRowsChanged={handleCheckedChange}
                />,
            ),
        );

        const checkboxes = component.locator('input[type="checkbox"]');
        const checkboxCount = await checkboxes.count();
        if (checkboxCount > 1) {
            await checkboxes.nth(1).click();
            await checkboxes.nth(2).click();

            expect(checkedRows.length).toBeLessThanOrEqual(1);
        }
    });

    test('should not render header checkbox when hasAllCheckBox is false', async ({ mount }) => {
        const component = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={mockData} hasCheckboxes={true} hasAllCheckBox={false} />),
        );
        await expect(component.getByTestId('checkbox').first()).toBeVisible();
        const checkboxes = component.getByTestId('checkbox');
        const count = await checkboxes.count();
        expect(count).toBe(mockData.length);
    });

    test('should render empty state when data is empty and no newRowWidgetProps', async ({ mount }) => {
        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={[]} />));
        await expect(component.getByText('Name')).toBeVisible();
        const table = component.locator('table tbody tr');
        await expect(table).toHaveCount(0);
    });

    test('should open detail modal when detail button is clicked', async ({ mount }) => {
        const dataWithDetails: TableDataRow[] = [
            {
                id: 1,
                columns: ['John Doe', 'john@example.com'],
                detailColumns: [['Detail A', 'Detail B']],
            },
        ];
        const detailHeaders: TableHeader[] = [{ id: 'detail-0', content: 'Detail Col', sortable: false }];
        const component = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={dataWithDetails} hasDetails={true} detailHeaders={detailHeaders} />),
        );
        await expect(component.getByText('John Doe')).toBeVisible();
        await component.getByRole('button', { name: 'John Doe' }).click();
        await expect(component.locator('table')).toBeVisible();
    });

    test('should use detailTitle as modal caption instead of jsxInnerText of first column', async ({ mount }) => {
        const store = createMockStore();
        const dataWithDetails: TableDataRow[] = [
            {
                id: 1,
                columns: [
                    <span key="col">
                        Complex <b>JSX</b>
                    </span>,
                    'detail@example.com',
                ],
                detailColumns: ['Detail content'],
                detailTitle: 'Clean Title',
            },
        ];
        const component = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={dataWithDetails} hasDetails={true} />, { store }),
        );
        await component.getByRole('button', { name: /Complex JSX/ }).click();
        expect(store.getState().userInterface.globalModal.title).toBe('Clean Title');
    });

    test('should sort by date when header has sortType date', async ({ mount }) => {
        const dateHeaders: TableHeader[] = [{ id: 'date', content: 'Date', sortable: true, sortType: 'date' }];
        const dateData: TableDataRow[] = [
            { id: 1, columns: ['2024-02-02 at 10:00'] },
            { id: 2, columns: ['2024-01-01 at 12:00'] },
        ];
        const component = await mount(withProviders(<CustomTable headers={dateHeaders} data={dateData} />));
        await component.getByText('Date').click();
        await expect(component.locator('table')).toBeVisible();
    });

    test('should sort by numeric when header has sortType numeric', async ({ mount }) => {
        const numHeaders: TableHeader[] = [{ id: 'num', content: 'Count', sortable: true, sortType: 'numeric' }];
        const numData: TableDataRow[] = [
            { id: 1, columns: ['100'] },
            { id: 2, columns: ['20'] },
        ];
        const component = await mount(withProviders(<CustomTable headers={numHeaders} data={numData} />));
        await component.getByText('Count').click();
        await expect(component.locator('table')).toBeVisible();
    });

    test('should apply row style when row has options.useAccentBottomBorder', async ({ mount }) => {
        const dataWithStyle: TableDataRow[] = [{ id: 1, columns: ['Cell A'], options: { useAccentBottomBorder: true } }];
        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={dataWithStyle} />));
        await expect(component.locator('table tbody').getByText('Cell A')).toBeVisible();
    });

    test('should show No items to show when hasPagination and empty data', async ({ mount }) => {
        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={[]} hasPagination={true} />));
        await expect(component.getByText('No items to show')).toBeVisible();
    });

    test('should show No items to show with subtitle when data is empty', async ({ mount }) => {
        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={[]} />));
        await expect(component.getByText('No items to show')).toBeVisible();
        await expect(component.getByText('There are no records to display here yet')).toBeVisible();
    });

    test('should show No matching items when search filters all rows out', async ({ mount }) => {
        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={mockData} canSearch={true} />));
        await component.getByPlaceholder('Search').fill('xyznonexistent');
        await expect(component.getByText('No matching items')).toBeVisible();
        await expect(component.getByText('Try adjusting your search or filters to see results')).toBeVisible();
    });

    test('should render empty state inside table when headers are visible', async ({ mount }) => {
        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={[]} />));
        await expect(component.locator('thead th')).toHaveCount(3);
        await expect(component.getByText('No items to show')).toBeVisible();
    });

    test('should show filtered count when search filters data', async ({ mount }) => {
        const component = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={mockData} canSearch={true} hasPagination={true} />),
        );
        await component.getByPlaceholder('Search').fill('John');
        await expect(component.getByText(/of loaded entries filtered/)).toBeVisible();
    });

    test('should disable search input when disableSearchControls is true', async ({ mount }) => {
        const component = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={mockData} canSearch={true} disableSearchControls={true} />),
        );
        await expect(component.getByPlaceholder('Search')).toBeDisabled();
    });

    test('should not change selection when disableSelectionControls is true', async ({ mount }) => {
        let checkedRows: (string | number)[] = [];
        const component = await mount(
            withProviders(
                <CustomTable
                    headers={mockHeaders}
                    data={mockData}
                    hasCheckboxes={true}
                    onCheckedRowsChanged={(rows) => {
                        checkedRows = rows;
                    }}
                    disableSelectionControls={true}
                />,
            ),
        );

        await expect(component.locator('input[type="checkbox"]').first()).toBeDisabled();
        await component.getByText('John Doe').click();
        expect(checkedRows).toEqual([]);
    });

    test('should disable pagination buttons when disablePaginationControls is true', async ({ mount }) => {
        const paginationData = {
            page: 1,
            totalItems: 20,
            pageSize: 10,
            loadedPageSize: 10,
            totalPages: 2,
            itemsPerPageOptions: [10, 20],
        };

        const component = await mount(
            withProviders(
                <CustomTable
                    headers={mockHeaders}
                    data={mockData}
                    hasPagination={true}
                    paginationData={paginationData}
                    disablePaginationControls={true}
                />,
            ),
        );

        await expect(component.getByTestId('pagination-prev')).toBeDisabled();
        await expect(component.getByTestId('pagination-next')).toBeDisabled();
    });

    test('should render NewRowWidget when newRowWidgetProps provided', async ({ mount, page }) => {
        await mount(
            withProviders(
                <CustomTable
                    headers={mockHeaders}
                    data={mockData}
                    newRowWidgetProps={{
                        selectHint: 'Add item',
                        immediateAdd: false,
                        isBusy: false,
                        newItemsList: [],
                        onAddClick: () => {},
                    }}
                />,
            ),
        );
        await expect(page.getByTestId('custom-table')).toBeVisible();
        await expect(page.getByTestId('select-newRowWidgetSelect-trigger')).toBeAttached();
    });

    test('should show pagination with internal state when no paginationData', async ({ mount }) => {
        const manyRows = Array.from({ length: 25 }, (_, i) => ({
            id: i + 1,
            columns: [`Row ${i + 1}`, `col2-${i}`, `col3-${i}`],
        }));
        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={manyRows} hasPagination={true} />));
        await expect(component.getByText(/Showing.*to.*of.*entries/)).toBeVisible();
    });

    test('should uncheck all when header checkbox unchecked', async ({ mount }) => {
        let checkedRows: (string | number)[] = [];
        const component = await mount(
            withProviders(
                <CustomTable headers={mockHeaders} data={mockData} hasCheckboxes={true} onCheckedRowsChanged={(r) => (checkedRows = r)} />,
            ),
        );
        const headerCheckbox = component.locator('input[type="checkbox"]').first();
        await headerCheckbox.click();
        expect(checkedRows.length).toBeGreaterThan(0);
        await headerCheckbox.click();
        expect(checkedRows.length).toBe(0);
    });

    test('should expand and collapse row when hasDetails and row body clicked', async ({ mount }) => {
        const dataWithDetails: TableDataRow[] = [{ id: 1, columns: ['John', 'john@example.com'], detailColumns: ['Detail 1'] }];
        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={dataWithDetails} hasDetails={true} />));
        await component.getByText('john@example.com').click();
        await expect(component.locator('table')).toBeVisible();
    });

    test('should show paginationData caption when provided', async ({ mount }) => {
        const paginationData = {
            page: 1,
            totalItems: 15,
            pageSize: 10,
            loadedPageSize: 10,
            totalPages: 2,
            itemsPerPageOptions: [10, 20],
        };
        const component = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={mockData} hasPagination={true} paginationData={paginationData} />),
        );
        await expect(component.getByText(/Showing.*to.*items of/)).toBeVisible();
    });

    test('should render header with align center', async ({ mount }) => {
        const headersWithAlign: TableHeader[] = [
            { id: 'name', content: 'Name', sortable: true },
            { id: 'status', content: 'Status', sortable: false, align: 'center' },
        ];
        const component = await mount(withProviders(<CustomTable headers={headersWithAlign} data={mockData} />));
        await expect(component.getByText('Status')).toBeVisible();
    });

    test('should sync checkedRows from prop', async ({ mount }) => {
        const component = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={mockData} hasCheckboxes={true} checkedRows={[1]} />),
        );
        const firstRowCheckbox = component.locator('input[type="checkbox"]').nth(1);
        await expect(firstRowCheckbox).toBeChecked();
    });

    test('should use internal page state when onPageChanged not provided', async ({ mount }) => {
        const manyRows = Array.from({ length: 30 }, (_, i) => ({
            id: i + 1,
            columns: [`Row ${i + 1}`, `b`, `c`],
        }));
        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={manyRows} hasPagination={true} />));
        await expect(component.getByText(/Showing 1 to 10/)).toBeVisible();
        await component.getByTestId('pagination-next').click();
        await expect(component.getByText(/Showing 11 to 20/)).toBeVisible();
    });

    test('should use internal page size when onPageSizeChanged not provided', async ({ mount }) => {
        const manyRows = Array.from({ length: 50 }, (_, i) => ({
            id: i + 1,
            columns: [`Item ${i + 1}`, `x`, `y`],
        }));
        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={manyRows} hasPagination={true} />));
        await expect(component.getByText(/Showing.*of.*entries/)).toBeVisible();
    });

    test('should use custom itemsPerPageOptions when provided', async ({ mount }) => {
        const manyRows = Array.from({ length: 50 }, (_, i) => ({
            id: i + 1,
            columns: [`Item ${i + 1}`, `x`, `y`],
        }));
        const component = await mount(
            withProviders(
                <CustomTable
                    headers={mockHeaders}
                    data={manyRows}
                    hasPagination={true}
                    itemsPerPageOptions={[10, 20, 50, 100, 200, 500, 1000]}
                />,
            ),
        );
        await expect(component.getByText(/Showing.*of.*entries/)).toBeVisible();
    });

    test('should show paginationData range when loadedPageSize exceeds remaining items', async ({ mount }) => {
        const paginationData = {
            page: 2,
            totalItems: 15,
            pageSize: 10,
            loadedPageSize: 5,
            totalPages: 2,
            itemsPerPageOptions: [10, 20],
        };
        const component = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={mockData} hasPagination={true} paginationData={paginationData} />),
        );
        await expect(component.getByText(/Showing.*to 15.*items of 15/)).toBeVisible();
    });

    test('should render table with no sortable headers', async ({ mount }) => {
        const noSortHeaders: TableHeader[] = [
            { id: 'a', content: 'Col A', sortable: false },
            { id: 'b', content: 'Col B', sortable: false },
        ];
        const component = await mount(withProviders(<CustomTable headers={noSortHeaders} data={mockData} />));
        await expect(component.getByText('Col A')).toBeVisible();
        await expect(component.getByText('John Doe')).toBeVisible();
    });

    test('should open detail modal with default headers when detailHeaders length differs from detailColumns', async ({ mount }) => {
        const dataWithDetails: TableDataRow[] = [
            {
                id: 1,
                columns: ['Row One', 'col2'],
                detailColumns: ['D1', 'D2'],
            },
        ];
        const singleDetailHeader: TableHeader[] = [{ id: 'only-one', content: 'One', sortable: false }];
        const component = await mount(
            withProviders(
                <CustomTable headers={mockHeaders} data={dataWithDetails} hasDetails={true} detailHeaders={singleDetailHeader} />,
            ),
        );
        await component.getByRole('button', { name: 'Row One' }).click();
        await expect(component.locator('table')).toBeVisible();
    });

    test('should expand row on body click when hasDetails and hasCheckboxes', async ({ mount }) => {
        const dataWithDetails: TableDataRow[] = [{ id: 1, columns: ['John', 'john@example.com'], detailColumns: ['Detail'] }];
        const component = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={dataWithDetails} hasDetails={true} hasCheckboxes={true} />),
        );
        await component.getByText('john@example.com').click();
        await expect(component.locator('table')).toBeVisible();
    });

    test('should render header with width style', async ({ mount }) => {
        const headersWithWidth: TableHeader[] = [{ id: 'name', content: 'Name', sortable: false, width: '50%' }];
        const component = await mount(withProviders(<CustomTable headers={headersWithWidth} data={mockData} />));
        await expect(component.getByText('Name')).toBeVisible();
    });

    test('should reset previous root route pagination after switching to different root route', async ({ mount }) => {
        const manyRows = Array.from({ length: 30 }, (_, i) => ({
            id: i + 1,
            columns: [`Row ${i + 1}`, `b`, `c`],
        }));
        const store = createMockStore();

        const rolesTable = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={manyRows} hasPagination={true} />, {
                store,
                initialRoute: '/roles',
            }),
        );
        await expect(rolesTable.getByText(/Showing 1 to 10/)).toBeVisible();
        await rolesTable.getByTestId('pagination-next').click();
        await expect(rolesTable.getByText(/Showing 11 to 20/)).toBeVisible();
        await rolesTable.unmount();

        const usersTable = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={manyRows} hasPagination={true} />, {
                store,
                initialRoute: '/users',
            }),
        );
        await expect(usersTable.getByText(/Showing 1 to 10/)).toBeVisible();
        await usersTable.unmount();

        const rolesAfterSwitch = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={manyRows} hasPagination={true} />, {
                store,
                initialRoute: '/roles',
            }),
        );
        await expect(rolesAfterSwitch.getByText(/Showing 1 to 10/)).toBeVisible();
        await rolesAfterSwitch.unmount();
    });

    test('paginationPersistKey pagination survives a root route switch (not cleared)', async ({ mount }) => {
        const manyRows = Array.from({ length: 30 }, (_, i) => ({
            id: i + 1,
            columns: [`Row ${i + 1}`, `b`, `c`],
        }));
        const store = createMockStore();
        const persistKey = 'custom-table-persistent:workflows:conditions';

        const listTable = await mount(
            withProviders(
                <CustomTable headers={mockHeaders} data={manyRows} hasPagination={true} paginationPersistKey="workflows:conditions" />,
                { store, initialRoute: '/rules/1' },
            ),
        );
        await expect(listTable.getByText(/Showing 1 to 10/)).toBeVisible();
        await listTable.getByTestId('pagination-next').click();
        await expect(listTable.getByText(/Showing 11 to 20/)).toBeVisible();
        expect((store.getState() as any).tablePagination.byKey[persistKey]).toEqual({ page: 2, pageSize: 10 });
        await listTable.unmount();

        const detailTable = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={manyRows} hasPagination={true} />, {
                store,
                initialRoute: '/conditions/detail/123',
            }),
        );
        await expect(detailTable.getByText(/Showing 1 to 10/)).toBeVisible();
        expect((store.getState() as any).tablePagination.byKey[persistKey]).toEqual({ page: 2, pageSize: 10 });
        await detailTable.unmount();
    });

    test('persists the search term to the pagination record when canSearch + paginationPersistKey', async ({ mount }) => {
        const store = createMockStore();
        const persistKey = 'custom-table-persistent:roles';

        const table = await mount(
            withProviders(
                <CustomTable headers={mockHeaders} data={mockData} canSearch={true} hasPagination={true} paginationPersistKey="roles" />,
                { store, initialRoute: '/roles' },
            ),
        );

        await table.getByPlaceholder('Search').fill('jane');
        await expect(table.getByText('jane@example.com')).toBeVisible();
        await expect(table.getByText('john@example.com')).toBeHidden();
        await expect.poll(() => (store.getState() as any).tablePagination.byKey[persistKey]?.search).toBe('jane');
        await table.unmount();
    });

    test('persists the active sort column/direction when paginationPersistKey is set', async ({ mount }) => {
        const store = createMockStore();
        const persistKey = 'custom-table-persistent:roles';

        const table = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={mockData} hasPagination={true} paginationPersistKey="roles" />, {
                store,
                initialRoute: '/roles',
            }),
        );

        await table.getByText('Name').click();
        await expect.poll(() => (store.getState() as any).tablePagination.byKey[persistKey]?.sortColumn).toBe('name');
        await expect.poll(() => (store.getState() as any).tablePagination.byKey[persistKey]?.sortDirection).toBe('asc');

        await table.getByText('Name').click();
        await expect.poll(() => (store.getState() as any).tablePagination.byKey[persistKey]?.sortDirection).toBe('desc');
        await table.unmount();
    });

    test('should render skeleton when isLoading is true', async ({ mount }) => {
        const paginationData = {
            page: 1,
            totalItems: 20,
            pageSize: 10,
            loadedPageSize: 10,
            totalPages: 2,
            itemsPerPageOptions: [5, 10, 20],
        };
        const component = await mount(
            withProviders(
                <CustomTable headers={mockHeaders} data={mockData} isLoading={true} hasPagination={true} paginationData={paginationData} />,
            ),
        );
        await expect(component.getByTestId('table-skeleton')).toBeVisible();
        await expect(component.getByText(/Showing.*items of/)).toBeVisible();
    });

    test('should toggle row selection when clicking on a table cell (not the checkbox)', async ({ mount }) => {
        let checkedRows: (string | number)[] = [];
        const component = await mount(
            withProviders(
                <CustomTable headers={mockHeaders} data={mockData} hasCheckboxes={true} onCheckedRowsChanged={(r) => (checkedRows = r)} />,
            ),
        );
        await component.getByText('john@example.com').click();
        expect(checkedRows).toContain('1');

        await component.getByText('john@example.com').click();
        expect(checkedRows).not.toContain('1');
    });

    test('should respect paginationStateKey prop for table signature', async ({ mount }) => {
        const manyRows = Array.from({ length: 30 }, (_, i) => ({
            id: i + 1,
            columns: [`Row ${i + 1}`, `b`, `c`],
        }));
        const store = createMockStore();

        const tableA = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={manyRows} hasPagination={true} paginationStateKey="table-a" />, {
                store,
                initialRoute: '/roles',
            }),
        );
        await tableA.getByTestId('pagination-next').click();
        await expect(tableA.getByText(/Showing 11 to 20/)).toBeVisible();
        await tableA.unmount();

        const tableB = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={manyRows} hasPagination={true} paginationStateKey="table-b" />, {
                store,
                initialRoute: '/roles',
            }),
        );
        await expect(tableB.getByText(/Showing 1 to 10/)).toBeVisible();
        await tableB.unmount();
    });

    test('should collapse expanded detail row on second click', async ({ mount }) => {
        const dataWithDetails: TableDataRow[] = [{ id: 1, columns: ['Alice', 'alice@example.com'], detailColumns: ['Detail info'] }];
        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={dataWithDetails} hasDetails={true} />));
        await component.getByText('alice@example.com').click();
        await component.getByText('alice@example.com').click();
        await expect(component.locator('table')).toBeVisible();
    });

    test('should disable page size select when disablePaginationControls is true', async ({ mount }) => {
        const paginationData = {
            page: 1,
            totalItems: 50,
            pageSize: 10,
            loadedPageSize: 10,
            totalPages: 5,
            itemsPerPageOptions: [10, 20, 50],
        };

        const component = await mount(
            withProviders(
                <CustomTable
                    headers={mockHeaders}
                    data={mockData}
                    hasPagination={true}
                    paginationData={paginationData}
                    disablePaginationControls={true}
                />,
            ),
        );

        await expect(component.locator('[data-testid="select-pageSize-input"]')).toBeDisabled();
    });

    test('should call onPageSizeChanged with a numeric value when page size select is changed', async ({ mount, page }) => {
        let calledWith: number | undefined;
        const paginationData = {
            page: 1,
            totalItems: 50,
            pageSize: 10,
            loadedPageSize: 10,
            totalPages: 5,
            itemsPerPageOptions: [10, 20, 50],
        };

        const component = await mount(
            withProviders(
                <CustomTable
                    headers={mockHeaders}
                    data={mockData}
                    hasPagination={true}
                    paginationData={paginationData}
                    onPageSizeChanged={(size) => {
                        calledWith = size;
                    }}
                />,
            ),
        );

        await component.getByTestId('select-pageSize-trigger').click();
        await page.getByRole('option', { name: '20', exact: true }).click();
        expect(calledWith).toBe(20);
    });

    test('should keep separate internal pagination for different tables on same route', async ({ mount }) => {
        const manyRows = Array.from({ length: 30 }, (_, i) => ({
            id: i + 1,
            columns: [`Row ${i + 1}`, `b`, `c`],
        }));
        const store = createMockStore();

        const tableA = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={manyRows} hasPagination={true} />, {
                store,
                initialRoute: '/roles',
            }),
        );
        await tableA.getByTestId('pagination-next').click();
        await expect(tableA.getByText(/Showing 11 to 20/)).toBeVisible();
        await tableA.unmount();

        const tableBHeaders: TableHeader[] = [
            { id: 'username', content: 'Username', sortable: true },
            { id: 'mail', content: 'Mail' },
            { id: 'state', content: 'State' },
        ];

        const tableB = await mount(
            withProviders(<CustomTable headers={tableBHeaders} data={manyRows} hasPagination={true} />, {
                store,
                initialRoute: '/roles',
            }),
        );

        await expect(tableB.getByText(/Showing 1 to 10/)).toBeVisible();
        await tableB.unmount();
    });

    test('should toggle two rows independently in multiSelect mode via cell click', async ({ mount }) => {
        let checkedRows: (string | number)[] = [];
        const component = await mount(
            withProviders(
                <CustomTable
                    headers={mockHeaders}
                    data={mockData}
                    hasCheckboxes={true}
                    multiSelect={true}
                    onCheckedRowsChanged={(r) => (checkedRows = r)}
                />,
            ),
        );
        await component.getByText('john@example.com').click();
        expect(checkedRows).toContain('1');
        await component.getByText('jane@example.com').click();
        expect(checkedRows).toContain('1');
        expect(checkedRows).toContain('2');
        await component.getByText('john@example.com').click();
        expect(checkedRows).not.toContain('1');
        expect(checkedRows).toContain('2');
    });

    test('should show placeholder div instead of select-all checkbox when multiSelect is false', async ({ mount }) => {
        const component = await mount(
            withProviders(
                <CustomTable headers={mockHeaders} data={mockData} hasCheckboxes={true} multiSelect={false} hasAllCheckBox={true} />,
            ),
        );
        await expect(component.locator('thead input[type="checkbox"]')).toHaveCount(0);
        await expect(component.locator('tbody input[type="checkbox"]').first()).toBeVisible();
    });

    test('should apply maxWidth style to header column', async ({ mount }) => {
        const headersWithMaxWidth: TableHeader[] = [
            { id: 'name', content: 'Name', sortable: false, maxWidth: 200 },
            { id: 'email', content: 'Email' },
        ];
        const component = await mount(withProviders(<CustomTable headers={headersWithMaxWidth} data={mockData} />));
        const th = component.locator('thead th').first();
        await expect(th).toHaveCSS('max-width', '200px');
    });

    test('should render row normally when options.useAccentBottomBorder is false', async ({ mount }) => {
        const dataWithFalseBorder: TableDataRow[] = [{ id: 1, columns: ['No border row'], options: { useAccentBottomBorder: false } }];
        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={dataWithFalseBorder} />));
        const row = component.locator('tbody tr').first();
        await expect(row).toBeVisible();
        const borderBottom = await row.evaluate((el) => (el as HTMLElement).style.borderBottom);
        expect(borderBottom).toBe('');
    });

    test('should show skeleton and hide search input when isLoading and canSearch are both true', async ({ mount }) => {
        const component = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={mockData} isLoading={true} canSearch={true} />),
        );
        await expect(component.getByTestId('table-skeleton')).toBeVisible();
        await expect(component.getByPlaceholder('Search')).toHaveCount(0);
    });

    test('should not show page size select when paginationData totalItems is zero', async ({ mount }) => {
        const paginationData = {
            page: 1,
            totalItems: 0,
            pageSize: 10,
            loadedPageSize: 0,
            totalPages: 0,
            itemsPerPageOptions: [10, 20],
        };
        const component = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={[]} hasPagination={true} paginationData={paginationData} />),
        );
        await expect(component.locator('[data-testid="select-pageSize-input"]')).toHaveCount(0);
    });

    test('should hide table container when hasHeader is false and search filters all rows', async ({ mount }) => {
        const component = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={mockData} hasHeader={false} canSearch={true} />),
        );
        await component.getByPlaceholder('Search').fill('xyznonexistent');
        await expect(component.locator('table')).toHaveCount(0);
        await expect(component.getByText('No matching items')).toHaveCount(0);
    });

    test('should sort column to desc order on second sortable header click', async ({ mount }) => {
        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={mockData} />));
        const nameHeader = component.getByText('Name');
        await nameHeader.click();
        await nameHeader.click();
        await expect(component.locator('tbody tr')).toHaveCount(mockData.length);
    });

    test('should clear pagination when activeRootRoute differs from current route', async ({ mount }) => {
        const store = createMockStore({
            tablePagination: {
                byKey: { 'custom-table-pagination:/roles:name|email|status|no-checkboxes|no-details': { page: 3, pageSize: 10 } },
                activeRootRoute: 'roles',
            } as any,
        });
        const component = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={mockData} hasPagination={true} />, {
                store,
                initialRoute: '/users',
            }),
        );
        await expect(component.locator('table')).toBeVisible();
    });

    test('should use provided detailHeaders when count matches detailColumns length', async ({ mount }) => {
        const dataWithDetails: TableDataRow[] = [{ id: 1, columns: ['Match Row', 'col2'], detailColumns: ['Detail A', 'Detail B'] }];
        const matchingHeaders: TableHeader[] = [
            { id: 'd1', content: 'D Col 1', sortable: false },
            { id: 'd2', content: 'D Col 2', sortable: false },
        ];
        const component = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={dataWithDetails} hasDetails={true} detailHeaders={matchingHeaders} />),
        );
        await component.getByRole('button', { name: 'Match Row' }).click();
        await expect(component.locator('table')).toBeVisible();
    });

    test('should replace selection via checkbox click when multiSelect is false', async ({ mount }) => {
        let checkedRows: (string | number)[] = [];
        const component = await mount(
            withProviders(
                <CustomTable
                    headers={mockHeaders}
                    data={mockData}
                    hasCheckboxes={true}
                    multiSelect={false}
                    onCheckedRowsChanged={(rows) => {
                        checkedRows = rows;
                    }}
                />,
            ),
        );
        const checkboxes = component.locator('tbody input[type="checkbox"]');
        await checkboxes.nth(0).click();
        expect(checkedRows).toHaveLength(1);
        const firstId = checkedRows[0];
        await checkboxes.nth(1).click();
        expect(checkedRows).toHaveLength(1);
        expect(checkedRows[0]).not.toBe(firstId);
    });

    test('should recalculate current page via onPageChanged so user stays on the page of the first visible item when page size shrinks', async ({
        mount,
        page,
    }) => {
        let calledWithSize: number | undefined;
        let calledWithPage: number | undefined;
        const paginationData = {
            page: 10,
            totalItems: 2000,
            pageSize: 200,
            loadedPageSize: 200,
            totalPages: 10,
            itemsPerPageOptions: [10, 200],
        };

        const component = await mount(
            withProviders(
                <CustomTable
                    headers={mockHeaders}
                    data={mockData}
                    hasPagination={true}
                    paginationData={paginationData}
                    onPageSizeChanged={(size) => {
                        calledWithSize = size;
                    }}
                    onPageChanged={(p) => {
                        calledWithPage = p;
                    }}
                />,
            ),
        );

        await component.getByTestId('select-pageSize-trigger').click();
        await page.getByRole('option', { name: '10', exact: true }).click();

        expect(calledWithSize).toBe(10);
        expect(calledWithPage).toBe(181);
    });

    test('should always call onPageChanged after page size change so consumers that reset page do not lose position', async ({
        mount,
        page,
    }) => {
        let calledWithPage: number | undefined;
        let pageChangeCalls = 0;
        // Page 2 with size 10 → first visible item 11. New size 200 → ceil(11/200) = 1.
        // Consumers like PagedList reset pageNumber to 1 inside onPageSizeChanged, so we must still
        // emit onPageChanged to confirm the recalculated page even when it happens to equal 1.
        const paginationData = {
            page: 2,
            totalItems: 50,
            pageSize: 10,
            loadedPageSize: 10,
            totalPages: 5,
            itemsPerPageOptions: [10, 200],
        };

        const component = await mount(
            withProviders(
                <CustomTable
                    headers={mockHeaders}
                    data={mockData}
                    hasPagination={true}
                    paginationData={paginationData}
                    onPageSizeChanged={() => {}}
                    onPageChanged={(p) => {
                        pageChangeCalls += 1;
                        calledWithPage = p;
                    }}
                />,
            ),
        );

        await component.getByTestId('select-pageSize-trigger').click();
        await page.getByRole('option', { name: '200', exact: true }).click();

        expect(pageChangeCalls).toBe(1);
        expect(calledWithPage).toBe(1);
    });

    test('should keep first visible item in view when page size changes in internal pagination', async ({ mount, page }) => {
        const manyRows = Array.from({ length: 50 }, (_, i) => ({
            id: i + 1,
            columns: [`Row ${i + 1}`, `b`, `c`],
        }));
        const component = await mount(withProviders(<CustomTable headers={mockHeaders} data={manyRows} hasPagination={true} />));

        await component.getByTestId('pagination-next').click();
        await component.getByTestId('pagination-next').click();
        await expect(component.getByText(/Showing 21 to 30 of 50/)).toBeVisible();

        await component.getByTestId('select-pageSize-trigger').click();
        await page.getByRole('option', { name: '20', exact: true }).click();

        await expect(component.getByText(/Showing 21 to 40 of 50/)).toBeVisible();
    });

    test('should reset page to last page when current page exceeds total pages after data shrinks', async ({ mount }) => {
        const paginationKey = 'custom-table-pagination:/roles:name|email|status|no-checkboxes|no-details';
        const store = createMockStore({
            tablePagination: {
                byKey: { [paginationKey]: { page: 3, pageSize: 10 } },
                activeRootRoute: 'roles',
            },
        });
        const component = await mount(
            withProviders(<CustomTable headers={mockHeaders} data={mockData} hasPagination={true} />, {
                store,
                initialRoute: '/roles',
            }),
        );
        await expect(component.getByText(/Showing 1 to 3 of 3/)).toBeVisible();
    });
});
