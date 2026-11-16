import { test, expect, type Page } from 'playwright/ct-test';
import { AttributeContentType, AttributeType, AttributeVersion } from 'types/openapi';
import type { CustomAttributeModel } from 'types/attributes';
import type { RoleDetailModel } from 'types/roles';
import RoleFormWithStore from './RoleFormWithStore';

const teamAttribute = {
    uuid: 'team',
    name: 'team',
    type: AttributeType.Custom,
    contentType: AttributeContentType.String,
    content: [{ data: 'PKI' }],
    properties: { label: 'Team', required: true, readOnly: false, visible: true, list: false, multiSelect: false },
} as CustomAttributeModel;

const demoNoteAttribute = {
    uuid: 'demo-note',
    name: 'demoNote',
    type: AttributeType.Custom,
    contentType: AttributeContentType.String,
    properties: { label: 'Demo note', required: false, readOnly: false, visible: true, list: false, multiSelect: false },
} as CustomAttributeModel;

function customAttributeValue(descriptor: CustomAttributeModel, data: string) {
    return {
        uuid: descriptor.uuid,
        name: descriptor.name,
        label: descriptor.properties.label,
        type: AttributeType.Custom,
        contentType: AttributeContentType.String,
        version: AttributeVersion.V2,
        content: [{ data }],
    };
}

const viewedRole: RoleDetailModel = {
    uuid: 'viewed-role',
    name: 'Viewed role',
    systemRole: false,
    users: [],
    customAttributes: [customAttributeValue(demoNoteAttribute, 'Browser demo check'), customAttributeValue(teamAttribute, 'Security')],
};

const viewedSystemRole: RoleDetailModel = { ...viewedRole, systemRole: true };

const customAttributeInput = (page: Page, name: string) => page.getByTestId(`text-input-__attributes__customRole__.${name}`);

const editRoute = { initialRoute: `/roles/detail/${viewedRole.uuid}`, routePath: '/roles/detail/:id' };

test.describe('RoleForm', () => {
    test("starts a new role's custom attributes from their declared defaults", async ({ mount, page }) => {
        // given: the store still holds the last viewed role
        await mount(<RoleFormWithStore role={viewedRole} customAttributes={[teamAttribute, demoNoteAttribute]} />);

        // then
        await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();
        await expect(customAttributeInput(page, 'team')).toHaveValue('PKI');
        await expect(customAttributeInput(page, 'demoNote')).toHaveCount(0);
    });

    test("creates a role without the last viewed role's custom attribute values", async ({ mount, page }) => {
        // given
        await mount(<RoleFormWithStore role={viewedRole} customAttributes={[demoNoteAttribute]} />);

        // when
        const nameInput = page.getByTestId('text-input-name');
        await nameInput.click();
        await nameInput.fill('auditors');
        await page.getByRole('button', { name: 'Create' }).click();

        // then
        const created = async () => {
            const actions: { type: string; payload?: { customAttributes?: unknown } }[] = JSON.parse(
                (await page.getByTestId('role-actions').textContent()) ?? '[]',
            );
            return actions.filter((action) => action.type === 'roles/create').map((action) => action.payload?.customAttributes);
        };
        await expect.poll(created).toEqual([[]]);
    });

    test('lets a new role be named and created after viewing a system role', async ({ mount, page }) => {
        // given
        await mount(<RoleFormWithStore role={viewedSystemRole} />);

        // when
        const nameInput = page.getByTestId('text-input-name');
        await expect(nameInput).toBeEnabled();
        await nameInput.click();
        await nameInput.fill('auditors');

        // then
        await expect(page.getByTestId('text-input-description')).toBeEnabled();
        await expect(page.getByRole('button', { name: 'Create' })).toBeEnabled();
    });

    test('loads the custom attribute values of the edited role', async ({ mount, page }) => {
        await mount(<RoleFormWithStore {...editRoute} role={viewedRole} customAttributes={[teamAttribute, demoNoteAttribute]} />);

        await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
        await expect(customAttributeInput(page, 'team')).toHaveValue('Security');
        await expect(customAttributeInput(page, 'demoNote')).toHaveValue('Browser demo check');
    });

    test("edits a role without the last viewed role's custom attribute values", async ({ mount, page }) => {
        // given: the store still holds the last viewed role
        await mount(
            <RoleFormWithStore
                initialRoute="/roles/detail/another-role"
                routePath={editRoute.routePath}
                role={viewedRole}
                customAttributes={[teamAttribute, demoNoteAttribute]}
            />,
        );

        // then
        await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
        await expect(customAttributeInput(page, 'team')).toHaveValue('PKI');
        await expect(customAttributeInput(page, 'demoNote')).toHaveCount(0);
    });

    test("keeps an edited system role's description read-only", async ({ mount, page }) => {
        await mount(<RoleFormWithStore {...editRoute} role={viewedSystemRole} />);

        await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
        await expect(page.getByTestId('text-input-description')).toBeDisabled();
    });
});
