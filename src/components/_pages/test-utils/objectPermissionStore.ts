import { configureStore, type Slice, type UnknownAction } from '@reduxjs/toolkit';
import { testInitialState, testReducers } from 'ducks/test-reducers';
import type { Resource, ResourceAction } from 'types/openapi';

type TestState = ReturnType<typeof testReducers>;
type State = TestState & Record<string, unknown>;

/**
 * A store for a detail page whose allowed-actions answer for one object is already in, with a profile holding no
 * resource grant, so every control follows that answer. `realSlices` stand in for slices the test reducers lack.
 */
export function createObjectPermissionStore({
    resource,
    uuid,
    allowedActions,
    realSlices = [],
    preloadedState = {},
}: {
    resource: Resource;
    uuid: string;
    allowedActions: ResourceAction[];
    realSlices?: Slice[];
    preloadedState?: Record<string, unknown>;
}) {
    const reducer = (state: State | undefined, action: UnknownAction): State => {
        const base = { ...state } as Record<string, unknown>;
        for (const slice of realSlices) delete base[slice.name];
        const next: Record<string, unknown> = { ...testReducers(state && (base as TestState), action) };
        for (const slice of realSlices) next[slice.name] = slice.reducer(state?.[slice.name], action);
        return next as State;
    };

    return configureStore({
        reducer,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
        preloadedState: {
            ...reducer(undefined, { type: 'init' }),
            auth: { ...testInitialState.auth, profile: { username: 'user', permissions: { allowedListings: [], allowedActions: [] } } },
            resource: {
                ...testInitialState.resource,
                objectAllowedActions: { [`${resource}/${uuid}`]: { status: 'loaded', allowedActions } },
            },
            ...preloadedState,
        } as State,
    });
}
