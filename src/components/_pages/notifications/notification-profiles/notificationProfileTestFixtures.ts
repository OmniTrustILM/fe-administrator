import type { NotificationProfileDetailModel } from 'types/notification-profiles';
import { PlatformEnum, RecipientType } from 'types/openapi';

// Identity reducer for building lightweight test stores without real reducer logic.
export const identity =
    <S>(initial: S) =>
    (state: S | undefined): S =>
        state ?? initial;

export const RECIPIENT_TYPE_USER_DESCRIPTION = 'Selected users will receive the notifications.';

// Label-only enum map mirroring the /enums RecipientType payload (no descriptions).
export const recipientTypeEnumLabels: Record<string, { label: string; description?: string }> = {
    [RecipientType.None]: { label: 'None' },
    [RecipientType.Default]: { label: 'Default' },
    [RecipientType.User]: { label: 'User' },
    [RecipientType.Group]: { label: 'Group' },
    [RecipientType.Role]: { label: 'Role' },
    [RecipientType.Owner]: { label: 'Owner' },
    [RecipientType.Object]: { label: 'Object' },
};

export const defaultPlatformEnums = {
    [PlatformEnum.RecipientType]: recipientTypeEnumLabels,
};

// Same enum map but with a description on the User entry, for tooltip tests.
export const recipientTypeEnumWithUserDescription = {
    [PlatformEnum.RecipientType]: {
        ...recipientTypeEnumLabels,
        [RecipientType.User]: { label: 'User', description: RECIPIENT_TYPE_USER_DESCRIPTION },
    },
};

// Minimal notification profile used as a base in detail wrapper/spec tests.
export const defaultNotificationProfileDetail: NotificationProfileDetailModel = {
    uuid: 'np-1',
    name: 'Test Profile',
    description: 'A test notification profile',
    version: 1,
    recipientType: RecipientType.User,
    internalNotification: false,
};
