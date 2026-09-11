import Button from 'components/Button';
import Dialog from 'components/Dialog';
import Widget from 'components/Widget';
import { actions, loadedBefore, loadedWindow, panelKey, remainingAfter, selectors } from 'ducks/comments';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, MessagesSquare } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router';
import { type CommentDto, type Resource, SortDirection } from 'types/openapi';
import { COMMENT_PARAM, commentAnchor, THREAD_PARAM } from 'utils/comment-anchor';
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
 *
 * Thread roots are listed in the direction the user picks; replies always read oldest-first, because a thread reads
 * naturally in the order it was written even when the newest threads are on top.
 */
export default function CommentPanel({ resource, objectUuid }: Readonly<Props>) {
    const dispatch = useDispatch();
    const key = panelKey(resource, objectUuid);
    const threadsSelector = useMemo(() => selectors.threads(key), [key]);
    const threads = useSelector(threadsSelector);
    const busy = useSelector(selectors.busy);

    const [pendingDelete, setPendingDelete] = useState<PendingDelete | undefined>(undefined);

    // A notification lands here with the comment it is about in the query. The anchor is read from the two values
    // rather than the params object, so the listing is redone only when the anchored comment changes: on the first
    // bind, and when a notification about another comment on this very object is followed while the page is open.
    const [searchParams] = useSearchParams();
    const commentParam = searchParams.get(COMMENT_PARAM);
    const threadParam = searchParams.get(THREAD_PARAM);
    const anchor = useMemo(() => commentAnchor(commentParam, threadParam), [commentParam, threadParam]);
    const anchoredRepliesSelector = useMemo(() => selectors.replies(anchor?.replyUuid ? anchor.rootUuid : ''), [anchor]);
    const anchoredReplies = useSelector(anchoredRepliesSelector);

    // The panel state lives as long as the binding to the object: a re-anchor on the same object keeps it, so the
    // direction the user picked survives, and the epic reads it for the anchored request below.
    useEffect(() => {
        return () => {
            dispatch(actions.clearPanel({ resource, objectUuid }));
        };
    }, [dispatch, resource, objectUuid]);

    useEffect(() => {
        // The roots page holding the thread and the replies page holding the reply are independent, so both are asked
        // for at once; the reply anchor is what the thread expands onto.
        dispatch(actions.listThreads({ resource, objectUuid, pageNumber: 1, anchorUuid: anchor?.rootUuid }));
        if (anchor?.replyUuid) dispatch(actions.listReplies({ rootUuid: anchor.rootUuid, pageNumber: 1, anchorUuid: anchor.replyUuid }));
    }, [dispatch, resource, objectUuid, anchor]);

    const sortDirection = threads?.sortDirection ?? SortDirection.Asc;
    const newestFirst = sortDirection === SortDirection.Desc;

    // Re-reads the roots loaded so far as one first page, plus the replies of every thread that was opened, so a
    // refresh never collapses the list and picks up replies posted elsewhere.
    const reload = useCallback(() => dispatch(actions.refreshPanel({ resource, objectUuid })), [dispatch, resource, objectUuid]);

    // The other direction is a different list, read from its own first page.
    const onToggleDirection = useCallback(() => {
        const next = newestFirst ? SortDirection.Asc : SortDirection.Desc;
        dispatch(actions.listThreads({ resource, objectUuid, pageNumber: 1, sortDirection: next }));
    }, [dispatch, resource, objectUuid, newestFirst]);

    // An anchored load lands on the page holding the thread, so there may be roots before the list as well as after.
    const earlier = threads ? loadedBefore(threads) : 0;
    const remaining = threads ? remainingAfter(threads) : 0;

    // Everything up to the page shown is re-read as one first page, the same window a refresh uses.
    const onLoadEarlier = useCallback(() => {
        if (!threads) return;
        dispatch(actions.listThreads({ resource, objectUuid, pageNumber: 1, itemsPerPage: loadedWindow(threads), sortDirection }));
    }, [dispatch, resource, objectUuid, threads, sortDirection]);

    const onLoadMore = useCallback(() => {
        if (!threads) return;
        dispatch(
            actions.listThreads({
                resource,
                objectUuid,
                pageNumber: threads.pageNumber + 1,
                itemsPerPage: threads.itemsPerPage,
                sortDirection,
            }),
        );
    }, [dispatch, resource, objectUuid, threads, sortDirection]);

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

    // The anchor is stale when the page that came back does not hold it, or when the thread of an anchored reply is gone.
    const anchorMissing = threads?.missingAnchor !== undefined || anchoredReplies?.missingAnchor !== undefined;
    const highlightUuid = anchor?.replyUuid ?? anchor?.rootUuid;

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
                    postSucceeded={!!threads?.postSucceeded}
                    denied={threads?.postingDenied}
                    placeholder="Write a comment…"
                    submitLabel="Post"
                    dataTestId={`comment-panel-${objectUuid}-composer`}
                />

                {anchorMissing && (
                    <div
                        role="alert"
                        className="rounded-lg border border-danger bg-danger-surface px-4 py-2 text-sm text-danger"
                        data-testid={`comment-panel-${objectUuid}-missing-anchor`}
                    >
                        The comment you followed no longer exists.
                    </div>
                )}

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
                        <Button
                            variant="transparent"
                            color="secondary"
                            className="self-end !px-1 !py-0.5 text-xs"
                            onClick={onToggleDirection}
                            disabled={threads?.isFetching}
                            title={newestFirst ? 'Show oldest first' : 'Show newest first'}
                            data-testid={`comment-panel-${objectUuid}-sort`}
                        >
                            {newestFirst ? <ArrowDownWideNarrow size={14} /> : <ArrowUpNarrowWide size={14} />}
                            {newestFirst ? 'Newest first' : 'Oldest first'}
                        </Button>

                        {earlier > 0 && (
                            <Button
                                variant="outline"
                                color="primary"
                                className="self-start !py-1.5 !px-3 text-xs"
                                onClick={onLoadEarlier}
                                disabled={threads?.isFetching}
                                data-testid={`comment-panel-${objectUuid}-load-earlier`}
                            >
                                Show earlier comments ({earlier})
                            </Button>
                        )}

                        {roots.map((root) => (
                            <CommentThread
                                key={root.uuid}
                                resource={resource}
                                objectUuid={objectUuid}
                                root={root}
                                busy={busy}
                                onDelete={onDelete}
                                highlightUuid={highlightUuid}
                                anchored={anchor?.replyUuid !== undefined && anchor.rootUuid === root.uuid}
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
