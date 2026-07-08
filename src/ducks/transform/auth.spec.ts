import { describe, expect, test } from 'vitest';
import {
    transformAuthActionDtoToModel,
    transformResourceDtoToModel,
    transformRoleResponseDtoToModel,
    transformUserCertificateDtoToModel,
    transformUserDetailDtoToModel,
    transformUserUpdateRequestModelToDto,
} from './auth';

describe('auth transforms', () => {
    test('transformAuthActionDtoToModel copies fields', () => {
        const dto = { uuid: 'action-1', name: 'read' } as any;
        const result = transformAuthActionDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformResourceDtoToModel maps actions array', () => {
        const dto = {
            uuid: 'resource-1',
            name: 'certificates',
            actions: [
                { uuid: 'a1', name: 'read' },
                { uuid: 'a2', name: 'write' },
            ],
        } as any;
        const result = transformResourceDtoToModel(dto);
        expect(result.actions).toHaveLength(2);
        expect(result.actions[0]).toEqual({ uuid: 'a1', name: 'read' });
    });

    test('transformUserCertificateDtoToModel copies fields', () => {
        const dto = { uuid: 'cert-1', fingerprint: 'abc123' } as any;
        const result = transformUserCertificateDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformRoleResponseDtoToModel copies fields', () => {
        const dto = { uuid: 'role-1', name: 'admin' } as any;
        const result = transformRoleResponseDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformUserDetailDtoToModel without certificate', () => {
        const dto = {
            uuid: 'user-1',
            username: 'alice',
            roles: [{ uuid: 'r1', name: 'admin' }],
        } as any;
        const result = transformUserDetailDtoToModel(dto);
        expect(result.certificate).toBeUndefined();
        expect(result.roles).toHaveLength(1);
        expect(result.roles[0]).toEqual({ uuid: 'r1', name: 'admin' });
    });

    test('transformUserDetailDtoToModel with certificate', () => {
        const certificate = { uuid: 'cert-1', fingerprint: 'abc123' };
        const dto = {
            uuid: 'user-1',
            username: 'alice',
            certificate,
            roles: [{ uuid: 'r1', name: 'admin' }],
        } as any;
        const result = transformUserDetailDtoToModel(dto);
        expect(result.certificate).toBeDefined();
        expect(result.certificate).toEqual(certificate);
    });

    test('transformUserDetailDtoToModel without customAttributes', () => {
        const dto = {
            uuid: 'user-1',
            username: 'alice',
            roles: [{ uuid: 'r1', name: 'admin' }],
            customAttributes: undefined,
        } as any;
        const result = transformUserDetailDtoToModel(dto);
        expect(result.customAttributes).toBeUndefined();
    });

    test('transformUserUpdateRequestModelToDto without customAttributes', () => {
        const model = { uuid: 'user-1', customAttributes: undefined } as any;
        const result = transformUserUpdateRequestModelToDto(model);
        expect(result.customAttributes).toBeUndefined();
    });

    test('transformUserUpdateRequestModelToDto with customAttributes', () => {
        const model = {
            uuid: 'user-1',
            customAttributes: [{ name: 'attr', content: [] }],
        } as any;
        const result = transformUserUpdateRequestModelToDto(model);
        expect(result.customAttributes).toHaveLength(1);
    });

    test('transformUserUpdateRequestModelToDto sends null for a blank email (issue #1800)', () => {
        expect(transformUserUpdateRequestModelToDto({ email: '' } as any).email).toBeNull();
        expect(transformUserUpdateRequestModelToDto({ email: undefined } as any).email).toBeNull();
    });

    test('transformUserUpdateRequestModelToDto keeps a provided email', () => {
        expect(transformUserUpdateRequestModelToDto({ email: 'a@b.com' } as any).email).toBe('a@b.com');
    });
});
