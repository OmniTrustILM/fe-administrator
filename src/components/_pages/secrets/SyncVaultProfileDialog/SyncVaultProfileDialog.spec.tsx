import type { JSX } from 'react';
import type { Locator, Page } from '@playwright/test';

import type { AttributeDescriptorModel } from 'types/attributes';
import { AttributeContentType, AttributeType, ComplianceStatus, SecretState, SecretType } from 'types/openapi';
import type { SecretDetailDto, VaultProfileDto } from 'types/openapi';
import { test, expect } from '../../../../../playwright/ct-test';
import { SyncVaultProfileDialogTestWrapper, type SyncVaultProfileDialogTestWrapperProps } from './SyncVaultProfileDialogTestWrapper';

// ── fixtures ──────────────────────────────────────────────────────────────────

const SECRET: SecretDetailDto = {
    uuid: 'secret-uuid-1',
    name: 'My Secret',
    type: SecretType.Generic,
    state: SecretState.Active,
    complianceStatus: ComplianceStatus.NotChecked,
    version: 1,
    enabled: true,
    sourceVaultProfile: { uuid: 'src-vp-uuid', name: 'Source Profile' },
    syncVaultProfiles: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    attributes: [],
};

const VAULT_PROFILES: VaultProfileDto[] = [
    { uuid: 'vp-uuid-1', name: 'Profile A', enabled: true, vaultInstance: { uuid: 'vi-uuid-1', name: 'Vault 1' } },
    { uuid: 'vp-uuid-2', name: 'Profile B', enabled: true, vaultInstance: { uuid: 'vi-uuid-2', name: 'Vault 2' } },
];

const DATA_DESCRIPTOR: AttributeDescriptorModel = {
    type: AttributeType.Data,
    name: 'syncField',
    uuid: 'desc-uuid-1',
    contentType: AttributeContentType.String,
    properties: { label: 'Sync Field', required: false, readOnly: false, visible: true, list: false, multiSelect: false },
};

// ── helpers ───────────────────────────────────────────────────────────────────

/** Mounts the dialog with default fixture props, optionally overriding any of them. */
function mountDialog(
    mount: (component: JSX.Element) => Promise<Locator>,
    props: Partial<SyncVaultProfileDialogTestWrapperProps> = {},
): Promise<Locator> {
    return mount(<SyncVaultProfileDialogTestWrapper {...{ secret: SECRET, vaultProfiles: VAULT_PROFILES, ...props }} />);
}

/** Opens the vault profile Select dropdown by clicking the trigger button. */
async function openDropdown(page: Page): Promise<void> {
    await page.getByTestId('vault-profile-select').locator('button[aria-expanded]').click();
}

/** Opens the vault profile dropdown and selects the option for the given profile UUID. */
async function selectVaultProfile(page: Page, profileUuid: string): Promise<void> {
    await openDropdown(page);
    await page.locator(`[data-value="${profileUuid}"]`).click();
}

// ── tests ─────────────────────────────────────────────────────────────────────

test.describe('SyncVaultProfileDialog', () => {
    test('renders vault profile select and shows options in dropdown', async ({ mount, page }) => {
        await mountDialog(mount);

        await openDropdown(page);
        await expect(page.locator('[data-value="vp-uuid-1"]')).toBeVisible();
        await expect(page.locator('[data-value="vp-uuid-2"]')).toBeVisible();
    });

    test('renders Cancel and Add buttons', async ({ mount }) => {
        const component = await mountDialog(mount);

        await expect(component.getByRole('button', { name: 'Cancel' })).toBeVisible();
        await expect(component.getByRole('button', { name: 'Add' })).toBeVisible();
    });

    test('Add button is disabled when no vault profile is selected', async ({ mount }) => {
        const component = await mountDialog(mount);

        await expect(component.getByRole('button', { name: 'Add' })).toBeDisabled();
    });

    test('Add button is disabled while fetching attributes', async ({ mount, page }) => {
        const component = await mountDialog(mount, { isFetchingSyncVaultProfileAttributes: true });

        await selectVaultProfile(page, 'vp-uuid-1');

        await expect(component.getByRole('button', { name: 'Add' })).toBeDisabled();
    });

    test('Add button is enabled after vault profile is selected and attributes are not loading', async ({ mount, page }) => {
        const component = await mountDialog(mount);

        await selectVaultProfile(page, 'vp-uuid-1');

        await expect(component.getByRole('button', { name: 'Add' })).toBeEnabled();
    });

    for (const { profileUuid, vaultUuid } of VAULT_PROFILES.map((vp) => ({ profileUuid: vp.uuid, vaultUuid: vp.vaultInstance.uuid }))) {
        test(`calls onGetSyncVaultProfileAttributes with correct vault when profile ${profileUuid} is selected`, async ({
            mount,
            page,
        }) => {
            const calls: any[] = [];
            await mountDialog(mount, { onGetSyncVaultProfileAttributes: (p) => calls.push(p) });

            await selectVaultProfile(page, profileUuid);

            await expect.poll(() => calls.length, { timeout: 3000 }).toBe(1);
            expect(calls[0]).toMatchObject({
                vaultUuid,
                vaultProfileUuid: profileUuid,
                secretType: SecretType.Generic,
            });
        });
    }

    test('renders AttributeEditor when profile is selected and attribute descriptors are present', async ({ mount, page }) => {
        const component = await mountDialog(mount, { syncVaultProfileAttributeDescriptors: [DATA_DESCRIPTOR] });

        await selectVaultProfile(page, 'vp-uuid-1');

        await expect(component.getByText('Sync Field')).toBeVisible();
    });

    test('does not render AttributeEditor section when no profile is selected', async ({ mount }) => {
        const component = await mountDialog(mount, { syncVaultProfileAttributeDescriptors: [DATA_DESCRIPTOR] });

        await expect(component.getByText('Sync Field')).not.toBeVisible();
    });

    test('calls onClose when Cancel is clicked', async ({ mount }) => {
        let closed = false;
        const component = await mountDialog(mount, {
            onClose: () => {
                closed = true;
            },
        });

        await component.getByRole('button', { name: 'Cancel' }).click();

        expect(closed).toBe(true);
    });

    test('calls onAddSyncVaultProfile and onClose when Add is clicked with a selected profile', async ({ mount, page }) => {
        const addCalls: any[] = [];
        let closed = false;
        const component = await mountDialog(mount, {
            onAddSyncVaultProfile: (p) => addCalls.push(p),
            onClose: () => {
                closed = true;
            },
        });

        await selectVaultProfile(page, 'vp-uuid-1');
        await component.getByRole('button', { name: 'Add' }).click();

        expect(addCalls).toHaveLength(1);
        expect(addCalls[0]).toMatchObject({
            uuid: 'secret-uuid-1',
            vaultProfileUuid: 'vp-uuid-1',
        });
        expect(closed).toBe(true);
    });
});
