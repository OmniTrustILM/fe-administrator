import type { testReducers } from 'ducks/test-reducers';
import { Provider, useDispatch } from 'react-redux';
import resourceReducer, { actions as resourceActions } from 'ducks/resource';
import { type Resource, ResourceAction } from 'types/openapi';
import type { ResourceModel } from 'types/resource';
import { overlaySliceReducer, useRecordingStore } from 'utils/test-helpers';
import { useActionAvailability } from 'utils/useActionAvailability';

type Props = Readonly<{
    resource: Resource;
    objectUuid?: string;
    preloadedState: Partial<ReturnType<typeof testReducers>>;
}>;

function UpdateAvailability({ resource, objectUuid }: Readonly<{ resource: Resource; objectUuid?: string }>) {
    const availability = useActionAvailability(resource, objectUuid)(ResourceAction.Update);
    return <output data-testid="availability">{JSON.stringify(availability)}</output>;
}

export function UseActionAvailabilityWithStore({ resource, objectUuid, preloadedState }: Props) {
    const { store, dispatched } = useRecordingStore(preloadedState, 'resource/listObjectAllowedActions');
    return (
        <Provider store={store}>
            <UpdateAvailability resource={resource} objectUuid={objectUuid} />
            <output data-testid="dispatched">{JSON.stringify(dispatched)}</output>
        </Provider>
    );
}

const resourceListActions = [resourceActions.listResources, resourceActions.listResourcesSuccess, resourceActions.listResourcesFailure];
const resourceListReducer = overlaySliceReducer('resource', resourceReducer as never, resourceListActions);

function DeleteOnObjects({ resource, testId }: Readonly<{ resource: Resource; testId: string }>) {
    const availability = useActionAvailability(resource)(ResourceAction.Delete, { onObjects: true });
    return <output data-testid={testId}>{JSON.stringify(availability)}</output>;
}

function AnswerResourceList({ resource, answer }: Readonly<{ resource: Resource; answer: 'objectAccess' | 'failure' }>) {
    const dispatch = useDispatch();
    const onClick = () =>
        dispatch(
            answer === 'failure'
                ? resourceActions.listResourcesFailure({ error: 'refused' })
                : resourceActions.listResourcesSuccess({
                      resourcesList: [{ resource, hasObjectAccess: true, hasOwner: false } as ResourceModel],
                  }),
        );
    return (
        <button type="button" onClick={onClick}>
            Answer resource list
        </button>
    );
}

/** Two rows' worth of the hook on one list, with the resource list answered on demand. */
export function UseActionAvailabilityRowsWithStore({
    resource,
    answer,
    preloadedState,
}: Props & Readonly<{ answer: 'objectAccess' | 'failure' }>) {
    const { store, dispatched } = useRecordingStore(preloadedState, resourceActions.listResources, resourceListReducer);
    return (
        <Provider store={store}>
            <DeleteOnObjects resource={resource} testId="first-row" />
            <DeleteOnObjects resource={resource} testId="second-row" />
            <AnswerResourceList resource={resource} answer={answer} />
            <output data-testid="dispatched">{JSON.stringify(dispatched.map((action) => action.type))}</output>
        </Provider>
    );
}
