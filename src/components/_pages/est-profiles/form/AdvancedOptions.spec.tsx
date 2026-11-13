import type { Page } from '@playwright/test';
import { expect, test } from '../../../../../playwright/ct-test';
import AdvancedOptionsHarness from './AdvancedOptionsHarness';

const SUMMARY = 'Response timing: wait 10 s · Retry-After 30 s · key generation wait 30 s';

// TextInput removes readonly on focus (anti-autofill), so the field is focused before it is filled.
async function fillField(page: Page, id: string, value: string) {
    const input = page.locator(`#${id}`);
    await input.focus();
    await input.fill(value);
}

test.describe('AdvancedOptions', () => {
    test('is collapsed by default and summarises the response timing', async ({ mount, page }) => {
        await mount(<AdvancedOptionsHarness />);

        await expect(page.getByTestId('advanced-options-toggle')).toHaveAttribute('aria-expanded', 'false');
        await expect(page.getByTestId('response-timing-summary')).toHaveText(SUMMARY);
        await expect(page.locator('#retryAfter')).toHaveCount(0);
    });

    test('the toggle expands and collapses the section', async ({ mount, page }) => {
        await mount(<AdvancedOptionsHarness />);
        const toggle = page.getByTestId('advanced-options-toggle');

        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator('#retryAfter')).toBeVisible();

        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(page.getByTestId('response-timing-summary')).toBeVisible();
    });

    test('starts expanded when asked to', async ({ mount, page }) => {
        await mount(<AdvancedOptionsHarness initiallyExpanded />);

        await expect(page.getByTestId('advanced-options-toggle')).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator('#issueWaitTimeout')).toBeVisible();
    });

    test('shows the key generation wait only with server key generation', async ({ mount, page }) => {
        const component = await mount(<AdvancedOptionsHarness initiallyExpanded />);
        await expect(page.locator('#serverKeyGenerationTimeout')).toHaveCount(0);

        await component.update(<AdvancedOptionsHarness initiallyExpanded serverKeyGeneration />);

        await expect(page.locator('#serverKeyGenerationTimeout')).toBeVisible();
    });

    test('an invalid value shows its error', async ({ mount, page }) => {
        await mount(<AdvancedOptionsHarness initiallyExpanded />);

        await fillField(page, 'retryAfter', '0');

        await expect(page.getByText('Enter a whole number of seconds, 1 or more.')).toBeVisible();
    });

    test('a validation error expands a collapsed section', async ({ mount, page }) => {
        await mount(<AdvancedOptionsHarness initial={{ retryAfter: '0' }} initiallyExpanded={false} />);

        await expect(page.getByTestId('advanced-options-toggle')).toHaveAttribute('aria-expanded', 'true');
        await expect(page.getByText('Enter a whole number of seconds, 1 or more.')).toBeVisible();
    });

    test('Restore defaults resets custom values', async ({ mount, page }) => {
        await mount(
            <AdvancedOptionsHarness
                initial={{ issueWaitTimeout: '0', retryAfter: '99', serverKeyGenerationTimeout: '5' }}
                initiallyExpanded
                serverKeyGeneration
            />,
        );

        await page.getByRole('button', { name: 'Restore defaults' }).click();

        await expect(page.getByTestId('values')).toHaveText(
            JSON.stringify({ issueWaitTimeout: '10', retryAfter: '30', serverKeyGenerationTimeout: '30' }),
        );
    });

    test('the request carries the three numbers', async ({ mount, page }) => {
        await mount(<AdvancedOptionsHarness initiallyExpanded serverKeyGeneration />);

        await fillField(page, 'issueWaitTimeout', '0');
        await fillField(page, 'retryAfter', '7');
        await fillField(page, 'serverKeyGenerationTimeout', '45');
        await page.getByTestId('submit').click();

        await expect(page.getByTestId('submitted')).toHaveText(
            JSON.stringify({ issueWaitTimeout: 0, retryAfter: 7, serverKeyGenerationTimeout: 45 }),
        );
    });
});
