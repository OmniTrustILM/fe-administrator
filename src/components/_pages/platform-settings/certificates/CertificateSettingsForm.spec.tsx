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
