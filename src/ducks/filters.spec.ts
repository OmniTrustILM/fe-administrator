import { describe, expect, test } from 'vitest';
import reducer, { actions, initialState, selectors, EntityType } from './filters';

describe('filters slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('setCurrentFilters sets currentFilters for entity', () => {
        const filters = [{ field: 'name', condition: 'EQUALS' as any, value: 'test' }];
        const next = reducer(initialState, actions.setCurrentFilters({ entity: EntityType.CERTIFICATE, currentFilters: filters as any }));
        const found = next.filters.find((f) => f.entity === EntityType.CERTIFICATE);
        expect(found?.filter.currentFilters).toEqual(filters);
    });

    test('setPreservedFilters sets preservedFilters for entity', () => {
        const filters = [{ field: 'name', condition: 'EQUALS' as any, value: 'test' }];
        const next = reducer(initialState, actions.setPreservedFilters({ entity: EntityType.KEY, preservedFilters: filters as any }));
        const found = next.filters.find((f) => f.entity === EntityType.KEY);
        expect(found?.filter.preservedFilters).toEqual(filters);
    });

    test('getAvailableFilters / getAvailableFiltersSuccess / getAvailableFiltersFailure', () => {
        let next = reducer(initialState, actions.getAvailableFilters({ entity: EntityType.DISCOVERY, getAvailableFiltersApi: {} as any }));
        const found = next.filters.find((f) => f.entity === EntityType.DISCOVERY);
        expect(found?.filter.isFetchingFilters).toBe(true);
        expect(found?.filter.availableFilters).toEqual([]);

        next = reducer(
            next,
            actions.getAvailableFiltersSuccess({
                entity: EntityType.DISCOVERY,
                availableFilters: [{ field: 'cn' as any, label: 'CN', multiValue: false, type: 'string' as any }],
            }),
        );
        const found2 = next.filters.find((f) => f.entity === EntityType.DISCOVERY);
        expect(found2?.filter.isFetchingFilters).toBe(false);
        expect(found2?.filter.availableFilters).toHaveLength(1);

        next = reducer(
            {
                ...next,
                filters: next.filters.map((f) =>
                    f.entity === EntityType.DISCOVERY ? { ...f, filter: { ...f.filter, isFetchingFilters: true } } : f,
                ),
            },
            actions.getAvailableFiltersFailure({ entity: EntityType.DISCOVERY, error: 'err' }),
        );
        const found3 = next.filters.find((f) => f.entity === EntityType.DISCOVERY);
        expect(found3?.filter.isFetchingFilters).toBe(false);
    });
});

describe('filters selectors', () => {
    test('availableFilters returns empty array when entity not in state', () => {
        const state = { filters: initialState } as any;
        expect(selectors.availableFilters(EntityType.CERTIFICATE)(state)).toEqual([]);
    });

    test('currentFilters returns empty array when entity not in state', () => {
        const state = { filters: initialState } as any;
        expect(selectors.currentFilters(EntityType.CERTIFICATE)(state)).toEqual([]);
    });

    test('preservedFilters returns empty array when entity not in state', () => {
        const state = { filters: initialState } as any;
        expect(selectors.preservedFilters(EntityType.CERTIFICATE)(state)).toEqual([]);
    });

    test('isFetchingFilters returns false when entity not in state', () => {
        const state = { filters: initialState } as any;
        expect(selectors.isFetchingFilters(EntityType.CERTIFICATE)(state)).toBe(false);
    });

    test('selectors read populated entity data', () => {
        const filtersState = {
            filters: [
                {
                    entity: EntityType.KEY,
                    filter: {
                        availableFilters: [{ field: 'cn' as any, label: 'CN', multiValue: false, type: 'string' as any }],
                        currentFilters: [{ field: 'cn' as any, condition: 'EQUALS' as any, value: 'x' }],
                        preservedFilters: [{ field: 'cn' as any, condition: 'EQUALS' as any, value: 'y' }],
                        isFetchingFilters: true,
                    },
                },
            ],
        };
        const state = { filters: filtersState } as any;
        expect(selectors.availableFilters(EntityType.KEY)(state)).toHaveLength(1);
        expect(selectors.currentFilters(EntityType.KEY)(state)).toHaveLength(1);
        expect(selectors.preservedFilters(EntityType.KEY)(state)).toHaveLength(1);
        expect(selectors.isFetchingFilters(EntityType.KEY)(state)).toBe(true);
    });

    test('state selector returns slice state', () => {
        const state = { filters: initialState } as any;
        expect(selectors.state(state)).toEqual(initialState);
    });
});

