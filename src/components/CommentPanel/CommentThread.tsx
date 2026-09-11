import Button from 'components/Button';
import Spinner from 'components/Spinner';
import { actions, loadedBefore, loadedWindow, remainingAfter, selectors } from 'ducks/comments';
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
    /** The comment a notification led to, when it is this root or one of its replies. */
    highlightUuid?: string;
    /** Set when a notification led to a reply in this thread: the panel has already asked for the anchored replies. */
    anchored?: boolean;
};

const replyLabel = (count: number) => (count === 1 ? '1 reply' : `${count} replies`);

export default function CommentThread({ resource, objectUuid, root, busy, onDelete, highlightUuid, anchored = false }: Readonly<Props>) {
    const dispatch = useDispatch();
    const repliesSelector = useMemo(() => selectors.replies(root.uuid), [root.uuid]);
    const replies = useSelector(repliesSelector);

    const [expanded, setExpanded] = useState(anchored);
    const [replying, setReplying] = useState(false);

    useEffect(() => {
        if (anchored) setExpanded(true);
    }, [anchored]);

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

    // An anchored load lands on the page holding the reply, so there may be replies before the list as well as after.
    const earlier = replies ? loadedBefore(replies) : 0;
    const remaining = replies ? remainingAfter(replies) : 0;

    // Everything up to the page shown is re-read as one first page, the same window a refresh uses.
    const onLoadEarlier = useCallback(() => {
        if (!replies) return;
        dispatch(actions.listReplies({ rootUuid: uuid, pageNumber: 1, itemsPerPage: loadedWindow(replies) }));
    }, [dispatch, uuid, replies]);

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
                highlighted={highlightUuid === uuid}
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
                            {earlier > 0 && (
                                <Button
                                    variant="outline"
                                    color="primary"
                                    className="self-start !py-1.5 !px-3 text-xs"
                                    onClick={onLoadEarlier}
                                    disabled={replies?.isFetching}
                                    data-testid={`thread-${uuid}-load-earlier`}
                                >
                                    Show earlier replies ({earlier})
                                </Button>
                            )}
                            {replies?.comments.map((reply) => (
                                <CommentItem
                                    key={reply.uuid}
                                    comment={reply}
                                    isRoot={false}
                                    busy={!!busy[reply.uuid]}
                                    highlighted={highlightUuid === reply.uuid}
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
