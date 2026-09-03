import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PublicBrandingModel } from 'types/branding';
import {
    applyTheme,
    DARK_SCHEME_QUERY,
    initialMode,
    nextMode,
    operatorDefaultTheme,
    prefersDarkScheme,
    readStoredMode,
    readStoredOperatorDefault,
    resolveTheme,
    storeMode,
    storeOperatorDefault,
    type ResolvedTheme,
    type ThemeMode,
} from 'utils/theme';

export type ThemeContextValue = {
    mode: ThemeMode;
    resolvedTheme: ResolvedTheme;
    setMode: (mode: ThemeMode) => void;
    cycleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }

    return context;
}

type Props = {
    children: ReactNode;
    /**
     * The operator's branding, once successfully read. Absent while the read is in flight, when it failed, and on a
     * Core that predates branding.
     *
     * Only `defaultTheme` is used. Branding does not change which modes exist or how they resolve - it changes the
     * palette that light and dark render, which is the stylesheet's business - so the theme runtime needs nothing else
     * from it.
     */
    branding?: Pick<PublicBrandingModel, 'defaultTheme'>;
};

function ThemeProvider({ children, branding }: Readonly<Props>) {
    const [chosenMode, setChosenMode] = useState<ThemeMode | undefined>(readStoredMode);
    const [prefersDark, setPrefersDark] = useState<boolean>(prefersDarkScheme);
    // Read once: after the first branding response the live value below is authoritative, and re-reading storage on
    // every render would only reintroduce a value the operator may just have cleared.
    const [cachedOperatorDefault] = useState<ResolvedTheme | undefined>(readStoredOperatorDefault);

    useEffect(() => {
        const query = globalThis.matchMedia?.(DARK_SCHEME_QUERY);

        if (!query) {
            return;
        }

        const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);

        query.addEventListener('change', onChange);
        setPrefersDark(query.matches);

        return () => query.removeEventListener('change', onChange);
    }, []);

    const liveOperatorDefault = operatorDefaultTheme(branding?.defaultTheme);
    const operatorDefault = branding ? liveOperatorDefault : cachedOperatorDefault;

    // Left undefined until the user picks, so the operator default still applies, and an OS change still moves the
    // theme while `system` is in force.
    const mode = initialMode(chosenMode, operatorDefault);
    const resolvedTheme = resolveTheme(mode, prefersDark);

    useEffect(() => {
        applyTheme(resolvedTheme);
    }, [resolvedTheme]);

    // Only a live response may write the cache. Writing it from the cached value would keep a stale default alive
    // forever, and writing it before any response would clear a default the instance still has.
    useEffect(() => {
        if (branding) {
            storeOperatorDefault(liveOperatorDefault);
        }
    }, [branding, liveOperatorDefault]);

    // Persisted here rather than in an effect on `mode`, so that only an explicit choice is stored. An effect would
    // also fire for the operator default and the system fallback, which would make "never chose" indistinguishable
    // from "chose exactly what the operator set" and pin the user to it.
    const setMode = useCallback((next: ThemeMode) => {
        setChosenMode(next);
        storeMode(next);
    }, []);

    // Cycles from whatever is in force, including a mode the user has not chosen yet: on a branded instance the first
    // click has to advance from the operator's default, not from `system`. Kept in the functional form so two clicks
    // in one batch cannot both read the same mode - only the fallback is closed over, and a click cannot change it.
    const fallbackMode: ThemeMode = operatorDefault ?? 'system';
    const cycleMode = useCallback(() => {
        setChosenMode((current) => {
            const next = nextMode(current ?? fallbackMode);

            storeMode(next);
            return next;
        });
    }, [fallbackMode]);

    const value = useMemo<ThemeContextValue>(
        () => ({ mode, resolvedTheme, setMode, cycleMode }),
        [mode, resolvedTheme, setMode, cycleMode],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export default ThemeProvider;
