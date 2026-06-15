import { describe, expect, test } from 'vitest';
import { Resource } from 'types/openapi';
import reducer, { actions, initialState, selectors } from './list-filters';

describe('list-filters slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('setListResource stores resource by key', () => {
        const next = reducer(initialState, actions.setListResource({ key: 'workflows:conditions', resource: Resource.Certificates }));

        expect(next.byKey['workflows:conditions']).toEqual({ resource: Resource.Certificates });
    });

    test('setListResource with undefined clears the resource but keeps the entry', () => {
        const withResource = reducer(
            initialState,
            actions.setListResource({ key: 'workflows:conditions', resource: Resource.Certificates }),
        );

        const next = reducer(withResource, actions.setListResource({ key: 'workflows:conditions', resource: undefined }));

        expect(next.byKey['workflows:conditions']).toEqual({ resource: undefined });
    });

    test('setListResource keys are independent', () => {
        const withConditions = reducer(
            initialState,
            actions.setListResource({ key: 'workflows:conditions', resource: Resource.Certificates }),
        );
        const withRules = reducer(withConditions, actions.setListResource({ key: 'workflows:rules', resource: Resource.Keys }));

        expect(withRules.byKey['workflows:conditions']).toEqual({ resource: Resource.Certificates });
        expect(withRules.byKey['workflows:rules']).toEqual({ resource: Resource.Keys });
    });

    test('clearListFilter removes the key', () => {
        const withResource = reducer(
            initialState,
            actions.setListResource({ key: 'workflows:conditions', resource: Resource.Certificates }),
        );

        const next = reducer(withResource, actions.clearListFilter({ key: 'workflows:conditions' }));

        expect(next.byKey['workflows:conditions']).toBeUndefined();
    });
});

describe('list-filters selectors', () => {
    test('listFilter returns default empty state when key missing', () => {
        const state = { listFilters: initialState } as any;
        expect(selectors.listFilter('missing')(state)).toEqual({ resource: undefined });
    });

    test('listFilter returns stored value', () => {
        const state = {
            listFilters: {
                byKey: {
                    'workflows:conditions': { resource: Resource.Certificates },
                },
            },
        } as any;

        expect(selectors.listFilter('workflows:conditions')(state)).toEqual({ resource: Resource.Certificates });
    });
});
