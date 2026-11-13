import { ResourceAction } from 'types/openapi';
import { expect, test } from '../../../../../playwright/ct-test';
import RoleDetailWithStore from './RoleDetailWithStore';

const actionButtons = ['pencil-button', 'trash-button', 'user-cog-button', 'lock-button'];

test.describe('RoleDetail actions by permission', () => {
    test('disables every changing action for a user who may only view roles', async ({ mount, page }) => {
        await mount(<RoleDetailWithStore roleActions={[ResourceAction.List, ResourceAction.Detail]} />);

        for (const testId of actionButtons) {
            await expect(page.getByTestId(testId)).toBeDisabled();
        }
    });

    test('offers every action to a user holding every grant on roles', async ({ mount, page }) => {
        await mount(<RoleDetailWithStore roleActions={Object.values(ResourceAction)} />);

        for (const testId of actionButtons) {
            await expect(page.getByTestId(testId)).toBeEnabled();
        }
    });
});
