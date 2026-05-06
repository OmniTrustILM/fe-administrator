import { describe, expect, test } from 'vitest';
import {
    transformCryptographicKeyRandomDataRequestModelToDto,
    transformCryptographicKeyRandomDataResponseDtoToModel,
    transformCryptographicKeySignDataResponseDtoToModel,
    transformCryptographicKeySignRequestModelToDto,
    transformCryptographicKeyVerifyDataResponseDtoToModel,
    transformCryptographicKeyVerifyRequestModelToDto,
} from './cryptographic-operations';

describe('cryptographic-operations transforms', () => {
    test('transformCryptographicKeySignDataResponseDtoToModel copies fields', () => {
        const dto = { data: 'signed-data', algorithm: 'RSA' } as any;
        const result = transformCryptographicKeySignDataResponseDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformCryptographicKeyVerifyDataResponseDtoToModel copies fields', () => {
        const dto = { verified: true, message: 'ok' } as any;
        const result = transformCryptographicKeyVerifyDataResponseDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformCryptographicKeyRandomDataResponseDtoToModel copies fields', () => {
        const dto = { data: 'random-bytes' } as any;
        const result = transformCryptographicKeyRandomDataResponseDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformCryptographicKeyRandomDataRequestModelToDto copies fields', () => {
        const model = { length: 32 } as any;
        const result = transformCryptographicKeyRandomDataRequestModelToDto(model);
        expect(result).toEqual(model);
        expect(result).not.toBe(model);
    });

    test('transformCryptographicKeySignRequestModelToDto copies fields', () => {
        const model = { data: 'data-to-sign', keyUuid: 'key-1' } as any;
        const result = transformCryptographicKeySignRequestModelToDto(model);
        expect(result).toEqual(model);
        expect(result).not.toBe(model);
    });

    test('transformCryptographicKeyVerifyRequestModelToDto copies fields', () => {
        const model = { data: 'data-to-verify', signature: 'sig-1' } as any;
        const result = transformCryptographicKeyVerifyRequestModelToDto(model);
        expect(result).toEqual(model);
        expect(result).not.toBe(model);
    });
});
