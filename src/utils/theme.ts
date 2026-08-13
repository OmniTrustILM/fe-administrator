/** What the user selected. `system` follows the operating system preference. */
export type ThemeMode = 'system' | 'light' | 'dark';

/** What is actually rendered once `system` has been resolved. */
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme-mode';
export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';
export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

const DEFAULT_MODE: ThemeMode = 'system';

/** Order of the header toggle: system, then light, then dark, then back to system. */
const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
    system: 'light',
    light: 'dark',
    dark: 'system',
};

/** Drives the browser UI colour on mobile. Matches --surface-raised in each theme. */
const THEME_COLOR: Record<ResolvedTheme, string> = {
    light: '#ffffff',
    dark: '#171717',
};

export const isThemeMode = (value: unknown): value is ThemeMode =>
    typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value);

/** Reads the persisted mode, tolerating corrupt values and storage being unavailable. */
export const readStoredMode = (): ThemeMode => {
    try {
        const stored = globalThis.localStorage?.getItem(THEME_STORAGE_KEY);
        return isThemeMode(stored) ? stored : DEFAULT_MODE;
    } catch {
        return DEFAULT_MODE;
    }
};

/** Persists the mode. Private browsing and disabled storage are non-fatal. */
export const storeMode = (mode: ThemeMode): void => {
    try {
        globalThis.localStorage?.setItem(THEME_STORAGE_KEY, mode);
    } catch {
        // Storage can be unavailable through private browsing, disabled cookies or an exceeded
        // quota. The preference is then not persisted, but the current session still honours it.
    }
};

export const prefersDarkScheme = (): boolean => globalThis.matchMedia?.(DARK_SCHEME_QUERY).matches ?? false;

export const resolveTheme = (mode: ThemeMode, prefersDark: boolean): ResolvedTheme => {
    if (mode !== 'system') {
        return mode;
    }

    return prefersDark ? 'dark' : 'light';
};

export const nextMode = (mode: ThemeMode): ThemeMode => NEXT_MODE[mode];

/**
 * Applies the theme to the document. Setting colorScheme is what makes native scrollbars,
 * form controls and autofill backgrounds follow the theme.
 */
export const applyTheme = (resolved: ResolvedTheme): void => {
    const root = document.documentElement;

    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[resolved]);
};
