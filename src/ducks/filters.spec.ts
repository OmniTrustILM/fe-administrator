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

    /**
     * A settled flag beside an empty catalogue is the one pairing this flag exists to rule out: a
     * consumer that waits for the catalogue would read it as "this resource publishes nothing" and
     * resolve every stored column against an empty set. A refetch must therefore leave the fields it
     * already has in place.
     */
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
