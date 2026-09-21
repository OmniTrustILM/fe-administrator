import { expect, test } from '../../../playwright/ct-test';
import { withProviders } from 'utils/test-helpers';
import { FilterFieldSource, FilterFieldType, type SearchFieldDataByGroupDto } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import ColumnPicker from './index';

/** Enough fields to build a view well past twelve columns and still have some left to add. */
const PROPERTY_FIELDS = Array.from({ length: 16 }, (_value, index) => ({
    fieldIdentifier: `FIELD_${index}`,
    fieldLabel: `Field ${index}`,
    type: FilterFieldType.String,
    conditions: [],
    displayable: true,
    sortable: true,
}));

const catalogue = [
    { filterFieldSource: FilterFieldSource.Property, searchFieldData: PROPERTY_FIELDS },
] as unknown as SearchFieldDataByGroupDto[];

const columnsOf = (count: number): ColumnDefinition[] =>
    PROPERTY_FIELDS.slice(0, count).map((field) => ({
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: field.fieldIdentifier,
        catalogueLabel: field.fieldLabel,
    }));

const picker = (columns: ColumnDefinition[], onSave?: (columns: ColumnDefinition[]) => void) =>
    withProviders(
        <ColumnPicker
            isOpen
            onClose={() => {}}
            onSave={onSave ?? (() => {})}
            catalogue={catalogue}
            columns={columns}
            standardColumns={columnsOf(2)}
        />,
    );

