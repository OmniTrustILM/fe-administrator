import { describe, expect, test } from 'vitest';
import { transformCertificateGroupRequestModelToDto, transformCertificateGroupResponseDtoToModel } from './certificateGroups';

describe('certificateGroups transforms', () => {
    test('transformCertificateGroupRequestModelToDto result customAttributes is undefined when not provided', () => {
        const group = { uuid: 'group-1', name: 'Test Group' } as any;
        const result = transformCertificateGroupRequestModelToDto(group);
        expect(result.customAttributes).toBeUndefined();
    });

    test('transformCertificateGroupRequestModelToDto maps customAttributes when present', () => {
        const attr = { uuid: 'a', name: 'n', label: 'l', type: 'STRING', contentType: 'STRING', version: 'V2', content: [] } as any;
        const group = { uuid: 'group-1', name: 'Test Group', customAttributes: [attr] } as any;
        const result = transformCertificateGroupRequestModelToDto(group);
        expect(result.customAttributes).toHaveLength(1);
    });

    test('transformCertificateGroupResponseDtoToModel result customAttributes is undefined when not provided', () => {
        const group = { uuid: 'group-2', name: 'Response Group' } as any;
        const result = transformCertificateGroupResponseDtoToModel(group);
        expect(result.customAttributes).toBeUndefined();
    });

    test('transformCertificateGroupResponseDtoToModel maps customAttributes when present', () => {
        const attr = { uuid: 'a', name: 'n', label: 'l', type: 'STRING', contentType: 'STRING', version: 'V2', content: [] } as any;
        const group = { uuid: 'group-2', name: 'Response Group', customAttributes: [attr] } as any;
        const result = transformCertificateGroupResponseDtoToModel(group);
        expect(result.customAttributes).toHaveLength(1);
    });
});
