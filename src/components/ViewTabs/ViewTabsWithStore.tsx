import type { HandedInFilters } from 'ducks/filters';
import type { ListViewsTestState } from 'ducks/test-reducers';
import { useMemo, useState } from 'react';
import { Provider, useSelector } from 'react-redux';
import { MemoryRouter } from 'react-router';
import type { SearchFilterModel } from 'types/certificate';
import type { ListViewModel, ViewSlice } from 'types/listViews';
import type { Resource, SearchFieldDataByGroupDto } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import type { ColumnSort } from 'utils/tableColumns';
import { createMockStore } from 'utils/test-helpers';
import ViewTabs from './index';

type Props = Readonly<{
    resource: Resource;
    /** The stored views of the resource, preloaded because a component test runs no epics. */
    views: ListViewModel[];
    catalogue: SearchFieldDataByGroupDto[];
    standardColumns: ColumnDefinition[];
    /** Preloads a mutation as in flight, which is what holds the strip's own actions. */
    isMutating?: boolean;
    /** Preloads the list read as still in flight, which is what the strip waits for before rendering. */
    hasLoaded?: boolean;
    /** Preloads a list from an earlier visit with the read that replaces it still in flight. */
    isRefreshing?: boolean;
    /** What the in-flight list read answers with, once `simulate-list-success` is pressed. */
    refreshedViews?: ListViewModel[];
    /** Withholds the catalogue until released, so a test can make it land after the views did. */
    withheldCatalogue?: boolean;
    /** The catalogue a later read answers with once `swap-catalogue` is pressed, and pressing it again goes back. */
    laterCatalogue?: SearchFieldDataByGroupDto[];
    /** The catalogues later reads answer with, one per press of `next-catalogue`, the last one standing. */
    catalogueSequence?: SearchFieldDataByGroupDto[][];
    /** Drops an applied ordering on a column the applied slice does not show, as PagedList does. */
    dropsUnshownSort?: boolean;
    /** Attribute column keys an earlier visit saw without their field. */
    dormantFields?: string[];
    /** Passed straight through, so a test can say the catalogue read has settled on nothing. */
    isCatalogueLoaded?: boolean;
    /** As an array: a `Set` does not survive the props boundary. */
    renderableProperties?: string[];
    /** What the drift buttons below change, i.e. an edit the page made outside the view. */
    driftColumn?: ColumnDefinition;
    driftSort?: ColumnSort;
    driftFilter?: SearchFilterModel;
    /** Added beside the filters already applied, where `driftFilter` replaces them. */
    driftAddedFilter?: SearchFilterModel;
    /** Opens as a return from a detail page to this view, with the filters the list held when it was left. */
    returnTo?: { viewId: string; filters: SearchFilterModel[] };
}>;

const withShownSort = (slice: ViewSlice): ViewSlice => {
    const { sort } = slice;
    const isShown = slice.columns.some(
        (column) => column.fieldSource === sort?.fieldSource && column.fieldIdentifier === sort?.fieldIdentifier,
    );
    return sort && !isShown ? { ...slice, sort: undefined } : slice;
};

/** The listViews actions the strip has dispatched, which is all a no-epic test can observe of them. */
function DispatchedActions() {
    const dispatched = useSelector((state: { listViews: ListViewsTestState }) => state.listViews.dispatched);

    return <div data-testid="dispatched">{JSON.stringify(dispatched)}</div>;
}

/**
 * Stands in for the list page around {@link ViewTabs}: it owns the slice the table is showing, hands
 * it back to the strip as props, and adopts whatever a view applies.
 *
 * The store is built here rather than in the test body because only serializable props cross into the
 * browser — a store created in Node arrives with none of its preloaded state. Holding it in `useState`
 * keeps one store across the re-renders applying a view causes, so the dispatched log survives them.
 */
