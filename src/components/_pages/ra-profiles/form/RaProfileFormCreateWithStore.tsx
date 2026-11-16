import { configureStore, type Middleware, type UnknownAction } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { testInitialState, testReducers } from 'ducks/test-reducers';
import RaProfileForm from './index';

// Mounts RaProfileForm in *create* mode (or *edit* mode when `raProfileId` is given, with the profile
// preloaded in `raprofiles.raProfile`) with a browser-side store instrumented for CT:
//  - a capturing middleware records every dispatched action on window.__raProfileActions__ so the
//    test can assert the create→PATCH chain (deferRedirect flag, the follow-up PATCH payload);
//  - the store itself is exposed on window.__raProfileStore__ so the test can stand in for the
//    (epic-less) create outcome by dispatching createRaProfileSuccess / createRaProfileFailure.
// The authority is pre-selected via the `authorityId` prop, so no Select interaction is needed to
// enable the request-attributes tab. Pass authorityId="" to exercise the no-authority state where the
// attribute tabs are disabled.
type TestState = ReturnType<typeof testReducers>;

// Keeps the detail fetch the form dispatches on mount in flight until the test answers it with getRaProfileDetailSuccess.
function withRaProfileDetailFetch(state: TestState | undefined, action: UnknownAction): TestState {
    const next = testReducers(state, action);
    if (action.type === 'raprofiles/getRaProfileDetail') {
        return { ...next, raprofiles: { ...next.raprofiles, isFetchingDetail: true } };
    }
    if (action.type === 'raprofiles/getRaProfileDetailSuccess') {
        const { raProfile } = action.payload as { raProfile: TestState['raprofiles']['raProfile'] };
        return { ...next, raprofiles: { ...next.raprofiles, isFetchingDetail: false, raProfile } };
    }
    return next;
}

export default function RaProfileFormCreateWithStore({
    authorityId = 'auth-1',
    raProfileId,
    preloadedState,
    withDetailFetch = false,
}: {
    authorityId?: string;
    raProfileId?: string;
    preloadedState?: Partial<TestState>;
    withDetailFetch?: boolean;
}) {
    const capturedActions: UnknownAction[] = [];
    (globalThis as unknown as { __raProfileActions__: UnknownAction[] }).__raProfileActions__ = capturedActions;

    const captureMiddleware: Middleware = () => (next) => (action) => {
        capturedActions.push(action as UnknownAction);
        return next(action);
    };
    const store = configureStore({
        reducer: withDetailFetch ? withRaProfileDetailFetch : testReducers,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(captureMiddleware),
        preloadedState: { ...testInitialState, ...preloadedState },
    });
    (globalThis as unknown as { __raProfileStore__: typeof store }).__raProfileStore__ = store;

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/raprofiles/add']}>
                <RaProfileForm raProfileId={raProfileId} authorityId={authorityId} />
            </MemoryRouter>
        </Provider>
    );
}
