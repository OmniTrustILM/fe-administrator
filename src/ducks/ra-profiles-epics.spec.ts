import type { UnknownAction } from '@reduxjs/toolkit';
import { firstValueFrom, of, throwError, type Observable } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import { describe, expect, test } from 'vitest';

import { actions as alertActions } from './alerts';
import { actions as raProfilesActions } from './ra-profiles';
import raProfilesEpics from './ra-profiles-epics';

type EpicFn = ((action$: any, state$: any, deps: any) => Observable<UnknownAction>) & { name?: string };

// Select an epic by its inferred function name so reordering the exported array can't silently
// point these tests at the wrong epic.
function selectEpic(name: string): EpicFn {
    const epics = raProfilesEpics as EpicFn[];
    const epic = epics.find((e) => e.name === name);
    if (!epic) throw new Error(`Epic "${name}" not found in ra-profiles-epics`);
    return epic;
}

async function runCreateEpic(action: UnknownAction, createRaProfile: (args: any) => any) {
    const deps = { apiClients: { raProfiles: { createRaProfile: (args: any) => createRaProfile(args) } } };
    const output$ = selectEpic('createRaProfile')(of(action), of({}) as any, deps as any);
    return firstValueFrom(output$.pipe(take(4), toArray()));
}

async function runUpdateRequestAttributesEpic(
    action: UnknownAction,
    updateRaProfileRequestAttributesConfiguration: (args: any) => any,
): Promise<{ emitted: UnknownAction[]; calls: any[] }> {
    const calls: any[] = [];
    const deps = {
        apiClients: {
            raProfiles: {
                updateRaProfileRequestAttributesConfiguration: (args: any) => {
                    calls.push(args);
                    return updateRaProfileRequestAttributesConfiguration(args);
                },
            },
        },
    };
    const output$ = selectEpic('updateRaProfileRequestAttributes')(of(action), of({}) as any, deps as any);
    const emitted = await firstValueFrom(output$.pipe(take(4), toArray()));
    return { emitted, calls };
}

describe('ra-profiles epics', () => {
    const updateAction = raProfilesActions.updateRaProfileRequestAttributes({
        profileUuid: 'ra-1',
        authorityInstanceUuid: 'auth-1',
        requestAttributes: { externalCsrValidationStrict: true },
    });

    test('updateRaProfileRequestAttributes sends the payload to the request-attributes endpoint and emits Success', async () => {
        const returnedProfile = {
            uuid: 'ra-1',
            name: 'Profile',
            attributes: [],
            certificateRequestAttributes: { mergeMode: 'merge', externalCsrValidationStrict: true },
        };
        const { emitted, calls } = await runUpdateRequestAttributesEpic(updateAction, () => of(returnedProfile));

        expect(calls[0]).toEqual({
            raProfileUuid: 'ra-1',
            authorityUuid: 'auth-1',
            raProfileCertificateRequestAttributesUpdateDto: { externalCsrValidationStrict: true },
        });
        expect(emitted).toHaveLength(1);
        expect(emitted[0].type).toBe(raProfilesActions.updateRaProfileRequestAttributesSuccess.type);
        expect((emitted[0] as any).payload.raProfile.certificateRequestAttributes.externalCsrValidationStrict).toBe(true);
    });

    test('updateRaProfileRequestAttributes emits Failure and an error alert on API error', async () => {
        const { emitted } = await runUpdateRequestAttributesEpic(updateAction, () =>
            throwError(() => ({ status: 422, response: { message: 'bad' } })),
        );

        expect(emitted).toHaveLength(2);
        expect(emitted[0].type).toBe(raProfilesActions.updateRaProfileRequestAttributesFailure.type);
        expect(emitted[1].type).toBe(alertActions.error.type);
    });

    test('createRaProfile emits Success AND a redirect when deferRedirect is not set', async () => {
        const action = raProfilesActions.createRaProfile({
            authorityInstanceUuid: 'auth-1',
            raProfileAddRequest: { name: 'p', attributes: [] } as any,
        });
        const emitted = await runCreateEpic(action, () => of({ uuid: 'ra-9' }));
        const types = emitted.map((a) => a.type);
        expect(types).toContain(raProfilesActions.createRaProfileSuccess.type);
        expect(types.some((t) => t.startsWith('appRedirect/'))).toBe(true);
    });

    test('createRaProfile with deferRedirect emits Success only (no redirect)', async () => {
        const action = raProfilesActions.createRaProfile({
            authorityInstanceUuid: 'auth-1',
            raProfileAddRequest: { name: 'p', attributes: [] } as any,
            deferRedirect: true,
        });
        const emitted = await runCreateEpic(action, () => of({ uuid: 'ra-9' }));
        const types = emitted.map((a) => a.type);
        expect(types).toContain(raProfilesActions.createRaProfileSuccess.type);
        expect(types.some((t) => t.startsWith('appRedirect/'))).toBe(false);
    });
});
