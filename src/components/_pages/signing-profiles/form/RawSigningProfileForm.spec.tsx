import type { Page } from '@playwright/test';
import { test, expect } from 'playwright/ct-test';
import { type SigningProfileRequestDto, SigningWorkflowType } from 'types/openapi';
import { ContentSigningProfileFormTestWrapper } from './ContentSigningProfileFormTestWrapper';
import { core, DOCUMENT_SIGNING_EKU, rawSigningProfile } from './contentSigningFormFixtures';
import { rawIlmNativeProfile, rawProfileWithoutPurpose } from './rawSigningFormFixtures';
import {
    addExtendedKeyUsage,
    choose,
    chooseWorkflow,
    editDescription,
    lastWorkflow,
    requests,
    TAB_CONTENT_SIGNING,
    TAB_GENERAL,
    TAB_RAW_SIGNING,
    TAB_SIGNING_SCHEME,
    toggleSwitch,
} from './signingProfileFormTestHelpers';

const SIGNATURE_ALGORITHM_NOTE =
    "Integrators submit digests through the ILM Native API. The signature algorithm, and with it the digest algorithm each request must name, follows the certificate's key and the Signing Operation Attributes on the Signing Scheme tab.";

const ILM_NATIVE_WARNING = 'Saving under the Timestamping workflow deactivates ILM Native on this profile.';

const lastCertificateQuery = async (page: Page) => (await requests(page, 'listSigningCertificates')).at(-1);

async function fillRawSigningProfile(page: Page) {
    const nameInput = page.locator('#signingProfileName');
    await nameInput.focus();
    await nameInput.fill('RawSigning');
    await chooseWorkflow(page, 'Raw Signing');
    await page.getByRole('tab', { name: TAB_RAW_SIGNING }).click();
    await toggleSwitch(page, 'requireNonRepudiation', true);
    await addExtendedKeyUsage(page, DOCUMENT_SIGNING_EKU);
    await page.getByRole('tab', { name: TAB_SIGNING_SCHEME }).click();
    await choose(page, 'certificateUuid', 'Qualified Cert (2)');
}

