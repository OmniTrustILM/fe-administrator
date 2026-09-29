import type { UnknownAction } from '@reduxjs/toolkit';
import { test, expect, type Locator } from 'playwright/ct-test';
import CryptographicKeyDetailWithStore from 'components/_pages/cryptographic-keys/detail/CryptographicKeyDetailWithStore';
import { actions as keyActions } from 'ducks/cryptographic-keys';
import { actions as cryptographicOperationActions } from 'ducks/cryptographic-operations';
import { actions as profileActions } from 'ducks/token-profiles';
import type { CryptographicKeyDetailResponseModel, CryptographicKeyItemDetailResponseModel } from 'types/cryptographic-keys';
import {
    AttributeContentType,
    AttributeType,
    ComplianceStatus,
    KeyAlgorithm,
    KeyFormat,
    KeyRequestType,
    KeyState,
    KeyType,
    KeyUsage,
    TokenInstanceStatus,
} from 'types/openapi';
import type { TokenProfileDetailResponseModel } from 'types/token-profiles';
import type { AttributeDescriptorModel } from 'types/attributes';

function aSynchronizedKey() {
    const key: CryptographicKeyDetailResponseModel = {
        uuid: 'synchronized-key',
        name: 'Synchronized key',
        creationTime: '2026-01-01T00:00:00Z',
        tokenInstanceUuid: 'token-instance',
        tokenInstanceName: 'Token instance',
        attributes: [],
        complianceStatus: ComplianceStatus.NotChecked,
        items: [
            {
                uuid: 'private-key-item',
                name: 'Private key',
                type: KeyType.Private,
                keyAlgorithm: KeyAlgorithm.Rsa,
                format: KeyFormat.PrivateKeyInfo,
                length: 2048,
                usage: [],
                enabled: true,
                state: KeyState.Active,
                complianceStatus: ComplianceStatus.NotChecked,
                exportable: false,
            },
        ],
    };
    return {
        withTokenProfile(uuid: string) {
            key.tokenProfileUuid = uuid;
            return this;
        },
        withUsages(usages: KeyUsage[]) {
            key.items[0].usage = usages;
            return this;
        },
        build: () => key,
    };
}

function aTokenProfile(usages: KeyUsage[]): TokenProfileDetailResponseModel {
    return {
        uuid: 'token-profile',
        name: 'Token profile',
        tokenInstanceUuid: 'token-instance',
        tokenInstanceName: 'Token instance',
        tokenInstanceStatus: TokenInstanceStatus.Activated,
        enabled: true,
        attributes: [],
        usages,
    };
}

function aKeyWithExportableItem(itemOverrides: Partial<CryptographicKeyItemDetailResponseModel> = {}): CryptographicKeyDetailResponseModel {
    return {
        uuid: 'exportable-key',
        name: 'Exportable key',
        creationTime: '2026-01-01T00:00:00Z',
        tokenInstanceUuid: 'token-instance',
        tokenInstanceName: 'Token instance',
        tokenProfileUuid: 'token-profile',
        attributes: [],
        complianceStatus: ComplianceStatus.NotChecked,
        items: [
            {
                uuid: 'private-key-item',
                name: 'server-01',
                type: KeyType.Private,
                keyAlgorithm: KeyAlgorithm.Rsa,
                format: KeyFormat.PrivateKeyInfo,
                length: 2048,
                usage: [],
                enabled: true,
                state: KeyState.Active,
                complianceStatus: ComplianceStatus.NotChecked,
                exportable: true,
                ...itemOverrides,
            },
        ],
    };
}

function aProfileExporting(exportableKeyTypes: Partial<Record<KeyRequestType, KeyAlgorithm[]>>): TokenProfileDetailResponseModel {
    return {
        uuid: 'token-profile',
        name: 'Token profile',
        tokenInstanceUuid: 'token-instance',
        tokenInstanceName: 'Token instance',
        tokenInstanceStatus: TokenInstanceStatus.Activated,
        enabled: true,
        attributes: [],
        usages: [],
        keyTransfer: { importAvailable: false, exportAvailable: true, exportableKeyTypes },
    };
}

