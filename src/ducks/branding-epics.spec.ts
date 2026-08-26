import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { firstValueFrom, lastValueFrom, type Observable, of, throwError } from 'rxjs';
import { delay, take, toArray } from 'rxjs/operators';
import type { PublicBrandingModel } from 'types/branding';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { platformDefaultBranding, slice } from './branding';

/** The anonymous response is a fixed shape, so a fixture overrides the platform default rather than listing fields. */
const publicBranding = (overrides: Partial<PublicBrandingModel>): PublicBrandingModel => ({
    ...platformDefaultBranding,
    ...overrides,
});

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

/** Saves and resets share the write epic, so both indexes point at the same pipeline. */
const [GET_BRANDING, GET_PUBLIC_BRANDING, WRITE_BRANDING] = [0, 1, 2];

/** Epics are invoked directly with stub deps rather than through the store, as the sibling epic specs do. */
type EpicUnderTest = (action$: unknown, state$: unknown, deps: unknown) => Observable<{ type: string; payload?: never }>;

async function run(epic: EpicUnderTest, action: unknown, deps: unknown, expected: number) {
    const output$ = epic(of(action), of({}), deps);
    return firstValueFrom(output$.pipe(take(expected), toArray()));
}

/** Collects the whole emission, so a test asserting a failure path also asserts that nothing follows it. */
async function runAll(epic: EpicUnderTest, action: unknown, deps: unknown) {
    return lastValueFrom(epic(of(action), of({}), deps).pipe(toArray()));
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
            const err = new Error('boom');
            const epics = await loadEpics(true);
            const deps = createDeps({ getBrandingSettings: () => throwError(() => err) });

            const emitted = await run(epics[GET_BRANDING], slice.actions.getBranding(), deps, 2);

            expect(emitted).toEqual([
                slice.actions.getBrandingFailure({ error: 'Failed to get branding. boom' }),
                appRedirectActions.fetchError({ error: err, message: 'Failed to get branding' }),
            ]);
        });

        test('getPublicBranding emits what an anonymous caller received', async () => {
            const branding = publicBranding({ configured: true, primaryColor: '#0073CF' });
            const epics = await loadEpics(true);
            const deps = createDeps({ getBranding: () => of(branding) });

            const emitted = await run(epics[GET_PUBLIC_BRANDING], slice.actions.getPublicBranding(), deps, 1);

            expect(emitted).toEqual([slice.actions.getPublicBrandingSuccess({ branding })]);
        });

        test('getPublicBranding failure reports the error without redirecting', async () => {
            const epics = await loadEpics(true);
            const deps = createDeps({ getBranding: () => throwError(() => new Error('offline')) });

            const emitted = await run(epics[GET_PUBLIC_BRANDING], slice.actions.getPublicBranding(), deps, 1);

            expect(emitted).toEqual([slice.actions.getPublicBrandingFailure({ error: 'Failed to get branding. offline' })]);
            expect(emitted.map((action: { type: string }) => action.type)).not.toContain(appRedirectActions.fetchError.type);
        });

        /** Core rewrites SVG logos on the way in, so the epic has to report the stored branding, not the one it sent. */
        test('updateBranding sends the branding and confirms with what Core stored', async () => {
            const branding = { lightLogo: 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIi8+' };
            const stored = { lightLogo: 'data:image/svg+xml;base64,PHN2Zy8+' };
            const sent: unknown[] = [];
            const epics = await loadEpics(true);
            const deps = createDeps({
                updateBrandingSettings: ({ brandingSettingsUpdateDto }) => {
                    sent.push(brandingSettingsUpdateDto);
                    return of(undefined);
                },
                getBrandingSettings: () => of(stored),
            });

            const emitted = await run(epics[WRITE_BRANDING], slice.actions.updateBranding({ branding }), deps, 2);

            expect(sent).toEqual([branding]);
            expect(emitted[0]).toEqual(slice.actions.updateBrandingSuccess({ branding: stored }));
            expect(emitted[1].type).toBe(alertActions.success.type);
        });

        test('updateBranding failure reports the error and redirects', async () => {
            const err = new Error('rejected');
            const epics = await loadEpics(true);
            const deps = createDeps({ updateBrandingSettings: () => throwError(() => err) });

            const emitted = await runAll(epics[WRITE_BRANDING], slice.actions.updateBranding({ branding: {} }), deps);

            expect(emitted).toEqual([
                slice.actions.updateBrandingFailure({ error: 'Failed to update branding. rejected' }),
                appRedirectActions.fetchError({ error: err, message: 'Failed to update branding' }),
            ]);
        });

        /**
         * The write landed and only the read-back failed, so the save must not be reported as the thing that went
         * wrong. What is actually wrong is the slice, which still holds the pre-write branding, so a read repairs it.
         */
        test('updateBranding reports a failed read-back apart from a failed save', async () => {
            const err = new Error('unreadable');
            const epics = await loadEpics(true);
            const deps = createDeps({ getBrandingSettings: () => throwError(() => err) });

            const emitted = await runAll(epics[WRITE_BRANDING], slice.actions.updateBranding({ branding: {} }), deps);

            expect(emitted).toEqual([
                slice.actions.updateBrandingFailure({ error: 'Branding was saved but could not be read back. unreadable' }),
                appRedirectActions.fetchError({ error: err, message: 'Branding was saved but could not be read back' }),
                slice.actions.getBranding(),
            ]);
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

            const emitted = await run(epics[WRITE_BRANDING], slice.actions.resetBranding(), deps, 2);

            expect(sent).toEqual([{}]);
            expect(emitted[0]).toEqual(slice.actions.resetBrandingSuccess());
            expect(emitted[1].type).toBe(alertActions.success.type);
        });

        test('resetBranding failure reports the error and redirects', async () => {
            const err = new Error('denied');
            const epics = await loadEpics(true);
            const deps = createDeps({ updateBrandingSettings: () => throwError(() => err) });

            const emitted = await run(epics[WRITE_BRANDING], slice.actions.resetBranding(), deps, 2);

            expect(emitted).toEqual([
                slice.actions.resetBrandingFailure({ error: 'Failed to reset branding. denied' }),
                appRedirectActions.fetchError({ error: err, message: 'Failed to reset branding' }),
            ]);
        });

        /** The point of the shared write epic: a save and a reset dispatched together settle in the order they were sent. */
        test('a save and a reset settle in dispatch order even when the save is slower', async () => {
            const epics = await loadEpics(true);
            const deps = createDeps({
                updateBrandingSettings: ({ brandingSettingsUpdateDto }) =>
                    Object.keys(brandingSettingsUpdateDto as object).length === 0 ? of(undefined) : of(undefined).pipe(delay(10)),
            });

            const output$ = (epics[WRITE_BRANDING] as EpicUnderTest)(
                of(slice.actions.updateBranding({ branding: { primaryColor: '#00A3E0' } }), slice.actions.resetBranding()),
                of({}),
                deps,
            );
            const emitted = await firstValueFrom(output$.pipe(take(4), toArray()));

            expect(emitted.map((action: { type: string }) => action.type)).toEqual([
                slice.actions.updateBrandingSuccess.type,
                alertActions.success.type,
                slice.actions.resetBrandingSuccess.type,
                alertActions.success.type,
            ]);
        });
    });

    describe('with branding disabled by ENV', () => {
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
            const getBranding = vi.fn(() => of(publicBranding({ configured: true })));
            const deps = createDeps({ getBranding });

            const emitted = await run(epics[GET_PUBLIC_BRANDING], slice.actions.getPublicBranding(), deps, 1);

            expect(emitted).toEqual([slice.actions.getPublicBrandingSuccess({ branding: platformDefaultBranding })]);
            expect(platformDefaultBranding.configured).toBe(false);
            expect(getBranding).not.toHaveBeenCalled();
        });

        test('updateBranding fails without sending anything', async () => {
            const epics = await loadEpics(false);
            const updateBrandingSettings = vi.fn(() => of(undefined));
            const deps = createDeps({ updateBrandingSettings });

            const emitted = await run(epics[WRITE_BRANDING], slice.actions.updateBranding({ branding: {} }), deps, 1);

            expect(emitted).toEqual([slice.actions.updateBrandingFailure({ error: 'Branding is disabled for this instance.' })]);
            expect(updateBrandingSettings).not.toHaveBeenCalled();
        });

        test('resetBranding fails without sending anything', async () => {
            const epics = await loadEpics(false);
            const updateBrandingSettings = vi.fn(() => of(undefined));
            const deps = createDeps({ updateBrandingSettings });

            const emitted = await run(epics[WRITE_BRANDING], slice.actions.resetBranding(), deps, 1);

            expect(emitted).toEqual([slice.actions.resetBrandingFailure({ error: 'Branding is disabled for this instance.' })]);
            expect(updateBrandingSettings).not.toHaveBeenCalled();
        });
    });
});
