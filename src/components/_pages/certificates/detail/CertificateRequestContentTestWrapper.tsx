import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import type { CertificateDetailResponseModel } from 'types/certificate';
import { CertificateType } from 'types/openapi';
import { useRecordingStore } from 'utils/test-helpers';

import CertificateRequestContent from './CertificateRequestContent';

const certificate = {
    uuid: 'certificate-uuid',
    displayName: 'app.example',
    commonName: 'app.example',
    serialNumber: '01',
    certificateRequest: {
        displayName: 'app.example',
        commonName: 'app.example',
        certificateType: CertificateType.X509,
        content: 'TUlJQ1NyZXF1ZXN0',
    },
} as unknown as CertificateDetailResponseModel;

export type CertificateRequestContentTestWrapperProps = Readonly<{
    /** Type of the request; X.509 when omitted. */
    requestType?: CertificateType;
}>;

export function CertificateRequestContentTestWrapper({ requestType }: CertificateRequestContentTestWrapperProps) {
    const shown = requestType
        ? ({
              ...certificate,
              certificateRequest: { ...certificate.certificateRequest, certificateType: requestType },
          } as CertificateDetailResponseModel)
        : certificate;
    const { store } = useRecordingStore(undefined, 'alerts/');

    return (
        <Provider store={store}>
            <MemoryRouter>
                <div className="p-16">
                    <CertificateRequestContent
                        certificate={shown}
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
