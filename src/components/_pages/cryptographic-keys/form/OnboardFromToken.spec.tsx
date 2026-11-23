import type { UnknownAction } from '@reduxjs/toolkit';
import { test, expect, type Locator, type Page } from 'playwright/ct-test';
import { keyPairMeta } from 'ducks/__fixtures__/token-keys';
import { actions as tokenKeyActions } from 'ducks/token-keys';
import { actions as tokenProfileActions } from 'ducks/token-profiles';
import { handleOf } from 'ducks/transform/token-keys';
import type { CustomAttributeModel } from 'types/attributes';
import {
    AttributeContentType,
    AttributeType,
    KeyAlgorithm,
    type TokenKeyListResponseDto,
    TokenKeyStatus,
    TokenInstanceStatus,
    TokenKeyOnboardingOutcome,
    type TokenProfileDto,
} from 'types/openapi';
import OnboardFromTokenWithStore, { type OnboardFromTokenStoreHolder } from './OnboardFromTokenWithStore';

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

const archive: TokenProfileDto = { ...profile, uuid: 'archive', name: 'Archive' };

const page: TokenKeyListResponseDto = {
    items: [
        {
            keyPairMeta: keyPairMeta('onboardable'),
            storageName: 'signer',
            keyAlgorithm: KeyAlgorithm.Rsa,
            length: 2048,
            status: TokenKeyStatus.Onboardable,
            suggestedName: 'signer',
        },
        {
            keyPairMeta: keyPairMeta('into'),
            storageName: 'certified',
            keyAlgorithm: KeyAlgorithm.Ecdsa,
            length: 256,
            status: TokenKeyStatus.OnboardableIntoKey,
            inventoryKeyUuid: 'record',
            inventoryKeyName: 'certificate key',
        },
        {
            keyPairMeta: keyPairMeta('held'),
            storageName: 'held',
            keyAlgorithm: KeyAlgorithm.Ecdsa,
            length: 256,
            status: TokenKeyStatus.InInventory,
            inventoryKeyName: 'existing key',
            reason: "Key 'existing key' holds the same public key under a token instance, without its private key.",
        },
        {
            keyPairMeta: keyPairMeta('orphan'),
            storageName: 'orphan',
            keyAlgorithm: KeyAlgorithm.Rsa,
            length: 2048,
            status: TokenKeyStatus.PublicKeyUnavailable,
            reason: 'The key storage holds no public key for this key pair.',
        },
        {
            keyPairMeta: keyPairMeta('importing'),
            storageName: 'importing',
            keyAlgorithm: KeyAlgorithm.Rsa,
            length: 2048,
            status: TokenKeyStatus.ImportInProgress,
        },
        {
            storageName: 'unidentified',
            keyAlgorithm: KeyAlgorithm.Rsa,
            length: 2048,
            status: TokenKeyStatus.Unaddressable,
        },
    ],
    itemsPerPage: 10,
    pageNumber: 1,
    totalPages: 1,
    totalItems: 6,
};

const secondPage: TokenKeyListResponseDto = {
    items: [
        {
            keyPairMeta: keyPairMeta('archiving'),
            storageName: 'archiver',
            keyAlgorithm: KeyAlgorithm.Rsa,
            length: 2048,
            status: TokenKeyStatus.Onboardable,
            suggestedName: 'signer',
        },
    ],
    itemsPerPage: 10,
    pageNumber: 2,
    totalPages: 2,
    totalItems: 7,
};

const department = {
    uuid: '7a1c2e3f-4b5d-4c6e-8f9a-0b1c2d3e4f5a',
    name: 'department',
    type: AttributeType.Custom,
    contentType: AttributeContentType.String,
    properties: { label: 'Department', required: true, readOnly: false, visible: true, list: false, multiSelect: false },
} as CustomAttributeModel;

const firstPage = { tokenInstanceUuid: 'token', tokenProfileUuid: 'profile', pageNumber: 1, itemsPerPage: 10 };

async function chooseProfile(browser: Page, option = PROFILE_OPTION) {
    await browser.getByTestId('select-onboardTokenProfileSelect-trigger').click();
    await browser.getByRole('option', { name: option }).click();
}

