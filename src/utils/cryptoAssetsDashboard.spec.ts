import { describe, expect, test } from 'vitest';
import { FilterConditionOperator, FilterFieldType, PqcVerdict } from 'types/openapi';
import type { SearchFieldListModel } from 'types/certificate';
import { CHART_MIN_CONTRAST, CHART_SURFACES } from './chart-contrast';
import { contrastRatio } from './contrast';
import {
    buildEmptyFilter,
    buildEqualsFilter,
    CRYPTO_ASSET_FILTER_FIELDS,
    formatShareOfEstate,
    getPqcVerdictChartColors,
    PQC_VERDICT_CHART_COLORS,
    summarizeSyncCompleteness,
} from './cryptoAssetsDashboard';

const availableFilters: SearchFieldListModel[] = [
    {
        searchFieldData: [
            { fieldIdentifier: CRYPTO_ASSET_FILTER_FIELDS.type, fieldLabel: 'Asset Type', type: FilterFieldType.String, conditions: [] },
            {
                fieldIdentifier: CRYPTO_ASSET_FILTER_FIELDS.pqcVerdict,
                fieldLabel: 'PQC Readiness',
                type: FilterFieldType.String,
                conditions: [],
            },
        ],
    } as never,
];

describe('crypto asset dashboard filters', () => {
    test('an equals drill-through carries the server field the catalogue offers', () => {
        expect(buildEqualsFilter(availableFilters, CRYPTO_ASSET_FILTER_FIELDS.pqcVerdict, PqcVerdict.NotReady)).toEqual([
            {
                fieldSource: 'property',
                condition: FilterConditionOperator.Equals,
                fieldIdentifier: CRYPTO_ASSET_FILTER_FIELDS.pqcVerdict,
                value: [PqcVerdict.NotReady],
            },
        ]);
    });

    test('a field the server does not offer lands on the unfiltered inventory instead of a rejected filter', () => {
        expect(buildEqualsFilter(availableFilters, CRYPTO_ASSET_FILTER_FIELDS.algorithmFamily, 'RSA')).toEqual([]);
        expect(buildEmptyFilter(availableFilters, CRYPTO_ASSET_FILTER_FIELDS.algorithmFamily)).toEqual([]);
    });

    test('the no-family bucket asks for the empty condition, not for an empty string value', () => {
        const [filter] = buildEmptyFilter(availableFilters, CRYPTO_ASSET_FILTER_FIELDS.type);

        expect(filter.condition).toBe(FilterConditionOperator.Empty);
        expect(filter.fieldIdentifier).toBe(CRYPTO_ASSET_FILTER_FIELDS.type);
    });
});

describe('summarizeSyncCompleteness', () => {
    test('a fully synced estate reports complete', () => {
        const summary = summarizeSyncCompleteness({
            cbomStatBySyncState: { synced: 37, inProgress: 0, pending: 0, failed: 0 },
            lastCompletedSyncAt: '2026-09-09T06:00:14.000Z',
        });

        expect(summary).toMatchObject({ total: 37, synced: 37, isComplete: true, lastCompletedSyncAt: '2026-09-09T06:00:14.000Z' });
    });

    test('a partly synced estate is not complete, so the page can say so before any count', () => {
        const summary = summarizeSyncCompleteness({ cbomStatBySyncState: { synced: 12, pending: 20, failed: 5 } });

        expect(summary.total).toBe(37);
        expect(summary.synced).toBe(12);
        expect(summary.isComplete).toBe(false);
        expect(summary.states).toHaveLength(3);
    });

    test('an estate nobody has synced yet is not reported as complete', () => {
        expect(summarizeSyncCompleteness({ cbomStatBySyncState: { synced: 0, pending: 0 } }).isComplete).toBe(false);
        expect(summarizeSyncCompleteness(undefined)).toMatchObject({ total: 0, synced: 0, isComplete: false, states: [] });
    });
});

describe('formatShareOfEstate', () => {
    test('states the share to one decimal', () => {
        expect(formatShareOfEstate(5903, 12418)).toBe('47.5% of the estate');
    });

    test('claims no share when either number is missing or nothing counts', () => {
        expect(formatShareOfEstate(0, 12418)).toBeUndefined();
        expect(formatShareOfEstate(10, 0)).toBeUndefined();
        expect(formatShareOfEstate(undefined, undefined)).toBeUndefined();
    });
});

describe('getPqcVerdictChartColors', () => {
    test('a segment takes its verdict colour, in the order the statistics arrive', () => {
        expect(getPqcVerdictChartColors({ [PqcVerdict.NotReady]: 5, [PqcVerdict.Ready]: 3 })).toEqual({
            colors: [PQC_VERDICT_CHART_COLORS[PqcVerdict.NotReady], PQC_VERDICT_CHART_COLORS[PqcVerdict.Ready]],
        });
    });

    test('a verdict the client does not know still gets a legible series colour', () => {
        expect(getPqcVerdictChartColors({ somethingNew: 1 }).colors).toEqual(['#6c757d']);
    });

    test('every verdict colour clears the chart contrast floor on both surfaces', () => {
        for (const verdict of Object.values(PqcVerdict)) {
            for (const surface of CHART_SURFACES) {
                expect(contrastRatio(PQC_VERDICT_CHART_COLORS[verdict], surface)).toBeGreaterThanOrEqual(CHART_MIN_CONTRAST);
            }
        }
    });
});
