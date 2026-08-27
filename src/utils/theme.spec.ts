import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { BrandingTheme } from 'types/branding';
import {
    applyTheme,
    availableModes,
    brandedMode,
    DARK_SCHEME_QUERY,
    initialMode,
    isBrandedMode,
    isResolvedTheme,
    isThemeMode,
    OPERATOR_DEFAULT_STORAGE_KEY,
    operatorDefaultTheme,
    platformMode,
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
        test.each(['light', 'dark', 'systemLight', 'systemDark'])('should accept %s', (value) => {
            expect(isThemeMode(value)).toBe(true);
        });

        test.each([null, undefined, 42, 'DARK', 'system', 'auto', ''])('should reject %s', (value) => {
            expect(isThemeMode(value)).toBe(false);
        });
    });

    describe('isResolvedTheme', () => {
        test.each(['light', 'dark'])('should accept %s', (value) => {
            expect(isResolvedTheme(value)).toBe(true);
        });

        test.each([null, undefined, 'systemLight', 'systemDark', ''])('should reject %s', (value) => {
            expect(isResolvedTheme(value)).toBe(false);
        });
    });

    describe('isBrandedMode', () => {
        test.each([
            ['light', false],
            ['dark', false],
            ['systemLight', true],
            ['systemDark', true],
        ] as const)('should report %s as %s', (mode, expected) => {
            expect(isBrandedMode(mode)).toBe(expected);
        });
    });

    describe('brandedMode and platformMode', () => {
        test('should map a resolved theme onto its branded composition', () => {
            expect(brandedMode('light')).toBe('systemLight');
            expect(brandedMode('dark')).toBe('systemDark');
        });

        test('should fall a branded mode back to the platform mode rendering the same theme', () => {
            expect(platformMode('systemLight')).toBe('light');
            expect(platformMode('systemDark')).toBe('dark');
        });

        test('should leave a platform mode alone', () => {
            expect(platformMode('light')).toBe('light');
            expect(platformMode('dark')).toBe('dark');
        });
    });

    describe('readStoredMode', () => {
        test('should report no preference when nothing is stored', () => {
            expect(readStoredMode()).toBeUndefined();
        });

        test('should return a valid stored mode', () => {
            localStorage.setItem(THEME_STORAGE_KEY, 'systemDark');
            expect(readStoredMode()).toBe('systemDark');
        });

        test('should report no preference for a corrupt stored value', () => {
            localStorage.setItem(THEME_STORAGE_KEY, 'chartreuse');
            expect(readStoredMode()).toBeUndefined();
        });

        test('should report no preference for a mode retired with the three-mode model', () => {
            localStorage.setItem(THEME_STORAGE_KEY, 'system');
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
            storeMode('systemLight');
            expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('systemLight');
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

        test('should reject a branded mode, which is not a resolved theme', () => {
            localStorage.setItem(OPERATOR_DEFAULT_STORAGE_KEY, 'systemDark');
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

    describe('availableModes', () => {
        test('should offer all four modes once branding is configured', () => {
            expect(availableModes(true)).toEqual(['light', 'dark', 'systemLight', 'systemDark']);
        });

        test('should offer only the platform modes without branding', () => {
            expect(availableModes(false)).toEqual(['light', 'dark']);
        });
    });

    describe('initialMode', () => {
        test.each([
            // stored choice, operator default, OS prefers dark, expected
            ['dark' as const, 'light' as const, false, 'dark'],
            ['systemLight' as const, 'dark' as const, true, 'systemLight'],
            ['light' as const, undefined, true, 'light'],
        ])('should let the stored choice %s win over everything else', (stored, operator, prefersDark, expected) => {
            expect(initialMode(stored, operator, prefersDark)).toBe(expected);
        });

        test.each([
            ['light' as const, true, 'systemLight'],
            ['dark' as const, false, 'systemDark'],
        ])('should apply the operator default %s over the OS preference', (operator, prefersDark, expected) => {
            expect(initialMode(undefined, operator, prefersDark)).toBe(expected);
        });

        test.each([
            [true, 'dark'],
            [false, 'light'],
        ])('should fall back to the OS preference when nothing else is set', (prefersDark, expected) => {
            expect(initialMode(undefined, undefined, prefersDark)).toBe(expected);
        });
    });

    describe('resolveTheme', () => {
        test.each([
            ['light' as const, 'light'],
            ['dark' as const, 'dark'],
            ['systemLight' as const, 'light'],
            ['systemDark' as const, 'dark'],
        ])('should resolve %s to %s', (mode, expected) => {
            expect(resolveTheme(mode)).toBe(expected);
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
