import { test, expect } from 'playwright/ct-test';
import type { Page } from '@playwright/test';
import { SignatureLevel, SigningWorkflowType, TimestampSourceType } from 'types/openapi';
import { ContentSigningProfileFormTestWrapper, type RecordedRequest } from './ContentSigningProfileFormTestWrapper';
import {
    core,
    DOCUMENT_SIGNING_EKU,
    profileWithRetiredSource,
    profileWithUnlistedSource,
    profileWithUnreadableSource,
    rawSigningProfile,
    requestValue,
    SAVED_REQUEST_ATTRIBUTES,
    savedProfile,
} from './contentSigningFormFixtures';

const TAB_CONTENT_SIGNING = '2 · Content Signing Properties';
const TAB_SIGNING_SCHEME = '3 · Signing Scheme';
const TAB_RECORD_POLICY = '4 · Record Policy';

async function requests(page: Page, type: string): Promise<unknown[]> {
    const recorded: RecordedRequest[] = JSON.parse((await page.getByTestId('requests').textContent()) ?? '[]');
    return recorded.filter((request) => request.type === type).map((request) => request.payload);
}

async function chooseWorkflow(page: Page, label: string) {
    await page.getByRole('radio', { name: label }).check();
}

async function choose(page: Page, selectId: string, option: string) {
    await page.getByTestId(`select-${selectId}-trigger`).click();
    await page.getByRole('option', { name: option, exact: true }).click();
}

// Switch renders its checkbox as `sr-only`, so its label is the hit target.
async function toggleSwitch(page: Page, id: string, expected: boolean) {
    await page.locator(`label[for="${id}"]`).first().click();
    await expect(page.locator(`#${id}`)).toBeChecked({ checked: expected });
}

async function chooseFormatting(page: Page, level: string) {
    await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
    await choose(page, 'contentSigningFormattingConnector', 'PAdES Connector');
    await choose(page, 'signatureFamily', 'PAdES');
    await choose(page, 'signatureLevel', level);
}

async function lastWorkflow(page: Page, type: 'createSigningProfile' | 'updateSigningProfile') {
    return ((await requests(page, type)).at(-1) as any)?.signingProfileRequestDto?.workflow;
}

async function editDescription(page: Page, name = 'DocumentSigning') {
    await expect(page.locator('#signingProfileName')).toHaveValue(name);
    const descriptionInput = page.locator('#description');
    await descriptionInput.focus();
    await descriptionInput.fill('Signs contracts');
}

const savedNames = (workflow: { signatureFormattingConnectorAttributes: { name: string }[] }) =>
    workflow.signatureFormattingConnectorAttributes.map((attribute) => attribute.name);

async function requireDocumentSigningPurpose(page: Page) {
    await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
    await toggleSwitch(page, 'requireNonRepudiation', true);
    await page.getByTestId('hostname-list-input-requiredExtendedKeyUsageOidInput').fill(DOCUMENT_SIGNING_EKU);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
}

