import { test, expect, type Page } from 'playwright/ct-test';
import CryptographicKeyFormWithStore from 'components/_pages/cryptographic-keys/form/CryptographicKeyFormWithStore';
import {
    AttributeContentType,
    AttributeType,
    InspectedEntryKind,
    KeyAlgorithm,
    KeyRequestType,
    Resource,
    TokenInstanceStatus,
} from 'types/openapi';
import { actions as keyActions } from 'ducks/cryptographic-keys';
import { actions as connectorActions } from 'ducks/connectors';
import { actions as certificateActions } from 'ducks/certificates';
import { actions as tokenProfilesActions } from 'ducks/token-profiles';
import type { UnknownAction } from '@reduxjs/toolkit';
import type { DataAttributeModel } from 'types/attributes';
import type { TokenProfileResponseModel } from 'types/token-profiles';
import type { CertificateImportResultDto, InspectedEntryDto } from 'types/openapi';

function aTokenProfile() {
    const profile: TokenProfileResponseModel = {
        uuid: 'token-profile',
        name: 'Token profile',
        tokenInstanceUuid: 'token-instance',
        tokenInstanceName: 'Token instance',
        tokenInstanceStatus: TokenInstanceStatus.Activated,
        enabled: true,
        usages: [],
    };
    return {
        withIdentity(uuid: string, name: string) {
            profile.uuid = uuid;
            profile.name = name;
            return this;
        },
        build: () => profile,
    };
}

async function selectTokenProfile(page: Page, profile: TokenProfileResponseModel) {
    await page.getByTestId('select-tokenProfileSelect-trigger').click();
    await page.getByRole('option', { name: profile.name, exact: true }).click();
}

async function selectKeyType(page: Page, type: KeyRequestType) {
    await page.getByTestId('select-typeSelect-trigger').click();
    await page.getByRole('option', { name: type, exact: true }).click();
}

async function clickExportableSwitch(page: Page) {
    await page.locator('label[for="exportable"]').first().click();
}

const detailRequests = (actions: UnknownAction[]) =>
    actions.filter(tokenProfilesActions.getTokenProfileDetail.match).map((action) => action.payload);

