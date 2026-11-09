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
