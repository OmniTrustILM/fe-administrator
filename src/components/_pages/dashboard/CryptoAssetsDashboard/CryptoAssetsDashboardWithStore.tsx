import { Provider, useSelector } from 'react-redux';
import { MemoryRouter } from 'react-router';
import ThemeProvider from 'components/ThemeProvider';
import { EntityType, actions as filterActions, selectors as filterSelectors } from 'ducks/filters';
import type { SearchFilterModel } from 'types/certificate';
import { CryptographicAssetType, PqcVerdict } from 'types/openapi';
import TestRouteDisplay from 'utils/TestRouteDisplay';
import { createMockStore } from 'utils/test-helpers';
import CryptoAssetsDashboard from './index';

type Variant = 'synced' | 'partial' | 'empty' | 'denied';

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
    sourceCbomCount: 0,
    statByType: {},
    statByPqcVerdict: {},
    statByAlgorithmFamily: {},
    syncCompleteness: { cbomStatBySyncState: { synced: 0, pending: 0, failed: 0 } },
};

const statisticsFor = (variant: Variant) => {
    if (variant === 'partial') return partialStatistics;
    if (variant === 'empty') return emptyStatistics;
    if (variant === 'denied') {
        const deniedStatistics: Partial<typeof statistics> = { ...statistics };
        delete deniedStatistics.sourceCbomCount;
        delete deniedStatistics.syncCompleteness;
        return deniedStatistics;
    }
    return statistics;
};

function CurrentFiltersProbe() {
    const currentFilters = useSelector(filterSelectors.currentFilters(EntityType.CRYPTO_ASSET));
    const cbomFilters = useSelector(filterSelectors.currentFilters(EntityType.CBOM));
    const isCbomDrillDownPending = useSelector(filterSelectors.isDrillDownPending(EntityType.CBOM));
    return (
        <>
            <span data-testid="current-filters">{JSON.stringify(currentFilters)}</span>
            <span data-testid="cbom-current-filters">{JSON.stringify(cbomFilters)}</span>
            <span data-testid="cbom-drill-down-pending">{String(isCbomDrillDownPending)}</span>
        </>
    );
}

export default function CryptoAssetsDashboardWithStore({
    variant = 'synced',
    initialCbomFilter,
}: Readonly<{ variant?: Variant; initialCbomFilter?: SearchFilterModel }>) {
    const store = createMockStore({
        cryptoAssetsDashboard: { isFetching: false, statistics: statisticsFor(variant) },
    } as Parameters<typeof createMockStore>[0]);
    if (initialCbomFilter) {
        store.dispatch(filterActions.setCurrentFilters({ entity: EntityType.CBOM, currentFilters: [initialCbomFilter] }));
    }

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
