import { FilterFieldSource } from 'types/openapi';
import type { ColumnDefinition, SourcedCatalogueField } from 'types/tableColumns';
import { expect, test, type Page } from '../../../playwright/ct-test';
import AddColumnMenuHarness from './AddColumnMenuHarness';

const field = (source: FilterFieldSource, identifier: string, label: string) =>
    ({ fieldSource: source, fieldIdentifier: identifier, fieldLabel: label, sortable: true }) as SourcedCatalogueField;

const fields = [
    field(FilterFieldSource.Property, 'COMMON_NAME', 'Common Name'),
    field(FilterFieldSource.Property, 'NOT_AFTER', 'Expires At'),
    field(FilterFieldSource.Custom, 'costCentre|STRING', 'Cost centre'),
    field(FilterFieldSource.Meta, 'discoverySource|STRING', 'Discovery source'),
];

const column = (source: FilterFieldSource, identifier: string, catalogueLabel: string): ColumnDefinition => ({
    fieldSource: source,
    fieldIdentifier: identifier,
    catalogueLabel,
    sortable: true,
});

const commonName = column(FilterFieldSource.Property, 'COMMON_NAME', 'Common Name');
const expiresAt = column(FilterFieldSource.Property, 'NOT_AFTER', 'Expires At');

const appliedColumns = async (page: Page): Promise<string[]> =>
    JSON.parse((await page.getByTestId('applied-columns').textContent()) ?? '[]') as string[];