export default function ViewTabsWithStore({
    resource,
    views,
    catalogue,
    standardColumns,
    isMutating = false,
    hasLoaded = true,
    isRefreshing = false,
    refreshedViews = [],
    withheldCatalogue = false,
    laterCatalogue,
    catalogueSequence = [],
    dropsUnshownSort = false,
    dormantFields,
    isCatalogueLoaded,
    renderableProperties,
    driftColumn,
    driftSort,
    driftFilter,
    driftAddedFilter,
    returnTo,
}: Props) {
    const [store] = useState(() =>
        createMockStore({
            listViews: {
                byResource: { [resource]: { views, isFetching: !hasLoaded || isRefreshing, hasLoaded, isMutating } },
                ...(dormantFields ? { dormantFields: { [resource]: dormantFields } } : {}),
                dispatched: [],
            },
        }),
    );

    const [slice, setSlice] = useState<ViewSlice>({ columns: standardColumns, filters: returnTo?.filters ?? [], sort: undefined });
    const [handedIn] = useState<HandedInFilters | undefined>(() =>
        returnTo ? { source: 'return', position: { viewId: returnTo.viewId, isDrillDown: false } } : undefined,
    );
    const [isCatalogueReleased, setIsCatalogueReleased] = useState(!withheldCatalogue);
    const [isCatalogueSwapped, setIsCatalogueSwapped] = useState(false);
    const [mountKey, setMountKey] = useState(0);
    const [catalogueStep, setCatalogueStep] = useState(0);
    const swappedCatalogue = isCatalogueSwapped && laterCatalogue ? laterCatalogue : catalogue;
    const liveCatalogue = catalogueStep > 0 ? catalogueSequence[Math.min(catalogueStep, catalogueSequence.length) - 1] : swappedCatalogue;
    const gate = useMemo(() => (renderableProperties ? new Set(renderableProperties) : undefined), [renderableProperties]);

    const answerUpdate = () => {
        const { listViews } = store.getState();
        const update = listViews.dispatched.filter((each) => each.type === 'listViews/updateView').at(-1);
        const uuid = (update?.payload as { uuid?: string } | undefined)?.uuid;
        const row = listViews.byResource[resource]?.views.find((each) => each.uuid === uuid);
        if (row) store.dispatch({ type: 'listViews/updateViewSuccess', payload: { resource, view: row } });
    };

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/certificates']}>
                <ViewTabs
                    key={mountKey}
                    resource={resource}
                    catalogue={isCatalogueReleased ? liveCatalogue : []}
                    isCatalogueLoaded={isCatalogueReleased ? isCatalogueLoaded : false}
                    standardColumns={standardColumns}
                    renderableProperties={gate}
                    columns={slice.columns}
                    filters={slice.filters}
                    sort={slice.sort}
                    handedIn={handedIn}
                    onApply={(next) => setSlice(dropsUnshownSort ? withShownSort(next) : next)}
                />

                <div data-testid="applied-slice">{JSON.stringify(slice)}</div>
                <DispatchedActions />

                <button type="button" data-testid="swap-catalogue" onClick={() => setIsCatalogueSwapped((current) => !current)}>
                    answer another catalogue read
                </button>

                <button type="button" data-testid="next-catalogue" onClick={() => setCatalogueStep((current) => current + 1)}>
                    answer the next catalogue read
                </button>

                <button type="button" data-testid="remount-strip" onClick={() => setMountKey((current) => current + 1)}>
                    leave the page and come back
                </button>

                <button type="button" data-testid="release-catalogue" onClick={() => setIsCatalogueReleased(true)}>
                    release the catalogue
                </button>

                <button
                    type="button"
                    data-testid="simulate-list-set-aside"
                    onClick={() => store.dispatch({ type: 'listViews/listViewsSuccess', payload: { resource, views: [], stale: true } })}
                >
                    set the list read aside
                </button>

                <button
                    type="button"
                    data-testid="simulate-list-success"
                    onClick={() => store.dispatch({ type: 'listViews/listViewsSuccess', payload: { resource, views: refreshedViews } })}
                >
                    answer the list read
                </button>

                {/* Stands in for the epic (a component test runs none): answers the create in flight
                    with the uuid the API would have assigned, or with the failure that rolls it back. */}
                <button
                    type="button"
                    data-testid="simulate-create-success"
                    onClick={() => {
                        const pending = store.getState().listViews.byResource[resource]?.views.find((view) => view.uuid === 'pending-view');
                        if (pending) {
                            store.dispatch({
                                type: 'listViews/createViewSuccess',
                                payload: { resource, view: { ...pending, uuid: 'view-created' } },
                            });
                        }
                    }}
                >
                    answer the create
                </button>

                <button
                    type="button"
                    data-testid="simulate-create-failure"
                    onClick={() =>
                        store.dispatch({
                            type: 'listViews/createViewFailure',
                            payload: { resource, error: 'Name already used' },
                        })
                    }
                >
                    fail the create
                </button>

                <button type="button" data-testid="simulate-update-success" onClick={answerUpdate}>
                    answer the update
                </button>

                <button
                    type="button"
                    data-testid="simulate-update-success-with-next-catalogue"
                    onClick={() => {
                        answerUpdate();
                        setCatalogueStep((current) => current + 1);
                    }}
                >
                    answer the update and the next catalogue read together
                </button>

                <button
                    type="button"
                    data-testid="simulate-unrelated-read-failure"
                    onClick={() =>
                        store.dispatch({ type: 'listViews/listViewsFailure', payload: { resource: 'keys', error: 'Could not be read' } })
                    }
                >
                    fail a read of another resource
                </button>

                <button
                    type="button"
                    data-testid="simulate-update-failure"
                    onClick={() =>
                        store.dispatch({ type: 'listViews/updateViewFailure', payload: { resource, error: 'Could not be saved' } })
                    }
                >
                    fail the update
                </button>

                <button
                    type="button"
                    data-testid="simulate-delete-failure"
                    onClick={() =>
                        store.dispatch({
                            type: 'listViews/deleteViewFailure',
                            payload: { resource, error: 'Could not be deleted' },
                        })
                    }
                >
                    fail the delete
                </button>

                <button
                    type="button"
                    data-testid="drift-columns"
                    onClick={() => setSlice((current) => ({ ...current, columns: [...current.columns, driftColumn as ColumnDefinition] }))}
                >
                    add a column
                </button>
                <button
                    type="button"
                    data-testid="drift-drop-last-column"
                    onClick={() => setSlice((current) => ({ ...current, columns: current.columns.slice(0, -1) }))}
                >
                    remove the last column
                </button>
                <button type="button" data-testid="drift-sort" onClick={() => setSlice((current) => ({ ...current, sort: driftSort }))}>
                    sort the table
                </button>
                <button
                    type="button"
                    data-testid="drift-filter"
                    onClick={() => setSlice((current) => ({ ...current, filters: [driftFilter as SearchFilterModel] }))}
                >
                    filter the table
                </button>
                <button
                    type="button"
                    data-testid="drift-add-filter"
                    onClick={() =>
                        setSlice((current) => ({ ...current, filters: [...current.filters, driftAddedFilter as SearchFilterModel] }))
                    }
                >
                    add a filter
                </button>
            </MemoryRouter>
        </Provider>
    );
}