/** A text field stays read-only until it is focused, so it is clicked before it is filled. */
async function enterText(field: Locator, value: string) {
    await field.click();
    await field.fill(value);
}

test.describe('CryptographicKeyDetail usage editing', () => {
    for (const profileUsages of [[KeyUsage.Sign, KeyUsage.Verify], []]) {
        test(`drops unsupported existing usages when the profile supports [${profileUsages.join(', ')}]`, async ({ mount, page }) => {
            // given
            const existingUsages = [KeyUsage.Sign, KeyUsage.Decrypt, KeyUsage.Verify];
            const expectedUsages = profileUsages.includes(KeyUsage.Sign) ? [KeyUsage.Sign] : [];
            const tokenProfile = aTokenProfile(profileUsages);
            const cryptographicKey = aSynchronizedKey().withTokenProfile(tokenProfile.uuid).withUsages(existingUsages).build();
            const dispatched: UnknownAction[] = [];
            await mount(
                <CryptographicKeyDetailWithStore
                    cryptographicKey={cryptographicKey}
                    tokenProfile={tokenProfile}
                    onAction={(action) => dispatched.push(action)}
                />,
            );

            // when
            await page.getByTestId('key-button').click();

            // then
            const dialog = page.getByRole('dialog');
            await expect(dialog.getByText(KeyUsage.Decrypt, { exact: true })).toHaveCount(0);
            await expect(dialog.getByText(KeyUsage.Verify, { exact: true })).toHaveCount(0);
            await expect(dialog.getByRole('button', { name: `Remove ${KeyUsage.Sign}`, exact: true })).toHaveCount(expectedUsages.length);
            await dialog.getByRole('button', { name: 'Update', exact: true }).click();
            await expect
                .poll(() => dispatched.find(keyActions.updateKeyUsage.match))
                .toEqual(
                    keyActions.updateKeyUsage({
                        uuid: cryptographicKey.uuid,
                        usage: { usage: expectedUsages, uuids: [cryptographicKey.items[0].uuid] },
                    }),
                );
        });
    }

    test('allows a synchronized key without a profile to submit usages filtered by key type', async ({ mount, page }) => {
        // given
        const cryptographicKey = aSynchronizedKey().build();
        const requestedUsage = KeyUsage.Decrypt;
        const privateKeyUsages = [KeyUsage.Sign, KeyUsage.Decrypt, KeyUsage.Unwrap];
        const dispatched: UnknownAction[] = [];
        await mount(<CryptographicKeyDetailWithStore cryptographicKey={cryptographicKey} onAction={(action) => dispatched.push(action)} />);

        // when
        await expect(page.getByTestId('key-button')).toBeEnabled();
        await page.getByTestId('key-button').click();
        await page.getByTestId('select-field-trigger').click();

        // then
        await expect(page.getByRole('option')).toHaveText(privateKeyUsages);
        await page.getByRole('option', { name: requestedUsage, exact: true }).click();
        await page.keyboard.press('Escape');
        await page.getByRole('button', { name: 'Update', exact: true }).click();
        await expect
            .poll(() => dispatched.find(keyActions.updateKeyUsage.match))
            .toEqual(
                keyActions.updateKeyUsage({
                    uuid: cryptographicKey.uuid,
                    usage: { usage: [requestedUsage], uuids: [cryptographicKey.items[0].uuid] },
                }),
            );
        expect(dispatched.some(profileActions.getTokenProfileDetail.match)).toBe(false);
    });

    test('keeps usage editing disabled while the assigned profile loads', async ({ mount, page }) => {
        // given
        const assignedProfileUuid = 'assigned-profile';
        const cryptographicKey = aSynchronizedKey().withTokenProfile(assignedProfileUuid).build();
        const dispatched: UnknownAction[] = [];

        // when
        await mount(<CryptographicKeyDetailWithStore cryptographicKey={cryptographicKey} onAction={(action) => dispatched.push(action)} />);

        // then
        await expect
            .poll(() => dispatched.find(profileActions.getTokenProfileDetail.match))
            .toEqual(
                profileActions.getTokenProfileDetail({
                    tokenInstanceUuid: cryptographicKey.tokenInstanceUuid!,
                    uuid: assignedProfileUuid,
                    skipWidgetLock: true,
                }),
            );
        await expect(page.getByTestId('key-button')).toBeDisabled();
    });

    test('restricts a profiled key to its profile usages and key type', async ({ mount, page }) => {
        // given
        const profileUsages = [KeyUsage.Sign, KeyUsage.Verify];
        const tokenProfile = aTokenProfile(profileUsages);
        const cryptographicKey = aSynchronizedKey().withTokenProfile(tokenProfile.uuid).build();
        const allowedPrivateUsage = KeyUsage.Sign;
        await mount(<CryptographicKeyDetailWithStore cryptographicKey={cryptographicKey} tokenProfile={tokenProfile} />);

        // when
        await page.getByTestId('key-button').click();
        await page.getByTestId('select-field-trigger').click();

        // then
        await expect(page.getByRole('option')).toHaveText([allowedPrivateUsage]);
    });

    test('keeps usage editing disabled after a cached profile refresh fails until a retry succeeds', async ({ mount, page }) => {
        // given
        const profileUsages = [KeyUsage.Sign];
        const tokenProfile = aTokenProfile(profileUsages);
        const cryptographicKey = aSynchronizedKey().withTokenProfile(tokenProfile.uuid).build();
        await mount(<CryptographicKeyDetailWithStore cryptographicKey={cryptographicKey} tokenProfile={tokenProfile} />);
        await expect(page.getByTestId('key-button')).toBeEnabled();

        // when
        await page.getByRole('button', { name: 'Refresh profile', exact: true }).click();

        // then
        await expect(page.getByTestId('key-button')).toBeDisabled();

        // when
        await page.getByRole('button', { name: 'Fail profile request' }).click();

        // then
        await expect(page.getByTestId('key-button')).toBeDisabled();

        // when
        await page.getByRole('button', { name: 'Refresh profile', exact: true }).click();

        // then
        await expect(page.getByTestId('key-button')).toBeDisabled();

        // when
        await page.getByRole('button', { name: 'Complete profile request' }).click();

        // then
        await expect(page.getByTestId('key-button')).toBeEnabled();
        await page.getByTestId('key-button').click();
        await expect(page.getByRole('button', { name: 'Update', exact: true })).toBeEnabled();
    });
});

