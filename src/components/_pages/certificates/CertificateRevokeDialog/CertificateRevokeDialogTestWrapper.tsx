import { configureStore } from '@reduxjs/toolkit';
import { useMemo, useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import { testInitialState, testReducers } from 'ducks/test-reducers';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { CertificateState } from 'types/openapi';

import CertificateRevokeDialog from './index';

export type CertificateRevokeDialogTestWrapperProps = Readonly<{
    onClose?: () => void;
    certificate?: CertificateDetailResponseModel;
    preloadedState?: Partial<ReturnType<typeof testReducers>>;
}>;

const baseCertificate: CertificateDetailResponseModel = {
    uuid: 'certificate-uuid',
    commonName: 'test-certificate',
    state: CertificateState.Issued,
    raProfile: {
        uuid: 'ra-profile-uuid',
        name: 'Test RA Profile',
        authorityInstanceUuid: 'authority-uuid',
    },
} as CertificateDetailResponseModel;

/**
 * Playwright CT cannot carry a live Redux store across the Node/browser boundary; the store is built
 * inside the mounted component instead. See CompleteRegisteredDialogTestWrapper.tsx for the precedent.
 */
export function CertificateRevokeDialogTestWrapper({
    onClose = () => {},
    certificate = baseCertificate,
    preloadedState,
}: CertificateRevokeDialogTestWrapperProps) {
    const store = useMemo(
        () =>
            configureStore({
                reducer: testReducers,
                middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
                preloadedState: { ...testInitialState, ...preloadedState },
            }),
        [preloadedState],
    );

    const [open, setOpen] = useState(true);
    const handleClose = () => {
        setOpen(false);
        onClose();
    };

    return (
        <Provider store={store}>
            <MemoryRouter>
                {open ? <CertificateRevokeDialog certificate={certificate} onClose={handleClose} /> : <div data-testid="dialog-closed" />}
            </MemoryRouter>
        </Provider>
    );
}

export default CertificateRevokeDialogTestWrapper;
