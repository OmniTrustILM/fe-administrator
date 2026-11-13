import type { testReducers } from 'ducks/test-reducers';
import { Provider } from 'react-redux';
import { type Resource, ResourceAction } from 'types/openapi';
import { useRecordingStore } from 'utils/test-helpers';
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
