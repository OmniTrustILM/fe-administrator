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
import { createMockStore } from 'utils/test-helpers';
import PagedList from './PagedList';

/** A listing entry of the shape the pipeline reads: identity, a value per column, projected values. */
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
    /** The stored views of the resource, preloaded because a component test runs no epics. */
    views?: ListViewModel[];
    /** Withholds the catalogue, which is what the strip waits for before rendering at all. */
    withheldCatalogue?: boolean;
    /**
     * Filters already in the duck when the host mounts, as a dashboard link or a deep link from a
     * detail page leaves them - i.e. before the strip has opened its pinned view.
     */
    initialFilters?: SearchFilterModel[];
    /** Renders a control that bumps `refreshToken`, standing in for a page's own post-create refresh. */
    withRefreshControl?: boolean;
    /**
     * Renders a control that moves the listing to page 2 with a row selected, for asserting what resets
     * them. Preloading the duck instead proves nothing: applying the opening view is itself a reset, so
     * the host is back on page 1 with nothing checked before a test can act.
     */
    withPagingControl?: boolean;
    /**
     * Mounts with no column configuration at all and supplies it one tick later, which is how a real
     * page behaves: the configuration depends on a catalogue the page is still fetching when it mounts.
     */
    withDeferredConfig?: boolean;
}>;

const registry: CellRegistry<StubRow> = {
    'property:COMMON_NAME': (row) => row.commonName,
    'property:NOT_AFTER': (row) => row.notAfter,
};

/** Every listing request the host has made, which is what a no-epic test can observe of the fetch. */
function ListRequests({ requests }: Readonly<{ requests: SearchRequestModel[] }>) {
    return <div data-testid="list-requests">{JSON.stringify(requests)}</div>;
}

/** The filters the host has put into the filters duck, which is where a view's filters land. */
function CurrentFilters() {
    const filters = useSelector(
        (state: { filters: FiltersTestState }) =>
            state.filters.filters.find((entry) => entry.entity === EntityType.CERTIFICATE)?.filter.currentFilters ?? [],
    );

    return <div data-testid="current-filters">{JSON.stringify(filters)}</div>;
}

/**
 * Moves the listing to page 2 with a row selected. A test clicks this after the opening view has
 * applied, so what it asserts afterwards is the reset under test rather than that first application.
 */
function PagingControl() {
    const dispatch = useDispatch();

    return (
        <button
            type="button"
            data-testid="go-to-page-two"
            onClick={() => {
                dispatch(pagingActions.setPagination({ entity: EntityType.CERTIFICATE, pageNumber: 2, pageSize: 10 }));
                dispatch(pagingActions.setCheckedRows({ entity: EntityType.CERTIFICATE, checkedRows: ['cert-1'] }));
            }}
        >
            Page 2
        </button>
    );
}

/** The listViews actions the strip has dispatched, which is all a no-epic test can observe of them. */
function DispatchedActions() {
    const dispatched = useSelector((state: { listViews: ListViewsTestState }) => state.listViews.dispatched);

    return <div data-testid="dispatched">{JSON.stringify(dispatched)}</div>;
}

/**
 * Mounts {@link PagedList} in its configurable-column mode with a store built browser-side: only
 * serializable props cross into the page, so a store created in the test body arrives with none of
 * its preloaded state and the strip would never see the views or the catalogue.
 *
 * The requests the host makes are collected rather than answered — the pipeline's own behaviour is
 * what each column, filter and ordering ends up in the request, not what comes back.
 */
export default function PagedListColumnsWithStore({
    rows,
    standardColumns,
    catalogue,
    views = [],
    withheldCatalogue = false,
    initialFilters = [],
    withRefreshControl = false,
    withPagingControl = false,
    withDeferredConfig = false,
}: Props) {
    const [store] = useState(() =>
        createMockStore({
            listViews: {
                byResource: { [Resource.Certificates]: { views, isFetching: false, hasLoaded: true, isMutating: false } },
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

    // Both callbacks are stabilised, as a real page's are: an inline arrow changes identity on every
    // render, and the host refetches when its list callback changes.
    const onListCallback = useCallback((request: SearchRequestModel) => setRequests((current) => [...current, request]), []);
    const getAvailableFiltersApi = useCallback(() => of(catalogue), [catalogue]);

    // A page whose configuration depends on a catalogue it is still fetching passes none on the first
    // render. Deferring it by an effect rather than by a prop is what reproduces that ordering.
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
                  }
                : undefined,
        [configReady, standardColumns, rows],
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
