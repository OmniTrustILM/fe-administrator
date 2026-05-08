import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './auth-settings';

describe('authSettings slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initial values', () => {
        const dirty = {
            ...initialState,
            isFetchingSettings: true,
            isFetchingProvider: true,
            authenticationSettings: { disableLocalhostUser: false } as any,
            oauth2Provider: { name: 'p1' } as any,
            tempKey: 'gone',
        } as any;

        const next = reducer(dirty, actions.resetState());

        expect(next).toEqual(initialState);
        expect((next as any).tempKey).toBeUndefined();
    });

    test('getAuthenticationSettings / success / failure', () => {
        let next = reducer(initialState, actions.getAuthenticationSettings());
        expect(next.isFetchingSettings).toBe(true);

        const settings = { disableLocalhostUser: true, oauth2Providers: {} } as any;
        next = reducer(next, actions.getAuthenticationSettingsSuccess({ settings }));
        expect(next.isFetchingSettings).toBe(false);
        expect(next.authenticationSettings).toEqual(settings);

        next = reducer({ ...next, isFetchingSettings: true }, actions.getAuthenticationSettingsFailure({ error: 'err' }));
        expect(next.isFetchingSettings).toBe(false);
    });

    test('updateAuthenticationSettings / success / failure', () => {
        const existing = { disableLocalhostUser: false, oauth2Providers: { prov1: { name: 'prov1' } } } as any;
        let next = reducer(
            { ...initialState, authenticationSettings: existing },
            actions.updateAuthenticationSettings({ authenticationSettingsUpdateModel: { disableLocalhostUser: true } as any }),
        );
        expect(next.isUpdatingSettings).toBe(true);

        next = reducer(
            next,
            actions.updateAuthenticationSettingsSuccess({
                authenticationSettingsUpdateModel: { disableLocalhostUser: true, oauth2Providers: [{ name: 'prov2' }] } as any,
            }),
        );
        expect(next.isUpdatingSettings).toBe(false);
        expect(next.authenticationSettings?.disableLocalhostUser).toBe(true);
        expect(next.authenticationSettings?.oauth2Providers?.prov2).toEqual({ name: 'prov2' });

        next = reducer({ ...next, isUpdatingSettings: true }, actions.updateAuthenticationSettingsFailure({ error: 'err' }));
        expect(next.isUpdatingSettings).toBe(false);
    });

    test('updateAuthenticationSettings success when authenticationSettings is undefined is a no-op', () => {
        const next = reducer(
            initialState,
            actions.updateAuthenticationSettingsSuccess({
                authenticationSettingsUpdateModel: { disableLocalhostUser: true } as any,
            }),
        );
        expect(next.authenticationSettings).toBeUndefined();
    });

    test('resetOAuth2ProviderSettings clears oauth2Provider', () => {
        const next = reducer({ ...initialState, oauth2Provider: { name: 'p1' } as any }, actions.resetOAuth2ProviderSettings());
        expect(next.oauth2Provider).toBeUndefined();
    });

    test('getOAuth2ProviderSettings / success / failure', () => {
        let next = reducer(initialState, actions.getOAuth2ProviderSettings({ providerName: 'p1' }));
        expect(next.isFetchingProvider).toBe(true);

        const provider = { name: 'p1', clientId: 'id' } as any;
        next = reducer(next, actions.getOAuth2ProviderSettingsSuccess({ oauth2Provider: provider }));
        expect(next.isFetchingProvider).toBe(false);
        expect(next.oauth2Provider).toEqual(provider);

        next = reducer({ ...next, isFetchingProvider: true }, actions.getOAuth2ProviderSettingsFailure({ error: 'err' }));
        expect(next.isFetchingProvider).toBe(false);
    });

    test('updateOAuth2Provider / success / failure', () => {
        let next = reducer(
            initialState,
            actions.updateOAuth2Provider({ providerName: 'p1', oauth2ProviderSettingsUpdateModel: {} as any }),
        );
        expect(next.isUpdatingProvider).toBe(true);
        expect(next.updateProviderSucceeded).toBe(false);

        next = reducer(next, actions.updateOAuth2ProviderSuccess());
        expect(next.isUpdatingProvider).toBe(false);
        expect(next.updateProviderSucceeded).toBe(true);

        next = reducer({ ...next, isUpdatingProvider: true }, actions.updateOAuth2ProviderFailure({ error: 'err' }));
        expect(next.isUpdatingProvider).toBe(false);
        expect(next.updateProviderSucceeded).toBe(false);
    });

    test('createOAuth2Provider / success / failure', () => {
        let next = reducer(
            initialState,
            actions.createOAuth2Provider({ providerName: 'p1', oauth2ProviderSettingsUpdateModel: {} as any }),
        );
        expect(next.isCreatingProvider).toBe(true);
        expect(next.createProviderSucceeded).toBe(false);

        next = reducer(next, actions.createOAuth2ProviderSuccess());
        expect(next.isCreatingProvider).toBe(false);
        expect(next.createProviderSucceeded).toBe(true);

        next = reducer({ ...next, isCreatingProvider: true }, actions.createOAuth2ProviderFailure({ error: 'err' }));
        expect(next.isCreatingProvider).toBe(false);
        expect(next.createProviderSucceeded).toBe(false);
    });

    test('removeOAuth2Provider / success / failure', () => {
        let next = reducer(initialState, actions.removeOAuth2Provider({ providerName: 'p1' }));
        expect(next.isRemovingProvider).toBe(true);

        next = reducer(next, actions.removeOAuth2ProviderSuccess());
        expect(next.isRemovingProvider).toBe(false);

        next = reducer({ ...next, isRemovingProvider: true }, actions.removeOAuth2ProviderFailure({ error: 'err' }));
        expect(next.isRemovingProvider).toBe(false);
    });
});

describe('authSettings selectors', () => {
    test('selectors read values from authSettings state', () => {
        const settings = { disableLocalhostUser: true } as any;
        const provider = { name: 'p1' } as any;
        const featureState = {
            ...initialState,
            authenticationSettings: settings,
            oauth2Provider: provider,
            isFetchingSettings: true,
            isFetchingProvider: true,
            isUpdatingSettings: true,
            isUpdatingProvider: true,
            updateProviderSucceeded: true,
            isRemovingProvider: true,
            isCreatingProvider: true,
            createProviderSucceeded: true,
        };

        const state = { authSettings: featureState } as any;

        expect(selectors.authenticationSettings(state)).toEqual(settings);
        expect(selectors.oauth2Provider(state)).toEqual(provider);
        expect(selectors.isFetchingSettings(state)).toBe(true);
        expect(selectors.isFetchingProvider(state)).toBe(true);
        expect(selectors.isUpdatingSettings(state)).toBe(true);
        expect(selectors.isUpdatingProvider(state)).toBe(true);
        expect(selectors.updateProviderSucceeded(state)).toBe(true);
        expect(selectors.isRemovingProvider(state)).toBe(true);
        expect(selectors.isCreatingProvider(state)).toBe(true);
        expect(selectors.createProviderSucceeded(state)).toBe(true);
    });
});
