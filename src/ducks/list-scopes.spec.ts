import { describe, expect, test } from 'vitest';
import reducer, { actions, initialState, selectors } from './list-scopes';
import { EntityType } from './filters';

describe('list-scopes slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('registerScope stores the route prefix per entity (numeric enum key stringified)', () => {
        let next = reducer(initialState, actions.registerScope({ entity: EntityType.KEY, prefix: '/keys' }));
        next = reducer(next, actions.registerScope({ entity: EntityType.CERTIFICATE, prefix: '/certificates' }));

        expect(next.byEntity[EntityType.KEY]).toBe('/keys');
        expect(next.byEntity[EntityType.CERTIFICATE]).toBe('/certificates');
    });

    test('registerScope overwrites an existing prefix for the same entity', () => {
        const next = reducer(
            reducer(initialState, actions.registerScope({ entity: EntityType.KEY, prefix: '/keys' })),
            actions.registerScope({ entity: EntityType.KEY, prefix: '/cryptographickeys' }),
        );

        expect(next.byEntity[EntityType.KEY]).toBe('/cryptographickeys');
    });

    test('unregisterScope removes one entity', () => {
        const withTwo = reducer(
            reducer(initialState, actions.registerScope({ entity: EntityType.KEY, prefix: '/keys' })),
            actions.registerScope({ entity: EntityType.CERTIFICATE, prefix: '/certificates' }),
        );

        const next = reducer(withTwo, actions.unregisterScope({ entity: EntityType.KEY }));

        expect(next.byEntity[EntityType.KEY]).toBeUndefined();
        expect(next.byEntity[EntityType.CERTIFICATE]).toBe('/certificates');
    });

    test('registeredScopes selector returns the map', () => {
        const state = { listScopes: { byEntity: { [EntityType.KEY]: '/keys' } } } as any;
        expect(selectors.registeredScopes(state)).toEqual({ [EntityType.KEY]: '/keys' });
    });
});
