import { test, expect } from '../../../../../playwright/ct-test';
import {
    CBOM_REPOSITORY_HEALTH_WARNING_MESSAGE,
    getCbomRepositoryHealthWarning,
    validateCbomRepositoryUrl,
} from './UtilsSettingsForm.validation';
import { CBOM_SYNC_TUNABLES, describeTunable, parseOptionalInteger } from './UtilsSettings.tunables';
import { UtilsSettingsFormTestWrapper } from './UtilsSettingsFormTestWrapper';
import type { SettingsPlatformUpdateModel } from 'types/settings';

test.describe('UtilsSettingsForm - CBOM repository URL validation', () => {
    test('validateCbomRepositoryUrl validates only URL format, and the whole value', () => {
        expect(validateCbomRepositoryUrl('https://cbom.example.com')).toBeUndefined();
        expect(validateCbomRepositoryUrl('http://cbom.example.com/api')).toBeUndefined();
        expect(validateCbomRepositoryUrl('http://cbom_repository:8080')).toBeUndefined();
        expect(validateCbomRepositoryUrl('invalid url')).toBe('Please enter valid URL.');
        // A valid-looking start with text after it: the health probe is only a warning, so this must not be saveable.
        expect(validateCbomRepositoryUrl('https://cbom.example.com not-a-url')).toBe('Please enter valid URL.');
        expect(validateCbomRepositoryUrl('ftp://cbom.example.com')).toBe('Please enter valid URL.');
        expect(validateCbomRepositoryUrl('cbom.example.com')).toBe('Please enter valid URL.');
        expect(validateCbomRepositoryUrl('http:cbom.example.com')).toBe('Please enter valid URL.');
        expect(validateCbomRepositoryUrl('https://cbom.example.com/api?x=1')).toBe('Please enter valid URL.');
        // Surrounding whitespace (a pasted value) is not held against it; the form trims it on save.
        expect(validateCbomRepositoryUrl(' https://cbom.example.com ')).toBeUndefined();
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

const seededSettings = {
    settings: {
        platformSettings: {
            utils: {
                cbomRepositoryUrl: 'https://cbom.example.com',
                cbomSyncOverlapSeconds: 60,
                cbomSyncSkippedRetryRuns: 3,
                cbomSyncMaxIngestDocuments: 50,
            },
        },
        isFetchingPlatform: false,
        isUpdatingPlatform: false,
    },
};

test.describe('UtilsSettingsForm - CBOM sync tunables', () => {
    test('renders the tunables seeded with the platform settings values', async ({ mount, page }) => {
        await mount(<UtilsSettingsFormTestWrapper preloadedState={seededSettings} />);

        await expect(page.locator('#cbomSyncOverlapSeconds')).toHaveValue('60');
        await expect(page.locator('#cbomSyncSkippedRetryRuns')).toHaveValue('3');
        await expect(page.locator('#cbomSyncMaxIngestDocuments')).toHaveValue('50');
    });

    test('rejects a value above the cap and anything that is not a whole number', async ({ mount, page }) => {
        await mount(<UtilsSettingsFormTestWrapper preloadedState={seededSettings} />);

        const overlap = page.locator('#cbomSyncOverlapSeconds');
        // TextInput guards against autofill with a readonly attribute removed on focus, so focus first.
        await overlap.click();
        await overlap.fill('86401');
        await overlap.blur();
        await expect(page.getByText('Value must not exceed 86400')).toBeVisible();

        const retries = page.locator('#cbomSyncSkippedRetryRuns');
        await retries.click();
        await retries.fill('3e');
        await retries.blur();
        await expect(page.getByText('Value must be a positive integer')).toBeVisible();

        await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    test('submits the utils section as sent: edited and untouched values, an emptied one left out', async ({ mount, page }) => {
        const requests: SettingsPlatformUpdateModel[] = [];
        await mount(<UtilsSettingsFormTestWrapper preloadedState={seededSettings} onUpdate={(request) => requests.push(request)} />);

        const overlap = page.locator('#cbomSyncOverlapSeconds');
        await overlap.click();
        await overlap.fill('120');
        const retries = page.locator('#cbomSyncSkippedRetryRuns');
        await retries.click();
        await retries.fill('');
        await page.getByRole('button', { name: 'Save' }).click();

        await expect.poll(() => requests.length).toBe(1);
        // What goes on the wire: the client serialises with JSON.stringify, which drops the emptied field.
        expect(JSON.parse(JSON.stringify(requests[0]))).toStrictEqual({
            utils: {
                cbomRepositoryUrl: 'https://cbom.example.com',
                cbomSyncOverlapSeconds: 120,
                cbomSyncMaxIngestDocuments: 50,
            },
        });
    });

    test('a failing Utils Service health probe warns without blocking a save of the tunables', async ({ mount, page }) => {
        await mount(
            <UtilsSettingsFormTestWrapper
                preloadedState={{
                    settings: {
                        ...seededSettings.settings,
                        platformSettings: {
                            utils: { ...seededSettings.settings.platformSettings.utils, utilsServiceUrl: 'http://127.0.0.1:9' },
                        },
                    },
                }}
            />,
        );

        // Chromium refuses port 9 as a restricted port, so the probe fails offline and deterministically; the warning
        // shows on the stored URL, untouched, and the field is described by it.
        const warning = page.getByTestId('utils-service-health-warning');
        const message = 'Ensure that entered Utils Service URL is reachable. Health check failed.';
        await expect(warning).toHaveText(message);
        await expect(page.locator('#utilsServiceUrl')).toHaveAttribute('aria-describedby', 'utils-service-health-warning');

        const overlap = page.locator('#cbomSyncOverlapSeconds');
        await overlap.click();
        await overlap.fill('120');
        await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();

        // A retyped URL drops the previous verdict at once; the new one arrives after its own probe.
        const url = page.locator('#utilsServiceUrl');
        await url.click();
        await url.fill('http://127.0.0.1:9/other');
        await expect(warning).toHaveText('');
        await expect(warning).toHaveText(message);
    });

    test('the read view describes an unset tunable as the platform default and a count of one in the singular', () => {
        const overlap = CBOM_SYNC_TUNABLES[0];
        expect(describeTunable(overlap, undefined)).toBe('platform default (60 seconds)');
        expect(describeTunable(overlap, 0)).toBe('0 seconds');
        expect(describeTunable(CBOM_SYNC_TUNABLES[1], 1)).toBe('1 run');
        expect(parseOptionalInteger('')).toBeUndefined();
        expect(parseOptionalInteger('0')).toBe(0);
        expect(parseOptionalInteger('120')).toBe(120);
    });
});
