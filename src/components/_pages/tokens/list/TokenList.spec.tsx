import { ResourceAction } from 'types/openapi';
import { expect, test } from '../../../../../playwright/ct-test';
import TokenListWithStore from './TokenListWithStore';

test.describe('TokenList actions by permission', () => {
    test('offers Delete on a selected token to a user with object access but no resource-level delete', async ({ mount, page }) => {
        await mount(<TokenListWithStore resourceActions={[ResourceAction.List, ResourceAction.Detail]} hasObjectAccess />);

        await page
            .getByRole('row', { name: /Token one/ })
            .getByRole('checkbox')
            .check();

        await expect(page.getByTestId('trash-button')).toBeEnabled();
    });
});
