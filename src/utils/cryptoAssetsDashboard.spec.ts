import { describe, expect, test } from 'vitest';
import { FilterConditionOperator, PqcVerdict } from 'types/openapi';
import {
    buildEmptyFilter,
    buildEqualsFilter,
    CRYPTO_ASSET_FILTER_FIELDS,
    formatShareOfEstate,
    getPqcVerdictChartColors,
    PQC_VERDICT_CHART_COLORS,
    summarizeSyncCompleteness,
} from './cryptoAssetsDashboard';

describe('crypto asset dashboard filters', () => {
    test('an equals drill-through carries the server field for the picked value', () => {
        expect(buildEqualsFilter(CRYPTO_ASSET_FILTER_FIELDS.pqcVerdict, PqcVerdict.NotReady)).toEqual([
            {
                fieldSource: 'property',
                condition: FilterConditionOperator.Equals,
                fieldIdentifier: CRYPTO_ASSET_FILTER_FIELDS.pqcVerdict,
                value: [PqcVerdict.NotReady],
            },
        ]);
    });

    // A filter read out of the catalogue would come back empty for as long as that request is in flight, and the
    // click would land on the whole inventory instead of the segment.
    test('a drill-through is built without the searchable-fields catalogue', () => {
        expect(buildEqualsFilter(CRYPTO_ASSET_FILTER_FIELDS.algorithmFamily, 'RSA')).toHaveLength(1);
        expect(buildEmptyFilter(CRYPTO_ASSET_FILTER_FIELDS.algorithmFamily)).toHaveLength(1);
    });

    test('the no-family bucket asks for the empty condition, not for an empty string value', () => {
        const [filter] = buildEmptyFilter(CRYPTO_ASSET_FILTER_FIELDS.type);

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
});
