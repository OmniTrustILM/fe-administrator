import { toggleColumn } from 'components/PagedList/columnState';
import { useState } from 'react';
import type { ColumnDefinition, SourcedCatalogueField } from 'types/tableColumns';
import { getColumnKey } from 'utils/tableColumns';
import AddColumnMenu from './index';

type Props = Readonly<{
    fields: SourcedCatalogueField[];
    columns: ColumnDefinition[];
    isCatalogueLoaded?: boolean;
    /** False mounts the menu as its host leaves it while the page is still settling. */
    canToggle?: boolean;
    /** The platform column set the reset entry goes back to; absent withholds the entry. */
    standardColumns?: ColumnDefinition[];
}>;

/**
 * Drives {@link AddColumnMenu} from the browser side, as its host does. A test cannot re-render it
 * from the Node body: the menu is a portal, and `component.update()` would unmount it mid-assertion.
 */
export default function AddColumnMenuHarness({ fields, columns, isCatalogueLoaded, canToggle = true, standardColumns }: Props) {
    const [applied, setApplied] = useState(columns);

    return (
        <div>
            <AddColumnMenu
                fields={fields}
                isCatalogueLoaded={isCatalogueLoaded}
                columns={applied}
                onToggle={canToggle ? (field) => setApplied((current) => toggleColumn(current, field)) : undefined}
                onReset={canToggle && standardColumns ? () => setApplied(standardColumns) : undefined}
            />
            <div data-testid="applied-columns">{JSON.stringify(applied.map(getColumnKey))}</div>
        </div>
    );
}
