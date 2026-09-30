import { describe, expect, it } from 'vitest';

import { FilterFieldSource, Resource, type SearchFieldDataByGroupDto } from 'types/openapi';
import { toCreateRequest, toStandardSlice } from 'utils/listViews';
import { KEY_COLUMNS } from './keyTableHelpers';

/**
 * The cryptographic-key property fields core publishes, stated independently of {@link KEY_COLUMNS}
 * so a default column that core does not catalogue fails these tests instead of joining the fixture.
 * Mirrors `FilterField.java`; `CK_ASSOCIATIONS` is absent there and so is absent here.
 */
const CATALOGUED = [
    'CKI_ENABLED',
    'CKI_STATE',
    'CKI_NAME',
    'CKI_TYPE',
    'CKI_USAGE',
    'CKI_CRYPTOGRAPHIC_ALGORITHM',
    'CKI_LENGTH',
    'CKI_FORMAT',
    'CKI_CREATED',
    'CK_GROUP',
    'CK_OWNER',
    'CK_TOKEN_PROFILE',
    'CK_TOKEN_INSTANCE',
];

const keysCatalogue = [
    {
        filterFieldSource: FilterFieldSource.Property,
        searchFieldData: CATALOGUED.map((fieldIdentifier) => ({ fieldIdentifier, fieldLabel: fieldIdentifier, conditions: [] })),
    },
] as unknown as SearchFieldDataByGroupDto[];

describe('KEY_COLUMNS saved as a view', () => {
    it('names exactly one column the catalogue cannot publish', () => {
        expect(KEY_COLUMNS.map((column) => column.fieldIdentifier).filter((identifier) => !CATALOGUED.includes(identifier))).toEqual([
            'CK_ASSOCIATIONS',
        ]);
    });

    it('drops that column on write, so saving the platform default set is accepted', () => {
        const request = toCreateRequest('Standard (copy)', Resource.Keys, toStandardSlice(KEY_COLUMNS), {
            catalogue: keysCatalogue,
            standardColumns: KEY_COLUMNS,
        });

        expect(request.columns.map((column) => column.fieldIdentifier)).toEqual([
            'CKI_ENABLED',
            'CKI_STATE',
            'CKI_NAME',
            'CKI_TYPE',
            'CKI_CRYPTOGRAPHIC_ALGORITHM',
            'CKI_LENGTH',
            'CKI_FORMAT',
            'CKI_CREATED',
            'CK_GROUP',
            'CK_OWNER',
            'CK_TOKEN_PROFILE',
            'CK_TOKEN_INSTANCE',
        ]);
    });
});
