import { describe, expect, test } from 'vitest';
import { FilterFieldSource } from 'types/openapi';
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
                        isFetchingFilters: true,
                    },
                },
            ],
        };
        const state = { filters: filtersState } as any;
        expect(selectors.availableFilters(EntityType.KEY)(state)).toHaveLength(1);
        expect(selectors.currentFilters(EntityType.KEY)(state)).toHaveLength(1);
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
        const next = reducer(
            initialState,
            actions.setDrillDownFilters({ entity: EntityType.CERTIFICATE, filters: drilledInto, path: '/certificates' }),
        );

        expect(selectors.currentFilters(EntityType.CERTIFICATE)(stateFor(next))).toEqual(drilledInto);
        expect(handedIn(next)).toEqual({ source: 'drill-down', scope: '/certificates' });
    });

    test('are taken once the inventory has opened on them, leaving the filters it opened on', () => {
        const drilled = reducer(
            initialState,
            actions.setDrillDownFilters({ entity: EntityType.CERTIFICATE, filters: drilledInto, path: '/certificates' }),
        );
        const taken = reducer(drilled, actions.setCurrentFilters({ entity: EntityType.CERTIFICATE, currentFilters: drilledInto }));

        expect(handedIn(taken)).toBeUndefined();
        expect(selectors.currentFilters(EntityType.CERTIFICATE)(stateFor(taken))).toEqual(drilledInto);
    });

    test('are dropped by any filter the user sets, so a drill-down nobody opened on cannot label their filters later', () => {
        const drilled = reducer(
            initialState,
            actions.setDrillDownFilters({ entity: EntityType.CERTIFICATE, filters: drilledInto, path: '/certificates' }),
        );
        const typed = reducer(drilled, actions.setCurrentFilters({ entity: EntityType.CERTIFICATE, currentFilters: narrowed }));

        expect(handedIn(typed)).toBeUndefined();
    });

    const leave = (from: typeof initialState) =>
        reducer(from, actions.leaveList({ entity: EntityType.SECRET, path: '/secrets', scope: '/secrets' }));
    const route = (from: typeof initialState, pathname: string) => reducer(from, actions.routeChanged({ pathname }));
    const comeBack = (from: typeof initialState) => reducer(from, actions.returnToList({ entity: EntityType.SECRET, path: '/secrets' }));
    const secretsHandedIn = (next: typeof initialState) => selectors.handedInFilters(EntityType.SECRET)(stateFor(next));
    const narrowedSecrets = (next: typeof initialState) =>
        reducer(next, actions.setCurrentFilters({ entity: EntityType.SECRET, currentFilters: narrowed }));
    const onSecretsView = (next: typeof initialState) =>
        reducer(next, actions.setViewPosition({ entity: EntityType.SECRET, position: onExpiryWatch }));

    test('a list left at a trailing-slash path is returned to at its canonical path', () => {
        const left = reducer(
            narrowedSecrets(initialState),
            actions.leaveList({ entity: EntityType.SECRET, path: '/secrets/', scope: '/secrets/' }),
        );
        const returned = comeBack(route(left, '/secrets/detail/1'));

        expect(secretsHandedIn(returned)).toEqual({ source: 'return', position: undefined });
        expect(selectors.currentFilters(EntityType.SECRET)(stateFor(returned))).toEqual(narrowed);
    });

    test('a return from a page inside the list hands back the filters it was left with, and the tab it was on', () => {
        const left = leave(onSecretsView(narrowedSecrets(initialState)));
        const cleared = reducer(left, actions.setCurrentFilters({ entity: EntityType.SECRET, currentFilters: [] }));
        const returned = comeBack(route(cleared, '/secrets/detail/1'));

        expect(selectors.currentFilters(EntityType.SECRET)(stateFor(returned))).toEqual(narrowed);
        expect(secretsHandedIn(returned)).toEqual({ source: 'return', position: onExpiryWatch });
    });

    test('a return hands back the ordering the list was left listing under', () => {
        const byName = { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: 'desc' as const };
        const left = reducer(
            narrowedSecrets(initialState),
            actions.leaveList({ entity: EntityType.SECRET, path: '/secrets', scope: '/secrets', sort: byName }),
        );
        const returned = comeBack(route(left, '/secrets/detail/1'));

        expect(secretsHandedIn(returned)).toEqual({ source: 'return', position: undefined, sort: byName });
    });

    test('a list that went nowhere is not returned to, as a remount in place does', () => {
        const returned = comeBack(leave(narrowedSecrets(initialState)));

        expect(secretsHandedIn(returned)).toBeUndefined();
    });

    test('leaving the list for another part of the app drops what it was left with', () => {
        const away = route(route(leave(narrowedSecrets(initialState)), '/secrets/detail/1'), '/dashboard');
        const returned = comeBack(route(away, '/secrets'));

        expect(secretsHandedIn(returned)).toBeUndefined();
    });

    test('a return is taken once, so a later visit opens on the view again', () => {
        const returned = comeBack(route(leave(narrowedSecrets(initialState)), '/secrets/detail/1'));
        const again = comeBack(
            route(
                reducer(
                    returned,
                    actions.setCurrentFilters({
                        entity: EntityType.SECRET,
                        currentFilters: selectors.currentFilters(EntityType.SECRET)(stateFor(returned)),
                    }),
                ),
                '/secrets/detail/1',
            ),
        );

        expect(secretsHandedIn(again)).toBeUndefined();
    });

    test('a pending drill-down outranks what the list was left with', () => {
        const left = route(leave(narrowedSecrets(initialState)), '/secrets/detail/1');
        const drilled = reducer(left, actions.setDrillDownFilters({ entity: EntityType.SECRET, filters: drilledInto, path: '/secrets' }));
        const returned = comeBack(drilled);

        expect(selectors.currentFilters(EntityType.SECRET)(stateFor(returned))).toEqual(drilledInto);
        expect(secretsHandedIn(returned)).toEqual({ source: 'drill-down', scope: '/secrets' });
    });

    test('a return to a different path within the scope is not a return to this list', () => {
        const left = route(leave(narrowedSecrets(initialState)), '/secrets/detail/1');
        const returned = reducer(left, actions.returnToList({ entity: EntityType.SECRET, path: '/secrets/other' }));

        expect(secretsHandedIn(returned)).toBeUndefined();
    });

    test('a drill-down the list never opened on is dropped once the user leaves the list', () => {
        const drilled = reducer(
            initialState,
            actions.setDrillDownFilters({ entity: EntityType.SECRET, filters: drilledInto, path: '/secrets' }),
        );
        const away = route(leave(onSecretsView(drilled)), '/discoveries');
        const returned = comeBack(route(away, '/secrets'));

        expect(secretsHandedIn(returned)).toBeUndefined();
        expect(selectors.handedInFilters(EntityType.SECRET)(stateFor(away))).toBeUndefined();
    });

    const drillIntoSecrets = (from: typeof initialState) =>
        reducer(from, actions.setDrillDownFilters({ entity: EntityType.SECRET, filters: drilledInto, path: '/secrets/' }));

    test('a drill-down holds while the user stays inside the scope it was opened for', () => {
        const arrived = route(route(drillIntoSecrets(initialState), '/secrets'), '/secrets/detail/1');

        expect(secretsHandedIn(arrived)).toEqual({ source: 'drill-down', scope: '/secrets' });
    });

    test('a drill-down whose navigation was superseded before the list mounted is dropped', () => {
        const away = route(drillIntoSecrets(initialState), '/discoveries');
        const visited = comeBack(route(away, '/secrets'));

        expect(secretsHandedIn(away)).toBeUndefined();
        expect(secretsHandedIn(visited)).toBeUndefined();
    });

    test('a drill-down whose list never mounted at its route is dropped once the user goes elsewhere', () => {
        const away = route(route(drillIntoSecrets(initialState), '/secrets'), '/dashboard');
        const visited = comeBack(route(away, '/secrets'));

        expect(secretsHandedIn(visited)).toBeUndefined();
    });

    test('an empty drill-down hands nothing in, so the list opens on its view', () => {
        const drilled = reducer(
            initialState,
            actions.setDrillDownFilters({ entity: EntityType.CERTIFICATE, filters: [], path: '/certificates' }),
        );

        expect(handedIn(drilled)).toBeUndefined();
        expect(selectors.currentFilters(EntityType.CERTIFICATE)(stateFor(drilled))).toEqual([]);
    });
});
