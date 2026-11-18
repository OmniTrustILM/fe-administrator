import type { UnknownAction } from '@reduxjs/toolkit';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';
import { toArray } from 'rxjs/operators';
import { describe, expect, test, vi } from 'vitest';
import { JwkSetLoadFailure, type OAuth2ProviderSettingsResponseDto } from 'types/openapi';

import { actions } from './auth-settings';
import authSettingsEpics from './auth-settings-epics';
import { actions as appRedirectActions } from './app-redirect';
import { actions as userInterfaceActions } from './user-interface';

const GET_OAUTH2_PROVIDER_SETTINGS_EPIC_INDEX = 2;
const UPDATE_OAUTH2_PROVIDER_EPIC_INDEX = 3;

describe('auth settings epics', () => {
    test('only emits the latest OAuth2 provider when an earlier request completes last', () => {
        const action$ = new Subject<UnknownAction>();
        const responses: Record<string, Subject<RawProviderResponse>> = {
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
        responses['provider-b'].next(
            rawResponse({
                name: 'provider-b',
                jwkSetKeys: [],
                jwkSetLoadFailure: JwkSetLoadFailure.Unavailable,
            }),
        );
        responses['provider-b'].complete();
        responses['provider-a'].next(rawResponse({ name: 'provider-a', jwkSetKeys: [] }));
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

    test('keepsTheProviderTag_whenTheReadReturnsAnETag', async () => {
        // given
        const providerTag = '"tag-of-the-read"';
        const getOAuth2ProviderSettings = vi.fn(() => of(rawResponse({ name: 'provider', jwkSetKeys: [] }, { etag: providerTag })));

        // when
        const emitted = await runEpic(
            GET_OAUTH2_PROVIDER_SETTINGS_EPIC_INDEX,
            actions.getOAuth2ProviderSettings({ providerName: 'provider' }),
            { getOAuth2ProviderSettings },
        );

        // then
        expect(emitted[0]).toEqual(
            actions.getOAuth2ProviderSettingsSuccess({ oauth2Provider: { name: 'provider', jwkSetKeys: [] }, eTag: providerTag }),
        );
        expect(getOAuth2ProviderSettings).toHaveBeenCalledWith({ providerName: 'provider' }, { responseOpts: { response: 'raw' } });
    });

    test('sendsIfMatch_whenTheUpdateCarriesTheLoadedTag', async () => {
        // given
        const loadedTag = '"tag-of-the-read"';
        const updateOAuth2ProviderSettings = vi.fn(() => of(undefined));

        // when
        await runEpic(UPDATE_OAUTH2_PROVIDER_EPIC_INDEX, updateAction(loadedTag), { updateOAuth2ProviderSettings });

        // then
        expect(updateOAuth2ProviderSettings).toHaveBeenCalledWith(
            expect.objectContaining({ providerName: 'provider', ifMatch: loadedTag }),
        );
    });

    test('reportsAConflictWithoutAnErrorToast_whenCoreAnswers412', async () => {
        // given
        const preconditionFailed = coreError(412);
        const updateOAuth2ProviderSettings = vi.fn(() => throwError(() => preconditionFailed));

        // when
        const emitted = await runEpic(UPDATE_OAUTH2_PROVIDER_EPIC_INDEX, updateAction('"stale"'), { updateOAuth2ProviderSettings });

        // then
        expect(emitted).toHaveLength(1);
        expect(emitted[0]).toMatchObject({ type: actions.updateOAuth2ProviderFailure.type, payload: { conflict: true } });
    });

    test('raisesTheErrorToast_whenTheUpdateFailsOtherwise', async () => {
        // given
        const serverError = coreError(500);
        const updateOAuth2ProviderSettings = vi.fn(() => throwError(() => serverError));

        // when
        const emitted = await runEpic(UPDATE_OAUTH2_PROVIDER_EPIC_INDEX, updateAction('"tag"'), { updateOAuth2ProviderSettings });

        // then
        expect(emitted.map((action) => action.type)).toEqual([
            actions.updateOAuth2ProviderFailure.type,
            appRedirectActions.fetchError.type,
        ]);
        expect(emitted[0]).not.toMatchObject({ payload: { conflict: true } });
    });
});

// ── Helpers ───────────────────────────────────────────────────────────────

type RawProviderResponse = { response: OAuth2ProviderSettingsResponseDto; responseHeaders: Record<string, string> };

function rawResponse(response: OAuth2ProviderSettingsResponseDto, responseHeaders: Record<string, string> = {}): RawProviderResponse {
    return { response, responseHeaders };
}

function coreError(status: number) {
    return new AjaxError('failed', { status, response: { message: 'refused' } } as never, {} as never);
}

function updateAction(ifMatch: string) {
    return actions.updateOAuth2Provider({ providerName: 'provider', oauth2ProviderSettingsUpdateModel: {} as any, ifMatch });
}

function runEpic(epicIndex: number, action: UnknownAction, settings: Record<string, unknown>): Promise<UnknownAction[]> {
    const epic = authSettingsEpics[epicIndex];
    return firstValueFrom(epic(of(action) as any, of({}) as any, { apiClients: { settings } } as any).pipe(toArray()));
}
