import type { UnknownAction } from '@reduxjs/toolkit';
import { test, expect, type Locator, type Page } from '../../../../../playwright/ct-test';
import { completeFileRead, holdFileReads } from '../../../../../playwright/fileReads';
import ImportWizardWithStore from 'components/_pages/certificates/ImportWizard/ImportWizardWithStore';
import { actions as certificateActions } from 'ducks/certificates';
import { actions as keyActions } from 'ducks/cryptographic-keys';
import { actions as inspectionActions } from 'ducks/inspections';
import { actions as tokenProfileActions } from 'ducks/token-profiles';
import type { CustomAttributeModel } from 'types/attributes';
import {
    AttributeContentType,
    AttributeType,
    InspectedEntryKind,
    KeyAlgorithm,
    TokenInstanceStatus,
    type BaseAttributeDto,
    type CertificateImportResultDto,
    type InspectedEntryDto,
    type InspectionResponseDto,
    type TokenProfileDto,
} from 'types/openapi';

const FILE = Buffer.from('3082097a020103308209400609', 'hex');
const FILE_BASE64 = FILE.toString('base64');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const keyPair: InspectedEntryDto = {
    entryReference: '61f5ee3d2ea6f8961482a666a63e71c6afe96a541d65325cadb70b44bbb05979',
    kind: InspectedEntryKind.KeyPairWithChain,
    alias: 'web-server-01',
    subjectDn: 'CN=web-server-01.example.com, O=Example',
    keyAlgorithm: KeyAlgorithm.Rsa,
    keyLength: 2048,
    chainLength: 3,
};
const certificate: InspectedEntryDto = {
    entryReference: '7fe5908d05fa46f243c8d33e5b12850f1e467f3cdb0fb15fe20d6642c6bfec4a',
    kind: InspectedEntryKind.Certificate,
    subjectDn: 'CN=intermediate-ca-r4, O=Example',
};
const secretKey: InspectedEntryDto = {
    entryReference: 'd1bede69612fefe6c659294f70bab79b721593a512ecdf7d8b33155f8dcacbe7',
    kind: InspectedEntryKind.SecretKey,
    alias: 'backup-aes',
    keyAlgorithm: KeyAlgorithm.Aes,
    keyLength: 256,
};
const signingRequest: InspectedEntryDto = {
    entryReference: 'bbf4c488e128540fa86e4ba695a9fd99e546cb2f177220ed12c6c76b889a594a',
    kind: InspectedEntryKind.SigningRequest,
    subjectDn: 'CN=pending.example.com, O=Example',
};

function inspection(entries: InspectedEntryDto[]): InspectionResponseDto {
    return { containerDigest: 'c8e0545c4ff3a48e67aa7b2d8638872c741e0c06c6f13be926235c29debadf01', entries };
}

const profile: TokenProfileDto = {
    uuid: '715f07ed-7130-413c-9b0e-aee25c5f2ee2',
    name: 'TLS Server Keys',
    tokenInstanceUuid: '85b789a2-032d-4ecb-a530-2b0cf25a7b8f',
    tokenInstanceName: 'SoftKeyStore Provider',
    tokenInstanceStatus: TokenInstanceStatus.Activated,
    enabled: true,
    usages: [],
};
const PROFILE_OPTION = 'SoftKeyStore Provider / TLS Server Keys';
const hsmProfile: TokenProfileDto = {
    ...profile,
    uuid: 'b4d2c6e8-0f1a-4b3c-9d5e-7f8a9b0c1d2e',
    name: 'Signing Keys',
    tokenInstanceUuid: 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b',
    tokenInstanceName: 'PKCS11 HSM',
};
const HSM_OPTION = 'PKCS11 HSM / Signing Keys';

const keyStoreSlot = {
    uuid: '29323ddc-ee50-4f2b-a7d3-ca1f720dcf00',
    name: 'keyStoreSlot',
    version: 2,
    type: AttributeType.Data,
    contentType: AttributeContentType.String,
    properties: {
        label: 'Key store slot',
        visible: true,
        required: false,
        readOnly: false,
        list: false,
        multiSelect: false,
        extensibleList: false,
    },
} as BaseAttributeDto;

const department = {
    uuid: '9b722a5e-45b1-44df-888e-45e973c22a4a',
    name: 'department',
    type: AttributeType.Custom,
    contentType: AttributeContentType.String,
    properties: { label: 'Department', required: true, readOnly: false, visible: true, list: false, multiSelect: false },
} as CustomAttributeModel;

const ownerTeam = {
    uuid: '4e1f0c6d-2b8a-4f3e-9c7d-5a6b8e0f1d2c',
    name: 'ownerTeam',
    type: AttributeType.Custom,
    contentType: AttributeContentType.String,
    properties: { label: 'Owner team', required: true, readOnly: false, visible: true, list: false, multiSelect: false },
} as CustomAttributeModel;

const ecPrivateKey: InspectedEntryDto = {
    entryReference: '0c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
    kind: InspectedEntryKind.PrivateKey,
    alias: 'signing-ec',
    keyAlgorithm: KeyAlgorithm.Ecdsa,
    keyLength: 256,
};

const CERTIFICATE_UUID = '9f2c3e1a-8b4d-4c6e-a1f7-2d3b5c7e9a10';
const KEY_UUID = '3c5e7a9b-1d2f-4e6a-8b0c-4d6f8a1c3e5b';

const importedKeyPair: CertificateImportResultDto = {
    entryReference: keyPair.entryReference,
    kind: keyPair.kind,
    imported: true,
    certificateUuid: CERTIFICATE_UUID,
    keyUuid: KEY_UUID,
};
const failedKeyPair: CertificateImportResultDto = {
    entryReference: keyPair.entryReference,
    kind: keyPair.kind,
    imported: false,
    message: 'The key could not be stored.',
};
const failedCertificate: CertificateImportResultDto = {
    entryReference: certificate.entryReference,
    kind: certificate.kind,
    imported: false,
    message: 'A certificate of the entry was not uploaded.',
};
const importedCertificate: CertificateImportResultDto = {
    entryReference: certificate.entryReference,
    kind: certificate.kind,
    imported: true,
    certificateUuid: 'ddae8243-3d2d-4721-900e-408064fc2d97',
};

