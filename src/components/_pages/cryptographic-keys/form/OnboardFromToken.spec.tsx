import type { UnknownAction } from '@reduxjs/toolkit';
import { test, expect, type Locator, type Page } from 'playwright/ct-test';
import { keyPairMeta } from 'ducks/__fixtures__/token-keys';
import { actions } from 'ducks/token-profiles';
import type { CustomAttributeModel } from 'types/attributes';
import {
    AttributeContentType,
    AttributeType,
    KeyAlgorithm,
    type TokenKeyListResponseDto,
    TokenKeyStatus,
    TokenInstanceStatus,
    type TokenProfileDto,
} from 'types/openapi';
import OnboardFromTokenWithStore from './OnboardFromTokenWithStore';

const profile: TokenProfileDto = {
    uuid: 'profile',
    name: 'Signing',
    tokenInstanceUuid: 'token',
    tokenInstanceName: 'HSM',
    tokenInstanceStatus: TokenInstanceStatus.Activated,
    enabled: true,
    usages: [],
};

const PROFILE_OPTION = 'HSM / Signing';

const page: TokenKeyListResponseDto = {
    items: [
        {
            keyPairMeta: keyPairMeta('onboardable'),
            label: 'signer',
            keyAlgorithm: KeyAlgorithm.Rsa,
            length: 2048,
            status: TokenKeyStatus.Onboardable,
            suggestedName: 'signer',
        },
        {
            keyPairMeta: keyPairMeta('into'),
            label: 'certified',
            keyAlgorithm: KeyAlgorithm.Ecdsa,
            length: 256,
            status: TokenKeyStatus.OnboardableIntoKey,
            inventoryKeyUuid: 'record',
            inventoryKeyName: 'certificate key',
        },
        {
            keyPairMeta: keyPairMeta('held'),
            label: 'held',
            keyAlgorithm: KeyAlgorithm.Ecdsa,
            length: 256,
            status: TokenKeyStatus.InInventory,
            inventoryKeyName: 'existing key',
            reason: 'Key existing key holds the same public key under a token instance, without its private key.',
        },
        {
            keyPairMeta: keyPairMeta('orphan'),
            label: 'orphan',
            keyAlgorithm: KeyAlgorithm.Rsa,
            length: 2048,
            status: TokenKeyStatus.NoPublicKey,
            reason: 'The key storage holds no public key for this key pair.',
        },
        {
            keyPairMeta: keyPairMeta('importing'),
            label: 'importing',
            keyAlgorithm: KeyAlgorithm.Rsa,
            length: 2048,
            status: TokenKeyStatus.ImportInProgress,
        },
        {
            label: 'unidentified',
            keyAlgorithm: KeyAlgorithm.Rsa,
            length: 2048,
            status: TokenKeyStatus.NoUsableId,
        },
    ],
    itemsPerPage: 10,
    pageNumber: 1,
    totalPages: 1,
    totalItems: 6,
};

const department = {
    uuid: '7a1c2e3f-4b5d-4c6e-8f9a-0b1c2d3e4f5a',
    name: 'department',
    type: AttributeType.Custom,
    contentType: AttributeContentType.String,
    properties: { label: 'Department', required: true, readOnly: false, visible: true, list: false, multiSelect: false },
} as CustomAttributeModel;

const firstPage = { tokenInstanceUuid: 'token', tokenProfileUuid: 'profile', pageNumber: 1, itemsPerPage: 10 };

async function chooseProfile(browser: Page) {
    await browser.getByTestId('select-onboardTokenProfileSelect-trigger').click();
    await browser.getByRole('option', { name: PROFILE_OPTION }).click();
}

/** A text field stays read-only until it is focused, so it is clicked before it is filled. */
async function enterText(field: Locator, value: string) {
    await field.click();
    await field.fill(value);
}