test.describe('CryptographicKeyItem key export', () => {
    test('shows the Export button when the item is exportable, active and enabled, and the profile exports its type and algorithm', async ({
        mount,
        page,
    }) => {
        const tokenProfile = aProfileExporting({ [KeyRequestType.KeyPair]: [KeyAlgorithm.Rsa] });
        const cryptographicKey = aKeyWithExportableItem();
        await mount(<CryptographicKeyDetailWithStore cryptographicKey={cryptographicKey} tokenProfile={tokenProfile} />);

        await expect(page.getByTestId('export-button')).toBeVisible();
    });

    test("asks for the profile's detail again when the key details are refreshed, and offers Export once it loads", async ({
        mount,
        page,
    }) => {
        const tokenProfile = aProfileExporting({ [KeyRequestType.KeyPair]: [KeyAlgorithm.Rsa] });
        const cryptographicKey = aKeyWithExportableItem();
        const actions: UnknownAction[] = [];
        await mount(
            <CryptographicKeyDetailWithStore
                cryptographicKey={cryptographicKey}
                tokenProfile={tokenProfile}
                onAction={(action) => actions.push(action)}
            />,
        );
        await expect(page.getByTestId('export-button')).toBeVisible();
        await page.getByRole('button', { name: 'Refresh profile', exact: true }).click();
        await page.getByRole('button', { name: 'Fail profile request' }).click();
        await expect(page.getByTestId('export-button')).toHaveCount(0);
        const requested = actions.filter(profileActions.getTokenProfileDetail.match).length;

        await page.getByRole('button', { name: 'Refresh', exact: true }).first().click();

        await expect.poll(() => actions.filter(profileActions.getTokenProfileDetail.match).length).toBe(requested + 1);
        await page.getByRole('button', { name: 'Complete profile request' }).click();
        await expect(page.getByTestId('export-button')).toBeVisible();
    });

    test('hides the Export button without the key export permission', async ({ mount, page }) => {
        const tokenProfile = aProfileExporting({ [KeyRequestType.KeyPair]: [KeyAlgorithm.Rsa] });
        const cryptographicKey = aKeyWithExportableItem();
        await mount(
            <CryptographicKeyDetailWithStore cryptographicKey={cryptographicKey} tokenProfile={tokenProfile} canExportKeys={false} />,
        );

        await expect(page.getByTestId('key-button')).toBeEnabled();
        await expect(page.getByTestId('export-button')).toHaveCount(0);
    });

    test('hides the Export button for a public key item', async ({ mount, page }) => {
        const tokenProfile = aProfileExporting({ [KeyRequestType.KeyPair]: [KeyAlgorithm.Rsa] });
        const cryptographicKey = aKeyWithExportableItem({ type: KeyType.Public });
        await mount(<CryptographicKeyDetailWithStore cryptographicKey={cryptographicKey} tokenProfile={tokenProfile} />);

        await expect(page.getByTestId('export-button')).toHaveCount(0);
    });

    test('hides the Export button for a non-exportable item', async ({ mount, page }) => {
        const tokenProfile = aProfileExporting({ [KeyRequestType.KeyPair]: [KeyAlgorithm.Rsa] });
        const cryptographicKey = aKeyWithExportableItem({ exportable: false });
        await mount(<CryptographicKeyDetailWithStore cryptographicKey={cryptographicKey} tokenProfile={tokenProfile} />);

        await expect(page.getByTestId('export-button')).toHaveCount(0);
    });

    test('hides the Export button for an item that is not active', async ({ mount, page }) => {
        const tokenProfile = aProfileExporting({ [KeyRequestType.KeyPair]: [KeyAlgorithm.Rsa] });
        const cryptographicKey = aKeyWithExportableItem({ state: KeyState.Deactivated });
        await mount(<CryptographicKeyDetailWithStore cryptographicKey={cryptographicKey} tokenProfile={tokenProfile} />);

        await expect(page.getByTestId('export-button')).toHaveCount(0);
    });

    test('hides the Export button for a disabled item', async ({ mount, page }) => {
        const tokenProfile = aProfileExporting({ [KeyRequestType.KeyPair]: [KeyAlgorithm.Rsa] });
        const cryptographicKey = aKeyWithExportableItem({ enabled: false });
        await mount(<CryptographicKeyDetailWithStore cryptographicKey={cryptographicKey} tokenProfile={tokenProfile} />);

        await expect(page.getByTestId('export-button')).toHaveCount(0);
    });

    test("hides the Export button when the profile does not export the item's type and algorithm", async ({ mount, page }) => {
        const tokenProfile = aProfileExporting({ [KeyRequestType.KeyPair]: [KeyAlgorithm.Ecdsa] });
        const cryptographicKey = aKeyWithExportableItem();
        await mount(<CryptographicKeyDetailWithStore cryptographicKey={cryptographicKey} tokenProfile={tokenProfile} />);

        await expect(page.getByTestId('export-button')).toHaveCount(0);
    });

    test('keeps the export dialog open on Escape while the export runs, and closes it on Escape once it has ended', async ({
        mount,
        page,
    }) => {
        const refusal = 'Failed to export the key (422): The key is not exportable';
        const tokenProfile = aProfileExporting({ [KeyRequestType.KeyPair]: [KeyAlgorithm.Rsa] });
        await mount(
            <CryptographicKeyDetailWithStore
                cryptographicKey={aKeyWithExportableItem()}
                tokenProfile={tokenProfile}
                exportAnswer={{ delay: 1000, error: refusal }}
            />,
        );
        await page.getByTestId('export-button').click();
        const dialog = page.getByRole('dialog', { name: 'Export key material' });
        await enterText(dialog.getByTestId('text-input-passphrase'), 'correct horse battery');
        await enterText(dialog.getByTestId('text-input-passphraseConfirmation'), 'correct horse battery');
        await dialog.getByRole('button', { name: 'Export' }).click();
        await expect(dialog.getByRole('button', { name: 'Exporting...' })).toBeDisabled();

        await page.keyboard.press('Escape');

        await expect(dialog.getByRole('alert')).toHaveText(refusal);
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
    });

    for (const exportable of [true, false]) {
        test(`shows the Exportable row as ${exportable ? 'Enabled' : 'Disabled'}`, async ({ mount, page }) => {
            const cryptographicKey = aKeyWithExportableItem({ exportable });
            await mount(<CryptographicKeyDetailWithStore cryptographicKey={cryptographicKey} />);

            await expect(page.locator('tr[data-id="exportable"]').getByTestId('status-badge')).toHaveText(
                exportable ? 'Enabled' : 'Disabled',
            );
        });
    }
});