describe('hasLoadedFilters', () => {
    const stateFor = (filtersState: unknown) => ({ filters: filtersState }) as any;

    test('is false before any read', () => {
        expect(selectors.hasLoadedFilters(EntityType.CERTIFICATE)(stateFor(initialState))).toBe(false);
    });

    test('is true once a read succeeds, even with no fields', () => {
        const next = reducer(
            reducer(initialState, actions.getAvailableFilters({ entity: EntityType.CERTIFICATE, getAvailableFiltersApi: {} as any })),
            actions.getAvailableFiltersSuccess({ entity: EntityType.CERTIFICATE, availableFilters: [] }),
        );
        expect(selectors.hasLoadedFilters(EntityType.CERTIFICATE)(stateFor(next))).toBe(true);
    });

    test('is true once a read fails, so a failed catalogue does not read as a read in flight', () => {
        const next = reducer(
            reducer(initialState, actions.getAvailableFilters({ entity: EntityType.CERTIFICATE, getAvailableFiltersApi: {} as any })),
            actions.getAvailableFiltersFailure({ entity: EntityType.CERTIFICATE, error: 'err' }),
        );
        expect(selectors.hasLoadedFilters(EntityType.CERTIFICATE)(stateFor(next))).toBe(true);
    });

    test('is false for an entity whose first read is still in flight', () => {
        const next = reducer(
            initialState,
            actions.getAvailableFilters({ entity: EntityType.CERTIFICATE, getAvailableFiltersApi: {} as any }),
        );
        expect(selectors.hasLoadedFilters(EntityType.CERTIFICATE)(stateFor(next))).toBe(false);
        expect(selectors.isFetchingFilters(EntityType.CERTIFICATE)(stateFor(next))).toBe(true);
    });

    test('keeps the catalogue it already has while a later read is in flight', () => {
        const fields = [{ field: 'cn' as any, label: 'CN', multiValue: false, type: 'string' as any }];
        const settled = reducer(
            initialState,
            actions.getAvailableFiltersSuccess({ entity: EntityType.CERTIFICATE, availableFilters: fields as any }),
        );
        const refetching = reducer(
            settled,
            actions.getAvailableFilters({ entity: EntityType.CERTIFICATE, getAvailableFiltersApi: {} as any }),
        );

        expect(selectors.hasLoadedFilters(EntityType.CERTIFICATE)(stateFor(refetching))).toBe(true);
        expect(selectors.isFetchingFilters(EntityType.CERTIFICATE)(stateFor(refetching))).toBe(true);
        expect(selectors.availableFilters(EntityType.CERTIFICATE)(stateFor(refetching))).toEqual(fields);
    });
});

describe('hasFailedFilters', () => {
    const stateFor = (filtersState: unknown) => ({ filters: filtersState }) as any;
    const started = (state: typeof initialState) =>
        reducer(state, actions.getAvailableFilters({ entity: EntityType.CERTIFICATE, getAvailableFiltersApi: {} as any }));

    test('is false before any read', () => {
        expect(selectors.hasFailedFilters(EntityType.CERTIFICATE)(stateFor(initialState))).toBe(false);
    });

    test('separates a failed read from one that answered with no fields', () => {
        const failed = reducer(started(initialState), actions.getAvailableFiltersFailure({ entity: EntityType.CERTIFICATE, error: 'err' }));
        const empty = reducer(
            started(initialState),
            actions.getAvailableFiltersSuccess({ entity: EntityType.CERTIFICATE, availableFilters: [] }),
        );

        expect(selectors.hasLoadedFilters(EntityType.CERTIFICATE)(stateFor(failed))).toBe(true);
        expect(selectors.hasLoadedFilters(EntityType.CERTIFICATE)(stateFor(empty))).toBe(true);
        expect(selectors.hasFailedFilters(EntityType.CERTIFICATE)(stateFor(failed))).toBe(true);
        expect(selectors.hasFailedFilters(EntityType.CERTIFICATE)(stateFor(empty))).toBe(false);
    });

    test('is cleared by a read that succeeds after one that failed', () => {
        const failed = reducer(started(initialState), actions.getAvailableFiltersFailure({ entity: EntityType.CERTIFICATE, error: 'err' }));
        const recovered = reducer(
            started(failed),
            actions.getAvailableFiltersSuccess({ entity: EntityType.CERTIFICATE, availableFilters: [] }),
        );

        expect(selectors.hasFailedFilters(EntityType.CERTIFICATE)(stateFor(recovered))).toBe(false);
    });
});

