import type { Page } from '@playwright/test';
import { SecretType } from 'types/openapi';
import { expect, test } from '../../../../../playwright/ct-test';
import SecretFormPresetHarness from './SecretFormPresetHarness';

async function fillNameAndVaultProfile(page: Page) {
    const nameInput = page.getByTestId('text-input-secret-name');
    await nameInput.click();
    await nameInput.fill('picked-key');
    await page.getByTestId('select-secret-vault-profile-trigger').click();
    await page.getByRole('option', { name: 'Vault One' }).click();
}

async function selectType(page: Page, label: string) {
    await page.getByTestId('select-secret-type-trigger').click();
    await page.getByRole('option', { name: label }).click();
}

// Each key generation waits for `releaseKeyGeneration`; `keysExported` counts the ones that went on to finish.
async function holdKeyGeneration(page: Page) {
    await page.evaluate(() => {
        const subtle = globalThis.crypto.subtle;
        const generate = subtle.generateKey.bind(subtle);
        const exportKey = subtle.exportKey.bind(subtle);
        const target = globalThis as unknown as Record<string, unknown>;
        const held: Array<() => void> = [];
        target.keysExported = 0;
        target.releaseKeyGeneration = () => held.shift()?.();
        subtle.generateKey = ((...args: Parameters<typeof generate>) =>
            new Promise((resolve, reject) => held.push(() => generate(...args).then(resolve, reject)))) as typeof subtle.generateKey;
        subtle.exportKey = (async (...args: Parameters<typeof exportKey>) => {
            const exported = await exportKey(...args);
            target.keysExported = (target.keysExported as number) + 1;
            return exported;
        }) as typeof subtle.exportKey;
    });
}

async function releaseKeyGeneration(page: Page) {
    await page.evaluate(() => (globalThis as unknown as Record<string, () => void>).releaseKeyGeneration());
}

async function waitForKeysExported(page: Page, count: number) {
    await expect.poll(() => page.evaluate(() => (globalThis as unknown as Record<string, number>).keysExported)).toBe(count);
}

