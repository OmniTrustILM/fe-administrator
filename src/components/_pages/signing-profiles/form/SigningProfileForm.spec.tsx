import { test, expect } from 'playwright/ct-test';
import { SigningProfileFormTestWrapper } from './SigningProfileFormTestWrapper';
import { ADDED_POLICY_ID, EXISTING_POLICY_ID } from './signingProfileFormFixtures';

// Switch renders its checkbox as `sr-only` underneath the styled track, so the input itself is
// never a valid hit target. Clicking the associated <label> drives it the way a user does.
async function toggleSwitch(page: import('@playwright/test').Page, id: string, expected: boolean) {
    await page.locator(`label[for="${id}"]`).first().click();
    await expect(page.locator(`#${id}`)).toBeChecked({ checked: expected });
}

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
        await toggleSwitch(page, 'qualifiedTimestamp', true);
        await expect(page.getByTestId('progress-button')).toBeDisabled();
    });

    test('Create re-enables after toggling Qualified Timestamp on then off', async ({ mount, page }) => {
        await mount(<SigningProfileFormTestWrapper />);
        await fillRequiredFields(page);
        await expect(page.getByTestId('progress-button')).toBeEnabled();

        await page.getByRole('tab', { name: TAB_TIMESTAMPING }).click();

        // Turn it on (Time Quality Configuration becomes required, but is empty) → invalid.
        await toggleSwitch(page, 'qualifiedTimestamp', true);
        await expect(page.getByTestId('progress-button')).toBeDisabled();

        // Turn it back off → Time Quality Configuration is optional again → valid.
        await toggleSwitch(page, 'qualifiedTimestamp', false);
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
        await toggleSwitch(page, 'qualifiedTimestamp', true);
        await expect(page.getByTestId('progress-button')).toBeDisabled();

        // Edit another field while Qualified Timestamp is on (and the form is invalid).
        await toggleSwitch(page, 'validateTokenSignature', true);
        await expect(page.getByTestId('progress-button')).toBeDisabled();

        // Turning Qualified Timestamp off makes Time Quality Configuration optional again.
        await toggleSwitch(page, 'qualifiedTimestamp', false);
        await expect(page.getByTestId('progress-button')).toBeEnabled();
    });
});

