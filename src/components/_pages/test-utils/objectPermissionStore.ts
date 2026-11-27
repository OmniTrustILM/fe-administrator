import { configureStore, type Middleware, type Slice, type UnknownAction } from '@reduxjs/toolkit';
import { testInitialState, testReducers } from 'ducks/test-reducers';
import type { Resource, ResourceAction } from 'types/openapi';

type TestState = ReturnType<typeof testReducers>;
type State = TestState & Record<string, unknown>;

/**
 * A store for a detail page whose allowed-actions answer for one object is already in, with a profile holding only the
 * given resource grants (none by default), so every control on the object follows that answer. `realSlices` stand in
 * for slices the test reducers lack, `objectAccess` names the resources the user holds object access on, and `middleware`
 * stands in for the epics.
 */
export function createObjectPermissionStore({
    resource,
    uuid,
    allowedActions,
    resourceGrants = [],
    objectAccess = [],
    realSlices = [],
    preloadedState = {},
    middleware = [],
}: {
    resource: Resource;
    uuid: string;
    allowedActions: ResourceAction[];
    resourceGrants?: { resource: Resource; actions: ResourceAction[] }[];
    objectAccess?: Resource[];
    realSlices?: Slice[];
    preloadedState?: Record<string, unknown>;
    middleware?: Middleware[];
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
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(middleware),
        preloadedState: {
            ...reducer(undefined, { type: 'init' }),
            auth: {
                ...testInitialState.auth,
                profile: { username: 'user', permissions: { allowedListings: [], allowedActions: resourceGrants } },
            },
            resource: {
                ...testInitialState.resource,
                objectAllowedActions: { [`${resource}/${uuid}`]: { status: 'loaded', allowedActions } },
                resourcesList: objectAccess.map((entry) => ({ resource: entry, hasObjectAccess: true, hasOwner: false })),
            },
            ...preloadedState,
        } as State,
    });
}
