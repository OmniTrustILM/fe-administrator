import { useMemo, useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import { testInitialState, type testReducers } from 'ducks/test-reducers';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { CertificateState } from 'types/openapi';
import { useRecordingStore } from 'utils/test-helpers';

import CertificateRAProfileDialog, { type RaProfileTarget } from './index';

export type CertificateRAProfileDialogTestWrapperProps = Readonly<{
    target?: RaProfileTarget;
    preloadedState?: Partial<ReturnType<typeof testReducers>>;
}>;

const baseCertificate: CertificateDetailResponseModel = {
    uuid: 'certificate-uuid',
    commonName: 'test-certificate',
    state: CertificateState.Issued,
    raProfile: { uuid: 'ra-1', name: 'RA One', authorityInstanceUuid: 'auth-1' },
    privateKeyAvailability: false,
} as CertificateDetailResponseModel;

const raProfiles = [
    { uuid: 'ra-1', name: 'RA One', authorityInstanceUuid: 'auth-1', enabled: true },
    { uuid: 'ra-2', name: 'RA Two', authorityInstanceUuid: 'auth-2', enabled: true },
];

export function CertificateRAProfileDialogTestWrapper({
    target = { kind: 'certificate', certificate: baseCertificate },
    preloadedState,
}: CertificateRAProfileDialogTestWrapperProps) {
    const [closed, setClosed] = useState<'cancel' | 'update'>();
    const state = useMemo(() => ({ raprofiles: { ...testInitialState.raprofiles, raProfiles }, ...preloadedState }), [preloadedState]);
    const { store, dispatched } = useRecordingStore(state, 'certificates/');

    return (
        <Provider store={store}>
            <MemoryRouter>
                <CertificateRAProfileDialog target={target} onCancel={() => setClosed('cancel')} onUpdate={() => setClosed('update')} />
                <div data-testid="closed">{closed ?? ''}</div>
                <div data-testid="dispatched">{JSON.stringify(dispatched)}</div>
            </MemoryRouter>
        </Provider>
    );
}

export default CertificateRAProfileDialogTestWrapper;
