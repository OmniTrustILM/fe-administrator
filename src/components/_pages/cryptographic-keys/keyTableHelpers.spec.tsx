import { expect, test } from '../../../../playwright/ct-test';
import { withProviders } from 'utils/test-helpers';
import { AttributeContentType, FilterFieldSource } from 'types/openapi';
import type { CryptographicKeyResponseModel } from 'types/cryptographic-keys';
import type { ColumnDefinition } from 'types/tableColumns';
import { buildKeyRowColumns, KEY_COLUMNS } from './keyTableHelpers';

const opts = {
    keyTypeEnum: {},
    getEnumLabel: (_enumMap: unknown, key: string) => key,
    dateFormatter: (date: string | Date) => new Date(date).toISOString().slice(0, 10),
};

function buildKey(overrides: Partial<CryptographicKeyResponseModel> = {}): CryptographicKeyResponseModel {
    return {
        uuid: 'k-1',
        keyWrapperUuid: 'w-1',
        name: 'signing-key',
        enabled: true,
        length: 2048,
        format: 'RAW',
        keyAlgorithm: 'RSA',
        groups: [],
        associations: 3,
        ...overrides,
    } as unknown as CryptographicKeyResponseModel;
}

const columnAt = (identifier: string) => {
    const index = KEY_COLUMNS.findIndex((column) => column.fieldIdentifier === identifier);
    if (index < 0) throw new Error(`No default key column ${identifier}`);
    return index;
};

test.describe('keyTableHelpers', () => {
    test('renders one cell per column of the default set', () => {
        expect(buildKeyRowColumns(buildKey(), opts)).toHaveLength(KEY_COLUMNS.length);
    });

    test('renders the key name as a link to its detail page', async ({ mount, page }) => {
        const cells = buildKeyRowColumns(buildKey(), opts);
        await mount(withProviders(<div>{cells[columnAt('CKI_NAME')]}</div>));

        await expect(page.getByRole('link', { name: 'signing-key' })).toBeVisible();
    });

    test('renders the shared empty state for a key with no groups', async ({ mount, page }) => {
        const cells = buildKeyRowColumns(buildKey(), opts);
        await mount(withProviders(<div>{cells[columnAt('CK_GROUP')]}</div>));

        await expect(page.getByTestId('empty-cell')).toBeVisible();
        await expect(page.getByText('Unassigned')).toHaveCount(0);
    });

    test('renders the shared empty state rather than the literal "unknown" for an unset size', async ({ mount, page }) => {
        const cells = buildKeyRowColumns(buildKey({ length: undefined }), opts);
        await mount(withProviders(<div>{cells[columnAt('CKI_LENGTH')]}</div>));

        await expect(page.getByTestId('empty-cell')).toBeVisible();
        await expect(page.getByText('unknown')).toHaveCount(0);
    });

    test('shows the first group and a count for a key in several groups', async ({ mount, page }) => {
        const key = buildKey({
            groups: [
                { uuid: 'g-1', name: 'Production' },
                { uuid: 'g-2', name: 'HSM' },
            ],
        } as Partial<CryptographicKeyResponseModel>);

        await mount(withProviders(<div>{buildKeyRowColumns(key, opts)[columnAt('CK_GROUP')]}</div>));

        await expect(page.getByText('Production')).toBeVisible();
        await expect(page.getByText('+1')).toBeVisible();
    });

    test('renders a column set given in a different order', () => {
        const reordered = [KEY_COLUMNS[columnAt('CK_ASSOCIATIONS')], KEY_COLUMNS[columnAt('CKI_CRYPTOGRAPHIC_ALGORITHM')]];

        expect(buildKeyRowColumns(buildKey(), opts, reordered)).toEqual(['3', 'RSA']);
    });

    test('renders an attribute-sourced column the registry knows nothing about', async ({ mount, page }) => {
        const key = buildKey({
            attributeValues: { custom: { rotationDue: [{ data: '2026-09-01' }] } },
        } as Partial<CryptographicKeyResponseModel>);
        const column: ColumnDefinition = {
            fieldSource: FilterFieldSource.Custom,
            fieldIdentifier: 'rotationDue',
            catalogueLabel: 'Rotation due',
            attributeContentType: AttributeContentType.Date,
        };

        await mount(withProviders(<div>{buildKeyRowColumns(key, opts, [column])[0]}</div>));

        await expect(page.getByText('2026-09-01')).toBeVisible();
    });
});
