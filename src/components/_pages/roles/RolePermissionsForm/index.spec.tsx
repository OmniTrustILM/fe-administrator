import type { Page } from '@playwright/test';
import { expect, test } from '../../../../../playwright/ct-test';
import { RolePermissionsFormTestWrapper } from './RolePermissionsFormTestWrapper';

const listOnRaProfiles = {
    allowAllResources: false,
    resources: [{ name: 'raProfiles', allowAllActions: false, actions: ['list'], objects: [] }],
};

const savedResource = async (page: Page) => {
    const dispatched: { type: string; payload: { permissions: { resources: unknown[] } } }[] = JSON.parse(
        (await page.getByTestId('dispatched').textContent()) ?? '[]',
    );
    return dispatched.find((a) => a.type === 'roles/updatePermissions')?.payload.permissions.resources[0];
};

const addRaProfiles = async (page: Page, uuids: string[]) => {
    await page.getByRole('button', { name: /RA Profiles/ }).click();
    await page.locator('button:has(svg.lucide-plus)').click();
    for (const uuid of uuids) await page.locator(`[id="${uuid}__checkbox__"]`).check();
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
};

const resourceAction = (page: Page, name: string) => page.locator(`[id="action-action-${name}"]`);
const objectAction = (page: Page, uuid: string, name: string) => page.locator(`[id="${uuid}_${name}"]`);

test.describe('RolePermissionsForm', () => {
    test('an action ticked on one object stays on that object and off the resource level', async ({ mount, page }) => {
        await mount(<RolePermissionsFormTestWrapper permissions={listOnRaProfiles} />);

        await addRaProfiles(page, ['ra-1', 'ra-2']);
        await objectAction(page, 'ra-1', 'detail').click();
        await expect(objectAction(page, 'ra-1', 'detail')).toBeChecked();
        await objectAction(page, 'ra-1', 'members').click();
        await expect(objectAction(page, 'ra-1', 'members')).toBeChecked();

        await expect(resourceAction(page, 'detail')).not.toBeChecked();
        await expect(resourceAction(page, 'members')).not.toBeChecked();
        await expect(objectAction(page, 'ra-2', 'detail')).not.toBeChecked();

        await page.getByRole('button', { name: 'Save', exact: true }).click();

        await expect(page.getByTestId('dispatched')).toContainText('roles/updatePermissions');
        expect(await savedResource(page)).toEqual({
            name: 'raProfiles',
            allowAllActions: false,
            actions: ['list'],
            objects: [
                { uuid: 'ra-1', name: 'RA One', allow: ['list', 'detail', 'members'], deny: [] },
                { uuid: 'ra-2', name: 'RA Two', allow: ['list'], deny: [] },
            ],
        });
    });

    test('an action ticked at resource level does not land on an object added earlier', async ({ mount, page }) => {
        await mount(<RolePermissionsFormTestWrapper permissions={listOnRaProfiles} />);

        await addRaProfiles(page, ['ra-1']);
        await resourceAction(page, 'detail').check();

        await expect(objectAction(page, 'ra-1', 'detail')).not.toBeChecked();

        await page.getByRole('button', { name: 'Save', exact: true }).click();

        await expect(page.getByTestId('dispatched')).toContainText('roles/updatePermissions');
        expect(await savedResource(page)).toEqual({
            name: 'raProfiles',
            allowAllActions: false,
            actions: ['list', 'detail'],
            objects: [{ uuid: 'ra-1', name: 'RA One', allow: ['list'], deny: [] }],
        });
    });
});
