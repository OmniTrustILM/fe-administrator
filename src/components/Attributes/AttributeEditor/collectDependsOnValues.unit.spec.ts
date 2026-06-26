import { describe, expect, test } from 'vitest';
import { collectDependsOnValues } from './collectDependsOnValues';
import { AttributeContentType, AttributeType, AttributeVersion } from 'types/openapi';
import type { AttributeDescriptorModel, DataAttributeModel } from 'types/attributes';

const EDITOR_ID = 'ed1';

function dataDescriptor(overrides: Partial<DataAttributeModel> = {}): DataAttributeModel {
    return {
        type: AttributeType.Data,
        name: 'field',
        uuid: 'uuid-field',
        contentType: AttributeContentType.String,
        properties: { label: 'Field', required: false, readOnly: false, visible: true, list: false, multiSelect: false },
        ...overrides,
    } as DataAttributeModel;
}

/** A descriptor whose NG callback depends on the named attributes. */
function ngDescriptor(dependsOn: string[], overrides: Partial<DataAttributeModel> = {}): DataAttributeModel {
    return dataDescriptor({
        name: 'dependent',
        uuid: 'uuid-dependent',
        attributeCallback: { mappings: [], dependsOn } as any,
        ...overrides,
    });
}

function formValues(inner: Record<string, unknown>): Record<string, any> {
    return { [`__attributes__${EDITOR_ID}__`]: inner };
}

describe('collectDependsOnValues', () => {
    test('builds a RequestAttribute per dependsOn name when all values present (raw content, version stamped)', () => {
        const depA = dataDescriptor({ name: 'a', uuid: 'uuid-a', contentType: AttributeContentType.String });
        const depB = dataDescriptor({ name: 'b', uuid: 'uuid-b', contentType: AttributeContentType.Integer });
        const trigger = ngDescriptor(['a', 'b']);
        const descriptors: AttributeDescriptorModel[] = [depA, depB, trigger];

        const result = collectDependsOnValues(
            trigger,
            descriptors,
            formValues({
                // single-select list shape: { label, value: rawContent }
                a: { label: 'Alpha', value: { reference: 'alpha-ref', data: 'alpha' } },
                // scalar shape: primitive
                b: 7,
            }),
            EDITOR_ID,
        );

        expect(result).toEqual([
            {
                uuid: 'uuid-a',
                name: 'a',
                contentType: AttributeContentType.String,
                version: AttributeVersion.V2,
                content: [{ reference: 'alpha-ref', data: 'alpha' }],
            },
            {
                uuid: 'uuid-b',
                name: 'b',
                contentType: AttributeContentType.Integer,
                version: AttributeVersion.V2,
                content: [{ data: 7 }],
            },
        ]);
    });

    test('preserves raw content without flattening to a scalar (AC-2, distinguishes from getCurrentFromMappingValue)', () => {
        const depA = dataDescriptor({ name: 'a', uuid: 'uuid-a' });
        const trigger = ngDescriptor(['a']);
        const result = collectDependsOnValues(
            trigger,
            [depA, trigger],
            formValues({ a: { label: 'X', value: { reference: 'r', data: { nested: 'object', id: 'keep-me' } } } }),
            EDITOR_ID,
        );
        // The whole content object is preserved — NOT reduced to value.uuid / value.data.
        expect(result?.[0].content).toEqual([{ reference: 'r', data: { nested: 'object', id: 'keep-me' } }]);
    });

    test('returns undefined when any dependsOn value is missing (all-present gate)', () => {
        const depA = dataDescriptor({ name: 'a', uuid: 'uuid-a' });
        const depB = dataDescriptor({ name: 'b', uuid: 'uuid-b' });
        const trigger = ngDescriptor(['a', 'b']);
        const result = collectDependsOnValues(
            trigger,
            [depA, depB, trigger],
            formValues({ a: { label: 'Alpha', value: { data: 'alpha' } } }), // b absent
            EDITOR_ID,
        );
        expect(result).toBeUndefined();
    });

    test('treats empty string / null / empty array as missing', () => {
        const depA = dataDescriptor({ name: 'a', uuid: 'uuid-a' });
        const trigger = ngDescriptor(['a']);
        for (const empty of ['', null, []]) {
            expect(collectDependsOnValues(trigger, [depA, trigger], formValues({ a: empty }), EDITOR_ID)).toBeUndefined();
        }
    });

    test('sends ONLY the dependsOn-named attributes, never the whole form (R7 secret-scope)', () => {
        const depA = dataDescriptor({ name: 'a', uuid: 'uuid-a' });
        const secret = dataDescriptor({ name: 'secret', uuid: 'uuid-secret', contentType: AttributeContentType.Secret });
        const trigger = ngDescriptor(['a']);
        const result = collectDependsOnValues(
            trigger,
            [depA, secret, trigger],
            formValues({
                a: { label: 'Alpha', value: { data: 'alpha' } },
                secret: { label: 'hidden', value: { data: 'super-secret' } },
            }),
            EDITOR_ID,
        );
        expect(result).toHaveLength(1);
        expect(result?.[0].name).toBe('a');
        expect(JSON.stringify(result)).not.toContain('super-secret');
    });

    test('builds no pathVariable / body / requestParameter fields (D4 — only RequestAttribute fields)', () => {
        const depA = dataDescriptor({ name: 'a', uuid: 'uuid-a' });
        const trigger = ngDescriptor(['a']);
        const result = collectDependsOnValues(
            trigger,
            [depA, trigger],
            formValues({ a: { label: 'Alpha', value: { data: 'alpha' } } }),
            EDITOR_ID,
        );
        const keys = Object.keys(result![0]).sort();
        expect(keys).toEqual(['content', 'contentType', 'name', 'uuid', 'version']);
    });

    test('dependsOn: [] returns an empty array (fires once on mount with no payload)', () => {
        const trigger = ngDescriptor([]);
        expect(collectDependsOnValues(trigger, [trigger], formValues({}), EDITOR_ID)).toEqual([]);
    });

    test('returns undefined for a descriptor without dependsOn (legacy mappings only)', () => {
        const legacy = dataDescriptor({ name: 'legacy', attributeCallback: { mappings: [{ from: 'x', to: 'y', targets: [] }] } as any });
        expect(collectDependsOnValues(legacy, [legacy], formValues({}), EDITOR_ID)).toBeUndefined();
    });

    test('handles list multiSelect content (array of option objects)', () => {
        const depA = dataDescriptor({
            name: 'a',
            uuid: 'uuid-a',
            properties: { label: 'A', required: false, list: true, multiSelect: true } as any,
        });
        const trigger = ngDescriptor(['a']);
        const result = collectDependsOnValues(
            trigger,
            [depA, trigger],
            formValues({
                a: [
                    { label: 'One', value: { reference: 'r1', data: '1' } },
                    { label: 'Two', value: { reference: 'r2', data: '2' } },
                ],
            }),
            EDITOR_ID,
        );
        expect(result?.[0].content).toEqual([
            { reference: 'r1', data: '1' },
            { reference: 'r2', data: '2' },
        ]);
    });
});