// Two animation frames: React has committed the refreshed list and run the effects it triggers.
function settled(page: Page) {
    return page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

function attributeLoads(page: Page) {
    return page.evaluate(() => (globalThis as unknown as Record<string, number>).secretFormAttributeLoads ?? 0);
}

function createRequests(page: Page) {
    return page.evaluate(() => (globalThis as unknown as Record<string, unknown[]>).secretFormCreateRequests ?? []);
}

// The markup together with the values of the form controls, which the markup does not carry.
function renderedText(page: Page) {
    return page.evaluate(
        () =>
            document.documentElement.outerHTML +
            Array.from(document.querySelectorAll('input, textarea'), (element) => (element as HTMLInputElement).value).join('\n'),
    );
}

test.describe('SecretForm preset', () => {
    test('presetsPrivateKeyAndLocksType', async ({ mount, page }) => {
        await mount(<SecretFormPresetHarness preset={{ type: SecretType.PrivateKey, allowedTypes: [SecretType.PrivateKey] }} />);

        await expect(page.getByTestId('text-input-secret-type')).toHaveValue('Private Key');
        await expect(page.getByTestId('text-input-secret-type')).toBeDisabled();
        await expect(page.locator('#secret-privatekey-content')).toBeEnabled();
        await expect(page.getByRole('button', { name: 'Generate key' })).toBeVisible();
    });

    test('offers no key generation when creating through the store', async ({ mount, page }) => {
        await mount(<SecretFormPresetHarness throughStore preset={{ type: SecretType.PrivateKey }} />);

        await expect(page.locator('#secret-privatekey-content')).toBeEnabled();
        await expect(page.locator('#secret-privatekey-file__fileUpload__file')).toHaveCount(1);
        await expect(page.getByRole('button', { name: 'Generate key' })).toHaveCount(0);
        await expect(page.locator('#secret-key-algorithm')).toHaveCount(0);
    });

    test('limitsTypeSelectToAllowedTypes', async ({ mount, page }) => {
        await mount(
            <SecretFormPresetHarness preset={{ type: SecretType.ApiKey, allowedTypes: [SecretType.ApiKey, SecretType.PrivateKey] }} />,
        );

        await page.getByTestId('select-secret-type-trigger').click();
        await expect(page.getByRole('option')).toHaveText(['API Key', 'Private Key']);
        await page.getByRole('option', { name: 'Private Key' }).click();
        await expect(page.getByRole('button', { name: 'Generate key' })).toBeVisible();
    });

    test('generatesKeyIntoContent', async ({ mount, page }) => {
        await mount(<SecretFormPresetHarness preset={{ type: SecretType.PrivateKey }} />);
        await fillNameAndVaultProfile(page);

        await page.getByRole('button', { name: 'Generate key' }).click();

        await expect(page.getByRole('status')).toHaveText('Generated EC P-256 key');
        await expect(page.getByTestId('secret-generated-key')).toHaveText('Generated EC P-256 key');
        await expect(page.locator('#secret-privatekey-content')).toHaveCount(0);
        await expect(page.locator('#secret-privatekey-file__fileUpload__file')).toHaveCount(0);
        await page.getByRole('button', { name: 'Create', exact: true }).click();

        await expect.poll(async () => (await createRequests(page)).length).toBe(1);
        const [request] = (await createRequests(page)) as Array<{ secretRequestDto: { secret: { type: string; content: string } } }>;
        expect(request.secretRequestDto.secret.type).toBe('privateKey');
        const content = request.secretRequestDto.secret.content;
        expect(atob(content)).toMatch(/^-----BEGIN PRIVATE KEY-----\n[\s\S]+\n-----END PRIVATE KEY-----\n$/);
        const rendered = await renderedText(page);
        expect(rendered).not.toContain('BEGIN PRIVATE KEY');
        expect(rendered).not.toContain(content);
    });

    test('clears a generated key when the type changes', async ({ mount, page }) => {
        await mount(
            <SecretFormPresetHarness
                preset={{ type: SecretType.PrivateKey, allowedTypes: [SecretType.PrivateKey, SecretType.SecretKey] }}
            />,
        );
        await fillNameAndVaultProfile(page);
        await page.getByRole('button', { name: 'Generate key' }).click();
        await expect(page.getByTestId('secret-generated-key')).toHaveText('Generated EC P-256 key');

        await selectType(page, 'Secret Key');
        await expect(page.locator('#secret-secretkey-content')).toHaveValue('');

        await selectType(page, 'Private Key');
        await expect(page.locator('#secret-privatekey-content')).toHaveValue('');
        await expect(page.getByTestId('secret-generated-key')).toHaveText('');
    });

    test('keeps pasted content when the type changes', async ({ mount, page }) => {
        await mount(
            <SecretFormPresetHarness
                preset={{ type: SecretType.PrivateKey, allowedTypes: [SecretType.PrivateKey, SecretType.SecretKey] }}
            />,
        );
        await page.locator('#secret-privatekey-content').fill('pasted');

        await selectType(page, 'Secret Key');

        await expect(page.locator('#secret-secretkey-content')).toHaveValue('pasted');
    });

    test('locks generating, the algorithm and submitting while a key is generated', async ({ mount, page }) => {
        await mount(<SecretFormPresetHarness preset={{ type: SecretType.PrivateKey }} />);
        await holdKeyGeneration(page);
        await fillNameAndVaultProfile(page);

        await page.getByRole('button', { name: 'Generate key' }).click();

        await expect(page.getByRole('status')).toHaveText('Generating key...');
        await expect(page.getByRole('button', { name: 'Generate key' })).toBeDisabled();
        await expect(page.getByTestId('select-secret-key-algorithm-trigger')).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeDisabled();

        await releaseKeyGeneration(page);

        await expect(page.getByRole('status')).toHaveText('Generated EC P-256 key');
        await expect(page.getByRole('button', { name: 'Generate key' })).toBeEnabled();
        await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeEnabled();
    });

    test('drops a key that finishes generating after the type changed', async ({ mount, page }) => {
        await mount(
            <SecretFormPresetHarness
                preset={{ type: SecretType.PrivateKey, allowedTypes: [SecretType.PrivateKey, SecretType.SecretKey] }}
            />,
        );
        await holdKeyGeneration(page);
        await page.getByRole('button', { name: 'Generate key' }).click();
        await expect(page.getByRole('status')).toHaveText('Generating key...');

        await selectType(page, 'Secret Key');
        await releaseKeyGeneration(page);
        await waitForKeysExported(page, 1);

        await expect(page.locator('#secret-secretkey-content')).toHaveValue('');
        await selectType(page, 'Private Key');
        await expect(page.locator('#secret-privatekey-content')).toHaveValue('');
        await expect(page.getByTestId('secret-generated-key')).toHaveText('');
        await expect(page.getByRole('button', { name: 'Generate key' })).toBeEnabled();
    });

    test("loads a vault profile's attributes without the store when creating directly", async ({ mount, page }) => {
        await mount(<SecretFormPresetHarness preset={{ type: SecretType.Generic }} vaultProfileHasAttribute />);

        await fillNameAndVaultProfile(page);

        await expect(page.getByTestId('text-input-__attributes__secret__.path')).toBeVisible();
        await expect(page.getByTestId('store-action-types')).toContainText('vaultProfiles/listVaultProfiles');
        await expect(page.getByTestId('store-action-types')).not.toContainText('secrets/listSecretAttributes');
    });

    test("loads a vault profile's attributes through the store when creating through it", async ({ mount, page }) => {
        await mount(<SecretFormPresetHarness throughStore preset={{ type: SecretType.Generic }} />);

        await fillNameAndVaultProfile(page);

        await expect(page.getByTestId('store-action-types')).toContainText('secrets/listSecretAttributes');
    });

    test('keepsGenericPresetForEab', async ({ mount, page }) => {
        await mount(<SecretFormPresetHarness preset={{ type: SecretType.Generic, content: 'abc' }} />);

        await expect(page.getByTestId('text-input-secret-type')).toHaveValue('Generic');
        await expect(page.getByTestId('text-input-secret-type')).toBeDisabled();
        await expect(page.locator('#secret-generic-content')).toHaveValue('abc');
        await expect(page.locator('#secret-generic-content')).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Generate key' })).toHaveCount(0);
    });

    test('keeps the attribute editor when the vault profile list is refreshed through the store', async ({ mount, page }) => {
        await mount(<SecretFormPresetHarness throughStore preset={{ type: SecretType.Generic }} />);
        await fillNameAndVaultProfile(page);
        await expect(page.getByTestId('store-action-types')).toContainText('secrets/listSecretAttributes');

        await page.getByTestId('refresh-vault-profiles').click();

        await expect(page.getByTestId('store-action-types')).toContainText('vaultProfiles/listVaultProfilesSuccess');
        await settled(page);
        const types = ((await page.getByTestId('store-action-types').textContent()) ?? '').split('\n');
        expect(types.filter((type) => type === 'secrets/listSecretAttributes')).toHaveLength(1);
        await expect(page.getByText('Loading attributes...')).toHaveCount(0);
    });

    test('loads the attributes once when the vault profile list is refreshed while creating directly', async ({ mount, page }) => {
        await mount(<SecretFormPresetHarness preset={{ type: SecretType.Generic }} />);
        await fillNameAndVaultProfile(page);
        await expect.poll(() => attributeLoads(page)).toBe(1);

        await page.getByTestId('refresh-vault-profiles').click();

        await expect(page.getByTestId('store-action-types')).toContainText('vaultProfiles/listVaultProfilesSuccess');
        await settled(page);
        expect(await attributeLoads(page)).toBe(1);
    });
});
