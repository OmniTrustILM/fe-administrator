import { ResourceAction } from 'types/openapi';
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
});
