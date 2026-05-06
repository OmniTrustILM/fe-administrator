import { describe, expect, test } from 'vitest';
import {
    transformTokenProfileAddRequestModelToDto,
    transformTokenProfileBulkKeyUsageRequestModelToDto,
    transformTokenProfileDetailResponseDtoToModel,
    transformTokenProfileEditRequestModelToDto,
    transformTokenProfileKeyUsageRequestModelToDto,
    transformTokenProfileResponseDtoToModel,
} from './token-profiles';

const attrItem = { uuid: 'a1', name: 'attr', label: 'Attr', type: 'STRING', contentType: 'STRING', version: 'V2', content: [] } as any;

describe('transformTokenProfileResponseDtoToModel', () => {
    test('returns a spread copy that is not the same reference', () => {
        const dto = { uuid: 'tp1', name: 'token-profile' } as any;
        const result = transformTokenProfileResponseDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});

describe('transformTokenProfileDetailResponseDtoToModel', () => {
    test('maps attributes and leaves customAttributes undefined when absent', () => {
        const dto = { uuid: 'tpd1', attributes: [attrItem] } as any;
        const result = transformTokenProfileDetailResponseDtoToModel(dto);
        expect(result.attributes).toHaveLength(1);
        expect(result.customAttributes).toBeUndefined();
    });

    test('maps customAttributes when present', () => {
        const dto = { uuid: 'tpd2', attributes: [], customAttributes: [attrItem] } as any;
        const result = transformTokenProfileDetailResponseDtoToModel(dto);
        expect(result.customAttributes).toHaveLength(1);
    });
});

describe('transformTokenProfileAddRequestModelToDto', () => {
    test('maps attributes and leaves customAttributes undefined when absent', () => {
        const input = { name: 'new-profile', attributes: [attrItem] } as any;
        const result = transformTokenProfileAddRequestModelToDto(input);
        expect(result.attributes).toHaveLength(1);
        expect(result.customAttributes).toBeUndefined();
    });
});

describe('transformTokenProfileEditRequestModelToDto', () => {
    test('maps both attributes and customAttributes when present', () => {
        const input = { attributes: [attrItem], customAttributes: [attrItem] } as any;
        const result = transformTokenProfileEditRequestModelToDto(input);
        expect(result.attributes).toHaveLength(1);
        expect(result.customAttributes).toHaveLength(1);
    });
});

describe('transformTokenProfileKeyUsageRequestModelToDto', () => {
    test('returns a spread copy that is not the same reference', () => {
        const dto = { usage: ['SIGN'] } as any;
        const result = transformTokenProfileKeyUsageRequestModelToDto(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});

describe('transformTokenProfileBulkKeyUsageRequestModelToDto', () => {
    test('returns a spread copy that is not the same reference', () => {
        const dto = { uuids: ['tp1', 'tp2'], usage: ['DECRYPT'] } as any;
        const result = transformTokenProfileBulkKeyUsageRequestModelToDto(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});
