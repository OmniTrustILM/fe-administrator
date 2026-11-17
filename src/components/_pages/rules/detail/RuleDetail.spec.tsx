import { ResourceAction } from 'types/openapi';
import { expect, test } from '../../../../../playwright/ct-test';
import RuleDetailWithStore from './RuleDetailWithStore';

test.describe('RuleDetail actions by permission', () => {
    test('disables adding conditions for a user who may only view rules', async ({ mount, page }) => {
        await mount(<RuleDetailWithStore rulesActions={[ResourceAction.List, ResourceAction.Detail]} />);

        const add = page.getByTestId('select-newRowWidgetSelect-trigger');
        await expect(add).toBeDisabled();
        await expect(add).toContainText('permission');
    });

    test('offers adding conditions to a user who may update rules', async ({ mount, page }) => {
        await mount(<RuleDetailWithStore rulesActions={[ResourceAction.List, ResourceAction.Detail, ResourceAction.Update]} />);

        await expect(page.getByTestId('select-newRowWidgetSelect-trigger')).toBeEnabled();
    });
});
