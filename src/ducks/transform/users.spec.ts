import { describe, expect, test } from 'vitest';
import { transformUserAddRequestModelToDto, transformUserResponseDtoToModel } from './users';

describe('users transforms', () => {
    test('transformUserResponseDtoToModel copies fields', () => {
        const dto = { uuid: 'user-1', username: 'alice' } as any;
        const result = transformUserResponseDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformUserAddRequestModelToDto with undefined customAttributes', () => {
        const model = { username: 'alice', customAttributes: undefined } as any;
        const result = transformUserAddRequestModelToDto(model);
        expect(result.customAttributes).toBeUndefined();
    });

    test('transformUserAddRequestModelToDto with populated customAttributes', () => {
        const model = {
            username: 'alice',
            customAttributes: [{ name: 'attr', content: [] }],
        } as any;
        const result = transformUserAddRequestModelToDto(model);
        expect(result.customAttributes).toHaveLength(1);
        expect(result.customAttributes![0]).toEqual({ name: 'attr', content: [] });
    });
});
