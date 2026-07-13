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
});
