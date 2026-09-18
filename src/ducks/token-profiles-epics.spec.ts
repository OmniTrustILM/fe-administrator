import { firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import { describe, expect, test, vi } from 'vitest';
import { KeyUsage, TokenInstanceStatus } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { actions as userInterfaceActions } from 'ducks/user-interface';
import { actions as appRedirectActions } from './app-redirect';
import { actions, type State } from './token-profiles';
import { getSupportedTokenProfileKeyUsages, getTokenProfileDetail } from './token-profiles-epics';

function createDeps(listSupportedTokenProfileKeyUsages: () => ReturnType<typeof of>) {
    return {
        apiClients: {
            tokenProfiles: {
                listSupportedTokenProfileKeyUsages,
            },
        },
    };
}

describe('token profile detail widget locks', () => {
    for (const skipWidgetLock of [true, undefined]) {
        test(`failed profile fetch ${skipWidgetLock ? 'leaves widget locks untouched' : 'locks the profile widget by default'}`, async () => {
            // given
            const request = { tokenInstanceUuid: 'token-instance', uuid: 'token-profile', skipWidgetLock };
            const apiError = new Error('Profile unavailable');
            const getTokenProfile = vi.fn(() => throwError(() => apiError));

            // when
            const emitted = await firstValueFrom(
                getTokenProfileDetail(
                    of(actions.getTokenProfileDetail(request)) as any,
                    of({}) as any,
                    { apiClients: { tokenProfiles: { getTokenProfile } } } as any,
                ).pipe(toArray()),
            );

            // then
            expect(getTokenProfile).toHaveBeenCalledWith({ tokenInstanceUuid: request.tokenInstanceUuid, uuid: request.uuid });
            expect(emitted).toEqual([
                actions.getTokenProfileDetailFailure({ error: 'Failed to get Token Profile detail. Profile unavailable' }),
                ...(skipWidgetLock ? [] : [userInterfaceActions.insertWidgetLock(apiError as any, LockWidgetNameEnum.TokenProfileDetails)]),
            ]);
        });

        test(`successful profile fetch ${skipWidgetLock ? 'leaves widget locks untouched' : 'unlocks the profile widget by default'}`, async () => {
            // given
            const request = { tokenInstanceUuid: 'token-instance', uuid: 'token-profile', skipWidgetLock };
            const tokenProfile = {
                uuid: request.uuid,
                tokenInstanceUuid: request.tokenInstanceUuid,
                name: 'Token profile',
                tokenInstanceName: 'Token instance',
                tokenInstanceStatus: TokenInstanceStatus.Activated,
                enabled: true,
                attributes: [],
                usages: [KeyUsage.Sign],
            };
            const getTokenProfile = vi.fn(() => of(tokenProfile));

            // when
            const emitted = await firstValueFrom(
                getTokenProfileDetail(
                    of(actions.getTokenProfileDetail(request)) as any,
                    of({}) as any,
                    { apiClients: { tokenProfiles: { getTokenProfile } } } as any,
                ).pipe(toArray()),
            );

            // then
            expect(emitted).toEqual([
                actions.getTokenProfileDetailSuccess({ tokenProfile }),
                ...(skipWidgetLock ? [] : [userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.TokenProfileDetails)]),
            ]);
        });
    }
});

async function runSupportedKeyUsagesEpic(
    action: ReturnType<typeof actions.getSupportedTokenProfileKeyUsages>,
    listSupportedTokenProfileKeyUsages: () => ReturnType<typeof of>,
    count: number,
) {
    const state$ = of({ tokenprofiles: {} as State });
    const output$ = getSupportedTokenProfileKeyUsages(
        of(action) as any,
        state$ as any,
        createDeps(listSupportedTokenProfileKeyUsages) as any,
    );
    return firstValueFrom(output$.pipe(take(count), toArray()));
}

describe('supported token profile key usages epic', () => {
    test('getSupportedTokenProfileKeyUsages_emitsSupportedUsages', async () => {
        // given
        const tokenInstanceUuid = 'token-1';
        const supportedKeyUsages = [KeyUsage.Sign, KeyUsage.Verify];
        const listSupportedTokenProfileKeyUsages = vi.fn(() => of(supportedKeyUsages));

        // when
        const emitted = await runSupportedKeyUsagesEpic(
            actions.getSupportedTokenProfileKeyUsages({ tokenInstanceUuid }),
            listSupportedTokenProfileKeyUsages,
            1,
        );

        // then
        expect(listSupportedTokenProfileKeyUsages).toHaveBeenCalledWith({ tokenInstanceUuid });
        expect(emitted).toEqual([actions.getSupportedTokenProfileKeyUsagesSuccess({ tokenInstanceUuid, keyUsages: supportedKeyUsages })]);
    });

    test('getSupportedTokenProfileKeyUsages_emitsFailureAndDisplaysApiError', async () => {
        // given
        const tokenInstanceUuid = 'token-1';
        const apiError = new Error('token instance rejected the request');
        const listSupportedTokenProfileKeyUsages = vi.fn(() => throwError(() => apiError));

        // when
        const emitted = await runSupportedKeyUsagesEpic(
            actions.getSupportedTokenProfileKeyUsages({ tokenInstanceUuid }),
            listSupportedTokenProfileKeyUsages,
            2,
        );

        // then
        expect(emitted).toEqual([
            actions.getSupportedTokenProfileKeyUsagesFailure({
                tokenInstanceUuid,
                error: 'Failed to get supported Token Profile Key Usages. token instance rejected the request',
            }),
            appRedirectActions.fetchError({ error: apiError, message: 'Failed to get supported Token Profile Key Usages' }),
        ]);
    });
});
