import { describe, expect, test } from 'vitest';
import {
    transformAcmeProfileAddRequestModelToDto,
    transformAcmeProfileEditRequestModelToDto,
    transformAcmeProfileListResponseDtoToModel,
    transformAcmeProfileResponseDtoToModel,
} from './acme-profiles';

const attrItem = { uuid: 'a1', name: 'attr', label: 'Attr', type: 'STRING', contentType: 'STRING', version: 'V2', content: [] } as any;

describe('acme-profiles transforms', () => {
    test('transformAcmeProfileListResponseDtoToModel copies fields', () => {
        const dto = { uuid: 'acme-1', name: 'acme-profile', enabled: true } as any;
        const result = transformAcmeProfileListResponseDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformAcmeProfileResponseDtoToModel with absent raProfile and all optional attributes returns undefined for each', () => {
        const dto = { uuid: 'acme-1', name: 'acme-profile' } as any;
        const result = transformAcmeProfileResponseDtoToModel(dto);
        expect(result.raProfile).toBeUndefined();
        expect(result.issueCertificateAttributes).toBeUndefined();
        expect(result.revokeCertificateAttributes).toBeUndefined();
        expect(result.customAttributes).toBeUndefined();
    });

    test('transformAcmeProfileResponseDtoToModel with raProfile present and issueCertificateAttributes with 1 item', () => {
        const dto = {
            uuid: 'acme-1',
            name: 'acme-profile',
            raProfile: { uuid: 'rp-1', name: 'ra-profile' },
            issueCertificateAttributes: [attrItem],
        } as any;
        const result = transformAcmeProfileResponseDtoToModel(dto);
        expect(result.raProfile).toBeDefined();
        expect(result.issueCertificateAttributes).toHaveLength(1);
    });

    test('transformAcmeProfileEditRequestModelToDto with empty arrays and absent customAttributes', () => {
        const model = {
            name: 'acme-profile',
            issueCertificateAttributes: [],
            revokeCertificateAttributes: [],
        } as any;
        const result = transformAcmeProfileEditRequestModelToDto(model);
        expect(result.issueCertificateAttributes).toEqual([]);
        expect(result.revokeCertificateAttributes).toEqual([]);
        expect(result.customAttributes).toBeUndefined();
    });

    test('transformAcmeProfileAddRequestModelToDto with 1 item in each attribute array maps both', () => {
        const model = {
            name: 'acme-profile',
            issueCertificateAttributes: [attrItem],
            revokeCertificateAttributes: [attrItem],
            customAttributes: [attrItem],
        } as any;
        const result = transformAcmeProfileAddRequestModelToDto(model);
        expect(result.issueCertificateAttributes).toHaveLength(1);
        expect(result.revokeCertificateAttributes).toHaveLength(1);
        expect(result.customAttributes).toHaveLength(1);
    });
});
