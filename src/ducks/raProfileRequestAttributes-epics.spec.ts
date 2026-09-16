import { describe, expect, test, vi } from 'vitest';
import type { UnknownAction } from '@reduxjs/toolkit';
import { firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';

import { actions as raProfilesActions } from './ra-profiles';
import { slice } from './raProfileRequestAttributes';
import { AttributeSetMergeMode } from 'types/openapi';

vi.mock('../App', async () => ({ store: (await import('./epics-test-mocks')).getEpicMocks().appStore }));
vi.mock('./alerts', async () => ({ actions: (await import('./epics-test-mocks')).getEpicMocks().alertActions }));

type Clients = {
    raProfiles: {
        updateRaProfileRequestAttributesConfiguration: (args: any) => any;
    };
    settings: {
        getPlatformSettings: () => any;
        updatePlatformSettings: (args: any) => any;
    };
};

function createDeps(overrides: Partial<Clients> = {}) {
    const defaults: Clients = {
        raProfiles: {
            updateRaProfileRequestAttributesConfiguration: () =>
                of({
                    uuid: 'ra-1',
                    certificateRequestAttributes: {
                        mergeMode: AttributeSetMergeMode.Merge,
                        requestAttributes: [],
                        valueSourceBindings: [],
                    },
                }),
        },
        settings: {
            getPlatformSettings: () =>
                of({
                    certificates: {
                        validation: { enabled: true },
                        requestAttributes: { requestAttributes: [], externalCsrValidationStrict: true },
                    },
                }),
            updatePlatformSettings: () => of(undefined),
        },
    };
    return {
        apiClients: {
            raProfiles: { ...defaults.raProfiles, ...overrides.raProfiles },
            settings: { ...defaults.settings, ...overrides.settings },
        },
    };
}

type EpicModule = typeof import('./raProfileRequestAttributes-epics');
type EpicName = 'updateRaProfileRequestAttributes' | 'getPlatformDefaultRequestAttributes' | 'updatePlatformDefaultRequestAttributes';

async function runEpic(
    epicName: EpicName,
    action: any,
    options: { depsOverrides?: Partial<Clients>; takeCount?: number } = {},
): Promise<UnknownAction[]> {
    const epicModule: EpicModule = await import('./raProfileRequestAttributes-epics');
    const epic = epicModule[epicName];
    const deps = createDeps(options.depsOverrides);
    const takeCount = options.takeCount ?? 1;
    const state$ = of({}) as any;
    state$.value = {};
    const output$ = epic(of(action) as any, state$, deps as any);
    return firstValueFrom(output$.pipe(take(takeCount), toArray()));
}

describe('raProfileRequestAttributes epics', () => {
    describe('updateRaProfileRequestAttributes', () => {
        const action = slice.actions.updateRaProfileRequestAttributes({
            authorityUuid: 'auth-1',
            raProfileUuid: 'ra-1',
            data: { mergeMode: AttributeSetMergeMode.Merge, requestAttributes: [], valueSourceBindings: [] },
        });

        test('emits success with the returned set on 200', async () => {
            const out = await runEpic('updateRaProfileRequestAttributes', action, { takeCount: 3 });
            expect(out[0].type).toBe(slice.actions.updateRaProfileRequestAttributesSuccess.type);
            expect((out[0] as any).payload.set.mergeMode).toBe(AttributeSetMergeMode.Merge);
        });

        test('patches the loaded profile in the raprofiles slice from the response instead of refetching it', async () => {
            const out = await runEpic('updateRaProfileRequestAttributes', action, { takeCount: 3 });
            expect(out[1].type).toBe(raProfilesActions.raProfileRequestAttributesUpdated.type);
            expect((out[1] as any).payload).toEqual({
                uuid: 'ra-1',
                certificateRequestAttributes: (out[0] as any).payload.set,
            });
        });

        test('rereads the profile instead of patching it when the response omits the set', async () => {
            const out = await runEpic('updateRaProfileRequestAttributes', action, {
                takeCount: 3,
                depsOverrides: { raProfiles: { updateRaProfileRequestAttributesConfiguration: () => of({ uuid: 'ra-1' }) } },
            });
            expect(out.map((a) => a.type)).not.toContain(raProfilesActions.raProfileRequestAttributesUpdated.type);
            expect(out[1].type).toBe(raProfilesActions.getRaProfileDetail.type);
            expect((out[1] as any).payload).toEqual({ authorityUuid: 'auth-1', uuid: 'ra-1' });
        });

        test('emits failure on error', async () => {
            const out = await runEpic('updateRaProfileRequestAttributes', action, {
                takeCount: 1,
                depsOverrides: {
                    raProfiles: { updateRaProfileRequestAttributesConfiguration: () => throwError(() => new Error('boom')) },
                },
            });
            expect(out[0].type).toBe(slice.actions.updateRaProfileRequestAttributesFailure.type);
        });
    });

    describe('getPlatformDefaultRequestAttributes', () => {
        test('extracts certificates.requestAttributes', async () => {
            const out = await runEpic('getPlatformDefaultRequestAttributes', slice.actions.getPlatformDefaultRequestAttributes());
            expect(out[0].type).toBe(slice.actions.getPlatformDefaultRequestAttributesSuccess.type);
            expect((out[0] as any).payload.externalCsrValidationStrict).toBe(true);
        });

        test('emits failure on error', async () => {
            const out = await runEpic('getPlatformDefaultRequestAttributes', slice.actions.getPlatformDefaultRequestAttributes(), {
                depsOverrides: {
                    settings: { getPlatformSettings: () => throwError(() => new Error('x')), updatePlatformSettings: () => of(undefined) },
                },
            });
            expect(out[0].type).toBe(slice.actions.getPlatformDefaultRequestAttributesFailure.type);
        });
    });

    describe('updatePlatformDefaultRequestAttributes', () => {
        const action = slice.actions.updatePlatformDefaultRequestAttributes({
            data: { requestAttributes: [] },
        });

        test('merges into existing certificate settings and preserves validation', async () => {
            const captured: any[] = [];
            const out = await runEpic('updatePlatformDefaultRequestAttributes', action, {
                takeCount: 2,
                depsOverrides: {
                    settings: {
                        getPlatformSettings: () =>
                            of({
                                certificates: { validation: { enabled: true }, requestAttributes: { externalCsrValidationStrict: false } },
                            }),
                        updatePlatformSettings: (args: any) => {
                            captured.push(args);
                            return of(undefined);
                        },
                    },
                },
            });
            expect(out[0].type).toBe(slice.actions.updatePlatformDefaultRequestAttributesSuccess.type);
            // validation preserved, requestAttributes replaced, externalCsrValidationStrict preserved
            expect(captured[0].platformSettingsUpdateDto.certificates.validation).toEqual({ enabled: true });
            expect(captured[0].platformSettingsUpdateDto.certificates.requestAttributes).toEqual({
                externalCsrValidationStrict: false,
                requestAttributes: [],
            });
        });

        test('emits failure when the update call fails', async () => {
            const out = await runEpic('updatePlatformDefaultRequestAttributes', action, {
                takeCount: 1,
                depsOverrides: {
                    settings: {
                        getPlatformSettings: () => of({ certificates: {} }),
                        updatePlatformSettings: () => throwError(() => new Error('nope')),
                    },
                },
            });
            expect(out[0].type).toBe(slice.actions.updatePlatformDefaultRequestAttributesFailure.type);
        });
    });
});
