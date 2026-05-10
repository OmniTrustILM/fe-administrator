import { configureStore, type Middleware } from '@reduxjs/toolkit';
import type { UnknownAction } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { backendClient } from './api';
import { type AppState, epics } from './ducks';
import { initialState } from './ducks/initial-state';
import { reducers } from './ducks/reducers';
import { startAlertsTicker } from './ducks/alerts-ticker';

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
    });

    epicMiddleware.run(epics);

    store.dispatch({ type: '@@app/INIT' });
    startAlertsTicker(store);

    return store;
}
