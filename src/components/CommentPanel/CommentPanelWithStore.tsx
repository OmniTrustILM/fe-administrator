import { Provider, useDispatch, useSelector } from 'react-redux';
import { MemoryRouter } from 'react-router';
import type { CommentsTestState } from 'ducks/test-reducers';
import { createMockStore } from 'utils/test-helpers';
import { Resource } from 'types/openapi';
import CommentPanel from './index';

export type CommentPanelWithStoreProps = Readonly<{
    resource?: Resource;
    objectUuid?: string;
    /** A second panel, to check that two panels on one page keep to their own state. */
    secondObjectUuid?: string;
    comments?: Partial<CommentsTestState>;
    /** Renders a control that commits a pending reply post on this thread, as the epic would. */
    commitReplyOn?: string;
}>;

function DispatchProbe() {
    const dispatched = useSelector((state: { comments: CommentsTestState }) => state.comments.dispatched);
    return <div data-testid="comments-dispatch-probe" data-count={dispatched.length} data-actions={JSON.stringify(dispatched)} />;
}

/** Stands in for the epic: reports a post as committed, which is what lets the composer clear its draft. */
function CommitPost({ commentKey, parentUuid }: Readonly<{ commentKey: string; parentUuid?: string }>) {
    const dispatch = useDispatch();
    return (
        <button
            type="button"
            data-testid={parentUuid ? `commit-post-${parentUuid}` : 'commit-post'}
            onClick={() => dispatch({ type: 'comments/createCommentSuccess', payload: { key: commentKey, parentUuid } })}
        >
            commit
        </button>
    );
}

export default function CommentPanelWithStore({
    resource = Resource.Certificates,
    objectUuid = 'obj-1',
    secondObjectUuid,
    comments,
    commitReplyOn,
}: CommentPanelWithStoreProps) {
    const store = createMockStore({ comments: { threads: {}, replies: {}, busy: {}, dispatched: [], ...comments } });

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/certificates/detail/obj-1']}>
                <CommentPanel resource={resource} objectUuid={objectUuid} />
                {secondObjectUuid && <CommentPanel resource={resource} objectUuid={secondObjectUuid} />}
                <CommitPost commentKey={`${resource}/${objectUuid}`} />
                {commitReplyOn && <CommitPost commentKey={`${resource}/${objectUuid}`} parentUuid={commitReplyOn} />}
                <DispatchProbe />
            </MemoryRouter>
        </Provider>
    );
}
