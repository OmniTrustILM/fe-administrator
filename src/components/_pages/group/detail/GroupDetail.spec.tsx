import { ResourceAction } from 'types/openapi';
import { expect, test } from '../../../../../playwright/ct-test';
import GroupDetailWithStore from './GroupDetailWithStore';

test.describe('GroupDetail actions by permission', () => {
    test('disables Edit and Delete for a user who may only view the group', async ({ mount, page }) => {
        await mount(<GroupDetailWithStore allowedActions={[ResourceAction.Detail]} />);

        await expect(page.getByTestId('pencil-button')).toBeDisabled();
        await expect(page.getByTestId('trash-button')).toBeDisabled();
    });

    test('offers the actions granted on this group alone, without a resource grant', async ({ mount, page }) => {
        await mount(<GroupDetailWithStore allowedActions={[ResourceAction.Detail, ResourceAction.Update]} />);

        await expect(page.getByTestId('pencil-button')).toBeEnabled();
        await expect(page.getByTestId('trash-button')).toBeDisabled();
    });

    test('offers every action to a fully privileged user as before', async ({ mount, page }) => {
        await mount(<GroupDetailWithStore />);

        await expect(page.getByTestId('pencil-button')).toBeEnabled();
        await expect(page.getByTestId('trash-button')).toBeEnabled();
    });
});
