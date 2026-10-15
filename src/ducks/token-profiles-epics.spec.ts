import type { UnknownAction } from '@reduxjs/toolkit';
import { firstValueFrom, of, throwError, type Observable } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import { describe, expect, test, vi } from 'vitest';
import { KeyUsage, TokenInstanceStatus } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { actions as userInterfaceActions } from 'ducks/user-interface';
import { actions as appRedirectActions } from './app-redirect';
import { actions } from './token-profiles';
import epics, { getTokenProfileDetail } from './token-profiles-epics';

// Resolve epics by function name rather than by position — inserting an epic anywhere in the array
// would otherwise silently shift every index below it and break unrelated tests.
function findEpicIndex(name: string) {
    const index = (epics as { name: string }[]).findIndex((epic) => epic.name === name);
    if (index === -1) throw new Error(`Epic "${name}" not found in token-profiles-epics`);
    return index;
}

const LIST_IMPORTABLE_TOKEN_PROFILES_EPIC_INDEX = findEpicIndex('listImportableTokenProfiles');

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

describe('listImportableTokenProfiles', () => {
    const epicFns = epics as ((action$: any, state$: any, deps: any) => Observable<UnknownAction>)[];

    test('calls listTokenProfiles with enabled true and the importable codes, emits the success', async () => {
        const tokenProfiles = [{ uuid: 'tp-1' }] as any;
        const listTokenProfiles = vi.fn(() => of(tokenProfiles));
        const importable = ['keyPair:RSA'];
        const deps = { apiClients: { tokenProfiles: { listTokenProfiles } } };

        const emitted = await firstValueFrom(
            epicFns[LIST_IMPORTABLE_TOKEN_PROFILES_EPIC_INDEX](
                of(actions.listImportableTokenProfiles({ importable })),
                of({}) as any,
                deps as any,
            ).pipe(take(1), toArray()),
        );

        expect(listTokenProfiles).toHaveBeenCalledWith({ enabled: true, importable });
        expect(emitted).toEqual([actions.listImportableTokenProfilesSuccess({ tokenProfiles })]);
    });

    test('failure emits Failure and fetchError', async () => {
        const importable = ['keyPair:RSA'];
        const deps = { apiClients: { tokenProfiles: { listTokenProfiles: () => throwError(() => new Error('boom')) } } };

        const emitted = await firstValueFrom(
            epicFns[LIST_IMPORTABLE_TOKEN_PROFILES_EPIC_INDEX](
                of(actions.listImportableTokenProfiles({ importable })),
                of({}) as any,
                deps as any,
            ).pipe(take(2), toArray()),
        );

        expect(emitted[0]).toEqual(actions.listImportableTokenProfilesFailure({ error: 'Failed to get importable token profiles. boom' }));
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });
});
