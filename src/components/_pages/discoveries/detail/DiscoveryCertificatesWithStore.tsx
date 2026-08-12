import { useEffect, useRef } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { MemoryRouter } from 'react-router';
import type { DiscoveriesTestState } from 'ducks/test-reducers';
import { createMockStore } from 'utils/test-helpers';
import DiscoveryCertificates from './DiscoveryCertificates';

type DiscoveryCertificatesTestList = NonNullable<DiscoveriesTestState['discoveryCertificates']>;

export type DiscoveryCertificatesWithStoreProps = Readonly<{
    initialEntries?: string[];
    certificates?: DiscoveryCertificatesTestList;
}>;

const defaultCertificates: DiscoveryCertificatesTestList = {
    totalItems: 1,
    certificates: [
        {
            uuid: 'cert-1',
            commonName: 'discovered.example.com',
            serialNumber: '01',
            issuerCommonName: 'Demo CA',
            notBefore: '2026-01-01T00:00:00.000+00:00',
            notAfter: '2027-01-01T00:00:00.000+00:00',
            fingerprint: 'aabbcc',
            certificateContent: 'content',
            newlyDiscovered: true,
        },
    ],
};

const preloadedState: Parameters<typeof createMockStore>[0] = {
    discoveries: {
        discoveryCertificates: undefined,
        isFetchingDiscoveryCertificates: false,
        certificatesRequests: [],
    },
};

function RequestProbe() {
    const requests = useSelector((state: { discoveries: DiscoveriesTestState }) => state.discoveries.certificatesRequests);
    const lastRequest = requests.at(-1);
    return (
        <div
            data-testid="certificates-request-probe"
            data-request-count={requests.length}
            data-newly-discovered={lastRequest ? String(lastRequest.newlyDiscovered) : 'none'}
            data-page-number={lastRequest ? String(lastRequest.pageNumber) : 'none'}
        />
    );
}

// Stands in for the discoveries epic: answers every recorded request with the fixture, so the widget
// goes through the same cleared/busy -> populated transition it does in production.
function CertificatesResponder({ certificates }: Readonly<{ certificates: DiscoveryCertificatesTestList }>) {
    const dispatch = useDispatch();
    const requestCount = useSelector((state: { discoveries: DiscoveriesTestState }) => state.discoveries.certificatesRequests.length);
    const certificatesRef = useRef(certificates);
    certificatesRef.current = certificates;

    useEffect(() => {
        if (requestCount === 0) return;
        dispatch({ type: 'discoveries/getDiscoveryCertificatesSuccess', payload: certificatesRef.current });
    }, [dispatch, requestCount]);

    return null;
}

export default function DiscoveryCertificatesWithStore({ initialEntries, certificates }: DiscoveryCertificatesWithStoreProps) {
    const store = createMockStore(preloadedState);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={initialEntries ?? ['/discoveries/detail/discovery-1']}>
                <DiscoveryCertificates id="discovery-1" />
                <CertificatesResponder certificates={certificates ?? defaultCertificates} />
                <RequestProbe />
            </MemoryRouter>
        </Provider>
    );
}
