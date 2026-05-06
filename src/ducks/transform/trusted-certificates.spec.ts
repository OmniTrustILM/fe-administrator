import { describe, expect, test } from 'vitest';
import { transformTrustedCertificateRequestModelToDto, transformTrustedCertificateResponseDtoToModel } from './trusted-certificates';

describe('trusted-certificates transforms', () => {
    test('transformTrustedCertificateResponseDtoToModel copies fields', () => {
        const dto = { uuid: 'id-1', commonName: 'Test CA', state: 'VALID' } as any;
        const result = transformTrustedCertificateResponseDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformTrustedCertificateRequestModelToDto copies fields', () => {
        const dto = { certificate: 'base64cert==', customAttributes: [] } as any;
        const result = transformTrustedCertificateRequestModelToDto(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});
