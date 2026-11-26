import { configureStore, type Middleware } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, useLocation } from 'react-router';

import { actions as certificateActions } from 'ducks/certificates';
import { testInitialState, testReducers } from 'ducks/test-reducers';
import type { CertificateType } from 'types/openapi';

import CertificateForm from './index';

export type CertificateFormTestWrapperProps = Readonly<{
    onCancel?: () => void;
    preloadedState?: Partial<ReturnType<typeof testReducers>>;
    onAction?: (action: { type: string; payload?: unknown }) => void;
    /** The certificate types that the `simulate-types-reload` button answers for RA profile `ra-1`, standing in for the epic. */
    reloadedCertificateTypes?: CertificateType[];
}>;

/**
 * Playwright CT cannot carry a live Redux store instance created in the test file across the
 * Node/browser boundary — a store built there and passed in as a prop mounts fine (Provider
 * renders), but the first `useSelector` read inside the tree sees an undefined snapshot and
 * throws. Building the store inside the mounted component (as done here) avoids that entirely.
 * See RequestValidationDialogBodyTestWrapper.tsx for the established precedent.
 */
// The certificates slice is a stub here, so the one answer a test feeds in is applied by hand.
const withReloadedCertificateTypes: typeof testReducers = (state, action) => {
    const next = testReducers(state, action);
    if (!certificateActions.listSupportedCertificateTypesSuccess.match(action)) return next;
    return {
        ...next,
        certificates: {
            ...next.certificates,
            supportedCertificateTypes: {
                ...next.certificates.supportedCertificateTypes,
                [action.payload.raProfileUuid]: action.payload.certificateTypes,
            },
        },
    };
};

function LocationProbe() {
    const { pathname } = useLocation();
    return (
        <span data-testid="current-location" hidden>
            {pathname}
        </span>
    );
}

export function CertificateFormTestWrapper({
    onCancel,
    preloadedState,
    onAction,
    reloadedCertificateTypes,
}: CertificateFormTestWrapperProps) {
    const store = useMemo(() => {
        const onActionMiddleware: Middleware = () => (next) => (action) => {
            onAction?.(action as { type: string; payload?: unknown });
            return next(action);
        };
        return configureStore({
            reducer: withReloadedCertificateTypes,
            middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(onActionMiddleware),
            preloadedState: { ...testInitialState, ...preloadedState },
        });
    }, [preloadedState, onAction]);

    return (
        <Provider store={store}>
            <MemoryRouter>
                <CertificateForm onCancel={onCancel} />
                <LocationProbe />
                {reloadedCertificateTypes && (
                    <button
                        type="button"
                        data-testid="simulate-types-reload"
                        onClick={() =>
                            store.dispatch(
                                certificateActions.listSupportedCertificateTypesSuccess({
                                    raProfileUuid: 'ra-1',
                                    certificateTypes: reloadedCertificateTypes,
                                }),
                            )
                        }
                    >
                        types reload
                    </button>
                )}
            </MemoryRouter>
        </Provider>
    );
}

export default CertificateFormTestWrapper;