test.describe('SigningProfileForm - raw signing workflow', () => {
    test('offers the certificate purpose and no formatting on the raw-signing tab', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);

        await chooseWorkflow(page, 'Raw Signing');
        await page.getByRole('tab', { name: TAB_RAW_SIGNING }).click();

        await expect(page.locator('label[for="requireNonRepudiation"]').first()).toBeVisible();
        await expect(page.getByTestId('hostname-list-input-requiredExtendedKeyUsageOidInput')).toBeVisible();
        await expect(page.getByText(SIGNATURE_ALGORITHM_NOTE)).toBeVisible();
        await expect(page.getByTestId('select-contentSigningFormattingConnector-trigger')).toHaveCount(0);
        const connectorQueries = (await requests(page, 'listSignatureFormattingConnectors')) as { workflowType: SigningWorkflowType }[];
        expect(connectorQueries.filter((query) => query.workflowType === SigningWorkflowType.RawSigning)).toEqual([]);
    });

    test('creates a raw-signing profile', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        await fillRawSigningProfile(page);

        await page.getByRole('button', { name: 'Create', exact: true }).click();

        await expect
            .poll(() => lastWorkflow(page, 'createSigningProfile'))
            .toEqual({
                type: SigningWorkflowType.RawSigning,
                requireNonRepudiation: true,
                requiredExtendedKeyUsageOids: [DOCUMENT_SIGNING_EKU],
            });
        const created = (await requests(page, 'createSigningProfile')).at(-1) as { signingProfileRequestDto: SigningProfileRequestDto };
        expect(created.signingProfileRequestDto.signingScheme).toMatchObject({ certificateUuid: 'cert-nr' });
        expect(created.signingProfileRequestDto.recordPolicy?.recordSignedDocument).toBe(false);
    });

    test('asks for raw-signing certificates filtered by the certificate purpose', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);

        await chooseWorkflow(page, 'Raw Signing');
        await page.getByRole('tab', { name: TAB_RAW_SIGNING }).click();
        await toggleSwitch(page, 'requireNonRepudiation', true);
        await addExtendedKeyUsage(page, DOCUMENT_SIGNING_EKU);

        await expect
            .poll(() => lastCertificateQuery(page))
            .toEqual({
                workflowType: SigningWorkflowType.RawSigning,
                requireNonRepudiation: true,
                requiredExtendedKeyUsageOids: [DOCUMENT_SIGNING_EKU],
            });
    });

    test('resets the certificate purpose and certificate once the workflow changes from content signing', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        await chooseWorkflow(page, 'Content Signing');
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
        await toggleSwitch(page, 'requireNonRepudiation', true);
        await addExtendedKeyUsage(page, DOCUMENT_SIGNING_EKU);
        await page.getByRole('tab', { name: TAB_SIGNING_SCHEME }).click();
        await choose(page, 'certificateUuid', 'Qualified Cert (2)');
        await page.getByRole('tab', { name: TAB_GENERAL }).click();

        await chooseWorkflow(page, 'Raw Signing');

        await page.getByRole('tab', { name: TAB_RAW_SIGNING }).click();
        await expect(page.locator('#requireNonRepudiation')).not.toBeChecked();
        await expect(page.getByTestId('hostname-list-tags-requiredExtendedKeyUsageOidInput')).toHaveCount(0);
        await page.getByRole('tab', { name: TAB_SIGNING_SCHEME }).click();
        await expect(page.getByTestId('select-certificateUuid-trigger')).toContainText('Select a certificate');
        await expect
            .poll(() => lastCertificateQuery(page))
            .toEqual({ workflowType: SigningWorkflowType.RawSigning, requireNonRepudiation: false, requiredExtendedKeyUsageOids: [] });
    });

    test('edits the certificate purpose of a saved raw-signing profile', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: rawSigningProfile }} />);
        await expect(page.locator('#signingProfileName')).toHaveValue('RawSigning');
        await page.getByRole('tab', { name: TAB_RAW_SIGNING }).click();

        await toggleSwitch(page, 'requireNonRepudiation', false);
        await page.getByRole('button', { name: 'Update', exact: true }).click();

        await expect
            .poll(() => lastWorkflow(page, 'updateSigningProfile'))
            .toEqual({
                type: SigningWorkflowType.RawSigning,
                requireNonRepudiation: false,
                requiredExtendedKeyUsageOids: [DOCUMENT_SIGNING_EKU],
            });
    });

    test('loads a raw-signing profile saved without a certificate purpose', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: rawProfileWithoutPurpose }} />);
        await editDescription(page, 'RawSigning');

        await page.getByRole('tab', { name: TAB_RAW_SIGNING }).click();
        await expect(page.locator('#requireNonRepudiation')).not.toBeChecked();
        await page.getByRole('button', { name: 'Update', exact: true }).click();

        await expect
            .poll(() => lastWorkflow(page, 'updateSigningProfile'))
            .toEqual({ type: SigningWorkflowType.RawSigning, requireNonRepudiation: false, requiredExtendedKeyUsageOids: [] });
    });

    test('refuses an invalid extended key usage OID', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        await chooseWorkflow(page, 'Raw Signing');
        await page.getByRole('tab', { name: TAB_RAW_SIGNING }).click();

        await addExtendedKeyUsage(page, '1.50.1');

        await expect(page.getByText('The second arc must be 0 to 39 when the first arc is 0 or 1')).toBeVisible();
        await expect(page.getByTestId('hostname-list-tags-requiredExtendedKeyUsageOidInput')).toHaveCount(0);
        await expect
            .poll(() => lastCertificateQuery(page))
            .toEqual({ workflowType: SigningWorkflowType.RawSigning, requireNonRepudiation: false, requiredExtendedKeyUsageOids: [] });
    });

    test("keeps the operator's values when Core refuses the save", async ({ mount, page }) => {
        const saveRefusal = 'The signing key signs, or has signed, for Signing Profile(s) of another workflow.';
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, saveRefusal }} />);
        await fillRawSigningProfile(page);

        await page.getByRole('button', { name: 'Create', exact: true }).click();

        await expect.poll(async () => (await requests(page, 'createSigningProfile')).length).toBe(1);
        await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeEnabled();
        await expect(page.locator('#signingProfileName')).toHaveValue('RawSigning');
    });

    test('filters the certificates by the saved raw-signing certificate purpose', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: rawSigningProfile }} />);

        await expect
            .poll(() => lastCertificateQuery(page))
            .toEqual({
                workflowType: SigningWorkflowType.RawSigning,
                requireNonRepudiation: true,
                requiredExtendedKeyUsageOids: [DOCUMENT_SIGNING_EKU],
            });
    });
});

test.describe('SigningProfileForm - ILM Native warning', () => {
    test('warns that saving under Timestamping deactivates ILM Native', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: rawIlmNativeProfile }} />);
        await expect(page.locator('#signingProfileName')).toHaveValue('RawSigning');

        await chooseWorkflow(page, 'Timestamping');
        await expect(page.getByText(ILM_NATIVE_WARNING)).toBeVisible();

        await chooseWorkflow(page, 'Raw Signing');
        await expect(page.getByText(ILM_NATIVE_WARNING)).toHaveCount(0);
    });

    test('gives no ILM Native warning when switching to content signing', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: rawIlmNativeProfile }} />);
        await expect(page.locator('#signingProfileName')).toHaveValue('RawSigning');

        await chooseWorkflow(page, 'Content Signing');

        await expect(page.getByRole('radio', { name: 'Content Signing' })).toBeChecked();
        await expect(page.getByText(ILM_NATIVE_WARNING)).toHaveCount(0);
    });

    test('gives no ILM Native warning for a profile without it', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: rawSigningProfile }} />);
        await expect(page.locator('#signingProfileName')).toHaveValue('RawSigning');

        await chooseWorkflow(page, 'Timestamping');

        await expect(page.getByRole('radio', { name: 'Timestamping' })).toBeChecked();
        await expect(page.getByText(ILM_NATIVE_WARNING)).toHaveCount(0);
    });
});
