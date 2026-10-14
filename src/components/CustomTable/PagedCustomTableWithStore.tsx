import { selectors as tablePaginationSelectors } from 'ducks/table-pagination';
import { useEffect, useState } from 'react';
import { Provider, useSelector } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import PagedCustomTable from './PagedCustomTable';
import type { TableDataRow, TableHeader } from './types';

const STATE_KEY = 'discovered-certificates';
const OTHER_STATE_KEY = 'discovered-keys';
const storageKey = (stateKey: string) => `paged-custom-table-pagination:${stateKey}`;
const selectStored = tablePaginationSelectors.pagination(storageKey(STATE_KEY));
const selectOtherStored = tablePaginationSelectors.pagination(storageKey(OTHER_STATE_KEY));

const headers: TableHeader[] = [{ id: 'name', content: 'Name' }];
const data: TableDataRow[] = [{ id: 1, columns: ['Row 1'] }];

export type PagedCustomTableWithStoreProps = Readonly<{
    storedPage?: number;
    otherStoredPage?: number;
    /** Replaces the table once right after it mounts, as a page does when it re-reads the object it shows. */
    replaceOnMount?: boolean;
}>;

function Tables({ replaceOnMount }: Readonly<{ replaceOnMount: boolean }>) {
    const stored = useSelector(selectStored);
    const otherStored = useSelector(selectOtherStored);
    const [stateKey, setStateKey] = useState(STATE_KEY);
    const [loadedPages, setLoadedPages] = useState<number[]>([]);
    const [loadedFor, setLoadedFor] = useState<string[]>([]);
    const [isReplaced, setIsReplaced] = useState(false);

    useEffect(() => {
        if (replaceOnMount) setIsReplaced(true);
    }, [replaceOnMount]);

    return (
        <>
            <PagedCustomTable
                key={isReplaced ? 'replacement' : 'first'}
                stateKey={stateKey}
                headers={headers}
                data={data}
                totalItems={25}
                onReloadData={(_, pageNumber) => {
                    setLoadedPages((pages) => [...pages, pageNumber]);
                    setLoadedFor((keys) => [...keys, stateKey]);
                }}
            />
            <output data-testid="loaded-pages">{loadedPages.join(', ')}</output>
            <output data-testid="loaded-for">{loadedFor.join(', ')}</output>
            <output data-testid="stored-page">{stored.page}</output>
            <output data-testid="other-stored-page">{otherStored.page}</output>
            <button type="button" onClick={() => setStateKey(OTHER_STATE_KEY)}>
                Other table
            </button>
        </>
    );
}

export default function PagedCustomTableWithStore({
    storedPage = 1,
    otherStoredPage = 1,
    replaceOnMount = false,
}: PagedCustomTableWithStoreProps) {
    const [store] = useState(() =>
        createMockStore({
            tablePagination: {
                byKey: {
                    [storageKey(STATE_KEY)]: { page: storedPage, pageSize: 10 },
                    [storageKey(OTHER_STATE_KEY)]: { page: otherStoredPage, pageSize: 10 },
                },
            },
        }),
    );

    return (
        <Provider store={store}>
            <MemoryRouter>
                <Tables replaceOnMount={replaceOnMount} />
            </MemoryRouter>
        </Provider>
    );
}
