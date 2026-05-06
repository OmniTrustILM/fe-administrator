import { describe, expect, test } from 'vitest';
import {
    transformAuthorityRequestModelToDto,
    transformAuthorityResponseDtoToModel,
    transformAuthorityUpdateRequestModelToDto,
} from './authorities';

const sampleAttribute = {
    uuid: 'a1',
    name: 'attr',
    label: 'Attr',
    type: 'STRING',
    contentType: 'STRING',
    version: 'V2',
    content: [],
} as any;

describe('authorities transforms', () => {
    test('transformAuthorityResponseDtoToModel - attributes missing defaults to empty array', () => {
        const dto = { uuid: 'auth-1', name: 'authority' } as any;
        const result = transformAuthorityResponseDtoToModel(dto);
        expect(result.attributes).toEqual([]);
    });

    test('transformAuthorityResponseDtoToModel - attributes provided preserves length', () => {
        const dto = { uuid: 'auth-1', name: 'authority', attributes: [sampleAttribute] } as any;
        const result = transformAuthorityResponseDtoToModel(dto);
        expect(result.attributes).toHaveLength(1);
    });

    test('transformAuthorityResponseDtoToModel - customAttributes missing is undefined', () => {
        const dto = { uuid: 'auth-1', name: 'authority', customAttributes: undefined } as any;
        const result = transformAuthorityResponseDtoToModel(dto);
        expect(result.customAttributes).toBeUndefined();
    });

    test('transformAuthorityRequestModelToDto maps attributes and optional customAttributes', () => {
        const model = {
            uuid: 'auth-1',
            name: 'authority',
            attributes: [sampleAttribute],
            customAttributes: undefined,
        } as any;
        const result = transformAuthorityRequestModelToDto(model);
        expect(result.attributes).toHaveLength(1);
        expect(result.customAttributes).toBeUndefined();
    });

    test('transformAuthorityUpdateRequestModelToDto maps attributes and optional customAttributes', () => {
        const model = {
            uuid: 'auth-1',
            name: 'authority',
            attributes: [sampleAttribute],
            customAttributes: undefined,
        } as any;
        const result = transformAuthorityUpdateRequestModelToDto(model);
        expect(result.attributes).toHaveLength(1);
        expect(result.customAttributes).toBeUndefined();
    });
});
