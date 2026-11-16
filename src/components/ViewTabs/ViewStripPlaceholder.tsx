import Dropdown from 'components/Dropdown';
import SimpleBar from 'components/SimpleBar';
import { ChevronDown } from 'lucide-react';
import type { ColumnDefinition } from 'types/tableColumns';
import { toTabs } from 'utils/listViews';
import type { ColumnSort } from 'utils/tableColumns';
import NewViewButton from './NewViewButton';
import ViewSummaryBar from './ViewSummaryBar';
import ViewTab from './ViewTab';

type Props = Readonly<{
    columns: ColumnDefinition[];
    sort?: ColumnSort;
    /** Whether the strip will open drifted, which makes its summary bar carry the save offer. */
    isDirty: boolean;
    isDrillDown: boolean;
    /** Whether the strip will show Standard, whose save offer is worded differently from a stored view's. */
    isStandard: boolean;
    dataTestId: string;
}>;

const [standardTab] = toTabs([]);
const noop = () => {};

/**
 * Holds the strip's place while it waits for the view list and the catalogue, so the table below does not move
 * when the strip arrives. It is built from the strip's own parts so the two heights agree by construction, and
 * it carries Standard alone: naming a stored view here is exactly what the strip is waiting to do safely.
 * The notices the strip may raise about returned, held or unavailable columns are not reserved.
 */
export default function ViewStripPlaceholder({ columns, sort, isDirty, isDrillDown, isStandard, dataTestId }: Props) {
    return (
        <div className="invisible flex flex-col gap-y-1" aria-hidden="true" inert data-testid={dataTestId}>
            <SimpleBar forceVisible="x">
                <div className="flex items-center gap-x-1">
                    <ViewTab
                        tab={standardTab}
                        isActive
                        isDirty={isDirty}
                        onSelect={noop}
                        dataTestId={`${dataTestId}-tab`}
                        menu={
                            <Dropdown
                                btnStyle="transparent"
                                hideArrow
                                disabled
                                className="pr-1"
                                title={<ChevronDown className="size-4" />}
                            />
                        }
                    />
                    <NewViewButton onClick={noop} disabled dataTestId={`${dataTestId}-new`} />
                </div>
            </SimpleBar>

            <ViewSummaryBar
                columns={columns}
                sort={sort}
                isDirty={isDirty}
                isStandard={isStandard}
                isDrillDown={isDrillDown}
                isBusy={false}
                onRevert={noop}
                onSave={noop}
                dataTestId={`${dataTestId}-summary`}
            />
        </div>
    );
}
