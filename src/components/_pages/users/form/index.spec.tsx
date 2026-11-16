import { expect, test } from '../../../../../playwright/ct-test';
import type { CustomAttributeModel } from 'types/attributes';
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

const STAGE_ATTRIBUTE = {
    uuid: 'stage-uuid',
    name: 'stage',
    version: 3,
    type: 'custom',
    contentType: 'string',
    content: [{ data: 's1' }, { data: 's2' }, { data: 's3' }],
    properties: { label: 'Stage', visible: true, required: true, readOnly: false, list: true, multiSelect: false },
} as unknown as CustomAttributeModel;

test.describe('UserForm', () => {
    test('explains the Enabled switch in a toggletip beside its label', async ({ mount, page }) => {
        await mount(<UserFormWithStore roles={ROLES} />);

        const enabled = page.getByRole('checkbox', { name: 'Enabled' });
        await expect(enabled).toBeChecked();

        const label = page.locator('label[for="enabled"]', { hasText: 'Enabled' });
        const help = page.getByTestId('user-enabled-help');
        const [labelBox, helpBox, switchBox] = await Promise.all([
            label.boundingBox(),
            help.boundingBox(),
            page.getByTestId('switch-enabled').boundingBox(),
        ]);
        expect(labelBox?.x).toBeLessThan(helpBox?.x ?? Number.NEGATIVE_INFINITY);
        expect(helpBox?.x).toBeLessThan(switchBox?.x ?? Number.NEGATIVE_INFINITY);

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

    test('lists roles in name order whatever order the API returns them in', async ({ mount, page }) => {
        await mount(<UserFormWithStore roles={[ROLES[2], ROLES[0], ROLES[1]]} />);

        await page.getByTestId('select-userRoles-trigger').click();
        await expect(page.getByRole('option')).toHaveText([/^Administrator/, /^Auditor/, /^Operator/]);
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

    test('keeps a selected required list value after a failed create, so the form can be resubmitted as is', async ({ mount, page }) => {
        await mount(<UserFormWithStore roles={ROLES} customAttributes={[STAGE_ATTRIBUTE]} withCreateFailure />);

        const username = page.locator('#username');
        await username.click();
        await username.fill('jdoe');
        await page.getByTestId('select-__attributes__customUser__.stageSelect-trigger').click();
        await page.getByRole('option', { name: 's2', exact: true }).click();
        const create = page.getByTestId('progress-button');
        await expect(create).toBeEnabled();

        await create.click();
        await expect(create).toBeDisabled();
        await page.getByRole('button', { name: 'Fail create' }).click();

        // The select can keep showing a value the form has already dropped, so the enabled button and the retried payload are the checks.
        await expect(create).toBeEnabled();
        await create.click();
        const dispatched = JSON.parse((await page.getByTestId('user-actions').textContent()) ?? '[]') as Array<{
            type: string;
            payload: unknown;
        }>;
        const creates = dispatched.filter(({ type }) => type === 'users/create');
        expect(creates).toHaveLength(2);
        expect(JSON.stringify(creates[1].payload)).toContain('"s2"');
    });
});
