import { EAB_KEY_NOTICE } from 'utils/acme-eab';
import { expect, test } from '../../../../../playwright/ct-test';
import GenerateEabKeyDialogHarness from './GenerateEabKeyDialogHarness';

test.describe('GenerateEabKeyDialog', () => {
    test('generates on open and shows the key with a copy action and the not-stored notice', async ({ mount, page }) => {
        await mount(<GenerateEabKeyDialogHarness generatedKey="abc" />);

        await page.getByTestId('open').click();

        await expect(page.getByTestId('eab-key')).toContainText('abc-');
        await expect(page.getByRole('button', { name: 'Copy key' })).toBeVisible();
        await expect(page.getByTestId('eab-key-notice')).toHaveText(EAB_KEY_NOTICE);
    });

    test('drops the key on close and generates a fresh one when reopened', async ({ mount, page }) => {
        await mount(<GenerateEabKeyDialogHarness generatedKey="abc" />);

        await page.getByTestId('open').click();
        await expect(page.getByTestId('eab-key')).toContainText('abc-');
        const firstKey = await page.getByTestId('eab-key').innerText();
        await page.getByRole('button', { name: 'Close', exact: true }).last().click();
        await expect(page.getByTestId('eab-key')).toHaveCount(0);

        await page.getByTestId('open').click();
        await expect(page.getByTestId('eab-key')).toContainText('abc-');
        expect(await page.getByTestId('eab-key').innerText()).not.toBe(firstKey);
    });

    test('a parent re-render while open keeps the key already shown', async ({ mount, page }) => {
        await mount(<GenerateEabKeyDialogHarness generatedKey="abc" />);

        await page.getByTestId('open').click();
        await expect(page.getByTestId('eab-key')).toContainText('abc-');
        const shownKey = await page.getByTestId('eab-key').innerText();

        await page.getByTestId('rerender').dispatchEvent('click');
        await page.getByTestId('rerender').dispatchEvent('click');

        await expect(page.getByTestId('eab-key')).toHaveText(shownKey);
    });

    test('a failed generation closes the dialog without a key', async ({ mount, page }) => {
        await mount(<GenerateEabKeyDialogHarness fail />);

        await page.getByTestId('open').click();

        await expect(page.getByTestId('state')).toHaveText('closed');
        await expect(page.getByTestId('eab-key')).toHaveCount(0);
    });
});
