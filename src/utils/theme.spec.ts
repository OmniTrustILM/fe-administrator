import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
    applyTheme,
    DARK_SCHEME_QUERY,
    isThemeMode,
    nextMode,
    prefersDarkScheme,
    readStoredMode,
    resolveTheme,
    storeMode,
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

        test.each([null, undefined, 42, 'DARK', 'auto', ''])('should reject %s', (value) => {
            expect(isThemeMode(value)).toBe(false);
        });
    });

    describe('readStoredMode', () => {
        test('should default to system when nothing is stored', () => {
            expect(readStoredMode()).toBe('system');
        });

        test('should return a valid stored mode', () => {
            localStorage.setItem(THEME_STORAGE_KEY, 'dark');
            expect(readStoredMode()).toBe('dark');
        });

        test('should fall back to system for a corrupt stored value', () => {
            localStorage.setItem(THEME_STORAGE_KEY, 'chartreuse');
            expect(readStoredMode()).toBe('system');
        });

        test('should fall back to system when storage throws', () => {
            // Stub the global rather than Storage.prototype: happy-dom wraps each Storage instance
            // in a Proxy that caches methods onto the instance on first access, so a prototype spy
            // installed after any earlier call never fires and the catch path is never reached.
            const getItem = vi.fn(() => {
                throw new Error('storage disabled');
            });
            vi.stubGlobal('localStorage', { getItem });

            expect(readStoredMode()).toBe('system');
            expect(getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);
        });
    });

    describe('storeMode', () => {
        test('should persist the mode', () => {
            storeMode('light');
            expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
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

    describe('resolveTheme', () => {
        test.each([
            ['light', true, 'light'],
            ['light', false, 'light'],
            ['dark', true, 'dark'],
            ['dark', false, 'dark'],
        ] as const)('should return %s regardless of the OS preference', (mode, prefersDark, expected) => {
            expect(resolveTheme(mode, prefersDark)).toBe(expected);
        });

        test('should follow the OS preference in system mode', () => {
            expect(resolveTheme('system', true)).toBe('dark');
            expect(resolveTheme('system', false)).toBe('light');
        });
    });

    describe('nextMode', () => {
        test('should cycle system to light to dark and back to system', () => {
            expect(nextMode('system')).toBe('light');
            expect(nextMode('light')).toBe('dark');
            expect(nextMode('dark')).toBe('system');
        });

        test('should return to the starting mode after three steps', () => {
            expect(nextMode(nextMode(nextMode('system')))).toBe('system');
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
