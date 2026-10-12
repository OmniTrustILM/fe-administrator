import { describe, expect, test } from 'vitest';
import { Resource, ResourceEvent } from 'types/openapi';
import reducer, { actions, initialState, selectors } from './event-history';
import { sampleEventHistory, sampleEventHistoryRequest, sampleObjectEventHistory } from './__fixtures__/event-history';

describe('event-history slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('getPlatformSettingsEventHistory clears eventHistory and sets isFetchingEventHistory to true', () => {
        const state = reducer(
            { ...initialState, isFetchingEventHistory: false, eventHistory: sampleEventHistory, isFetchingObjectEventHistory: false },
            actions.getPlatformSettingsEventHistory({
                event: ResourceEvent.CertificateStatusChanged,
                request: sampleEventHistoryRequest,
            }),
        );
        expect(state.isFetchingEventHistory).toBe(true);
        expect(state.eventHistory).toBeUndefined();
    });

    test('getPlatformSettingsEventHistorySuccess sets eventHistory and clears isFetchingEventHistory', () => {
        const state = reducer(
            { ...initialState, isFetchingEventHistory: true, eventHistory: undefined, isFetchingObjectEventHistory: false },
            actions.getPlatformSettingsEventHistorySuccess({ eventHistory: sampleEventHistory }),
        );
        expect(state.isFetchingEventHistory).toBe(false);
        expect(state.eventHistory).toEqual(sampleEventHistory);
    });

    test('getPlatformSettingsEventHistoryFailure clears isFetchingEventHistory', () => {
        const state = reducer(
            { ...initialState, isFetchingEventHistory: true, eventHistory: undefined, isFetchingObjectEventHistory: false },
            actions.getPlatformSettingsEventHistoryFailure({ error: 'boom' }),
        );
        expect(state.isFetchingEventHistory).toBe(false);
    });

    test('resetEventHistory wipes eventHistory and isFetchingEventHistory', () => {
        const dirty = {
            ...initialState,
            isFetchingEventHistory: true,
            eventHistory: sampleEventHistory,
            isFetchingObjectEventHistory: true,
            objectEventHistory: sampleObjectEventHistory,
        };
        const state = reducer(dirty, actions.resetEventHistory());
        expect(state).toEqual(initialState);
    });

    test('getObjectEventHistory clears objectEventHistory and sets isFetchingObjectEventHistory to true', () => {
        const state = reducer(
            {
                ...initialState,
                isFetchingEventHistory: false,
                isFetchingObjectEventHistory: false,
                objectEventHistory: sampleObjectEventHistory,
            },
            actions.getObjectEventHistory({
                resource: Resource.Certificates,
                uuid: 'object-uuid',
                itemsPerPage: 10,
                pageNumber: 1,
            }),
        );
        expect(state.isFetchingObjectEventHistory).toBe(true);
        expect(state.objectEventHistory).toBeUndefined();
    });

    test('getObjectEventHistorySuccess sets objectEventHistory and clears isFetchingObjectEventHistory', () => {
        const state = reducer(
            { ...initialState, isFetchingEventHistory: false, isFetchingObjectEventHistory: true, objectEventHistory: undefined },
            actions.getObjectEventHistorySuccess({ objectEventHistory: sampleObjectEventHistory }),
        );
        expect(state.isFetchingObjectEventHistory).toBe(false);
        expect(state.objectEventHistory).toEqual(sampleObjectEventHistory);
    });

    test('getObjectEventHistoryFailure clears isFetchingObjectEventHistory', () => {
        const state = reducer(
            { ...initialState, isFetchingEventHistory: false, isFetchingObjectEventHistory: true, objectEventHistory: undefined },
            actions.getObjectEventHistoryFailure({ error: 'boom' }),
        );
        expect(state.isFetchingObjectEventHistory).toBe(false);
    });

    describe('selectors', () => {
        const store = {
            eventHistory: {
                isFetchingEventHistory: true,
                eventHistory: sampleEventHistory,
                isFetchingObjectEventHistory: true,
                objectEventHistory: sampleObjectEventHistory,
            },
        };

        test('eventHistory returns eventHistory from state', () => {
            expect(selectors.eventHistory(store)).toEqual(sampleEventHistory);
        });

        test('eventHistory returns undefined when not set', () => {
            const s = { eventHistory: { ...initialState, isFetchingEventHistory: false, eventHistory: undefined } };
            expect(selectors.eventHistory(s)).toBeUndefined();
        });

        test('isFetchingEventHistory returns the flag', () => {
            expect(selectors.isFetchingEventHistory(store)).toBe(true);
        });

        test('objectEventHistory returns objectEventHistory from state', () => {
            expect(selectors.objectEventHistory(store)).toEqual(sampleObjectEventHistory);
        });

        test('isFetchingObjectEventHistory returns the flag', () => {
            expect(selectors.isFetchingObjectEventHistory(store)).toBe(true);
        });

        test('state falls back to initialState when slice missing', () => {
            expect(selectors.state({})).toEqual(initialState);
        });

        test('state returns the eventHistory slice when present', () => {
            expect(selectors.state(store)).toEqual(store.eventHistory);
        });
    });

    test('condition filter fields are kept per resource and a failed read leaves nothing behind', () => {
        const certificateFields = [{ filterFieldSource: 'property', searchFieldData: [] }] as any;
        let state = reducer(initialState, actions.getConditionFilterFields({ resource: Resource.Certificates }));
        state = reducer(state, actions.getConditionFilterFields({ resource: Resource.Keys }));
        expect(state.fetchingConditionFilterFieldsFor).toEqual([Resource.Certificates, Resource.Keys]);

        state = reducer(
            state,
            actions.getConditionFilterFieldsSuccess({ resource: Resource.Certificates, filterFields: certificateFields }),
        );
        state = reducer(state, actions.getConditionFilterFieldsFailure({ resource: Resource.Keys, error: 'boom' }));

        expect(selectors.conditionFilterFields(Resource.Certificates)({ eventHistory: state } as any)).toEqual(certificateFields);
        expect(selectors.conditionFilterFields(Resource.Keys)({ eventHistory: state } as any)).toBeUndefined();
        expect(selectors.conditionFilterFields(undefined)({ eventHistory: state } as any)).toBeUndefined();
        expect(state.fetchingConditionFilterFieldsFor).toEqual([]);
    });
});
