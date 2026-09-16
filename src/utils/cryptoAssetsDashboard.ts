import type { ColorOptions } from 'components/_pages/dashboard/DashboardItem/DonutChart';
import type { SearchFieldListModel, SearchFilterModel } from 'types/certificate';
import {
    type CryptographicAssetSyncCompletenessDto,
    FilterConditionOperator,
    FilterFieldSource,
    PqcVerdict,
    type SearchFieldDataDto,
} from 'types/openapi';

export const CRYPTO_ASSET_FILTER_FIELDS = {
    type: 'CBOM_ASSET_TYPE',
    pqcVerdict: 'CBOM_ASSET_PQC_VERDICT',
    algorithmFamily: 'CBOM_ASSET_ALGORITHM_FAMILY',
} as const;

// Verdict series wear the status hexes the certificate charts already use, so a segment matches its badge and
// stays legible on both chart surfaces.
export const PQC_VERDICT_CHART_COLORS: Record<string, string> = {
    [PqcVerdict.Ready]: '#12a393',
    [PqcVerdict.NotReady]: '#EF4444',
    [PqcVerdict.Unknown]: '#b68b06',
    [PqcVerdict.NotApplicable]: '#6c757d',
};

const FALLBACK_SERIES_COLOR = '#6c757d';

export function getPqcVerdictChartColors(statByPqcVerdict?: Record<string, number>): ColorOptions {
    return {
        colors: Object.keys(statByPqcVerdict ?? {}).map((code) => PQC_VERDICT_CHART_COLORS[code] ?? FALLBACK_SERIES_COLOR),
    };
}

function findFilterField(availableFilters: SearchFieldListModel[], fieldIdentifier: string): SearchFieldDataDto | undefined {
    return availableFilters.flatMap((group) => group.searchFieldData ?? []).find((field) => field.fieldIdentifier === fieldIdentifier);
}

// No field, no filter: landing on the unfiltered inventory beats sending a filter the server would reject.
export function buildEqualsFilter(availableFilters: SearchFieldListModel[], fieldIdentifier: string, value: string): SearchFilterModel[] {
    if (!findFilterField(availableFilters, fieldIdentifier)) return [];
    return [
        {
            fieldSource: FilterFieldSource.Property,
            condition: FilterConditionOperator.Equals,
            fieldIdentifier,
            value: [value],
        },
    ];
}

export function buildEmptyFilter(availableFilters: SearchFieldListModel[], fieldIdentifier: string): SearchFilterModel[] {
    if (!findFilterField(availableFilters, fieldIdentifier)) return [];
    return [
        {
            fieldSource: FilterFieldSource.Property,
            condition: FilterConditionOperator.Empty,
            fieldIdentifier,
            value: [''],
        },
    ];
}

export type SyncCompleteness = {
    total: number;
    synced: number;
    isComplete: boolean;
    states: { code: string; count: number }[];
    lastCompletedSyncAt?: string;
};

const SYNCED_STATE_CODE = 'synced';

export function summarizeSyncCompleteness(completeness?: CryptographicAssetSyncCompletenessDto): SyncCompleteness {
    const states = Object.entries(completeness?.cbomStatBySyncState ?? {}).map(([code, count]) => ({ code, count }));
    const total = states.reduce((sum, state) => sum + state.count, 0);
    const synced = states.find((state) => state.code.toLowerCase() === SYNCED_STATE_CODE)?.count ?? 0;

    return {
        total,
        synced,
        // An estate nobody has synced yet is not complete, however empty it is.
        isComplete: total > 0 && synced === total,
        states,
        lastCompletedSyncAt: completeness?.lastCompletedSyncAt,
    };
}

export function formatShareOfEstate(count?: number, total?: number): string | undefined {
    if (!count || !total) return undefined;
    return `${((count / total) * 100).toFixed(1)}% of the estate`;
}
