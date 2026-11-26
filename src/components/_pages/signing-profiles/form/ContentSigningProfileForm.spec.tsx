import { test, expect } from 'playwright/ct-test';
import type { Page } from '@playwright/test';
import { AttributeContentType, AttributeVersion, SignatureLevel, SigningWorkflowType, TimestampSourceType } from 'types/openapi';
import { ContentSigningProfileFormTestWrapper, type RecordedRequest } from './ContentSigningProfileFormTestWrapper';
import {
    core,
    coreWithDefaultStampPage,
    coreWithMixedAppearanceGroup,
    coreWithRequiredStampPage,
    coreWithStampImage,
    DOCUMENT_SIGNING_EKU,
    invoiceSigningProfile,
    packagingAttribute,
    profileWithSavedPackaging,
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

const allowedSwitch = (permissionName: string) => `allowedRequestAttribute-${permissionName}`;

async function chooseFormatting(page: Page, level: string) {
    await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
    await choose(page, 'contentSigningFormattingConnector', 'PAdES Connector');
    await choose(page, 'signatureFamily', 'PAdES');
    await choose(page, 'signatureLevel', level);
}

const groupToggle = (page: Page, title: string) => page.getByRole('button', { name: title, exact: true });

async function showGroup(page: Page, title: string) {
    await expect(groupToggle(page, title)).toHaveAttribute('aria-expanded', 'false');
    await groupToggle(page, title).click();
}

const NOTHING_ALLOWED = 'Signing requests under this profile can set no request attribute.';

// A text input stays read-only until it has focus.
async function typeInto(page: Page, label: string, value: string) {
    const input = page.getByLabel(label, { exact: true });
    await input.click();
    await input.fill(value);
}

async function startPadesProfile(page: Page, mount: (component: JSX.Element) => Promise<unknown>, answers = core) {
    await mount(<ContentSigningProfileFormTestWrapper core={answers} />);
    const nameInput = page.locator('#signingProfileName');
    await nameInput.focus();
    await nameInput.fill('DocumentSigning');
    await chooseWorkflow(page, 'Content Signing');
    await page.getByRole('tab', { name: TAB_SIGNING_SCHEME }).click();
    await choose(page, 'certificateUuid', 'Plain Cert (1)');
    await chooseFormatting(page, 'PAdES-B-T');
    await choose(page, 'timestampSource', 'Durable TSA');
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
        await showGroup(page, 'Profile settings');
        await expect(page.getByLabel('Signing Reason')).toBeVisible();
    });

    test('says why the profile attributes could not be listed', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, profileAttributesRefusal: 'connector unavailable' }} />);
        await chooseWorkflow(page, 'Content Signing');

        await chooseFormatting(page, 'PAdES-B');

        await expect(page.getByText('Failed to list the formatting connector attributes: connector unavailable')).toBeVisible();
    });

    test('sections the request attributes by group with a toggle per group and per ungrouped request attribute', async ({
        mount,
        page,
    }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        await chooseWorkflow(page, 'Content Signing');

        await chooseFormatting(page, 'PAdES-B-T');

        await expect(page.getByText('Signature appearance', { exact: true })).toBeVisible();
        await showGroup(page, 'Signature appearance');
        await expect(page.getByLabel('stamp-page', { exact: true })).toBeVisible();
        await showGroup(page, 'Request attributes');
        await expect(page.getByLabel('timestamp-policy', { exact: true })).toBeVisible();
        await expect(page.locator(`#${allowedSwitch('signature_appearance')}`)).not.toBeChecked();
        await expect(page.locator(`#${allowedSwitch('timestamp-policy')}`)).not.toBeChecked();
        await expect(page.locator(`#${allowedSwitch('stamp-page')}`)).toHaveCount(0);
        await expect(page.locator(`#${allowedSwitch('reason')}`)).toHaveCount(0);
    });

    test('gathers the profile attributes without a group in a pane that requests cannot set', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        await chooseWorkflow(page, 'Content Signing');
        await chooseFormatting(page, 'PAdES-B-T');

        await showGroup(page, 'Profile settings');

        const pane = page.getByTestId('attribute-group-__profile__');
        await expect(pane).toContainText('Request cannot set');
        await expect(pane.getByLabel('Signing Reason')).toBeVisible();
        await expect(pane.getByLabel('timestamp-policy', { exact: true })).toHaveCount(0);
    });

    test('gathers the request attributes without a group in a titled pane, each with its own switch', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        await chooseWorkflow(page, 'Content Signing');
        await chooseFormatting(page, 'PAdES-B-T');

        await showGroup(page, 'Request attributes');

        const pane = page.getByTestId('attribute-group-__request__');
        await expect(pane).not.toContainText('Request cannot set');
        await expect(pane.getByLabel('timestamp-policy', { exact: true })).toBeVisible();
        await expect(pane.getByRole('checkbox', { name: 'Request may set timestamp-policy' })).toBeVisible();
        await expect(pane.getByLabel('stamp-page', { exact: true })).toHaveCount(0);
    });

    test('names in a folded summary the request attributes without a group that requests may set', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        await chooseWorkflow(page, 'Content Signing');
        await chooseFormatting(page, 'PAdES-B-T');
        const summary = page.getByTestId('attribute-group-summary-__request__');
        await expect(summary).toHaveText('Nothing set · Requests may set none');

        await showGroup(page, 'Request attributes');
        await toggleSwitch(page, allowedSwitch('timestamp-policy'), true);
        await groupToggle(page, 'Request attributes').click();

        await expect(summary).toHaveText('Nothing set · Requests may set: timestamp-policy');
    });

    test('folds a request-attribute group that holds no value to a summary line', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        await chooseWorkflow(page, 'Content Signing');

        await chooseFormatting(page, 'PAdES-B-T');

        await expect(groupToggle(page, 'Signature appearance')).toHaveAttribute('aria-expanded', 'false');
        await expect(page.getByTestId('attribute-group-summary-signature_appearance')).toHaveText('Nothing set');
        await expect(page.getByLabel('stamp-page', { exact: true })).toBeHidden();
    });

    test('shows a folded group on demand', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        await chooseWorkflow(page, 'Content Signing');
        await chooseFormatting(page, 'PAdES-B-T');

        await showGroup(page, 'Signature appearance');

        await expect(groupToggle(page, 'Signature appearance')).toHaveAttribute('aria-expanded', 'true');
        await expect(page.getByLabel('stamp-page', { exact: true })).toBeVisible();
        await expect(page.getByTestId('attribute-group-summary-signature_appearance')).toHaveCount(0);
    });

    test('opens a group that holds a saved value', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: savedProfile }} />);
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();

        await expect(page.getByLabel('stamp-page', { exact: true })).toHaveValue('last');
    });

    test('opens a group that holds a required attribute', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={coreWithRequiredStampPage} />);
        await chooseWorkflow(page, 'Content Signing');

        await chooseFormatting(page, 'PAdES-B-T');

        await expect(page.getByLabel('stamp-page')).toBeVisible();
    });

    test('names the values of a folded group in its summary and saves them', async ({ mount, page }) => {
        await startPadesProfile(page, mount);
        await showGroup(page, 'Signature appearance');
        await typeInto(page, 'stamp-page', 'first');

        await groupToggle(page, 'Signature appearance').click();

        await expect(page.getByTestId('attribute-group-summary-signature_appearance')).toHaveText('Set: stamp-page');
        await page.getByRole('button', { name: 'Create', exact: true }).click();
        await expect.poll(() => lastWorkflow(page, 'createSigningProfile')).toBeDefined();
        const workflow = await lastWorkflow(page, 'createSigningProfile');
        expect(workflow.signatureFormattingConnectorAttributes).toContainEqual(
            expect.objectContaining({ name: 'stamp-page', content: [{ data: 'first' }] }),
        );
    });

    test("gives a group's profile attributes a pane after the group, apart from its switch", async ({ mount, page }) => {
        await startPadesProfile(page, mount, coreWithMixedAppearanceGroup);

        await toggleSwitch(page, allowedSwitch('signature_appearance'), true);
        await showGroup(page, 'Signature appearance (profile only)');
        await typeInto(page, 'stamp-font', 'Helvetica');

        await expect(page.locator('[data-testid^="attribute-group-toggle-"]')).toHaveText([
            'Profile settings',
            'Signature appearance',
            'Signature appearance (profile only)',
            'Request attributes',
        ]);
        await expect(page.getByTestId('attribute-group-__profile__:signature_appearance')).not.toContainText('Request may set');
        await page.getByRole('button', { name: 'Create', exact: true }).click();
        await expect.poll(() => lastWorkflow(page, 'createSigningProfile')).toBeDefined();
        const workflow = await lastWorkflow(page, 'createSigningProfile');
        expect(workflow.allowedRequestAttributes).toEqual(['signature_appearance']);
        expect(workflow.signatureFormattingConnectorAttributes).toContainEqual(
            expect.objectContaining({ name: 'stamp-font', content: [{ data: 'Helvetica' }] }),
        );
    });

    test('lets requests be allowed to set a folded group', async ({ mount, page }) => {
        await startPadesProfile(page, mount);

        await toggleSwitch(page, allowedSwitch('signature_appearance'), true);

        await expect(page.getByLabel('stamp-page', { exact: true })).toBeHidden();
        await page.getByRole('button', { name: 'Create', exact: true }).click();
        await expect
            .poll(() => lastWorkflow(page, 'createSigningProfile'))
            .toMatchObject({ allowedRequestAttributes: ['signature_appearance'] });
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

    test('lists the timestamp sources only for a level that embeds a timestamp', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        await chooseWorkflow(page, 'Content Signing');

        await chooseFormatting(page, 'PAdES-B');
        await expect.poll(() => requests(page, 'listSignatureFormattingConnectors')).not.toHaveLength(0);
        expect(await requests(page, 'listTimestampSourceCandidates')).toHaveLength(0);

        await choose(page, 'signatureLevel', 'PAdES-B-T');
        await expect.poll(() => requests(page, 'listTimestampSourceCandidates')).toHaveLength(1);
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
        await showGroup(page, 'Profile settings');
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
                allowedRequestAttributes: [],
            });
    });

    test('creates a profile with an uploaded stamp image', async ({ mount, page }) => {
        const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        await mount(<ContentSigningProfileFormTestWrapper core={coreWithStampImage} />);
        const nameInput = page.locator('#signingProfileName');
        await nameInput.focus();
        await nameInput.fill('DocumentSigning');
        await chooseWorkflow(page, 'Content Signing');
        await chooseFormatting(page, 'PAdES-B-T');
        await choose(page, 'timestampSource', 'Durable TSA');
        await showGroup(page, 'Signature appearance');
        await page
            .locator('input[type="file"][id$="stamp-image"]')
            .setInputFiles({ name: 'stamp.png', mimeType: 'image/png', buffer: Buffer.from(pixel, 'base64') });
        await expect(page.getByRole('img', { name: 'stamp-image' })).toBeVisible();
        await page.getByRole('tab', { name: TAB_SIGNING_SCHEME }).click();
        await choose(page, 'certificateUuid', 'Plain Cert (1)');

        await page.getByRole('button', { name: 'Create', exact: true }).click();

        await expect.poll(() => lastWorkflow(page, 'createSigningProfile')).toBeDefined();
        const workflow = await lastWorkflow(page, 'createSigningProfile');
        expect(workflow.signatureFormattingConnectorAttributes).toContainEqual(
            expect.objectContaining({
                name: 'stamp-image',
                version: AttributeVersion.V3,
                contentType: AttributeContentType.File,
                content: [
                    { contentType: AttributeContentType.File, data: { content: pixel, fileName: 'stamp.png', mimeType: 'image/png' } },
                ],
            }),
        );
    });

    test('leaves a file attribute that was visited but left empty out of the profile', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={coreWithStampImage} />);
        const nameInput = page.locator('#signingProfileName');
        await nameInput.focus();
        await nameInput.fill('DocumentSigning');
        await chooseWorkflow(page, 'Content Signing');
        await chooseFormatting(page, 'PAdES-B-T');
        await choose(page, 'timestampSource', 'Durable TSA');
        await showGroup(page, 'Signature appearance');
        await expect(page.getByText('stamp-image')).toBeVisible();
        await showGroup(page, 'Profile settings');
        await typeInto(page, 'Signing Reason', 'Contract');
        const stampImageContent = page.locator('input[id$="stamp-image-content"]');
        await stampImageContent.focus();
        await stampImageContent.blur();
        await page.getByRole('tab', { name: TAB_SIGNING_SCHEME }).click();
        await choose(page, 'certificateUuid', 'Plain Cert (1)');

        await page.getByRole('button', { name: 'Create', exact: true }).click();

        await expect.poll(() => lastWorkflow(page, 'createSigningProfile')).toBeDefined();
        expect(savedNames(await lastWorkflow(page, 'createSigningProfile'))).toEqual(['reason']);
    });

    test('names each allowed-request-attribute switch after what it allows', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        await chooseWorkflow(page, 'Content Signing');
        await chooseFormatting(page, 'PAdES-B-T');
        await showGroup(page, 'Request attributes');

        await expect(page.getByRole('checkbox', { name: 'Request may set Signature appearance' })).toBeVisible();
        await expect(page.getByRole('checkbox', { name: 'Request may set timestamp-policy' })).toBeVisible();
    });

    test('announces that requests may set no request attribute', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        await chooseWorkflow(page, 'Content Signing');
        await chooseFormatting(page, 'PAdES-B-T');
        await showGroup(page, 'Request attributes');
        await toggleSwitch(page, allowedSwitch('timestamp-policy'), true);
        const status = page.getByTestId('allowed-request-attributes-status');
        await expect(status).toHaveRole('status');
        await expect(status).toBeEmpty();

        await toggleSwitch(page, allowedSwitch('timestamp-policy'), false);

        await expect(status).toHaveText(NOTHING_ALLOWED);
    });

    test('says that requests may set no request attribute while none is allowed', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={core} />);
        await chooseWorkflow(page, 'Content Signing');
        await chooseFormatting(page, 'PAdES-B-T');

        await expect(page.getByText(NOTHING_ALLOWED)).toBeVisible();
        await showGroup(page, 'Request attributes');
        await toggleSwitch(page, allowedSwitch('timestamp-policy'), true);
        await expect(page.getByText(NOTHING_ALLOWED)).toHaveCount(0);
    });

    test('creates a profile that allows the toggled request attributes and keeps their typed values', async ({ mount, page }) => {
        await startPadesProfile(page, mount);
        await toggleSwitch(page, allowedSwitch('signature_appearance'), true);
        await showGroup(page, 'Signature appearance');
        await typeInto(page, 'stamp-page', 'first');

        await page.getByRole('button', { name: 'Create', exact: true }).click();

        await expect
            .poll(() => lastWorkflow(page, 'createSigningProfile'))
            .toMatchObject({ allowedRequestAttributes: ['signature_appearance'] });
        const workflow = await lastWorkflow(page, 'createSigningProfile');
        expect(workflow.signatureFormattingConnectorAttributes).toContainEqual(
            expect.objectContaining({ name: 'stamp-page', content: [{ data: 'first' }] }),
        );
    });

    test('keeps a request-attribute value whether or not requests may set it', async ({ mount, page }) => {
        await startPadesProfile(page, mount);
        await showGroup(page, 'Request attributes');
        await typeInto(page, 'timestamp-policy', '1.2.3');
        await toggleSwitch(page, allowedSwitch('timestamp-policy'), true);
        await toggleSwitch(page, allowedSwitch('timestamp-policy'), false);

        await expect(page.getByLabel('timestamp-policy', { exact: true })).toHaveValue('1.2.3');
        await page.getByRole('button', { name: 'Create', exact: true }).click();

        await expect.poll(() => lastWorkflow(page, 'createSigningProfile')).toMatchObject({ allowedRequestAttributes: [] });
        const workflow = await lastWorkflow(page, 'createSigningProfile');
        expect(workflow.signatureFormattingConnectorAttributes).toContainEqual(
            expect.objectContaining({ name: 'timestamp-policy', content: [{ data: '1.2.3' }] }),
        );
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

    test('offers every declared choice of a list attribute with a saved selection', async ({ mount, page }) => {
        const profileAttributesByLevel = { [SignatureLevel.Timestamped]: [packagingAttribute] };
        await mount(
            <ContentSigningProfileFormTestWrapper core={{ ...core, profileAttributesByLevel, editedProfile: profileWithSavedPackaging }} />,
        );
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();

        const packaging = page.getByTestId('select-__attributes__contentSigningProfileAttrs__.packagingSelect-trigger');
        await expect(packaging).toContainText('Enveloped');
        await packaging.click();
        await expect(page.getByRole('option', { name: 'Enveloping' })).toBeVisible();
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
            .toMatchObject({ level: SignatureLevel.Signed, allowedRequestAttributes: ['signature_appearance'] });
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
        await expect(page.locator(`#${allowedSwitch('signature_appearance')}`)).not.toBeChecked();
        await page.getByRole('button', { name: 'Update', exact: true }).click();
        await expect.poll(() => lastWorkflow(page, 'updateSigningProfile')).toMatchObject({ signatureFormattingConnectorUuid: 'c-cades' });
        const workflow = await lastWorkflow(page, 'updateSigningProfile');
        expect(workflow.allowedRequestAttributes).toEqual([]);
        expect(savedNames(workflow)).toEqual([]);
    });

    test('keeps the edits when the level is listed again', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: savedProfile }} />);
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
        await expect(page.getByLabel('Signing Reason')).toHaveValue('Contract');
        await typeInto(page, 'Signing Reason', 'Typed');
        await typeInto(page, 'stamp-page', 'first');
        await toggleSwitch(page, allowedSwitch('timestamp-policy'), false);

        await choose(page, 'signatureLevel', 'PAdES-B');
        await choose(page, 'signatureLevel', 'PAdES-B-T');

        await expect(page.getByLabel('timestamp-policy', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Signing Reason')).toHaveValue('Typed');
        await expect(page.getByLabel('stamp-page', { exact: true })).toHaveValue('first');
        await expect(page.locator(`#${allowedSwitch('signature_appearance')}`)).toBeChecked();
        await expect(page.locator(`#${allowedSwitch('timestamp-policy')}`)).not.toBeChecked();
    });

    test('keeps a list selection when the chosen level is chosen again', async ({ mount, page }) => {
        const profileAttributesByLevel = { [SignatureLevel.Timestamped]: [packagingAttribute] };
        await mount(
            <ContentSigningProfileFormTestWrapper core={{ ...core, profileAttributesByLevel, editedProfile: profileWithSavedPackaging }} />,
        );
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
        const packaging = page.getByTestId('select-__attributes__contentSigningProfileAttrs__.packagingSelect-trigger');
        await expect(packaging).toContainText('Enveloped');
        await packaging.click();
        await page.getByRole('option', { name: 'Enveloping' }).click();

        await choose(page, 'signatureLevel', 'PAdES-B-T');

        await expect(packaging).toContainText('Enveloping');
    });

    test("shows the saved values of a profile opened from another profile's edit page", async ({ mount, page }) => {
        await mount(
            <ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: savedProfile, linkedProfile: invoiceSigningProfile }} />,
        );
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
        await typeInto(page, 'Signing Reason', 'Typed');
        await choose(page, 'signatureLevel', 'PAdES-B');

        await page.getByRole('link', { name: 'Edit InvoiceSigning' }).click();

        await expect(page.locator('#signingProfileName')).toHaveValue('InvoiceSigning');
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
        await expect(page.getByLabel('Signing Reason')).toHaveValue('Invoice');
    });

    test('keeps a cleared field empty when the next level declares a default for it', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={coreWithDefaultStampPage} />);
        await chooseWorkflow(page, 'Content Signing');
        await chooseFormatting(page, 'PAdES-B-T');
        await expect(page.getByLabel('stamp-page', { exact: true })).toHaveValue('first');
        await typeInto(page, 'stamp-page', '');

        await choose(page, 'signatureLevel', 'PAdES-B');

        await expect(page.getByTestId('attribute-group-toggle-signature_appearance')).toBeVisible();
        await expect(page.getByLabel('stamp-page', { exact: true })).toHaveValue('');
    });

    test('keeps the edits the new level still declares and drops the rest', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: savedProfile }} />);
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
        await expect(page.getByLabel('stamp-page', { exact: true })).toHaveValue('last');
        await typeInto(page, 'stamp-page', 'first');
        await typeInto(page, 'timestamp-policy', '9.9');

        await choose(page, 'signatureLevel', 'PAdES-B');
        await expect(page.getByLabel('timestamp-policy', { exact: true })).toHaveCount(0);
        await page.getByRole('button', { name: 'Update', exact: true }).click();

        await expect
            .poll(() => lastWorkflow(page, 'updateSigningProfile'))
            .toMatchObject({ level: SignatureLevel.Signed, allowedRequestAttributes: ['signature_appearance'] });
        const workflow = await lastWorkflow(page, 'updateSigningProfile');
        expect(savedNames(workflow)).toEqual(['reason', 'stamp-page']);
        expect(workflow.signatureFormattingConnectorAttributes).toContainEqual(requestValue('attr-stamp-page', 'stamp-page', 'first'));
    });

    test('keeps the edits across a level whose listing fails', async ({ mount, page }) => {
        const refusal = 'Signature level LONG_TERM is not available yet';
        await mount(
            <ContentSigningProfileFormTestWrapper
                core={{ ...core, editedProfile: savedProfile, profileAttributeRefusalsByLevel: { [SignatureLevel.LongTerm]: refusal } }}
            />,
        );
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
        await expect(page.getByLabel('Signing Reason')).toHaveValue('Contract');
        await typeInto(page, 'Signing Reason', 'Typed');

        await choose(page, 'signatureLevel', 'PAdES-B-LT');
        await expect(page.getByText(`Failed to list the formatting connector attributes: ${refusal}`)).toBeVisible();
        await choose(page, 'signatureLevel', 'PAdES-B-T');

        await expect(page.getByLabel('Signing Reason')).toHaveValue('Typed');
    });

    test('keeps the saved values and allowed names across a level that does not declare them', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: savedProfile }} />);
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
        await expect(page.getByLabel('timestamp-policy', { exact: true })).toHaveValue('1.2.3.4');

        await choose(page, 'signatureLevel', 'PAdES-B');
        await expect(page.getByLabel('timestamp-policy', { exact: true })).toHaveCount(0);
        await choose(page, 'signatureLevel', 'PAdES-B-T');

        await expect(page.getByLabel('timestamp-policy', { exact: true })).toHaveValue('1.2.3.4');
        await expect(page.locator(`#${allowedSwitch('timestamp-policy')}`)).toBeChecked();
        await page.getByRole('button', { name: 'Update', exact: true }).click();
        await expect
            .poll(() => lastWorkflow(page, 'updateSigningProfile'))
            .toMatchObject({ level: SignatureLevel.Timestamped, allowedRequestAttributes: SAVED_REQUEST_ATTRIBUTES });
        const workflow = await lastWorkflow(page, 'updateSigningProfile');
        expect(savedNames(workflow)).toEqual(['reason', 'stamp-page', 'timestamp-policy']);
    });

    test('keeps the saved values when another profile left a listing of another level', async ({ mount, page }) => {
        await mount(
            <ContentSigningProfileFormTestWrapper
                core={{ ...core, editedProfile: savedProfile, cachedListing: { connectorUuid: 'c-pades', level: SignatureLevel.Signed } }}
            />,
        );
        await editDescription(page);

        await page.getByRole('button', { name: 'Update', exact: true }).click();

        await expect
            .poll(async () => savedNames(await lastWorkflow(page, 'updateSigningProfile')))
            .toEqual(['reason', 'stamp-page', 'timestamp-policy']);
    });

    test('keeps the edits when the connector is cleared and chosen again', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: savedProfile }} />);
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
        await expect(page.getByLabel('Signing Reason')).toHaveValue('Contract');
        await typeInto(page, 'Signing Reason', 'Typed');

        await page.getByTestId('select-contentSigningFormattingConnector-clear').click();
        await choose(page, 'contentSigningFormattingConnector', 'PAdES Connector');
        await choose(page, 'signatureFamily', 'PAdES');
        await choose(page, 'signatureLevel', 'PAdES-B-T');

        await expect(page.getByLabel('Signing Reason')).toHaveValue('Typed');
    });

    test('keeps the saved allowed request attributes when the saved connector is cleared and chosen again', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: savedProfile }} />);
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
        await expect(page.locator(`#${allowedSwitch('signature_appearance')}`)).toBeChecked();

        await page.getByTestId('select-contentSigningFormattingConnector-clear').click();
        await choose(page, 'contentSigningFormattingConnector', 'PAdES Connector');
        await choose(page, 'signatureFamily', 'PAdES');
        await choose(page, 'signatureLevel', 'PAdES-B-T');

        await expect(page.locator(`#${allowedSwitch('signature_appearance')}`)).toBeChecked();
        await page.getByRole('button', { name: 'Update', exact: true }).click();
        await expect
            .poll(() => lastWorkflow(page, 'updateSigningProfile'))
            .toMatchObject({ signatureFormattingConnectorUuid: 'c-pades', allowedRequestAttributes: SAVED_REQUEST_ATTRIBUTES });
    });

    test('keeps Update disabled while the formatting attributes are pending', async ({ mount, page }) => {
        await mount(
            <ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: savedProfile, profileAttributesPending: true }} />,
        );
        await editDescription(page);

        await expect(page.getByRole('button', { name: 'Update', exact: true })).toBeDisabled();
    });

    test('keeps Update disabled while the timestamp sources are pending', async ({ mount, page }) => {
        await mount(
            <ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: savedProfile, timestampSourcesPending: true }} />,
        );
        await editDescription(page);
        await expect.poll(() => requests(page, 'listContentSigningProfileAttributes')).not.toHaveLength(0);

        await expect(page.getByRole('button', { name: 'Update', exact: true })).toBeDisabled();
    });

    test('enables Update at a level without a timestamp while the timestamp sources are pending', async ({ mount, page }) => {
        await mount(
            <ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: savedProfile, timestampSourcesPending: true }} />,
        );
        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
        await expect(page.getByTestId('select-signatureLevel-trigger')).toContainText('PAdES-B-T');

        await choose(page, 'signatureLevel', 'PAdES-B');

        await expect(page.getByRole('button', { name: 'Update', exact: true })).toBeEnabled();
    });

    test('keeps Update disabled when the formatting attributes cannot be listed', async ({ mount, page }) => {
        await mount(
            <ContentSigningProfileFormTestWrapper
                core={{ ...core, editedProfile: savedProfile, profileAttributesRefusal: 'connector unavailable' }}
            />,
        );
        await editDescription(page);

        await page.getByRole('tab', { name: TAB_CONTENT_SIGNING }).click();
        await expect(page.getByText('Failed to list the formatting connector attributes: connector unavailable')).toBeVisible();
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

        await expect(page.getByText(`Failed to list the formatting connector attributes: ${refusal}`)).toBeVisible();
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

    test('filters the certificates by the saved raw-signing certificate purpose', async ({ mount, page }) => {
        await mount(<ContentSigningProfileFormTestWrapper core={{ ...core, editedProfile: rawSigningProfile }} />);

        await expect
            .poll(async () => (await requests(page, 'listSigningCertificates')).at(-1))
            .toEqual({
                workflowType: SigningWorkflowType.RawSigning,
                requireNonRepudiation: true,
                requiredExtendedKeyUsageOids: [DOCUMENT_SIGNING_EKU],
            });
    });

    test('ignores a cached profile other than the one being edited', async ({ mount, page }) => {
        await mount(
            <ContentSigningProfileFormTestWrapper
                core={{ ...core, pendingProfileUuid: savedProfile.uuid, cachedProfile: { ...rawSigningProfile, uuid: 'sp-other' } }}
            />,
        );

        await expect(page.getByText('Edit Signing Profile').first()).toBeVisible();
        await expect(page.getByText('RawSigning')).toHaveCount(0);
    });
});
