import { describe, expect, test } from 'vitest';
import {
    transformCmpProfileDetailDtoToModel,
    transformCmpProfileDtoToModel,
    transformCmpProfileEditRequestModelToDto,
    transformCmpProfileRequestModelToDto,
} from './cmp-profiles';

describe('cmp-profiles transforms', () => {
    test('transformCmpProfileDtoToModel copies fields', () => {
        const dto = { uuid: 'cmp-1', name: 'Test CMP' } as any;
        const result = transformCmpProfileDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformCmpProfileDetailDtoToModel all optional fields remain undefined when absent', () => {
        const dto = { uuid: 'cmp-1', name: 'Detail CMP' } as any;
        const result = transformCmpProfileDetailDtoToModel(dto);
        expect(result.issueCertificateAttributes).toBeUndefined();
        expect(result.revokeCertificateAttributes).toBeUndefined();
        expect(result.customAttributes).toBeUndefined();
    });

    test('transformCmpProfileDetailDtoToModel maps issueCertificateAttributes when present', () => {
        const attr = { uuid: 'a1', name: 'attr', label: 'Attr', type: 'STRING', contentType: 'STRING', version: 'V2', content: [] } as any;
        const dto = { uuid: 'cmp-1', name: 'Detail CMP', issueCertificateAttributes: [attr] } as any;
        const result = transformCmpProfileDetailDtoToModel(dto);
        expect(result.issueCertificateAttributes).toHaveLength(1);
    });

    test('transformCmpProfileEditRequestModelToDto all optional fields remain undefined when absent', () => {
        const dto = { uuid: 'cmp-1', name: 'Edit CMP' } as any;
        const result = transformCmpProfileEditRequestModelToDto(dto);
        expect(result.issueCertificateAttributes).toBeUndefined();
        expect(result.revokeCertificateAttributes).toBeUndefined();
        expect(result.customAttributes).toBeUndefined();
    });

    test('transformCmpProfileEditRequestModelToDto maps revokeCertificateAttributes when present', () => {
        const attr = { uuid: 'a1', name: 'attr', label: 'Attr', type: 'STRING', contentType: 'STRING', version: 'V2', content: [] } as any;
        const dto = { uuid: 'cmp-1', name: 'Edit CMP', revokeCertificateAttributes: [attr] } as any;
        const result = transformCmpProfileEditRequestModelToDto(dto);
        expect(result.revokeCertificateAttributes).toHaveLength(1);
    });

    test('transformCmpProfileRequestModelToDto all optional fields remain undefined when absent', () => {
        const dto = { uuid: 'cmp-1', name: 'Request CMP' } as any;
        const result = transformCmpProfileRequestModelToDto(dto);
        expect(result.issueCertificateAttributes).toBeUndefined();
        expect(result.revokeCertificateAttributes).toBeUndefined();
        expect(result.customAttributes).toBeUndefined();
    });
});
