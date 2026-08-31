import Button from 'components/Button';
import Dialog from 'components/Dialog';
import Widget from 'components/Widget';
import { actions, panelKey, selectors, THREADS_PAGE_SIZE } from 'ducks/comments';
import { MessagesSquare } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { CommentDto, Resource } from 'types/openapi';
import CommentComposer from './CommentComposer';
import CommentThread from './CommentThread';

type Props = {
    resource: Resource;
    objectUuid: string;
};

type PendingDelete = { comment: CommentDto; parentUuid?: string };

/**
 * Comment threads on one object. The same component serves every commentable resource: the pair (resource, objectUuid)
 * is the whole binding, and nothing here branches on which resource it is.
 */
export default function CommentPanel({ resource, objectUuid }: Readonly<Props>) {
    const dispatch = useDispatch();
    const key = panelKey(resource, objectUuid);
    const threadsSelector = useMemo(() => selectors.threads(key), [key]);
    const threads = useSelector(threadsSelector);
    const busy = useSelector(selectors.busy);

    const [pendingDelete, setPendingDelete] = useState<PendingDelete | undefined>(undefined);

    useEffect(() => {
        dispatch(actions.listThreads({ resource, objectUuid, pageNumber: 1 }));
        return () => {
            dispatch(actions.clearPanel({ resource, objectUuid }));
        };
    }, [dispatch, resource, objectUuid]);

    // Re-reads everything loaded so far as one first page, so a refresh never collapses the list back to one page.
    const reload = useCallback(() => {
        const loaded = threads ? threads.pageNumber * threads.itemsPerPage : 0;
        dispatch(actions.listThreads({ resource, objectUuid, pageNumber: 1, itemsPerPage: Math.max(loaded, THREADS_PAGE_SIZE) }));
    }, [dispatch, resource, objectUuid, threads]);

    const remaining = threads ? Math.max(0, threads.totalItems - threads.comments.length) : 0;

    const onLoadMore = useCallback(() => {
        if (!threads) return;
        dispatch(actions.listThreads({ resource, objectUuid, pageNumber: threads.pageNumber + 1, itemsPerPage: threads.itemsPerPage }));
    }, [dispatch, resource, objectUuid, threads]);

    const onPost = useCallback(
        (body: string) => dispatch(actions.createComment({ resource, objectUuid, body })),
        [dispatch, resource, objectUuid],
    );

    const onDelete = useCallback((comment: CommentDto, parentUuid?: string) => setPendingDelete({ comment, parentUuid }), []);

    const confirmDelete = useCallback(() => {
        if (!pendingDelete) return;
        dispatch(actions.deleteComment({ uuid: pendingDelete.comment.uuid, parentUuid: pendingDelete.parentUuid, resource, objectUuid }));
        setPendingDelete(undefined);
    }, [dispatch, pendingDelete, resource, objectUuid]);

    const roots = threads?.comments ?? [];
    const deletingRootWithReplies = !!pendingDelete && !pendingDelete.parentUuid && (pendingDelete.comment.replyCount ?? 0) > 0;

    return (
        <Widget
            title="Comments"
            titleSize="large"
            widgetLock={threads?.lock}
            busy={!!threads?.isFetching}
            refreshAction={reload}
            dataTestId={`comment-panel-${objectUuid}`}
        >
            <div className="flex flex-col gap-4">
                <CommentComposer
                    onSubmit={onPost}
                    isPosting={!!threads?.isPosting}
                    denied={threads?.postingDenied}
                    placeholder="Write a comment…"
                    submitLabel="Post"
                    dataTestId={`comment-panel-${objectUuid}-composer`}
                />

                {roots.length === 0 && !threads?.isFetching && (
                    <div className="flex flex-col items-center justify-center gap-3 py-4" data-testid={`comment-panel-${objectUuid}-empty`}>
                        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-surface-sunken">
                            <MessagesSquare size={28} strokeWidth={1.5} className="text-content-subtle" />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-medium text-content-muted">No comments yet</span>
                            <span className="text-xs text-content-subtle">Start the conversation about this object</span>
                        </div>
                    </div>
                )}

                {roots.length > 0 && (
                    <div className="flex flex-col gap-3" data-testid={`comment-panel-${objectUuid}-threads`}>
                        {roots.map((root) => (
                            <CommentThread
                                key={root.uuid}
                                resource={resource}
                                objectUuid={objectUuid}
                                root={root}
                                busy={busy}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                )}

                {remaining > 0 && (
                    <Button
                        variant="outline"
                        color="primary"
                        className="self-start !py-1.5 !px-3 text-xs"
                        onClick={onLoadMore}
                        disabled={threads?.isFetching}
                        data-testid={`comment-panel-${objectUuid}-load-more`}
                    >
                        Load more ({remaining} remaining)
                    </Button>
                )}
            </div>

            <Dialog
                isOpen={!!pendingDelete}
                caption="Delete comment"
                body={
                    deletingRootWithReplies
                        ? 'This comment starts a thread. Deleting it also deletes all of its replies. Continue?'
                        : 'Delete this comment? This cannot be undone.'
                }
                toggle={() => setPendingDelete(undefined)}
                dataTestId={`comment-panel-${objectUuid}-delete-dialog`}
                size="md"
                buttons={[
                    { color: 'primary', variant: 'outline', onClick: () => setPendingDelete(undefined), body: 'Cancel' },
                    { color: 'danger', onClick: confirmDelete, body: 'Delete' },
                ]}
            />
        </Widget>
    );
}