const inspectRequests = (actions: UnknownAction[]) =>
    actions.filter(inspectionActions.inspectFile.match).map((action) => action.payload.inspectionRequestDto);
const importRequests = (actions: UnknownAction[]) =>
    actions.filter(certificateActions.importCertificates.match).map((action) => action.payload.certificateImportRequestDto);
const profileListings = (actions: UnknownAction[]) =>
    actions.filter(tokenProfileActions.listImportableTokenProfiles.match).map((action) => action.payload);

async function chooseFile(page: Page) {
    await page.locator('#importWizard__fileUpload__file').setInputFiles({
        name: 'webserver-bundle.p12',
        mimeType: 'application/x-pkcs12',
        buffer: FILE,
    });
}

/** A text field stays read-only until it is focused, so it is clicked before it is filled. */
async function enterText(field: Locator, value: string) {
    await field.click();
    await field.fill(value);
}

async function chooseProfile(page: Page, option = PROFILE_OPTION) {
    await page.getByTestId('select-importTokenProfile-trigger').click();
    await page.getByRole('option', { name: option }).click();
}

const resultRow = (page: Page, title: string) => page.getByRole('listitem').filter({ hasText: title });

test.describe('ImportWizard', () => {
    test('imports a certificate-only file', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(
            <ImportWizardWithStore
                showCertificateCustomAttributes
                certificateCustomAttributes={[department]}
                inspectAnswers={[{ inspection: inspection([certificate, signingRequest]) }]}
                importAnswers={[{ results: [importedCertificate] }]}
                onAction={(action) => actions.push(action)}
            />,
        );

        await chooseFile(page);

        await expect(page.getByRole('heading', { name: 'Detected content – 2 entries' })).toBeVisible();
        await expect(page.getByText('Certificate · CN=intermediate-ca-r4, O=Example')).toBeVisible();
        await expect(page.getByRole('checkbox', { name: 'intermediate-ca-r4' })).toBeChecked();
        await expect(page.getByRole('checkbox', { name: 'pending.example.com' })).toBeDisabled();
        await expect(page.getByRole('checkbox', { name: 'pending.example.com' })).not.toBeChecked();
        await expect(page.getByRole('heading', { name: 'Key destination' })).toHaveCount(0);

        await enterText(page.getByTestId('text-input-__attributes__customImportCertificate__.department'), 'Platform');
        await page.getByRole('button', { name: 'Import 1 entry' }).click();

        await expect.poll(() => importRequests(actions)).toHaveLength(1);
        const [request] = importRequests(actions);
        expect(request.file).toBe(FILE_BASE64);
        expect(request.entries).toEqual([{ entryReference: certificate.entryReference, importId: expect.stringMatching(UUID) }]);
        expect(request.entries[0].keyDestination).toBeUndefined();
        expect(request.customAttributes).toEqual([
            expect.objectContaining({ name: 'department', content: [expect.objectContaining({ data: 'Platform' })] }),
        ]);
    });

    test('inspects a pasted PEM, and a file chosen after it rather than the paste', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        const pem = '-----BEGIN CERTIFICATE-----\nMIIBszCCAVmgAwIBAgIU\n-----END CERTIFICATE-----';
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[{ inspection: inspection([certificate]) }]}
                importAnswers={[{ results: [importedCertificate] }]}
                onAction={(action) => actions.push(action)}
            />,
        );

        await page.getByLabel('File content').fill(pem);

        await expect.poll(() => inspectRequests(actions)).toEqual([{ file: btoa(pem) }]);
        await expect(page.getByRole('checkbox', { name: 'intermediate-ca-r4' })).toBeChecked();

        await chooseFile(page);
        await page.getByLabel('File content').focus();
        await page.getByLabel('File content').blur();
        await page.getByRole('button', { name: 'Import 1 entry' }).click();

        await expect.poll(() => importRequests(actions)).toHaveLength(1);
        expect(importRequests(actions)[0].file).toBe(FILE_BASE64);
        expect(
            inspectRequests(actions)
                .slice(1)
                .map((request) => request.file),
        ).toEqual(expect.arrayContaining([FILE_BASE64]));
        expect(inspectRequests(actions).slice(1)).not.toContainEqual(expect.objectContaining({ file: btoa(pem) }));
    });

    test('drops the entries of the previous file while a newly chosen one is read', async ({ mount, page }) => {
        await mount(<ImportWizardWithStore inspectAnswers={[{ inspection: inspection([certificate]) }]} />);
        await chooseFile(page);
        await expect(page.getByRole('button', { name: 'Import 1 entry' })).toBeEnabled();
        await holdFileReads(page);

        await chooseFile(page);

        await expect(page.getByRole('heading', { name: /Detected content/ })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Import 0 entries' })).toBeDisabled();

        await completeFileRead(page, 0);

        await expect(page.getByRole('button', { name: 'Import 1 entry' })).toBeEnabled();
    });

    test('asks for no file password before a file is read, nor for a file that is not protected', async ({ mount, page }) => {
        await mount(<ImportWizardWithStore inspectAnswers={[{ inspection: inspection([certificate]) }]} />);

        await expect(page.getByLabel('File password')).toHaveCount(0);

        await chooseFile(page);

        await expect(page.getByRole('checkbox', { name: 'intermediate-ca-r4' })).toBeChecked();
        await expect(page.getByLabel('File password')).toHaveCount(0);
    });

    for (const [when, enterPassword] of [
        ['when the field is left', (field: Locator) => field.blur()],
        ['when Enter is pressed', (field: Locator) => field.press('Enter')],
    ] as const) {
        test(`asks for the password of a file Core refused to read, and reads the file again with it ${when}`, async ({ mount, page }) => {
            const actions: UnknownAction[] = [];
            const refusal =
                "Failed to read the uploaded file (422): The file's integrity check failed: the passphrase is wrong or missing, or the file is damaged.";
            await mount(
                <ImportWizardWithStore
                    inspectAnswers={[
                        { passphrase: 'correct horse battery', inspection: inspection([keyPair]) },
                        { error: refusal, status: 422 },
                    ]}
                    importableTokenProfiles={[profile]}
                    onAction={(action) => actions.push(action)}
                />,
            );
            const password = page.getByLabel('File password');
            await expect(password).toHaveCount(0);

            await chooseFile(page);

            await expect(page.getByRole('alert')).toHaveText(refusal);
            await expect(password).toBeVisible();

            await password.fill('correct horse battery');
            await enterPassword(password);

            await expect(page.getByRole('checkbox', { name: 'web-server-01' })).toBeChecked();
            await expect(page.getByRole('alert')).toHaveCount(0);
            await expect(password).toHaveValue('correct horse battery');
            await expect
                .poll(() => inspectRequests(actions))
                .toEqual([{ file: FILE_BASE64 }, { file: FILE_BASE64, passphrase: 'correct horse battery' }]);
        });
    }

    test('shows why a protected file cannot be read', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[
                    { passphrase: 'correct horse battery', inspection: inspection([keyPair]) },
                    { error: 'The file could not be opened with the given password.', status: 422 },
                ]}
                importableTokenProfiles={[profile]}
                onAction={(action) => actions.push(action)}
            />,
        );

        const password = page.getByLabel('File password');
        await chooseFile(page);
        await password.fill('wrong password');
        await password.blur();

        await expect(page.getByRole('alert')).toHaveText('The file could not be opened with the given password.');
        await expect(password).toHaveValue('wrong password');

        await password.fill('correct horse battery');
        await password.blur();

        await expect
            .poll(() => inspectRequests(actions))
            .toEqual([
                { file: FILE_BASE64 },
                { file: FILE_BASE64, passphrase: 'wrong password' },
                { file: FILE_BASE64, passphrase: 'correct horse battery' },
            ]);
        await expect(page.getByRole('alert')).toHaveCount(0);
        await expect(page.getByRole('checkbox', { name: 'web-server-01' })).toBeChecked();
    });

    test('reads the file again, rather than importing, when Enter is pressed in the file password', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[
                    { passphrase: 'correct horse battery', inspection: inspection([certificate]) },
                    { error: 'The file could not be opened with the given password.', status: 422 },
                ]}
                importAnswers={[{ results: [importedCertificate] }]}
                onAction={(action) => actions.push(action)}
            />,
        );

        const password = page.getByLabel('File password');
        await chooseFile(page);
        await expect(page.getByRole('alert')).toHaveText('The file could not be opened with the given password.');

        await password.fill('correct horse battery');
        await password.press('Enter');

        await expect(page.getByRole('checkbox', { name: 'intermediate-ca-r4' })).toBeChecked();
        await password.press('Enter');

        expect(inspectRequests(actions)).toEqual([{ file: FILE_BASE64 }, { file: FILE_BASE64, passphrase: 'correct horse battery' }]);
        expect(importRequests(actions)).toHaveLength(0);
    });

    test('shows the key destination for a key pair', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[{ inspection: inspection([keyPair]) }]}
                importableTokenProfiles={[profile]}
                importKeyAttributes={[keyStoreSlot]}
                onAction={(action) => actions.push(action)}
            />,
        );

        await chooseFile(page);

        await expect(
            page.getByText('RSA-2048 private key + certificate chain (3) · CN=web-server-01.example.com, O=Example'),
        ).toBeVisible();
        await expect(page.getByText('Key pair', { exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Key destination' })).toBeVisible();
        await expect.poll(() => profileListings(actions)).toEqual([{ importable: ['keyPair:RSA'] }]);
        await expect(page.getByText('Only token profiles whose provider imports the selected keys are listed.')).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'web-server-01' })).toHaveValue('web-server-01');
        await expect(page.getByRole('checkbox', { name: 'Exportable' })).toHaveCount(0);
        await expect(page.getByRole('heading', { name: /Import attributes/ })).toHaveCount(0);

        await chooseProfile(page);

        await expect(page.getByRole('heading', { name: 'Import attributes – SoftKeyStore Provider' })).toBeVisible();
        await expect
            .poll(() => actions.filter(keyActions.listImportKeyAttributeDescriptors.match).map((action) => action.payload))
            .toEqual([{ tokenInstanceUuid: profile.tokenInstanceUuid, tokenProfileUuid: profile.uuid, type: 'keyPair' }]);
    });

    test('imports a key pair into the chosen token profile', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[{ inspection: inspection([keyPair]) }]}
                importableTokenProfiles={[profile]}
                importKeyAttributes={[keyStoreSlot]}
                importAnswers={[{ results: [importedKeyPair] }]}
                onAction={(action) => actions.push(action)}
            />,
        );

        await chooseFile(page);
        await chooseProfile(page);
        await enterText(page.getByRole('textbox', { name: 'web-server-01' }), 'web-server-2026');
        await enterText(page.getByTestId('text-input-__attributes__importKey__.keyStoreSlot'), 'slot-2');
        await page.getByRole('button', { name: 'Import 1 entry' }).click();

        await expect.poll(() => importRequests(actions)).toHaveLength(1);
        expect(importRequests(actions)[0].entries).toEqual([
            {
                entryReference: keyPair.entryReference,
                importId: expect.stringMatching(UUID),
                keyDestination: {
                    tokenProfileUuid: profile.uuid,
                    keyName: 'web-server-2026',
                    exportable: false,
                    importAttributes: [
                        expect.objectContaining({ name: 'keyStoreSlot', content: [expect.objectContaining({ data: 'slot-2' })] }),
                    ],
                    customAttributes: [],
                },
            },
        ]);
    });

    test('keeps Import disabled until the import attribute schema has loaded', async ({ mount, page }) => {
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[{ inspection: inspection([keyPair]) }]}
                importableTokenProfiles={[profile]}
                importAttributeListings={[{ pending: true }]}
            />,
        );

        await chooseFile(page);
        await chooseProfile(page);

        await expect(page.getByTestId('select-importTokenProfile-trigger')).toHaveText(PROFILE_OPTION);
        await expect(page.getByRole('button', { name: 'Import 1 entry' })).toBeDisabled();
    });

    test('says why the import attribute schema could not be listed, and lists it again on Retry', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        const failure = 'Failed to get Attributes to import a key (503): The provider is unavailable';
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[{ inspection: inspection([keyPair]) }]}
                importableTokenProfiles={[profile]}
                importAttributeListings={[{ error: failure }, { descriptors: [keyStoreSlot] }]}
                onAction={(action) => actions.push(action)}
            />,
        );

        await chooseFile(page);
        await chooseProfile(page);

        await expect(page.getByRole('alert')).toContainText(failure);
        await expect(page.getByRole('button', { name: 'Import 1 entry' })).toBeDisabled();

        await page.getByRole('button', { name: 'Retry' }).click();

        await expect(page.getByTestId('text-input-__attributes__importKey__.keyStoreSlot')).toBeVisible();
        await expect(page.getByText(failure)).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Import 1 entry' })).toBeEnabled();
        const listed = { tokenInstanceUuid: profile.tokenInstanceUuid, tokenProfileUuid: profile.uuid, type: 'keyPair' };
        expect(actions.filter(keyActions.listImportKeyAttributeDescriptors.match).map((action) => action.payload)).toEqual([
            listed,
            listed,
        ]);
    });

    test('offers Exportable only when the chosen profile exports every selected key, off again after a change', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        const exporting = (...algorithms: KeyAlgorithm[]) => ({
            importAvailable: true,
            exportAvailable: true,
            exportableKeyTypes: { keyPair: algorithms },
        });
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[{ inspection: inspection([keyPair, ecPrivateKey]) }]}
                importableTokenProfiles={[profile, hsmProfile]}
                keyTransferByProfile={{ [profile.uuid]: exporting(KeyAlgorithm.Rsa), [hsmProfile.uuid]: exporting(KeyAlgorithm.Rsa) }}
                importAnswers={[{ results: [importedKeyPair] }]}
                onAction={(action) => actions.push(action)}
            />,
        );
        const exportable = page.getByTestId('switch-importExportable-input');
        const switchExportable = () => page.locator('label[for="importExportable"]').first().click();

        await chooseFile(page);
        await chooseProfile(page);

        await expect
            .poll(() => actions.filter(tokenProfileActions.getTokenProfileDetail.match).map((action) => action.payload))
            .toEqual([{ tokenInstanceUuid: profile.tokenInstanceUuid, uuid: profile.uuid, skipWidgetLock: true }]);
        await expect(exportable).toHaveCount(0);

        await page.getByRole('checkbox', { name: 'signing-ec' }).uncheck();
        await expect(exportable).not.toBeChecked();
        await switchExportable();
        await expect(exportable).toBeChecked();

        await page.getByRole('checkbox', { name: 'signing-ec' }).check();
        await expect(exportable).toHaveCount(0);
        await page.getByRole('checkbox', { name: 'signing-ec' }).uncheck();
        await expect(exportable).not.toBeChecked();

        await switchExportable();
        await chooseProfile(page, HSM_OPTION);
        await expect(page.getByTestId('select-importTokenProfile-trigger')).toHaveText(HSM_OPTION);
        await expect(exportable).not.toBeChecked();

        await switchExportable();
        await page.getByRole('button', { name: 'Import 1 entry' }).click();

        await expect.poll(() => importRequests(actions)).toHaveLength(1);
        expect(importRequests(actions)[0].entries[0].keyDestination?.exportable).toBe(true);
    });

    test('chooses the preset token profile when it is listed', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(
            <ImportWizardWithStore
                presetTokenProfileUuid={profile.uuid}
                inspectAnswers={[{ inspection: inspection([keyPair]) }]}
                importableTokenProfiles={[profile]}
                onAction={(action) => actions.push(action)}
            />,
        );

        await chooseFile(page);

        await expect(page.getByTestId('select-importTokenProfile-trigger')).toHaveText(PROFILE_OPTION);
        await expect
            .poll(() => inspectRequests(actions))
            .toEqual([{ file: FILE_BASE64 }, { file: FILE_BASE64, tokenProfileUuid: profile.uuid }]);
    });

    test('names each selected key', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[{ inspection: inspection([keyPair, secretKey]) }]}
                importableTokenProfiles={[profile]}
                onAction={(action) => actions.push(action)}
            />,
        );

        await chooseFile(page);

        await expect(page.getByRole('textbox', { name: 'web-server-01' })).toHaveValue('web-server-01');
        await expect(page.getByRole('textbox', { name: 'backup-aes' })).toHaveValue('backup-aes');
        await expect(page.getByText('AES-256 secret key')).toBeVisible();
        await expect(page.getByTestId('select-importTokenProfile-trigger')).toHaveCount(1);
        await expect.poll(() => profileListings(actions)).toEqual([{ importable: ['keyPair:RSA', 'secret:AES'] }]);

        await page.getByRole('checkbox', { name: 'backup-aes' }).uncheck();

        await expect(page.getByRole('textbox', { name: 'backup-aes' })).toHaveCount(0);
        await expect
            .poll(() => profileListings(actions))
            .toEqual([{ importable: ['keyPair:RSA', 'secret:AES'] }, { importable: ['keyPair:RSA'] }]);
    });

    test('asks for key pairs and secret keys to be imported separately', async ({ mount, page }) => {
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[{ inspection: inspection([keyPair, secretKey]) }]}
                importableTokenProfiles={[profile]}
                importKeyAttributes={[keyStoreSlot]}
            />,
        );

        await chooseFile(page);
        await chooseProfile(page);

        await expect(page.getByText('Import key pairs and secret keys separately.')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Import 2 entries' })).toBeDisabled();

        await page.getByRole('checkbox', { name: 'backup-aes' }).uncheck();

        await expect(page.getByText('Import key pairs and secret keys separately.')).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Import 1 entry' })).toBeEnabled();
    });

    test('says when no profile imports the selected keys', async ({ mount, page }) => {
        await mount(<ImportWizardWithStore inspectAnswers={[{ inspection: inspection([keyPair]) }]} importableTokenProfiles={[]} />);

        await chooseFile(page);

        await expect(page.getByText('No token profile imports the selected keys.')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Import 1 entry' })).toBeDisabled();
    });

    test('badges an entry the chosen profile cannot import', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        const reason = 'The provider does not import AES keys.';
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[
                    {
                        tokenProfileUuid: profile.uuid,
                        inspection: inspection([
                            { ...keyPair, importable: true },
                            { ...secretKey, importable: false, notImportableReason: reason },
                        ]),
                    },
                    { inspection: inspection([keyPair, secretKey]) },
                ]}
                importableTokenProfiles={[profile]}
                onAction={(action) => actions.push(action)}
            />,
        );

        await chooseFile(page);
        await expect(page.getByRole('checkbox', { name: 'backup-aes' })).toBeChecked();

        await chooseProfile(page);

        await expect.poll(() => inspectRequests(actions).at(-1)).toEqual({ file: FILE_BASE64, tokenProfileUuid: profile.uuid });
        const badge = page.getByText('Not supported by provider');
        await expect(badge).toBeVisible();
        await expect(badge).toHaveAttribute('title', reason);
        await expect(page.getByText(reason, { exact: true })).toBeVisible();
        await expect(page.getByRole('checkbox', { name: 'backup-aes' })).toHaveAccessibleDescription(reason);
        await expect(page.getByRole('checkbox', { name: 'backup-aes' })).toBeDisabled();
        await expect(page.getByRole('checkbox', { name: 'backup-aes' })).not.toBeChecked();
        await expect(page.getByRole('checkbox', { name: 'web-server-01' })).toBeChecked();
        await expect(page.getByTestId('select-importTokenProfile-trigger')).toHaveText(PROFILE_OPTION);
        await expect(page.getByRole('button', { name: 'Import 1 entry' })).toBeEnabled();
    });

    test('lets another token profile import a key the chosen one refuses', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[
                    {
                        tokenProfileUuid: profile.uuid,
                        inspection: inspection([
                            { ...keyPair, importable: false, notImportableReason: 'The provider does not import RSA keys.' },
                        ]),
                    },
                    { tokenProfileUuid: hsmProfile.uuid, inspection: inspection([{ ...keyPair, importable: true }]) },
                    { inspection: inspection([keyPair]) },
                ]}
                importableTokenProfiles={[profile, hsmProfile]}
                importAnswers={[{ results: [importedKeyPair] }]}
                onAction={(action) => actions.push(action)}
            />,
        );

        await chooseFile(page);
        await chooseProfile(page);

        const key = page.getByRole('checkbox', { name: 'web-server-01' });
        await expect(key).toBeDisabled();
        await expect(page.getByRole('heading', { name: 'Key destination' })).toBeVisible();

        await chooseProfile(page, HSM_OPTION);

        await expect.poll(() => inspectRequests(actions).at(-1)).toEqual({ file: FILE_BASE64, tokenProfileUuid: hsmProfile.uuid });
        await expect(key).toBeEnabled();
        await expect(key).toBeChecked();
        await page.getByRole('button', { name: 'Import 1 entry' }).click();

        await expect.poll(() => importRequests(actions)).toHaveLength(1);
        expect(importRequests(actions)[0].entries).toEqual([
            expect.objectContaining({
                entryReference: keyPair.entryReference,
                keyDestination: expect.objectContaining({ tokenProfileUuid: hsmProfile.uuid }),
            }),
        ]);
    });

    test('lists token profiles for the keys still wanted, never for keys unchecked', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[{ inspection: inspection([keyPair, secretKey]) }]}
                importableTokenProfiles={[profile]}
                onAction={(action) => actions.push(action)}
            />,
        );

        await chooseFile(page);
        await chooseProfile(page);
        await page.getByRole('checkbox', { name: 'backup-aes' }).uncheck();
        await expect.poll(() => profileListings(actions)).toHaveLength(2);
        await page.getByRole('checkbox', { name: 'web-server-01' }).uncheck();

        await expect(page.getByRole('heading', { name: 'Key destination' })).toHaveCount(0);
        expect(profileListings(actions)).toEqual([{ importable: ['keyPair:RSA', 'secret:AES'] }, { importable: ['keyPair:RSA'] }]);
    });

    for (const [status, reason] of [
        [403, 'Access denied to the token profile'],
        [404, 'Token profile not found'],
    ] as const) {
        test(`keeps the entries and drops the profile when Core refuses to read the file against it (${status})`, async ({
            mount,
            page,
        }) => {
            const actions: UnknownAction[] = [];
            const refusal = `Failed to read the uploaded file (${status}): ${reason}`;
            await mount(
                <ImportWizardWithStore
                    inspectAnswers={[
                        { tokenProfileUuid: profile.uuid, error: refusal, status },
                        { tokenProfileUuid: hsmProfile.uuid, inspection: inspection([{ ...keyPair, importable: true }]) },
                        { inspection: inspection([keyPair]) },
                    ]}
                    importableTokenProfiles={[profile, hsmProfile]}
                    importAnswers={[{ results: [importedKeyPair] }]}
                    onAction={(action) => actions.push(action)}
                />,
            );

            await chooseFile(page);
            await chooseProfile(page);

            await expect(page.getByRole('alert')).toHaveText(refusal);
            await expect(page.getByRole('checkbox', { name: 'web-server-01' })).toBeChecked();
            await expect(page.getByTestId('select-importTokenProfile-trigger')).toHaveText('Select token profile');

            await chooseProfile(page, HSM_OPTION);

            await expect(page.getByTestId('select-importTokenProfile-trigger')).toHaveText(HSM_OPTION);
            await expect(page.getByRole('alert')).toHaveCount(0);
            await page.getByRole('button', { name: 'Import 1 entry' }).click();

            await expect.poll(() => importRequests(actions)).toHaveLength(1);
            expect(importRequests(actions)[0].entries[0].keyDestination?.tokenProfileUuid).toBe(hsmProfile.uuid);
            expect(inspectRequests(actions)).toEqual([
                { file: FILE_BASE64 },
                { file: FILE_BASE64, tokenProfileUuid: profile.uuid },
                { file: FILE_BASE64, tokenProfileUuid: hsmProfile.uuid },
            ]);
        });
    }

    test('keeps the chosen profile when the file cannot be read with the password given', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        const failure = 'Failed to read the uploaded file (422): The file could not be opened with the given password.';
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[
                    { passphrase: 'correct horse battery', inspection: inspection([keyPair]) },
                    { error: failure, status: 422 },
                ]}
                importableTokenProfiles={[profile]}
                onAction={(action) => actions.push(action)}
            />,
        );
        const password = page.getByLabel('File password');
        await chooseFile(page);
        await password.fill('correct horse battery');
        await password.blur();
        await chooseProfile(page);

        await password.fill('wrong password');
        await password.blur();

        await expect(page.getByRole('alert')).toHaveText(failure);
        await expect(page.getByRole('heading', { name: 'Key destination' })).toHaveCount(0);
        await expect(page.getByRole('checkbox', { name: 'web-server-01' })).toHaveCount(0);

        await password.fill('correct horse battery');
        await password.blur();

        await expect(page.getByTestId('select-importTokenProfile-trigger')).toHaveText(PROFILE_OPTION);
        await expect(page.getByRole('alert')).toHaveCount(0);
        expect(inspectRequests(actions)).toEqual([
            { file: FILE_BASE64 },
            { file: FILE_BASE64, passphrase: 'correct horse battery' },
            { file: FILE_BASE64, passphrase: 'correct horse battery', tokenProfileUuid: profile.uuid },
            { file: FILE_BASE64, passphrase: 'wrong password', tokenProfileUuid: profile.uuid },
            { file: FILE_BASE64, passphrase: 'correct horse battery', tokenProfileUuid: profile.uuid },
        ]);
    });

    test('keeps the chosen token profile shown while the list reloads', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[{ inspection: inspection([keyPair, secretKey]) }]}
                profileListings={[{ tokenProfiles: [profile] }, { pending: true }]}
                onAction={(action) => actions.push(action)}
            />,
        );

        await chooseFile(page);
        await chooseProfile(page);
        await page.getByRole('checkbox', { name: 'backup-aes' }).uncheck();

        await expect.poll(() => profileListings(actions)).toHaveLength(2);
        await expect(page.getByTestId('select-importTokenProfile-trigger')).toHaveText(PROFILE_OPTION);
    });

    test('says why the token profiles could not be listed, not that none imports the keys, and lists them again on Retry', async ({
        mount,
        page,
    }) => {
        const actions: UnknownAction[] = [];
        const failure = 'Failed to get importable token profiles (503): The service is unavailable';
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[{ inspection: inspection([keyPair]) }]}
                profileListings={[{ error: failure }, { tokenProfiles: [profile] }]}
                onAction={(action) => actions.push(action)}
            />,
        );

        await chooseFile(page);

        const destination = page.getByRole('region', { name: 'Key destination' });
        await expect(destination.getByRole('alert')).toContainText(failure);
        await expect(destination.getByText('No token profile imports the selected keys.')).toHaveCount(0);
        await expect(destination.getByText('Only token profiles whose provider imports the selected keys are listed.')).toHaveCount(0);

        await destination.getByRole('button', { name: 'Retry' }).click();

        await expect(destination.getByRole('alert')).toHaveCount(0);
        await chooseProfile(page);
        await expect(page.getByTestId('select-importTokenProfile-trigger')).toHaveText(PROFILE_OPTION);
        expect(profileListings(actions)).toEqual([{ importable: ['keyPair:RSA'] }, { importable: ['keyPair:RSA'] }]);
    });

    test('says why an entry cannot be selected', async ({ mount, page }) => {
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[{ inspection: inspection([signingRequest, { ...secretKey, keyAlgorithm: KeyAlgorithm.Unknown }]) }]}
            />,
        );

        await chooseFile(page);

        const request = page.getByRole('checkbox', { name: 'pending.example.com' });
        await expect(request).toBeDisabled();
        await expect(request).toHaveAccessibleDescription('Certificate requests are not imported');
        await expect(page.getByText('Certificate requests are not imported')).toBeVisible();
        const key = page.getByRole('checkbox', { name: 'backup-aes' });
        await expect(key).toBeDisabled();
        await expect(key).toHaveAccessibleDescription("The platform does not support this key's algorithm");
        await expect(page.getByText("The platform does not support this key's algorithm")).toBeVisible();
    });

    test('imports only the certificates without the key import permission', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        const refusal = 'Importing keys needs the key import permission.';
        await mount(
            <ImportWizardWithStore
                canImportKeys={false}
                inspectAnswers={[{ inspection: inspection([keyPair, certificate]) }]}
                importableTokenProfiles={[profile]}
                importAnswers={[{ results: [importedCertificate] }]}
                onAction={(action) => actions.push(action)}
            />,
        );

        await chooseFile(page);

        const key = page.getByRole('checkbox', { name: 'web-server-01' });
        await expect(key).toBeDisabled();
        await expect(key).not.toBeChecked();
        await expect(key).toHaveAccessibleDescription(refusal);
        await expect(page.getByText(refusal)).toBeVisible();
        await expect(page.getByRole('checkbox', { name: 'intermediate-ca-r4' })).toBeChecked();
        await expect(page.getByRole('heading', { name: 'Key destination' })).toHaveCount(0);

        await page.getByRole('button', { name: 'Import 1 entry' }).click();

        await expect.poll(() => importRequests(actions)).toHaveLength(1);
        expect(importRequests(actions)[0].entries).toEqual([
            { entryReference: certificate.entryReference, importId: expect.stringMatching(UUID) },
        ]);
        expect(profileListings(actions)).toEqual([]);
    });

    test('sends no custom attributes while certificate custom attributes are off', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(
            <ImportWizardWithStore
                certificateCustomAttributes={[department]}
                inspectAnswers={[{ inspection: inspection([certificate]) }]}
                importAnswers={[{ results: [importedCertificate] }]}
                onAction={(action) => actions.push(action)}
            />,
        );

        await chooseFile(page);
        await expect(page.getByRole('heading', { name: 'Certificate custom attributes' })).toHaveCount(0);
        await page.getByRole('button', { name: 'Import 1 entry' }).click();

        await expect.poll(() => importRequests(actions)).toHaveLength(1);
        expect(importRequests(actions)[0].customAttributes).toBeUndefined();
    });

    test('sends no custom attributes when only a key is selected', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(
            <ImportWizardWithStore
                showCertificateCustomAttributes
                certificateCustomAttributes={[department]}
                inspectAnswers={[{ inspection: inspection([secretKey]) }]}
                importableTokenProfiles={[profile]}
                importAnswers={[
                    { results: [{ entryReference: secretKey.entryReference, kind: secretKey.kind, imported: true, keyUuid: KEY_UUID }] },
                ]}
                onAction={(action) => actions.push(action)}
            />,
        );

        await chooseFile(page);
        await chooseProfile(page);
        await expect(page.getByRole('heading', { name: 'Certificate custom attributes' })).toHaveCount(0);
        await page.getByRole('button', { name: 'Import 1 entry' }).click();

        await expect.poll(() => importRequests(actions)).toHaveLength(1);
        expect(importRequests(actions)[0].customAttributes).toBeUndefined();
    });

    test('moves focus from the form to the results heading once the results replace it', async ({ mount, page }) => {
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[{ inspection: inspection([certificate]) }]}
                importAnswers={[{ results: [importedCertificate] }]}
            />,
        );

        await chooseFile(page);
        await page.getByRole('button', { name: 'Import 1 entry' }).press('Enter');

        await expect(page.getByRole('heading', { name: 'Import results' })).toBeFocused();
    });

    test('shows a result per entry', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        const done: CertificateImportResultDto[][] = [];
        await mount(
            <ImportWizardWithStore
                showCertificateCustomAttributes
                certificateCustomAttributes={[department]}
                keyCustomAttributes={[ownerTeam]}
                inspectAnswers={[{ inspection: inspection([keyPair, certificate]) }]}
                importableTokenProfiles={[profile]}
                importAnswers={[{ results: [failedKeyPair, failedCertificate] }, { results: [importedKeyPair, importedCertificate] }]}
                onAction={(action) => actions.push(action)}
                onDone={(results) => done.push(results)}
            />,
        );

        await chooseFile(page);
        await chooseProfile(page);
        await enterText(page.getByTestId('text-input-__attributes__customImportCertificate__.department'), 'Platform');
        await enterText(page.getByTestId('text-input-__attributes__customImportKey__.ownerTeam'), 'PKI');
        await page.getByRole('button', { name: 'Import 2 entries' }).click();

        await expect(resultRow(page, 'web-server-01')).toContainText('The key could not be stored.');
        await expect(resultRow(page, 'intermediate-ca-r4')).toContainText('A certificate of the entry was not uploaded.');

        await page.getByRole('button', { name: 'Retry failed entries' }).click();

        await expect.poll(() => importRequests(actions)).toHaveLength(2);
        const [first, retry] = importRequests(actions);
        const firstKeyEntry = first.entries.find((entry) => entry.entryReference === keyPair.entryReference);
        expect(firstKeyEntry?.importId).toMatch(UUID);
        expect(firstKeyEntry?.keyDestination?.customAttributes).toEqual([
            expect.objectContaining({ name: 'ownerTeam', content: [expect.objectContaining({ data: 'PKI' })] }),
        ]);
        expect(retry.entries).toEqual(first.entries);
        expect(retry.customAttributes).toEqual(first.customAttributes);
        expect(retry.customAttributes).toEqual([
            expect.objectContaining({ name: 'department', content: [expect.objectContaining({ data: 'Platform' })] }),
        ]);
        const keyPairRow = resultRow(page, 'web-server-01');
        await expect(keyPairRow).toContainText('Imported');
        await expect(keyPairRow.getByRole('link', { name: 'Open certificate' })).toHaveAttribute(
            'href',
            `/certificates/detail/${CERTIFICATE_UUID}`,
        );
        await expect(keyPairRow.getByRole('link', { name: 'Open key' })).toHaveAttribute('href', `/keys/detail/${KEY_UUID}`);
        await expect(resultRow(page, 'intermediate-ca-r4')).toContainText('Imported');
        await expect(page.getByRole('button', { name: 'Retry failed entries' })).toHaveCount(0);

        await page.getByRole('button', { name: 'Done' }).click();

        await expect.poll(() => done).toEqual([[importedKeyPair, importedCertificate]]);
    });

    test('retries only the entry that failed, with the importId it was first sent with', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[{ inspection: inspection([keyPair, certificate]) }]}
                importableTokenProfiles={[profile]}
                importAnswers={[{ results: [importedKeyPair, failedCertificate] }, { results: [importedCertificate] }]}
                onAction={(action) => actions.push(action)}
            />,
        );

        await chooseFile(page);
        await chooseProfile(page);
        await page.getByRole('button', { name: 'Import 2 entries' }).click();
        await expect(resultRow(page, 'intermediate-ca-r4')).toContainText('A certificate of the entry was not uploaded.');

        await page.getByRole('button', { name: 'Retry failed entries' }).click();

        await expect(resultRow(page, 'intermediate-ca-r4')).toContainText('Imported');
        const [first, retry] = importRequests(actions);
        const importId = first.entries.find((entry) => entry.entryReference === certificate.entryReference)?.importId;
        expect(importId).toMatch(UUID);
        expect(retry.entries).toEqual([{ entryReference: certificate.entryReference, importId }]);
    });

    test('goes back from the results to the form with every value kept', async ({ mount, page }) => {
        await mount(
            <ImportWizardWithStore
                showCertificateCustomAttributes
                certificateCustomAttributes={[department]}
                inspectAnswers={[{ inspection: inspection([keyPair, certificate]) }]}
                importableTokenProfiles={[profile]}
                importKeyAttributes={[keyStoreSlot]}
                importAnswers={[{ results: [failedKeyPair, importedCertificate] }]}
            />,
        );

        await chooseFile(page);
        await chooseProfile(page);
        await enterText(page.getByRole('textbox', { name: 'web-server-01' }), 'web-server-2026');
        await enterText(page.getByTestId('text-input-__attributes__importKey__.keyStoreSlot'), 'slot-2');
        await enterText(page.getByTestId('text-input-__attributes__customImportCertificate__.department'), 'Platform');
        await page.getByRole('button', { name: 'Import 2 entries' }).click();
        await expect(resultRow(page, 'web-server-01')).toContainText('The key could not be stored.');

        await page.getByRole('button', { name: 'Back to edit' }).click();

        await expect(page.getByRole('heading', { name: 'Import results' })).toHaveCount(0);
        await expect(page.getByLabel('File name')).toHaveValue('webserver-bundle.p12');
        await expect(page.getByTestId('select-importTokenProfile-trigger')).toHaveText(PROFILE_OPTION);
        await expect(page.getByRole('textbox', { name: 'web-server-01' })).toHaveValue('web-server-2026');
        await expect(page.getByTestId('text-input-__attributes__importKey__.keyStoreSlot')).toHaveValue('slot-2');
        await expect(page.getByTestId('text-input-__attributes__customImportCertificate__.department')).toHaveValue('Platform');
        await expect(page.getByRole('button', { name: 'Import 2 entries' })).toBeEnabled();
    });

    test('sends a changed entry again with a new importId, and an unchanged one with its own', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[{ inspection: inspection([keyPair, certificate]) }]}
                importableTokenProfiles={[profile]}
                importAnswers={[{ results: [failedKeyPair, importedCertificate] }, { results: [importedKeyPair, importedCertificate] }]}
                onAction={(action) => actions.push(action)}
            />,
        );

        await chooseFile(page);
        await chooseProfile(page);
        await page.getByRole('button', { name: 'Import 2 entries' }).click();
        await page.getByRole('button', { name: 'Back to edit' }).click();
        await enterText(page.getByRole('textbox', { name: 'web-server-01' }), 'web-server-2026');
        await page.getByRole('button', { name: 'Import 2 entries' }).click();

        await expect(resultRow(page, 'web-server-01')).toContainText('Imported');
        const [first, second] = importRequests(actions).map((request) =>
            Object.fromEntries(request.entries.map((entry) => [entry.entryReference, entry])),
        );
        expect(second[keyPair.entryReference].keyDestination?.keyName).toBe('web-server-2026');
        expect(second[keyPair.entryReference].importId).toMatch(UUID);
        expect(second[keyPair.entryReference].importId).not.toBe(first[keyPair.entryReference].importId);
        expect(second[certificate.entryReference].importId).toBe(first[certificate.entryReference].importId);
    });

    test('asks for the key custom attributes and sends them with each key entry', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(
            <ImportWizardWithStore
                keyCustomAttributes={[ownerTeam]}
                inspectAnswers={[{ inspection: inspection([keyPair, ecPrivateKey]) }]}
                importableTokenProfiles={[profile]}
                onAction={(action) => actions.push(action)}
            />,
        );

        await chooseFile(page);
        await chooseProfile(page);

        await expect(page.getByRole('heading', { name: 'Key custom attributes' })).toBeVisible();
        await enterText(page.getByTestId('text-input-__attributes__customImportKey__.ownerTeam'), 'PKI');
        await page.getByRole('button', { name: 'Import 2 entries' }).click();

        await expect.poll(() => importRequests(actions)).toHaveLength(1);
        const sent = [expect.objectContaining({ name: 'ownerTeam', content: [expect.objectContaining({ data: 'PKI' })] })];
        expect(importRequests(actions)[0].entries.map((entry) => entry.keyDestination?.customAttributes)).toEqual([sent, sent]);
    });

    test('asks for the file password again before a retry', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[{ passphrase: 'correct horse battery', inspection: inspection([keyPair, certificate]) }, { status: 422 }]}
                importableTokenProfiles={[profile]}
                importAnswers={[{ results: [importedKeyPair, failedCertificate] }, { results: [importedCertificate] }]}
                onAction={(action) => actions.push(action)}
            />,
        );

        await chooseFile(page);
        await page.getByLabel('File password').fill('correct horse battery');
        await page.getByLabel('File password').blur();
        await chooseProfile(page);
        await page.getByRole('button', { name: 'Import 2 entries' }).click();

        await expect(resultRow(page, 'web-server-01')).toContainText('Imported');
        await expect(page.getByLabel('File password')).toHaveValue('');
        await expect(page.getByRole('button', { name: 'Retry failed entries' })).toBeDisabled();

        await page.getByLabel('File password').fill('correct horse battery');
        await page.getByRole('button', { name: 'Retry failed entries' }).click();

        await expect
            .poll(() => importRequests(actions).map((request) => request.passphrase))
            .toEqual(['correct horse battery', 'correct horse battery']);
        await expect(page.getByLabel('File password')).toHaveCount(0);
        expect(inspectRequests(actions)).toHaveLength(3);
    });

    test('asks for the file password again after the import is refused', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(
            <ImportWizardWithStore
                inspectAnswers={[{ passphrase: 'correct horse battery', inspection: inspection([certificate]) }, { status: 422 }]}
                importAnswers={[{ error: 'The import could not be completed.' }, { results: [importedCertificate] }]}
                onAction={(action) => actions.push(action)}
            />,
        );

        const password = page.getByLabel('File password');
        const importButton = page.getByRole('button', { name: 'Import 1 entry' });
        await chooseFile(page);
        await password.fill('correct horse battery');
        await password.blur();
        await importButton.click();

        await expect(page.getByRole('alert')).toContainText('The import could not be completed.');
        await expect(password).toHaveValue('');
        await expect(page.getByText('Enter the file password again to import.')).toBeVisible();
        await expect(importButton).toBeDisabled();

        await page.getByRole('button', { name: 'Dismiss' }).click();
        await password.fill('correct horse battery');
        await expect(importButton).toBeEnabled();
        await importButton.click();

        await expect
            .poll(() => importRequests(actions).map((request) => request.passphrase))
            .toEqual(['correct horse battery', 'correct horse battery']);
        expect(inspectRequests(actions)).toHaveLength(2);
    });

    test('forgets the inspection when it closes', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        const component = await mount(
            <ImportWizardWithStore
                inspectAnswers={[{ inspection: inspection([certificate]) }]}
                onAction={(action) => actions.push(action)}
            />,
        );
        await chooseFile(page);
        await expect(page.getByRole('checkbox', { name: 'intermediate-ca-r4' })).toBeChecked();

        await component.unmount();

        await expect.poll(() => actions.some((action) => inspectionActions.resetInspection.match(action))).toBe(true);
    });
});
