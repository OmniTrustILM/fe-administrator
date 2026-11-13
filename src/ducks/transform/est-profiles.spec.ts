import { describe, expect, test } from 'vitest';
import {
    transformEstProfileDetailDtoToModel,
    transformEstProfileDtoToModel,
    transformEstProfileEditRequestModelToDto,
    transformEstProfileRequestModelToDto,
} from './est-profiles';

describe('est-profiles transforms', () => {
    test('transformEstProfileDtoToModel copies fields', () => {
        const dto = { uuid: 'est-1', name: 'Test EST' } as any;
        const result = transformEstProfileDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformEstProfileDetailDtoToModel all optional fields remain undefined when absent', () => {
        const dto = { uuid: 'est-1', name: 'Detail EST' } as any;
        const result = transformEstProfileDetailDtoToModel(dto);
        expect(result.issueCertificateAttributes).toBeUndefined();
        expect(result.keyRecoveryKeyAttributes).toBeUndefined();
        expect(result.customAttributes).toBeUndefined();
    });

    test('transformEstProfileDetailDtoToModel maps issueCertificateAttributes when present', () => {
        const attr = { uuid: 'a1', name: 'attr', label: 'Attr', type: 'STRING', contentType: 'STRING', version: 'V2', content: [] } as any;
        const dto = { uuid: 'est-1', name: 'Detail EST', issueCertificateAttributes: [attr] } as any;
        const result = transformEstProfileDetailDtoToModel(dto);
        expect(result.issueCertificateAttributes).toHaveLength(1);
    });

    test('transformEstProfileEditRequestModelToDto all optional fields remain undefined when absent', () => {
        const dto = { uuid: 'est-1', name: 'Edit EST' } as any;
        const result = transformEstProfileEditRequestModelToDto(dto);
        expect(result.issueCertificateAttributes).toBeUndefined();
        expect(result.keyRecoveryKeyAttributes).toBeUndefined();
        expect(result.customAttributes).toBeUndefined();
    });

    test('transformEstProfileEditRequestModelToDto maps keyRecoveryKeyAttributes when present', () => {
        const attr = { uuid: 'a1', name: 'attr', label: 'Attr', type: 'STRING', contentType: 'STRING', version: 'V2', content: [] } as any;
        const dto = { uuid: 'est-1', name: 'Edit EST', keyRecoveryKeyAttributes: [attr] } as any;
        const result = transformEstProfileEditRequestModelToDto(dto);
        expect(result.keyRecoveryKeyAttributes).toHaveLength(1);
    });

    test('transformEstProfileRequestModelToDto all optional fields remain undefined when absent', () => {
        const dto = { uuid: 'est-1', name: 'Request EST' } as any;
        const result = transformEstProfileRequestModelToDto(dto);
        expect(result.issueCertificateAttributes).toBeUndefined();
        expect(result.keyRecoveryKeyAttributes).toBeUndefined();
        expect(result.customAttributes).toBeUndefined();
    });
});

describe('est-profiles transforms: attributes and passthrough', () => {
    const attr = { uuid: 'a1', name: 'attr', label: 'Attr', type: 'STRING', contentType: 'STRING', version: 'V2', content: [] } as any;

    test('transformEstProfileDetailDtoToModel maps every attribute array', () => {
        const result = transformEstProfileDetailDtoToModel({
            uuid: 'est-1',
            keyRecoveryKeyAttributes: [attr],
            issueCertificateAttributes: [attr],
            customAttributes: [attr],
        } as any);
        expect(result.keyRecoveryKeyAttributes).toHaveLength(1);
        expect(result.issueCertificateAttributes).toHaveLength(1);
        expect(result.customAttributes).toHaveLength(1);
    });

    test('transformEstProfileRequestModelToDto maps every attribute array and keeps other fields', () => {
        const result = transformEstProfileRequestModelToDto({
            name: 'Request EST',
            keyRecoveryKeyAttributes: [attr],
            issueCertificateAttributes: [attr],
            customAttributes: [attr],
        } as any);
        expect(result.name).toBe('Request EST');
        expect(result.keyRecoveryKeyAttributes).toHaveLength(1);
        expect(result.issueCertificateAttributes).toHaveLength(1);
        expect(result.customAttributes).toHaveLength(1);
    });
});
