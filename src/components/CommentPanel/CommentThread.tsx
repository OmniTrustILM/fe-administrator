import Button from 'components/Button';
import Spinner from 'components/Spinner';
import { actions, selectors } from 'ducks/comments';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { CommentDto, Resource } from 'types/openapi';
import CommentComposer from './CommentComposer';
import CommentItem from './CommentItem';

type Props = {
    resource: Resource;
    objectUuid: string;
    root: CommentDto;
    busy: Record<string, boolean>;
    onDelete: (comment: CommentDto, parentUuid?: string) => void;
};

const replyLabel = (count: number) => (count === 1 ? '1 reply' : `${count} replies`);

export default function CommentThread({ resource, objectUuid, root, busy, onDelete }: Readonly<Props>) {
    const dispatch = useDispatch();
    const repliesSelector = useMemo(() => selectors.replies(root.uuid), [root.uuid]);
    const replies = useSelector(repliesSelector);

    const [expanded, setExpanded] = useState(false);
    const [replying, setReplying] = useState(false);

    const replyCount = root.replyCount ?? 0;
    const uuid = root.uuid;

    // Loading is tied to the expansion gesture, not an effect on the cache: after a failed load the cache entry
    // exists but is empty, and re-expanding must be able to try again.
    const expand = useCallback(() => {
        setExpanded(true);
        if (!replies || (!replies.isFetching && replies.comments.length === 0)) {
            dispatch(actions.listReplies({ rootUuid: uuid, pageNumber: 1 }));
        }
    }, [dispatch, replies, uuid]);

    // The reply box stays open until the post has committed, so a rejection keeps the draft on screen.
    const isPosting = !!replies?.isPosting;
    const postingDenied = replies?.postingDenied;
    const postSucceeded = !!replies?.postSucceeded;
    const wasSucceeded = useRef(postSucceeded);
    useEffect(() => {
        if (!wasSucceeded.current && postSucceeded) setReplying(false);
        wasSucceeded.current = postSucceeded;
    }, [postSucceeded]);

    const remaining = replies ? Math.max(0, replies.totalItems - replies.comments.length) : 0;

    const onLoadMore = useCallback(() => {
        if (!replies) return;
        dispatch(actions.listReplies({ rootUuid: uuid, pageNumber: replies.pageNumber + 1, itemsPerPage: replies.itemsPerPage }));
    }, [dispatch, uuid, replies]);

    const onReplySubmit = useCallback(
        (body: string) => {
            dispatch(actions.createComment({ resource, objectUuid, body, parentUuid: uuid }));
            setExpanded(true);
        },
        [dispatch, resource, objectUuid, uuid],
    );

    return (
        <div className="flex flex-col gap-2" data-testid={`thread-${uuid}`}>
            <CommentItem
                comment={root}
                isRoot
                busy={!!busy[uuid]}
                onReply={() => {
                    setReplying(true);
                    expand();
                }}
                onResolve={() => dispatch(actions.resolveComment({ uuid, resource, objectUuid }))}
                onUnresolve={() => dispatch(actions.unresolveComment({ uuid, resource, objectUuid }))}
                onDelete={() => onDelete(root)}
            />

            {(replyCount > 0 || replying || expanded) && (
                <div className="ml-6 md:ml-10 flex flex-col gap-2">
                    {replyCount > 0 && (
                        <Button
                            variant="transparent"
                            color="secondary"
                            className="self-start !px-1 !py-0.5 text-xs"
                            onClick={() => (expanded ? setExpanded(false) : expand())}
                            data-testid={`thread-${uuid}-toggle-replies`}
                        >
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {replyLabel(replyCount)}
                        </Button>
                    )}

                    {expanded && (
                        <div className="relative flex flex-col gap-2" data-testid={`thread-${uuid}-replies`}>
                            {replies?.comments.map((reply) => (
                                <CommentItem
                                    key={reply.uuid}
                                    comment={reply}
                                    isRoot={false}
                                    busy={!!busy[reply.uuid]}
                                    onDelete={() => onDelete(reply, uuid)}
                                />
                            ))}
                            {remaining > 0 && (
                                <Button
                                    variant="outline"
                                    color="primary"
                                    className="self-start !py-1.5 !px-3 text-xs"
                                    onClick={onLoadMore}
                                    disabled={replies?.isFetching}
                                    data-testid={`thread-${uuid}-load-more`}
                                >
                                    Load more ({remaining} remaining)
                                </Button>
                            )}
                            <Spinner active={!!replies?.isFetching} />
                        </div>
                    )}

                    {replying && (
                        <CommentComposer
                            onSubmit={onReplySubmit}
                            onCancel={() => setReplying(false)}
                            isPosting={isPosting}
                            postSucceeded={postSucceeded}
                            denied={postingDenied}
                            placeholder="Write a reply…"
                            submitLabel="Reply"
                            dataTestId={`thread-${uuid}-reply-composer`}
                            autoFocus
                        />
                    )}
                </div>
            )}
        </div>
    );
}
