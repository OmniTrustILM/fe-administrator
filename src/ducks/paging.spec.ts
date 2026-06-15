import { describe, expect, test } from 'vitest';
import reducer, { actions, initialState, selectors } from './paging';
import { EntityType } from './filters';

describe('paging slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('list / listSuccess / listFailure update flags and totalItems', () => {
        let next = reducer(initialState, actions.list(EntityType.CBOM));

        expect(next.pagings).toHaveLength(1);
        expect(next.pagings[0].entity).toBe(EntityType.CBOM);
        expect(next.pagings[0].paging.isFetchingList).toBe(true);
        expect(next.pagings[0].paging.totalItems).toBe(0);

        next = reducer(next, actions.listSuccess({ entity: EntityType.CBOM, totalItems: 77 }));
        expect(next.pagings[0].paging.isFetchingList).toBe(false);
        expect(next.pagings[0].paging.totalItems).toBe(77);

        next = reducer(
            { ...next, pagings: [{ ...next.pagings[0], paging: { ...next.pagings[0].paging, isFetchingList: true } }] },
            actions.listFailure(EntityType.CBOM),
        );
        expect(next.pagings[0].paging.isFetchingList).toBe(false);
    });

    test('setCheckedRows stores checked row ids for entity', () => {
        const next = reducer(
            initialState,
            actions.setCheckedRows({
                entity: EntityType.CBOM,
                checkedRows: ['cbom-1', 'cbom-2'],
            }),
        );

        expect(next.pagings[0].paging.checkedRows).toEqual(['cbom-1', 'cbom-2']);
    });

    test('setPagination stores pageNumber and pageSize for entity', () => {
        const next = reducer(
            initialState,
            actions.setPagination({
                entity: EntityType.CBOM,
                pageNumber: 3,
                pageSize: 50,
            }),
        );

        expect(next.pagings[0].paging.pageNumber).toBe(3);
        expect(next.pagings[0].paging.pageSize).toBe(50);
    });

    test('setPagination normalizes invalid values', () => {
        const withBase = reducer(
            initialState,
            actions.setPagination({
                entity: EntityType.CBOM,
                pageNumber: 4,
                pageSize: 20,
            }),
        );

        const next = reducer(
            withBase,
            actions.setPagination({
                entity: EntityType.CBOM,
                pageNumber: -10,
                pageSize: Number.NaN,
            }),
        );

        expect(next.pagings[0].paging.pageNumber).toBe(4);
        expect(next.pagings[0].paging.pageSize).toBe(20);
    });

    test('keeps independent paging per entity', () => {
        let next = reducer(initialState, actions.setPagination({ entity: EntityType.CBOM, pageNumber: 2, pageSize: 20 }));
        next = reducer(next, actions.setPagination({ entity: EntityType.CERTIFICATE, pageNumber: 7, pageSize: 100 }));

        const cbom = next.pagings.find((p) => p.entity === EntityType.CBOM);
        const cert = next.pagings.find((p) => p.entity === EntityType.CERTIFICATE);

        expect(cbom?.paging.pageNumber).toBe(2);
        expect(cbom?.paging.pageSize).toBe(20);
        expect(cert?.paging.pageNumber).toBe(7);
        expect(cert?.paging.pageSize).toBe(100);
    });

    test('resetPaging restores defaults and clears checked rows for one entity only', () => {
        let next = reducer(initialState, actions.setPagination({ entity: EntityType.CBOM, pageNumber: 3, pageSize: 100 }));
        next = reducer(next, actions.setCheckedRows({ entity: EntityType.CBOM, checkedRows: ['a', 'b'] }));
        next = reducer(next, actions.setPagination({ entity: EntityType.CERTIFICATE, pageNumber: 5, pageSize: 50 }));

        next = reducer(next, actions.resetPaging({ entity: EntityType.CBOM }));

        const cbom = next.pagings.find((p) => p.entity === EntityType.CBOM);
        const cert = next.pagings.find((p) => p.entity === EntityType.CERTIFICATE);

        expect(cbom?.paging.pageNumber).toBe(1);
        expect(cbom?.paging.pageSize).toBe(10);
        expect(cbom?.paging.checkedRows).toEqual([]);
        // other entities untouched
        expect(cert?.paging.pageNumber).toBe(5);
        expect(cert?.paging.pageSize).toBe(50);
    });
});

describe('paging selectors', () => {
    test('return defaults when entity is missing in state', () => {
        const state = { pagings: initialState } as any;

        expect(selectors.totalItems(EntityType.CBOM)(state)).toBe(0);
        expect(selectors.checkedRows(EntityType.CBOM)(state)).toEqual([]);
        expect(selectors.isFetchingList(EntityType.CBOM)(state)).toBe(false);
        expect(selectors.pageNumber(EntityType.CBOM)(state)).toBe(1);
        expect(selectors.pageSize(EntityType.CBOM)(state)).toBe(10);
    });

    test('return values for existing entity paging state', () => {
        const state = {
            pagings: {
                pagings: [
                    {
                        entity: EntityType.CBOM,
                        paging: {
                            totalItems: 999,
                            checkedRows: ['row-a', 'row-b'],
                            isFetchingList: true,
                            pageNumber: 6,
                            pageSize: 200,
                        },
                    },
                ],
            },
        } as any;

        expect(selectors.totalItems(EntityType.CBOM)(state)).toBe(999);
        expect(selectors.checkedRows(EntityType.CBOM)(state)).toEqual(['row-a', 'row-b']);
        expect(selectors.isFetchingList(EntityType.CBOM)(state)).toBe(true);
        expect(selectors.pageNumber(EntityType.CBOM)(state)).toBe(6);
        expect(selectors.pageSize(EntityType.CBOM)(state)).toBe(200);
    });
});
