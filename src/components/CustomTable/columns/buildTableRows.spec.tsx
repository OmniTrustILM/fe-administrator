import { expect, test } from '../../../../playwright/ct-test';
import { withProviders } from 'utils/test-helpers';
import { AttributeContentType, FilterFieldSource } from 'types/openapi';
import type { AttributeProjectable, ColumnDefinition } from 'types/tableColumns';
import CustomTable from '..';
import { buildColumnHeaders } from 'utils/tableColumns';
import { buildTableRows } from './buildTableRows';
import type { CellRegistry } from './registry';

interface Row extends AttributeProjectable {
    uuid: string;
    commonName: string;
}

const commonName: ColumnDefinition = {
    fieldSource: FilterFieldSource.Property,
    fieldIdentifier: 'COMMON_NAME',
    catalogueLabel: 'Common Name',
};

const costCentre: ColumnDefinition = {
    fieldSource: FilterFieldSource.Custom,
    fieldIdentifier: 'costCentre',
    catalogueLabel: 'Cost centre',
    attributeContentType: AttributeContentType.Integer,
};

const environment: ColumnDefinition = {
    fieldSource: FilterFieldSource.Custom,
    fieldIdentifier: 'environment',
    catalogueLabel: 'Environment',
    attributeContentType: AttributeContentType.String,
};

const rows: Row[] = [
    {
        uuid: 'u-1',
        commonName: 'api.acme.test',
        attributeValues: {
            [FilterFieldSource.Custom]: { costCentre: [{ data: 4820 }], environment: [{ data: 'production' }, { data: 'staging' }] },
        },
    },
    { uuid: 'u-2', commonName: 'vpn.acme.test', attributeValues: { [FilterFieldSource.Custom]: { environment: [{ data: 'dmz' }] } } },
];

const registry: CellRegistry<Row> = {
    'property:COMMON_NAME': (row) => <a href={`/certificates/detail/${row.uuid}`}>{row.commonName}</a>,
};

const renderTable = (columns: ColumnDefinition[]) =>
    withProviders(
        <CustomTable
            headers={buildColumnHeaders(columns)}
            data={buildTableRows(rows, columns, { getRowId: (row) => row.uuid, registry })}
        />,
    );

test.describe('buildTableRows', () => {
    test('renders a row from the column definitions it is given', async ({ mount, page }) => {
        await mount(renderTable([commonName, costCentre, environment]));

        await expect(page.getByRole('columnheader')).toHaveText(['Common Name', 'Cost centre', 'Environment']);
        await expect(page.getByRole('row').nth(1).getByRole('cell')).toHaveText(['api.acme.test', '4820', /production/]);
    });

    test('renders the same row in a different column order without touching the row data', async ({ mount, page }) => {
        await mount(renderTable([environment, commonName, costCentre]));

        await expect(page.getByRole('columnheader')).toHaveText(['Environment', 'Common Name', 'Cost centre']);
        await expect(page.getByRole('row').nth(1).getByRole('cell')).toHaveText([/production/, 'api.acme.test', '4820']);
    });

    test('uses the registry entry for a rich property column', async ({ mount, page }) => {
        await mount(renderTable([commonName]));

        await expect(page.getByRole('link', { name: 'api.acme.test' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'vpn.acme.test' })).toBeVisible();
    });

    test('falls back to the attribute renderer for a column with no registry entry', async ({ mount, page }) => {
        await mount(renderTable([costCentre]));

        await expect(page.getByRole('row').nth(1).getByRole('cell')).toHaveText(['4820']);
    });

    test('renders the empty state for a row missing a value, without dropping the cell', async ({ mount, page }) => {
        await mount(renderTable([commonName, costCentre]));

        // The second row has no cost centre, so its cell is the shared empty state rather than absent.
        await expect(page.getByRole('row').nth(2).getByRole('cell')).toHaveCount(2);
        await expect(page.getByRole('row').nth(2).getByTestId('empty-cell')).toBeVisible();
    });

    test('holds every cell to one text line, whatever state it is in', async ({ mount, page }) => {
        await mount(renderTable([commonName, costCentre, environment]));

        // Row 1 carries a link, a number and a multi-valued attribute; row 2 carries a link, an
        // empty cell and a single value. Every one of those is one line high, which is what keeps
        // twenty-five rows comparable. Row boxes themselves differ by the table's own half-pixel
        // divider, so the promise is asserted on the cell content rather than on the row.
        const heights = await page.evaluate(() =>
            [...document.querySelectorAll('tbody td')].map((cell) => Math.round(cell.getBoundingClientRect().height)),
        );

        expect(new Set(heights).size).toBe(1);
    });

    test('renders no rows for no data', async ({ mount }) => {
        const columns = [commonName];
        expect(buildTableRows([], columns, { getRowId: (row: Row) => row.uuid })).toEqual([]);
    });

    test('renders a row with no columns as a row with no cells', async ({ mount }) => {
        expect(buildTableRows(rows, [], { getRowId: (row) => row.uuid })[0]).toMatchObject({ id: 'u-1', columns: [] });
    });

    test('carries row options through when the caller supplies them', async ({ mount }) => {
        const built = buildTableRows(rows, [commonName], {
            getRowId: (row) => row.uuid,
            rowOptions: (row) => (row.uuid === 'u-1' ? { rowClassName: 'accent' } : undefined),
        });

        expect(built[0].options).toEqual({ rowClassName: 'accent' });
        expect(built[1].options).toBeUndefined();
    });

    test('treats a registry entry that returns nothing as a missing value', async ({ mount, page }) => {
        const blankRegistry: CellRegistry<Row> = { 'property:COMMON_NAME': () => '' };
        await mount(
            withProviders(
                <CustomTable
                    headers={buildColumnHeaders([commonName])}
                    data={buildTableRows(rows, [commonName], { getRowId: (row) => row.uuid, registry: blankRegistry })}
                />,
            ),
        );

        await expect(page.getByTestId('empty-cell')).toHaveCount(2);
    });
});
