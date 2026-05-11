import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { loginRedirect } from './login-redirect';

describe('loginRedirect', () => {
    const originalLocation = globalThis.location;
    const mockAssign = vi.fn();

    beforeEach(() => {
        // Mock window.location.assign
        delete (globalThis as any).location;
        globalThis.location = { ...originalLocation, assign: mockAssign };
    });

    afterEach(() => {
        globalThis.location = originalLocation;
        vi.clearAllMocks();
    });

    const assertRedirect = (expectedUrl: string, callCount = 1) => {
        expect(mockAssign).toHaveBeenCalledWith(expectedUrl);
        expect(mockAssign).toHaveBeenCalledTimes(callCount);
    };

    const runTestCase = (
        testCase: { loginUrl: string; redirect: string | null; expected: string; description: string },
        setupCallback?: () => void,
    ) => {
        if (setupCallback) setupCallback();
        loginRedirect(testCase.loginUrl, testCase.redirect);
        assertRedirect(testCase.expected);
    };

    const absoluteUrlTestCases = [
        {
            loginUrl: 'https://example.com/login',
            redirect: null,
            expected: 'https://example.com/login',
            description: 'without redirect parameter',
        },
        {
            loginUrl: 'https://example.com/login',
            redirect: '/dashboard',
            expected: 'https://example.com/login?redirect=%2Fdashboard',
            description: 'with redirect parameter and no query string',
        },
        {
            loginUrl: 'https://example.com/login?foo=bar',
            redirect: '/dashboard',
            expected: 'https://example.com/login?foo=bar&redirect=%2Fdashboard',
            description: 'with redirect parameter and existing query string',
        },
    ];

    const relativeUrlTestCases = [
        {
            loginUrl: '/auth/login',
            redirect: null,
            expected: 'http://localhost:3000/auth/login',
            description: 'convert relative URL to absolute',
        },
        {
            loginUrl: '/auth/login',
            redirect: '/dashboard',
            expected: 'http://localhost:3000/auth/login?redirect=%2Fdashboard',
            description: 'with redirect parameter and no query string',
        },
        {
            loginUrl: '/auth/login?session=abc123',
            redirect: '/dashboard',
            expected: 'http://localhost:3000/auth/login?session=abc123&redirect=%2Fdashboard',
            description: 'with redirect parameter and existing query string',
        },
    ];

    const encodingTestCases = [
        {
            loginUrl: 'https://example.com/login',
            redirect: '/dashboard?tab=overview&id=123',
            expected: 'https://example.com/login?redirect=%2Fdashboard%3Ftab%3Doverview%26id%3D123',
            description: 'special characters',
        },
        {
            loginUrl: 'https://example.com/login',
            redirect: '/path with spaces',
            expected: 'https://example.com/login?redirect=%2Fpath%20with%20spaces',
            description: 'spaces',
        },
        {
            loginUrl: 'https://example.com/login',
            redirect: '/dashboard#section',
            expected: 'https://example.com/login?redirect=%2Fdashboard%23section',
            description: 'hash symbol',
        },
        {
            loginUrl: 'https://example.com/login',
            redirect: '',
            expected: 'https://example.com/login',
            description: 'empty string',
        },
    ];

    const edgeCaseTestCases = [
        {
            loginUrl: 'https://example.com/login?foo=bar&baz=qux',
            redirect: '/home',
            expected: 'https://example.com/login?foo=bar&baz=qux&redirect=%2Fhome',
            description: 'URL with multiple query parameters',
        },
        {
            loginUrl: 'https://example.com/login/',
            redirect: '/dashboard',
            expected: 'https://example.com/login/?redirect=%2Fdashboard',
            description: 'URL with trailing slash',
        },
        {
            loginUrl: 'https://example.com/login',
            redirect: 'https://other-domain.com/page',
            expected: 'https://example.com/login?redirect=https%3A%2F%2Fother-domain.com%2Fpage',
            description: 'redirect with absolute URL',
        },
        {
            loginUrl: 'https://example.com/login',
            redirect: null,
            expected: 'https://example.com/login',
            description: 'null redirect parameter',
        },
    ];

    describe('URL construction with absolute URLs', () => {
        test.each(absoluteUrlTestCases)('should redirect to absolute URL $description', (testCase) => {
            runTestCase(testCase);
        });
    });

    describe('URL construction with relative URLs', () => {
        test.each(relativeUrlTestCases)('should handle relative URLs: $description', (testCase) => {
            runTestCase(testCase, () => {
                Object.defineProperty(globalThis.location, 'origin', {
                    writable: true,
                    value: 'http://localhost:3000',
                });
            });
        });
    });

    describe('redirect parameter encoding', () => {
        test.each(encodingTestCases)('should properly encode redirect parameter with $description', (testCase) => {
            runTestCase(testCase);
        });
    });

    describe('edge cases', () => {
        test.each(edgeCaseTestCases)('should handle $description', (testCase) => {
            runTestCase(testCase);
        });
    });
});
