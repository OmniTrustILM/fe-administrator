import { Provider, useSelector } from 'react-redux';
import { MemoryRouter } from 'react-router';
import type { DiscoveriesTestState } from 'ducks/test-reducers';
import { createMockStore } from 'utils/test-helpers';
import DiscoveryCertificates from './DiscoveryCertificates';

export type DiscoveryCertificatesWithStoreProps = Readonly<{
    initialEntries?: string[];
    certificates?: DiscoveriesTestState['discoveryCertificates'];
}>;

function RequestProbe() {
    const requests = useSelector((state: { discoveries: DiscoveriesTestState }) => state.discoveries.certificatesRequests);
    const lastRequest = requests[requests.length - 1];
    return (
        <div
            data-testid="certificates-request-probe"
            data-request-count={requests.length}
            data-newly-discovered={String(lastRequest?.newlyDiscovered)}
        />
    );
}

export default function DiscoveryCertificatesWithStore({ initialEntries, certificates }: DiscoveryCertificatesWithStoreProps) {
    const store = createMockStore({
        discoveries: {
            discoveryCertificates: certificates ?? {
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
            },
            isFetchingDiscoveryCertificates: false,
            certificatesRequests: [],
        },
    } as Parameters<typeof createMockStore>[0]);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={initialEntries ?? ['/discoveries/detail/discovery-1']}>
                <DiscoveryCertificates id="discovery-1" />
                <RequestProbe />
            </MemoryRouter>
        </Provider>
    );
}
