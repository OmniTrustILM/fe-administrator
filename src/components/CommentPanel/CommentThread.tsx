import Button from 'components/Button';
import Pagination from 'components/Pagination';
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

    useEffect(() => {
        if (expanded && !replies) dispatch(actions.listReplies({ rootUuid: uuid, pageNumber: 1 }));
    }, [dispatch, expanded, replies, uuid]);

    // The reply box stays open until the post has settled, so a 403 has somewhere to land.
    const wasPosting = useRef(false);
    const isPosting = !!replies?.isPosting;
    const postingDenied = replies?.postingDenied;
    useEffect(() => {
        if (wasPosting.current && !isPosting && !postingDenied) setReplying(false);
        wasPosting.current = isPosting;
    }, [isPosting, postingDenied]);

    const onPageChange = useCallback(
        (pageNumber: number) => dispatch(actions.listReplies({ rootUuid: uuid, pageNumber })),
        [dispatch, uuid],
    );

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
                    setExpanded(true);
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
                            onClick={() => setExpanded((value) => !value)}
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
                            {replies && replies.totalPages > 1 && (
                                <Pagination
                                    page={replies.pageNumber}
                                    totalPages={replies.totalPages}
                                    onPageChange={onPageChange}
                                    disabled={replies.isFetching}
                                    dataTestId={`thread-${uuid}-replies-pagination`}
                                />
                            )}
                            <Spinner active={!!replies?.isFetching} />
                        </div>
                    )}

                    {replying && (
                        <CommentComposer
                            onSubmit={onReplySubmit}
                            onCancel={() => setReplying(false)}
                            isPosting={isPosting}
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
