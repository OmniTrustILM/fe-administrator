import { describe, expect, it } from 'vitest';
import { FilterFieldSource } from 'types/openapi';
import type { SourcedCatalogueField } from 'types/tableColumns';
import { toMenuContents } from './sourceColumns';

const field = (source: FilterFieldSource, identifier: string, label: string): SourcedCatalogueField =>
    ({ fieldSource: source, fieldIdentifier: identifier, fieldLabel: label }) as SourcedCatalogueField;

const fields = [
    field(FilterFieldSource.Property, 'COMMON_NAME', 'Common Name'),
    field(FilterFieldSource.Property, 'NOT_AFTER', 'Expires At'),
    field(FilterFieldSource.Custom, 'costCentre|STRING', 'Cost centre'),
    field(FilterFieldSource.Meta, 'discoverySource|STRING', 'Discovery source'),
];

describe('toMenuContents', () => {
    it('lays the catalogue out as four columns, attribute sources before properties', () => {
        expect(toMenuContents(fields, [], '').sources.map((column) => column.source)).toEqual([
            FilterFieldSource.Custom,
            FilterFieldSource.Meta,
            FilterFieldSource.Data,
            FilterFieldSource.Property,
        ]);
    });

    it('keeps a column for a source that publishes nothing, so the layout does not reflow', () => {
        const data = toMenuContents(fields, [], '').sources.find((column) => column.source === FilterFieldSource.Data);

        expect(data?.fields).toEqual([]);
        expect(data?.isPublishing).toBe(false);
    });

    it('puts each field under the source it was published from', () => {
        const columns = toMenuContents(fields, [], '').sources;

        expect(columns[0].fields.map((entry) => entry.fieldIdentifier)).toEqual(['costCentre|STRING']);
        expect(columns[3].fields.map((entry) => entry.fieldIdentifier)).toEqual(['COMMON_NAME', 'NOT_AFTER']);
    });

    it('searches across every source at once', () => {
        const columns = toMenuContents(fields, [], 'co').sources;

        expect(columns[0].fields.map((entry) => entry.fieldLabel)).toEqual(['Cost centre']);
        expect(columns[3].fields.map((entry) => entry.fieldLabel)).toEqual(['Common Name']);
    });

    it('matches on the identifier too, so a column can be found by what a view recorded', () => {
        expect(toMenuContents(fields, [], 'NOT_AFTER').sources[3].fields.map((entry) => entry.fieldLabel)).toEqual(['Expires At']);
    });

    it('reports a source whose every field is already a column as exhausted, not as unmatched', () => {
        const columns = [{ fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'costCentre|STRING', catalogueLabel: 'Cost centre' }];

        const custom = toMenuContents(fields, columns, '').sources[0];

        expect(custom.fields).toEqual([]);
        expect(custom.isPublishing).toBe(true);
        expect(custom.isExhausted).toBe(true);
    });

    it('reports a source emptied by the search as unmatched rather than exhausted', () => {
        const custom = toMenuContents(fields, [], 'nothing matches this').sources[0];

        expect(custom.isPublishing).toBe(true);
        expect(custom.isExhausted).toBe(false);
    });

    it('reports a source as publishing even when the search has emptied its column', () => {
        const custom = toMenuContents(fields, [], 'nothing matches this').sources[0];

        expect(custom.fields).toEqual([]);
        expect(custom.isPublishing).toBe(true);
    });

    it('lists the displayed columns first, in display order, and takes them out of their source column', () => {
        const columns = [
            { fieldSource: FilterFieldSource.Meta, fieldIdentifier: 'discoverySource|STRING', catalogueLabel: 'Discovery source' },
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER', catalogueLabel: 'Expires At' },
        ];

        const { shown, sources } = toMenuContents(fields, columns, '');

        expect(shown.map((entry) => entry.fieldIdentifier)).toEqual(['discoverySource|STRING', 'NOT_AFTER']);
        expect(sources[1].fields).toEqual([]);
        expect(sources[3].fields.map((entry) => entry.fieldIdentifier)).toEqual(['COMMON_NAME']);
    });

    it('leaves a displayed column out of the shown section when the search excludes it, without offering it again', () => {
        const columns = [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER', catalogueLabel: 'Expires At' }];

        const { shown, sources } = toMenuContents(fields, columns, 'common');

        expect(shown).toEqual([]);
        expect(sources[3].fields.map((entry) => entry.fieldIdentifier)).toEqual(['COMMON_NAME']);
    });

    it('skips a displayed column the catalogue no longer publishes', () => {
        const columns = [{ fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'retired|STRING', catalogueLabel: 'Retired' }];

        expect(toMenuContents(fields, columns, '').shown).toEqual([]);
    });
});