test.describe('SigningProfileForm - content signing workflow', () => {
    test('offers Content Signing beside Timestamping', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);

        await expect(page.getByRole('radio')).toHaveCount(2);
        await expect(page.getByRole('radio', { name: 'Timestamping' })).toBeEnabled();
        await expect(page.getByRole('radio', { name: 'Content Signing' })).toBeEnabled();
    });

    test('asks for the connectors and certificates of the chosen workflow', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);

        await chooseWorkflow(page, 'Content Signing');
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
        await page.getByTestId('select-contentSigningFormattingConnector-trigger').click();

        await expect(page.getByRole('option')).toHaveText(['PAdES Connector', 'CAdES Connector']);
        await expect
            .poll(() => requests(page, 'listSignatureFormattingConnectors'))
            .toEqual([{ workflowType: SigningWorkflowType.Timestamping }, { workflowType: SigningWorkflowType.ContentSigning }]);
        await expect
            .poll(async () => (await requests(page, 'listSigningCertificates')).at(-1))
            .toEqual({ workflowType: SigningWorkflowType.ContentSigning, requireNonRepudiation: false, requiredExtendedKeyUsageOids: [] });
    });

    test('asks again for the certificates when a certificate-purpose knob changes', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        await chooseWorkflow(page, 'Content Signing');

        await requireDocumentSigningPurpose(page);

        await expect
            .poll(async () => (await requests(page, 'listSigningCertificates')).at(-1))
            .toEqual({
                workflowType: SigningWorkflowType.ContentSigning,
                requireNonRepudiation: true,
                requiredExtendedKeyUsageOids: [DOCUMENT_SIGNING_EKU],
            });
        await page.getByRole('tab', { name: TAB_SIGNING_SCHEME }).click();
        await page.getByTestId('select-certificateUuid-trigger').click();
        await expect(page.getByRole('option')).toHaveText(['Qualified Cert (2)']);
    });

    test('asks again for the certificates when only non-repudiation changes', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        await chooseWorkflow(page, 'Content Signing');
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();

        await toggleSwitch(page, 'requireNonRepudiation', true);

        await expect
            .poll(async () => (await requests(page, 'listSigningCertificates')).at(-1))
            .toEqual({ workflowType: SigningWorkflowType.ContentSigning, requireNonRepudiation: true, requiredExtendedKeyUsageOids: [] });
    });

    test('clears the connector and the certificate when the workflow changes', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        await chooseWorkflow(page, 'Content Signing');
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
        await choose(page, 'contentSigningFormattingConnector', 'PAdES Connector');
        await page.getByRole('tab', { name: TAB_SIGNING_SCHEME }).click();
        await choose(page, 'certificateUuid', 'Plain Cert (1)');

        await page.getByRole('tab', { name: '1 · General' }).click();
        await chooseWorkflow(page, 'Timestamping');
        await chooseWorkflow(page, 'Content Signing');

        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
        await expect(page.getByTestId('select-contentSigningFormattingConnector-trigger')).not.toContainText('PAdES Connector');
        await page.getByRole('tab', { name: TAB_SIGNING_SCHEME }).click();
        await expect(page.getByTestId('select-certificateUuid-trigger')).not.toContainText('Plain Cert (1)');
    });

    test('keeps a selected certificate the knobs filter out and names it', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        await chooseWorkflow(page, 'Content Signing');
        await page.getByRole('tab', { name: TAB_SIGNING_SCHEME }).click();
        await choose(page, 'certificateUuid', 'Plain Cert (1)');

        await requireDocumentSigningPurpose(page);
        await page.getByRole('tab', { name: TAB_SIGNING_SCHEME }).click();

        await expect(page.getByTestId('select-certificateUuid-trigger')).toContainText('Plain Cert (1)');
        await expect(page.getByText('Plain Cert (1) is not among the certificates this profile admits.')).toBeVisible();
    });

    test('names no unadmitted certificate when the certificates cannot be listed', async ({ mount, page }) => {
        await mount(
            <ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: savedProfile, certificatesRefusal: 'Core is down' }} />,
        );
        await editDescription(page);

        await page.getByRole('tab', { name: TAB_SIGNING_SCHEME }).click();
        await expect(page.getByText(/is not among the certificates/)).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Update', exact: true })).toBeEnabled();
    });

    test('says why the certificates could not be listed', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, certificatesRefusal: 'Core is down' }} />);
        await chooseWorkflow(page, 'Content Signing');

        await page.getByRole('tab', { name: TAB_SIGNING_SCHEME }).click();
        await expect(page.getByText('The signing certificates could not be listed. Core is down')).toBeVisible();
    });

    test('asks for the profile attributes of the chosen level and offers them', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        await chooseWorkflow(page, 'Content Signing');

        await chooseFormatting(page, 'PAdES-B');

        await expect
            .poll(async () => (await requests(page, 'listContentSigningProfileAttributes')).at(-1))
            .toEqual({ connectorUuid: 'c-pades', family: 'pades', level: SignatureLevel.Signed });
        await expect(page.getByLabel('Signing Reason')).toBeVisible();
    });

    test('says why the profile attributes could not be listed', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, profileAttributesRefusal: 'connector unavailable' }} />);
        await chooseWorkflow(page, 'Content Signing');

        await chooseFormatting(page, 'PAdES-B');

        await expect(page.getByText('Failed to list the profile attributes: connector unavailable')).toBeVisible();
    });

    test('asks for a timestamp source only above the SIGNED level', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        await chooseWorkflow(page, 'Content Signing');

        await chooseFormatting(page, 'PAdES-B');
        await expect(page.getByTestId('select-timestampSource-trigger')).toHaveCount(0);

        await choose(page, 'signatureLevel', 'PAdES-B-T');
        await page.getByTestId('select-timestampSource-trigger').click();
        await expect(page.getByRole('option')).toHaveText(['Durable TSA', 'Paused TSA (disabled)', 'DocumentSigning']);
        await expect(page.getByText('Hidden TSA could not be read, so it is not offered.')).toBeVisible();
    });

    test('offers no profile as its own timestamp source', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: savedProfile }} />);
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
        await expect(page.getByTestId('select-timestampSource-trigger')).toContainText('Durable TSA');

        await page.getByTestId('select-timestampSource-trigger').click();

        await expect(page.getByRole('option')).toHaveText(['Durable TSA', 'Paused TSA (disabled)']);
    });

    test('keeps Create disabled until a level that embeds a timestamp has a source', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        const nameInput = page.locator('#signingProfileName');
        await nameInput.focus();
        await nameInput.fill('DocumentSigning');
        await chooseWorkflow(page, 'Content Signing');
        await chooseFormatting(page, 'PAdES-B-T');
        await page.getByRole('tab', { name: TAB_SIGNING_SCHEME }).click();
        await choose(page, 'certificateUuid', 'Plain Cert (1)');

        await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeDisabled();

        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
        await choose(page, 'timestampSource', 'Durable TSA');
        await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeEnabled();
    });

    test('creates a content-signing profile', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        const nameInput = page.locator('#signingProfileName');
        await nameInput.focus();
        await nameInput.fill('DocumentSigning');
        await chooseWorkflow(page, 'Content Signing');
        await chooseFormatting(page, 'PAdES-B-T');
        await choose(page, 'timestampSource', 'Durable TSA');
        await page.getByLabel('Signing Reason').focus();
        await page.getByLabel('Signing Reason').fill('Contract');
        await page.getByRole('tab', { name: TAB_SIGNING_SCHEME }).click();
        await choose(page, 'certificateUuid', 'Plain Cert (1)');

        await page.getByRole('button', { name: 'Create', exact: true }).click();

        await expect
            .poll(async () => ((await requests(page, 'createSigningProfile')).at(-1) as any)?.signingProfileRequestDto?.workflow)
            .toEqual({
                type: SigningWorkflowType.ContentSigning,
                signatureFormattingConnectorUuid: 'c-pades',
                signatureFormattingConnectorAttributes: [
                    expect.objectContaining({ uuid: 'attr-reason', name: 'reason', content: [{ data: 'Contract' }] }),
                ],
                family: 'pades',
                level: SignatureLevel.Timestamped,
                timestampSource: { signingProfileUuid: 'tsa-1', type: TimestampSourceType.Internal },
                requireNonRepudiation: false,
                requiredExtendedKeyUsageOids: [],
            });
    });

    test('creates a content-signing profile that records the raw signature and the data to be signed', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        const nameInput = page.locator('#signingProfileName');
        await nameInput.focus();
        await nameInput.fill('DocumentSigning');
        await chooseWorkflow(page, 'Content Signing');
        await chooseFormatting(page, 'PAdES-B');
        await page.getByRole('tab', { name: TAB_SIGNING_SCHEME }).click();
        await choose(page, 'certificateUuid', 'Plain Cert (1)');
        await page.getByRole('tab', { name: TAB_RECORD_POLICY }).click();
        await toggleSwitch(page, 'recordingEnabled', true);
        await toggleSwitch(page, 'recordSignature', true);
        await toggleSwitch(page, 'recordDtbs', true);

        await page.getByRole('button', { name: 'Create', exact: true }).click();

        await expect
            .poll(async () => ((await requests(page, 'createSigningProfile')).at(-1) as any)?.signingProfileRequestDto?.recordPolicy)
            .toMatchObject({ recordingEnabled: true, recordRequestMetadata: false, recordSignature: true, recordDtbs: true });
    });

    test('sends no timestamp source at the SIGNED level', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        const nameInput = page.locator('#signingProfileName');
        await nameInput.focus();
        await nameInput.fill('DocumentSigning');
        await chooseWorkflow(page, 'Content Signing');
        await chooseFormatting(page, 'PAdES-B-T');
        await choose(page, 'timestampSource', 'Durable TSA');
        await choose(page, 'signatureLevel', 'PAdES-B');
        await page.getByRole('tab', { name: TAB_SIGNING_SCHEME }).click();
        await choose(page, 'certificateUuid', 'Plain Cert (1)');

        await page.getByRole('button', { name: 'Create', exact: true }).click();

        await expect
            .poll(async () => ((await requests(page, 'createSigningProfile')).at(-1) as any)?.signingProfileRequestDto?.workflow)
            .toMatchObject({ level: SignatureLevel.Signed });
        const workflow = ((await requests(page, 'createSigningProfile')).at(-1) as any).signingProfileRequestDto.workflow;
        expect(workflow).not.toHaveProperty('timestampSource');
    });

    test('loads a saved content-signing profile for editing', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: savedProfile }} />);
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();

        await expect(page.getByTestId('select-contentSigningFormattingConnector-trigger')).toContainText('PAdES Connector');
        await expect(page.getByTestId('select-signatureFamily-trigger')).toContainText('PAdES');
        await expect(page.getByTestId('select-signatureLevel-trigger')).toContainText('PAdES-B-T');
        await expect(page.getByTestId('select-timestampSource-trigger')).toContainText('Durable TSA');
        await expect(page.locator('#requireNonRepudiation')).toBeChecked();
        await expect(page.getByRole('button', { name: `Remove ${DOCUMENT_SIGNING_EKU}` })).toBeVisible();
        await expect(page.getByLabel('Signing Reason')).toHaveValue('Contract');
        await page.getByRole('tab', { name: TAB_SIGNING_SCHEME }).click();
        await expect(page.getByTestId('select-certificateUuid-trigger')).toContainText('Qualified Cert (2)');
    });

    test('keeps the saved request attributes while the formatting is unchanged', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: savedProfile }} />);
        await editDescription(page);

        await page.getByRole('button', { name: 'Update', exact: true }).click();

        await expect
            .poll(() => lastWorkflow(page, 'updateSigningProfile'))
            .toMatchObject({
                type: SigningWorkflowType.ContentSigning,
                signatureFormattingConnectorUuid: 'c-pades',
                family: 'pades',
                level: SignatureLevel.Timestamped,
                timestampSource: { signingProfileUuid: 'tsa-1', type: TimestampSourceType.Internal },
                requireNonRepudiation: true,
                requiredExtendedKeyUsageOids: [DOCUMENT_SIGNING_EKU],
                allowedRequestAttributes: SAVED_REQUEST_ATTRIBUTES,
            });
        const workflow = await lastWorkflow(page, 'updateSigningProfile');
        expect(savedNames(workflow)).toEqual(['reason', 'stamp-page', 'timestamp-policy']);
        expect(workflow.signatureFormattingConnectorAttributes).toEqual(
            expect.arrayContaining([
                requestValue('attr-stamp-page', 'stamp-page', 'last'),
                requestValue('attr-timestamp-policy', 'timestamp-policy', '1.2.3.4'),
            ]),
        );
    });

    test('keeps the saved request attributes the new level still declares', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: savedProfile }} />);
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
        await expect(page.getByTestId('select-signatureLevel-trigger')).toContainText('PAdES-B-T');

        await choose(page, 'signatureLevel', 'PAdES-B');
        await page.getByRole('button', { name: 'Update', exact: true }).click();

        await expect
            .poll(() => lastWorkflow(page, 'updateSigningProfile'))
            .toMatchObject({ level: SignatureLevel.Signed, allowedRequestAttributes: ['signature-appearance'] });
        const workflow = await lastWorkflow(page, 'updateSigningProfile');
        expect(savedNames(workflow)).toEqual(['reason', 'stamp-page']);
        expect(workflow.signatureFormattingConnectorAttributes).toContainEqual(requestValue('attr-stamp-page', 'stamp-page', 'last'));
    });

    test('carries nothing saved over to another connector', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: savedProfile }} />);
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
        await expect(page.getByLabel('Signing Reason')).toHaveValue('Contract');

        await choose(page, 'contentSigningFormattingConnector', 'CAdES Connector');
        await choose(page, 'signatureFamily', 'PAdES');
        await choose(page, 'signatureLevel', 'PAdES-B-T');

        await expect(page.getByLabel('Signing Reason')).toHaveValue('');
        await page.getByRole('button', { name: 'Update', exact: true }).click();
        await expect.poll(() => lastWorkflow(page, 'updateSigningProfile')).toMatchObject({ signatureFormattingConnectorUuid: 'c-cades' });
        const workflow = await lastWorkflow(page, 'updateSigningProfile');
        expect(workflow).not.toHaveProperty('allowedRequestAttributes');
        expect(savedNames(workflow)).toEqual([]);
    });

    test('keeps Update disabled while the formatting attributes are pending', async ({ mount, page }) => {
        await mount(
            <ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: savedProfile, profileAttributesPending: true }} />,
        );
        await editDescription(page);

        await expect(page.getByRole('button', { name: 'Update', exact: true })).toBeDisabled();
    });

    test('keeps Update disabled when the formatting attributes cannot be listed', async ({ mount, page }) => {
        await mount(
            <ContentSigningProfileFormTestWrapper
                core={{ ...core, editedProfile: savedProfile, profileAttributesRefusal: 'connector unavailable' }}
            />,
        );
        await editDescription(page);

        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
        await expect(page.getByText('Failed to list the profile attributes: connector unavailable')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Update', exact: true })).toBeDisabled();
    });

    test('offers a declared level Core cannot execute and keeps Update disabled on its refusal', async ({ mount, page }) => {
        const refusal = 'Signature level LONG_TERM is not available yet; the highest level this version supports is TIMESTAMPED';
        await mount(
            <ContentSigningProfileFormTestWrapper
                core={{ ...core, editedProfile: savedProfile, profileAttributeRefusalsByLevel: { [SignatureLevel.LongTerm]: refusal } }}
            />,
        );
        await editDescription(page);
        await expect(page.getByRole('button', { name: 'Update', exact: true })).toBeEnabled();

        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
        await choose(page, 'signatureLevel', 'PAdES-B-LT');

        await expect(page.getByText(`Failed to list the profile attributes: ${refusal}`)).toBeVisible();
        await expect(page.getByRole('button', { name: 'Update', exact: true })).toBeDisabled();
    });

    test('names a saved timestamp source that could not be read', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: profileWithUnreadableSource }} />);
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();

        await expect(page.getByTestId('select-timestampSource-trigger')).toContainText('Hidden TSA');
        await expect(
            page.getByText('Hidden TSA could not be read to check it still meets the requirements for a timestamp source.'),
        ).toBeVisible();
        await expect(page.getByText('Hidden TSA could not be read, so it is not offered.')).toHaveCount(0);
    });

    test('names a saved timestamp source that no longer meets the requirements and keeps Update disabled', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: profileWithRetiredSource }} />);
        await editDescription(page);
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();

        await expect(page.getByTestId('select-timestampSource-trigger')).toContainText('Retired TSA');
        await expect(page.getByText('Retired TSA no longer meets the requirements for a timestamp source.').first()).toBeVisible();
        await expect(page.getByRole('button', { name: 'Update', exact: true })).toBeDisabled();
    });

    test('leaves a saved timestamp source this account cannot list for Core to judge', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: profileWithUnlistedSource }} />);
        await editDescription(page);
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();

        await expect(page.getByTestId('select-timestampSource-trigger')).toContainText('Unlisted TSA');
        await expect(page.getByText('Unlisted TSA is not among the timestamping profiles this account can list.')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Update', exact: true })).toBeEnabled();
    });

    test('keeps the saved raw-signing workflow on update', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: rawSigningProfile }} />);
        await editDescription(page, 'RawSigning');

        await page.getByRole('button', { name: 'Update', exact: true }).click();

        await expect
            .poll(() => lastWorkflow(page, 'updateSigningProfile'))
            .toEqual({
                type: SigningWorkflowType.RawSigning,
                requireNonRepudiation: true,
                requiredExtendedKeyUsageOids: [DOCUMENT_SIGNING_EKU],
            });
    });
});
