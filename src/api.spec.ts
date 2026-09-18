import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { markBrandingChanged } from 'utils/branding';
import { backendClient, updateBackendUtilsClients } from './api';

describe('api', () => {
    beforeEach(() => {
        // Reset utils clients before each test
        updateBackendUtilsClients(undefined);
    });

    it('should have backendClient initialized', () => {
        expect(backendClient).toBeDefined();
        expect(backendClient.auth).toBeDefined();
        expect(backendClient.users).toBeDefined();
        expect(backendClient.roles).toBeDefined();
        expect(backendClient.certificates).toBeDefined();
        expect(backendClient.raProfiles).toBeDefined();
    });

    it('should update backend utils clients when a valid URL is provided', () => {
        const testUrl = 'https://test-utils-api.com';
        updateBackendUtilsClients(testUrl);

        expect(backendClient.utilsCertificate).toBeDefined();
        expect(backendClient.utilsOid).toBeDefined();
        expect(backendClient.utilsCertificateRequest).toBeDefined();
        expect(backendClient.utilsActuator).toBeDefined();
    });

    it('should clear backend utils clients when an empty URL is provided', () => {
        // First set them
        updateBackendUtilsClients('https://test-utils-api.com');
        expect(backendClient.utilsCertificate).toBeDefined();

        // Then clear them
        updateBackendUtilsClients('');
        expect(backendClient.utilsCertificate).toBeUndefined();
        expect(backendClient.utilsOid).toBeUndefined();
        expect(backendClient.utilsCertificateRequest).toBeUndefined();
        expect(backendClient.utilsActuator).toBeUndefined();
    });

    it('should clear backend utils clients when undefined is provided', () => {
        // First set them
        updateBackendUtilsClients('https://test-utils-api.com');
        expect(backendClient.utilsCertificate).toBeDefined();

        // Then clear them
        updateBackendUtilsClients(undefined);
        expect(backendClient.utilsCertificate).toBeUndefined();
        expect(backendClient.utilsOid).toBeUndefined();
        expect(backendClient.utilsCertificateRequest).toBeUndefined();
        expect(backendClient.utilsActuator).toBeUndefined();
    });

    /**
     * The stale-branding fix is this middleware being on the anonymous client and on nothing else, which is a wiring
     * fact no test of the helpers can reach: point `branding` at the shared configuration and every other test still
     * passes while a saved brand is read back from the browser cache again.
     */
    describe('branding cache bypass', () => {
        const middlewareOf = (client: unknown) =>
            (client as { middleware: { pre?: (r: { url: string }) => { url: string } }[] }).middleware;

        const stubStorage = () => {
            const store = new Map<string, string>();
            vi.stubGlobal('localStorage', {
                getItem: (k: string) => store.get(k) ?? null,
                setItem: (k: string, v: string) => void store.set(k, v),
                removeItem: (k: string) => void store.delete(k),
            });
        };

        afterEach(() => {
            vi.unstubAllGlobals();
        });

        it('should carry the bypass middleware on the anonymous branding client only', () => {
            expect(middlewareOf(backendClient.branding)).toHaveLength(1);
            expect(middlewareOf(backendClient.settings)).toHaveLength(0);
        });

        it('should leave the url alone when this browser has changed no branding', () => {
            stubStorage();
            const [middleware] = middlewareOf(backendClient.branding);

            expect(middleware.pre?.({ url: '/api/v1/branding' }).url).toBe('/api/v1/branding');
        });

        it('should vary the url after a local branding change', () => {
            stubStorage();
            markBrandingChanged();
            const [middleware] = middlewareOf(backendClient.branding);

            expect(middleware.pre?.({ url: '/api/v1/branding' }).url).toMatch(/^\/api\/v1\/branding\?_=\d+$/);
        });

        it('should join onto an existing query string with an ampersand', () => {
            stubStorage();
            markBrandingChanged();
            const [middleware] = middlewareOf(backendClient.branding);

            expect(middleware.pre?.({ url: '/api/v1/branding?x=1' }).url).toMatch(/^\/api\/v1\/branding\?x=1&_=\d+$/);
        });
    });
});
