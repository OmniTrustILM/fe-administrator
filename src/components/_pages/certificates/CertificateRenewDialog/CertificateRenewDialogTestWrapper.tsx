import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import type { testReducers } from 'ducks/test-reducers';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { CertificateState } from 'types/openapi';
import { useRecordingStore } from 'utils/test-helpers';

import CertificateRenewDialog from './index';

export type CertificateRenewDialogTestWrapperProps = Readonly<{
    certificate?: CertificateDetailResponseModel;
    allowWithoutFile?: boolean;
    preloadedState?: Partial<ReturnType<typeof testReducers>>;
}>;

const baseCertificate: CertificateDetailResponseModel = {
    uuid: 'certificate-uuid',
    commonName: 'test-certificate',
    state: CertificateState.Issued,
    raProfile: { uuid: 'ra-profile-uuid', name: 'Test RA Profile', authorityInstanceUuid: 'authority-uuid' },
    privateKeyAvailability: true,
} as CertificateDetailResponseModel;

export function CertificateRenewDialogTestWrapper({
    certificate = baseCertificate,
    allowWithoutFile = true,
    preloadedState,
}: CertificateRenewDialogTestWrapperProps) {
    const [renewPayload, setRenewPayload] = useState<unknown>();
    const { store, dispatched } = useRecordingStore(preloadedState, 'certificates/');

    return (
        <Provider store={store}>
            <MemoryRouter>
                <CertificateRenewDialog
                    onCancel={() => {}}
                    allowWithoutFile={allowWithoutFile}
                    certificate={certificate}
                    onRenew={(data) => setRenewPayload(data)}
                />
                <div data-testid="renew-payload">{renewPayload ? JSON.stringify(renewPayload) : ''}</div>
                <div data-testid="dispatched">{JSON.stringify(dispatched)}</div>
            </MemoryRouter>
        </Provider>
    );
}

export default CertificateRenewDialogTestWrapper;
