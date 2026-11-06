import { expect, test } from '../../../../../playwright/ct-test';
import type { RoleResponseModel, UserDetailModel } from 'types/auth';
import UserFormWithStore from './UserFormWithStore';

const ROLES: RoleResponseModel[] = [
    { uuid: 'role-admin', name: 'Administrator', description: 'Full access', systemRole: true },
    { uuid: 'role-auditor', name: 'Auditor', description: 'Reads audit logs', systemRole: false },
    { uuid: 'role-operator', name: 'Operator', systemRole: false },
];

const USER: UserDetailModel = {
    uuid: 'user-1',
    username: 'jdoe',
    description: '',
    firstName: 'John',
    lastName: 'Doe',
    email: 'jdoe@example.com',
    enabled: true,
    systemUser: false,
    groups: [],
    roles: [ROLES[1]],
};

test.describe('UserForm', () => {
    test('explains the Enabled switch in a toggletip beside its label', async ({ mount, page }) => {
        await mount(<UserFormWithStore roles={ROLES} />);

        const enabled = page.getByRole('checkbox', { name: 'Enabled' });
        await expect(enabled).toBeChecked();

        const label = page.locator('label[for="enabled"]', { hasText: 'Enabled' });
        const help = page.getByTestId('user-enabled-help');
        const labelBox = await label.boundingBox();
        const helpBox = await help.boundingBox();
        expect(labelBox && helpBox && labelBox.x < helpBox.x).toBe(true);

        await help.click();
        await expect(page.getByText('A disabled user cannot sign in. The account and its assigned roles are kept.')).toBeVisible();
    });

    test('filters roles by name and marks system roles', async ({ mount, page }) => {
        await mount(<UserFormWithStore roles={ROLES} />);

        await page.getByTestId('select-userRoles-trigger').click();
        await expect(page.getByRole('option', { name: /Administrator/ })).toContainText('System role · Full access');
        await expect(page.getByRole('option', { name: /Auditor/ })).toContainText('Reads audit logs');
        await expect(page.getByRole('option', { name: /Auditor/ })).not.toContainText('System role');

        await page.getByTestId('select-userRoles-search').fill('aud');
        await expect(page.getByRole('option', { name: /Auditor/ })).toBeVisible();
        await expect(page.getByRole('option', { name: /Administrator/ })).toHaveCount(0);
    });

    test('shows selected roles as removable chips', async ({ mount, page }) => {
        await mount(<UserFormWithStore roles={ROLES} />);

        await page.getByTestId('select-userRoles-trigger').click();
        await page.getByRole('option', { name: /Operator/ }).click();
        await page.keyboard.press('Escape');

        const trigger = page.getByTestId('select-userRoles-trigger');
        await expect(trigger.locator('[data-tag-value="role-operator"]')).toContainText('Operator');

        await trigger.getByRole('button', { name: 'Remove Operator' }).click();
        await expect(trigger.locator('[data-tag-value="role-operator"]')).toHaveCount(0);
    });

    test('pre-selects the user roles in edit mode and saves the chosen role uuids', async ({ mount, page }) => {
        await mount(<UserFormWithStore roles={ROLES} user={USER} />);

        const trigger = page.getByTestId('select-userRoles-trigger');
        await expect(trigger.locator('[data-tag-value="role-auditor"]')).toContainText('Auditor');
        await expect(trigger.locator('[data-tag-value]')).toHaveCount(1);

        await trigger.click();
        await page.getByRole('option', { name: /Operator/ }).click();
        await page.keyboard.press('Escape');
        await page.getByRole('button', { name: 'Save' }).click();

        await expect(page.getByTestId('user-actions')).toContainText('users/update');
        const dispatched = JSON.parse((await page.getByTestId('user-actions').textContent()) ?? '[]') as Array<{
            type: string;
            payload: { roles?: string[] };
        }>;
        const update = dispatched.find(({ type }) => type === 'users/update');
        expect(update?.payload.roles).toEqual(['role-auditor', 'role-operator']);
    });
});
