import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PublicBrandingModel } from 'types/branding';
import {
    applyTheme,
    availableModes,
    DARK_SCHEME_QUERY,
    initialMode,
    operatorDefaultTheme,
    platformMode,
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
    /** The modes the user may pick from: the branded pair is offered only once branding is configured. */
    modes: readonly ThemeMode[];
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
    /** The operator's branding, once read. Absent while the read is in flight, and on a Core that predates branding. */
    branding?: Pick<PublicBrandingModel, 'configured' | 'defaultTheme'>;
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

    // `defaultTheme` is present exactly when branding is configured, so the cache doubles as knowledge that the
    // instance is branded. Without it a returning user would be offered two modes until the read lands, then four.
    const brandingConfigured = branding?.configured ?? cachedOperatorDefault !== undefined;

    // Left undefined until the user picks, so an OS change still moves the theme while the fallback path is in force.
    const rawMode = initialMode(chosenMode, operatorDefault, prefersDark);
    const mode = brandingConfigured ? rawMode : platformMode(rawMode);
    const resolvedTheme = resolveTheme(mode);
    const modes = availableModes(brandingConfigured);

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
    // also fire for the operator default and the OS fallback, which would make "never chose" indistinguishable from
    // "chose exactly what the operator set" and pin the user to it.
    const setMode = useCallback((next: ThemeMode) => {
        setChosenMode(next);
        storeMode(next);
    }, []);

    const value = useMemo<ThemeContextValue>(() => ({ mode, resolvedTheme, setMode, modes }), [mode, resolvedTheme, setMode, modes]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export default ThemeProvider;
