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

    test('updatePlatformSettings clears the outcome of the previous update', () => {
        const settled = {
            ...initialState,
            updatePlatformSettingsSucceeded: true,
            platformSettingsFieldErrors: { 'signing.maxItemsPerRequest': 'old' },
            platformSettingsUpdateError: 'old',
        };

        const next = reducer(settled, actions.updatePlatformSettings({ signing: {} }));

        expect(next.updatePlatformSettingsSucceeded).toBe(false);
        expect(next.platformSettingsFieldErrors).toBeUndefined();
        expect(next.platformSettingsUpdateError).toBeUndefined();
    });

    test('updatePlatformSettingsSuccess marks the update as succeeded', () => {
        const next = reducer({ ...initialState, isUpdatingPlatform: true }, actions.updatePlatformSettingsSuccess({ signing: {} }));

        expect(next.updatePlatformSettingsSucceeded).toBe(true);
    });

    test('updatePlatformSettingsFailure keeps the error and the refused fields, and leaves the update unsucceeded', () => {
        const error = 'Failed to update platform settings (422): signing.maxItemsPerRequest must not exceed 1000';
        const fieldErrors = { 'signing.maxItemsPerRequest': 'must not exceed 1000' };

        const next = reducer({ ...initialState, isUpdatingPlatform: true }, actions.updatePlatformSettingsFailure({ error, fieldErrors }));

        expect(next.updatePlatformSettingsSucceeded).toBe(false);
        expect(next.platformSettingsUpdateError).toBe(error);
        expect(next.platformSettingsFieldErrors).toStrictEqual(fieldErrors);
    });

    test('updatePlatformSettingsSuccess keeps the upload group the update sent', () => {
        const next = reducer(
            { ...initialState, platformSettings: { utils: {} } as any },
            actions.updatePlatformSettingsSuccess({ certificates: { upload: { automaticOwnership: true } } }),
        );

        expect(next.platformSettings?.certificates?.upload).toEqual({ automaticOwnership: true });
        expect(next.platformSettings?.utils).toEqual({});
    });

    test('updatePlatformSettingsSuccess stores an upload group sent without the flag as off', () => {
        const next = reducer(initialState, actions.updatePlatformSettingsSuccess({ certificates: { upload: {} } }));

        expect(next.platformSettings?.certificates?.upload).toEqual({ automaticOwnership: false });
    });

    test('updatePlatformSettingsSuccess keeps the stored upload group when the update sent none', () => {
        const stored = { ...initialState, platformSettings: { certificates: { upload: { automaticOwnership: true } } } };

        const next = reducer(stored, actions.updatePlatformSettingsSuccess({ certificates: { validation: { enabled: true } } }));

        expect(next.platformSettings?.certificates?.upload).toEqual({ automaticOwnership: true });
    });

    test('updatePlatformSettingsSuccess leaves no upload group when none is stored and the update sent none', () => {
        const next = reducer(initialState, actions.updatePlatformSettingsSuccess({ certificates: { validation: { enabled: true } } }));

        expect(next.platformSettings?.certificates?.upload).toBeUndefined();
    });

    test('getEventsSettings / success / failure', () => {
        let next = reducer({ ...initialState, updateEventSettingsSucceeded: true }, actions.getEventsSettings());
        expect(next.isFetchingEventsSetting).toBe(true);
        expect(next.updateEventSettingsSucceeded).toBe(false);

        next = reducer(next, actions.getEventsSettingsSuccess({ eventsMapping: {} } as any));
        expect(next.isFetchingEventsSetting).toBe(false);
        expect(next.eventsSettings).toEqual({ eventsMapping: {} });

        next = reducer({ ...next, isFetchingEventsSetting: true }, actions.getEventsSettingsFailure({ error: 'err' }));
        expect(next.isFetchingEventsSetting).toBe(false);
    });

    test('updateEventSettings / success / failure', () => {
        const base = {
            ...initialState,
            eventsSettings: { eventsMapping: { EVT_A: ['t1'] } } as any,
            updateEventSettingsSucceeded: true,
        };

        let next = reducer(base, actions.updateEventSettings({ eventSettings: { event: 'EVT_A', triggerUuids: ['t2'] } as any }));
        expect(next.isUpdatingEventsSetting).toBe(true);
        expect(next.updateEventSettingsSucceeded).toBe(false);

        next = reducer(next, actions.updateEventSettingsSuccess({ eventSettings: { event: 'EVT_A', triggerUuids: ['t2'] } as any }));
        expect(next.isUpdatingEventsSetting).toBe(false);
        expect((next.eventsSettings as any)?.eventsMapping?.EVT_A).toEqual(['t2']);
        expect(next.updateEventSettingsSucceeded).toBe(true);

        next = reducer({ ...next, isUpdatingEventsSetting: true }, actions.updateEventSettingsFailure({ error: 'err' }));
        expect(next.isUpdatingEventsSetting).toBe(false);
        expect(next.updateEventSettingsSucceeded).toBe(false);
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
            updateEventSettingsSucceeded: true,
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
        expect(selectors.updateEventSettingsSucceeded(state)).toBe(true);
        expect(selectors.loggingSettings(state)).toEqual({ auditLogs: {} });
        expect(selectors.isFetchingLoggingSetting(state)).toBe(true);
        expect(selectors.isUpdatingLoggingSetting(state)).toBe(true);
    });
});
