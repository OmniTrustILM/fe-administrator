import { configureStore, type Middleware, type UnknownAction } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';

import { actions as certificateActions } from 'ducks/certificates';
import { actions as raProfilesActions } from 'ducks/ra-profiles';
import { testInitialState, testReducers } from 'ducks/test-reducers';

import EarlyRenewalDialog, { type EarlyRenewalTarget } from './index';

export type EarlyRenewalDialogTestWrapperProps = Readonly<{
    target: EarlyRenewalTarget;
    onDispatched?: (action: { type: string; payload: unknown }) => void;
    onClose?: () => void;
}>;

export function EarlyRenewalDialogTestWrapper({ target, onDispatched, onClose = () => {} }: EarlyRenewalDialogTestWrapperProps) {
    const store = useMemo(() => {
        const captureMiddleware: Middleware = () => (next) => (action) => {
            const typed = action as UnknownAction;
            if (
                typed.type === raProfilesActions.requestRaProfileEarlyRenewal.type ||
                typed.type === certificateActions.bulkRequestEarlyRenewal.type
            ) {
                onDispatched?.({ type: typed.type, payload: typed.payload });
            }
            return next(action);
        };
        return configureStore({
            reducer: testReducers,
            middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(captureMiddleware),
            preloadedState: testInitialState,
        });
    }, [onDispatched]);

    return (
        <Provider store={store}>
            <EarlyRenewalDialog target={target} onClose={onClose} />
        </Provider>
    );
}
