import { describe, expect, test } from 'vitest';
import {
    transformTokenDetailResponseDtoToModel,
    transformTokenInstanceStatusComponentDtoToModel,
    transformTokenInstanceStatusDtoToModel,
    transformTokenRequestModelToDto,
    transformTokenResponseDtoToModel,
} from './tokens';

const attrItem = { uuid: 'a1', name: 'attr', label: 'Attr', type: 'STRING', contentType: 'STRING', version: 'V2', content: [] } as any;

describe('transformTokenResponseDtoToModel', () => {
    test('returns a spread copy that is not the same reference', () => {
        const dto = { uuid: 't1', name: 'token' } as any;
        const result = transformTokenResponseDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});

describe('transformTokenInstanceStatusComponentDtoToModel', () => {
    test('returns a spread copy that is not the same reference', () => {
        const dto = { name: 'comp', status: 'OK' } as any;
        const result = transformTokenInstanceStatusComponentDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});

describe('transformTokenInstanceStatusDtoToModel', () => {
    test('leaves components undefined when absent', () => {
        const dto = { status: 'CONNECTED' } as any;
        const result = transformTokenInstanceStatusDtoToModel(dto);
        expect(result.components).toBeUndefined();
    });

    test('includes components in result when present', () => {
        const dto = { status: 'CONNECTED', components: { name: 'comp', status: 'OK' } } as any;
        const result = transformTokenInstanceStatusDtoToModel(dto);
        expect(result.components).toBeDefined();
    });
});

describe('transformTokenDetailResponseDtoToModel', () => {
    test('maps attributes, includes status, and leaves metadata and customAttributes undefined when absent', () => {
        const dto = {
            uuid: 'td1',
            attributes: [attrItem],
            status: {},
        } as any;
        const result = transformTokenDetailResponseDtoToModel(dto);
        expect(result.attributes).toHaveLength(1);
        expect(result.status).toBeDefined();
        expect(result.metadata).toBeUndefined();
        expect(result.customAttributes).toBeUndefined();
    });
});

describe('transformTokenRequestModelToDto', () => {
    test('maps attributes and leaves customAttributes undefined when absent', () => {
        const input = { name: 'new-token', attributes: [attrItem] } as any;
        const result = transformTokenRequestModelToDto(input);
        expect(result.attributes).toHaveLength(1);
        expect(result.customAttributes).toBeUndefined();
    });

    test('maps customAttributes when present', () => {
        const input = { name: 'new-token', attributes: [], customAttributes: [attrItem] } as any;
        const result = transformTokenRequestModelToDto(input);
        expect(result.customAttributes).toHaveLength(1);
    });
});
