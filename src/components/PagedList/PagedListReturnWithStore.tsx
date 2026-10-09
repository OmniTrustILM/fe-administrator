import type { FiltersTestState } from 'ducks/test-reducers';
import { EntityType, actions as filterActions } from 'ducks/filters';
import { actions as pagingActions } from 'ducks/paging';
import { useCallback, useMemo, useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
import { of } from 'rxjs';
import type { SearchFieldListModel, SearchFilterModel, SearchRequestModel } from 'types/certificate';
import type { ListViewModel } from 'types/listViews';
import { Resource } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import { createMockStore } from 'utils/test-helpers';
import ListReturnTracker from './ListReturnTracker';
import PagedList from './PagedList';

export type SecretRow = { uuid: string; name: string };

type Props = Readonly<{
    rows: SecretRow[];
    standardColumns: ColumnDefinition[];
    catalogue: SearchFieldListModel[];
    views: ListViewModel[];
    /** Filters a Dashboard drill-down left pending when the list first mounts. */
    drillDownFilters?: SearchFilterModel[];
    /** What the control standing in for the filter widget sets. */
    typedFilters: SearchFilterModel[];
    /** What a second such control sets, for a user typing a different set of filters afterwards. */
    retypedFilters?: SearchFilterModel[];
    /** The views a control on the detail page replaces the list with, as a change made elsewhere meanwhile does. */
    viewsOnDetail?: ListViewModel[];
    /** How many items the list reports, so that it can have more than one page; the rows on screen by default. */
    totalItems?: number;
}>;

const registry = { 'property:COMMON_NAME': (row: SecretRow) => row.name };

function SecretsFilters() {
    const filters = useSelector(
        (state: { filters: FiltersTestState }) =>
            state.filters.filters.find((entry) => entry.entity === EntityType.SECRET)?.filter.currentFilters ?? [],
    );

    return <div data-testid="current-filters">{JSON.stringify(filters)}</div>;
}

function TypeFilters({ filters, testId }: Readonly<{ filters: SearchFilterModel[]; testId: string }>) {
    const dispatch = useDispatch();

    return (
        <button
            type="button"
            data-testid={testId}
            onClick={() => dispatch(filterActions.setCurrentFilters({ entity: EntityType.SECRET, currentFilters: filters }))}
        >
            Type filters
        </button>
    );
}

function TurnPage({ pageNumber, pageSize, testId }: Readonly<{ pageNumber: number; pageSize: number; testId: string }>) {
    const dispatch = useDispatch();

    return (
        <button
            type="button"
            data-testid={testId}
            onClick={() => dispatch(pagingActions.setPagination({ entity: EntityType.SECRET, pageNumber, pageSize }))}
        >
            Turn page
        </button>
    );
}

/** Lists the same entity under other filters, page and size, as the related-certificate picker does. */
function ListAsPicker() {
    const dispatch = useDispatch();
    const pickerFilters = [{ fieldSource: 'property', fieldIdentifier: 'SUBJECT_TYPE', condition: 'EQUALS', value: 'picker' }];

    return (
        <button
            type="button"
            data-testid="list-as-picker"
            onClick={() => {
                dispatch(
                    filterActions.setCurrentFilters({ entity: EntityType.SECRET, currentFilters: pickerFilters as SearchFilterModel[] }),
                );
                dispatch(pagingActions.setFiltersSnapshot({ entity: EntityType.SECRET, filtersSnapshot: JSON.stringify(pickerFilters) }));
                dispatch(pagingActions.listSuccess({ entity: EntityType.SECRET, totalItems: 3 }));
                dispatch(pagingActions.setPagination({ entity: EntityType.SECRET, pageNumber: 1, pageSize: 50 }));
            }}
        >
            List as picker
        </button>
    );
}

function ReplaceViews({ views }: Readonly<{ views: ListViewModel[] }>) {
    const dispatch = useDispatch();

    return (
        <button
            type="button"
            data-testid="replace-views"
            onClick={() => dispatch({ type: 'listViews/listViewsSuccess', payload: { resource: Resource.Secrets, views } })}
        >
            Replace views
        </button>
    );
}

function SecretsList({
    rows,
    standardColumns,
    catalogue,
    onRequest,
}: Readonly<Pick<Props, 'rows' | 'standardColumns' | 'catalogue'> & { onRequest: (request: SearchRequestModel) => void }>) {
    const getAvailableFiltersApi = useCallback(() => of(catalogue), [catalogue]);
    const config = useMemo(
        () => ({ resource: Resource.Secrets, standardColumns, rows, getRowId: (row: SecretRow) => row.uuid, registry }),
        [standardColumns, rows],
    );

    return (
        <>
            <PagedList
                entity={EntityType.SECRET}
                title="List of Secrets"
                filterTitle="Secret Inventory Filter"
                getAvailableFiltersApi={getAvailableFiltersApi}
                onListCallback={onRequest}
                addHidden
                configurableColumns={config}
            />
            <Link to="/secrets/detail/secret-1" data-testid="open-secret">
                Open secret
            </Link>
            <Link to="/dashboard" data-testid="go-elsewhere">
                Dashboard
            </Link>
        </>
    );
}

/**
 * Mounts a secrets inventory behind real routes, with a detail page inside its scope and a page outside
 * it, so leaving and coming back unmounts the list the way navigating the app does.
 */
export default function PagedListReturnWithStore({
    rows,
    standardColumns,
    catalogue,
    views,
    drillDownFilters,
    typedFilters,
    retypedFilters,
    viewsOnDetail,
    totalItems = rows.length,
}: Props) {
    const [store] = useState(() =>
        createMockStore({
            listViews: {
                byResource: { [Resource.Secrets]: { views, isFetching: false, hasLoaded: true, isMutating: false } },
                dispatched: [],
            },
            filters: {
                filters: [
                    {
                        entity: EntityType.SECRET,
                        filter: {
                            availableFilters: catalogue,
                            currentFilters: drillDownFilters ?? [],
                            isFetchingFilters: false,
                            hasLoadedFilters: true,
                            hasFailedFilters: false,
                            handedIn: drillDownFilters ? { source: 'drill-down' as const, scope: '/secrets' } : undefined,
                        },
                    },
                ],
            },
            pagings: {
                pagings: [
                    {
                        entity: EntityType.SECRET,
                        paging: { totalItems, checkedRows: [], isFetchingList: false, pageNumber: 1, pageSize: 10 },
                    },
                ],
            },
        }),
    );
    const [requests, setRequests] = useState<SearchRequestModel[]>([]);
    const onRequest = useCallback((request: SearchRequestModel) => setRequests((current) => [...current, request]), []);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/secrets']}>
                <ListReturnTracker />
                <Routes>
                    <Route
                        path="/secrets"
                        element={<SecretsList rows={rows} standardColumns={standardColumns} catalogue={catalogue} onRequest={onRequest} />}
                    />
                    <Route
                        path="/secrets/detail/:id"
                        element={
                            <>
                                <Link to="/secrets" data-testid="back-to-list">
                                    Back
                                </Link>
                                {viewsOnDetail && <ReplaceViews views={viewsOnDetail} />}
                                <ListAsPicker />
                            </>
                        }
                    />
                    <Route
                        path="/dashboard"
                        element={
                            <Link to="/secrets" data-testid="open-secrets">
                                Secrets
                            </Link>
                        }
                    />
                </Routes>
                <TypeFilters filters={typedFilters} testId="type-filters" />
                <TurnPage pageNumber={2} pageSize={20} testId="turn-page" />
                {retypedFilters && <TypeFilters filters={retypedFilters} testId="retype-filters" />}
                <SecretsFilters />
                <div data-testid="list-requests">{JSON.stringify(requests)}</div>
            </MemoryRouter>
        </Provider>
    );
}
