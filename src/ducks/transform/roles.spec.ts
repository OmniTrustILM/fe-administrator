import { describe, expect, test } from 'vitest';
import {
    transformObjectPermissionsResponseDtoToModel,
    transformResourcePermissionsResponseDtoToModel,
    transformRoleDetailDtoToModel,
    transformRoleRequestModelToDto,
    transformSubjectPermissionsDtoToModel,
} from './roles';

const attrItem = { uuid: 'a1', name: 'attr', label: 'Attr', type: 'STRING', contentType: 'STRING', version: 'V2', content: [] } as any;

describe('roles transforms', () => {
    test('transformObjectPermissionsResponseDtoToModel copies fields', () => {
        const dto = { uuid: 'obj-1', name: 'object', allow: ['GET'], deny: [] } as any;
        const result = transformObjectPermissionsResponseDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformResourcePermissionsResponseDtoToModel maps objects array with 1 item', () => {
        const dto = {
            name: 'certificates',
            allowAllActions: false,
            actions: [],
            objects: [{ uuid: 'obj-1', name: 'object', allow: ['GET'], deny: [] }],
        } as any;
        const result = transformResourcePermissionsResponseDtoToModel(dto);
        expect(result.objects).toHaveLength(1);
        expect(result.name).toBe('certificates');
    });

    test('transformSubjectPermissionsDtoToModel maps resources array with 1 item containing empty objects', () => {
        const dto = {
            resources: [
                {
                    name: 'certificates',
                    allowAllActions: false,
                    actions: [],
                    objects: [],
                },
            ],
        } as any;
        const result = transformSubjectPermissionsDtoToModel(dto);
        expect(result.resources).toHaveLength(1);
        expect(result.resources[0].objects).toEqual([]);
    });

    test('transformRoleDetailDtoToModel maps users and returns undefined for absent customAttributes', () => {
        const dto = {
            uuid: 'role-1',
            name: 'admin',
            users: [{ uuid: 'user-1', username: 'alice' }],
        } as any;
        const result = transformRoleDetailDtoToModel(dto);
        expect(result.users).toHaveLength(1);
        expect(result.customAttributes).toBeUndefined();
    });

    test('transformRoleDetailDtoToModel maps customAttributes when present', () => {
        const dto = {
            uuid: 'role-1',
            name: 'admin',
            users: [],
            customAttributes: [attrItem],
        } as any;
        const result = transformRoleDetailDtoToModel(dto);
        expect(result.customAttributes).toHaveLength(1);
    });

    test('transformRoleRequestModelToDto returns undefined for absent customAttributes', () => {
        const model = { name: 'editor', description: 'An editor role' } as any;
        const result = transformRoleRequestModelToDto(model);
        expect(result.customAttributes).toBeUndefined();
        expect(result.name).toBe('editor');
    });

    test('transformRoleRequestModelToDto maps customAttributes when present', () => {
        const model = { name: 'editor', customAttributes: [attrItem] } as any;
        const result = transformRoleRequestModelToDto(model);
        expect(result.customAttributes).toHaveLength(1);
    });
});
