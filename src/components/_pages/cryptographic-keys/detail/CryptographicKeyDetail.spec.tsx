import type { UnknownAction } from '@reduxjs/toolkit';
import { test, expect } from 'playwright/ct-test';
import CryptographicKeyDetailWithStore from 'components/_pages/cryptographic-keys/detail/CryptographicKeyDetailWithStore';
import { actions as keyActions } from 'ducks/cryptographic-keys';
import { actions as cryptographicOperationActions } from 'ducks/cryptographic-operations';
import { actions as profileActions } from 'ducks/token-profiles';
import type { CryptographicKeyDetailResponseModel } from 'types/cryptographic-keys';
import {
    AttributeContentType,
    AttributeType,
    ComplianceStatus,
    KeyAlgorithm,
    KeyFormat,
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
