import type { SearchFieldListModel } from 'types/certificate';
import { FilterFieldSource, FilterFieldType } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import { expect, test } from '../../../playwright/ct-test';
import PagedListColumnsWithStore, { type StubRow } from './PagedListColumnsWithStore';

const catalogue = [
    {
        filterFieldSource: FilterFieldSource.Property,
        searchFieldData: [
            {
                fieldIdentifier: 'COMMON_NAME',
                fieldLabel: 'Common Name',
                type: FilterFieldType.String,
                conditions: [],
                displayable: true,
                sortable: true,
            },
        ],
    },
] as unknown as SearchFieldListModel[];

const standardColumns: ColumnDefinition[] = [
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', catalogueLabel: 'Common Name' },
];

const rows: StubRow[] = [{ uuid: 'cert-1', commonName: 'acme.example', notAfter: '2027-01-01' }];

test.describe('PagedList page header', () => {
    test('moves Create and Delete out of the table card into the page header', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} withPageHeader />);

        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Certificates Inventory');
        await expect(page.getByTestId('page-header-actions').getByRole('button', { name: 'Create' })).toBeVisible();
        await expect(page.getByTestId('create-button')).toHaveCount(0);
        await expect(page.getByTestId('delete-button')).toHaveCount(0);
    });

    test('keeps the bulk Delete disabled until rows are selected, then asks to confirm', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} withPageHeader />);
        await expect(page.getByText('acme.example')).toBeVisible();

        await page.getByRole('button', { name: 'More actions' }).click();
        const deleteEntry = page.getByRole('menuitem', { name: 'Delete', exact: true });
        await expect(deleteEntry).toHaveAttribute('aria-disabled', 'true');
        await expect(deleteEntry).toHaveAccessibleDescription('Select one or more certificates');
        await page.keyboard.press('Escape');

        await page.locator('tbody input[type="checkbox"]').first().check();
        await page.getByRole('button', { name: 'More actions' }).click();
        await expect(deleteEntry).not.toHaveAttribute('aria-disabled', 'true');
        await deleteEntry.click();

        await expect(page.getByRole('dialog')).toContainText('Is this what you want to do?');
    });
});
