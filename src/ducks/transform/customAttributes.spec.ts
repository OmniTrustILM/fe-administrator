import { describe, expect, test } from 'vitest';
import {
    transformCustomAttributeCreateRequestModelToDto,
    transformCustomAttributeDetailResponseDtoToModel,
    transformCustomAttributeResponseDtoToModel,
    transformCustomAttributeUpdateRequestModelToDto,
} from './customAttributes';

const content = [{ reference: 'ref-1', data: 'hello' }] as any;

describe('transformCustomAttributeResponseDtoToModel', () => {
    test('returns a spread of the input', () => {
        const input = { uuid: 'ca1', name: 'myAttr', enabled: true } as any;
        const result = transformCustomAttributeResponseDtoToModel(input);
        expect(result).toEqual(input);
    });
});

describe('transformCustomAttributeDetailResponseDtoToModel', () => {
    test('sets content to undefined when content is absent', () => {
        const input = { uuid: 'ca2', name: 'myAttr' } as any;
        const result = transformCustomAttributeDetailResponseDtoToModel(input);
        expect(result.content).toBeUndefined();
    });

    test('deep clones content when present', () => {
        const input = { uuid: 'ca3', name: 'myAttr', content } as any;
        const result = transformCustomAttributeDetailResponseDtoToModel(input);
        expect(result.content).toEqual(input.content);
        expect(result.content).not.toBe(input.content);
    });
});

describe('transformCustomAttributeCreateRequestModelToDto', () => {
    test('deep clones content when defined', () => {
        const input = { name: 'myAttr', description: 'desc', type: 'CUSTOM', contentType: 'STRING', content } as any;
        const result = transformCustomAttributeCreateRequestModelToDto(input);
        expect(result.content).toEqual(input.content);
        expect(result.content).not.toBe(input.content);
    });
});

describe('transformCustomAttributeUpdateRequestModelToDto', () => {
    test('sets content to undefined when content is absent', () => {
        const input = { description: 'desc' } as any;
        const result = transformCustomAttributeUpdateRequestModelToDto(input);
        expect(result.content).toBeUndefined();
    });
});