// Regression for issue #1927: Allowed TSA Policy IDs lived in component-local state, outside
// react-hook-form, so adding or removing one never marked the form dirty and the Update button
// stayed disabled until some other field was touched.
test.describe('SigningProfileForm - Allowed TSA Policy IDs mark the form dirty (#1927)', () => {
    type Page = import('@playwright/test').Page;

    const TAB_TIMESTAMPING = '2 · Timestamping Properties';

    // Opens the Timestamping tab and waits for the loaded policy chip, so the assertions that
    // follow are made against a form that has actually been reset from the store.
    async function openLoadedTimestampingTab(page: Page) {
        await page.getByRole('tab', { name: TAB_TIMESTAMPING }).click();
        await expect(page.getByRole('button', { name: `Remove ${EXISTING_POLICY_ID}` })).toBeVisible();
    }

    test('Update enables after adding an Allowed TSA Policy ID', async ({ mount, page }) => {
        await mount(<SigningProfileFormTestWrapper editMode />);
        await openLoadedTimestampingTab(page);

        // Baseline: the loaded edit form is not dirty, so Update is disabled.
        await expect(page.getByTestId('progress-button')).toBeDisabled();

        await page.locator('#policyIdInput').fill(ADDED_POLICY_ID);
        await page.getByRole('button', { name: 'Add', exact: true }).click();

        await expect(page.getByRole('button', { name: `Remove ${ADDED_POLICY_ID}` })).toBeVisible();
        await expect(page.getByTestId('progress-button')).toBeEnabled();
    });

    test('Update enables after removing an Allowed TSA Policy ID', async ({ mount, page }) => {
        await mount(<SigningProfileFormTestWrapper editMode />);
        await openLoadedTimestampingTab(page);
        await expect(page.getByTestId('progress-button')).toBeDisabled();

        await page.getByRole('button', { name: `Remove ${EXISTING_POLICY_ID}` }).click();

        await expect(page.getByText('No policies added. All policy IDs will be accepted.')).toBeVisible();
        await expect(page.getByTestId('progress-button')).toBeEnabled();
    });

    test('Update disables again when the policy IDs are restored to their loaded value', async ({ mount, page }) => {
        await mount(<SigningProfileFormTestWrapper editMode />);
        await openLoadedTimestampingTab(page);

        await page.getByRole('button', { name: `Remove ${EXISTING_POLICY_ID}` }).click();
        await expect(page.getByTestId('progress-button')).toBeEnabled();

        await page.locator('#policyIdInput').fill(EXISTING_POLICY_ID);
        await page.getByRole('button', { name: 'Add', exact: true }).click();

        await expect(page.getByTestId('progress-button')).toBeDisabled();
    });

    // Mirrors the backend class-level @ValidDefaultPolicyId on TimestampingWorkflowRequestDto:
    // when defaultPolicyId is set and allowedPolicyIds is non-empty, the default must be a member.
    // Without a client-side mirror the newly-enabled Update button would produce a 400.
    test('Update is blocked with a visible reason when the default policy ID leaves the allowed list', async ({ mount, page }) => {
        await mount(<SigningProfileFormTestWrapper editMode />);
        await openLoadedTimestampingTab(page);

        // The loaded default is the only allowed entry; adding a second one keeps it a member.
        await page.locator('#policyIdInput').fill(ADDED_POLICY_ID);
        await page.getByRole('button', { name: 'Add', exact: true }).click();
        await expect(page.getByTestId('progress-button')).toBeEnabled();

        // Removing the default from the list breaks the constraint, so Update must go back to
        // disabled — and must say why, rather than silently staying dead.
        await page.getByRole('button', { name: `Remove ${EXISTING_POLICY_ID}` }).click();

        await expect(page.getByText('Default policy ID must be among the allowed policy IDs')).toBeVisible();
        await expect(page.getByTestId('progress-button')).toBeDisabled();
    });

    test('Emptying the allowed list lifts the default-policy-ID constraint', async ({ mount, page }) => {
        await mount(<SigningProfileFormTestWrapper editMode />);
        await openLoadedTimestampingTab(page);

        // An empty allowed list accepts every policy ID, so the backend rule does not apply.
        await page.getByRole('button', { name: `Remove ${EXISTING_POLICY_ID}` }).click();

        await expect(page.getByText('Default policy ID must be among the allowed policy IDs')).toHaveCount(0);
        await expect(page.getByTestId('progress-button')).toBeEnabled();
    });

    test('A malformed OID is rejected instead of being added and dirtying the form', async ({ mount, page }) => {
        await mount(<SigningProfileFormTestWrapper editMode />);
        await openLoadedTimestampingTab(page);

        await page.locator('#policyIdInput').fill('not-an-oid');
        await page.getByRole('button', { name: 'Add', exact: true }).click();

        await expect(page.getByText('Must be a dot-separated numeric OID (e.g. 1.2.840.113549.1.1.11)')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Remove not-an-oid' })).toHaveCount(0);
        await expect(page.getByTestId('progress-button')).toBeDisabled();
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
        await toggleSwitch(page, 'qualifiedTimestamp', true);
        await expect(page.getByTestId('label-timeQualityConfigurationUuid')).toContainText('*');
    });

    test('Retention (days) label shows the required asterisk when the field is shown', async ({ mount, page }) => {
        await mount(<SigningProfileFormTestWrapper />);
        await page.getByRole('tab', { name: TAB_RECORD_POLICY }).click();
        await toggleSwitch(page, 'recordingEnabled', true);
        await toggleSwitch(page, 'retentionIndefinite', false);
        await expect(page.getByTestId('label-retentionDays')).toContainText('*');
    });
});
