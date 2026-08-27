import { expect, test } from '../../../playwright/ct-test';
import { withProviders } from 'utils/test-helpers';
import { AttributeContentType, FilterFieldSource, FilterFieldType, type SearchFieldDataByGroupDto } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import ColumnPicker from './index';

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
            field('SERIAL_NUMBER', 'Serial Number'),
            field('ISSUER_DN', 'Issuer DN'),
            field('FINGERPRINT', 'Fingerprint', { displayable: false }),
        ],
    },
    {
        filterFieldSource: FilterFieldSource.Custom,
        searchFieldData: [
            field('costCentre', 'Cost centre', { sortable: false, attributeContentType: AttributeContentType.Integer }),
            field('environment', 'Environment', { sortable: false }),
        ],
    },
] as unknown as SearchFieldDataByGroupDto[];

const commonName: ColumnDefinition = {
    fieldSource: FilterFieldSource.Property,
    fieldIdentifier: 'COMMON_NAME',
    catalogueLabel: 'Common Name',
};
const serialNumber: ColumnDefinition = {
    fieldSource: FilterFieldSource.Property,
    fieldIdentifier: 'SERIAL_NUMBER',
    catalogueLabel: 'Serial Number',
};

type MountOptions = {
    columns?: ColumnDefinition[];
    standardColumns?: ColumnDefinition[];
    onSave?: (columns: ColumnDefinition[]) => void;
    onClose?: () => void;
    fieldCatalogue?: SearchFieldDataByGroupDto[];
};

const picker = ({
    columns = [commonName],
    standardColumns = [commonName, serialNumber],
    onSave,
    onClose,
    fieldCatalogue = catalogue,
}: MountOptions = {}) =>
    withProviders(
        <ColumnPicker
            isOpen
            onClose={onClose ?? (() => {})}
            onSave={onSave ?? (() => {})}
            catalogue={fieldCatalogue}
            columns={columns}
            standardColumns={standardColumns}
            resourceLabel="Certificates"
        />,
    );

