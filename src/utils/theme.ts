/** What the user selected. `system` follows the operating system preference. */
export type ThemeMode = 'system' | 'light' | 'dark';

/**
 * What is actually rendered once `system` has been resolved.
 *
 * Branding does not add to this. When the operator has configured branding, these two are the branded light and dark
 * compositions; when they have not, they are the platform's own. Which palette the class resolves to is decided in the
 * stylesheet, so nothing here has to know whether the instance is branded.
 */
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme-mode';

/**
 * The operator's default theme, cached from the last branding read. It is server-held, so without a cache the
 * pre-paint script in index.html has nothing to apply and the first paint of every load would fall back to the
 * operating system preference.
 */
export const OPERATOR_DEFAULT_STORAGE_KEY = 'theme-operator-default';

export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

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

export const isResolvedTheme = (value: unknown): value is ResolvedTheme => value === 'light' || value === 'dark';

/**
 * Reads the persisted mode. Absent, corrupt and unreadable all mean "the user has expressed no preference", which is
 * deliberately not the same as having chosen `system`: only the former lets the operator's default apply.
 */
export const readStoredMode = (): ThemeMode | undefined => {
    try {
        const stored = globalThis.localStorage?.getItem(THEME_STORAGE_KEY);
        return isThemeMode(stored) ? stored : undefined;
    } catch {
        return undefined;
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

export const readStoredOperatorDefault = (): ResolvedTheme | undefined => {
    try {
        const stored = globalThis.localStorage?.getItem(OPERATOR_DEFAULT_STORAGE_KEY);
        return isResolvedTheme(stored) ? stored : undefined;
    } catch {
        return undefined;
    }
};

/** Caches the operator default for the next load's pre-paint. `undefined` clears it, so unbranding takes effect. */
export const storeOperatorDefault = (theme: ResolvedTheme | undefined): void => {
    try {
        if (theme === undefined) {
            globalThis.localStorage?.removeItem(OPERATOR_DEFAULT_STORAGE_KEY);
        } else {
            globalThis.localStorage?.setItem(OPERATOR_DEFAULT_STORAGE_KEY, theme);
        }
    } catch {
        // As in storeMode: the cache is an optimisation for the next load, never required for this one.
    }
};

/**
 * Narrows the branding contract's theme onto what the runtime uses. Taking a plain string rather than the generated
 * enum keeps this module off the OpenAPI barrel, which the Playwright runner cannot resolve from a spec file.
 */
export const operatorDefaultTheme = (theme: string | undefined): ResolvedTheme | undefined => (isResolvedTheme(theme) ? theme : undefined);

export const prefersDarkScheme = (): boolean => globalThis.matchMedia?.(DARK_SCHEME_QUERY).matches ?? false;

/**
 * The mode in force, in precedence order: the user's own stored choice, then the operator's default, then `system`.
 *
 * The operating system preference is deliberately not consulted here - it belongs to resolving `system`, not to
 * choosing the mode. So an operator default of `dark` puts the control on Dark rather than leaving it on System
 * showing a light theme, and a user who then picks System outranks the operator and follows their OS again.
 */
export const initialMode = (storedMode: ThemeMode | undefined, operatorDefault: ResolvedTheme | undefined): ThemeMode =>
    storedMode ?? operatorDefault ?? 'system';

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
