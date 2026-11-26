import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { PERMISSION_SCENARIOS, scenarioState } from 'components/_pages/test-utils/permissionScenarios';
import { initialState as certificatesInitialState } from 'ducks/certificates';
import { testInitialState } from 'ducks/test-reducers';
import { CertificateState, CertificateValidationStatus } from 'types/openapi';
import type { CertificateListResponseModel } from 'types/certificate';
import { createMockStore } from 'utils/test-helpers';
import CertificateList from './index';

const certificate = {
    uuid: 'cert-1',
    displayName: 'Certificate one',
    commonName: 'Certificate one',
    subjectDn: 'CN=Certificate one',
    state: CertificateState.Issued,
    validationStatus: CertificateValidationStatus.Valid,
} as unknown as CertificateListResponseModel;

/** The certificate inventory with one certificate, as the named permission scenario sees it. */
export default function CertificateListWithStore({ scenario }: Readonly<{ scenario: string }>) {
    const [store] = useState(() =>
        createMockStore({
            ...scenarioState(PERMISSION_SCENARIOS.find((candidate) => candidate.name === scenario)!),
            certificates: { ...certificatesInitialState, ...testInitialState.certificates, certificates: [certificate] },
        } as never),
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/certificates']}>
                <CertificateList />
            </MemoryRouter>
        </Provider>
    );
}
