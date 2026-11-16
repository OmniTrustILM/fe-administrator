import resourceReducer, { actions as resourceActions } from 'ducks/resource';
import type { testReducers } from 'ducks/test-reducers';
import { Provider, useDispatch } from 'react-redux';
import { type Resource, ResourceAction } from 'types/openapi';
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

const answeringReducer = overlaySliceReducer('resource', resourceReducer, [
    resourceActions.listObjectAllowedActionsSuccess,
    resourceActions.listObjectAllowedActionsFailure,
]);

function AnswerOutcomes({ resource, objectUuid }: Readonly<{ resource: Resource; objectUuid: string }>) {
    const dispatch = useDispatch();
    return (
        <>
            <button
                type="button"
                data-testid="simulate-answer-update"
                onClick={() =>
                    dispatch(
                        resourceActions.listObjectAllowedActionsSuccess({
                            resource,
                            uuid: objectUuid,
                            allowedActions: [ResourceAction.Update],
                        }),
                    )
                }
            >
                Simulate answer
            </button>
            <button
                type="button"
                data-testid="simulate-answer-failure"
                onClick={() => dispatch(resourceActions.listObjectAllowedActionsFailure({ resource, uuid: objectUuid }))}
            >
                Simulate failure
            </button>
        </>
    );
}

export function UseActionAvailabilityWithStore({ resource, objectUuid, preloadedState }: Props) {
    const { store, dispatched } = useRecordingStore(preloadedState, 'resource/listObjectAllowedActions', answeringReducer);
    return (
        <Provider store={store}>
            <UpdateAvailability resource={resource} objectUuid={objectUuid} />
            {objectUuid && <AnswerOutcomes resource={resource} objectUuid={objectUuid} />}
            <output data-testid="dispatched">{JSON.stringify(dispatched)}</output>
        </Provider>
    );
}
