import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { BrandingTheme } from 'types/branding';
import {
    applyTheme,
    DARK_SCHEME_QUERY,
    initialMode,
    isResolvedTheme,
    isThemeMode,
    nextMode,
    OPERATOR_DEFAULT_STORAGE_KEY,
    operatorDefaultTheme,
    prefersDarkScheme,
    readStoredMode,
    readStoredOperatorDefault,
    resolveTheme,
    storeMode,
    storeOperatorDefault,
    THEME_STORAGE_KEY,
} from './theme';

const setMatchMedia = (matches: boolean) => {
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({ matches: query === DARK_SCHEME_QUERY && matches })),
    );
};

describe('theme', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.className = '';
        document.documentElement.removeAttribute('style');
        document.head.innerHTML = '<meta name="theme-color" content="#ffffff" />';
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    describe('isThemeMode', () => {
        test.each(['system', 'light', 'dark'])('should accept %s', (value) => {
            expect(isThemeMode(value)).toBe(true);
        });

        test.each([null, undefined, 42, 'DARK', 'systemLight', 'systemDark', 'auto', ''])('should reject %s', (value) => {
            expect(isThemeMode(value)).toBe(false);
        });
    });

    describe('isResolvedTheme', () => {
        test.each(['light', 'dark'])('should accept %s', (value) => {
            expect(isResolvedTheme(value)).toBe(true);
        });

        test.each([null, undefined, 'system', ''])('should reject %s', (value) => {
            expect(isResolvedTheme(value)).toBe(false);
        });
    });

    describe('readStoredMode', () => {
        test('should report no preference when nothing is stored', () => {
            expect(readStoredMode()).toBeUndefined();
        });

        test('should return a valid stored mode', () => {
            localStorage.setItem(THEME_STORAGE_KEY, 'system');
            expect(readStoredMode()).toBe('system');
        });

        test('should report no preference for a corrupt stored value', () => {
            localStorage.setItem(THEME_STORAGE_KEY, 'chartreuse');
            expect(readStoredMode()).toBeUndefined();
        });

        /**
         * A retired mode is not one of the three supported preferences. Reading it as "no preference" is what lets the
         * operator default, and then the OS, take over again rather than pinning the user to a mode that no longer
         * exists.
         */
        test.each(['systemLight', 'systemDark'])('should report no preference for the retired mode %s', (retired) => {
            localStorage.setItem(THEME_STORAGE_KEY, retired);
            expect(readStoredMode()).toBeUndefined();
        });

        test('should report no preference when storage throws', () => {
            // Stub the global rather than Storage.prototype: happy-dom wraps each Storage instance
            // in a Proxy that caches methods onto the instance on first access, so a prototype spy
            // installed after any earlier call never fires and the catch path is never reached.
            const getItem = vi.fn(() => {
                throw new Error('storage disabled');
            });
            vi.stubGlobal('localStorage', { getItem });

            expect(readStoredMode()).toBeUndefined();
            expect(getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);
        });
    });

    describe('storeMode', () => {
        test('should persist the mode', () => {
            storeMode('system');
            expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
        });

        test('should not throw when storage is unavailable', () => {
            const setItem = vi.fn(() => {
                throw new Error('storage disabled');
            });
            vi.stubGlobal('localStorage', { setItem });

            expect(() => storeMode('dark')).not.toThrow();
            expect(setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
        });
    });

    describe('readStoredOperatorDefault', () => {
        test('should report nothing cached by default', () => {
            expect(readStoredOperatorDefault()).toBeUndefined();
        });

        test('should return a valid cached default', () => {
            localStorage.setItem(OPERATOR_DEFAULT_STORAGE_KEY, 'dark');
            expect(readStoredOperatorDefault()).toBe('dark');
        });

        test('should reject system, which is a mode rather than a resolved theme', () => {
            localStorage.setItem(OPERATOR_DEFAULT_STORAGE_KEY, 'system');
            expect(readStoredOperatorDefault()).toBeUndefined();
        });

        test('should report nothing when storage throws', () => {
            vi.stubGlobal('localStorage', {
                getItem: vi.fn(() => {
                    throw new Error('storage disabled');
                }),
            });

            expect(readStoredOperatorDefault()).toBeUndefined();
        });
    });

    describe('storeOperatorDefault', () => {
        test('should cache the operator default', () => {
            storeOperatorDefault('dark');
            expect(localStorage.getItem(OPERATOR_DEFAULT_STORAGE_KEY)).toBe('dark');
        });

        test('should clear the cache when the operator has no default', () => {
            localStorage.setItem(OPERATOR_DEFAULT_STORAGE_KEY, 'dark');
            storeOperatorDefault(undefined);
            expect(localStorage.getItem(OPERATOR_DEFAULT_STORAGE_KEY)).toBeNull();
        });

        test('should not throw when storage is unavailable', () => {
            const setItem = vi.fn(() => {
                throw new Error('storage disabled');
            });
            const removeItem = vi.fn(() => {
                throw new Error('storage disabled');
            });
            vi.stubGlobal('localStorage', { setItem, removeItem });

            expect(() => storeOperatorDefault('light')).not.toThrow();
            expect(() => storeOperatorDefault(undefined)).not.toThrow();
        });
    });

    describe('operatorDefaultTheme', () => {
        test('should narrow the branding enum onto a resolved theme', () => {
            expect(operatorDefaultTheme(BrandingTheme.Light)).toBe('light');
            expect(operatorDefaultTheme(BrandingTheme.Dark)).toBe('dark');
        });

        test('should report no default when branding carries none', () => {
            expect(operatorDefaultTheme(undefined)).toBeUndefined();
        });
    });

    describe('prefersDarkScheme', () => {
        test('should report true when the OS prefers dark', () => {
            setMatchMedia(true);
            expect(prefersDarkScheme()).toBe(true);
        });

        test('should report false when the OS prefers light', () => {
            setMatchMedia(false);
            expect(prefersDarkScheme()).toBe(false);
        });

        test('should report false when matchMedia is unavailable', () => {
            vi.stubGlobal('matchMedia', undefined);
            expect(prefersDarkScheme()).toBe(false);
        });
    });

    describe('nextMode', () => {
        test('should cycle system, light, dark and back', () => {
            expect(nextMode('system')).toBe('light');
            expect(nextMode('light')).toBe('dark');
            expect(nextMode('dark')).toBe('system');
        });
    });

    describe('initialMode', () => {
        test.each([
            // stored choice, operator default, expected
            ['dark' as const, 'light' as const, 'dark'],
            ['light' as const, 'dark' as const, 'light'],
            ['light' as const, undefined, 'light'],
        ])('should let the stored choice %s win over the operator default', (stored, operator, expected) => {
            expect(initialMode(stored, operator)).toBe(expected);
        });

        /**
         * The whole point of storing "no preference" rather than defaulting to `system`: a user who has actually
         * chosen System must outrank the operator and follow their own OS again.
         */
        test('should let an explicit system choice outrank the operator default', () => {
            expect(initialMode('system', 'dark')).toBe('system');
        });

        test.each([
            ['light' as const, 'light'],
            ['dark' as const, 'dark'],
        ])('should apply the operator default %s when the user has not chosen', (operator, expected) => {
            expect(initialMode(undefined, operator)).toBe(expected);
        });

        test('should fall back to system when neither a choice nor an operator default exists', () => {
            expect(initialMode(undefined, undefined)).toBe('system');
        });
    });

    describe('resolveTheme', () => {
        test.each([
            ['light' as const, false, 'light'],
            ['light' as const, true, 'light'],
            ['dark' as const, true, 'dark'],
            ['dark' as const, false, 'dark'],
        ])('should render the explicit mode %s regardless of the OS preference', (mode, prefersDark, expected) => {
            expect(resolveTheme(mode, prefersDark)).toBe(expected);
        });

        test.each([
            [true, 'dark'],
            [false, 'light'],
        ])('should resolve system from the OS preference', (prefersDark, expected) => {
            expect(resolveTheme('system', prefersDark)).toBe(expected);
        });
    });

    describe('applyTheme', () => {
        test('should add the dark class for the dark theme', () => {
            applyTheme('dark');
            expect(document.documentElement.classList.contains('dark')).toBe(true);
        });

        test('should remove the dark class for the light theme', () => {
            document.documentElement.classList.add('dark');
            applyTheme('light');
            expect(document.documentElement.classList.contains('dark')).toBe(false);
        });

        test('should set the colour scheme so native controls follow', () => {
            applyTheme('dark');
            expect(document.documentElement.style.colorScheme).toBe('dark');
        });

        test('should update the theme-color meta tag', () => {
            applyTheme('dark');
            expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#171717');
            applyTheme('light');
            expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#ffffff');
        });

        test('should not throw when the meta tag is absent', () => {
            document.head.innerHTML = '';
            expect(() => applyTheme('dark')).not.toThrow();
        });
    });
});
