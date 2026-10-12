import { test, expect } from '../../../playwright/ct-test';
import { withProviders } from 'utils/test-helpers';
import PagedCustomTable from './PagedCustomTable';
import PagedCustomTableWithStore from './PagedCustomTableWithStore';
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
        await expect(component.getByTestId('table-skeleton-row').first()).toBeVisible();
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

    test('opens on the stored page and loads only that page', async ({ mount, page }) => {
        await mount(<PagedCustomTableWithStore storedPage={2} />);

        await expect(page.getByTestId('loaded-pages')).toHaveText('2');
        await expect(page.getByTestId('stored-page')).toHaveText('2');
    });

    test('keeps the stored page when the table is replaced right after mounting', async ({ mount, page }) => {
        await mount(<PagedCustomTableWithStore storedPage={2} replaceOnMount />);

        await expect(page.getByTestId('loaded-pages')).toHaveText('2, 2');
        await expect(page.getByTestId('stored-page')).toHaveText('2');
    });

    test('stores the page the user moves to', async ({ mount, page }) => {
        await mount(<PagedCustomTableWithStore />);

        await page.getByRole('button', { name: 'Next' }).click();

        await expect(page.getByTestId('loaded-pages')).toHaveText('1, 2');
        await expect(page.getByTestId('stored-page')).toHaveText('2');
    });

    test('follows a changed state key to the page stored for it', async ({ mount, page }) => {
        await mount(<PagedCustomTableWithStore storedPage={2} otherStoredPage={3} />);

        await page.getByRole('button', { name: 'Other table' }).click();

        await expect(page.getByTestId('loaded-pages')).toHaveText('2, 3');
        await expect(page.getByTestId('stored-page')).toHaveText('2');
        await expect(page.getByTestId('other-stored-page')).toHaveText('3');
    });
});
