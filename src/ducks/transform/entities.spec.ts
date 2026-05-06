import { describe, expect, test } from 'vitest';
import { transformEntityRequestModelToDto, transformEntityResponseDtoToModel } from './entities';

const attrItem = { uuid: 'a1', name: 'attr', label: 'Attr', type: 'STRING', contentType: 'STRING', version: 'V2', content: [] } as any;

describe('transformEntityResponseDtoToModel', () => {
    test('maps attributes and leaves customAttributes undefined when absent', () => {
        const input = { uuid: 'e1', name: 'entity', attributes: [attrItem] } as any;
        const result = transformEntityResponseDtoToModel(input);
        expect(result.attributes).toHaveLength(1);
        expect(result.customAttributes).toBeUndefined();
    });

    test('maps both attributes and customAttributes when both present', () => {
        const input = { uuid: 'e2', name: 'entity', attributes: [attrItem], customAttributes: [attrItem] } as any;
        const result = transformEntityResponseDtoToModel(input);
        expect(result.attributes).toHaveLength(1);
        expect(result.customAttributes).toHaveLength(1);
    });
});

describe('transformEntityRequestModelToDto', () => {
    test('maps attributes and leaves customAttributes undefined when absent', () => {
        const input = { name: 'entity', connectorUuid: 'con1', kind: 'KIND', attributes: [attrItem] } as any;
        const result = transformEntityRequestModelToDto(input);
        expect(result.attributes).toHaveLength(1);
        expect(result.customAttributes).toBeUndefined();
    });
});
