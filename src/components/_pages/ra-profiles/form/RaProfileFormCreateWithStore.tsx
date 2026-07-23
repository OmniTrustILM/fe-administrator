import { configureStore, type Middleware, type UnknownAction } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { testInitialState, testReducers } from 'ducks/test-reducers';
import RaProfileForm from './index';

// Mounts RaProfileForm in *create* mode with a browser-side store instrumented for CT:
//  - a capturing middleware records every dispatched action on window.__raProfileActions__ so the
//    test can assert the create→PATCH chain (deferRedirect flag, the follow-up PATCH payload);
//  - the store itself is exposed on window.__raProfileStore__ so the test can stand in for the
//    (epic-less) create outcome by dispatching createRaProfileSuccess / createRaProfileFailure.
// The authority is pre-selected via the `authorityId` prop, so the test needs neither the authorities
// slice (absent from the CT reducers) nor any Select interaction to enable the request-attributes tab.
// Pass authorityId="" to exercise the no-authority state where the attribute tabs are disabled.
export default function RaProfileFormCreateWithStore({ authorityId = 'auth-1' }: { authorityId?: string }) {
    const capturedActions: UnknownAction[] = [];
    (window as unknown as { __raProfileActions__: UnknownAction[] }).__raProfileActions__ = capturedActions;

    const captureMiddleware: Middleware = () => (next) => (action) => {
        capturedActions.push(action as UnknownAction);
        return next(action);
    };
    const store = configureStore({
        reducer: testReducers,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(captureMiddleware),
        preloadedState: testInitialState,
    });
    (window as unknown as { __raProfileStore__: typeof store }).__raProfileStore__ = store;

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/raprofiles/add']}>
                <RaProfileForm authorityId={authorityId} />
            </MemoryRouter>
        </Provider>
    );
}
