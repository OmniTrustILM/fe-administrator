import { test, expect } from 'playwright/ct-test';
import { SigningProfileFormTestWrapper } from './SigningProfileFormTestWrapper';

// Regression for issue #1820: the Create button must not stay disabled when Qualified
// Timestamp is toggled on (making Time Quality Configuration required) and then back off
// (making it optional again). Previously the stale "required" validation error on the
// Time Quality Configuration field kept the form invalid even after un-checking.
test.describe('SigningProfileForm - Qualified Timestamp / Time Quality Configuration validation (#1820)', () => {
    type Page = import('@playwright/test').Page;

    const TAB_TIMESTAMPING = '2 · Timestamping Properties';
    const TAB_SIGNING_SCHEME = '3 · Signing Scheme';

    async function fillRequiredFields(page: Page) {
        // Tab 1 — General. The input is readonly until focused (anti-autofill guard),
        // so focus it first to make it editable.
        const nameInput = page.locator('#signingProfileName');
        await nameInput.focus();
        await nameInput.fill('TestProfile');

        // Tab 2 — Timestamping Properties (signature formatting connector)
        await page.getByRole('tab', { name: TAB_TIMESTAMPING }).click();
        await page.getByTestId('select-signatureFormattingConnector-trigger').click();
        await page.getByRole('option', { name: 'PAdES Connector', exact: true }).click();

        // Tab 3 — Signing Scheme (certificate)
        await page.getByRole('tab', { name: TAB_SIGNING_SCHEME }).click();
        await page.getByTestId('select-certificateUuid-trigger').click();
        await page.getByRole('option', { name: 'Signing Cert (123)', exact: true }).click();
    }

    test('Create is enabled with required fields filled and Qualified Timestamp off', async ({ mount, page }) => {
        await mount(<SigningProfileFormTestWrapper />);
        await fillRequiredFields(page);
        await expect(page.getByTestId('progress-button')).toBeEnabled();
    });

    test('Create is disabled when Qualified Timestamp is on but Time Quality Configuration is empty', async ({ mount, page }) => {
        await mount(<SigningProfileFormTestWrapper />);
        await fillRequiredFields(page);
        // Baseline: the form is dirty and otherwise valid, so the disable below is attributable
        // to the Time Quality Configuration requirement, not to !isDirty.
        await expect(page.getByTestId('progress-button')).toBeEnabled();

        await page.getByRole('tab', { name: TAB_TIMESTAMPING }).click();
        // Qualified Timestamp on makes Time Quality Configuration required; with it empty the
        // form must be invalid.
        await page.locator('#qualifiedTimestamp').check({ force: true });
        await expect(page.getByTestId('progress-button')).toBeDisabled();
    });

    test('Create re-enables after toggling Qualified Timestamp on then off', async ({ mount, page }) => {
        await mount(<SigningProfileFormTestWrapper />);
        await fillRequiredFields(page);
        await expect(page.getByTestId('progress-button')).toBeEnabled();

        await page.getByRole('tab', { name: TAB_TIMESTAMPING }).click();

        // Turn it on (Time Quality Configuration becomes required, but is empty) → invalid.
        await page.locator('#qualifiedTimestamp').check({ force: true });
        await expect(page.getByTestId('progress-button')).toBeDisabled();

        // Turn it back off → Time Quality Configuration is optional again → valid.
        await page.locator('#qualifiedTimestamp').uncheck({ force: true });
        await expect(page.getByTestId('progress-button')).toBeEnabled();
    });

    // The precise reported #1820 path: Qualified Timestamp is turned on (making Time Quality
    // Configuration required while empty → invalid), the user keeps editing other fields, and then
    // turns Qualified Timestamp back off. The stale "required" error must not keep Create disabled.
    test('Create re-enables after Qualified Timestamp off even after further edits while it was on', async ({ mount, page }) => {
        await mount(<SigningProfileFormTestWrapper />);
        await fillRequiredFields(page);
        await expect(page.getByTestId('progress-button')).toBeEnabled();

        await page.getByRole('tab', { name: TAB_TIMESTAMPING }).click();
        await page.locator('#qualifiedTimestamp').check({ force: true });
        await expect(page.getByTestId('progress-button')).toBeDisabled();

        // Edit another field while Qualified Timestamp is on (and the form is invalid).
        await page.locator('#validateTokenSignature').check({ force: true });
        await expect(page.getByTestId('progress-button')).toBeDisabled();

        // Turning Qualified Timestamp off makes Time Quality Configuration optional again.
        await page.locator('#qualifiedTimestamp').uncheck({ force: true });
        await expect(page.getByTestId('progress-button')).toBeEnabled();
    });
});

// Root cause of #1820: fields that are validated as required must also render the red-star
// required indicator, otherwise the user can't tell why Create stays disabled. Every field with
// a validateRequired rule must show the asterisk (conditionally-required fields show it only
// while required).
test.describe('SigningProfileForm - required-field indicators (#1820)', () => {
    const TAB_TIMESTAMPING = '2 · Timestamping Properties';
    const TAB_RECORD_POLICY = '4 · Record Policy';

    test('Signature Formatting Connector label shows the required asterisk', async ({ mount, page }) => {
        await mount(<SigningProfileFormTestWrapper />);
        await page.getByRole('tab', { name: TAB_TIMESTAMPING }).click();
        await expect(page.getByTestId('label-signatureFormattingConnector')).toContainText('*');
    });

    test('Time Quality Configuration shows the required asterisk only while Qualified Timestamp is on', async ({ mount, page }) => {
        await mount(<SigningProfileFormTestWrapper />);
        await page.getByRole('tab', { name: TAB_TIMESTAMPING }).click();

        // Qualified Timestamp off → optional → no asterisk.
        await expect(page.getByTestId('label-timeQualityConfigurationUuid')).not.toContainText('*');

        // Qualified Timestamp on → required → asterisk shown.
        await page.locator('#qualifiedTimestamp').check({ force: true });
        await expect(page.getByTestId('label-timeQualityConfigurationUuid')).toContainText('*');
    });

    test('Retention (days) label shows the required asterisk when the field is shown', async ({ mount, page }) => {
        await mount(<SigningProfileFormTestWrapper />);
        await page.getByRole('tab', { name: TAB_RECORD_POLICY }).click();
        await page.locator('#recordingEnabled').check({ force: true });
        await page.locator('#retentionIndefinite').uncheck({ force: true });
        await expect(page.getByTestId('label-retentionDays')).toContainText('*');
    });
});
