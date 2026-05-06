import { describe, expect, test } from 'vitest';
import reducer, { actions, initialState, selectors } from './auth';

describe('auth slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('clearResources sets resources to undefined', () => {
        const dirty = { ...initialState, resources: [{ name: 'r' }] } as any;
        const next = reducer(dirty, actions.clearResources());
        expect(next.resources).toBeUndefined();
    });

    test('getProfile / getProfileSuccess / getProfileFailure', () => {
        let next = reducer(initialState, actions.getProfile());
        expect(next.isFetchingProfile).toBe(true);

        next = reducer(next, actions.getProfileSuccess({ profile: { username: 'alice' } as any }));
        expect(next.isFetchingProfile).toBe(false);
        expect(next.profile).toEqual({ username: 'alice' });

        next = reducer({ ...next, isFetchingProfile: true }, actions.getProfileFailure());
        expect(next.isFetchingProfile).toBe(false);
    });

    test('resetProfile clears profile', () => {
        const withProfile = { ...initialState, profile: { username: 'alice' } } as any;
        const next = reducer(withProfile, actions.resetProfile());
        expect(next.profile).toBeUndefined();
    });

    test('updateProfile / updateProfileSuccess / updateProfileFailure', () => {
        let next = reducer(initialState, actions.updateProfile({ profile: {} as any }));
        expect(next.isUpdatingProfile).toBe(true);

        const withProfile = { ...next, profile: { username: 'alice', firstName: 'Alice' } } as any;
        next = reducer(withProfile, actions.updateProfileSuccess({ profile: { firstName: 'Bob' } as any }));
        expect(next.isUpdatingProfile).toBe(false);
        expect((next.profile as any)?.firstName).toBe('Bob');

        next = reducer({ ...next, isUpdatingProfile: true }, actions.updateProfileFailure());
        expect(next.isUpdatingProfile).toBe(false);
    });

    test('getAuthResources / getAuthResourcesSuccess / getAuthResourcesFailure', () => {
        let next = reducer(initialState, actions.getAuthResources());
        expect(next.isFetchingResources).toBe(true);
        expect(next.resources).toBeUndefined();

        next = reducer(next, actions.getAuthResourcesSuccess({ resources: [{ name: 'res1' } as any] }));
        expect(next.isFetchingResources).toBe(false);
        expect(next.resources).toHaveLength(1);

        next = reducer({ ...next, isFetchingResources: true }, actions.getAuthResourcesFailure());
        expect(next.isFetchingResources).toBe(false);
    });

    test('getObjectsForResource / getObjectsForResourceSuccess / getObjectsForResourceFailure', () => {
        let next = reducer(initialState, actions.getObjectsForResource({ resource: 'certificates' as any }));
        expect(next.isFetchingObjects).toBe(true);
        expect(next.objects).toBeUndefined();

        next = reducer(next, actions.getObjectsForResourceSuccess({ objects: [{ name: 'obj1', uuid: 'u1' }] as any }));
        expect(next.isFetchingObjects).toBe(false);
        expect(next.objects).toHaveLength(1);

        next = reducer({ ...next, isFetchingObjects: true }, actions.getObjectsForResourceFailure());
        expect(next.isFetchingObjects).toBe(false);
    });
});

describe('auth selectors', () => {
    test('selectState returns slice state', () => {
        const state = { auth: initialState } as any;
        expect(selectors.selectState(state)).toEqual(initialState);
    });

    test('profile selector', () => {
        const featureState = { ...initialState, profile: { username: 'alice' } } as any;
        const state = { auth: featureState } as any;
        expect(selectors.profile(state)).toEqual({ username: 'alice' });
    });

    test('resources selector', () => {
        const featureState = { ...initialState, resources: [{ name: 'r' }] } as any;
        const state = { auth: featureState } as any;
        expect(selectors.resources(state)).toHaveLength(1);
    });

    test('objects selector', () => {
        const featureState = { ...initialState, objects: [{ name: 'o', uuid: 'u' }] } as any;
        const state = { auth: featureState } as any;
        expect(selectors.objects(state)).toHaveLength(1);
    });

    test('isFetchingProfile selector', () => {
        const featureState = { ...initialState, isFetchingProfile: true } as any;
        const state = { auth: featureState } as any;
        expect(selectors.isFetchingProfile(state)).toBe(true);
    });

    test('isUpdatingProfile selector', () => {
        const featureState = { ...initialState, isUpdatingProfile: true } as any;
        const state = { auth: featureState } as any;
        expect(selectors.isUpdatingProfile(state)).toBe(true);
    });

    test('isFetchingResources selector', () => {
        const featureState = { ...initialState, isFetchingResources: true } as any;
        const state = { auth: featureState } as any;
        expect(selectors.isFetchingResources(state)).toBe(true);
    });

    test('isFetchingObjects selector', () => {
        const featureState = { ...initialState, isFetchingObjects: true } as any;
        const state = { auth: featureState } as any;
        expect(selectors.isFetchingObjects(state)).toBe(true);
    });
});