test.describe('ColumnPicker', () => {
    test('groups available fields by source with human-readable labels', async ({ mount, page }) => {
        await mount(picker());

        await expect(page.getByRole('heading', { name: 'Property' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Custom attribute' })).toBeVisible();
    });

    test('offers only fields the catalogue marks displayable', async ({ mount, page }) => {
        await mount(picker());

        await expect(page.getByTestId('available-fields-list')).toContainText('Serial Number');
        await expect(page.getByTestId('available-fields-list')).not.toContainText('Fingerprint');
    });

    test('marks a non-sortable field before it is chosen', async ({ mount, page }) => {
        await mount(picker());

        await expect(page.getByTestId('available-field-custom:costCentre')).toContainText('not sortable');
        await expect(page.getByTestId('available-field-property:SERIAL_NUMBER')).not.toContainText('not sortable');
    });

    test('shows which fields are already selected', async ({ mount, page }) => {
        await mount(picker());

        await expect(page.getByTestId('available-field-property:COMMON_NAME')).toContainText('added');
        await expect(page.getByTestId('add-field-property:COMMON_NAME')).toHaveCount(0);
    });

    test('searches across every source and hides groups left empty', async ({ mount, page }) => {
        await mount(picker());

        await page.getByTestId('available-fields-search').fill('cost');

        await expect(page.getByRole('heading', { name: 'Custom attribute' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Property' })).toHaveCount(0);
    });

    test('says so when nothing matches the search', async ({ mount, page }) => {
        await mount(picker());

        await page.getByTestId('available-fields-search').fill('zzzz');

        await expect(page.getByTestId('available-fields-empty')).toBeVisible();
    });

    test('renders no empty group for a resource with no custom attributes', async ({ mount, page }) => {
        await mount(picker({ fieldCatalogue: [catalogue[0]] }));

        await expect(page.getByRole('heading', { name: 'Property' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Custom attribute' })).toHaveCount(0);
    });

    test('adds a field to the end of the selected columns', async ({ mount, page }) => {
        await mount(picker());

        await page.getByTestId('add-field-custom:environment').click();

        await expect(page.getByTestId('selected-columns-list').getByRole('listitem')).toHaveCount(2);
        await expect(page.getByTestId('column-counter')).toHaveText('2 / 12');
    });

    test('removes a selected column', async ({ mount, page }) => {
        await mount(picker());

        await page.getByTestId('selected-column-property:COMMON_NAME-remove').click();

        await expect(page.getByTestId('selected-columns-empty')).toBeVisible();
    });

    test('reorders columns from the keyboard, not only by pointer drag', async ({ mount, page }) => {
        await mount(picker({ columns: [commonName, serialNumber] }));

        await page.getByTestId('selected-column-property:SERIAL_NUMBER-up').click();

        await expect(page.getByTestId('header-preview')).toHaveText(/Serial Number.*Common Name/);
    });

    test('reorders columns by dragging one onto another', async ({ mount, page }) => {
        await mount(picker({ columns: [commonName, serialNumber] }));

        await page.getByTestId('selected-column-property:SERIAL_NUMBER').dragTo(page.getByTestId('selected-column-property:COMMON_NAME'));

        await expect(page.getByTestId('header-preview')).toHaveText('Serial NumberCommon Name');
    });

    test('shows where a dragged column would land', async ({ mount, page }) => {
        await mount(picker({ columns: [commonName, serialNumber] }));

        const source = page.getByTestId('selected-column-property:SERIAL_NUMBER');
        const target = page.getByTestId('selected-column-property:COMMON_NAME');

        // The drag events are dispatched rather than mimed with the mouse: a completed dragTo
        // cannot show the mid-drag state, and raw mouse events never start an HTML5 drag at all.
        await source.dispatchEvent('dragstart');
        await target.dispatchEvent('dragover');

        await expect(target).toHaveClass(/border-t-brand/);
        await expect(source).toHaveClass(/opacity-50/);

        await target.dispatchEvent('drop');
        await expect(target).not.toHaveClass(/border-t-brand/);
    });

    test('disables the move controls at the ends of the order', async ({ mount, page }) => {
        await mount(picker({ columns: [commonName, serialNumber] }));

        await expect(page.getByTestId('selected-column-property:COMMON_NAME-up')).toBeDisabled();
        await expect(page.getByTestId('selected-column-property:SERIAL_NUMBER-down')).toBeDisabled();
    });

    test('renames a column heading and keeps the catalogue label visible', async ({ mount, page }) => {
        await mount(picker());

        await page.getByTestId('selected-column-property:COMMON_NAME-rename').click();
        await page.getByTestId('selected-column-property:COMMON_NAME-rename-input').fill('Host');
        await page.keyboard.press('Enter');

        const row = page.getByTestId('selected-column-property:COMMON_NAME');
        await expect(row).toContainText('Host');
        await expect(row).toContainText('← Common Name');
    });

    test('reverting a heading restores the catalogue label rather than a remembered string', async ({ mount, page }) => {
        await mount(picker());

        await page.getByTestId('selected-column-property:COMMON_NAME-rename').click();
        await page.getByTestId('selected-column-property:COMMON_NAME-rename-input').fill('Host');
        await page.keyboard.press('Enter');
        await page.getByTestId('selected-column-property:COMMON_NAME-revert').click();

        await expect(page.getByTestId('header-preview')).toHaveText('Common Name');
        await expect(page.getByTestId('selected-column-property:COMMON_NAME-revert')).toHaveCount(0);
    });

    test('renaming a column back to its catalogue label clears the override', async ({ mount, page }) => {
        await mount(picker());

        await page.getByTestId('selected-column-property:COMMON_NAME-rename').click();
        await page.getByTestId('selected-column-property:COMMON_NAME-rename-input').fill('Common Name');
        await page.keyboard.press('Enter');

        await expect(page.getByTestId('selected-column-property:COMMON_NAME-revert')).toHaveCount(0);
    });

    test('the header preview follows the current selection and order live', async ({ mount, page }) => {
        await mount(picker());

        await expect(page.getByTestId('header-preview')).toHaveText('Common Name');
        await page.getByTestId('add-field-custom:environment').click();

        await expect(page.getByTestId('header-preview')).toHaveText(/Common Name.*Environment/);
    });

    test('refills the selected columns from the platform set', async ({ mount, page }) => {
        await mount(picker({ columns: [], standardColumns: [commonName, serialNumber] }));

        await page.getByTestId('reset-to-standard').click();

        await expect(page.getByTestId('selected-columns-list').getByRole('listitem')).toHaveCount(2);
    });

    test('blocks saving with no columns, because the API rejects an empty set', async ({ mount, page }) => {
        await mount(picker({ columns: [] }));

        await expect(page.getByTestId('selected-columns-empty')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    test('saves the columns in the arranged order, with the heading override', async ({ mount, page }) => {
        const saved: ColumnDefinition[][] = [];
        await mount(picker({ columns: [commonName, serialNumber], onSave: (columns) => saved.push(columns) }));

        await page.getByTestId('selected-column-property:SERIAL_NUMBER-rename').click();
        await page.getByTestId('selected-column-property:SERIAL_NUMBER-rename-input').fill('Serial');
        await page.keyboard.press('Enter');
        await page.getByTestId('selected-column-property:SERIAL_NUMBER-up').click();
        await page.getByRole('button', { name: 'Save' }).click();

        await expect.poll(() => saved.length).toBe(1);
        expect(saved[0].map((column) => column.fieldIdentifier)).toEqual(['SERIAL_NUMBER', 'COMMON_NAME']);
        expect(saved[0][0].label).toBe('Serial');
    });

    test('cancel reports no columns at all', async ({ mount, page }) => {
        const saved: ColumnDefinition[][] = [];
        let closed = 0;
        await mount(picker({ onSave: (columns) => saved.push(columns), onClose: () => (closed += 1) }));

        await page.getByTestId('add-field-custom:environment').click();
        await page.getByRole('button', { name: 'Cancel' }).click();

        await expect.poll(() => closed).toBe(1);
        expect(saved).toEqual([]);
    });
});