test.describe('CryptographicKeyDetail signature attributes', () => {
    test('Sign requires an algorithm before submitting data', async ({ mount, page }) => {
        const tokenProfile = aTokenProfile([KeyUsage.Sign]);
        const cryptographicKey = aSynchronizedKey().withTokenProfile(tokenProfile.uuid).withUsages([KeyUsage.Sign]).build();
        const dispatched: UnknownAction[] = [];
        const signatureDescriptors = [
            {
                type: AttributeType.Data,
                uuid: 'signature-algorithm',
                name: 'signatureAlgorithm',
                contentType: AttributeContentType.String,
                content: [{ data: 'SHA256withRSA' }],
                properties: {
                    label: 'Signature Algorithm',
                    required: true,
                    readOnly: false,
                    visible: true,
                    list: true,
                    multiSelect: false,
                },
            } as AttributeDescriptorModel,
        ];
        await mount(
            <CryptographicKeyDetailWithStore
                cryptographicKey={cryptographicKey}
                tokenProfile={tokenProfile}
                signatureDescriptors={signatureDescriptors}
                onAction={(action) => dispatched.push(action)}
            />,
        );

        await page.getByTestId('sign-button').click();
        const dialog = page.getByRole('dialog', { name: 'Sign Data' });
        const algorithm = dialog.getByRole('button', { name: 'Select Signature Algorithm' });
        await expect(algorithm).toBeVisible();
        const data = dialog.getByRole('textbox', { name: 'File content' });
        await data.fill('sample data');
        await data.press('Tab');

        const sign = dialog.getByRole('button', { name: 'Sign', exact: true });
        await expect(sign).toBeDisabled();
        await algorithm.click();
        await page.getByRole('option', { name: 'SHA256withRSA' }).click();
        await expect(sign).toBeEnabled();
        await sign.click();
        await expect
            .poll(() => dispatched.find(cryptographicOperationActions.signData.match))
            .toMatchObject({
                payload: {
                    request: {
                        signatureAttributes: [{ name: 'signatureAlgorithm', content: [{ data: 'SHA256withRSA' }] }],
                        data: [{ data: btoa('sample data') }],
                    },
                },
            });
    });

    test('Sign stays disabled while signature attributes load', async ({ mount, page }) => {
        const tokenProfile = aTokenProfile([KeyUsage.Sign]);
        const cryptographicKey = aSynchronizedKey().withTokenProfile(tokenProfile.uuid).withUsages([KeyUsage.Sign]).build();
        const dispatched: UnknownAction[] = [];
        await mount(
            <CryptographicKeyDetailWithStore
                cryptographicKey={cryptographicKey}
                tokenProfile={tokenProfile}
                onAction={(action) => dispatched.push(action)}
            />,
        );

        await page.getByTestId('sign-button').click();
        await expect.poll(() => dispatched.some(cryptographicOperationActions.listSignatureAttributeDescriptors.match)).toBe(true);
        const dialog = page.getByRole('dialog', { name: 'Sign Data' });
        const data = dialog.getByRole('textbox', { name: 'File content' });
        await data.fill('sample data');
        await data.press('Tab');
        await expect(dialog.getByRole('button', { name: 'Sign', exact: true })).toBeDisabled();
        await dialog.locator('form').evaluate((form) => (form as HTMLFormElement).requestSubmit());
        await expect(dialog).toBeVisible();
        expect(dispatched.some(cryptographicOperationActions.signData.match)).toBe(false);
    });

    test('Sign stays disabled when signature attributes fail to load', async ({ mount, page }) => {
        const tokenProfile = aTokenProfile([KeyUsage.Sign]);
        const cryptographicKey = aSynchronizedKey().withTokenProfile(tokenProfile.uuid).withUsages([KeyUsage.Sign]).build();
        const dispatched: UnknownAction[] = [];
        await mount(
            <CryptographicKeyDetailWithStore
                cryptographicKey={cryptographicKey}
                tokenProfile={tokenProfile}
                failSignatureDescriptors
                onAction={(action) => dispatched.push(action)}
            />,
        );

        await page.getByTestId('sign-button').click();
        await expect.poll(() => dispatched.some(cryptographicOperationActions.listSignatureAttributesFailure.match)).toBe(true);
        const dialog = page.getByRole('dialog', { name: 'Sign Data' });
        const data = dialog.getByRole('textbox', { name: 'File content' });
        await data.fill('sample data');
        await data.press('Tab');
        await expect(dialog.getByRole('button', { name: 'Sign', exact: true })).toBeDisabled();
        await dialog.locator('form').evaluate((form) => (form as HTMLFormElement).requestSubmit());
        await expect(dialog).toBeVisible();
        expect(dispatched.some(cryptographicOperationActions.signData.match)).toBe(false);
    });

    for (const operation of ['sign', 'verify'] as const) {
        test(`${operation} dialog requests its operation schema`, async ({ mount, page }) => {
            const tokenProfile = aTokenProfile([KeyUsage.Sign, KeyUsage.Verify]);
            const cryptographicKey = aSynchronizedKey()
                .withTokenProfile(tokenProfile.uuid)
                .withUsages([KeyUsage.Sign, KeyUsage.Verify])
                .build();
            const dispatched: UnknownAction[] = [];
            await mount(
                <CryptographicKeyDetailWithStore
                    cryptographicKey={cryptographicKey}
                    tokenProfile={tokenProfile}
                    onAction={(action) => dispatched.push(action)}
                />,
            );

            await page.getByTestId(`${operation}-button`).click();
            await expect(page.getByRole('dialog', { name: operation === 'sign' ? 'Sign Data' : 'Verify Signature' })).toBeVisible();

            await expect
                .poll(() => dispatched.find(cryptographicOperationActions.listSignatureAttributeDescriptors.match))
                .toEqual(
                    cryptographicOperationActions.listSignatureAttributeDescriptors({
                        tokenInstanceUuid: cryptographicKey.tokenInstanceUuid!,
                        tokenProfileUuid: tokenProfile.uuid,
                        uuid: cryptographicKey.uuid,
                        keyItemUuid: cryptographicKey.items[0].uuid,
                        operation,
                    }),
                );
        });
    }
});
