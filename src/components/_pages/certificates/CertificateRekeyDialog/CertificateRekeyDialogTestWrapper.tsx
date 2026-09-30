import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import type { testReducers } from 'ducks/test-reducers';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { CertificateState } from 'types/openapi';
import { useRecordingStore } from 'utils/test-helpers';

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

export function CertificateRekeyDialogTestWrapper({
    certificate = baseCertificate,
    preloadedState,
}: CertificateRekeyDialogTestWrapperProps) {
    const { store, dispatched } = useRecordingStore(preloadedState, 'certificates/');

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
