import { configureStore } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider, useDispatch } from 'react-redux';

import { testInitialState, testReducers } from 'ducks/test-reducers';

import BrandTokens from './index';

/** The anonymous branding response, as JSON a Playwright test can hand across the Node/browser boundary. */
export type PublicBrandingFixture = Record<string, string | null | boolean>;

export type BrandTokensWithStoreProps = Readonly<{
    /** The branding the anonymous read has already returned, when a test starts from a settled response. */
    preloadedBranding?: PublicBrandingFixture;
    /** The branding the `respond` control delivers, so one mount can cover the move from one answer to the next. */
    responseBranding?: PublicBrandingFixture;
    /** Tokens to render a probe for, so a test can read what the browser resolves each one to. */
    probeTokens?: readonly string[];
}>;

/**
 * Playwright CT cannot carry a live Redux store across the Node/browser boundary, so the store is built inside the
 * mounted component. BrandTokens renders nothing, so the probes below are what makes its effect observable: each one
 * paints a token, and the test reads the colour the browser resolved - including the `color-mix()` steps, which is the
 * only place they can be checked against what the contrast warning computes for them.
 */
export function BrandTokensWithStore({ preloadedBranding, responseBranding, probeTokens = [] }: BrandTokensWithStoreProps) {
    const store = useMemo(
        () =>
            configureStore({
                reducer: testReducers,
                middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
                preloadedState: {
                    ...testInitialState,
                    branding: {
                        ...testInitialState.branding,
                        publicBranding: preloadedBranding,
                        publicBrandingReadFailed: false,
                    },
                },
            }),
        [preloadedBranding],
    );

    return (
        <Provider store={store}>
            <BrandTokens />
            <Controls responseBranding={responseBranding} />
            <button type="button" data-testid="toggle-dark" onClick={() => document.documentElement.classList.toggle('dark')}>
                Toggle dark
            </button>
            {probeTokens.map((token) => (
                <div key={token} data-testid={`probe-${token}`} style={{ backgroundColor: `var(--${token})` }} />
            ))}
        </Provider>
    );
}

function Controls({ responseBranding }: Readonly<{ responseBranding?: PublicBrandingFixture }>) {
    const dispatch = useDispatch();

    return (
        <>
            <button
                type="button"
                data-testid="respond"
                onClick={() => dispatch({ type: 'branding/getPublicBrandingSuccess', payload: { branding: responseBranding } })}
            >
                Respond
            </button>
            <button
                type="button"
                data-testid="fail"
                onClick={() => dispatch({ type: 'branding/getPublicBrandingFailure', payload: { error: 'Failed to get branding' } })}
            >
                Fail
            </button>
        </>
    );
}

export default BrandTokensWithStore;