test.describe('AddColumnMenu', () => {
    test('opens the catalogue as four source columns, an unpublished source included', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByTestId('add-column-menu')).toBeVisible();
        for (const source of [FilterFieldSource.Custom, FilterFieldSource.Meta, FilterFieldSource.Data, FilterFieldSource.Property]) {
            await expect(page.getByTestId(`add-column-menu-source-${source}`)).toBeVisible();
        }
        await expect(page.getByTestId(`add-column-menu-source-${FilterFieldSource.Data}`)).toContainText('None published');
    });

    test('reports which fields are already columns', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByTestId('add-column-menu-field-property:COMMON_NAME')).toBeChecked();
        await expect(page.getByTestId('add-column-menu-field-custom:costCentre|STRING')).not.toBeChecked();
    });

    test('appends a checked field as the last column', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();
        await page.getByTestId('add-column-menu-field-custom:costCentre|STRING').check();

        await expect.poll(() => appliedColumns(page)).toEqual(['property:COMMON_NAME', 'property:NOT_AFTER', 'custom:costCentre|STRING']);
    });

    test('takes a column away when its field is unchecked', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();
        await page.getByTestId('add-column-menu-field-property:NOT_AFTER').uncheck();

        await expect.poll(() => appliedColumns(page)).toEqual(['property:COMMON_NAME']);
    });

    test('will not let the last remaining column be unchecked', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName]} />);

        await page.getByTestId('add-column-menu-trigger').click();

        const last = page.getByTestId('add-column-menu-field-property:COMMON_NAME');
        await expect(last).toBeChecked();
        await expect(last).toBeDisabled();
        await expect(page.getByTestId('add-column-menu-field-property:NOT_AFTER')).toBeEnabled();
    });

    test('searches across every source at once', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();
        await page.getByTestId('add-column-menu-search').fill('co');

        await expect(page.getByTestId('add-column-menu-field-custom:costCentre|STRING')).toBeVisible();
        await expect(page.getByTestId('add-column-menu-field-meta:discoverySource|STRING')).toBeVisible();
        await expect(page.getByTestId('add-column-menu-field-property:COMMON_NAME')).toBeVisible();
        await expect(page.getByTestId('add-column-menu-field-property:NOT_AFTER')).toHaveCount(0);
    });

    test('tells a source emptied by the search from one that publishes nothing', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();
        await page.getByTestId('add-column-menu-search').fill('zzz');

        await expect(page.getByTestId(`add-column-menu-source-${FilterFieldSource.Meta}`)).toContainText('No match');
        await expect(page.getByTestId(`add-column-menu-source-${FilterFieldSource.Data}`)).toContainText('None published');
    });

    test('says the catalogue is still loading rather than that nothing is published', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={[]} columns={[commonName, expiresAt]} isCatalogueLoaded={false} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByTestId(`add-column-menu-source-${FilterFieldSource.Custom}`)).toContainText('Loading');
        await expect(page.getByTestId('add-column-menu')).not.toContainText('None published');
    });

    test('names each checkbox by its field and its source', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByRole('checkbox', { name: 'Cost centre Custom attribute' })).toBeVisible();
        await expect(page.getByRole('checkbox', { name: 'Common Name Property' })).toBeVisible();
    });

    test('opens from the keyboard and gives focus back to the trigger on Escape', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        const trigger = page.getByRole('button', { name: 'Add column' });
        await trigger.focus();
        await page.keyboard.press('Enter');

        await expect(page.getByTestId('add-column-menu')).toBeVisible();
        expect(await page.evaluate(() => document.querySelector('[data-testid="add-column-menu"]')?.contains(document.activeElement))).toBe(
            true,
        );

        await page.keyboard.press('Escape');

        await expect(page.getByTestId('add-column-menu')).toHaveCount(0);
        await expect(trigger).toBeFocused();
    });

    test('checks a field from the keyboard', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();
        await page.getByTestId('add-column-menu-field-custom:costCentre|STRING').focus();
        await page.keyboard.press('Space');

        await expect.poll(() => appliedColumns(page)).toContain('custom:costCentre|STRING');
    });

    test('names the locked checkbox with the reason it cannot be unchecked', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName]} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByRole('checkbox', { name: /A view must keep at least one column/ })).toBeVisible();
    });

    test('shows the reason the last checkbox is locked where a sighted keyboard user can read it', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName]} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByTestId('add-column-menu-hint')).toHaveText('A view must keep at least one column');
    });

    test('names no such reason while more than one column stands', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByTestId('add-column-menu')).toBeVisible();
        await expect(page.getByTestId('add-column-menu-hint')).toHaveCount(0);
    });

    test('locks every checkbox, and says why, while the host cannot keep a change', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} canToggle={false} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByTestId('add-column-menu-field-custom:costCentre|STRING')).toBeDisabled();
        await expect(page.getByTestId('add-column-menu-field-property:COMMON_NAME')).toBeDisabled();
        await expect(page.getByTestId('add-column-menu-hint')).toHaveText('Columns cannot be changed while the page is loading');
    });

    test('counts the fields in the search placeholder only once the catalogue has arrived', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={[]} columns={[commonName, expiresAt]} isCatalogueLoaded={false} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByTestId('add-column-menu-search')).toHaveAttribute('placeholder', 'Search fields…');
    });

    test('counts them once it has', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByTestId('add-column-menu-search')).toHaveAttribute('placeholder', 'Search 4 fields…');
    });

    test('clears the search when it hands over to the dialog', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} withEditColumns />);

        await page.getByTestId('add-column-menu-trigger').click();
        await page.getByTestId('add-column-menu-search').fill('cost');
        await page.getByTestId('add-column-menu-edit-columns').click();

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByTestId('add-column-menu-search')).toHaveValue('');
        await expect(page.getByTestId('add-column-menu-field-property:NOT_AFTER')).toBeVisible();
    });

    test('offers the way through to the full column dialog', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} withEditColumns />);

        await page.getByTestId('add-column-menu-trigger').click();
        await page.getByTestId('add-column-menu-edit-columns').click();

        await expect(page.getByTestId('edit-columns-count')).toHaveText('1');
        await expect(page.getByTestId('add-column-menu')).toHaveCount(0);
    });

    test('omits the way through when the host offers no dialog', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByTestId('add-column-menu')).toBeVisible();
        await expect(page.getByTestId('add-column-menu-edit-columns')).toHaveCount(0);
    });
});
