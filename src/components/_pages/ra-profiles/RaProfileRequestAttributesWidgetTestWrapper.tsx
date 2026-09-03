import { configureStore } from '@reduxjs/toolkit';
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
 * CertificateFormTestWrapper.
 */
export function RaProfileRequestAttributesWidgetTestWrapper({ certificateRequestAttributes, preloadedState }: Props) {
    const store = useMemo(
        () =>
            configureStore({
                reducer: testReducers,
                middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
                preloadedState: { ...testInitialState, ...preloadedState },
            }),
        [preloadedState],
    );

    return (
        <Provider store={store}>
            <MemoryRouter>
                <RaProfileRequestAttributesWidget
                    authorityUuid="auth-1"
                    raProfileUuid="ra-1"
                    certificateRequestAttributes={certificateRequestAttributes}
                />
            </MemoryRouter>
        </Provider>
    );
}
