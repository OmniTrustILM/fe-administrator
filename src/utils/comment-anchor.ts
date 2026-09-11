import { type NotificationDto, Resource } from 'types/openapi';

/** Query parameters a comment notification hands to the host object page; the comment panel reads them when it binds. */
export const COMMENT_PARAM = 'comment';
export const THREAD_PARAM = 'thread';

/** Every host page that keeps the panel on a tab drives that tab from this parameter, and the tab slug is its title. */
const TAB_PARAM = 'tab';
const COMMENTS_TAB = 'comments';

export type CommentAnchor = {
    /** The thread root the roots listing is anchored on. */
    rootUuid: string;
    /** Set when the comment is a reply: the replies listing is anchored on it, in parallel with the roots. */
    replyUuid?: string;
};

export const commentAnchor = (comment: string | null, thread: string | null): CommentAnchor | undefined => {
    if (!comment) return undefined;
    return thread ? { rootUuid: thread, replyUuid: comment } : { rootUuid: comment };
};

/**
 * Where a notification leads: its host object, and for a comment notification the comment itself. The subject of a
 * comment notification is the comment; its parent, when present, is the thread root the comment replies to.
 */
export const notificationTargetPath = (notification: NotificationDto): string | undefined => {
    const { targetObjectType, targetObjectIdentification } = notification;
    if (!targetObjectType || !targetObjectIdentification?.length) return undefined;
    const path = `/${targetObjectType}/detail/${targetObjectIdentification.join('/')}`;
    if (notification.subjectObjectType !== Resource.Comments || !notification.subjectObjectIdentification) return path;
    const params = new URLSearchParams({ [TAB_PARAM]: COMMENTS_TAB, [COMMENT_PARAM]: notification.subjectObjectIdentification });
    if (notification.subjectParentIdentification) params.set(THREAD_PARAM, notification.subjectParentIdentification);
    return `${path}?${params}`;
};
