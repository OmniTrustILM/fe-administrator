import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { createObjectPermissionStore } from 'components/_pages/test-utils/objectPermissionStore';
import { PERMISSION_SCENARIOS, scenarioState } from 'components/_pages/test-utils/permissionScenarios';
import { initialState as certificatesInitialState } from 'ducks/certificates';
import { slice as locationsSlice } from 'ducks/locations';
import { testInitialState } from 'ducks/test-reducers';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { CertificateState, Resource } from 'types/openapi';
import CertificateDetail from './index';

const issued = {
    uuid: 'cert-1',
    commonName: 'app.example',
    subjectDn: 'CN=app.example',
    state: CertificateState.Issued,
    certificateContent: 'MIIB',
    raProfile: { uuid: 'ra-profile-1', name: 'RA profile', authorityInstanceUuid: 'authority-1' },
} as unknown as CertificateDetailResponseModel;

// Each variant leaves state enabling the actions it is named for: an issued certificate every action but Issue,
// Complete and Unarchive, a requested one Issue, a registered one Complete and an archived one Unarchive.
const certificates = {
    issued,
    requested: { ...issued, state: CertificateState.Requested },
    registered: { ...issued, state: CertificateState.Registered },
    archived: { ...issued, archived: true },
} satisfies Record<string, CertificateDetailResponseModel>;

export type CertificateVariant = keyof typeof certificates;

/** The certificate detail page as the named permission scenario sees it. */
export default function CertificateDetailScenarioWithStore({
    scenario,
    variant = 'issued',
}: Readonly<{ scenario: string; variant?: CertificateVariant }>) {
    const certificate = certificates[variant];
    const [store] = useState(() =>
        createObjectPermissionStore({
            resource: Resource.Certificates,
            uuid: certificate.uuid,
            allowedActions: [],
            realSlices: [locationsSlice],
            preloadedState: {
                ...scenarioState(PERMISSION_SCENARIOS.find((candidate) => candidate.name === scenario)!, {
                    resource: Resource.Certificates,
                    uuid: certificate.uuid,
                }),
                certificates: { ...certificatesInitialState, ...testInitialState.certificates, certificateDetail: certificate },
            },
        }),
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[`/certificates/detail/${certificate.uuid}`]}>
                <Routes>
                    <Route path="/certificates/detail/:id" element={<CertificateDetail />} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}
