import { useState } from 'react';
import type { SearchFieldDataByGroupDto } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import ColumnPicker from './index';

type Props = Readonly<{
    columns: ColumnDefinition[];
    standardColumns?: ColumnDefinition[];
    catalogue: SearchFieldDataByGroupDto[];
    /** Withholds the catalogue until released, so a test can make it land after the dialog opened. */
    withheldCatalogue?: boolean;
    onSave?: (columns: ColumnDefinition[]) => void;
}>;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * Drives {@link ColumnPicker} through prop changes that a component test cannot produce with
 * `component.update()`, because the dialog renders into a portal and updating unmounts it.
 *
 * Every render hands the picker freshly cloned props, which is what a caller re-rendering from a
 * selector does. The dialog is expected to keep the working copy across that.
 */
export default function ColumnPickerTestWrapper({ columns, standardColumns = [], catalogue, withheldCatalogue = false, onSave }: Props) {
    const [isReleased, setIsReleased] = useState(!withheldCatalogue);
    const [nonce, setNonce] = useState(0);

    return (
        <div>
            <button type="button" data-testid="wrapper-rerender" onClick={() => setNonce((current) => current + 1)}>
                {`rerender ${nonce}`}
            </button>
            <button type="button" data-testid="wrapper-release-catalogue" onClick={() => setIsReleased(true)}>
                release catalogue
            </button>
            <ColumnPicker
                isOpen
                onClose={() => {}}
                onSave={onSave ?? (() => {})}
                catalogue={isReleased ? clone(catalogue) : []}
                columns={clone(columns)}
                standardColumns={clone(standardColumns)}
                resourceLabel="Certificates"
            />
        </div>
    );
}
