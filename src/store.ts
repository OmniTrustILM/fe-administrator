import { configureStore, type Middleware } from '@reduxjs/toolkit';
import type { UnknownAction } from 'redux';
import { createEpicMiddleware } from 'redux-observable';
import { sanitizeAction } from 'utils/actionSanitizer';

import { backendClient } from './api';
import { type AppState, epics } from './ducks';
import { initialState } from './ducks/initial-state';
import { reducers } from './ducks/reducers';

export default function configure() {
    const epicMiddleware = createEpicMiddleware<UnknownAction, UnknownAction, AppState>({
        dependencies: {
            apiClients: backendClient,
        },
    });

    const store = configureStore({
        reducer: reducers,
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                serializableCheck: false, // disable immutability checks because of date => should be refactored and date should not be stored in state
            }).concat(epicMiddleware as Middleware),
        preloadedState: initialState,
        // A production build offers no Redux DevTools; a development one masks the secrets an action carries.
        devTools: process.env.NODE_ENV === 'production' ? false : { actionSanitizer: sanitizeAction },
    });

    epicMiddleware.run(epics);

    store.dispatch({ type: '@@app/INIT' });

    return store;
}