test.describe('OnboardFromToken', () => {
    test('offers the profiles whose connector lists keys and lists the chosen one', async ({ mount, page: browser }) => {
        const dispatched: UnknownAction[] = [];
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={page} onAction={(action) => dispatched.push(action)} />);

        await chooseProfile(browser);

        await expect(browser.getByText('existing key', { exact: true })).toBeVisible();
        await expect(browser.getByRole('checkbox', { name: 'Select signer' })).toBeEnabled();
        await expect(browser.getByRole('checkbox', { name: 'Select certified' })).toBeEnabled();
        await expect(browser.getByRole('checkbox', { name: 'Select held' })).toBeDisabled();
        await expect(browser.getByRole('checkbox', { name: 'Select orphan' })).toBeDisabled();
        expect(dispatched.filter(actions.listKeyListableTokenProfiles.match)).toHaveLength(1);
        expect(dispatched.filter(actions.listTokenKeys.match).map((action) => action.payload)).toEqual([firstPage]);
    });

    test('says when no enabled token profile lists keys', async ({ mount, page: browser }) => {
        await mount(<OnboardFromTokenWithStore profiles={[{ ...profile, enabled: false }]} page={page} />);

        await expect(browser.getByText('No enabled token profile lists the keys in its key storage.')).toBeVisible();
    });

    test('offers only the enabled profiles', async ({ mount, page: browser }) => {
        const disabled = { ...profile, uuid: 'disabled', name: 'Retired', enabled: false };
        await mount(<OnboardFromTokenWithStore profiles={[disabled, profile]} page={page} />);

        await browser.getByTestId('select-onboardTokenProfileSelect-trigger').click();

        await expect(browser.getByRole('option', { name: PROFILE_OPTION })).toBeVisible();
        await expect(browser.getByRole('option', { name: 'HSM / Retired' })).toHaveCount(0);
    });

    test('shows why a key pair cannot be onboarded on hovering its status', async ({ mount, page: browser }) => {
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={page} />);
        await chooseProfile(browser);
        await expect(browser.getByRole('tooltip')).toHaveCount(0);

        await browser.getByRole('row').filter({ hasText: 'orphan' }).getByText(TokenKeyStatus.NoPublicKey, { exact: true }).hover();

        await expect(browser.getByRole('tooltip')).toHaveText('The key storage holds no public key for this key pair.');
    });

    test('shows why a key pair is in the inventory on hovering its status, beside the key holding it', async ({ mount, page: browser }) => {
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={page} />);
        await chooseProfile(browser);
        const held = browser.getByRole('row').filter({ hasText: 'held' });
        await expect(held.getByText('existing key', { exact: true })).toBeVisible();

        await held.getByText(TokenKeyStatus.InInventory, { exact: true }).hover();

        await expect(browser.getByRole('tooltip')).toHaveText(
            'Key existing key holds the same public key under a token instance, without its private key.',
        );
    });

    test('shows the reason of the next row on moving down the statuses', async ({ mount, page: browser }) => {
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={page} />);
        await chooseProfile(browser);
        await browser.getByRole('row').filter({ hasText: 'held' }).getByText(TokenKeyStatus.InInventory, { exact: true }).hover();
        await expect(browser.getByRole('tooltip')).toBeVisible();

        await browser.getByRole('row').filter({ hasText: 'orphan' }).getByText(TokenKeyStatus.NoPublicKey, { exact: true }).hover();

        await expect(
            browser.getByRole('tooltip').filter({ hasText: 'The key storage holds no public key for this key pair.' }),
        ).toBeVisible();
    });

    test('shows an empty length for a key pair listed without one', async ({ mount, page: browser }) => {
        const unsized: TokenKeyListResponseDto = {
            ...page,
            items: [
                {
                    keyPairMeta: keyPairMeta('pqc'),
                    label: 'pqc signer',
                    keyAlgorithm: KeyAlgorithm.MlDsa,
                    status: TokenKeyStatus.Onboardable,
                    suggestedName: 'pqc signer',
                },
            ],
            totalItems: 1,
        };
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={unsized} />);

        await chooseProfile(browser);

        await expect(browser.getByRole('row').filter({ hasText: 'pqc signer' }).getByRole('cell').nth(3)).toHaveText('');
    });

    test('shows an empty algorithm for a key listed without one', async ({ mount, page: browser }) => {
        const unread: TokenKeyListResponseDto = {
            ...page,
            items: [{ label: 'unreadable signer', status: TokenKeyStatus.Unreadable }],
            totalItems: 1,
        };
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={unread} />);

        await chooseProfile(browser);

        await expect(browser.getByRole('row').filter({ hasText: 'unreadable signer' }).getByRole('cell').nth(2)).toHaveText('');
    });

    test('shows a key the connector cannot use with its status in red', async ({ mount, page: browser }) => {
        const unusable: TokenKeyListResponseDto = {
            ...page,
            items: [
                { label: 'exotic', keyAlgorithm: KeyAlgorithm.Rsa, status: TokenKeyStatus.UnsupportedKeyType },
                { label: 'damaged', status: TokenKeyStatus.Unreadable },
            ],
            totalItems: 2,
        };
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={unusable} />);

        await chooseProfile(browser);

        await expect(browser.getByText(TokenKeyStatus.UnsupportedKeyType, { exact: true })).toHaveClass(/bg-danger-surface/);
        await expect(browser.getByText(TokenKeyStatus.Unreadable, { exact: true })).toHaveClass(/bg-danger-surface/);
    });

    test('shows a key the key storage no longer holds in gray', async ({ mount, page: browser }) => {
        const vanished: TokenKeyListResponseDto = {
            ...page,
            items: [{ label: 'vanished', status: TokenKeyStatus.Gone }],
            totalItems: 1,
        };
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={vanished} />);

        await chooseProfile(browser);

        await expect(browser.getByText(TokenKeyStatus.Gone, { exact: true })).toHaveClass(/bg-surface-inverse/);
    });

    test('shows why the listing failed in place of the key pairs and lists the page again on retry', async ({ mount, page: browser }) => {
        const dispatched: UnknownAction[] = [];
        await mount(
            <OnboardFromTokenWithStore
                profiles={[profile]}
                page={page}
                listingError="Failed to list the keys in the key storage. down"
                onAction={(action) => dispatched.push(action)}
            />,
        );
        await chooseProfile(browser);

        await expect(browser.getByRole('alert')).toContainText('Failed to list the keys in the key storage. down');
        await expect(browser.getByText('The key storage holds no key pairs.')).toHaveCount(0);
        await browser.getByRole('button', { name: 'Retry' }).click();

        await expect
            .poll(() => dispatched.filter(actions.listTokenKeys.match).map((action) => action.payload))
            .toEqual([firstPage, firstPage]);
    });

    test('onboards only the onboardable key pairs beside one being imported and one without a usable ID', async ({
        mount,
        page: browser,
    }) => {
        const dispatched: UnknownAction[] = [];
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={page} onAction={(action) => dispatched.push(action)} />);
        await chooseProfile(browser);

        await expect(browser.getByText(TokenKeyStatus.ImportInProgress, { exact: true })).toHaveClass(/bg-surface-inverse/);
        await expect(browser.getByText(TokenKeyStatus.NoUsableId, { exact: true })).toHaveClass(/bg-danger-surface/);
        await expect(browser.getByRole('checkbox', { name: 'Select importing' })).toBeDisabled();
        await expect(browser.getByRole('checkbox', { name: 'Select unidentified' })).toBeDisabled();
        await browser.getByRole('checkbox', { name: 'Select signer' }).click();
        await browser.getByRole('button', { name: 'Onboard 1' }).click();

        await expect
            .poll(() => dispatched.filter(actions.onboardTokenKeys.match).map((action) => action.payload.keys))
            .toEqual([[{ keyPairMeta: keyPairMeta('onboardable'), name: 'signer' }]]);
    });

    test('onboards a selected key pair under the name it was given', async ({ mount, page: browser }) => {
        const dispatched: UnknownAction[] = [];
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={page} onAction={(action) => dispatched.push(action)} />);
        await chooseProfile(browser);

        await browser.getByRole('checkbox', { name: 'Select signer' }).click();
        const name = browser.getByRole('textbox', { name: 'Name for signer' });
        await expect(name).toHaveValue('signer');
        await name.click();
        await name.fill('Payments signer');
        await browser.getByRole('button', { name: 'Onboard 1' }).click();

        await expect
            .poll(() => dispatched.filter(actions.onboardTokenKeys.match).map((action) => action.payload))
            .toEqual([
                {
                    tokenInstanceUuid: 'token',
                    tokenProfileUuid: 'profile',
                    keys: [{ keyPairMeta: keyPairMeta('onboardable'), name: 'Payments signer' }],
                    customAttributes: [],
                },
            ]);
    });

    test('sends a blank name as typed, for Core to name the key', async ({ mount, page: browser }) => {
        const dispatched: UnknownAction[] = [];
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={page} onAction={(action) => dispatched.push(action)} />);
        await chooseProfile(browser);

        await browser.getByRole('checkbox', { name: 'Select signer' }).click();
        const name = browser.getByRole('textbox', { name: 'Name for signer' });
        await name.click();
        await name.fill('  ');
        await browser.getByRole('button', { name: 'Onboard 1' }).click();

        await expect
            .poll(() => dispatched.filter(actions.onboardTokenKeys.match).map((action) => action.payload.keys))
            .toEqual([[{ keyPairMeta: keyPairMeta('onboardable'), name: '  ' }]]);
    });

    test('onboards a key pair into the key holding its public key under that key name', async ({ mount, page: browser }) => {
        const dispatched: UnknownAction[] = [];
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={page} onAction={(action) => dispatched.push(action)} />);
        await chooseProfile(browser);

        await browser.getByRole('checkbox', { name: 'Select certified' }).click();

        await expect(browser.getByText('Into certificate key')).toBeVisible();
        await expect(browser.getByRole('textbox', { name: 'Name for certified' })).toHaveCount(0);
        await browser.getByRole('button', { name: 'Onboard 1' }).click();
        await expect
            .poll(() => dispatched.filter(actions.onboardTokenKeys.match).map((action) => action.payload.keys))
            .toEqual([[{ keyPairMeta: keyPairMeta('into') }]]);
    });

    test('sends the key custom attributes with the onboarding', async ({ mount, page: browser }) => {
        const dispatched: UnknownAction[] = [];
        await mount(
            <OnboardFromTokenWithStore
                profiles={[profile]}
                page={page}
                keyCustomAttributes={[department]}
                onAction={(action) => dispatched.push(action)}
            />,
        );
        await chooseProfile(browser);

        await browser.getByRole('checkbox', { name: 'Select signer' }).click();
        await enterText(browser.getByTestId('text-input-__attributes__customOnboardKey__.department'), 'Payments');
        await browser.getByRole('button', { name: 'Onboard 1' }).click();

        await expect
            .poll(() =>
                dispatched
                    .filter(actions.onboardTokenKeys.match)
                    .flatMap((action) => action.payload.customAttributes ?? [])
                    .map((attribute) => [attribute.name, attribute.content?.[0]?.data]),
            )
            .toEqual([['department', 'Payments']]);
    });

    test('holds the onboarding back while a required key custom attribute is empty', async ({ mount, page: browser }) => {
        const dispatched: UnknownAction[] = [];
        await mount(
            <OnboardFromTokenWithStore
                profiles={[profile]}
                page={page}
                keyCustomAttributes={[department]}
                onAction={(action) => dispatched.push(action)}
            />,
        );
        await chooseProfile(browser);

        await browser.getByRole('checkbox', { name: 'Select signer' }).click();
        await browser.getByRole('button', { name: 'Onboard 1' }).click();

        await expect(browser.getByText('Required Field')).toBeVisible();
        expect(dispatched.filter(actions.onboardTokenKeys.match)).toEqual([]);
    });

    test('shows what became of each key pair and offers to finish once one was onboarded', async ({ mount, page: browser }) => {
        let done = false;
        await mount(
            <OnboardFromTokenWithStore
                profiles={[profile]}
                page={page}
                onboardingResults={[
                    {
                        keyPairMeta: keyPairMeta('onboardable'),
                        onboarded: true,
                        intoExistingKey: false,
                        keyUuid: 'key-1',
                        keyName: 'signer',
                    },
                    {
                        keyPairMeta: keyPairMeta('into'),
                        onboarded: true,
                        intoExistingKey: true,
                        keyUuid: 'record',
                        keyName: 'certificate key',
                    },
                ]}
                onDone={() => {
                    done = true;
                }}
            />,
        );
        await chooseProfile(browser);
        await expect(browser.getByRole('button', { name: 'Done' })).toHaveCount(0);

        await browser.getByRole('checkbox', { name: 'Select signer' }).click();
        await browser.getByRole('checkbox', { name: 'Select certified' }).click();
        await browser.getByRole('button', { name: 'Onboard 2' }).click();

        const results = browser.getByRole('list', { name: 'Onboarding results' });
        await expect(results).toContainText('signer: onboarded as signer');
        await expect(results).toContainText('certified: private key added to key certificate key');
        await browser.getByRole('button', { name: 'Done' }).click();
        await expect.poll(() => done).toBe(true);
    });

    test('shows a skipped key pair with its reason and keeps it selected', async ({ mount, page: browser }) => {
        await mount(
            <OnboardFromTokenWithStore
                profiles={[profile]}
                page={page}
                onboardingResults={[
                    {
                        keyPairMeta: keyPairMeta('onboardable'),
                        onboarded: false,
                        intoExistingKey: false,
                        reason: 'Another key is named signer.',
                    },
                ]}
            />,
        );
        await chooseProfile(browser);

        await browser.getByRole('checkbox', { name: 'Select signer' }).click();
        await browser.getByRole('button', { name: 'Onboard 1' }).click();

        await expect(browser.getByRole('list', { name: 'Onboarding results' })).toContainText('signer: Another key is named signer.');
        await expect(browser.getByRole('checkbox', { name: 'Select signer' })).toBeChecked();
        await expect(browser.getByRole('button', { name: 'Done' })).toHaveCount(0);
    });

    test('lists the page again and clears the selection after an onboarding', async ({ mount, page: browser }) => {
        const dispatched: UnknownAction[] = [];
        await mount(
            <OnboardFromTokenWithStore
                profiles={[profile]}
                page={page}
                onboardingResults={[
                    {
                        keyPairMeta: keyPairMeta('onboardable'),
                        onboarded: true,
                        intoExistingKey: false,
                        keyUuid: 'key-1',
                        keyName: 'signer',
                    },
                ]}
                onAction={(action) => dispatched.push(action)}
            />,
        );
        await chooseProfile(browser);

        await browser.getByRole('checkbox', { name: 'Select signer' }).click();
        await expect(browser.getByRole('checkbox', { name: 'Select signer' })).toBeChecked();
        await browser.getByRole('button', { name: 'Onboard 1' }).click();

        await expect.poll(() => dispatched.filter(actions.listTokenKeys.match).length).toBe(2);
        await expect(browser.getByRole('checkbox', { name: 'Select signer' })).not.toBeChecked();
        await expect(browser.getByRole('button', { name: 'Onboard', exact: true })).toBeDisabled();
    });

    test('holds Cancel and the profile while an onboarding runs', async ({ mount, page: browser }) => {
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={page} />);
        await chooseProfile(browser);

        await browser.getByRole('checkbox', { name: 'Select signer' }).click();
        await browser.getByRole('button', { name: 'Onboard 1' }).click();

        await expect(browser.getByRole('button', { name: 'Onboarding...' })).toBeVisible();
        await expect(browser.getByRole('button', { name: 'Cancel' })).toBeDisabled();
        await expect(browser.getByTestId('select-onboardTokenProfileSelect-trigger')).toBeDisabled();
    });

    test('says a private key joined an existing key the caller may not see', async ({ mount, page: browser }) => {
        await mount(
            <OnboardFromTokenWithStore
                profiles={[profile]}
                page={page}
                onboardingResults={[{ keyPairMeta: keyPairMeta('into'), onboarded: true, intoExistingKey: true }]}
            />,
        );
        await chooseProfile(browser);

        await browser.getByRole('checkbox', { name: 'Select certified' }).click();
        await browser.getByRole('button', { name: 'Onboard 1' }).click();

        await expect(browser.getByRole('list', { name: 'Onboarding results' })).toContainText(
            'certified: private key added to an existing key',
        );
    });

    test('follows a selected key pair whose public key no key holds any more', async ({ mount, page: browser }) => {
        const dispatched: UnknownAction[] = [];
        const released = page.items.map((key) =>
            key.label === 'certified'
                ? {
                      ...key,
                      status: TokenKeyStatus.Onboardable,
                      inventoryKeyUuid: undefined,
                      inventoryKeyName: undefined,
                      suggestedName: 'certified',
                  }
                : key,
        );
        await mount(
            <OnboardFromTokenWithStore
                profiles={[profile]}
                page={page}
                relistedPage={{ ...page, items: released }}
                onboardingResults={[
                    { keyPairMeta: keyPairMeta('into'), onboarded: false, intoExistingKey: false, reason: 'The key changed.' },
                ]}
                onAction={(action) => dispatched.push(action)}
            />,
        );
        await chooseProfile(browser);
        await browser.getByRole('checkbox', { name: 'Select certified' }).click();
        await expect(browser.getByText('Into certificate key')).toBeVisible();

        await browser.getByRole('button', { name: 'Onboard 1' }).click();

        await expect(browser.getByRole('textbox', { name: 'Name for certified' })).toHaveValue('certified');
        await browser.getByRole('button', { name: 'Onboard 1' }).click();
        await expect
            .poll(() => dispatched.filter(actions.onboardTokenKeys.match).map((action) => action.payload.keys))
            .toEqual([[{ keyPairMeta: keyPairMeta('into') }], [{ keyPairMeta: keyPairMeta('into'), name: 'certified' }]]);
    });

    test('follows a selected key pair whose public key a key came to hold', async ({ mount, page: browser }) => {
        const dispatched: UnknownAction[] = [];
        const claimed = page.items.map((key) =>
            key.label === 'signer'
                ? { ...key, status: TokenKeyStatus.OnboardableIntoKey, inventoryKeyUuid: 'uploaded', inventoryKeyName: 'uploaded key' }
                : key,
        );
        await mount(
            <OnboardFromTokenWithStore
                profiles={[profile]}
                page={page}
                relistedPage={{ ...page, items: claimed }}
                onboardingResults={[
                    { keyPairMeta: keyPairMeta('onboardable'), onboarded: false, intoExistingKey: false, reason: 'Held meanwhile.' },
                ]}
                onAction={(action) => dispatched.push(action)}
            />,
        );
        await chooseProfile(browser);
        await browser.getByRole('checkbox', { name: 'Select signer' }).click();
        await browser.getByRole('button', { name: 'Onboard 1' }).click();

        await expect(browser.getByText('Into uploaded key')).toBeVisible();
        await expect(browser.getByRole('textbox', { name: 'Name for signer' })).toHaveCount(0);
        await browser.getByRole('button', { name: 'Onboard 1' }).click();
        await expect
            .poll(() => dispatched.filter(actions.onboardTokenKeys.match).map((action) => action.payload.keys))
            .toEqual([[{ keyPairMeta: keyPairMeta('onboardable'), name: 'signer' }], [{ keyPairMeta: keyPairMeta('onboardable') }]]);
    });

    test('cancels', async ({ mount, page: browser }) => {
        let cancelled = false;
        await mount(
            <OnboardFromTokenWithStore
                profiles={[profile]}
                page={page}
                onCancel={() => {
                    cancelled = true;
                }}
            />,
        );

        await browser.getByRole('button', { name: 'Cancel' }).click();

        await expect.poll(() => cancelled).toBe(true);
    });
});
