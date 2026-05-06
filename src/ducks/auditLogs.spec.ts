import { describe, expect, test } from 'vitest';
import reducer, { actions, initialState, selectors } from './auditLogs';

describe('auditlog slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('listAuditLogs / listAuditLogsSuccess / listAuditLogsFailure', () => {
        let next = reducer(initialState, actions.listAuditLogs({} as any));
        expect(next.isFetchingPageData).toBe(true);

        next = reducer(next, actions.listAuditLogsSuccess([{ id: 1 } as any]));
        expect(next.isFetchingPageData).toBe(false);
        expect(next.auditLogs).toHaveLength(1);

        next = reducer({ ...next, isFetchingPageData: true }, actions.listAuditLogsFailure());
        expect(next.isFetchingPageData).toBe(false);
    });

    test('purgeLogs / purgeLogsSuccess / purgeLogsFailure', () => {
        let next = reducer(initialState, actions.purgeLogs([] as any));
        expect(next.isPurging).toBe(true);

        next = reducer(next, actions.purgeLogsSuccess());
        expect(next.isPurging).toBe(false);

        next = reducer({ ...next, isPurging: true }, actions.purgeLogsFailure());
        expect(next.isPurging).toBe(false);
    });

    test('exportLogs / exportLogsSuccess / exportLogsFailure', () => {
        let next = reducer(initialState, actions.exportLogs([] as any));
        expect(next.isExporting).toBe(true);

        next = reducer(next, actions.exportLogsSuccess(new Blob(['data'])));
        expect(next.isExporting).toBe(false);

        next = reducer({ ...next, isExporting: true }, actions.exportLogsFailure());
        expect(next.isExporting).toBe(false);
    });
});

describe('auditlog selectors', () => {
    test('state selector returns slice state', () => {
        const state = { auditlog: initialState } as any;
        expect(selectors.state(state)).toEqual(initialState);
    });

    test('auditLogs selector', () => {
        const featureState = { ...initialState, auditLogs: [{ id: 1 } as any] };
        const state = { auditlog: featureState } as any;
        expect(selectors.auditLogs(state)).toHaveLength(1);
    });

    test('isFetchingPageData selector', () => {
        const featureState = { ...initialState, isFetchingPageData: true };
        const state = { auditlog: featureState } as any;
        expect(selectors.isFetchingPageData(state)).toBe(true);
    });

    test('isPurging selector', () => {
        const featureState = { ...initialState, isPurging: true };
        const state = { auditlog: featureState } as any;
        expect(selectors.isPurging(state)).toBe(true);
    });

    test('isExporting selector', () => {
        const featureState = { ...initialState, isExporting: true };
        const state = { auditlog: featureState } as any;
        expect(selectors.isExporting(state)).toBe(true);
    });
});
