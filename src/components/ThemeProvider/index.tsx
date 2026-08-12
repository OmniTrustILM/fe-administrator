import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    applyTheme,
    DARK_SCHEME_QUERY,
    nextMode,
    prefersDarkScheme,
    readStoredMode,
    resolveTheme,
    storeMode,
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
};

function ThemeProvider({ children }: Readonly<Props>) {
    const [mode, setMode] = useState<ThemeMode>(readStoredMode);
    const [prefersDark, setPrefersDark] = useState<boolean>(prefersDarkScheme);

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

    const resolvedTheme = resolveTheme(mode, prefersDark);

    useEffect(() => {
        applyTheme(resolvedTheme);
    }, [resolvedTheme]);

    // Persisting in an effect keeps the state updaters pure, so cycleMode can use the functional
    // form and never reads a stale mode. This also runs on mount, which simply makes the default
    // explicit in storage.
    useEffect(() => {
        storeMode(mode);
    }, [mode]);

    const cycleMode = useCallback(() => setMode(nextMode), []);

    const value = useMemo<ThemeContextValue>(
        () => ({ mode, resolvedTheme, setMode, cycleMode }),
        [mode, resolvedTheme, setMode, cycleMode],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export default ThemeProvider;
