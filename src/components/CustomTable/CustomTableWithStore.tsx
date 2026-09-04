import { useState } from 'react';
import { Provider, useSelector } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { selectors as tablePaginationSelectors } from 'ducks/table-pagination';
import { createMockStore } from 'utils/test-helpers';
import CustomTable from './index';
import type { SortDirection, TableDataRow, TableHeader } from './types';

// A store built in a Playwright CT test body never reaches the browser — only serializable props
// cross that boundary — so a preloaded `tablePagination` slice is silently dropped and the table
// mounts with no persisted sort. This wrapper builds the store on the browser side instead, which
// is what lets a test exercise the hydration path at all.
export type CustomTableWithStoreProps = {
    headers: TableHeader[];
    data: TableDataRow[];
    paginationPersistKey?: string;
    initialRoute?: string;
    persistedSortColumn?: string;
    persistedSortDirection?: SortDirection;
    onSortChanged?: (fieldIdentifier: string, direction: SortDirection) => void;
    /** Passed straight through, so a test can exercise the caller-owned-sort path. */
    persistSort?: boolean;
};

/** Renders what persistence currently holds, which is how a test asserts a write it cannot see. */
function PersistedSortProbe({ storageKey }: Readonly<{ storageKey: string }>) {
    const persisted = useSelector(tablePaginationSelectors.pagination(storageKey));
    return <div data-testid="persisted-sort">{persisted.sortColumn ? `${persisted.sortColumn}:${persisted.sortDirection}` : 'none'}</div>;
}

function CustomTableWithStore({
    headers,
    data,
    paginationPersistKey = 'roles',
    initialRoute = '/roles',
    persistedSortColumn,
    persistedSortDirection,
    onSortChanged,
    persistSort,
}: Readonly<CustomTableWithStoreProps>) {
    const storageKey = `custom-table-persistent:${paginationPersistKey}`;
    const [store] = useState(() =>
        createMockStore({
            tablePagination: {
                byKey: {
                    [storageKey]: {
                        page: 1,
                        pageSize: 10,
                        ...(persistedSortColumn ? { sortColumn: persistedSortColumn } : {}),
                        ...(persistedSortDirection ? { sortDirection: persistedSortDirection } : {}),
                    },
                },
                activeRootRoute: initialRoute.split('/')[1],
            },
        }),
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[initialRoute]}>
                <CustomTable
                    headers={headers}
                    data={data}
                    hasPagination={true}
                    paginationPersistKey={paginationPersistKey}
                    onSortChanged={onSortChanged}
                    persistSort={persistSort}
                />
                <PersistedSortProbe storageKey={storageKey} />
            </MemoryRouter>
        </Provider>
    );
}

export default CustomTableWithStore;
