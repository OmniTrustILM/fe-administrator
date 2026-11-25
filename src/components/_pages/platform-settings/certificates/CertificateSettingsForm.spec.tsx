import type { Page } from '@playwright/test';
import { test, expect } from '../../../../../playwright/ct-test';
import { CertificateSettingsFormTestWrapper } from './CertificateSettingsFormTestWrapper';

test.describe('CertificateSettingsForm - Registration subsection', () => {
    test('renders registration fields seeded with platform settings values', async ({ mount, page }) => {
        await mount(
            <CertificateSettingsFormTestWrapper
                preloadedState={{
                    settings: {
                        platformSettings: {
                            certificates: {
                                registration: {
                                    defaultIssuanceWindowDays: 7,
                                    maxFailedAttempts: 5,
                                },
                            },
                        },
                        isFetchingPlatform: false,
                        isUpdatingPlatform: false,
                    },
                }}
            />,
        );

        await expect(page.locator('#defaultIssuanceWindowDays')).toHaveValue('7');
        await expect(page.locator('#maxFailedAttempts')).toHaveValue('5');
    });

    test('rejects a zero value in registration fields (contract is @Positive, minimum 1)', async ({ mount, page }) => {
        await mount(
            <CertificateSettingsFormTestWrapper
                preloadedState={{
                    settings: {
                        platformSettings: {
                            certificates: {
                                registration: {
                                    defaultIssuanceWindowDays: 7,
                                    maxFailedAttempts: 5,
                                },
                            },
                        },
                        isFetchingPlatform: false,
                        isUpdatingPlatform: false,
                    },
                }}
            />,
        );

        const issuanceWindow = page.locator('#defaultIssuanceWindowDays');
        // TextInput guards against autofill with a readonly attribute removed on focus, so focus first.
        await issuanceWindow.click();
        await issuanceWindow.fill('0');
        await issuanceWindow.blur();

        await expect(page.getByText('Value must be a non-zero integer')).toBeVisible();
    });
});

test.describe('CertificateSettingsForm - Upload subsection', () => {
    const settingsWithAutomaticOwnership = (automaticOwnership: boolean) => ({
        settings: {
            platformSettings: {
                certificates: {
                    upload: { automaticOwnership },
                },
            },
            isFetchingPlatform: false,
            isUpdatingPlatform: false,
        },
    });

    test('shows automatic ownership off when the platform setting is off', async ({ mount, page }) => {
        await mount(<CertificateSettingsFormTestWrapper preloadedState={settingsWithAutomaticOwnership(false)} />);

        await expect(page.locator('#automaticOwnership')).not.toBeChecked();
    });

    test('shows automatic ownership on when the platform setting is on', async ({ mount, page }) => {
        await mount(<CertificateSettingsFormTestWrapper preloadedState={settingsWithAutomaticOwnership(true)} />);

        await expect(page.locator('#automaticOwnership')).toBeChecked();
    });

    test('shows automatic ownership off when the platform settings carry no upload group', async ({ mount, page }) => {
        await mount(
            <CertificateSettingsFormTestWrapper
                preloadedState={{
                    settings: {
                        platformSettings: { certificates: {} },
                        isFetchingPlatform: false,
                        isUpdatingPlatform: false,
                    },
                }}
            />,
        );

        await expect(page.locator('#automaticOwnership')).not.toBeChecked();
    });

    test('turns automatic ownership on when its switch is clicked while the read-only view is on the page', async ({ mount, page }) => {
        await mount(<CertificateSettingsFormTestWrapper preloadedState={settingsWithAutomaticOwnership(false)} withReadOnlyView />);

        await page.locator('label[for="automaticOwnership"]').last().click();

        await expect(page.locator('#automaticOwnership')).toBeChecked();
    });

    test('shows the read-only automatic ownership switch on when the platform setting is on', async ({ mount, page }) => {
        await mount(<CertificateSettingsFormTestWrapper preloadedState={settingsWithAutomaticOwnership(true)} withReadOnlyView />);

        await expect(page.locator('#uploadAutomaticOwnership')).toBeChecked();
    });

    test('shows the read-only automatic ownership switch off when the platform setting is off', async ({ mount, page }) => {
        await mount(<CertificateSettingsFormTestWrapper preloadedState={settingsWithAutomaticOwnership(false)} withReadOnlyView />);

        await expect(page.locator('#uploadAutomaticOwnership')).not.toBeChecked();
    });

    test('names the read-only automatic ownership switch for assistive technology', async ({ mount, page }) => {
        await mount(<CertificateSettingsFormTestWrapper preloadedState={settingsWithAutomaticOwnership(true)} withReadOnlyView />);

        await expect(page.locator('#uploadAutomaticOwnership')).toHaveAccessibleName('Automatic Ownership');
    });

    test('saves automatic ownership as on when the switch is turned on', async ({ mount, page }) => {
        await mount(<CertificateSettingsFormTestWrapper preloadedState={settingsWithAutomaticOwnership(false)} />);

        await page.getByText('Automatic Ownership', { exact: true }).click();
        await expect(page.locator('#automaticOwnership')).toBeChecked();
        await page.getByRole('button', { name: 'Save' }).click();

        await expect(page.getByTestId('update-platform-settings')).toContainText('"upload":{"automaticOwnership":true}');
    });

    test('saves automatic ownership as off when the switch is turned off', async ({ mount, page }) => {
        await mount(<CertificateSettingsFormTestWrapper preloadedState={settingsWithAutomaticOwnership(true)} />);

        await page.getByText('Automatic Ownership', { exact: true }).click();
        await expect(page.locator('#automaticOwnership')).not.toBeChecked();
        await page.getByRole('button', { name: 'Save' }).click();

        await expect(page.getByTestId('update-platform-settings')).toContainText('"upload":{"automaticOwnership":false}');
    });
});

