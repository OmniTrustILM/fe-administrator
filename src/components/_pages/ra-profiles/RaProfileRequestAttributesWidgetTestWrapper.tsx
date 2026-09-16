import { configureStore, type Middleware, type UnknownAction } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import { testInitialState, testReducers } from 'ducks/test-reducers';
import type { RaProfileCertificateRequestAttributesDto } from 'types/openapi';

import RaProfileRequestAttributesWidget from './RaProfileRequestAttributesWidget';

type Props = Readonly<{
    certificateRequestAttributes?: RaProfileCertificateRequestAttributesDto;
    preloadedState?: Partial<ReturnType<typeof testReducers>>;
}>;

/**
 * Playwright CT cannot carry a live Redux store instance created in the test file across the
 * Node/browser boundary, so the store is built inside the mounted component — the same pattern as
 * CertificateFormTestWrapper. Every dispatched action is recorded on window.__raProfileWidgetActions__
 * so the spec can assert what the widget sends to the store (there are no epics here).
 */
export function RaProfileRequestAttributesWidgetTestWrapper({ certificateRequestAttributes, preloadedState }: Props) {
    const store = useMemo(() => {
        const capturedActions: UnknownAction[] = [];
        (globalThis as unknown as { __raProfileWidgetActions__: UnknownAction[] }).__raProfileWidgetActions__ = capturedActions;
        const captureMiddleware: Middleware = () => (next) => (action) => {
            capturedActions.push(action as UnknownAction);
            return next(action);
        };
        return configureStore({
            reducer: testReducers,
            middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(captureMiddleware),
            preloadedState: { ...testInitialState, ...preloadedState },
        });
    }, [preloadedState]);

    return (
        <Provider store={store}>
            <MemoryRouter>
                <RaProfileRequestAttributesWidget
                    authorityUuid="auth-1"
                    raProfileUuid="ra-1"
                    certificateRequestAttributes={certificateRequestAttributes}
                />
                <button
                    type="button"
                    data-testid="simulate-rejection"
                    onClick={() =>
                        store.dispatch({
                            type: 'raProfileRequestAttributes/updateRaProfileRequestAttributesFailure',
                            payload: { error: 'Attribute definition is invalid' },
                        })
                    }
                >
                    simulate rejection
                </button>
            </MemoryRouter>
        </Provider>
    );
}
