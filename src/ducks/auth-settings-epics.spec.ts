import type { UnknownAction } from '@reduxjs/toolkit';
import { of, Subject } from 'rxjs';
import { describe, expect, test } from 'vitest';
import { JwkSetLoadFailure, type OAuth2ProviderSettingsResponseDto } from 'types/openapi';

import { actions } from './auth-settings';
import authSettingsEpics from './auth-settings-epics';
import { actions as userInterfaceActions } from './user-interface';

const GET_OAUTH2_PROVIDER_SETTINGS_EPIC_INDEX = 2;

describe('auth settings epics', () => {
    test('only emits the latest OAuth2 provider when an earlier request completes last', () => {
        const action$ = new Subject<UnknownAction>();
        const responses: Record<string, Subject<OAuth2ProviderSettingsResponseDto>> = {
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
        const epic = authSettingsEpics[GET_OAUTH2_PROVIDER_SETTINGS_EPIC_INDEX];
        const emitted: UnknownAction[] = [];
        const subscription = epic(action$, of({}) as any, deps as any).subscribe((action) => emitted.push(action));

        action$.next(actions.getOAuth2ProviderSettings({ providerName: 'provider-a' }));
        action$.next(actions.getOAuth2ProviderSettings({ providerName: 'provider-b' }));
        responses['provider-b'].next({
            name: 'provider-b',
            jwkSetKeys: [],
            jwkSetLoadFailure: JwkSetLoadFailure.Unavailable,
        });
        responses['provider-b'].complete();
        responses['provider-a'].next({ name: 'provider-a', jwkSetKeys: [] });
        responses['provider-a'].complete();

        expect(requested).toEqual(['provider-a', 'provider-b']);
        expect(emitted.map((action) => action.type)).toEqual([
            actions.getOAuth2ProviderSettingsSuccess.type,
            userInterfaceActions.removeWidgetLock.type,
        ]);
        expect(emitted[0]).toEqual(
            actions.getOAuth2ProviderSettingsSuccess({
                oauth2Provider: {
                    name: 'provider-b',
                    jwkSetKeys: [],
                    jwkSetLoadFailure: JwkSetLoadFailure.Unavailable,
                },
            }),
        );
        subscription.unsubscribe();
    });
});
