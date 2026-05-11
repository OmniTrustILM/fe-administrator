import { test, expect } from '../../../../../playwright/ct-test';
import {
    CBOM_REPOSITORY_HEALTH_WARNING_MESSAGE,
    getCbomRepositoryHealthWarning,
    validateCbomRepositoryUrl,
} from './UtilsSettingsForm.validation';

test.describe('UtilsSettingsForm - CBOM repository URL validation', () => {
    test('validateCbomRepositoryUrl validates only URL format', () => {
        expect(validateCbomRepositoryUrl('https://cbom.example.com')).toBeUndefined();
        expect(validateCbomRepositoryUrl('http://cbom.example.com/api')).toBeUndefined();
        expect(validateCbomRepositoryUrl('invalid url')).toBe('Please enter valid URL.');
    });

    test('getCbomRepositoryHealthWarning returns warning for reachable check failure', async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (..._args: Parameters<typeof fetch>) =>
            ({
                status: 503,
                json: async () => ({ status: 'DOWN' }),
            }) as Response;

        try {
            await expect(getCbomRepositoryHealthWarning('https://cbom.example.com')).resolves.toBe(CBOM_REPOSITORY_HEALTH_WARNING_MESSAGE);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    test('getCbomRepositoryHealthWarning returns undefined when health endpoint is UP', async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (..._args: Parameters<typeof fetch>) =>
            ({
                status: 200,
                json: async () => ({ status: 'UP' }),
            }) as Response;

        try {
            await expect(getCbomRepositoryHealthWarning('https://cbom.example.com')).resolves.toBeUndefined();
        } finally {
            globalThis.fetch = originalFetch;
        }
    });
});
