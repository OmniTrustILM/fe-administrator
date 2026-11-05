import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import type { CertificateDetailResponseModel } from 'types/certificate';
import { useRecordingStore } from 'utils/test-helpers';

import CertificateRequestContent from './CertificateRequestContent';

const certificate = {
    uuid: 'certificate-uuid',
    commonName: 'app.example',
    serialNumber: '01',
    certificateRequest: { commonName: 'app.example', content: 'TUlJQ1NyZXF1ZXN0' },
} as unknown as CertificateDetailResponseModel;

export function CertificateRequestContentTestWrapper() {
    const { store } = useRecordingStore(undefined, 'alerts/');

    return (
        <Provider store={store}>
            <MemoryRouter>
                <div className="p-16">
                    <CertificateRequestContent
                        certificate={certificate}
                        isBusy={false}
                        getFreshCertificateDetail={() => {}}
                        setSelectedAttributesInfo={() => {}}
                    />
                </div>
            </MemoryRouter>
        </Provider>
    );
}

export default CertificateRequestContentTestWrapper;
