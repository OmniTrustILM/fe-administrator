import { Resource, ResourceAction } from 'types/openapi';
import { expect, test } from '../../../../../playwright/ct-test';
import AcmeProfileDetailWithStore from './AcmeProfileDetailWithStore';

test.describe('AcmeProfileDetail actions by permission', () => {
    const changing = ['pencil-button', 'trash-button', 'times-button'];

    test('disables changing actions a read-only user lacks', async ({ mount, page }) => {
        await mount(<AcmeProfileDetailWithStore allowedActions={[ResourceAction.Detail]} />);

        for (const testId of changing) {
            await expect(page.getByTestId(testId)).toBeDisabled();
        }
    });

    test('offers the actions granted on this ACME profile alone, without a resource grant', async ({ mount, page }) => {
        await mount(<AcmeProfileDetailWithStore allowedActions={[ResourceAction.Detail, ResourceAction.Update]} />);

        await expect(page.getByTestId('pencil-button')).toBeEnabled();
        await expect(page.getByTestId('trash-button')).toBeDisabled();
        await expect(page.getByTestId('times-button')).toBeDisabled();
    });

    test('offers every action to a fully privileged user as before', async ({ mount, page }) => {
        await mount(<AcmeProfileDetailWithStore />);

        for (const testId of changing) {
            await expect(page.getByTestId(testId)).toBeEnabled();
        }
    });

    test('disables Generate key without ACME profile create, which generating the key needs as well as secret create', async ({
        mount,
        page,
    }) => {
        await mount(<AcmeProfileDetailWithStore resourceGrants={[{ resource: Resource.Secrets, actions: [ResourceAction.Create] }]} />);

        const generate = page.getByRole('button', { name: 'Generate key' });
        await expect(generate).toBeDisabled();
        await generate.locator('..').hover();
        await expect(page.getByRole('tooltip')).toContainText(/create permission on acme/i);
    });

    test('offers Generate key with both secret create and ACME profile create', async ({ mount, page }) => {
        await mount(
            <AcmeProfileDetailWithStore
                resourceGrants={[
                    { resource: Resource.Secrets, actions: [ResourceAction.Create] },
                    { resource: Resource.AcmeProfiles, actions: [ResourceAction.Create] },
                ]}
            />,
        );

        await expect(page.getByRole('button', { name: 'Generate key' })).toBeEnabled();
    });
});