test.describe('CryptographicKeyForm', () => {
    for (const [previousName, selectedName] of [
        ['NG', 'PKCS12'],
        ['PKCS12', 'NG'],
    ]) {
        test(`routes creation callbacks to the selected ${selectedName} profile after viewing ${previousName}`, async ({ mount, page }) => {
            // given
            const previousProfile = aTokenProfile().withIdentity(previousName, previousName).build();
            const selectedProfile = aTokenProfile().withIdentity(selectedName, selectedName).build();
            const keyType = KeyRequestType.KeyPair;
            const actions: UnknownAction[] = [];
            const algorithm: DataAttributeModel = {
                uuid: 'algorithm',
                name: 'algorithm',
                type: AttributeType.Data,
                contentType: AttributeContentType.String,
                properties: { label: 'Algorithm', required: false, readOnly: false, visible: true, list: true, multiSelect: false },
                attributeCallback: { mappings: [], dependsOn: ['keySpec'] },
            };
            const keySpec: DataAttributeModel = {
                ...algorithm,
                uuid: 'key-spec',
                name: 'keySpec',
                properties: { ...algorithm.properties, label: 'Key specification', list: false },
                attributeCallback: undefined,
            };
            await mount(
                <CryptographicKeyFormWithStore
                    usesGlobalModal
                    tokenProfiles={[previousProfile, selectedProfile]}
                    supportedKeyRequestTypesByProfile={{ [previousProfile.uuid]: [keyType], [selectedProfile.uuid]: [keyType] }}
                    keyDetail={{ uuid: 'viewed-key', name: 'Viewed key', creationTime: '', tokenProfileUuid: previousProfile.uuid }}
                    attributeDescriptors={[keySpec, algorithm]}
                    onAction={(action) => actions.push(action)}
                />,
            );

            // when: select a different profile, then switch profiles while the old detail remains populated
            for (const profile of [selectedProfile, previousProfile, selectedProfile]) {
                actions.length = 0;
                await selectTokenProfile(page, profile);
                await selectKeyType(page, keyType);
                const keySpecInput = page.getByTestId('text-input-__attributes__cryptographicKey__.keySpec');
                await keySpecInput.click();
                await keySpecInput.fill(profile.name);

                // then
                await expect
                    .poll(() => actions.filter(keyActions.listAttributeDescriptors.match).map((action) => action.payload))
                    .toContainEqual({
                        tokenInstanceUuid: profile.tokenInstanceUuid,
                        tokenProfileUuid: profile.uuid,
                        keyRequestType: keyType,
                    });
                await expect
                    .poll(() => actions.filter(connectorActions.callbackResource.match).map((action) => action.payload.callbackResource))
                    .toContainEqual(expect.objectContaining({ parentObjectUuid: profile.uuid, resource: Resource.Keys }));
                await expect.poll(() => actions.filter(connectorActions.callbackSuccess.match)).not.toHaveLength(0);
                await expect(page.getByTestId('spinner')).toHaveCount(0);
            }
        });
    }

    test('keeps Key Type visible, enabled, and selected when the current token profile is selected again', async ({ mount, page }) => {
        // given
        const tokenProfile = aTokenProfile().build();
        const selectedKeyType = KeyRequestType.KeyPair;
        await mount(
            <CryptographicKeyFormWithStore
                usesGlobalModal
                tokenProfiles={[tokenProfile]}
                supportedKeyRequestTypesByProfile={{ [tokenProfile.uuid]: [selectedKeyType] }}
            />,
        );
        await selectTokenProfile(page, tokenProfile);
        await selectKeyType(page, selectedKeyType);

        // when
        await selectTokenProfile(page, tokenProfile);

        // then
        const keyType = page.getByTestId('select-typeSelect-trigger');
        await expect(keyType).toBeVisible();
        await expect(keyType).toBeEnabled();
        await expect(keyType).toHaveText(selectedKeyType);
        await expect(page.getByTestId('select-typeSelect-input')).toHaveValue(selectedKeyType);
    });

    test('resets Key Type and loads the supported options when a different token profile is selected', async ({ mount, page }) => {
        // given
        const originalProfile = aTokenProfile().withIdentity('original-profile', 'Original profile').build();
        const nextProfile = aTokenProfile().withIdentity('next-profile', 'Next profile').build();
        const originalKeyType = KeyRequestType.KeyPair;
        const nextKeyType = KeyRequestType.Secret;
        await mount(
            <CryptographicKeyFormWithStore
                usesGlobalModal
                tokenProfiles={[originalProfile, nextProfile]}
                supportedKeyRequestTypesByProfile={{ [originalProfile.uuid]: [originalKeyType], [nextProfile.uuid]: [nextKeyType] }}
            />,
        );
        await selectTokenProfile(page, originalProfile);
        await selectKeyType(page, originalKeyType);

        // when
        await selectTokenProfile(page, nextProfile);

        // then
        const keyType = page.getByTestId('select-typeSelect-trigger');
        await expect(keyType).toBeEnabled();
        await expect(page.getByTestId('select-typeSelect-input')).toHaveValue('');
        await keyType.click();
        await expect(page.getByRole('option')).toHaveText([nextKeyType]);
    });

    test('stays in create mode in the global modal, where the route :id belongs to another resource', async ({ mount, page }) => {
        // Opened via "+" in the Key dropdown of the Complete Registration dialog: the page underneath
        // is /certificates/detail/:id, so the route param is a certificate uuid, not a key.
        await mount(<CryptographicKeyFormWithStore usesGlobalModal />);

        await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();
        // Token Profile is required only for a new key — edit mode drops the marker and locks the field.
        await expect(page.getByText('Token Profile *')).toBeVisible();
    });

    test('does not offer the Import material tab in the global modal', async ({ mount, page }) => {
        await mount(<CryptographicKeyFormWithStore usesGlobalModal />);

        await expect(page.getByRole('tab', { name: 'Import material' })).toHaveCount(0);
        await expect(page.getByRole('tab', { name: 'Generate new' })).toHaveCount(0);
    });

    test('still enters edit mode from its own route', async ({ mount, page }) => {
        await mount(<CryptographicKeyFormWithStore initialRoute="/keys/detail/key-uuid" routePath="/keys/detail/:id" />);

        await expect(page.getByRole('button', { name: 'Update' })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Generate new' })).toHaveCount(0);
        await expect(page.getByRole('tab', { name: 'Import material' })).toHaveCount(0);
    });

    test('does not fetch the token profile export capability in edit mode', async ({ mount, page }) => {
        const profile = aTokenProfile().build();
        const actions: UnknownAction[] = [];
        await mount(
            <CryptographicKeyFormWithStore
                initialRoute="/keys/detail/existing-key"
                routePath="/keys/detail/:id"
                tokenProfiles={[profile]}
                keyDetail={{ uuid: 'existing-key', name: 'Existing key', creationTime: '', tokenProfileUuid: profile.uuid }}
                onAction={(action) => actions.push(action)}
            />,
        );

        await expect(page.getByRole('button', { name: 'Update' })).toBeVisible();
        // The trigger only resolves this label once the token profile list has loaded and the field's value has
        // been matched against it — the same condition onTokenProfileChange needs to reach its detail dispatch.
        await expect(page.getByTestId('select-tokenProfileSelect-trigger')).toHaveText(profile.name);

        expect(actions.filter(tokenProfilesActions.getTokenProfileDetail.match)).toHaveLength(0);
    });

    test('offers Generate new and Import material tabs in create mode', async ({ mount, page }) => {
        const profile = aTokenProfile().build();
        await mount(<CryptographicKeyFormWithStore initialRoute="/keys/create" routePath="/keys/create" tokenProfiles={[profile]} />);

        await expect(page.getByRole('tab', { name: 'Generate new' })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Import material' })).toBeVisible();
        // Generate new starts active, so its fields render without switching tabs.
        await expect(page.getByText('Token Profile *')).toBeVisible();
    });

    test('does not offer the Import material tab without the key import permission', async ({ mount, page }) => {
        const profile = aTokenProfile().build();
        await mount(
            <CryptographicKeyFormWithStore
                initialRoute="/keys/create"
                routePath="/keys/create"
                tokenProfiles={[profile]}
                canImportKeys={false}
            />,
        );

        await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();
        await expect(page.getByText('Token Profile *')).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Import material' })).toHaveCount(0);
        await expect(page.getByRole('tab', { name: 'Generate new' })).toHaveCount(0);
    });

    test('shows the Exportable switch only for a key type the profile can export, resets it on change, and submits it', async ({
        mount,
        page,
    }) => {
        // given
        const profile = aTokenProfile().build();
        const otherProfile = aTokenProfile().withIdentity('other-profile', 'Other profile').build();
        const keyPairType = KeyRequestType.KeyPair;
        const secretType = KeyRequestType.Secret;
        const actions: UnknownAction[] = [];
        await mount(
            <CryptographicKeyFormWithStore
                initialRoute="/keys/create"
                routePath="/keys/create"
                tokenProfiles={[profile, otherProfile]}
                supportedKeyRequestTypesByProfile={{
                    [profile.uuid]: [keyPairType, secretType],
                    [otherProfile.uuid]: [keyPairType],
                }}
                keyTransferByProfile={{
                    [profile.uuid]: {
                        importAvailable: false,
                        exportAvailable: true,
                        exportableKeyTypes: { [keyPairType]: [KeyAlgorithm.Rsa] },
                    },
                    [otherProfile.uuid]: {
                        importAvailable: false,
                        exportAvailable: true,
                        exportableKeyTypes: { [keyPairType]: [KeyAlgorithm.Rsa] },
                    },
                }}
                onAction={(action) => actions.push(action)}
            />,
        );

        // when: a key type the profile cannot export is chosen
        await selectTokenProfile(page, profile);

        // then: the detail fetch that answers the switch skips the widget lock, as a secondary lookup should
        await expect
            .poll(() => actions.filter(tokenProfilesActions.getTokenProfileDetail.match).map((action) => action.payload))
            .toContainEqual({ tokenInstanceUuid: profile.tokenInstanceUuid, uuid: profile.uuid, skipWidgetLock: true });

        await selectKeyType(page, secretType);

        // then: no switch offered
        await expect(page.getByTestId('switch-exportable')).toHaveCount(0);

        // when: switched to a key type the profile can export
        await selectKeyType(page, keyPairType);

        // then: the switch appears, off by default
        const exportableInput = page.getByTestId('switch-exportable-input');
        await expect(exportableInput).toBeVisible();
        await expect(exportableInput).not.toBeChecked();

        // when: switched on, then the key type changes away and back
        await clickExportableSwitch(page);
        await expect(exportableInput).toBeChecked();
        await selectKeyType(page, secretType);
        await expect(page.getByTestId('switch-exportable')).toHaveCount(0);
        await selectKeyType(page, keyPairType);
        await expect(page.getByTestId('switch-exportable-input')).not.toBeChecked();

        // when: switched on, then the token profile changes
        await clickExportableSwitch(page);
        await expect(page.getByTestId('switch-exportable-input')).toBeChecked();
        await selectTokenProfile(page, otherProfile);
        await selectKeyType(page, keyPairType);
        await expect(page.getByTestId('switch-exportable-input')).not.toBeChecked();

        // when: switched on and the key is submitted
        await clickExportableSwitch(page);
        const nameInput = page.getByTestId('text-input-name');
        await nameInput.click();
        await nameInput.fill('web-server-01');
        await page.getByRole('button', { name: 'Create' }).click();

        // then
        await expect.poll(() => actions.filter(keyActions.createCryptographicKey.match)).toHaveLength(1);
        const [created] = actions.filter(keyActions.createCryptographicKey.match);
        expect(created.payload.cryptographicKeyAddRequest.exportable).toBe(true);
    });

    for (const answer of ['pending', 'failure'] as const) {
        test(`hides the Exportable switch and sends it off once the profile's detail is ${answer === 'pending' ? 'being fetched again' : 'refused'}`, async ({
            mount,
            page,
        }) => {
            const profile = aTokenProfile().build();
            const actions: UnknownAction[] = [];
            await mount(
                <CryptographicKeyFormWithStore
                    initialRoute="/keys/create"
                    routePath="/keys/create"
                    tokenProfiles={[profile]}
                    supportedKeyRequestTypesByProfile={{ [profile.uuid]: [KeyRequestType.KeyPair] }}
                    keyTransferByProfile={{
                        [profile.uuid]: {
                            importAvailable: false,
                            exportAvailable: true,
                            exportableKeyTypes: { [KeyRequestType.KeyPair]: [KeyAlgorithm.Rsa] },
                        },
                    }}
                    tokenProfileDetailAnswers={['loaded', answer]}
                    onAction={(action) => actions.push(action)}
                />,
            );

            await selectTokenProfile(page, profile);
            await selectKeyType(page, KeyRequestType.KeyPair);
            await clickExportableSwitch(page);
            await expect(page.getByTestId('switch-exportable-input')).toBeChecked();

            await page.getByRole('button', { name: 'Fetch the token profile detail again' }).click();

            await expect(page.getByTestId('switch-exportable')).toHaveCount(0);
            const nameInput = page.getByTestId('text-input-name');
            await nameInput.click();
            await nameInput.fill('web-server-01');
            await page.getByRole('button', { name: 'Create' }).click();

            await expect.poll(() => actions.filter(keyActions.createCryptographicKey.match)).toHaveLength(1);
            const [created] = actions.filter(keyActions.createCryptographicKey.match);
            expect(created.payload.cryptographicKeyAddRequest.exportable).toBe(false);
        });
    }

    for (const [where, usesGlobalModal, hint] of [
        [
            'from a certificate request',
            true,
            'Required to download the certificate with its private key (PKCS12) after issuance. Cannot be enabled later.',
        ],
        [
            'from the key inventory',
            false,
            'Can be exported later by users holding the key export permission. Off by default, and cannot be switched on later.',
        ],
    ] as const) {
        test(`explains the Exportable switch for a key created ${where}`, async ({ mount, page }) => {
            const profile = aTokenProfile().build();
            await mount(
                <CryptographicKeyFormWithStore
                    usesGlobalModal={usesGlobalModal}
                    initialRoute="/keys/create"
                    routePath="/keys/create"
                    tokenProfiles={[profile]}
                    supportedKeyRequestTypesByProfile={{ [profile.uuid]: [KeyRequestType.KeyPair] }}
                    keyTransferByProfile={{
                        [profile.uuid]: {
                            importAvailable: false,
                            exportAvailable: true,
                            exportableKeyTypes: { [KeyRequestType.KeyPair]: [KeyAlgorithm.Rsa] },
                        },
                    }}
                />,
            );

            await selectTokenProfile(page, profile);
            await selectKeyType(page, KeyRequestType.KeyPair);

            await expect(page.getByTestId('switch-exportable-input')).toHaveAccessibleDescription(hint);
        });
    }

    test("offers Exportable again on Generate new once the Import material tab has loaded another profile's detail", async ({
        mount,
        page,
    }) => {
        const profile = aTokenProfile().build();
        const importProfile = aTokenProfile().withIdentity('import-profile', 'Import profile').build();
        const actions: UnknownAction[] = [];
        await mount(
            <CryptographicKeyFormWithStore
                initialRoute="/keys/create"
                routePath="/keys/create"
                tokenProfiles={[profile, importProfile]}
                supportedKeyRequestTypesByProfile={{ [profile.uuid]: [KeyRequestType.KeyPair] }}
                keyTransferByProfile={{
                    [profile.uuid]: {
                        importAvailable: true,
                        exportAvailable: true,
                        exportableKeyTypes: { [KeyRequestType.KeyPair]: [KeyAlgorithm.Rsa] },
                    },
                }}
                inspectAnswers={[
                    {
                        inspection: {
                            containerDigest: 'digest-1',
                            entries: [
                                {
                                    entryReference: 'entry-key',
                                    kind: InspectedEntryKind.PrivateKey,
                                    alias: 'imported-key',
                                    keyAlgorithm: KeyAlgorithm.Rsa,
                                },
                            ],
                        },
                    },
                ]}
                importableTokenProfiles={[profile, importProfile]}
                onAction={(action) => actions.push(action)}
            />,
        );
        await selectTokenProfile(page, profile);
        await selectKeyType(page, KeyRequestType.KeyPair);
        await clickExportableSwitch(page);

        await page.getByRole('tab', { name: 'Import material' }).click();
        await page.locator('#importWizard__fileUpload__file').setInputFiles({
            name: 'key.pem',
            mimeType: 'application/x-pem-file',
            buffer: Buffer.from('3082097a020103308209400609', 'hex'),
        });
        await page.getByTestId('select-importTokenProfile-trigger').click();
        await page.getByRole('option', { name: `${importProfile.tokenInstanceName} / ${importProfile.name}` }).click();
        await expect.poll(() => detailRequests(actions).at(-1)?.uuid).toBe(importProfile.uuid);
        const requestedBefore = detailRequests(actions).length;

        await page.getByRole('tab', { name: 'Generate new' }).click();

        const exportable = page.getByTestId('switch-exportable-input');
        await expect(exportable).toBeVisible();
        await expect(exportable).not.toBeChecked();
        expect(detailRequests(actions).slice(requestedBefore)).toEqual([
            { tokenInstanceUuid: profile.tokenInstanceUuid, uuid: profile.uuid, skipWidgetLock: true },
        ]);
    });

    test('keeps to the Import material tab while an import runs', async ({ mount, page }) => {
        const profile = aTokenProfile().build();
        await mount(
            <CryptographicKeyFormWithStore
                initialRoute="/keys/create"
                routePath="/keys/create"
                tokenProfiles={[profile]}
                inspectAnswers={[
                    {
                        inspection: {
                            containerDigest: 'digest-1',
                            entries: [{ entryReference: 'entry-certificate', kind: InspectedEntryKind.Certificate, subjectDn: 'CN=ca' }],
                        },
                    },
                ]}
                importAnswers={[{ pending: true }]}
            />,
        );

        await page.getByRole('tab', { name: 'Import material' }).click();
        await page.locator('#importWizard__fileUpload__file').setInputFiles({
            name: 'ca.pem',
            mimeType: 'application/x-pem-file',
            buffer: Buffer.from('3082097a020103308209400609', 'hex'),
        });
        await expect(page.getByRole('tab', { name: 'Generate new' })).toBeEnabled();
        await page.getByRole('button', { name: 'Import 1 entry' }).click();

        await expect(page.getByRole('button', { name: 'Importing...' })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Generate new' })).toBeDisabled();
    });

    test('imports through the wizard preset to the chosen profile, and Done reuses the create-success handling', async ({
        mount,
        page,
    }) => {
        // given
        const profile = aTokenProfile().build();
        const importEntry: InspectedEntryDto = {
            entryReference: 'entry-key-pair',
            kind: InspectedEntryKind.KeyPairWithChain,
            alias: 'imported-web-key',
            keyAlgorithm: KeyAlgorithm.Rsa,
            keyLength: 2048,
            chainLength: 1,
        };
        const importResult: CertificateImportResultDto = {
            entryReference: importEntry.entryReference,
            kind: importEntry.kind,
            imported: true,
            keyUuid: 'imported-key-uuid',
        };
        const actions: UnknownAction[] = [];
        let succeededCount = 0;
        await mount(
            <CryptographicKeyFormWithStore
                initialRoute="/keys/create"
                routePath="/keys/create"
                tokenProfiles={[profile]}
                inspectAnswers={[{ inspection: { containerDigest: 'digest-1', entries: [importEntry] } }]}
                importableTokenProfiles={[profile]}
                importAnswers={[{ results: [importResult] }]}
                onSuccess={() => {
                    succeededCount += 1;
                }}
                onAction={(action) => actions.push(action)}
            />,
        );

        // when: a token profile is chosen on Generate new, then Import material is opened and a file dropped
        await selectTokenProfile(page, profile);
        await page.getByRole('tab', { name: 'Import material' }).click();
        await page.locator('#importWizard__fileUpload__file').setInputFiles({
            name: 'app-signing-key.p8',
            mimeType: 'application/octet-stream',
            buffer: Buffer.from('3082097a020103308209400609', 'hex'),
        });

        // then: the chosen profile is preset as the import destination
        await expect(page.getByTestId('select-importTokenProfile-trigger')).toHaveText(`${profile.tokenInstanceName} / ${profile.name}`);

        // when
        await page.getByRole('button', { name: 'Import 1 entry' }).click();
        await expect(page.getByRole('heading', { name: 'Import results' })).toBeVisible();
        await page.getByRole('button', { name: 'Done' }).click();

        // then: Done behaves like a generated key's success — the caller's onSuccess fires
        await expect.poll(() => succeededCount).toBe(1);
        const [request] = actions.filter(certificateActions.importCertificates.match);
        expect(request.payload.certificateImportRequestDto.entries[0].keyDestination?.tokenProfileUuid).toBe(profile.uuid);
    });
});
