import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import CustomTable from './index';
import type { TableDataRow, TableHeader } from './types';

type Props = Readonly<{
    headers: TableHeader[];
    data: TableDataRow[];
    hasCheckboxes?: boolean;
    withTrailingAction?: boolean;
}>;

/**
 * Mounts {@link CustomTable} with a per-header action. The render slot returns elements, which no
 * prop from a Playwright CT test body can carry, so it is defined browser-side instead.
 */
export default function CustomTableHeaderActionWithStore({ headers, data, hasCheckboxes, withTrailingAction }: Props) {
    const [store] = useState(() => createMockStore());

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/roles']}>
                <CustomTable
                    headers={headers}
                    data={data}
                    hasCheckboxes={hasCheckboxes}
                    trailingHeaderAction={withTrailingAction ? <button type="button">Add column</button> : undefined}
                    renderHeaderAction={(header) => (
                        <button type="button" aria-label={`Options for ${header.id}`} data-testid={`action-${header.id}`}>
                            {'\u22ee'}
                        </button>
                    )}
                />
            </MemoryRouter>
        </Provider>
    );
}
