import { Provider, useSelector } from 'react-redux';
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
}>;

function DispatchProbe() {
    const dispatched = useSelector((state: { comments: CommentsTestState }) => state.comments.dispatched);
    return <div data-testid="comments-dispatch-probe" data-count={dispatched.length} data-actions={JSON.stringify(dispatched)} />;
}

export default function CommentPanelWithStore({
    resource = Resource.Certificates,
    objectUuid = 'obj-1',
    secondObjectUuid,
    comments,
}: CommentPanelWithStoreProps) {
    const store = createMockStore({ comments: { threads: {}, replies: {}, busy: {}, dispatched: [], ...comments } });

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/certificates/detail/obj-1']}>
                <CommentPanel resource={resource} objectUuid={objectUuid} />
                {secondObjectUuid && <CommentPanel resource={resource} objectUuid={secondObjectUuid} />}
                <DispatchProbe />
            </MemoryRouter>
        </Provider>
    );
}
