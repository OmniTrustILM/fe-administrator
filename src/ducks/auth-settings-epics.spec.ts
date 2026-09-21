import type { UnknownAction } from '@reduxjs/toolkit';
import type { Observable } from 'rxjs';
import { of, Subject } from 'rxjs';
import { describe, expect, test } from 'vitest';

import { actions } from './auth-settings';
import authSettingsEpics from './auth-settings-epics';
import { actions as userInterfaceActions } from './user-interface';

const GET_OAUTH2_PROVIDER_SETTINGS_EPIC_INDEX = 2;

describe('auth settings epics', () => {
    test('only emits the latest OAuth2 provider when an earlier request completes last', () => {
        const action$ = new Subject<UnknownAction>();
        const responses: Record<string, Subject<{ name: string }>> = {
            'provider-a': new Subject(),
            'provider-b': new Subject(),
        };
        const requested: string[] = [];
        const deps = {
            apiClients: {
                settings: {
                    getOAuth2ProviderSettings: ({ providerName }: { providerName: string }) => {
                        requested.push(providerName);
                        return responses[providerName];
                    },
                },
            },
        };
        const epic = authSettingsEpics[GET_OAUTH2_PROVIDER_SETTINGS_EPIC_INDEX] as (
            action$: Subject<UnknownAction>,
            state$: Observable<unknown>,
            deps: unknown,
        ) => Observable<UnknownAction>;
        const emitted: UnknownAction[] = [];
        const subscription = epic(action$, of({}), deps).subscribe((action) => emitted.push(action));

        action$.next(actions.getOAuth2ProviderSettings({ providerName: 'provider-a' }));
        action$.next(actions.getOAuth2ProviderSettings({ providerName: 'provider-b' }));
        responses['provider-b'].next({ name: 'provider-b' });
        responses['provider-b'].complete();
        responses['provider-a'].next({ name: 'provider-a' });
        responses['provider-a'].complete();

        expect(requested).toEqual(['provider-a', 'provider-b']);
        expect(emitted.map((action) => action.type)).toEqual([
            actions.getOAuth2ProviderSettingsSuccess.type,
            userInterfaceActions.removeWidgetLock.type,
        ]);
        expect(emitted[0]).toEqual(
            actions.getOAuth2ProviderSettingsSuccess({
                oauth2Provider: { name: 'provider-b' },
            }),
        );
        subscription.unsubscribe();
    });
});
