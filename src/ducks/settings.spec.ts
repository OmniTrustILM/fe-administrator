import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './settings';

describe('settings slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('getPlatformSettings / success / failure', () => {
        let next = reducer(initialState, actions.getPlatformSettings());
        expect(next.isFetchingPlatform).toBe(true);

        next = reducer(next, actions.getPlatformSettingsSuccess({ utils: {} } as any));
        expect(next.isFetchingPlatform).toBe(false);
        expect(next.platformSettings).toEqual({ utils: {} });

        next = reducer({ ...next, isFetchingPlatform: true }, actions.getPlatformSettingsFailure({ error: 'err' }));
        expect(next.isFetchingPlatform).toBe(false);
    });

    test('updatePlatformSettings / success / failure', () => {
        const base = { ...initialState, platformSettings: { utils: { utilsServiceUrl: 'old' } } as any };

        let next = reducer(base, actions.updatePlatformSettings({ utils: { utilsServiceUrl: 'new' } } as any));
        expect(next.isUpdatingPlatform).toBe(true);

        next = reducer(next, actions.updatePlatformSettingsSuccess({ utils: { utilsServiceUrl: 'new' } } as any));
        expect(next.isUpdatingPlatform).toBe(false);
        expect((next.platformSettings as any)?.utils?.utilsServiceUrl).toBe('new');

        next = reducer({ ...next, isUpdatingPlatform: true }, actions.updatePlatformSettingsFailure({ error: 'err' }));
        expect(next.isUpdatingPlatform).toBe(false);
    });

    test('getEventsSettings / success / failure', () => {
        let next = reducer(initialState, actions.getEventsSettings());
        expect(next.isFetchingEventsSetting).toBe(true);

        next = reducer(next, actions.getEventsSettingsSuccess({ eventsMapping: {} } as any));
        expect(next.isFetchingEventsSetting).toBe(false);
        expect(next.eventsSettings).toEqual({ eventsMapping: {} });

        next = reducer({ ...next, isFetchingEventsSetting: true }, actions.getEventsSettingsFailure({ error: 'err' }));
        expect(next.isFetchingEventsSetting).toBe(false);
    });

    test('updateEventSettings / success / failure', () => {
        const base = { ...initialState, eventsSettings: { eventsMapping: { EVT_A: ['t1'] } } as any };

        let next = reducer(base, actions.updateEventSettings({ eventSettings: { event: 'EVT_A', triggerUuids: ['t2'] } as any }));
        expect(next.isUpdatingEventsSetting).toBe(true);

        next = reducer(next, actions.updateEventSettingsSuccess({ eventSettings: { event: 'EVT_A', triggerUuids: ['t2'] } as any }));
        expect(next.isUpdatingEventsSetting).toBe(false);
        expect((next.eventsSettings as any)?.eventsMapping?.EVT_A).toEqual(['t2']);

        next = reducer({ ...next, isUpdatingEventsSetting: true }, actions.updateEventSettingsFailure({ error: 'err' }));
        expect(next.isUpdatingEventsSetting).toBe(false);
    });

    test('getLoggingSettings / success / failure', () => {
        let next = reducer(initialState, actions.getLoggingSettings());
        expect(next.isFetchingLoggingSetting).toBe(true);

        next = reducer(next, actions.getLoggingSettingsSuccess({ auditLogs: {} } as any));
        expect(next.isFetchingLoggingSetting).toBe(false);
        expect(next.loggingSettings).toEqual({ auditLogs: {} });

        next = reducer({ ...next, isFetchingLoggingSetting: true }, actions.getLoggingSettingsFailure({ error: 'err' }));
        expect(next.isFetchingLoggingSetting).toBe(false);
    });

    test('updateLoggingSettings / success / failure', () => {
        let next = reducer(initialState, actions.updateLoggingSettings({ auditLogs: {} } as any));
        expect(next.isUpdatingLoggingSetting).toBe(true);

        next = reducer(next, actions.updateLoggingSettingsSuccess({ auditLogs: { enabled: true } } as any));
        expect(next.isUpdatingLoggingSetting).toBe(false);
        expect(next.loggingSettings).toEqual({ auditLogs: { enabled: true } });

        next = reducer({ ...next, isUpdatingLoggingSetting: true }, actions.updateLoggingSettingsFailure({ error: 'err' }));
        expect(next.isUpdatingLoggingSetting).toBe(false);
    });
});

describe('settings selectors', () => {
    test('selectors read from state', () => {
        const featureState: any = {
            ...initialState,
            platformSettings: { utils: {} },
            isFetchingPlatform: true,
            isUpdatingPlatform: true,
            eventsSettings: { eventsMapping: {} },
            isFetchingEventsSetting: true,
            isUpdatingEventsSetting: true,
            loggingSettings: { auditLogs: {} },
            isFetchingLoggingSetting: true,
            isUpdatingLoggingSetting: true,
        };
        const state = { settings: featureState } as any;

        expect(selectors.platformSettings(state)).toEqual({ utils: {} });
        expect(selectors.isFetchingPlatform(state)).toBe(true);
        expect(selectors.isUpdatingPlatform(state)).toBe(true);
        expect(selectors.eventsSettings(state)).toEqual({ eventsMapping: {} });
        expect(selectors.isFetchingEventsSetting(state)).toBe(true);
        expect(selectors.isUpdatingEventsSetting(state)).toBe(true);
        expect(selectors.loggingSettings(state)).toEqual({ auditLogs: {} });
        expect(selectors.isFetchingLoggingSetting(state)).toBe(true);
        expect(selectors.isUpdatingLoggingSetting(state)).toBe(true);
    });
});
