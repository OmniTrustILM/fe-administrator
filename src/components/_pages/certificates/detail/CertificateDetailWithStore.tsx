import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { UnknownAction } from '@reduxjs/toolkit';
import { initialState as certificatesInitialState } from 'ducks/certificates';
import locationsReducer, { initialState as locationsInitialState } from 'ducks/locations';
import { testInitialState, testReducers } from 'ducks/test-reducers';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { CertificateState, type Resource } from 'types/openapi';
import { useRecordingStore } from 'utils/test-helpers';
import CertificateDetail from './index';

type Props = Readonly<{
    allowedListings: Resource[];
}>;

const certificate = {
    uuid: 'cert-uuid',
    commonName: 'app.example',
    subjectDn: 'CN=app.example',
    state: CertificateState.Issued,
} as unknown as CertificateDetailResponseModel;

const recorded = {
    match: (action: unknown) =>
        ['certificates/getCertificateDetail', 'certificates/listCertificateLocations', 'resource/listObjectAllowedActions'].includes(
            (action as { type: string }).type,
        ),
};

type HarnessState = ReturnType<typeof testReducers> & { locations?: typeof locationsInitialState };

// The test reducers carry no locations slice, which the page reads.
const reducer = ((state: HarnessState | undefined, action: UnknownAction) => {
    const { locations, ...rest } = state ?? ({} as HarnessState);
    return { ...testReducers(rest as ReturnType<typeof testReducers>, action), locations: locationsReducer(locations, action) };
}) as unknown as typeof testReducers;

export default function CertificateDetailWithStore({ allowedListings }: Props) {
    const preloadedState = useMemo(
        () => ({
            auth: { ...testInitialState.auth, profile: { username: 'user', permissions: { allowedListings, allowedActions: [] } } },
            certificates: { ...certificatesInitialState, ...testInitialState.certificates, certificateDetail: certificate },
            locations: locationsInitialState,
        }),
        [allowedListings],
    );
    const { store, dispatched } = useRecordingStore(preloadedState as never, recorded, reducer);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/certificates/detail/cert-uuid']}>
                <Routes>
                    <Route path="/certificates/detail/:id" element={<CertificateDetail />} />
                </Routes>
            </MemoryRouter>
            <div data-testid="dispatched">{JSON.stringify(dispatched.map((action) => action.type))}</div>
        </Provider>
    );
}