test.describe('CertificateSettingsForm - saving', () => {
    const settingsWithOwnershipOff = {
        settings: {
            platformSettings: { certificates: { upload: { automaticOwnership: false } } },
            isFetchingPlatform: false,
            isUpdatingPlatform: false,
        },
    };

    const saveOwnershipOn = async (page: Page) => {
        await page.getByText('Automatic Ownership', { exact: true }).click();
        await page.getByRole('button', { name: 'Save' }).click();
    };

    test('closes once the update is saved', async ({ mount, page }) => {
        let closed = false;
        await mount(
            <CertificateSettingsFormTestWrapper
                preloadedState={settingsWithOwnershipOff}
                onSuccess={() => {
                    closed = true;
                }}
            />,
        );

        await saveOwnershipOn(page);
        await page.getByTestId('simulate-update-success').click();

        await expect.poll(() => closed).toBe(true);
        expect(closed).toBe(true);
    });

    test('stays open when the update fails', async ({ mount, page }) => {
        let closed = false;
        await mount(
            <CertificateSettingsFormTestWrapper
                preloadedState={settingsWithOwnershipOff}
                onSuccess={() => {
                    closed = true;
                }}
            />,
        );

        await saveOwnershipOn(page);
        await page.getByTestId('simulate-update-failure').click();

        await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();
        expect(closed).toBe(false);
    });
});

