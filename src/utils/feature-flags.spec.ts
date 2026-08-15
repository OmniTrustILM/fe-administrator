import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * feature-flags reads `window.__ENV__` once at module-load time, so each test must reset the module registry
 * (via `vi.resetModules`) and re-import the module dynamically after setting up the desired environment.
 */

describe('feature-flags', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    // -------------------------------------------------------------------------
    // isProxiesEnabled
    // -------------------------------------------------------------------------

    describe('isProxiesEnabled', () => {
        test('is true when ENABLE_PROXIES is explicitly true', async () => {
            vi.stubGlobal('__ENV__', { ENABLE_PROXIES: true });
            const { featureFlags } = await import('./feature-flags');
            expect(featureFlags.isProxiesEnabled).toBe(true);
        });

        test('is false when ENABLE_PROXIES is explicitly false', async () => {
            vi.stubGlobal('__ENV__', { ENABLE_PROXIES: false });
            const { featureFlags } = await import('./feature-flags');
            expect(featureFlags.isProxiesEnabled).toBe(false);
        });

        test('is false when ENABLE_PROXIES is absent (opt-in semantics)', async () => {
            vi.stubGlobal('__ENV__', {});
            const { featureFlags } = await import('./feature-flags');
            expect(featureFlags.isProxiesEnabled).toBe(false);
        });

        test('is false when __ENV__ is undefined entirely', async () => {
            vi.stubGlobal('__ENV__', undefined);
            const { featureFlags } = await import('./feature-flags');
            expect(featureFlags.isProxiesEnabled).toBe(false);
        });
    });

    // -------------------------------------------------------------------------
    // isTrustedCertificatesEnabled
    // -------------------------------------------------------------------------

    describe('isTrustedCertificatesEnabled', () => {
        test('is true when ENABLE_TRUSTED_CERTIFICATES is explicitly true', async () => {
            vi.stubGlobal('__ENV__', { ENABLE_TRUSTED_CERTIFICATES: true });
            const { featureFlags } = await import('./feature-flags');
            expect(featureFlags.isTrustedCertificatesEnabled).toBe(true);
        });

        test('is false when ENABLE_TRUSTED_CERTIFICATES is explicitly false', async () => {
            vi.stubGlobal('__ENV__', { ENABLE_TRUSTED_CERTIFICATES: false });
            const { featureFlags } = await import('./feature-flags');
            expect(featureFlags.isTrustedCertificatesEnabled).toBe(false);
        });

        test('is false when ENABLE_TRUSTED_CERTIFICATES is absent (opt-in semantics)', async () => {
            vi.stubGlobal('__ENV__', {});
            const { featureFlags } = await import('./feature-flags');
            expect(featureFlags.isTrustedCertificatesEnabled).toBe(false);
        });

        test('is false when __ENV__ is undefined entirely', async () => {
            vi.stubGlobal('__ENV__', undefined);
            const { featureFlags } = await import('./feature-flags');
            expect(featureFlags.isTrustedCertificatesEnabled).toBe(false);
        });
    });

    // -------------------------------------------------------------------------
    // isBrandingEnabled
    // -------------------------------------------------------------------------

    describe('isBrandingEnabled', () => {
        test('is true when ENABLE_BRANDING is explicitly true', async () => {
            vi.stubGlobal('__ENV__', { ENABLE_BRANDING: true });
            const { featureFlags } = await import('./feature-flags');
            expect(featureFlags.isBrandingEnabled).toBe(true);
        });

        test('is false when ENABLE_BRANDING is explicitly false', async () => {
            vi.stubGlobal('__ENV__', { ENABLE_BRANDING: false });
            const { featureFlags } = await import('./feature-flags');
            expect(featureFlags.isBrandingEnabled).toBe(false);
        });

        test('is false when ENABLE_BRANDING is absent (opt-in semantics)', async () => {
            vi.stubGlobal('__ENV__', {});
            const { featureFlags } = await import('./feature-flags');
            expect(featureFlags.isBrandingEnabled).toBe(false);
        });

        test('is false when __ENV__ is undefined entirely', async () => {
            vi.stubGlobal('__ENV__', undefined);
            const { featureFlags } = await import('./feature-flags');
            expect(featureFlags.isBrandingEnabled).toBe(false);
        });
    });

    // -------------------------------------------------------------------------
    // Both flags together (realistic deployment scenarios)
    // -------------------------------------------------------------------------

    describe('combined flags', () => {
        test('both flags are true when both env variables are true', async () => {
            vi.stubGlobal('__ENV__', { ENABLE_PROXIES: true, ENABLE_TRUSTED_CERTIFICATES: true });
            const { featureFlags } = await import('./feature-flags');
            expect(featureFlags.isProxiesEnabled).toBe(true);
            expect(featureFlags.isTrustedCertificatesEnabled).toBe(true);
        });

        test('flags are independent — one true, one false', async () => {
            vi.stubGlobal('__ENV__', { ENABLE_PROXIES: true, ENABLE_TRUSTED_CERTIFICATES: false });
            const { featureFlags } = await import('./feature-flags');
            expect(featureFlags.isProxiesEnabled).toBe(true);
            expect(featureFlags.isTrustedCertificatesEnabled).toBe(false);
        });

        test('both flags are false when env is empty', async () => {
            vi.stubGlobal('__ENV__', {});
            const { featureFlags } = await import('./feature-flags');
            expect(featureFlags.isProxiesEnabled).toBe(false);
            expect(featureFlags.isTrustedCertificatesEnabled).toBe(false);
        });
    });
});
