import { describe, expect, test } from 'vitest';
import { InspectedEntryKind } from 'types/openapi';
import reducer, { actions, initialState, selectors } from './inspections';

describe('inspections slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('inspectFile sets isInspecting and clears a previous error and its status', () => {
        const state = { ...initialState, inspectionError: 'previous error', inspectionErrorStatus: 422 };
        const next = reducer(state, actions.inspectFile({ inspectionRequestDto: { file: 'ZmlsZQ==' } }));
        expect(next.isInspecting).toBe(true);
        expect(next.inspectionError).toBeUndefined();
        expect(next.inspectionErrorStatus).toBeUndefined();
    });

    test('inspectFileSuccess stores the inspection and clears isInspecting', () => {
        const inspection = {
            containerDigest: 'digest',
            entries: [{ entryReference: 'a'.repeat(64), kind: InspectedEntryKind.Certificate }],
        };
        const next = reducer({ ...initialState, isInspecting: true }, actions.inspectFileSuccess({ inspection }));
        expect(next.isInspecting).toBe(false);
        expect(next.inspection).toEqual(inspection);
    });

    test('inspectFileFailure stores the error and its status, and clears isInspecting', () => {
        const next = reducer({ ...initialState, isInspecting: true }, actions.inspectFileFailure({ error: 'boom', status: 403 }));
        expect(next.isInspecting).toBe(false);
        expect(next.inspectionError).toBe('boom');
        expect(next.inspectionErrorStatus).toBe(403);
    });

    test('resetInspection clears the inspection, its error and status, and isInspecting', () => {
        const inspection = { containerDigest: 'digest', entries: [] };
        const state = { inspection, inspectionError: 'boom', inspectionErrorStatus: 404, isInspecting: true };
        const next = reducer(state, actions.resetInspection());
        expect(next).toEqual(initialState);
    });
});

describe('inspections selectors', () => {
    test("read the inspection, its error and the error's status, and isInspecting from state", () => {
        const inspection = { containerDigest: 'digest', entries: [] };
        const state = { inspections: { inspection, inspectionError: 'boom', inspectionErrorStatus: 404, isInspecting: true } } as any;

        expect(selectors.inspection(state)).toEqual(inspection);
        expect(selectors.inspectionError(state)).toBe('boom');
        expect(selectors.inspectionErrorStatus(state)).toBe(404);
        expect(selectors.isInspecting(state)).toBe(true);
    });
});
