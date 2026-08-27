/**
 * What the user selected. `light` and `dark` are the platform's own themes; `systemLight` and `systemDark` are the
 * operator's branded theme in its light and dark composition, and are only offered once branding is configured.
 */
export type ThemeMode = 'light' | 'dark' | 'systemLight' | 'systemDark';

/** What is actually rendered. Both compositions of a branded theme still resolve to one of these. */
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme-mode';

/**
 * The operator's default theme, cached from the last branding read. It is server-held, so without a cache the
 * pre-paint script in index.html has nothing to apply and the first paint of every load would fall back to the
 * operating system preference.
 */
export const OPERATOR_DEFAULT_STORAGE_KEY = 'theme-operator-default';

export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

export const PLATFORM_MODES: readonly ThemeMode[] = ['light', 'dark'];
export const BRANDED_MODES: readonly ThemeMode[] = ['systemLight', 'systemDark'];
export const THEME_MODES: readonly ThemeMode[] = [...PLATFORM_MODES, ...BRANDED_MODES];

const RESOLVED: Record<ThemeMode, ResolvedTheme> = {
    light: 'light',
    dark: 'dark',
    systemLight: 'light',
    systemDark: 'dark',
};

/** Drives the browser UI colour on mobile. Matches --surface-raised in each theme. */
const THEME_COLOR: Record<ResolvedTheme, string> = {
    light: '#ffffff',
    dark: '#171717',
};

export const isThemeMode = (value: unknown): value is ThemeMode =>
    typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value);

export const isResolvedTheme = (value: unknown): value is ResolvedTheme => value === 'light' || value === 'dark';

/** Whether the mode asks for the operator's branded theme rather than the platform's own. */
export const isBrandedMode = (mode: ThemeMode): boolean => (BRANDED_MODES as readonly string[]).includes(mode);

/** The branded composition matching a resolved theme. */
export const brandedMode = (theme: ResolvedTheme): ThemeMode => (theme === 'dark' ? 'systemDark' : 'systemLight');

/**
 * The platform mode a branded one falls back to. Used when a stored branded choice outlives the branding it referred
 * to: both resolve to the same theme, so this only makes the control report what is actually being rendered.
 */
export const platformMode = (mode: ThemeMode): ThemeMode => RESOLVED[mode];

/** Reads the persisted mode. Absent, corrupt and unreadable all mean "the user has expressed no preference". */
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

/** The modes the control may offer. Without branding the two branded ones are indistinguishable from the platform's. */
export const availableModes = (brandingConfigured: boolean): readonly ThemeMode[] => (brandingConfigured ? THEME_MODES : PLATFORM_MODES);

/**
 * The mode in force, in precedence order: the user's own stored choice, then the operator's default, then the
 * operating system preference. The system preference is therefore consulted only when neither of the first two exists.
 */
export const initialMode = (
    storedMode: ThemeMode | undefined,
    operatorDefault: ResolvedTheme | undefined,
    prefersDark: boolean,
): ThemeMode => {
    if (storedMode !== undefined) {
        return storedMode;
    }

    if (operatorDefault !== undefined) {
        return brandedMode(operatorDefault);
    }

    return prefersDark ? 'dark' : 'light';
};

export const resolveTheme = (mode: ThemeMode): ResolvedTheme => RESOLVED[mode];

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
