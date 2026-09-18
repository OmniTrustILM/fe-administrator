import { Provider, useSelector } from 'react-redux';
import { MemoryRouter } from 'react-router';
import ThemeProvider from 'components/ThemeProvider';
import { EntityType, selectors as filterSelectors } from 'ducks/filters';
import { CryptographicAssetType, PqcVerdict } from 'types/openapi';
import TestRouteDisplay from 'utils/TestRouteDisplay';
import { createMockStore } from 'utils/test-helpers';
import CryptoAssetsDashboard from './index';

type Variant = 'synced' | 'partial' | 'empty';

const statistics = {
    totalAssets: 12418,
    sourceCbomCount: 37,
    statByType: { [CryptographicAssetType.Algorithm]: 7904, [CryptographicAssetType.Certificate]: 2731 },
    statByPqcVerdict: { [PqcVerdict.NotReady]: 5903, [PqcVerdict.Ready]: 3206, [PqcVerdict.NotApplicable]: 2987 },
    statByAlgorithmFamily: { RSA: 2318, AES: 1406, 'SHA-2': 1214 },
    distinctAlgorithmFamilyCount: 42,
    unassignedAssetCount: 3010,
    syncCompleteness: {
        cbomStatBySyncState: { synced: 37, pending: 0, failed: 0 },
        lastCompletedSyncAt: '2026-09-09T06:00:14.000Z',
    },
};

const partialStatistics = {
    ...statistics,
    syncCompleteness: { cbomStatBySyncState: { synced: 12, pending: 20, failed: 5 } },
};

const emptyStatistics = {
    totalAssets: 0,
    sourceCbomCount: 0,
    statByType: {},
    statByPqcVerdict: {},
    statByAlgorithmFamily: {},
    distinctAlgorithmFamilyCount: 0,
    unassignedAssetCount: 0,
    syncCompleteness: { cbomStatBySyncState: { synced: 0, pending: 0, failed: 0 } },
};

const statisticsFor = (variant: Variant) => {
    if (variant === 'partial') return partialStatistics;
    if (variant === 'empty') return emptyStatistics;
    return statistics;
};

function CurrentFiltersProbe() {
    const currentFilters = useSelector(filterSelectors.currentFilters(EntityType.CRYPTO_ASSET));
    return <span data-testid="current-filters">{JSON.stringify(currentFilters)}</span>;
}

export default function CryptoAssetsDashboardWithStore({ variant = 'synced' }: Readonly<{ variant?: Variant }>) {
    const store = createMockStore({
        cryptoAssetsDashboard: { isFetching: false, statistics: statisticsFor(variant) },
    } as Parameters<typeof createMockStore>[0]);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/dashboard/crypto-assets']}>
                <ThemeProvider>
                    <CryptoAssetsDashboard />
                    <TestRouteDisplay />
                    <CurrentFiltersProbe />
                </ThemeProvider>
            </MemoryRouter>
        </Provider>
    );
}
