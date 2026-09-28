import { configureStore, type Middleware } from '@reduxjs/toolkit';
import { useMemo, useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import { testInitialState, testReducers } from 'ducks/test-reducers';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { CertificateState } from 'types/openapi';

import CertificateRekeyDialog from './index';

export type CertificateRekeyDialogTestWrapperProps = Readonly<{
    certificate?: CertificateDetailResponseModel;
    preloadedState?: Partial<ReturnType<typeof testReducers>>;
}>;

const baseCertificate: CertificateDetailResponseModel = {
    uuid: 'certificate-uuid',
    commonName: 'test-certificate',
    state: CertificateState.Issued,
    raProfile: { uuid: 'ra-profile-uuid', name: 'Test RA Profile', authorityInstanceUuid: 'authority-uuid' },
    privateKeyAvailability: false,
} as CertificateDetailResponseModel;

type Recorded = { type: string; payload?: unknown };

export function CertificateRekeyDialogTestWrapper({
    certificate = baseCertificate,
    preloadedState,
}: CertificateRekeyDialogTestWrapperProps) {
    const [dispatched, setDispatched] = useState<Recorded[]>([]);

    const store = useMemo(
        () =>
            configureStore({
                reducer: testReducers,
                middleware: (getDefaultMiddleware) =>
                    getDefaultMiddleware({ serializableCheck: false }).concat((() => (next) => (action) => {
                        const { type, payload } = action as Recorded;
                        if (type.startsWith('certificates/')) setDispatched((seen) => [...seen, { type, payload }]);
                        return next(action);
                    }) as Middleware),
                preloadedState: { ...testInitialState, ...preloadedState },
            }),
        [preloadedState],
    );

    return (
        <Provider store={store}>
            <MemoryRouter>
                <CertificateRekeyDialog onCancel={() => {}} certificate={certificate} />
                <div data-testid="dispatched">{JSON.stringify(dispatched)}</div>
            </MemoryRouter>
        </Provider>
    );
}

export default CertificateRekeyDialogTestWrapper;
