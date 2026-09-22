import { describe, expect, it } from 'vitest';
import { FilterFieldSource } from 'types/openapi';
import type { SourcedCatalogueField } from 'types/tableColumns';
import { toMenuColumns } from './sourceColumns';

const field = (source: FilterFieldSource, identifier: string, label: string): SourcedCatalogueField =>
    ({ fieldSource: source, fieldIdentifier: identifier, fieldLabel: label }) as SourcedCatalogueField;

const fields = [
    field(FilterFieldSource.Property, 'COMMON_NAME', 'Common Name'),
    field(FilterFieldSource.Property, 'NOT_AFTER', 'Expires At'),
    field(FilterFieldSource.Custom, 'costCentre|STRING', 'Cost centre'),
    field(FilterFieldSource.Meta, 'discoverySource|STRING', 'Discovery source'),
];

describe('toMenuColumns', () => {
    it('lays the catalogue out as four columns, attribute sources before properties', () => {
        expect(toMenuColumns(fields, '').map((column) => column.source)).toEqual([
            FilterFieldSource.Custom,
            FilterFieldSource.Meta,
            FilterFieldSource.Data,
            FilterFieldSource.Property,
        ]);
    });

    it('keeps a column for a source that publishes nothing, so the layout does not reflow', () => {
        const data = toMenuColumns(fields, '').find((column) => column.source === FilterFieldSource.Data);

        expect(data?.fields).toEqual([]);
        expect(data?.isPublishing).toBe(false);
    });

    it('puts each field under the source it was published from', () => {
        const columns = toMenuColumns(fields, '');

        expect(columns[0].fields.map((entry) => entry.fieldIdentifier)).toEqual(['costCentre|STRING']);
        expect(columns[3].fields.map((entry) => entry.fieldIdentifier)).toEqual(['COMMON_NAME', 'NOT_AFTER']);
    });

    it('searches across every source at once', () => {
        const columns = toMenuColumns(fields, 'co');

        expect(columns[0].fields.map((entry) => entry.fieldLabel)).toEqual(['Cost centre']);
        expect(columns[3].fields.map((entry) => entry.fieldLabel)).toEqual(['Common Name']);
    });

    it('matches on the identifier too, so a column can be found by what a view recorded', () => {
        expect(toMenuColumns(fields, 'NOT_AFTER')[3].fields.map((entry) => entry.fieldLabel)).toEqual(['Expires At']);
    });

    it('reports a source as publishing even when the search has emptied its column', () => {
        const custom = toMenuColumns(fields, 'nothing matches this')[0];

        expect(custom.fields).toEqual([]);
        expect(custom.isPublishing).toBe(true);
    });
});
