import { describe, expect, it } from 'vitest';
import { getExtensionJsonTreeError, getJsonSchemaDocumentError, JSON_SCHEMA_2020_12_DIALECT, parseStrictJson } from './strictJson';

describe('parseStrictJson', () => {
    it('parses every JSON value kind', () => {
        expect(parseStrictJson('{"sequence":[{"boolean":true},{"integer":0}]}').value).toEqual({
            sequence: [{ boolean: true }, { integer: 0 }],
        });
        expect(parseStrictJson('null').value).toBeNull();
        expect(parseStrictJson('  -1.5e3 ').value).toBe(-1500);
        expect(parseStrictJson('"a\\u0041\\n"').value).toBe('aA\n');
        expect(parseStrictJson('[]').value).toEqual([]);
        expect(parseStrictJson('{}').value).toEqual({});
    });

    it('rejects duplicate object keys, which JSON.parse silently collapses', () => {
        // JSON.parse would keep only the losing value 2 — exactly the corruption to catch.
        expect(JSON.parse('{"integer":1,"integer":2}')).toEqual({ integer: 2 });
        expect(parseStrictJson('{"integer":1,"integer":2}').error).toContain('Duplicate key "integer"');
        expect(parseStrictJson('{"a":{"b":1,"b":2}}').error).toContain('Duplicate key "b"');
    });

    it('rejects trailing content after the value', () => {
        expect(parseStrictJson('{"boolean":true} garbage').error).toContain('trailing content');
        expect(parseStrictJson('{} {}').error).toContain('trailing content');
        expect(parseStrictJson('1 2').error).toContain('trailing content');
    });

    it('rejects malformed JSON with a positioned message', () => {
        expect(parseStrictJson('{').error).toBeDefined();
        expect(parseStrictJson('{"a":}').error).toBeDefined();
        expect(parseStrictJson('{a: 1}').error).toContain('Expected a string key');
        expect(parseStrictJson('"unterminated').error).toBeDefined();
        expect(parseStrictJson('[1,]').error).toBeDefined();
        expect(parseStrictJson('01').error).toContain('trailing content');
        expect(parseStrictJson('"tab\tinside"').error).toContain('control character');
        expect(parseStrictJson('truthy').error).toBeDefined();
        expect(parseStrictJson('').error).toBeDefined();
    });
});

describe('getExtensionJsonTreeError', () => {
    it('accepts a well-formed structural ASN.1 tree', () => {
        expect(getExtensionJsonTreeError('{"sequence":[{"boolean":true},{"integer":0}]}')).toBeUndefined();
    });

    it('reports duplicate keys and trailing content', () => {
        expect(getExtensionJsonTreeError('{"integer":1,"integer":2}')).toContain('Duplicate key');
        expect(getExtensionJsonTreeError('{"boolean":true}}')).toContain('trailing content');
    });
});

describe('getJsonSchemaDocumentError', () => {
    it('accepts an empty document (required-ness is the caller rule)', () => {
        expect(getJsonSchemaDocumentError('')).toBeUndefined();
        expect(getJsonSchemaDocumentError('   ')).toBeUndefined();
    });

    it('accepts an object schema and a boolean schema', () => {
        expect(getJsonSchemaDocumentError('{"type":"object","required":["name"]}')).toBeUndefined();
        expect(getJsonSchemaDocumentError('true')).toBeUndefined();
        expect(getJsonSchemaDocumentError('false')).toBeUndefined();
    });

    it('accepts the draft 2020-12 dialect and local $refs', () => {
        expect(getJsonSchemaDocumentError(`{"$schema":"${JSON_SCHEMA_2020_12_DIALECT}","type":"string"}`)).toBeUndefined();
        expect(getJsonSchemaDocumentError('{"$ref":"#/$defs/node","$defs":{"node":{"type":"string"}}}')).toBeUndefined();
    });

    it('rejects a non-object document', () => {
        expect(getJsonSchemaDocumentError('[1,2]')).toContain('must be an object');
        expect(getJsonSchemaDocumentError('"just a string"')).toContain('must be an object');
        expect(getJsonSchemaDocumentError('42')).toContain('must be an object');
        expect(getJsonSchemaDocumentError('null')).toContain('must be an object');
    });

    it('rejects any dialect other than draft 2020-12', () => {
        expect(getJsonSchemaDocumentError('{"$schema":"http://json-schema.org/draft-07/schema#"}')).toContain('draft 2020-12');
    });

    it('rejects a remote $ref anywhere in the document', () => {
        expect(getJsonSchemaDocumentError('{"properties":{"a":{"$ref":"https://example.com/s.json"}}}')).toContain('Remote $ref');
        expect(getJsonSchemaDocumentError('{"allOf":[{"$ref":"other.json#/x"}]}')).toContain('Remote $ref');
    });

    it('rejects malformed JSON', () => {
        expect(getJsonSchemaDocumentError('{"type":')).toBeDefined();
        expect(getJsonSchemaDocumentError('{"a":1,"a":2}')).toContain('Duplicate key');
    });
});
