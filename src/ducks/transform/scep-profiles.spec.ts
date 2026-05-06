import { describe, expect, test } from 'vitest';
import {
    transformScepProfileAddRequestModelToDto,
    transformScepProfileEditRequestModelToDto,
    transformScepProfileListResponseDtoToModel,
    transformScepProfileResponseDtoToModel,
} from './scep-profiles';

const attrItem = { uuid: 'a1', name: 'attr', label: 'Attr', type: 'STRING', contentType: 'STRING', version: 'V2', content: [] } as any;

describe('scep-profiles transforms', () => {
    test('transformScepProfileListResponseDtoToModel copies fields', () => {
        const dto = { uuid: 'scep-1', name: 'scep-profile', enabled: true } as any;
        const result = transformScepProfileListResponseDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformScepProfileResponseDtoToModel with absent optional fields returns undefined for each', () => {
        const dto = { uuid: 'scep-1', name: 'scep-profile' } as any;
        const result = transformScepProfileResponseDtoToModel(dto);
        expect(result.raProfile).toBeUndefined();
        expect(result.issueCertificateAttributes).toBeUndefined();
        expect(result.caCertificate).toBeUndefined();
        expect(result.customAttributes).toBeUndefined();
    });

    test('transformScepProfileResponseDtoToModel with raProfile and caCertificate present includes them', () => {
        const dto = {
            uuid: 'scep-1',
            name: 'scep-profile',
            raProfile: { uuid: 'rp-1', name: 'ra-profile' },
            issueCertificateAttributes: [attrItem],
            caCertificate: { uuid: 'cert-1', fingerprint: 'abc' },
        } as any;
        const result = transformScepProfileResponseDtoToModel(dto);
        expect(result.raProfile).toBeDefined();
        expect(result.issueCertificateAttributes).toHaveLength(1);
        expect(result.caCertificate).toBeDefined();
    });

    test('transformScepProfileEditRequestModelToDto maps issueCertificateAttributes and returns undefined for absent customAttributes', () => {
        const model = { name: 'scep-profile', issueCertificateAttributes: [attrItem] } as any;
        const result = transformScepProfileEditRequestModelToDto(model);
        expect(result.issueCertificateAttributes).toHaveLength(1);
        expect(result.customAttributes).toBeUndefined();
    });

    test('transformScepProfileAddRequestModelToDto maps both attribute arrays when customAttributes present', () => {
        const model = {
            name: 'scep-profile',
            issueCertificateAttributes: [attrItem],
            customAttributes: [attrItem],
        } as any;
        const result = transformScepProfileAddRequestModelToDto(model);
        expect(result.issueCertificateAttributes).toHaveLength(1);
        expect(result.customAttributes).toHaveLength(1);
    });
});
