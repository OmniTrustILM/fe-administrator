import { Provider, useSelector } from 'react-redux';
import { MemoryRouter } from 'react-router';
import ThemeProvider from 'components/ThemeProvider';
import { createMockStore } from 'utils/test-helpers';
import TestRouteDisplay from 'utils/TestRouteDisplay';
import { EntityType, selectors as filterSelectors } from 'ducks/filters';
import { FilterFieldType, SigningRecordStatisticsPeriod } from 'types/openapi';
import SigningRecordsDashboard from './index';

const preloadedState: Parameters<typeof createMockStore>[0] = {
    filters: {
        filters: [
            {
                entity: EntityType.SIGNING_RECORD,
                filter: {
                    availableFilters: [
                        {
                            searchFieldData: [
                                {
                                    fieldIdentifier: 'SIGNING_TIME',
                                    fieldLabel: 'Signing Time',
                                    type: FilterFieldType.Datetime,
                                    conditions: [],
                                },
                            ],
                        },
                    ],
                    currentFilters: [],
                    preservedFilters: [],
                    isFetchingFilters: false,
                },
            },
        ],
    },
    signingRecordsDashboard: {
        isFetching: false,
        isFetchingSeries: false,
        period: SigningRecordStatisticsPeriod._24h,
        statistics: {
            totalRetained: 128437,
            countLast24h: 1204,
            countLast7d: 9873,
            activeProfileCount: 6,
            distinctRequesterCount: 8,
            volumeOverTime: { '2026-06-18T00:00:00Z': 3, '2026-06-18T01:00:00Z': 5 },
            statByProfile: { 'tsa-default': 62, 'tsa-qualified': 31 },
            statByRequester: { 'tsa-service': 40, 'batch-sign': 22 },
            statByWorkflowType: { timestamping: 93 },
            statByProtocol: { tsp: 93 },
            statByScheme: { managed_static_key: 93 },
        },
    },
};

function CurrentFiltersProbe() {
    const currentFilters = useSelector(filterSelectors.currentFilters(EntityType.SIGNING_RECORD));
    return <span data-testid="current-filters">{JSON.stringify(currentFilters)}</span>;
}

export default function SigningRecordsDashboardWithStore() {
    const store = createMockStore(preloadedState);
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/dashboard/signing-records']}>
                <ThemeProvider>
                    <SigningRecordsDashboard />
                    <TestRouteDisplay />
                    <CurrentFiltersProbe />
                </ThemeProvider>
            </MemoryRouter>
        </Provider>
    );
}
