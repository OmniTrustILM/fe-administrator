import { describe, expect, test } from 'vitest';
import { AttributeContentType, AttributeType, FieldType, ObjectType } from 'types/openapi';
import type { FieldMapping } from 'types/openapi';
import type { AttributeDescriptorModel } from 'types/attributes';
import { fieldMappingSummary, fieldMappingTokens, getFieldMapping } from './requestAttributes';

// fields carry rdn/generalNameType/extensionOid that the generated TS subtypes omit,
// so build plain objects and cast to the FieldMapping shape.
const mapping = (fields: unknown[]): FieldMapping => ({ objectType: ObjectType.X509Certificate, fields }) as unknown as FieldMapping;

const dataDescriptor = (fieldMapping?: FieldMapping): AttributeDescriptorModel =>
    ({
        uuid: 'u1',
        name: 'serverFqdn',
        type: AttributeType.Data,
        contentType: AttributeContentType.String,
        properties: { label: 'Server FQDN', visible: true, required: true },
        fieldMapping,
    }) as unknown as AttributeDescriptorModel;

const customDescriptor = (): AttributeDescriptorModel =>
    ({
        uuid: 'u2',
        name: 'custom',
        type: AttributeType.Custom,
        contentType: AttributeContentType.String,
        properties: { label: 'Custom', visible: true },
    }) as unknown as AttributeDescriptorModel;

describe('getFieldMapping', () => {
    test('returns the mapping for a data attribute that has one', () => {
        const fm = mapping([{ fieldType: FieldType.Rdn, rdn: 'CN' }]);
        expect(getFieldMapping(dataDescriptor(fm))).toBe(fm);
    });
    test('returns undefined for a data attribute without a mapping', () => {
        expect(getFieldMapping(dataDescriptor())).toBeUndefined();
    });
    test('returns undefined for a non-data attribute', () => {
        expect(getFieldMapping(customDescriptor())).toBeUndefined();
    });
    test('returns undefined for undefined', () => {
        expect(getFieldMapping(undefined)).toBeUndefined();
    });
});

describe('fieldMappingSummary', () => {
    test('rdn renders Subject <rdn>', () => {
        expect(fieldMappingSummary(mapping([{ fieldType: FieldType.Rdn, rdn: 'O' }]))).toBe('Subject O');
    });
    test('san with known general name type renders friendly X.509 name', () => {
        expect(fieldMappingSummary(mapping([{ fieldType: FieldType.San, generalNameType: 'dns' }]))).toBe('SAN dNSName');
    });
    test('san with unknown general name type falls back to the raw value', () => {
        expect(fieldMappingSummary(mapping([{ fieldType: FieldType.San, generalNameType: 'futureType' }]))).toBe('SAN futureType');
    });
    test('extension renders Extension <oid>', () => {
        expect(fieldMappingSummary(mapping([{ fieldType: FieldType.Extension, extensionOid: '2.5.29.17' }]))).toBe('Extension 2.5.29.17');
    });
    test('multiple fields join with " + " sorted by order ascending', () => {
        const fm = mapping([
            { fieldType: FieldType.San, generalNameType: 'dns', order: 2 },
            { fieldType: FieldType.Rdn, rdn: 'CN', order: 1 },
        ]);
        expect(fieldMappingSummary(fm)).toBe('Subject CN + SAN dNSName');
    });
    test('groups by type before order so per-type order never interleaves types', () => {
        // order is a per-type index: SAN order 1 must not sort ahead of RDN order 2.
        const fm = mapping([
            { fieldType: FieldType.San, generalNameType: 'dns', order: 1 },
            { fieldType: FieldType.Rdn, rdn: 'OU', order: 2 },
            { fieldType: FieldType.Rdn, rdn: 'CN', order: 1 },
            { fieldType: FieldType.Extension, extensionOid: '2.5.29.17', order: 1 },
        ]);
        expect(fieldMappingSummary(fm)).toBe('Subject CN + Subject OU + SAN dNSName + Extension 2.5.29.17');
    });
    test('unknown fieldType falls back to the raw fieldType', () => {
        expect(fieldMappingSummary(mapping([{ fieldType: 'newKind' }]))).toBe('newKind');
    });
    test('missing sub-field renders the bare field label', () => {
        expect(fieldMappingSummary(mapping([{ fieldType: FieldType.Rdn }]))).toBe('Subject');
    });
    test('undefined / empty mapping renders empty string', () => {
        expect(fieldMappingSummary(undefined)).toBe('');
        expect(fieldMappingSummary(mapping([]))).toBe('');
    });
});

describe('fieldMappingTokens', () => {
    test('returns one token per field, grouped by type', () => {
        const fm = mapping([
            { fieldType: FieldType.San, generalNameType: 'dns', order: 1 },
            { fieldType: FieldType.Rdn, rdn: 'CN', order: 1 },
        ]);
        expect(fieldMappingTokens(fm)).toEqual(['Subject CN', 'SAN dNSName']);
    });
    test('returns an empty array for undefined / empty mapping', () => {
        expect(fieldMappingTokens(undefined)).toEqual([]);
        expect(fieldMappingTokens(mapping([]))).toEqual([]);
    });
});
