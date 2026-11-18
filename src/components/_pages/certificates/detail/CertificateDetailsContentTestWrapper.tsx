import { useCallback, useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import type { CertificateDetailResponseModel } from 'types/certificate';
import type { UserProfileDetailModel } from 'types/auth';
import { CertificateState, Resource, type ResourceAction } from 'types/openapi';
import { resolveAvailability } from 'utils/availability';
import type { ActionAvailability } from 'utils/useActionAvailability';
import { useRecordingStore } from 'utils/test-helpers';

import CertificateDetailsContent from './CertificateDetailsContent';

export type CertificateDetailsContentTestWrapperProps = Readonly<{
    /** What the allowed-actions endpoint answered for the certificate; omitted means every action. */
    allowedActions?: ResourceAction[];
    /** Fields that replace the test certificate's own, such as a pending state or a trusted flag. */
    certificateOverrides?: Partial<CertificateDetailResponseModel>;
}>;

const testCertificate = {
    uuid: 'source-uuid',
    commonName: 'app.example',
    subjectDn: 'CN=app.example',
    state: CertificateState.Issued,
    raProfile: { uuid: 'ra-profile-uuid', name: 'Test RA Profile', authorityInstanceUuid: 'authority-uuid' },
} as unknown as CertificateDetailResponseModel;

const profile = { username: 'user' } as UserProfileDetailModel;

export function CertificateDetailsContentTestWrapper({ allowedActions, certificateOverrides }: CertificateDetailsContentTestWrapperProps) {
    const certificate = useMemo(() => ({ ...testCertificate, ...certificateOverrides }), [certificateOverrides]);
    const can: ActionAvailability = useCallback(
        (action) =>
            allowedActions
                ? resolveAvailability({
                      rule: { resource: Resource.Certificates, action },
                      profile,
                      objectAnswer: { status: 'loaded', allowedActions },
                      labels: { resource: 'Certificates', action },
                  })
                : { available: true, hidden: false, loading: false },
        [allowedActions],
    );

    const { store } = useRecordingStore(undefined, 'certificates/');

    return (
        <Provider store={store}>
            <MemoryRouter>
                <CertificateDetailsContent
                    certificate={certificate}
                    validationResult={undefined}
                    isBusy={false}
                    getFreshCertificateDetail={() => {}}
                    can={can}
                />
            </MemoryRouter>
        </Provider>
    );
}

export default CertificateDetailsContentTestWrapper;
