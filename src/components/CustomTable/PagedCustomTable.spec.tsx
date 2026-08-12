import { test, expect } from '../../../playwright/ct-test';
import { withProviders } from 'utils/test-helpers';
import PagedCustomTable from './PagedCustomTable';
import type { TableHeader, TableDataRow } from './index';

const mockHeaders: TableHeader[] = [
    { id: 'name', content: 'Name' },
    { id: 'value', content: 'Value' },
];

const mockData: TableDataRow[] = [
    { id: 1, columns: ['Row 1', '100'] },
    { id: 2, columns: ['Row 2', '200'] },
];

test.describe('PagedCustomTable', () => {
    test('should render table with headers and data', async ({ mount, page }) => {
        await mount(withProviders(<PagedCustomTable headers={mockHeaders} data={mockData} totalItems={2} onReloadData={() => {}} />));
        await expect(page.getByTestId('paged-custom-table')).toBeVisible();
        await expect(page.getByText('Name')).toBeVisible();
        await expect(page.getByText('Value')).toBeVisible();
        await expect(page.getByText('Row 1')).toBeVisible();
        await expect(page.getByText('Row 2')).toBeVisible();
    });

    test('should render pagination', async ({ mount }) => {
        const component = await mount(
            withProviders(<PagedCustomTable headers={mockHeaders} data={mockData} totalItems={25} onReloadData={() => {}} />),
        );
        await expect(component.getByText(/Showing|items of/)).toBeVisible();
    });

    test('should call onReloadData on mount', async ({ mount, page }) => {
        let callCount = 0;
        await mount(
            withProviders(
                <PagedCustomTable
                    headers={mockHeaders}
                    data={mockData}
                    totalItems={2}
                    onReloadData={() => {
                        callCount += 1;
                    }}
                />,
            ),
        );
        // onReloadData fires from a mount effect, so the table becoming visible is enough of a signal.
        await page.getByTestId('paged-custom-table').waitFor({ state: 'visible', timeout: 2000 });
        expect(callCount).toBeGreaterThanOrEqual(1);
    });

    test('should render skeleton when isLoading is true', async ({ mount }) => {
        const component = await mount(
            withProviders(
                <PagedCustomTable headers={mockHeaders} data={mockData} totalItems={2} onReloadData={() => {}} isLoading={true} />,
            ),
        );
        await expect(component.getByTestId('table-skeleton')).toBeVisible();
    });

    test('should hide skeleton when isLoading is false', async ({ mount, page }) => {
        await mount(
            withProviders(
                <PagedCustomTable headers={mockHeaders} data={mockData} totalItems={2} onReloadData={() => {}} isLoading={false} />,
            ),
        );
        await expect(page.getByTestId('table-skeleton')).toHaveCount(0);
        await expect(page.getByText('Row 1')).toBeVisible();
    });
});
