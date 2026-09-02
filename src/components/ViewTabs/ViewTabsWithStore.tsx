import type { ListViewsTestState } from 'ducks/test-reducers';
import { useState } from 'react';
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
    /** Withholds the catalogue until released, so a test can make it land after the views did. */
    withheldCatalogue?: boolean;
    /** Passed straight through, so a test can say the catalogue read has settled on nothing. */
    isCatalogueLoaded?: boolean;
    /** What the drift buttons below change, i.e. an edit the page made outside the view. */
    driftColumn?: ColumnDefinition;
    driftSort?: ColumnSort;
    driftFilter?: SearchFilterModel;
}>;

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
    withheldCatalogue = false,
    isCatalogueLoaded,
    driftColumn,
    driftSort,
    driftFilter,
}: Props) {
    const [store] = useState(() =>
        createMockStore({
            listViews: {
                byResource: { [resource]: { views, isFetching: !hasLoaded, hasLoaded, isMutating } },
                dispatched: [],
            },
        }),
    );

    const [slice, setSlice] = useState<ViewSlice>({ columns: standardColumns, filters: [], sort: undefined });
    const [isCatalogueReleased, setIsCatalogueReleased] = useState(!withheldCatalogue);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/certificates']}>
                <ViewTabs
                    resource={resource}
                    catalogue={isCatalogueReleased ? catalogue : []}
                    isCatalogueLoaded={isCatalogueReleased ? isCatalogueLoaded : false}
                    standardColumns={standardColumns}
                    columns={slice.columns}
                    filters={slice.filters}
                    sort={slice.sort}
                    onApply={setSlice}
                    resourceLabel="Certificates"
                />

                <div data-testid="applied-slice">{JSON.stringify(slice)}</div>
                <DispatchedActions />

                <button type="button" data-testid="release-catalogue" onClick={() => setIsCatalogueReleased(true)}>
                    release the catalogue
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
            </MemoryRouter>
        </Provider>
    );
}
