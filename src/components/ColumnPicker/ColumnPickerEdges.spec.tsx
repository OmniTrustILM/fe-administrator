import { expect, test } from '../../../playwright/ct-test';
import { withProviders } from 'utils/test-helpers';
import { FilterFieldSource, FilterFieldType, type SearchFieldDataByGroupDto } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import ColumnPicker from './index';

/** Enough fields to reach the cap and still have some left over to prove they stay browsable. */
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

test.describe('ColumnPicker · at the cap', () => {
    test('counts up to the cap and warns before it binds', async ({ mount, page }) => {
        await mount(picker(columnsOf(10)));

        await expect(page.getByTestId('column-counter')).toHaveText('10 / 12');
        await expect(page.getByTestId('column-counter-warning')).toBeVisible();
    });

    test('does not warn below the threshold', async ({ mount, page }) => {
        await mount(picker(columnsOf(9)));

        await expect(page.getByTestId('column-counter-warning')).toHaveCount(0);
    });

    test('stops selection at the cap rather than silently ignoring further additions', async ({ mount, page }) => {
        await mount(picker(columnsOf(12)));

        await expect(page.getByTestId('column-counter')).toHaveText('12 / 12');
        await expect(page.getByTestId('add-field-property:FIELD_12')).toBeDisabled();
        await expect(page.getByTestId('available-fields-cap-hint')).toBeVisible();
    });

    test('keeps unselected fields listed and searchable at the cap, so the catalogue never looks broken', async ({ mount, page }) => {
        await mount(picker(columnsOf(12)));

        await expect(page.getByTestId('available-field-property:FIELD_15')).toBeVisible();
        await page.getByTestId('available-fields-search').fill('Field 14');
        await expect(page.getByTestId('available-field-property:FIELD_14')).toBeVisible();
    });

    test('lets a column be removed and another added again', async ({ mount, page }) => {
        await mount(picker(columnsOf(12)));

        await page.getByTestId('selected-column-property:FIELD_0-remove').click();

        await expect(page.getByTestId('column-counter')).toHaveText('11 / 12');
        await expect(page.getByTestId('add-field-property:FIELD_12')).toBeEnabled();
    });

    test('renders a stored view that is already above the cap rather than truncating it', async ({ mount, page }) => {
        await mount(picker(columnsOf(14)));

        await expect(page.getByTestId('column-counter')).toHaveText('14 / 12');
        await expect(page.getByTestId('selected-columns-list').getByRole('listitem')).toHaveCount(14);
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