test.describe('CertificateSettingsForm - Renewal information subsection', () => {
    const withRenewalInfo = (renewalInfo?: Record<string, number>) => ({
        settings: {
            platformSettings: { certificates: { upload: { automaticOwnership: false }, ...(renewalInfo && { renewalInfo }) } },
            isFetchingPlatform: false,
            isUpdatingPlatform: false,
        },
    });

    const stored = {
        refreshMinInterval: 7200,
        refreshMaxInterval: 172800,
        refreshDefaultInterval: 14400,
        refreshBatchSize: 10,
        refreshRecheckInterval: 1209600,
    };

    const fill = async (page: Page, id: string, value: string) => {
        const input = page.locator(`#${id}`);
        await input.click();
        await input.fill(value);
        await input.blur();
    };

    test('shows the defaults when the backend returns no renewal information section', async ({ mount, page }) => {
        await mount(<CertificateSettingsFormTestWrapper preloadedState={withRenewalInfo()} />);

        await expect(page.locator('#refreshMinHours')).toHaveValue('1');
        await expect(page.locator('#refreshMaxHours')).toHaveValue('24');
        await expect(page.locator('#refreshDefaultHours')).toHaveValue('6');
        await expect(page.locator('#refreshBatchSize')).toHaveValue('20');
        await expect(page.locator('#refreshRecheckDays')).toHaveValue('7');
    });

    test('shows the stored values in hours and days, also in the read-only view', async ({ mount, page }) => {
        await mount(<CertificateSettingsFormTestWrapper preloadedState={withRenewalInfo(stored)} withReadOnlyView />);

        await expect(page.locator('#refreshMinHours')).toHaveValue('2');
        await expect(page.locator('#refreshMaxHours')).toHaveValue('48');
        await expect(page.locator('#refreshDefaultHours')).toHaveValue('4');
        await expect(page.locator('#refreshBatchSize')).toHaveValue('10');
        await expect(page.locator('#refreshRecheckDays')).toHaveValue('14');
        await expect(page.getByText('48 (hours)')).toBeVisible();
        await expect(page.getByText('14 (days)')).toBeVisible();
    });

    test('saves the intervals converted to seconds', async ({ mount, page }) => {
        await mount(<CertificateSettingsFormTestWrapper preloadedState={withRenewalInfo(stored)} />);

        await fill(page, 'refreshBatchSize', '50');
        await fill(page, 'refreshRecheckDays', '3');
        await page.getByRole('button', { name: 'Save' }).click();

        await expect(page.getByTestId('update-platform-settings')).toContainText(
            '"renewalInfo":{"refreshMinInterval":7200,"refreshMaxInterval":172800,"refreshDefaultInterval":14400,"refreshBatchSize":50,"refreshRecheckInterval":259200}',
        );
    });

    test('saves a fractional hour value when Enter is pressed in the field', async ({ mount, page }) => {
        await mount(<CertificateSettingsFormTestWrapper preloadedState={withRenewalInfo(stored)} />);

        const input = page.locator('#refreshMaxHours');
        await input.click();
        await input.fill('48.5');
        await input.press('Enter');

        await expect(page.getByTestId('update-platform-settings')).toContainText('"refreshMaxInterval":174600');
    });

    test('refuses a batch size outside 1 to 50', async ({ mount, page }) => {
        await mount(<CertificateSettingsFormTestWrapper preloadedState={withRenewalInfo(stored)} />);

        await fill(page, 'refreshBatchSize', '51');
        await expect(page.getByText('Value must be between 1 and 50')).toBeVisible();
        await fill(page, 'refreshBatchSize', '0');
        await expect(page.getByText('Value must be between 1 and 50')).toBeVisible();
    });

    test('refuses a minimum above the default', async ({ mount, page }) => {
        await mount(<CertificateSettingsFormTestWrapper preloadedState={withRenewalInfo(stored)} />);

        await fill(page, 'refreshMinHours', '5');

        await expect(page.getByText('Minimum must not exceed default, and default must not exceed maximum').first()).toBeVisible();
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByTestId('update-platform-settings')).toHaveText('[]');
    });

    for (const field of ['refreshMinHours', 'refreshMaxHours', 'refreshDefaultHours']) {
        test(`${field} refuses a value just outside 1 minute to 168 hours and accepts the edges`, async ({ mount, page }) => {
            await mount(
                <CertificateSettingsFormTestWrapper
                    preloadedState={withRenewalInfo({
                        ...stored,
                        refreshMinInterval: 60,
                        refreshDefaultInterval: 60,
                        refreshMaxInterval: 604800,
                    })}
                />,
            );

            await fill(page, field, '168.1');
            await expect(page.getByText('Value must be between 1 minute (0.0167 hours) and 168 hours')).toBeVisible();
            await fill(page, field, '0.016');
            await expect(page.getByText('Value must be between 1 minute (0.0167 hours) and 168 hours')).toBeVisible();
            await fill(page, field, '0.0167');
            await expect(page.getByText('Value must be between 1 minute (0.0167 hours) and 168 hours')).toHaveCount(0);
        });
    }

    test('the re-check interval accepts 1 hour and 365 days and refuses just outside them', async ({ mount, page }) => {
        await mount(<CertificateSettingsFormTestWrapper preloadedState={withRenewalInfo(stored)} />);

        const message = page.getByText('Value must be between 1 hour (0.0417 days) and 365 days');
        await fill(page, 'refreshRecheckDays', '366');
        await expect(message).toBeVisible();
        await fill(page, 'refreshRecheckDays', '0.04');
        await expect(message).toBeVisible();
        await fill(page, 'refreshRecheckDays', '365');
        await expect(message).toHaveCount(0);
        await fill(page, 'refreshRecheckDays', '0.0417');
        await expect(message).toHaveCount(0);
    });
});