describe('handed-in filters', () => {
    const stateFor = (filtersState: unknown) => ({ filters: filtersState }) as any;
    const drilledInto = [{ fieldSource: 'property', fieldIdentifier: 'CERTIFICATE_STATE', condition: 'EQUALS', value: ['issued'] }] as any;
    const narrowed = [{ fieldSource: 'property', fieldIdentifier: 'COMMON_NAME', condition: 'CONTAINS', value: 'acme' }] as any;
    const onExpiryWatch = { viewId: 'view-1', isDrillDown: false };
    const handedIn = (next: typeof initialState) => selectors.handedInFilters(EntityType.CERTIFICATE)(stateFor(next));

    test('are absent before anything hands filters in', () => {
        expect(handedIn(initialState)).toBeUndefined();
    });

    test('a drill-down applies its filters and hands them in for the inventory to open on', () => {
        const next = reducer(initialState, actions.setDrillDownFilters({ entity: EntityType.CERTIFICATE, filters: drilledInto }));

        expect(selectors.currentFilters(EntityType.CERTIFICATE)(stateFor(next))).toEqual(drilledInto);
        expect(handedIn(next)).toEqual({ source: 'drill-down' });
    });

    test('are taken once the inventory has opened on them, leaving the filters it opened on', () => {
        const drilled = reducer(initialState, actions.setDrillDownFilters({ entity: EntityType.CERTIFICATE, filters: drilledInto }));
        const taken = reducer(drilled, actions.clearHandedInFilters({ entity: EntityType.CERTIFICATE }));

        expect(handedIn(taken)).toBeUndefined();
        expect(selectors.currentFilters(EntityType.CERTIFICATE)(stateFor(taken))).toEqual(drilledInto);
    });

    test('are dropped by any filter the user sets, so a drill-down nobody opened on cannot label their filters later', () => {
        const drilled = reducer(initialState, actions.setDrillDownFilters({ entity: EntityType.CERTIFICATE, filters: drilledInto }));
        const typed = reducer(drilled, actions.setCurrentFilters({ entity: EntityType.CERTIFICATE, currentFilters: narrowed }));

        expect(handedIn(typed)).toBeUndefined();
    });

    test('a return hands back the filters the list was left with, and the tab it was on', () => {
        const positioned = reducer(initialState, actions.setViewPosition({ entity: EntityType.CERTIFICATE, position: onExpiryWatch }));
        const left = reducer(positioned, actions.setPreservedFilters({ entity: EntityType.CERTIFICATE, preservedFilters: narrowed }));
        const cleared = reducer(left, actions.setCurrentFilters({ entity: EntityType.CERTIFICATE, currentFilters: [] }));
        const returned = reducer(cleared, actions.takePreservedFilters({ entity: EntityType.CERTIFICATE }));

        expect(selectors.currentFilters(EntityType.CERTIFICATE)(stateFor(returned))).toEqual(narrowed);
        expect(handedIn(returned)).toEqual({ source: 'return', position: onExpiryWatch });
    });

    test('a return is taken once, so a later visit opens on the view again', () => {
        const left = reducer(initialState, actions.setPreservedFilters({ entity: EntityType.CERTIFICATE, preservedFilters: narrowed }));
        const returned = reducer(left, actions.takePreservedFilters({ entity: EntityType.CERTIFICATE }));
        const taken = reducer(returned, actions.clearHandedInFilters({ entity: EntityType.CERTIFICATE }));
        const again = reducer(taken, actions.takePreservedFilters({ entity: EntityType.CERTIFICATE }));

        expect(selectors.preservedFilters(EntityType.CERTIFICATE)(stateFor(returned))).toEqual([]);
        expect(handedIn(again)).toBeUndefined();
    });

    test('a pending drill-down outranks filters kept for a return', () => {
        const left = reducer(initialState, actions.setPreservedFilters({ entity: EntityType.CERTIFICATE, preservedFilters: narrowed }));
        const drilled = reducer(left, actions.setDrillDownFilters({ entity: EntityType.CERTIFICATE, filters: drilledInto }));
        const returned = reducer(drilled, actions.takePreservedFilters({ entity: EntityType.CERTIFICATE }));

        expect(selectors.currentFilters(EntityType.CERTIFICATE)(stateFor(returned))).toEqual(drilledInto);
        expect(handedIn(returned)).toEqual({ source: 'drill-down' });
        expect(selectors.preservedFilters(EntityType.CERTIFICATE)(stateFor(returned))).toEqual([]);
    });

    test('nothing is handed in when nothing was kept for a return', () => {
        const returned = reducer(initialState, actions.takePreservedFilters({ entity: EntityType.CERTIFICATE }));

        expect(handedIn(returned)).toBeUndefined();
    });
});
