import { test, expect, type Page } from 'playwright/ct-test';
import CryptographicKeyFormWithStore from 'components/_pages/cryptographic-keys/form/CryptographicKeyFormWithStore';
import { AttributeContentType, AttributeType, KeyRequestType, Resource, TokenInstanceStatus } from 'types/openapi';
import { actions as keyActions } from 'ducks/cryptographic-keys';
import { actions as connectorActions } from 'ducks/connectors';
import type { UnknownAction } from '@reduxjs/toolkit';
import type { DataAttributeModel } from 'types/attributes';
import type { TokenProfileResponseModel } from 'types/token-profiles';

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

    test('still enters edit mode from its own route', async ({ mount, page }) => {
        await mount(<CryptographicKeyFormWithStore initialRoute="/keys/detail/key-uuid" routePath="/keys/detail/:id" />);

        await expect(page.getByRole('button', { name: 'Update' })).toBeVisible();
    });
});
