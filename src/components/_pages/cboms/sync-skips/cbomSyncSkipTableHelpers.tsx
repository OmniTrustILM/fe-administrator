import type { ReactNode } from 'react';
import type { TableDataRow, TableHeader } from 'components/CustomTable';
import WidgetButtons, { type WidgetButtonProps } from 'components/WidgetButtons';
import type { EnumItemModel } from 'types/enums';
import { type CbomSyncSkipDto, CbomSyncSkipState } from 'types/openapi';

type PlatformEnumMap = { [key: string]: EnumItemModel } | undefined;

export interface BuildCbomSyncSkipRowsOpts {
    stateEnum: PlatformEnumMap;
    getEnumLabel: (enumMap: PlatformEnumMap, key: string) => string;
    dateFormatter: (date: string | Date) => string;
    /** The row a retry is in flight for. While one is, every row's button refuses a click, not only that row's. */
    retryingUuid?: string;
    onRetry: (skip: CbomSyncSkipDto) => void;
}

/**
 * Fixed columns: the list has no configurable-column pipeline, its rows have one shape. None is sortable, so the list
 * keeps the order the server gives it -- newest failure first -- and a click on a header does not sort the loaded page
 * behind the server's back.
 */
export const CBOM_SYNC_SKIP_HEADERS: TableHeader[] = [
    { id: 'serialNumber', content: 'Serial number', width: '30%' },
    { id: 'version', content: 'Ver.', align: 'center' },
    { id: 'state', content: 'State', align: 'center' },
    { id: 'attempts', content: 'Attempts', align: 'center' },
    { id: 'lastAttemptAt', content: 'Last attempt' },
    { id: 'firstSkippedAt', content: 'First failure' },
    { id: 'reason', content: 'Reason' },
    { id: 'actions', content: 'Actions', align: 'center' },
];

export function buildCbomSyncSkipRows(
    skips: readonly CbomSyncSkipDto[],
    { stateEnum, getEnumLabel, dateFormatter, retryingUuid, onRetry }: BuildCbomSyncSkipRowsOpts,
): TableDataRow[] {
    return skips.map((skip) => ({
        id: skip.uuid,
        columns: [
            <span key="serial" className="break-all">
                {skip.serialNumber}
            </span>,
            skip.version,
            getEnumLabel(stateEnum, skip.state),
            skip.attempts,
            <span key="last" className="whitespace-nowrap">
                {skip.lastAttemptAt ? dateFormatter(skip.lastAttemptAt) : ''}
            </span>,
            <span key="first" className="whitespace-nowrap">
                {skip.firstSkippedAt ? dateFormatter(skip.firstSkippedAt) : ''}
            </span>,
            skip.reason,
            renderActions(skip, retryingUuid, onRetry),
        ],
    }));
}

/** Only a written-off row offers a retry: a retrying row is already on the next run's list. */
function renderActions(skip: CbomSyncSkipDto, retryingUuid: string | undefined, onRetry: (skip: CbomSyncSkipDto) => void): ReactNode {
    if (skip.state !== CbomSyncSkipState.PermanentlySkipped) {
        return null;
    }
    const buttons: WidgetButtonProps[] = [
        {
            id: `retry-${skip.uuid}`,
            icon: 'repeat',
            disabled: retryingUuid !== undefined,
            tooltip: 'Retry on the next sync run',
            disabledTooltip: 'A retry is already in flight',
            onClick: (e) => {
                e.stopPropagation();
                onRetry(skip);
            },
        },
    ];
    return <WidgetButtons key={`actions-${skip.uuid}`} buttons={buttons} justify="center" />;
}