test.describe('ColumnPicker · a wide selection', () => {
    test('counts a single column in the singular', async ({ mount, page }) => {
        await mount(picker(columnsOf(1)));

        await expect(page.getByTestId('column-counter')).toHaveText('1 column');
    });

    test('adds a thirteenth column rather than refusing it', async ({ mount, page }) => {
        await mount(picker(columnsOf(12)));

        await page.getByTestId('add-field-property:FIELD_12').click();

        await expect(page.getByTestId('column-counter')).toHaveText('13 columns');
        await expect(page.getByTestId('selected-columns-list').getByRole('listitem')).toHaveCount(13);
    });

    test('keeps the add controls live well past twelve', async ({ mount, page }) => {
        await mount(picker(columnsOf(14)));

        await expect(page.getByTestId('add-field-property:FIELD_14')).toBeEnabled();

        await page.getByTestId('add-field-property:FIELD_14').click();

        await expect(page.getByTestId('column-counter')).toHaveText('15 columns');
    });

    test('saves a view of more than twelve columns', async ({ mount, page }) => {
        const saved: ColumnDefinition[][] = [];
        await mount(picker(columnsOf(12), (columns) => saved.push(columns)));

        await page.getByTestId('add-field-property:FIELD_12').click();
        await page.getByRole('button', { name: 'Save' }).click();

        await expect.poll(() => saved.length).toBe(1);
        expect(saved[0]).toHaveLength(13);
    });

    test('says a wide view scrolls, and only once the selection is past twelve', async ({ mount, page }) => {
        await mount(picker(columnsOf(12)));

        await expect(page.getByTestId('column-width-advisory')).toHaveCount(0);

        await page.getByTestId('add-field-property:FIELD_12').click();

        await expect(page.getByTestId('column-width-advisory')).toContainText('scrolls horizontally');
    });

    test('keeps unselected fields listed and searchable, so the catalogue never looks broken', async ({ mount, page }) => {
        await mount(picker(columnsOf(12)));

        await expect(page.getByTestId('available-field-property:FIELD_15')).toBeVisible();
        await page.getByTestId('available-fields-search').fill('Field 14');
        await expect(page.getByTestId('available-field-property:FIELD_14')).toBeVisible();
    });

    test('renders a stored view of fourteen columns in full', async ({ mount, page }) => {
        await mount(picker(columnsOf(14)));

        await expect(page.getByTestId('column-counter')).toHaveText('14 columns');
        await expect(page.getByTestId('selected-columns-list').getByRole('listitem')).toHaveCount(14);
        await expect(page.getByTestId('column-width-advisory')).toBeVisible();
    });

    test('still requires one column: removing the last one blocks saving', async ({ mount, page }) => {
        await mount(picker(columnsOf(1)));

        await page.getByTestId('selected-column-property:FIELD_0-remove').click();

        await expect(page.getByTestId('selected-columns-empty')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
    });
});

test.describe('ColumnPicker · a column whose field is gone', () => {
    const gone: ColumnDefinition = {
        fieldSource: FilterFieldSource.Custom,
        fieldIdentifier: 'cost_centre',
        catalogueLabel: 'Cost centre',
    };
    const withGone = [columnsOf(1)[0], gone, columnsOf(2)[1]];

    test('keeps the column in its stored position and badges it unavailable', async ({ mount, page }) => {
        await mount(picker(withGone));

        const rows = page.getByTestId('selected-columns-list').getByRole('listitem');
        await expect(rows).toHaveCount(3);
        await expect(rows.nth(1)).toContainText('Unavailable');
    });

    test('shows the stored identifier, so an administrator can tell what the column was', async ({ mount, page }) => {
        await mount(picker(withGone));

        await expect(page.getByTestId('selected-column-custom:cost_centre')).toContainText('custom / cost_centre');
    });

    test('offers removal as the only action on it', async ({ mount, page }) => {
        await mount(picker(withGone));

        const row = page.getByTestId('selected-column-custom:cost_centre');
        await expect(row.getByRole('button')).toHaveCount(1);
        await expect(page.getByTestId('selected-column-custom:cost_centre-remove')).toBeVisible();
    });

    test('leaves it out of the header preview, which is what the table would render', async ({ mount, page }) => {
        await mount(picker(withGone));

        await expect(page.getByTestId('header-preview')).not.toContainText('Cost centre');
    });

    test('drops it on save', async ({ mount, page }) => {
        const saved: ColumnDefinition[][] = [];
        await mount(picker(withGone, (columns) => saved.push(columns)));

        await page.getByRole('button', { name: 'Save' }).click();

        await expect.poll(() => saved.length).toBe(1);
        expect(saved[0].map((column) => column.fieldIdentifier)).toEqual(['FIELD_0', 'FIELD_1']);
    });

    /**
     * Save sends only the available columns, so a draft of nothing but unavailable rows resolves to
     * the empty set the API rejects — even though the draft itself is not empty.
     */
    test('blocks saving a draft of nothing but unavailable columns', async ({ mount, page }) => {
        await mount(picker([gone]));

        await expect(page.getByTestId('selected-columns-list').getByRole('listitem')).toHaveCount(1);
        await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    /** It is not draggable, but it holds a position, so a column has to be placeable above it. */
    test('accepts a drop, so a column can be placed immediately above it', async ({ mount, page }) => {
        await mount(picker(withGone));
        const rows = page.getByTestId('selected-columns-list').getByRole('listitem');

        await page.getByTestId('selected-column-property:FIELD_1').dragTo(page.getByTestId('selected-column-custom:cost_centre'));

        await expect(rows.nth(1)).toContainText('Field 1');
        await expect(rows.nth(2)).toContainText('Unavailable');
    });

    test('still lets the rest of the view be arranged around it', async ({ mount, page }) => {
        await mount(picker(withGone));
        const rows = page.getByTestId('selected-columns-list').getByRole('listitem');

        // The unavailable column holds a real position, so moving past it is a real move even
        // though the preview — which shows what the table would render — does not change yet.
        await page.getByTestId('selected-column-property:FIELD_1-up').click();
        await expect(rows.nth(1)).toContainText('Field 1');
        await expect(rows.nth(2)).toContainText('Unavailable');
        await expect(page.getByTestId('header-preview')).toHaveText('Field 0Field 1');

        await page.getByTestId('selected-column-property:FIELD_1-up').click();
        await expect(page.getByTestId('header-preview')).toHaveText('Field 1Field 0');
    });
});
