import { ResourceAction } from 'types/openapi';
import { expect, test } from '../../../../../playwright/ct-test';
import RaProfileDetailWithStore from './RaProfileDetailWithStore';

test.describe('RaProfileDetail actions by permission', () => {
    const changing = ['edit-button', 'delete-button', 'disable-button', 'check-compliance-button'];

    test('disables changing actions a read-only user lacks', async ({ mount, page }) => {
        await mount(<RaProfileDetailWithStore allowedActions={[ResourceAction.Detail]} />);

        for (const testId of changing) {
            await expect(page.getByTestId(testId)).toBeDisabled();
        }
        await page.getByRole('tab', { name: 'Protocols' }).click();
        await expect(page.getByRole('button', { name: 'Activate' }).first()).toBeDisabled();
    });

    test('offers the actions granted on this RA profile alone, without a resource grant', async ({ mount, page }) => {
        await mount(<RaProfileDetailWithStore allowedActions={[ResourceAction.Detail, ResourceAction.Update, ResourceAction.Enable]} />);

        await expect(page.getByTestId('edit-button')).toBeEnabled();
        await expect(page.getByTestId('disable-button')).toBeEnabled();
        await expect(page.getByTestId('delete-button')).toBeDisabled();
        await page.getByRole('tab', { name: 'Protocols' }).click();
        await expect(page.getByRole('button', { name: 'Activate' }).first()).toBeEnabled();
    });

    test('offers every action to a fully privileged user as before', async ({ mount, page }) => {
        await mount(<RaProfileDetailWithStore />);

        for (const testId of changing) {
            await expect(page.getByTestId(testId)).toBeEnabled();
        }
    });
});
