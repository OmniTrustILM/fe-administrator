import { useCallback, useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import CustomTable from './index';
import type { SortDirection, TableDataRow, TableHeader } from './types';

// A server-driven caller refetches when a sort is reported and re-derives its headers once the fetch
// settles, so the table is handed a freshly built array after every click. This harness reproduces
// that from the browser side, where the state driving the re-render actually lives.
export type CustomTableSortRefetchProps = {
    headers: TableHeader[];
    data: TableDataRow[];
    onSortChanged?: (fieldIdentifier: string, direction: SortDirection) => void;
};

function CustomTableSortRefetch({ headers, data, onSortChanged }: Readonly<CustomTableSortRefetchProps>) {
    const [store] = useState(() => createMockStore());
    const [rebuiltHeaders, setRebuiltHeaders] = useState<TableHeader[]>(() => headers.map((header) => ({ ...header })));

    const handleSortChanged = useCallback(
        (fieldIdentifier: string, direction: SortDirection) => {
            onSortChanged?.(fieldIdentifier, direction);
            setRebuiltHeaders(headers.map((header) => ({ ...header })));
        },
        [headers, onSortChanged],
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <CustomTable headers={rebuiltHeaders} data={data} onSortChanged={handleSortChanged} />
            </MemoryRouter>
        </Provider>
    );
}

export default CustomTableSortRefetch;
