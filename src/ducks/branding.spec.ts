import { describe, expect, test } from 'vitest';
import { BrandingTheme } from 'types/branding';
import type { PublicBrandingModel } from 'types/branding';
import reducer, { actions, initialState, platformDefaultBranding, selectors, slice, type State } from './branding';

/**
 * The anonymous response is a fixed shape — every colour and logo is a required, nullable key — so a fixture is built
 * by overriding the platform default rather than by listing only the fields a test cares about.
 */
const publicBranding = (overrides: Partial<PublicBrandingModel>): PublicBrandingModel => ({
    ...platformDefaultBranding,
    ...overrides,
});

const populated: State = {
    ...initialState,
    branding: { primaryColor: '#0073CF', defaultTheme: BrandingTheme.Dark },
    publicBranding: publicBranding({ configured: true, primaryColor: '#0073CF' }),
    error: 'stale',
};

describe('branding slice', () => {
    test('starts idle with nothing loaded', () => {
        expect(reducer(undefined, { type: 'init' })).toEqual(initialState);
    });

    test('resetState returns to the initial state', () => {
        expect(reducer(populated, actions.resetState())).toEqual(initialState);
    });

    describe('reading the operator branding', () => {
        test('getBranding marks the read in flight and clears a previous error', () => {
            const state = reducer({ ...initialState, error: 'stale' }, actions.getBranding());

            expect(state.isFetchingBranding).toBe(true);
            expect(state.error).toBeUndefined();
        });

        test('getBrandingSuccess stores the branding and settles', () => {
            const branding = { primaryColor: '#0073CF', lightLogo: 'data:image/png;base64,iVBORw0KGgo=' };

            const state = reducer({ ...initialState, isFetchingBranding: true }, actions.getBrandingSuccess({ branding }));

            expect(state.branding).toEqual(branding);
            expect(state.isFetchingBranding).toBe(false);
        });

        test('getBrandingFailure settles and records the error', () => {
            const state = reducer({ ...initialState, isFetchingBranding: true }, actions.getBrandingFailure({ error: 'nope' }));

            expect(state.isFetchingBranding).toBe(false);
            expect(state.error).toBe('nope');
        });
    });

    describe('reading the anonymous branding', () => {
        test('getPublicBrandingSuccess stores what the login page will render', () => {
            const branding = publicBranding({ configured: true, darkLogo: 'data:image/svg+xml;base64,PHN2Zy8+' });

            const state = reducer({ ...initialState, isFetchingPublicBranding: true }, actions.getPublicBrandingSuccess({ branding }));

            expect(state.publicBranding).toEqual(branding);
            expect(state.isFetchingPublicBranding).toBe(false);
        });

        test('getPublicBrandingFailure still settles on the platform default', () => {
            const state = reducer(
                { ...initialState, isFetchingPublicBranding: true },
                actions.getPublicBrandingFailure({ error: 'offline' }),
            );

            expect(state.publicBranding).toEqual(platformDefaultBranding);
            expect(state.publicBranding?.configured).toBe(false);
            expect(state.error).toBe('offline');
        });
    });

    describe('updating', () => {
        test('updateBranding clears a previous success so a form cannot read a stale one', () => {
            const state = reducer({ ...initialState, updateSucceeded: true }, actions.updateBranding({ branding: {} }));

            expect(state.isUpdatingBranding).toBe(true);
            expect(state.updateSucceeded).toBe(false);
        });

        test('updateBranding clears a preceding reset success so the two cannot both read true', () => {
            const state = reducer({ ...initialState, resetSucceeded: true }, actions.updateBranding({ branding: {} }));

            expect(state.resetSucceeded).toBe(false);
            expect(state.updateSucceeded).toBe(false);
        });

        test('updateBrandingSuccess replaces the stored branding with what the server read back', () => {
            const branding = { primaryColor: '#00A3E0' };

            const state = reducer(
                { ...initialState, branding: { primaryColor: '#0073CF' }, isUpdatingBranding: true },
                actions.updateBrandingSuccess({ branding }),
            );

            expect(state.branding).toEqual(branding);
            expect(state.updateSucceeded).toBe(true);
            expect(state.isUpdatingBranding).toBe(false);
        });

        test('updateBrandingFailure leaves the previous branding in place', () => {
            const state = reducer(
                { ...initialState, branding: { primaryColor: '#0073CF' }, isUpdatingBranding: true },
                actions.updateBrandingFailure({ error: 'rejected' }),
            );

            expect(state.branding).toEqual({ primaryColor: '#0073CF' });
            expect(state.updateSucceeded).toBe(false);
            expect(state.error).toBe('rejected');
        });
    });

    describe('resetting to default', () => {
        test('resetBranding clears a preceding update success so the two cannot both read true', () => {
            const state = reducer({ ...initialState, updateSucceeded: true }, actions.resetBranding());

            expect(state.isResettingBranding).toBe(true);
            expect(state.updateSucceeded).toBe(false);
            expect(state.resetSucceeded).toBe(false);
        });

        test('resetBrandingSuccess empties the stored branding', () => {
            const state = reducer(
                { ...initialState, branding: { primaryColor: '#0073CF', darkLogo: 'data:image/svg+xml;base64,PHN2Zy8+' } },
                actions.resetBrandingSuccess(),
            );

            expect(state.branding).toEqual({});
            expect(state.resetSucceeded).toBe(true);
            expect(state.isResettingBranding).toBe(false);
        });

        test('resetBrandingFailure keeps the branding that is still stored', () => {
            const state = reducer(
                { ...initialState, branding: { primaryColor: '#0073CF' }, isResettingBranding: true },
                actions.resetBrandingFailure({ error: 'denied' }),
            );

            expect(state.branding).toEqual({ primaryColor: '#0073CF' });
            expect(state.resetSucceeded).toBe(false);
            expect(state.error).toBe('denied');
        });
    });

    describe('selectors', () => {
        test('read each field out of the slice', () => {
            const store = { [slice.name]: populated } as never;

            expect(selectors.branding(store)).toEqual(populated.branding);
            expect(selectors.publicBranding(store)).toEqual(populated.publicBranding);
            expect(selectors.error(store)).toBe('stale');
            expect(selectors.isFetchingBranding(store)).toBe(false);
            expect(selectors.isFetchingPublicBranding(store)).toBe(false);
            expect(selectors.isUpdatingBranding(store)).toBe(false);
            expect(selectors.updateSucceeded(store)).toBe(false);
            expect(selectors.isResettingBranding(store)).toBe(false);
            expect(selectors.resetSucceeded(store)).toBe(false);
        });

        /** Selectors run against a store that has not mounted the slice during early boot and tests. */
        test('tolerate the slice being absent from the store', () => {
            expect(selectors.branding({} as never)).toBeUndefined();
            expect(selectors.isFetchingBranding({} as never)).toBeUndefined();
        });
    });
});
