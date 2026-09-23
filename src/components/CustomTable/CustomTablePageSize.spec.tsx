import { expect, test } from '../../../playwright/ct-test';
import { withProviders } from 'utils/test-helpers';
import CustomTable, { type TableDataRow, type TableHeader } from './index';

const headers: TableHeader[] = [
    { id: 'name', content: 'Name' },
    { id: 'email', content: 'Email' },
];

const rows: TableDataRow[] = Array.from({ length: 30 }, (_, index) => ({
    id: index + 1,
    columns: [`Row ${index + 1}`, `row${index + 1}@example.com`],
}));

test.describe('CustomTable page size options', () => {
    test('offers exactly the four default page sizes', async ({ mount, page }) => {
        const component = await mount(withProviders(<CustomTable headers={headers} data={rows} hasPagination={true} />));

        await component.getByTestId('select-pageSize-trigger').click();

        await expect(page.getByTestId('select-pageSize-content').getByRole('option')).toHaveText(['10', '25', '50', '100']);
    });

    test('pages the table by the size the operator picks', async ({ mount, page }) => {
        const component = await mount(withProviders(<CustomTable headers={headers} data={rows} hasPagination={true} />));

        await component.getByTestId('select-pageSize-trigger').click();
        await page.getByTestId('select-pageSize-content').getByRole('option', { name: '25', exact: true }).click();

        await expect(component.getByText(/Showing 1 to 25 of 30/)).toBeVisible();
    });

    test('keeps the first visible item in view when the page size changes', async ({ mount, page }) => {
        const manyRows: TableDataRow[] = Array.from({ length: 50 }, (_, index) => ({
            id: index + 1,
            columns: [`Row ${index + 1}`, `row${index + 1}@example.com`],
        }));
        const component = await mount(withProviders(<CustomTable headers={headers} data={manyRows} hasPagination={true} />));

        await component.getByTestId('pagination-next').click();
        await component.getByTestId('pagination-next').click();
        await component.getByTestId('pagination-next').click();
        await expect(component.getByText(/Showing 31 to 40 of 50/)).toBeVisible();

        await component.getByTestId('select-pageSize-trigger').click();
        await page.getByTestId('select-pageSize-content').getByRole('option', { name: '25', exact: true }).click();

        await expect(component.getByText(/Showing 26 to 50 of 50/)).toBeVisible();
    });
});
