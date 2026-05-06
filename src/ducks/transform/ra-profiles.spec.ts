import { describe, expect, test } from 'vitest';
import {
    transformComplianceProfileSimplifiedDtoToModel,
    transformRaProfileAcmeDetailResponseDtoToModel,
    transformRaProfileActivateAcmeRequestModelToDto,
    transformRaProfileActivateCmpRequestModelToDto,
    transformRaProfileActivateScepRequestModelToDto,
    transformRaProfileAddRequestModelToDto,
    transformRaProfileCertificateValidationSettingsDtoToModel,
    transformRaProfileCertificateValidationSettingsUpdateModelToDto,
    transformRaProfileCmpDetailResponseDtoToModel,
    transformRaProfileEditRequestModelToDto,
    transformRaProfileResponseDtoToModel,
    transformRaProfileScepDetailResponseDtoToModel,
    transformRaProfileSimplifiedDtoToModel,
} from './ra-profiles';

const attrItem = { uuid: 'a1', name: 'attr', label: 'Attr', type: 'STRING', contentType: 'STRING', version: 'V2', content: [] } as any;

describe('ra-profiles transforms', () => {
    test('transformRaProfileSimplifiedDtoToModel copies fields', () => {
        const dto = { uuid: 'rp-1', name: 'profile' } as any;
        const result = transformRaProfileSimplifiedDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformRaProfileCertificateValidationSettingsDtoToModel with undefined input', () => {
        const result = transformRaProfileCertificateValidationSettingsDtoToModel(undefined);
        expect(result.usePlatformSettings).toBe(true);
        expect(result.enabled).toBe(false);
    });

    test('transformRaProfileCertificateValidationSettingsDtoToModel with enabled: true', () => {
        const result = transformRaProfileCertificateValidationSettingsDtoToModel({ enabled: true } as any);
        expect(result.usePlatformSettings).toBe(false);
        expect(result.enabled).toBe(true);
    });

    test('transformRaProfileCertificateValidationSettingsDtoToModel with enabled: false', () => {
        const result = transformRaProfileCertificateValidationSettingsDtoToModel({ enabled: false } as any);
        expect(result.usePlatformSettings).toBe(false);
        expect(result.enabled).toBe(false);
    });

    test('transformRaProfileCertificateValidationSettingsDtoToModel with enabled: undefined', () => {
        const result = transformRaProfileCertificateValidationSettingsDtoToModel({ enabled: undefined } as any);
        expect(result.usePlatformSettings).toBe(true);
        expect(result.enabled).toBe(false);
    });

    test('transformRaProfileCertificateValidationSettingsUpdateModelToDto with usePlatformSettings true sets enabled to undefined', () => {
        const model = { usePlatformSettings: true, enabled: true, frequency: 7, expiringThreshold: 30 } as any;
        const result = transformRaProfileCertificateValidationSettingsUpdateModelToDto(model);
        expect(result.enabled).toBeUndefined();
        expect(result.frequency).toBe(7);
        expect(result.expiringThreshold).toBe(30);
    });

    test('transformRaProfileCertificateValidationSettingsUpdateModelToDto with usePlatformSettings false sets enabled to true', () => {
        const model = { usePlatformSettings: false, enabled: true, frequency: 7, expiringThreshold: 30 } as any;
        const result = transformRaProfileCertificateValidationSettingsUpdateModelToDto(model);
        expect(result.enabled).toBe(true);
        expect(result.frequency).toBe(7);
        expect(result.expiringThreshold).toBe(30);
    });

    test('transformRaProfileResponseDtoToModel with empty attributes returns empty array', () => {
        const dto = { uuid: 'rp-1', attributes: [], customAttributes: undefined, certificateValidationSettings: undefined } as any;
        const result = transformRaProfileResponseDtoToModel(dto);
        expect(result.attributes).toEqual([]);
    });

    test('transformRaProfileResponseDtoToModel with absent attributes returns empty array', () => {
        const dto = { uuid: 'rp-1', customAttributes: undefined, certificateValidationSettings: undefined } as any;
        const result = transformRaProfileResponseDtoToModel(dto);
        expect(result.attributes).toEqual([]);
    });

    test('transformRaProfileResponseDtoToModel with 1 attribute maps it', () => {
        const dto = {
            uuid: 'rp-1',
            attributes: [attrItem],
            customAttributes: undefined,
            certificateValidationSettings: undefined,
        } as any;
        const result = transformRaProfileResponseDtoToModel(dto);
        expect(result.attributes).toHaveLength(1);
    });

    test('transformRaProfileResponseDtoToModel with absent customAttributes returns undefined', () => {
        const dto = { uuid: 'rp-1', attributes: [], certificateValidationSettings: undefined } as any;
        const result = transformRaProfileResponseDtoToModel(dto);
        expect(result.customAttributes).toBeUndefined();
    });

    test('transformRaProfileResponseDtoToModel with customAttributes present maps them', () => {
        const dto = {
            uuid: 'rp-1',
            attributes: [],
            customAttributes: [attrItem],
            certificateValidationSettings: undefined,
        } as any;
        const result = transformRaProfileResponseDtoToModel(dto);
        expect(result.customAttributes).toHaveLength(1);
    });

    test('transformRaProfileActivateAcmeRequestModelToDto maps attribute arrays', () => {
        const model = {
            acmeProfileUuid: 'acme-1',
            issueCertificateAttributes: [attrItem],
            revokeCertificateAttributes: [attrItem],
        } as any;
        const result = transformRaProfileActivateAcmeRequestModelToDto(model);
        expect(result.issueCertificateAttributes).toHaveLength(1);
        expect(result.revokeCertificateAttributes).toHaveLength(1);
    });

    test('transformRaProfileAcmeDetailResponseDtoToModel with absent arrays returns undefined', () => {
        const dto = { acmeProfileUuid: 'acme-1' } as any;
        const result = transformRaProfileAcmeDetailResponseDtoToModel(dto);
        expect(result.issueCertificateAttributes).toBeUndefined();
        expect(result.revokeCertificateAttributes).toBeUndefined();
    });

    test('transformRaProfileAcmeDetailResponseDtoToModel with arrays maps them', () => {
        const dto = {
            acmeProfileUuid: 'acme-1',
            issueCertificateAttributes: [attrItem],
            revokeCertificateAttributes: [attrItem],
        } as any;
        const result = transformRaProfileAcmeDetailResponseDtoToModel(dto);
        expect(result.issueCertificateAttributes).toHaveLength(1);
        expect(result.revokeCertificateAttributes).toHaveLength(1);
    });

    test('transformRaProfileActivateCmpRequestModelToDto maps attribute arrays', () => {
        const model = {
            cmpProfileUuid: 'cmp-1',
            issueCertificateAttributes: [attrItem],
            revokeCertificateAttributes: [attrItem],
        } as any;
        const result = transformRaProfileActivateCmpRequestModelToDto(model);
        expect(result.issueCertificateAttributes).toHaveLength(1);
        expect(result.revokeCertificateAttributes).toHaveLength(1);
    });

    test('transformRaProfileCmpDetailResponseDtoToModel with absent arrays returns undefined', () => {
        const dto = { cmpProfileUuid: 'cmp-1' } as any;
        const result = transformRaProfileCmpDetailResponseDtoToModel(dto);
        expect(result.issueCertificateAttributes).toBeUndefined();
        expect(result.revokeCertificateAttributes).toBeUndefined();
    });

    test('transformRaProfileActivateScepRequestModelToDto maps issueCertificateAttributes', () => {
        const model = { scepProfileUuid: 'scep-1', issueCertificateAttributes: [attrItem] } as any;
        const result = transformRaProfileActivateScepRequestModelToDto(model);
        expect(result.issueCertificateAttributes).toHaveLength(1);
    });

    test('transformRaProfileScepDetailResponseDtoToModel with absent array returns undefined', () => {
        const dto = { scepProfileUuid: 'scep-1' } as any;
        const result = transformRaProfileScepDetailResponseDtoToModel(dto);
        expect(result.issueCertificateAttributes).toBeUndefined();
    });

    test('transformRaProfileAddRequestModelToDto maps attributes and absent customAttributes', () => {
        const model = { name: 'rp', attributes: [attrItem] } as any;
        const result = transformRaProfileAddRequestModelToDto(model);
        expect(result.attributes).toHaveLength(1);
        expect(result.customAttributes).toBeUndefined();
    });

    test('transformRaProfileAddRequestModelToDto maps customAttributes when present', () => {
        const model = { name: 'rp', attributes: [], customAttributes: [attrItem] } as any;
        const result = transformRaProfileAddRequestModelToDto(model);
        expect(result.customAttributes).toHaveLength(1);
    });

    test('transformRaProfileEditRequestModelToDto maps attributes and absent customAttributes', () => {
        const model = { name: 'rp', attributes: [attrItem] } as any;
        const result = transformRaProfileEditRequestModelToDto(model);
        expect(result.attributes).toHaveLength(1);
        expect(result.customAttributes).toBeUndefined();
    });

    test('transformRaProfileEditRequestModelToDto maps customAttributes when present', () => {
        const model = { name: 'rp', attributes: [], customAttributes: [attrItem] } as any;
        const result = transformRaProfileEditRequestModelToDto(model);
        expect(result.customAttributes).toHaveLength(1);
    });

    test('transformComplianceProfileSimplifiedDtoToModel copies fields', () => {
        const dto = { uuid: 'cp-1', name: 'compliance' } as any;
        const result = transformComplianceProfileSimplifiedDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});