function sentKeys(dispatched: readonly UnknownAction[]) {
    return dispatched.filter(tokenKeyActions.onboardTokenKeys.match).map((action) => action.payload.keys);
}

async function onboardSignerAndArchiverFromTwoPages(browser: Page) {
    await chooseProfile(browser);
    await browser.getByRole('checkbox', { name: 'Select signer' }).click();
    await browser.getByTestId('pagination-next').click();
    await browser.getByRole('checkbox', { name: 'Select archiver' }).click();
    await browser.getByRole('button', { name: 'Onboard', exact: true }).click();
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
        await expect(browser.getByRole('checkbox', { name: 'Select held' })).toHaveCount(0);
        await expect(browser.getByRole('checkbox', { name: 'Select orphan' })).toHaveCount(0);
        expect(dispatched.filter(tokenProfileActions.listKeyListableTokenProfiles.match)).toHaveLength(1);
        expect(dispatched.filter(tokenKeyActions.listTokenKeys.match).map((action) => action.payload)).toEqual([firstPage]);
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
        await expect(browser.getByRole('dialog')).toHaveCount(0);

        await browser
            .getByRole('row')
            .filter({ hasText: 'orphan' })
            .getByText(TokenKeyStatus.PublicKeyUnavailable, { exact: true })
            .hover();

        await expect(browser.getByRole('dialog')).toHaveText('The key storage holds no public key for this key pair.');
    });

    test('shows why a key pair cannot be onboarded on pressing Enter on its status', async ({ mount, page: browser }) => {
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={page} />);
        await chooseProfile(browser);

        await browser.getByRole('row').filter({ hasText: 'orphan' }).getByRole('button').focus();
        await browser.keyboard.press('Enter');

        await expect(browser.getByRole('dialog')).toHaveText('The key storage holds no public key for this key pair.');
    });

    test.describe('on a touchscreen', () => {
        test.use({ hasTouch: true });

        test('shows why a key pair cannot be onboarded on tapping its status', async ({ mount, page: browser }) => {
            await mount(<OnboardFromTokenWithStore profiles={[profile]} page={page} />);
            await chooseProfile(browser);

            await browser.getByRole('row').filter({ hasText: 'orphan' }).getByRole('button').tap();

            await expect(browser.getByRole('dialog')).toHaveText('The key storage holds no public key for this key pair.');
        });
    });

    test("shows the connector's diagnostic after the reason on hovering a status", async ({ mount, page: browser }) => {
        const connectorDiagnostic = 'Object handle 42 carries no CKA_ID.';
        const unaddressable: TokenKeyListResponseDto = {
            ...page,
            items: [
                {
                    storageName: 'unidentified',
                    status: TokenKeyStatus.Unaddressable,
                    reason: 'The connector cannot address this key pair.',
                    diagnostic: connectorDiagnostic,
                },
            ],
            totalItems: 1,
        };
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={unaddressable} />);
        await chooseProfile(browser);

        await browser.getByText(TokenKeyStatus.Unaddressable, { exact: true }).hover();

        await expect(browser.getByRole('dialog')).toHaveText(
            `The connector cannot address this key pair.Connector: ${connectorDiagnostic}`,
        );
    });

    test("shows the connector's diagnostic on hovering a status that has no reason", async ({ mount, page: browser }) => {
        const connectorDiagnostic = 'CKA_SENSITIVE is set on the private key.';
        const refused: TokenKeyListResponseDto = {
            ...page,
            items: [{ storageName: 'locked', status: TokenKeyStatus.Refused, diagnostic: connectorDiagnostic }],
            totalItems: 1,
        };
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={refused} />);
        await chooseProfile(browser);

        await browser.getByText(TokenKeyStatus.Refused, { exact: true }).hover();

        await expect(browser.getByRole('dialog')).toHaveText(`Connector: ${connectorDiagnostic}`);
    });

    test('shows why a key pair is in the inventory on hovering its status, beside the key holding it', async ({ mount, page: browser }) => {
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={page} />);
        await chooseProfile(browser);
        const held = browser.getByRole('row').filter({ hasText: 'held' });
        await expect(held.getByText('existing key', { exact: true })).toBeVisible();

        await held.getByText(TokenKeyStatus.InInventory, { exact: true }).hover();

        await expect(browser.getByRole('dialog')).toHaveText(
            "Key 'existing key' holds the same public key under a token instance, without its private key.",
        );
    });

    test('shows the reason of the next row on moving down the statuses', async ({ mount, page: browser }) => {
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={page} />);
        await chooseProfile(browser);
        await browser.getByRole('row').filter({ hasText: 'held' }).getByText(TokenKeyStatus.InInventory, { exact: true }).hover();
        await expect(browser.getByRole('dialog')).toBeVisible();

        await browser
            .getByRole('row')
            .filter({ hasText: 'orphan' })
            .getByText(TokenKeyStatus.PublicKeyUnavailable, { exact: true })
            .hover();

        await expect(
            browser.getByRole('dialog').filter({ hasText: 'The key storage holds no public key for this key pair.' }),
        ).toBeVisible();
    });

    test('heads the columns with the storage name and the algorithm', async ({ mount, page: browser }) => {
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={page} />);

        await chooseProfile(browser);

        await expect(browser.getByRole('columnheader')).toHaveText(['', 'Storage name', 'Algorithm', 'Status', 'Onboard as']);
    });

    test('labels each key pair by its parameter set or by its algorithm and size', async ({ mount, page: browser }) => {
        const described: TokenKeyListResponseDto = {
            ...page,
            items: [
                { storageName: 'rsa signer', keyAlgorithm: KeyAlgorithm.Rsa, length: 2048, status: TokenKeyStatus.Onboardable },
                {
                    storageName: 'ecdsa signer',
                    keyAlgorithm: KeyAlgorithm.Ecdsa,
                    parameterSet: 'P-384',
                    length: 384,
                    status: TokenKeyStatus.Onboardable,
                },
                {
                    storageName: 'pqc signer',
                    keyAlgorithm: KeyAlgorithm.MlDsa,
                    parameterSet: 'ML-DSA-65',
                    length: 15616,
                    status: TokenKeyStatus.Onboardable,
                },
            ],
            totalItems: 3,
        };
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={described} />);

        await chooseProfile(browser);

        await expect(browser.getByRole('row').filter({ hasText: 'signer' }).locator('td:nth-child(3)')).toHaveText([
            'RSA 2048',
            'ECDSA P-384',
            'ML-DSA-65',
        ]);
    });

    test('labels an unsized key pair by its algorithm alone', async ({ mount, page: browser }) => {
        const unsized: TokenKeyListResponseDto = {
            ...page,
            items: [
                {
                    keyPairMeta: keyPairMeta('pqc'),
                    storageName: 'pqc signer',
                    keyAlgorithm: KeyAlgorithm.MlDsa,
                    status: TokenKeyStatus.Onboardable,
                    suggestedName: 'pqc signer',
                },
            ],
            totalItems: 1,
        };
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={unsized} />);

        await chooseProfile(browser);

        await expect(browser.getByRole('row').filter({ hasText: 'pqc signer' }).getByRole('cell').nth(2)).toHaveText('ML-DSA');
    });

    test('shows an empty algorithm for a key listed without one', async ({ mount, page: browser }) => {
        const unread: TokenKeyListResponseDto = {
            ...page,
            items: [{ storageName: 'unreadable signer', status: TokenKeyStatus.Unreadable }],
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
                { storageName: 'exotic', keyAlgorithm: KeyAlgorithm.Rsa, status: TokenKeyStatus.UnsupportedKeyType },
                { storageName: 'damaged', status: TokenKeyStatus.Unreadable },
                { storageName: 'locked', status: TokenKeyStatus.Refused },
            ],
            totalItems: 3,
        };
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={unusable} />);

        await chooseProfile(browser);

        await expect(browser.getByText(TokenKeyStatus.UnsupportedKeyType, { exact: true })).toHaveClass(/bg-danger-surface/);
        await expect(browser.getByText(TokenKeyStatus.Unreadable, { exact: true })).toHaveClass(/bg-danger-surface/);
        await expect(browser.getByText(TokenKeyStatus.Refused, { exact: true })).toHaveClass(/bg-danger-surface/);
    });

    test('shows a key the key storage no longer holds in gray', async ({ mount, page: browser }) => {
        const vanished: TokenKeyListResponseDto = {
            ...page,
            items: [{ storageName: 'vanished', status: TokenKeyStatus.Gone }],
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
            .poll(() => dispatched.filter(tokenKeyActions.listTokenKeys.match).map((action) => action.payload))
            .toEqual([firstPage, firstPage]);
    });

    test('onboards only the onboardable key pairs beside one being imported and one Core cannot address', async ({
        mount,
        page: browser,
    }) => {
        const dispatched: UnknownAction[] = [];
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={page} onAction={(action) => dispatched.push(action)} />);
        await chooseProfile(browser);

        await expect(browser.getByText(TokenKeyStatus.ImportInProgress, { exact: true })).toHaveClass(/bg-surface-inverse/);
        await expect(browser.getByText(TokenKeyStatus.Unaddressable, { exact: true })).toHaveClass(/bg-danger-surface/);
        await expect(browser.getByRole('checkbox', { name: 'Select importing' })).toHaveCount(0);
        await expect(browser.getByRole('checkbox', { name: 'Select unidentified' })).toHaveCount(0);
        await browser.getByRole('checkbox', { name: 'Select signer' }).click();
        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();

        await expect.poll(() => sentKeys(dispatched)).toEqual([[{ keyPairMeta: keyPairMeta('onboardable') }]]);
    });

    test('leaves the name to Core while the suggested name is left as shown', async ({ mount, page: browser }) => {
        const suggestedName = 'signer (ab12cd34)';
        const suggesting = { ...page, items: [{ ...page.items[0], suggestedName }] };
        const dispatched: UnknownAction[] = [];
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={suggesting} onAction={(action) => dispatched.push(action)} />);
        await chooseProfile(browser);

        await browser.getByRole('checkbox', { name: 'Select signer' }).click();
        await expect(browser.getByRole('textbox', { name: 'Name for signer' })).toHaveValue(suggestedName);
        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();

        await expect.poll(() => sentKeys(dispatched)).toEqual([[{ keyPairMeta: keyPairMeta('onboardable') }]]);
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
        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();

        await expect
            .poll(() => dispatched.filter(tokenKeyActions.onboardTokenKeys.match).map((action) => action.payload))
            .toEqual([
                {
                    tokenInstanceUuid: 'token',
                    tokenProfileUuid: 'profile',
                    keys: [{ keyPairMeta: keyPairMeta('onboardable'), name: 'Payments signer' }],
                    captions: { [handleOf(keyPairMeta('onboardable'))]: 'signer' },
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
        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();

        const expected = [[{ keyPairMeta: keyPairMeta('onboardable'), name: '  ' }]];
        await expect.poll(() => sentKeys(dispatched)).toEqual(expected);
        expect(sentKeys(dispatched)).toEqual(expected);
    });

    test('onboards a key pair into the key holding its public key under that key name', async ({ mount, page: browser }) => {
        const dispatched: UnknownAction[] = [];
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={page} onAction={(action) => dispatched.push(action)} />);
        await chooseProfile(browser);

        await browser.getByRole('checkbox', { name: 'Select certified' }).click();

        await expect(browser.getByText('Into certificate key')).toBeVisible();
        await expect(browser.getByRole('textbox', { name: 'Name for certified' })).toHaveCount(0);
        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();
        await expect.poll(() => sentKeys(dispatched)).toEqual([[{ keyPairMeta: keyPairMeta('into') }]]);
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
        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();

        const sentAttributes = () =>
            dispatched
                .filter(tokenKeyActions.onboardTokenKeys.match)
                .flatMap((action) => action.payload.customAttributes ?? [])
                .map((attribute) => [attribute.name, attribute.content?.[0]?.data]);
        await expect.poll(sentAttributes).toEqual([['department', 'Payments']]);
        expect(sentAttributes()).toEqual([['department', 'Payments']]);
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
        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();

        await expect(browser.getByText('Required Field')).toBeVisible();
        expect(dispatched.filter(tokenKeyActions.onboardTokenKeys.match)).toEqual([]);
    });

    test('offers to finish once a key pair was onboarded', async ({ mount, page: browser }) => {
        let done = false;
        await mount(
            <OnboardFromTokenWithStore
                profiles={[profile]}
                page={page}
                onboardingResults={[
                    {
                        keyPairMeta: keyPairMeta('onboardable'),
                        outcome: TokenKeyOnboardingOutcome.Onboarded,
                        keyUuid: 'key-1',
                        keyName: 'signer',
                    },
                    {
                        keyPairMeta: keyPairMeta('into'),
                        outcome: TokenKeyOnboardingOutcome.JoinedExistingKey,
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
        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();

        await browser.getByRole('button', { name: 'Done' }).click();
        await expect.poll(() => done).toBe(true);
    });

    test('offers to finish once a key pair joined an existing key, and drops it from the selection', async ({ mount, page: browser }) => {
        let done = false;
        const dispatched: UnknownAction[] = [];
        await mount(
            <OnboardFromTokenWithStore
                profiles={[profile]}
                page={page}
                onboardingResults={[
                    {
                        keyPairMeta: keyPairMeta('into'),
                        outcome: TokenKeyOnboardingOutcome.JoinedExistingKey,
                        keyUuid: 'record',
                        keyName: 'certificate key',
                    },
                ]}
                onAction={(action) => dispatched.push(action)}
                onDone={() => {
                    done = true;
                }}
            />,
        );
        await chooseProfile(browser);

        await browser.getByRole('checkbox', { name: 'Select certified' }).click();
        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();

        await expect.poll(() => dispatched.filter(tokenKeyActions.listTokenKeysSuccess.match).length).toBe(2);
        await expect(browser.getByRole('checkbox', { name: 'Select certified' })).not.toBeChecked();
        await browser.getByRole('button', { name: 'Done' }).click();
        await expect.poll(() => done).toBe(true);
    });

    test('keeps a key pair whose name is taken selected and flags its name with the reason', async ({ mount, page: browser }) => {
        const takenName = 'Payments signer';
        const nameTakenReason = `A key '${takenName}' already exists.`;
        const dispatched: UnknownAction[] = [];
        await mount(
            <OnboardFromTokenWithStore
                profiles={[profile]}
                page={page}
                onboardingResults={[
                    { keyPairMeta: keyPairMeta('onboardable'), outcome: TokenKeyOnboardingOutcome.NameTaken, reason: nameTakenReason },
                ]}
                onAction={(action) => dispatched.push(action)}
            />,
        );
        await chooseProfile(browser);

        await browser.getByRole('checkbox', { name: 'Select signer' }).click();
        const name = browser.getByRole('textbox', { name: 'Name for signer' });
        await enterText(name, takenName);
        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();

        await expect.poll(() => dispatched.filter(tokenKeyActions.listTokenKeysSuccess.match).length).toBe(2);
        expect(sentKeys(dispatched)).toEqual([[{ keyPairMeta: keyPairMeta('onboardable'), name: takenName }]]);
        await expect(browser.getByRole('checkbox', { name: 'Select signer' })).toBeChecked();
        await expect(name).toHaveAttribute('aria-invalid', 'true');
        await expect(name).toHaveAccessibleDescription(nameTakenReason);
        await expect(browser.getByRole('button', { name: 'Done' })).toHaveCount(0);
    });

    test('clears the name flag once another name is typed', async ({ mount, page: browser }) => {
        await mount(
            <OnboardFromTokenWithStore
                profiles={[profile]}
                page={page}
                onboardingResults={[
                    {
                        keyPairMeta: keyPairMeta('onboardable'),
                        outcome: TokenKeyOnboardingOutcome.NameTaken,
                        reason: "A key 'signer' already exists.",
                    },
                ]}
            />,
        );
        await chooseProfile(browser);
        await browser.getByRole('checkbox', { name: 'Select signer' }).click();
        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();
        const name = browser.getByRole('textbox', { name: 'Name for signer' });
        await expect(name).toHaveAttribute('aria-invalid', 'true');

        await enterText(name, 'signer-2');

        await expect(name).not.toHaveAttribute('aria-invalid');
        await expect(browser.getByText("A key 'signer' already exists.")).toHaveCount(0);
    });

    test('leaves a name typed while the onboarding ran unflagged when Core finds the sent name taken', async ({ mount, page: browser }) => {
        const dispatched: UnknownAction[] = [];
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={page} onAction={(action) => dispatched.push(action)} />);
        await chooseProfile(browser);
        await browser.getByRole('checkbox', { name: 'Select signer' }).click();
        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();
        await expect(browser.getByRole('button', { name: 'Onboarding...' })).toBeVisible();
        const name = browser.getByRole('textbox', { name: 'Name for signer' });
        await enterText(name, 'signer-2');

        const nameTaken = tokenKeyActions.onboardTokenKeysSuccess({
            results: [
                {
                    keyPairMeta: keyPairMeta('onboardable'),
                    outcome: TokenKeyOnboardingOutcome.NameTaken,
                    reason: "A key 'signer' already exists.",
                },
            ],
        });
        await browser.evaluate((answer) => {
            (globalThis as unknown as OnboardFromTokenStoreHolder).__onboardFromTokenStore__.dispatch(answer);
        }, nameTaken);

        await expect.poll(() => dispatched.filter(tokenKeyActions.listTokenKeysSuccess.match).length).toBe(2);
        await expect(name).toHaveValue('signer-2');
        await expect(name).not.toHaveAttribute('aria-invalid');
        await expect(browser.getByText("A key 'signer' already exists.")).toHaveCount(0);
    });

    test('keeps a blocked key pair selected without flagging its name', async ({ mount, page: browser }) => {
        const dispatched: UnknownAction[] = [];
        await mount(
            <OnboardFromTokenWithStore
                profiles={[profile]}
                page={page}
                onboardingResults={[
                    {
                        keyPairMeta: keyPairMeta('onboardable'),
                        outcome: TokenKeyOnboardingOutcome.Blocked,
                        status: TokenKeyStatus.ImportInProgress,
                        reason: 'An import of this key pair is in progress.',
                    },
                ]}
                onAction={(action) => dispatched.push(action)}
            />,
        );
        await chooseProfile(browser);

        await browser.getByRole('checkbox', { name: 'Select signer' }).click();
        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();

        await expect.poll(() => dispatched.filter(tokenKeyActions.listTokenKeysSuccess.match).length).toBe(2);
        await expect(browser.getByRole('checkbox', { name: 'Select signer' })).toBeChecked();
        await expect(browser.getByRole('textbox', { name: 'Name for signer' })).not.toHaveAttribute('aria-invalid');
    });

    test('names a key pair with a blank storage name by its fingerprint', async ({ mount, page: browser }) => {
        const nameless: TokenKeyListResponseDto = {
            ...page,
            items: [
                {
                    keyPairMeta: keyPairMeta('nameless'),
                    storageName: '',
                    fingerprint: '5f2b9c',
                    keyAlgorithm: KeyAlgorithm.Rsa,
                    length: 2048,
                    status: TokenKeyStatus.Onboardable,
                    suggestedName: 'key (5f2b9c)',
                },
            ],
            totalItems: 1,
        };
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={nameless} />);
        await chooseProfile(browser);

        const row = browser.getByRole('row').filter({ has: browser.getByRole('checkbox', { name: 'Select 5f2b9c' }) });
        await expect(row.getByRole('cell').nth(1)).toHaveText('5f2b9c');
    });

    test('drops a selected key pair from the selection once a later listing finds it in the inventory', async ({
        mount,
        page: browser,
    }) => {
        const dispatched: UnknownAction[] = [];
        const onboardedMeanwhile = page.items.map((key) =>
            key.storageName === 'signer' ? { ...key, status: TokenKeyStatus.InInventory, inventoryKeyName: 'signer' } : key,
        );
        await mount(
            <OnboardFromTokenWithStore
                profiles={[profile]}
                page={page}
                relistedPage={{ ...page, items: onboardedMeanwhile }}
                onboardingResults={[
                    {
                        keyPairMeta: keyPairMeta('onboardable'),
                        outcome: TokenKeyOnboardingOutcome.Blocked,
                        status: TokenKeyStatus.InInventory,
                        reason: 'Held meanwhile.',
                    },
                ]}
                onAction={(action) => dispatched.push(action)}
            />,
        );
        await chooseProfile(browser);
        await browser.getByRole('checkbox', { name: 'Select signer' }).click();
        await browser.getByRole('checkbox', { name: 'Select certified' }).click();
        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();

        await expect(browser.getByRole('checkbox', { name: 'Select signer' })).toHaveCount(0);
        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();
        const expected = [
            [{ keyPairMeta: keyPairMeta('onboardable') }, { keyPairMeta: keyPairMeta('into') }],
            [{ keyPairMeta: keyPairMeta('into') }],
        ];
        await expect.poll(() => sentKeys(dispatched)).toEqual(expected);
        expect(sentKeys(dispatched)).toEqual(expected);
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
                        outcome: TokenKeyOnboardingOutcome.Onboarded,
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
        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();

        await expect.poll(() => dispatched.filter(tokenKeyActions.listTokenKeys.match).length).toBe(2);
        await expect(browser.getByRole('checkbox', { name: 'Select signer' })).not.toBeChecked();
        await expect(browser.getByRole('button', { name: 'Onboard', exact: true })).toBeDisabled();
    });

    test('holds Cancel and the profile while an onboarding runs', async ({ mount, page: browser }) => {
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={page} />);
        await chooseProfile(browser);

        await browser.getByRole('checkbox', { name: 'Select signer' }).click();
        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();

        await expect(browser.getByRole('button', { name: 'Onboarding...' })).toBeVisible();
        await expect(browser.getByRole('button', { name: 'Cancel' })).toBeDisabled();
        await expect(browser.getByTestId('select-onboardTokenProfileSelect-trigger')).toBeDisabled();
    });

    test('lists the next profile once, without the results of the previous one', async ({ mount, page: browser }) => {
        const dispatched: UnknownAction[] = [];
        await mount(
            <OnboardFromTokenWithStore
                profiles={[profile, archive]}
                page={page}
                onboardingResults={[
                    {
                        keyPairMeta: keyPairMeta('onboardable'),
                        outcome: TokenKeyOnboardingOutcome.Onboarded,
                        keyUuid: 'key-1',
                        keyName: 'signer',
                    },
                ]}
                onAction={(action) => dispatched.push(action)}
            />,
        );
        const listedProfiles = () =>
            dispatched.filter(tokenKeyActions.listTokenKeys.match).map((action) => action.payload.tokenProfileUuid);
        const listingsAnswered = () => dispatched.filter(tokenKeyActions.listTokenKeysSuccess.match).length;
        await chooseProfile(browser);
        await browser.getByRole('checkbox', { name: 'Select signer' }).click();
        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();
        await expect(browser.getByRole('button', { name: 'Done' })).toBeVisible();
        await expect.poll(listingsAnswered).toBe(2);

        await chooseProfile(browser, 'HSM / Archive');

        await expect.poll(listingsAnswered).toBe(3);
        expect(listedProfiles()).toEqual(['profile', 'profile', 'archive']);
        await expect(browser.getByRole('button', { name: 'Done' })).toHaveCount(0);
    });

    test('keeps the listing when the chosen profile is chosen again', async ({ mount, page: browser }) => {
        await mount(<OnboardFromTokenWithStore profiles={[profile]} page={page} />);
        await chooseProfile(browser);
        await expect(browser.getByRole('checkbox', { name: 'Select signer' })).toBeVisible();

        await chooseProfile(browser);

        await expect(browser.getByRole('checkbox', { name: 'Select signer' })).toBeVisible();
    });

    test('leaves the names of key pairs picked on different pages to Core, although each page suggests the same', async ({
        mount,
        page: browser,
    }) => {
        const dispatched: UnknownAction[] = [];
        await mount(
            <OnboardFromTokenWithStore
                profiles={[profile]}
                page={{ ...page, totalPages: 2, totalItems: 7 }}
                secondPage={secondPage}
                onAction={(action) => dispatched.push(action)}
            />,
        );
        await onboardSignerAndArchiverFromTwoPages(browser);

        const expected = [[{ keyPairMeta: keyPairMeta('onboardable') }, { keyPairMeta: keyPairMeta('archiving') }]];
        await expect.poll(() => sentKeys(dispatched)).toEqual(expected);
        expect(sentKeys(dispatched)).toEqual(expected);
    });

    test('captions each key pair it onboards by its storage name, whichever page it was picked on', async ({ mount, page: browser }) => {
        const dispatched: UnknownAction[] = [];
        await mount(
            <OnboardFromTokenWithStore
                profiles={[profile]}
                page={{ ...page, totalPages: 2, totalItems: 7 }}
                secondPage={secondPage}
                onAction={(action) => dispatched.push(action)}
            />,
        );
        await onboardSignerAndArchiverFromTwoPages(browser);

        await expect
            .poll(() => dispatched.filter(tokenKeyActions.onboardTokenKeys.match).map((action) => action.payload.captions))
            .toEqual([{ [handleOf(keyPairMeta('onboardable'))]: 'signer', [handleOf(keyPairMeta('archiving'))]: 'archiver' }]);
    });

    test('asks a name for a selected key pair whose public key no key holds any more', async ({ mount, page: browser }) => {
        const dispatched: UnknownAction[] = [];
        const released = page.items.map((key) =>
            key.storageName === 'certified'
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
                    { keyPairMeta: keyPairMeta('into'), outcome: TokenKeyOnboardingOutcome.Failed, reason: 'The key changed.' },
                ]}
                onAction={(action) => dispatched.push(action)}
            />,
        );
        await chooseProfile(browser);
        await browser.getByRole('checkbox', { name: 'Select certified' }).click();
        await expect(browser.getByText('Into certificate key')).toBeVisible();

        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();

        await expect(browser.getByRole('textbox', { name: 'Name for certified' })).toHaveValue('certified');
        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();
        await expect
            .poll(() => sentKeys(dispatched))
            .toEqual([[{ keyPairMeta: keyPairMeta('into') }], [{ keyPairMeta: keyPairMeta('into') }]]);
    });

    test('shows the key a selected key pair joins once a key came to hold its public key', async ({ mount, page: browser }) => {
        const dispatched: UnknownAction[] = [];
        const claimed = page.items.map((key) =>
            key.storageName === 'signer'
                ? { ...key, status: TokenKeyStatus.OnboardableIntoKey, inventoryKeyUuid: 'uploaded', inventoryKeyName: 'uploaded key' }
                : key,
        );
        await mount(
            <OnboardFromTokenWithStore
                profiles={[profile]}
                page={page}
                relistedPage={{ ...page, items: claimed }}
                onboardingResults={[
                    {
                        keyPairMeta: keyPairMeta('onboardable'),
                        outcome: TokenKeyOnboardingOutcome.Blocked,
                        status: TokenKeyStatus.InInventory,
                        reason: 'Held meanwhile.',
                    },
                ]}
                onAction={(action) => dispatched.push(action)}
            />,
        );
        await chooseProfile(browser);
        await browser.getByRole('checkbox', { name: 'Select signer' }).click();
        await enterText(browser.getByRole('textbox', { name: 'Name for signer' }), 'Payments signer');
        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();

        await expect(browser.getByText('Into uploaded key')).toBeVisible();
        await expect(browser.getByRole('textbox', { name: 'Name for signer' })).toHaveCount(0);
        await browser.getByRole('button', { name: 'Onboard', exact: true }).click();
        await expect
            .poll(() => sentKeys(dispatched))
            .toEqual([
                [{ keyPairMeta: keyPairMeta('onboardable'), name: 'Payments signer' }],
                [{ keyPairMeta: keyPairMeta('onboardable') }],
            ]);
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
        expect(cancelled).toBe(true);
    });
});
