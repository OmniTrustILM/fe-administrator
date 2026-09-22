import type { CellRegistry } from 'components/CustomTable/columns';
import type { FiltersTestState, ListViewsTestState } from 'ducks/test-reducers';
import { EntityType } from 'ducks/filters';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { actions as pagingActions } from 'ducks/paging';
import { MemoryRouter } from 'react-router';
import { of } from 'rxjs';
import type { SearchFieldListModel, SearchFilterModel, SearchRequestModel } from 'types/certificate';
import type { ListViewModel } from 'types/listViews';
import { FilterFieldSource, Resource } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import type { ColumnSort } from 'utils/tableColumns';
import { createMockStore } from 'utils/test-helpers';
import PagedList from './PagedList';

export type StubRow = {
    uuid: string;
    commonName: string;
    notAfter: string;
    attributeValues?: Record<string, Record<string, unknown[]>>;
};

type Props = Readonly<{
    rows: StubRow[];
    standardColumns: ColumnDefinition[];
    catalogue: SearchFieldListModel[];
    views?: ListViewModel[];
    /** The ordering the page declares as its own, as the connector and discovery inventories do. */
    defaultSort?: ColumnSort;
    withheldCatalogue?: boolean;
    /** Preloads the view list as still in flight, which is the other half of what the strip waits for. */
    withheldViews?: boolean;
    /** Filters already in the duck when the host mounts, as a deep link leaves them. */
    initialFilters?: SearchFilterModel[];
    withRefreshControl?: boolean;
    /**
     * Renders a control that moves to page 2 with a row selected. Preloading the duck proves nothing:
     * applying the opening view is itself a reset, and runs before a test can act.
     */
    withPagingControl?: boolean;
    /** Supplies the column configuration a tick after mount, as a page still fetching its catalogue does. */
    withDeferredConfig?: boolean;
}>;

const registry: CellRegistry<StubRow> = {
    'property:COMMON_NAME': (row) => row.commonName,
    'property:NOT_AFTER': (row) => row.notAfter,
};

function ListRequests({ requests }: Readonly<{ requests: SearchRequestModel[] }>) {
    return <div data-testid="list-requests">{JSON.stringify(requests)}</div>;
}

function CurrentFilters() {
    const filters = useSelector(
        (state: { filters: FiltersTestState }) =>
            state.filters.filters.find((entry) => entry.entity === EntityType.CERTIFICATE)?.filter.currentFilters ?? [],
    );

    return <div data-testid="current-filters">{JSON.stringify(filters)}</div>;
}

function PagingControl() {
    const dispatch = useDispatch();

    return (
        <button
            type="button"
            data-testid="go-to-page-two"
            onClick={() => {
                // A total with a second page in it. The host steps back onto the last page when the page it is on ran
                // off the end of the list, so a page 2 the totals do not support would be corrected straight away.
                dispatch(pagingActions.listSuccess({ entity: EntityType.CERTIFICATE, totalItems: 20 }));
                dispatch(pagingActions.setPagination({ entity: EntityType.CERTIFICATE, pageNumber: 2, pageSize: 10 }));
                dispatch(pagingActions.setCheckedRows({ entity: EntityType.CERTIFICATE, checkedRows: ['cert-1'] }));
            }}
        >
            Page 2
        </button>
    );
}

function DispatchedActions() {
    const dispatched = useSelector((state: { listViews: ListViewsTestState }) => state.listViews.dispatched);

    return <div data-testid="dispatched">{JSON.stringify(dispatched)}</div>;
}

/**
 * Mounts {@link PagedList} in configurable-column mode with a store built browser-side: only
 * serializable props cross into the page, so a store built in the test body arrives with no state.
 */
export default function PagedListColumnsWithStore({
    rows,
    standardColumns,
    catalogue,
    views = [],
    defaultSort,
    withheldCatalogue = false,
    withheldViews = false,
    initialFilters = [],
    withRefreshControl = false,
    withPagingControl = false,
    withDeferredConfig = false,
}: Props) {
    const [store] = useState(() =>
        createMockStore({
            listViews: {
                byResource: {
                    [Resource.Certificates]: { views, isFetching: withheldViews, hasLoaded: !withheldViews, isMutating: false },
                },
                dispatched: [],
            },
            filters: {
                filters: [
                    {
                        entity: EntityType.CERTIFICATE,
                        filter: {
                            availableFilters: withheldCatalogue ? [] : catalogue,
                            currentFilters: initialFilters,
                            preservedFilters: [],
                            isFetchingFilters: withheldCatalogue,
                            hasLoadedFilters: !withheldCatalogue,
                        },
                    },
                ],
            },
            pagings: {
                pagings: [
                    {
                        entity: EntityType.CERTIFICATE,
                        paging: { totalItems: rows.length, checkedRows: [], isFetchingList: false, pageNumber: 1, pageSize: 10 },
                    },
                ],
            },
        }),
    );

    const [requests, setRequests] = useState<SearchRequestModel[]>([]);
    const [refreshToken, setRefreshToken] = useState(0);

    // Stabilised as a real page's are: the host refetches when its list callback changes identity.
    const onListCallback = useCallback((request: SearchRequestModel) => setRequests((current) => [...current, request]), []);
    const getAvailableFiltersApi = useCallback(() => of(catalogue), [catalogue]);

    const [configReady, setConfigReady] = useState(!withDeferredConfig);

    useEffect(() => {
        if (withDeferredConfig) setConfigReady(true);
    }, [withDeferredConfig]);

    const config = useMemo(
        () =>
            configReady
                ? {
                      resource: Resource.Certificates,
                      standardColumns,
                      rows,
                      getRowId: (row: StubRow) => row.uuid,
                      registry,
                      headerInfo: { [`${FilterFieldSource.Property}:COMMON_NAME`]: <span data-testid="cn-legend">legend</span> },
                      resourceLabel: 'Certificates',
                      defaultSort,
                  }
                : undefined,
        [configReady, standardColumns, rows, defaultSort],
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/certificates/list']}>
                <PagedList
                    entity={EntityType.CERTIFICATE}
                    title="List of Certificates"
                    filterTitle="Certificate Inventory Filter"
                    getAvailableFiltersApi={getAvailableFiltersApi}
                    onListCallback={onListCallback}
                    addHidden
                    configurableColumns={config}
                    refreshToken={refreshToken}
                />

                {withPagingControl && <PagingControl />}

                {withRefreshControl && (
                    <button type="button" data-testid="page-refresh" onClick={() => setRefreshToken((token) => token + 1)}>
                        Refresh
                    </button>
                )}

                <ListRequests requests={requests} />
                <CurrentFilters />
                <DispatchedActions />
            </MemoryRouter>
        </Provider>
    );
}
