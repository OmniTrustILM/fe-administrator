import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { firstValueFrom, type Observable, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { platformDefaultBranding, slice } from './branding';

type BrandingApiStubs = {
    getBrandingSettings: () => unknown;
    updateBrandingSettings: (args: { brandingSettingsUpdateDto: unknown }) => unknown;
    getBranding: () => unknown;
};

function createDeps(overrides: Partial<BrandingApiStubs> = {}) {
    const stubs: BrandingApiStubs = {
        getBrandingSettings: () => of({}),
        updateBrandingSettings: () => of(undefined),
        getBranding: () => of(platformDefaultBranding),
        ...overrides,
    };

    return {
        apiClients: {
            settings: {
                getBrandingSettings: stubs.getBrandingSettings,
                updateBrandingSettings: stubs.updateBrandingSettings,
            },
            branding: { getBranding: stubs.getBranding },
        },
    };
}

/**
 * `featureFlags` reads `globalThis.__ENV__` once at module-load time, so the epics have to be imported after the
 * environment is in place — the same recipe `feature-flags.spec.ts` uses.
 */
async function loadEpics(brandingEnabled: boolean) {
    vi.resetModules();
    vi.stubGlobal('__ENV__', { ENABLE_BRANDING: brandingEnabled });
    return (await import('./branding-epics')).default;
}

const [GET_BRANDING, GET_PUBLIC_BRANDING, UPDATE_BRANDING, RESET_BRANDING] = [0, 1, 2, 3];

/** Epics are invoked directly with stub deps rather than through the store, as the sibling epic specs do. */
type EpicUnderTest = (action$: unknown, state$: unknown, deps: unknown) => Observable<{ type: string; payload?: never }>;

async function run(epic: EpicUnderTest, action: unknown, deps: unknown, expected: number) {
    const output$ = epic(of(action), of({}), deps);
    return firstValueFrom(output$.pipe(take(expected), toArray()));
}

describe('branding epics', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('with branding enabled', () => {
        test('getBranding emits the branding it read', async () => {
            const branding = { primaryColor: '#0073CF' };
            const epics = await loadEpics(true);
            const deps = createDeps({ getBrandingSettings: () => of(branding) });

            const emitted = await run(epics[GET_BRANDING], slice.actions.getBranding(), deps, 1);

            expect(emitted).toEqual([slice.actions.getBrandingSuccess({ branding })]);
        });

        test('getBranding failure reports the error and redirects', async () => {
            const epics = await loadEpics(true);
            const deps = createDeps({ getBrandingSettings: () => throwError(() => new Error('boom')) });

            const emitted = await run(epics[GET_BRANDING], slice.actions.getBranding(), deps, 2);

            expect(emitted[0].type).toBe(slice.actions.getBrandingFailure.type);
            expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
        });

        test('getPublicBranding emits what an anonymous caller received', async () => {
            const branding = { configured: true, primaryColor: '#0073CF' };
            const epics = await loadEpics(true);
            const deps = createDeps({ getBranding: () => of(branding) });

            const emitted = await run(epics[GET_PUBLIC_BRANDING], slice.actions.getPublicBranding(), deps, 1);

            expect(emitted).toEqual([slice.actions.getPublicBrandingSuccess({ branding })]);
        });

        /**
         * No redirect on this path: it runs on the login page, where a redirect to log in is exactly where the user
         * already is, and the reducer settles on the platform default instead.
         */
        test('getPublicBranding failure reports the error without redirecting', async () => {
            const epics = await loadEpics(true);
            const deps = createDeps({ getBranding: () => throwError(() => new Error('offline')) });

            const emitted = await run(epics[GET_PUBLIC_BRANDING], slice.actions.getPublicBranding(), deps, 1);

            expect(emitted[0].type).toBe(slice.actions.getPublicBrandingFailure.type);
            expect(emitted.map((action: { type: string }) => action.type)).not.toContain(appRedirectActions.fetchError.type);
        });

        test('updateBranding sends the branding and confirms', async () => {
            const branding = { primaryColor: '#00A3E0' };
            const sent: unknown[] = [];
            const epics = await loadEpics(true);
            const deps = createDeps({
                updateBrandingSettings: ({ brandingSettingsUpdateDto }) => {
                    sent.push(brandingSettingsUpdateDto);
                    return of(undefined);
                },
            });

            const emitted = await run(epics[UPDATE_BRANDING], slice.actions.updateBranding({ branding }), deps, 2);

            expect(sent).toEqual([branding]);
            expect(emitted[0]).toEqual(slice.actions.updateBrandingSuccess({ branding }));
            expect(emitted[1].type).toBe(alertActions.success.type);
        });

        test('updateBranding failure reports the error and redirects', async () => {
            const epics = await loadEpics(true);
            const deps = createDeps({ updateBrandingSettings: () => throwError(() => new Error('rejected')) });

            const emitted = await run(epics[UPDATE_BRANDING], slice.actions.updateBranding({ branding: {} }), deps, 2);

            expect(emitted[0].type).toBe(slice.actions.updateBrandingFailure.type);
            expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
        });

        /** Reset is one empty update rather than a field-by-field clear, so the body sent has to actually be empty. */
        test('resetBranding sends an empty update', async () => {
            const sent: unknown[] = [];
            const epics = await loadEpics(true);
            const deps = createDeps({
                updateBrandingSettings: ({ brandingSettingsUpdateDto }) => {
                    sent.push(brandingSettingsUpdateDto);
                    return of(undefined);
                },
            });

            const emitted = await run(epics[RESET_BRANDING], slice.actions.resetBranding(), deps, 2);

            expect(sent).toEqual([{}]);
            expect(emitted[0]).toEqual(slice.actions.resetBrandingSuccess());
            expect(emitted[1].type).toBe(alertActions.success.type);
        });

        test('resetBranding failure reports the error and redirects', async () => {
            const epics = await loadEpics(true);
            const deps = createDeps({ updateBrandingSettings: () => throwError(() => new Error('denied')) });

            const emitted = await run(epics[RESET_BRANDING], slice.actions.resetBranding(), deps, 2);

            expect(emitted[0].type).toBe(slice.actions.resetBrandingFailure.type);
            expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
        });
    });

    describe('with branding disabled by ENV', () => {
        /**
         * The flag is what keeps this deployable against a Core that predates branding, so "no request" is the
         * assertion that matters — resolving to defaults without one is the whole contract.
         */
        test('getBranding resolves to empty branding and calls nothing', async () => {
            const epics = await loadEpics(false);
            const getBrandingSettings = vi.fn(() => of({ primaryColor: '#0073CF' }));
            const deps = createDeps({ getBrandingSettings });

            const emitted = await run(epics[GET_BRANDING], slice.actions.getBranding(), deps, 1);

            expect(emitted).toEqual([slice.actions.getBrandingSuccess({ branding: {} })]);
            expect(getBrandingSettings).not.toHaveBeenCalled();
        });

        test('getPublicBranding resolves to the platform default and calls nothing', async () => {
            const epics = await loadEpics(false);
            const getBranding = vi.fn(() => of({ configured: true }));
            const deps = createDeps({ getBranding });

            const emitted = await run(epics[GET_PUBLIC_BRANDING], slice.actions.getPublicBranding(), deps, 1);

            expect(emitted).toEqual([slice.actions.getPublicBrandingSuccess({ branding: platformDefaultBranding })]);
            expect(emitted[0].payload.branding.configured).toBe(false);
            expect(getBranding).not.toHaveBeenCalled();
        });

        test('updateBranding fails without sending anything', async () => {
            const epics = await loadEpics(false);
            const updateBrandingSettings = vi.fn(() => of(undefined));
            const deps = createDeps({ updateBrandingSettings });

            const emitted = await run(epics[UPDATE_BRANDING], slice.actions.updateBranding({ branding: {} }), deps, 1);

            expect(emitted[0].type).toBe(slice.actions.updateBrandingFailure.type);
            expect(updateBrandingSettings).not.toHaveBeenCalled();
        });

        test('resetBranding fails without sending anything', async () => {
            const epics = await loadEpics(false);
            const updateBrandingSettings = vi.fn(() => of(undefined));
            const deps = createDeps({ updateBrandingSettings });

            const emitted = await run(epics[RESET_BRANDING], slice.actions.resetBranding(), deps, 1);

            expect(emitted[0].type).toBe(slice.actions.resetBrandingFailure.type);
            expect(updateBrandingSettings).not.toHaveBeenCalled();
        });
    });
});
