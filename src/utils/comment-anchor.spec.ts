import { describe, expect, test } from 'vitest';
import { type NotificationDto, Resource } from 'types/openapi';
import { commentAnchor, notificationTargetPath } from './comment-anchor';

const notification = (overrides: Partial<NotificationDto> = {}): NotificationDto => ({
    uuid: 'n1',
    message: 'm',
    sentAt: '2026-09-01T10:00:00Z',
    targetObjectType: Resource.Certificates,
    targetObjectIdentification: ['cert-1'],
    ...overrides,
});

describe('notificationTargetPath', () => {
    test('a notification without a target leads nowhere', () => {
        expect(notificationTargetPath(notification({ targetObjectType: undefined }))).toBeUndefined();
        expect(notificationTargetPath(notification({ targetObjectIdentification: [] }))).toBeUndefined();
    });

    test('a plain notification leads to the host object detail', () => {
        expect(notificationTargetPath(notification())).toBe('/certificates/detail/cert-1');
        expect(
            notificationTargetPath(notification({ targetObjectType: Resource.RaProfiles, targetObjectIdentification: ['a', 'r'] })),
        ).toBe('/raProfiles/detail/a/r');
    });

    test('a new root comment leads to the comments tab anchored on that root', () => {
        const path = notificationTargetPath(notification({ subjectObjectType: Resource.Comments, subjectObjectIdentification: 'root-1' }));
        expect(path).toBe('/certificates/detail/cert-1?tab=comments&comment=root-1');
    });

    test('a reply carries its thread root as well', () => {
        const path = notificationTargetPath(
            notification({
                subjectObjectType: Resource.Comments,
                subjectObjectIdentification: 'reply-1',
                subjectParentIdentification: 'root-1',
            }),
        );
        expect(path).toBe('/certificates/detail/cert-1?tab=comments&comment=reply-1&thread=root-1');
    });

    test('a subject of another type does not anchor the panel', () => {
        expect(notificationTargetPath(notification({ subjectObjectType: Resource.Keys, subjectObjectIdentification: 'k' }))).toBe(
            '/certificates/detail/cert-1',
        );
    });
});

describe('commentAnchor', () => {
    test('reads back what the notification path carries', () => {
        expect(commentAnchor(null, null)).toBeUndefined();
        expect(commentAnchor(null, 'root-1')).toBeUndefined();
        expect(commentAnchor('root-1', null)).toEqual({ rootUuid: 'root-1' });
        expect(commentAnchor('reply-1', 'root-1')).toEqual({ rootUuid: 'root-1', replyUuid: 'reply-1' });
    });
});
