import { Provider, useDispatch, useSelector } from 'react-redux';
import { MemoryRouter, useNavigate } from 'react-router';
import type { CommentsTestState } from 'ducks/test-reducers';
import { createMockStore } from 'utils/test-helpers';
import { Resource } from 'types/openapi';
import CommentPanel from './index';

/** An action a test can deliver to the store from the page, standing in for what an epic would dispatch. */
export type DeliverableAction = { testId: string; type: string; payload?: unknown };

export type CommentPanelWithStoreProps = Readonly<{
    resource?: Resource;
    objectUuid?: string;
    /** A second panel, to check that two panels on one page keep to their own state. */
    secondObjectUuid?: string;
    comments?: Partial<CommentsTestState>;
    /** Renders a control that commits a pending reply post on this thread, as the epic would. */
    commitReplyOn?: string;
    /** Query string the panel is mounted under, as a comment notification would leave it. */
    search?: string;
    /** Renders one control per action, which dispatches it when clicked. */
    deliver?: DeliverableAction[];
    /** Renders one control per entry, which navigates the panel's page to that query string, as a notification would. */
    navigateTo?: Array<{ testId: string; search: string }>;
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

function NavigateTo({ testId, search }: Readonly<{ testId: string; search: string }>) {
    const navigate = useNavigate();
    return (
        <button type="button" data-testid={testId} onClick={() => navigate(`/certificates/detail/obj-1${search}`)}>
            navigate
        </button>
    );
}

function Deliver({ action }: Readonly<{ action: DeliverableAction }>) {
    const dispatch = useDispatch();
    return (
        <button type="button" data-testid={action.testId} onClick={() => dispatch({ type: action.type, payload: action.payload })}>
            deliver
        </button>
    );
}

export default function CommentPanelWithStore({
    resource = Resource.Certificates,
    objectUuid = 'obj-1',
    secondObjectUuid,
    comments,
    commitReplyOn,
    search = '',
    deliver = [],
    navigateTo = [],
}: CommentPanelWithStoreProps) {
    const store = createMockStore({ comments: { threads: {}, replies: {}, busy: {}, dispatched: [], ...comments } });

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[`/certificates/detail/obj-1${search}`]}>
                <CommentPanel resource={resource} objectUuid={objectUuid} />
                {secondObjectUuid && <CommentPanel resource={resource} objectUuid={secondObjectUuid} />}
                <CommitPost commentKey={`${resource}/${objectUuid}`} />
                {commitReplyOn && <CommitPost commentKey={`${resource}/${objectUuid}`} parentUuid={commitReplyOn} />}
                {deliver.map((action) => (
                    <Deliver key={action.testId} action={action} />
                ))}
                {navigateTo.map((entry) => (
                    <NavigateTo key={entry.testId} testId={entry.testId} search={entry.search} />
                ))}
                <DispatchProbe />
            </MemoryRouter>
        </Provider>
    );
}
