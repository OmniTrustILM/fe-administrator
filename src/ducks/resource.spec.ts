import { describe, expect, test } from 'vitest';
import reducer, { actions, initialState, selectors } from './resource';

const sampleResource = { name: 'CERTIFICATES', hasComplianceProfiles: true } as any;
const sampleResourceNoCompliance = { name: 'KEYS', hasComplianceProfiles: false } as any;
const sampleEvent = { name: 'CERTIFICATE_ISSUED', resource: 'CERTIFICATES' } as any;

describe('resource slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('listResources sets isFetchingResourcesList to true', () => {
        const state = reducer(initialState, actions.listResources());
        expect(state.isFetchingResourcesList).toBe(true);
    });

    test('listResourcesSuccess sets resourcesList and clears isFetchingResourcesList', () => {
        const resourcesList = [sampleResource, sampleResourceNoCompliance];
        const state = reducer({ ...initialState, isFetchingResourcesList: true }, actions.listResourcesSuccess({ resourcesList } as any));
        expect(state.isFetchingResourcesList).toBe(false);
        expect(state.resourcesList).toEqual(resourcesList);
    });

    test('listResourcesFailure clears isFetchingResourcesList', () => {
        const state = reducer({ ...initialState, isFetchingResourcesList: true }, actions.listResourcesFailure({ error: 'failed' } as any));
        expect(state.isFetchingResourcesList).toBe(false);
    });

    test('listAllResourceEvents sets isFetchingResourceEvents to true', () => {
        const state = reducer(initialState, actions.listAllResourceEvents());
        expect(state.isFetchingResourceEvents).toBe(true);
    });

    test('listAllResourceEventsSuccess flattens mappedEvents into allResourceEvents', () => {
        const mappedEvents = {
            group1: [sampleEvent],
            group2: [{ name: 'CERT_RENEWED', resource: 'CERTIFICATES' } as any],
        };
        const state = reducer(
            { ...initialState, isFetchingResourceEvents: true },
            actions.listAllResourceEventsSuccess({ mappedEvents } as any),
        );
        expect(state.isFetchingResourceEvents).toBe(false);
        expect(state.allResourceEvents).toHaveLength(2);
        expect(state.allResourceEvents).toContainEqual(sampleEvent);
    });

    test('listAllResourceEventsSuccess with undefined mappedEvents keeps allResourceEvents unchanged', () => {
        const prev = [sampleEvent];
        const state = reducer(
            { ...initialState, isFetchingResourceEvents: true, allResourceEvents: prev },
            actions.listAllResourceEventsSuccess({} as any),
        );
        expect(state.isFetchingResourceEvents).toBe(false);
        expect(state.allResourceEvents).toEqual(prev);
    });

    test('listAllResourceEventsFailure clears isFetchingResourceEvents', () => {
        const state = reducer(
            { ...initialState, isFetchingResourceEvents: true },
            actions.listAllResourceEventsFailure({ error: 'err' } as any),
        );
        expect(state.isFetchingResourceEvents).toBe(false);
    });

    test('listResourceEvents sets isFetchingResourceEvents to true', () => {
        const state = reducer(initialState, actions.listResourceEvents({ resource: 'CERTIFICATES' } as any));
        expect(state.isFetchingResourceEvents).toBe(true);
    });

    test('listResourceEventsSuccess sets resourceEvents and clears isFetchingResourceEvents', () => {
        const events = [sampleEvent];
        const state = reducer({ ...initialState, isFetchingResourceEvents: true }, actions.listResourceEventsSuccess({ events } as any));
        expect(state.isFetchingResourceEvents).toBe(false);
        expect(state.resourceEvents).toEqual(events);
    });

    test('listResourceEventsFailure clears isFetchingResourceEvents', () => {
        const state = reducer(
            { ...initialState, isFetchingResourceEvents: true },
            actions.listResourceEventsFailure({ error: 'err' } as any),
        );
        expect(state.isFetchingResourceEvents).toBe(false);
    });

    test('resetState restores initial state', () => {
        const dirty = {
            resourcesList: [sampleResource],
            allResourceEvents: [sampleEvent],
            resourceEvents: [sampleEvent],
            isFetchingResourcesList: true,
            isFetchingResourceEvents: true,
        };
        const state = reducer(dirty as any, actions.resetState());
        expect(state).toEqual(initialState);
    });

    test('resetState removes extra keys not in initialState', () => {
        const dirty = { ...initialState, extraKey: 'extra' };
        const state = reducer(dirty as any, actions.resetState());
        expect((state as any).extraKey).toBeUndefined();
    });

    describe('selectors', () => {
        const store = {
            resource: {
                resourcesList: [sampleResource, sampleResourceNoCompliance],
                allResourceEvents: [sampleEvent],
                resourceEvents: [sampleEvent],
                isFetchingResourcesList: true,
                isFetchingResourceEvents: false,
            },
        };

        test('resourcesList returns the full resources list', () => {
            expect(selectors.resourcesList(store)).toEqual([sampleResource, sampleResourceNoCompliance]);
        });

        test('resourcesWithComplianceProfiles filters to resources with hasComplianceProfiles true', () => {
            const result = selectors.resourcesWithComplianceProfiles(store);
            expect(result).toEqual([sampleResource]);
        });

        test('resourceEvents returns resourceEvents', () => {
            expect(selectors.resourceEvents(store)).toEqual([sampleEvent]);
        });

        test('allResourceEvents returns allResourceEvents', () => {
            expect(selectors.allResourceEvents(store)).toEqual([sampleEvent]);
        });

        test('isFetchingResourcesList returns isFetchingResourcesList', () => {
            expect(selectors.isFetchingResourcesList(store)).toBe(true);
        });

        test('isFetchingResourceEvents returns isFetchingResourceEvents', () => {
            expect(selectors.isFetchingResourceEvents(store)).toBe(false);
        });

        test('resourcesWithComplianceProfiles returns empty array when none qualify', () => {
            const s = { resource: { ...store.resource, resourcesList: [sampleResourceNoCompliance] } };
            expect(selectors.resourcesWithComplianceProfiles(s)).toEqual([]);
        });
    });
});
