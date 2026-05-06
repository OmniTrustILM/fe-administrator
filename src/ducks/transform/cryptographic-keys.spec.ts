import { describe, expect, test } from 'vitest';
import {
    transformCryptographicKeyBulkCompromiseModelToDto,
    transformCryptographicKeyBulkKeyUsageRequestModelToDto,
    transformCryptographicKeyAddRequestModelToDto,
    transformCryptographicKeyCompromiseModelToDto,
    transformCryptographicKeyDetailResponseDtoToModel,
    transformCryptographicKeyEditRequestModelToDto,
    transformCryptographicKeyItemBulkCompromiseModelToDto,
    transformCryptographicKeyItemDtoToModel,
    transformCryptographicKeyItemEditRequestModelToDto,
    transformCryptographicKeyItemResponseDtoToModel,
    transformCryptographicKeyKeyUsageRequestModelToDto,
    transformCryptographicKeyPairResponseDtoToModel,
    transformCryptographicKeyResponseDtoToModel,
    transformKeyHistoryDtoToModel,
} from './cryptographic-keys';

const attrItem = { uuid: 'a1', name: 'attr', label: 'Attr', type: 'STRING', contentType: 'STRING', version: 'V2', content: [] } as any;

describe('transformCryptographicKeyResponseDtoToModel', () => {
    test('returns a spread copy that is not the same reference', () => {
        const dto = { uuid: 'k1', name: 'key' } as any;
        const result = transformCryptographicKeyResponseDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});

describe('transformCryptographicKeyPairResponseDtoToModel', () => {
    test('returns a spread copy that is not the same reference', () => {
        const dto = { uuid: 'kp1', name: 'keypair' } as any;
        const result = transformCryptographicKeyPairResponseDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});

describe('transformCryptographicKeyDetailResponseDtoToModel', () => {
    test('maps items and leaves attributes and customAttributes undefined when absent', () => {
        const dto = { uuid: 'kd1', items: [{ uuid: 'item-1' }] } as any;
        const result = transformCryptographicKeyDetailResponseDtoToModel(dto);
        expect(result.items).toHaveLength(1);
        expect(result.attributes).toBeUndefined();
        expect(result.customAttributes).toBeUndefined();
    });

    test('maps attributes when present', () => {
        const dto = { uuid: 'kd2', items: [], attributes: [attrItem] } as any;
        const result = transformCryptographicKeyDetailResponseDtoToModel(dto);
        expect(result.attributes).toHaveLength(1);
    });
});

describe('transformCryptographicKeyItemResponseDtoToModel', () => {
    test('returns a spread copy that is not the same reference', () => {
        const dto = { uuid: 'ki1', type: 'PRIVATE_KEY' } as any;
        const result = transformCryptographicKeyItemResponseDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});

describe('transformCryptographicKeyItemDtoToModel', () => {
    test('returns a spread copy that is not the same reference', () => {
        const dto = { uuid: 'kid1', name: 'item' } as any;
        const result = transformCryptographicKeyItemDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});

describe('transformCryptographicKeyAddRequestModelToDto', () => {
    test('maps attributes and leaves customAttributes undefined when absent', () => {
        const input = { name: 'newkey', attributes: [attrItem] } as any;
        const result = transformCryptographicKeyAddRequestModelToDto(input);
        expect(result.attributes).toHaveLength(1);
        expect(result.customAttributes).toBeUndefined();
    });
});

describe('transformCryptographicKeyEditRequestModelToDto', () => {
    test('leaves customAttributes undefined when absent', () => {
        const input = { name: 'editkey' } as any;
        const result = transformCryptographicKeyEditRequestModelToDto(input);
        expect(result.customAttributes).toBeUndefined();
    });

    test('maps customAttributes when present', () => {
        const input = { name: 'editkey', customAttributes: [attrItem] } as any;
        const result = transformCryptographicKeyEditRequestModelToDto(input);
        expect(result.customAttributes).toHaveLength(1);
    });
});

describe('transformCryptographicKeyItemEditRequestModelToDto', () => {
    test('returns a spread copy that is not the same reference', () => {
        const dto = { uuid: 'kie1', name: 'item-edit' } as any;
        const result = transformCryptographicKeyItemEditRequestModelToDto(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});

describe('transformCryptographicKeyKeyUsageRequestModelToDto', () => {
    test('returns a spread copy that is not the same reference', () => {
        const dto = { usage: ['SIGN'] } as any;
        const result = transformCryptographicKeyKeyUsageRequestModelToDto(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});

describe('transformCryptographicKeyBulkKeyUsageRequestModelToDto', () => {
    test('returns a spread copy that is not the same reference', () => {
        const dto = { uuids: ['k1', 'k2'], usage: ['DECRYPT'] } as any;
        const result = transformCryptographicKeyBulkKeyUsageRequestModelToDto(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});

describe('transformCryptographicKeyCompromiseModelToDto', () => {
    test('returns a spread copy that is not the same reference', () => {
        const dto = { reason: 'KEY_COMPROMISE' } as any;
        const result = transformCryptographicKeyCompromiseModelToDto(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});

describe('transformCryptographicKeyBulkCompromiseModelToDto', () => {
    test('returns a spread copy that is not the same reference', () => {
        const dto = { uuids: ['k1'], reason: 'CA_COMPROMISE' } as any;
        const result = transformCryptographicKeyBulkCompromiseModelToDto(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});

describe('transformCryptographicKeyItemBulkCompromiseModelToDto', () => {
    test('returns a spread copy that is not the same reference', () => {
        const dto = { uuids: ['ki1'], reason: 'AFFILIATION_CHANGED' } as any;
        const result = transformCryptographicKeyItemBulkCompromiseModelToDto(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});

describe('transformKeyHistoryDtoToModel', () => {
    test('returns a spread copy that is not the same reference', () => {
        const dto = { uuid: 'h1', created: '2024-01-01' } as any;
        const result = transformKeyHistoryDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});
