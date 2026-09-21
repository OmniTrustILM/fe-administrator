import { toggleColumn } from 'components/PagedList/columnState';
import { useState } from 'react';
import type { ColumnDefinition, SourcedCatalogueField } from 'types/tableColumns';
import { getColumnKey } from 'utils/tableColumns';
import AddColumnMenu from './index';

type Props = Readonly<{
    fields: SourcedCatalogueField[];
    columns: ColumnDefinition[];
    isCatalogueLoaded?: boolean;
    withEditColumns?: boolean;
}>;

/**
 * Drives {@link AddColumnMenu} from the browser side, as its host does. A test cannot re-render it
 * from the Node body: the menu is a portal, and `component.update()` would unmount it mid-assertion.
 */
export default function AddColumnMenuHarness({ fields, columns, isCatalogueLoaded, withEditColumns = false }: Props) {
    const [applied, setApplied] = useState(columns);
    const [editCount, setEditCount] = useState(0);

    return (
        <div>
            <AddColumnMenu
                fields={fields}
                isCatalogueLoaded={isCatalogueLoaded}
                columns={applied}
                onToggle={(field) => setApplied((current) => toggleColumn(current, field))}
                onEditColumns={withEditColumns ? () => setEditCount((count) => count + 1) : undefined}
            />
            <div data-testid="applied-columns">{JSON.stringify(applied.map(getColumnKey))}</div>
            <div data-testid="edit-columns-count">{editCount}</div>
        </div>
    );
}
