import { test, expect } from '../../../../../playwright/ct-test';
import { Resource, ResourceAction } from 'types/openapi';
import SecretsListWithStore from './SecretsListWithStore';

const enums = {
    platformEnums: {
        Resource: { [Resource.Secrets]: { label: 'Secrets' } },
        ResourceAction: {
            [ResourceAction.Create]: { label: 'Create' },
            [ResourceAction.Enable]: { label: 'Enable' },
            [ResourceAction.Update]: { label: 'Update' },
        },
    },
};

const profileWith = (actions: ResourceAction[]) => ({
    username: 'user',
    permissions: { allowedListings: [Resource.Secrets], allowedActions: actions.length ? [{ resource: Resource.Secrets, actions }] : [] },
});

const allActions = [
    ResourceAction.List,
    ResourceAction.Detail,
    ResourceAction.Create,
    ResourceAction.Enable,
    ResourceAction.Update,
    ResourceAction.Delete,
];

test.describe('SecretsList actions by permission', () => {
    test('disables changing actions for a read-only user and names the missing permission', async ({ mount, page }) => {
        const component = await mount(
            <SecretsListWithStore
                preloadedState={{ auth: { profile: profileWith([ResourceAction.List, ResourceAction.Detail]) }, enums }}
            />,
        );

        await expect(component.getByTestId('plus-button')).toBeDisabled();
        await component.getByTestId('plus-button').locator('..').hover();
        await expect(page.getByRole('tooltip')).toHaveText('You need the Create permission on Secrets.');

        await component.getByTestId('check-button').locator('..').hover();
        await expect(page.getByRole('tooltip')).toHaveText('You need the Enable permission on Secrets.');
    });

    test('disables changing actions for an owner without a grant, since every secret action also checks the resource', async ({
        mount,
        page,
    }) => {
        const component = await mount(<SecretsListWithStore preloadedState={{ auth: { profile: profileWith([]) }, enums }} />);

        await expect(component.getByTestId('plus-button')).toBeDisabled();
        await component.getByTestId('user-check-button').locator('..').hover();
        await expect(page.getByRole('tooltip')).toHaveText('You need the Update permission on Secrets.');
    });

    test('offers changing actions to a fully privileged user as before', async ({ mount }) => {
        const component = await mount(<SecretsListWithStore preloadedState={{ auth: { profile: profileWith(allActions) }, enums }} />);

        await expect(component.getByTestId('plus-button')).toBeEnabled();
        // Enable waits for a selection; a permission denial would wrap the button to carry its reason.
        await expect(component.getByTestId('check-button').locator('xpath=..')).not.toHaveClass(/inline-flex/);
    });
});
