import type { ColorOptions } from 'components/_pages/dashboard/DashboardItem/DonutChart';
import type { SearchFilterModel } from 'types/certificate';
import {
    CbomAssetSyncState,
    type CryptographicAssetSyncCompletenessDto,
    FilterConditionOperator,
    FilterFieldSource,
    PqcVerdict,
} from 'types/openapi';

export const CRYPTO_ASSET_FILTER_FIELDS = {
    type: 'CBOM_ASSET_TYPE',
    pqcVerdict: 'CBOM_ASSET_PQC_VERDICT',
    algorithmFamily: 'CBOM_ASSET_ALGORITHM_FAMILY',
} as const;

export function dashboardFilterLink(path: string, selection: string): string {
    return `${path}?${new URLSearchParams({ dashboardFilter: selection })}`;
}

export function parseCbomDashboardFilter(search: string): SearchFilterModel[] | undefined {
    const selection = new URLSearchParams(search).get('dashboardFilter');
    if (selection === 'contributed') {
        return [
            {
                fieldSource: FilterFieldSource.Property,
                condition: FilterConditionOperator.Equals,
                fieldIdentifier: 'CBOM_HAS_CONTRIBUTED_ASSETS',
                value: true,
            },
        ];
    }

    const syncState = selection?.startsWith('sync:') ? selection.slice('sync:'.length) : undefined;
    return syncState ? buildEqualsFilter('CBOM_ASSET_SYNC_STATE', syncState) : undefined;
}

export function parseAssetDashboardFilter(search: string): SearchFilterModel[] | undefined {
    const selection = new URLSearchParams(search).get('dashboardFilter');
    if (selection === 'no-family') return buildEmptyFilter(CRYPTO_ASSET_FILTER_FIELDS.algorithmFamily);
    if (selection === 'not-ready') return buildEqualsFilter(CRYPTO_ASSET_FILTER_FIELDS.pqcVerdict, PqcVerdict.NotReady);
    if (selection === 'all') return [];
    return undefined;
}

// Verdict series wear the status hexes the certificate charts already use, so a segment matches its badge and
// stays legible on both chart surfaces.
export const PQC_VERDICT_CHART_COLORS: Record<string, string> = {
    [PqcVerdict.Ready]: '#12a393',
    [PqcVerdict.NotReady]: '#EF4444',
    [PqcVerdict.Unknown]: '#b68b06',
    [PqcVerdict.NotApplicable]: '#6c757d',
};

export const FALLBACK_SERIES_COLOR = '#6c757d';

export function getPqcVerdictChartColors(statByPqcVerdict?: Record<string, number>): ColorOptions {
    return {
        colors: Object.keys(statByPqcVerdict ?? {}).map((code) => PQC_VERDICT_CHART_COLORS[code] ?? FALLBACK_SERIES_COLOR),
    };
}

export function buildEqualsFilter(fieldIdentifier: string, value: string): SearchFilterModel[] {
    return [
        {
            fieldSource: FilterFieldSource.Property,
            condition: FilterConditionOperator.Equals,
            fieldIdentifier,
            value: [value],
        },
    ];
}

export function buildEmptyFilter(fieldIdentifier: string): SearchFilterModel[] {
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

export function summarizeSyncCompleteness(completeness?: CryptographicAssetSyncCompletenessDto): SyncCompleteness {
    const states = Object.entries(completeness?.cbomStatBySyncState ?? {}).map(([code, count]) => ({ code, count }));
    const total = states.reduce((sum, state) => sum + state.count, 0);
    const synced = states.find((state) => state.code === CbomAssetSyncState.Synced)?.count ?? 0;

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
