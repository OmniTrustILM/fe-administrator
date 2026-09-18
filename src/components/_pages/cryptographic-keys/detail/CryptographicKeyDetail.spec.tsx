import type { UnknownAction } from '@reduxjs/toolkit';
import { test, expect } from 'playwright/ct-test';
import CryptographicKeyDetailWithStore from 'components/_pages/cryptographic-keys/detail/CryptographicKeyDetailWithStore';
import { actions as keyActions } from 'ducks/cryptographic-keys';
import { actions as profileActions } from 'ducks/token-profiles';
import type { CryptographicKeyDetailResponseModel } from 'types/cryptographic-keys';
import { ComplianceStatus, KeyAlgorithm, KeyFormat, KeyState, KeyType, KeyUsage, TokenInstanceStatus } from 'types/openapi';
import type { TokenProfileDetailResponseModel } from 'types/token-profiles';

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
