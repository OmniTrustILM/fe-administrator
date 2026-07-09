import { test, expect } from '../../../playwright/ct-test';
import { SelectPlusDialogHarness } from './Select.harness';

test.describe('Select + Dialog interaction', () => {
    test('open Select dropdown closes when a Dialog opens', async ({ mount, page }) => {
        await mount(<SelectPlusDialogHarness />);
        await page.getByTestId('sel-trigger').click();
        await expect(page.getByTestId('sel-content')).toBeVisible();

        await page.getByTestId('open-dialog').click();

        await expect(page.getByTestId('sel-content')).toBeHidden();
    });
});
