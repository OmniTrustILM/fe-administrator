import { describe, expect, test } from 'vitest';
import {
    transformNotificationProfileDetailDtoToModel,
    transformNotificationProfileDtoToModel,
    transformNotificationProfileRequestModelToDto,
    transformNotificationProfileUpdateRequestDtoToModel,
} from './notification-profiles';

describe('notification-profiles transforms', () => {
    test('transformNotificationProfileDtoToModel copies fields', () => {
        const dto = { uuid: 'id-1', name: 'profile-1', description: 'test profile' } as any;
        const result = transformNotificationProfileDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformNotificationProfileRequestModelToDto copies fields', () => {
        const dto = { name: 'profile-2', notificationInstanceUuid: 'inst-1' } as any;
        const result = transformNotificationProfileRequestModelToDto(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformNotificationProfileDetailDtoToModel copies fields', () => {
        const dto = { uuid: 'id-3', name: 'profile-3', notificationInstanceName: 'instance-1' } as any;
        const result = transformNotificationProfileDetailDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });

    test('transformNotificationProfileUpdateRequestDtoToModel copies fields', () => {
        const dto = { description: 'updated description', notificationInstanceUuid: 'inst-2' } as any;
        const result = transformNotificationProfileUpdateRequestDtoToModel(dto);
        expect(result).toEqual(dto);
        expect(result).not.toBe(dto);
    });
});
