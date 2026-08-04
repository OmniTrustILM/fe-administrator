import { test, expect } from 'playwright/ct-test';
import AlertsWithStore from 'components/Alerts/AlertsWithStore';
import { alertsSlice } from 'ducks/alert-slice';
import type { MessageModel } from 'types/alerts';

function createAlertMessage(overrides: Partial<MessageModel> = {}): MessageModel {
    return { id: 0, message: 'Test message', time: Date.now(), color: 'success', ...overrides };
}

test.describe('Alerts', () => {
    test('should render alerts container when no messages', async ({ mount, page }) => {
        await mount(<AlertsWithStore />);

        await expect(page.getByTestId('alerts-container')).toBeAttached();
        await expect(page.getByRole('alert')).toHaveCount(0);
    });

    test('should render success alert', async ({ mount, page }) => {
        const messages = [createAlertMessage({ id: 1, message: 'Saved successfully', color: 'success' })];
        await mount(<AlertsWithStore preloadedState={{ [alertsSlice.name]: { messages, msgId: 2 } }} />);

        const alert = page.getByTestId('alert-1');
        await expect(alert).toBeVisible();
        await expect(alert).not.toHaveAttribute('role');
        await expect(alert).toContainText('Saved successfully');
    });

    test('should render danger alert with role alert and no progress bar', async ({ mount, page }) => {
        const messages = [createAlertMessage({ id: 6, message: 'Broken', color: 'danger' })];
        await mount(<AlertsWithStore preloadedState={{ [alertsSlice.name]: { messages, msgId: 7 } }} />);

        const alert = page.getByTestId('alert-6');
        await expect(alert).toHaveAttribute('role', 'alert');
        await expect(page.getByTestId('alert-progress-6')).toHaveCount(0);
    });

    test('should style info alert distinctly from danger', async ({ mount, page }) => {
        const messages = [
            createAlertMessage({ id: 7, message: 'FYI', color: 'info' }),
            createAlertMessage({ id: 8, message: 'Bad', color: 'danger' }),
        ];
        await mount(<AlertsWithStore preloadedState={{ [alertsSlice.name]: { messages, msgId: 9 } }} />);

        await expect(page.getByTestId('alert-7')).toHaveClass(/border-l-blue-500/);
        await expect(page.getByTestId('alert-7')).not.toHaveAttribute('role');
        await expect(page.getByTestId('alert-8')).toHaveClass(/border-l-red-500/);
    });

    test('should show progress bar for success and info alerts', async ({ mount, page }) => {
        const messages = [
            createAlertMessage({ id: 9, message: 'Done', color: 'success' }),
            createAlertMessage({ id: 10, message: 'FYI', color: 'info' }),
        ];
        await mount(<AlertsWithStore preloadedState={{ [alertsSlice.name]: { messages, msgId: 11 } }} />);

        await expect(page.getByTestId('alert-progress-9')).toBeVisible();
        await expect(page.getByTestId('alert-progress-10')).toBeVisible();
    });

    test('should render danger alert', async ({ mount, page }) => {
        const messages = [createAlertMessage({ id: 2, message: 'Something failed', color: 'danger' })];
        await mount(<AlertsWithStore preloadedState={{ [alertsSlice.name]: { messages, msgId: 3 } }} />);

        await expect(page.getByTestId('alert-2')).toBeVisible();
        await expect(page.getByTestId('alert-2')).toContainText('Something failed');
    });

    test('should strip img element from XSS payload', async ({ mount, page }) => {
        const xssMessage = '<img src=x onerror="window.__xss=true" alt="">Safe text';
        const messages = [createAlertMessage({ id: 4, message: xssMessage, color: 'danger' })];
        await mount(<AlertsWithStore preloadedState={{ [alertsSlice.name]: { messages, msgId: 5 } }} />);

        const alert = page.getByTestId('alert-4');
        await expect(alert).toBeVisible();
        await expect(alert).toContainText('Safe text');
        await expect(alert.locator('img')).toHaveCount(0);
    });

    test('should strip style tags, forms and attributes while keeping basic formatting', async ({ mount, page }) => {
        const message = '<style>body{display:none}</style><form><input name="user"></form><b class="evil">Important</b> detail';
        const messages = [createAlertMessage({ id: 30, message, color: 'danger' })];
        await mount(<AlertsWithStore preloadedState={{ [alertsSlice.name]: { messages, msgId: 31 } }} />);

        const alert = page.getByTestId('alert-30');
        await expect(alert).toContainText('Important detail');
        await expect(alert.locator('style')).toHaveCount(0);
        await expect(alert.locator('form')).toHaveCount(0);
        await expect(alert.locator('input')).toHaveCount(0);
        await expect(alert.locator('b')).toHaveCount(1);
        await expect(alert.locator('b')).not.toHaveAttribute('class');
    });

    test('should strip aria and data attributes so messages cannot hide from screen readers', async ({ mount, page }) => {
        const message = '<span aria-hidden="true" data-tracking="x">Critical failure</span>';
        const messages = [createAlertMessage({ id: 31, message, color: 'danger' })];
        await mount(<AlertsWithStore preloadedState={{ [alertsSlice.name]: { messages, msgId: 32 } }} />);

        const span = page.getByTestId('alert-31').locator('span', { hasText: 'Critical failure' });
        await expect(span).not.toHaveAttribute('aria-hidden');
        await expect(span).not.toHaveAttribute('data-tracking');
    });

    test('should remove script tags from XSS payload', async ({ mount, page }) => {
        const xssMessage = '<script>window.__xss=true</script>Visible text';
        const messages = [createAlertMessage({ id: 5, message: xssMessage, color: 'danger' })];
        await mount(<AlertsWithStore preloadedState={{ [alertsSlice.name]: { messages, msgId: 6 } }} />);

        const alert = page.getByTestId('alert-5');
        await expect(alert).toBeVisible();
        await expect(alert).toContainText('Visible text');
        await expect(alert.locator('script')).toHaveCount(0);
    });

    test('should keep angle-bracketed identifiers in a backend error message', async ({ mount, page }) => {
        const message = 'Certificate not imported, alias <cert-alias> already exists on <host.example.com>';
        const messages = [createAlertMessage({ id: 63, message, color: 'danger' })];
        await mount(<AlertsWithStore preloadedState={{ [alertsSlice.name]: { messages, msgId: 64 } }} />);

        await expect(page.getByTestId('alert-63')).toHaveText(message);
    });

    test('should still render supported formatting around bracketed identifiers', async ({ mount, page }) => {
        const messages = [createAlertMessage({ id: 64, message: '<b>Failed</b> for <cert-alias>', color: 'danger' })];
        await mount(<AlertsWithStore preloadedState={{ [alertsSlice.name]: { messages, msgId: 65 } }} />);

        const alert = page.getByTestId('alert-64');
        await expect(alert).toHaveText('Failed for <cert-alias>');
        await expect(alert.locator('b')).toHaveText('Failed');
    });

    test('should remove alert when dismiss button clicked', async ({ mount, page }) => {
        const messages = [createAlertMessage({ id: 3, message: 'Dismiss me', color: 'info' })];
        await mount(<AlertsWithStore preloadedState={{ [alertsSlice.name]: { messages, msgId: 4 } }} />);

        await expect(page.getByTestId('alert-3')).toBeVisible();
        await page.getByTestId('alert-3').getByRole('button').click();
        await expect(page.getByTestId('alert-3')).not.toBeAttached();
    });

    test('should auto-dismiss success alert after timeout', async ({ mount, page }) => {
        const messages = [createAlertMessage({ id: 11, message: 'Bye soon', color: 'success' })];
        await mount(<AlertsWithStore autoDismissMs={500} preloadedState={{ [alertsSlice.name]: { messages, msgId: 12 } }} />);

        await expect(page.getByTestId('alert-11')).toBeVisible();
        await expect(page.getByTestId('alert-11')).not.toBeAttached({ timeout: 3000 });
    });

    test('should keep danger alert past the auto-dismiss window', async ({ mount, page }) => {
        const messages = [
            createAlertMessage({ id: 12, message: 'Stays put', color: 'danger' }),
            createAlertMessage({ id: 34, message: 'Sentinel that auto-dismisses', color: 'success' }),
        ];
        await mount(<AlertsWithStore autoDismissMs={500} preloadedState={{ [alertsSlice.name]: { messages, msgId: 35 } }} />);

        await expect(page.getByTestId('alert-34')).not.toBeAttached({ timeout: 5000 });
        await expect(page.getByTestId('alert-12')).toBeVisible();
    });

    test('should pause auto-dismiss while hovered and resume after', async ({ mount, page }) => {
        const messages = [
            createAlertMessage({ id: 35, message: 'Sentinel that auto-dismisses', color: 'success' }),
            createAlertMessage({ id: 13, message: 'Hover me', color: 'info' }),
        ];
        await mount(<AlertsWithStore autoDismissMs={2000} preloadedState={{ [alertsSlice.name]: { messages, msgId: 36 } }} />);

        const alert = page.getByTestId('alert-13');
        await alert.hover();

        const playState = await page.getByTestId('alert-progress-13').evaluate((element) => getComputedStyle(element).animationPlayState);
        expect(playState).toBe('paused');

        await expect(page.getByTestId('alert-35')).not.toBeAttached({ timeout: 10000 });
        await expect(alert).toBeVisible();

        await page.mouse.move(0, 0);
        await expect(alert).not.toBeAttached({ timeout: 10000 });
    });

    const longMessage = Array.from({ length: 30 }, (_, index) => `Line ${index} of a very long backend error report.`).join(' ');

    test('should clamp long message and expand on demand', async ({ mount, page }) => {
        const messages = [createAlertMessage({ id: 14, message: longMessage, color: 'danger' })];
        await mount(<AlertsWithStore preloadedState={{ [alertsSlice.name]: { messages, msgId: 15 } }} />);

        const showMore = page.getByRole('button', { name: 'Show more' });
        await expect(showMore).toBeVisible();

        await showMore.click();
        await expect(page.getByRole('button', { name: 'Show less' })).toBeVisible();

        await page.getByRole('button', { name: 'Show less' }).click();
        await expect(page.getByRole('button', { name: 'Show more' })).toBeVisible();
    });

    test('should not offer expansion for short messages', async ({ mount, page }) => {
        const messages = [createAlertMessage({ id: 15, message: 'Short one', color: 'success' })];
        await mount(<AlertsWithStore preloadedState={{ [alertsSlice.name]: { messages, msgId: 16 } }} />);

        await expect(page.getByTestId('alert-15')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Show more' })).toHaveCount(0);
    });

    test('should copy expanded danger message as plain text', async ({ mount, page }) => {
        const messages = [createAlertMessage({ id: 16, message: `<b>Bold</b> ${longMessage}`, color: 'danger' })];
        await mount(<AlertsWithStore preloadedState={{ [alertsSlice.name]: { messages, msgId: 17 } }} />);

        await page.evaluate(() => {
            const copied: string[] = [];
            (globalThis as { __copiedTexts?: string[] }).__copiedTexts = copied;
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: {
                    writeText: (text: string) => {
                        copied.push(text);
                        return Promise.resolve();
                    },
                },
            });
        });

        await page.getByRole('button', { name: 'Show more' }).click();
        await page.getByRole('button', { name: 'Copy' }).click();

        await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
        const copiedTexts = await page.evaluate(() => (globalThis as { __copiedTexts?: string[] }).__copiedTexts);
        expect(copiedTexts?.[0]).toContain('Bold');
        expect(copiedTexts?.[0]).not.toContain('<b>');
    });

    test('should copy bracketed identifiers along with the rest of the message', async ({ mount, page }) => {
        const messages = [createAlertMessage({ id: 65, message: `alias <cert-alias> already exists. ${longMessage}`, color: 'danger' })];
        await mount(<AlertsWithStore preloadedState={{ [alertsSlice.name]: { messages, msgId: 66 } }} />);

        await page.evaluate(() => {
            const copied: string[] = [];
            (globalThis as { __copiedTexts?: string[] }).__copiedTexts = copied;
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: {
                    writeText: (text: string) => {
                        copied.push(text);
                        return Promise.resolve();
                    },
                },
            });
        });

        await page.getByRole('button', { name: 'Show more' }).click();
        await page.getByRole('button', { name: 'Copy' }).click();

        await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
        const copiedTexts = await page.evaluate(() => (globalThis as { __copiedTexts?: string[] }).__copiedTexts);
        expect(copiedTexts?.[0]).toContain('alias <cert-alias> already exists.');
    });

    test('should show dismiss all for three or more alerts and clear the stack', async ({ mount, page }) => {
        const messages = [
            createAlertMessage({ id: 17, message: 'One', color: 'danger' }),
            createAlertMessage({ id: 18, message: 'Two', color: 'danger' }),
            createAlertMessage({ id: 19, message: 'Three', color: 'danger' }),
        ];
        await mount(<AlertsWithStore preloadedState={{ [alertsSlice.name]: { messages, msgId: 20 } }} />);

        await page.getByRole('button', { name: 'Dismiss all' }).click();
        await expect(page.getByRole('alert')).toHaveCount(0);
    });

    test('should not show dismiss all for fewer than three alerts', async ({ mount, page }) => {
        const messages = [
            createAlertMessage({ id: 20, message: 'One', color: 'danger' }),
            createAlertMessage({ id: 21, message: 'Two', color: 'danger' }),
        ];
        await mount(<AlertsWithStore preloadedState={{ [alertsSlice.name]: { messages, msgId: 22 } }} />);

        await expect(page.getByTestId('alert-20')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Dismiss all' })).toHaveCount(0);
    });

    test('should keep the severity accent border in dark mode', async ({ mount, page }) => {
        const messages = [createAlertMessage({ id: 22, message: 'Dark accent', color: 'danger' })];
        await mount(<AlertsWithStore preloadedState={{ [alertsSlice.name]: { messages, msgId: 23 } }} />);

        await page.evaluate(() => document.documentElement.classList.add('dark'));

        const { left, top } = await page.getByTestId('alert-22').evaluate((element) => {
            const style = getComputedStyle(element);
            return { left: style.borderLeftColor, top: style.borderTopColor };
        });
        expect(left).not.toBe(top);
    });

    test('should pause auto-dismiss while a control inside the toast has keyboard focus', async ({ mount, page }) => {
        const messages = [
            createAlertMessage({ id: 36, message: 'Sentinel that auto-dismisses', color: 'success' }),
            createAlertMessage({ id: 23, message: 'Focus me', color: 'info' }),
        ];
        await mount(<AlertsWithStore autoDismissMs={2000} preloadedState={{ [alertsSlice.name]: { messages, msgId: 37 } }} />);

        await page.getByTestId('alert-23').getByRole('button', { name: 'Dismiss' }).focus();

        const playState = await page.getByTestId('alert-progress-23').evaluate((element) => getComputedStyle(element).animationPlayState);
        expect(playState).toBe('paused');

        await expect(page.getByTestId('alert-36')).not.toBeAttached({ timeout: 10000 });
        await expect(page.getByTestId('alert-23')).toBeVisible();
    });

    test('should keep the newest alert visible when the stack overflows', async ({ mount, page }) => {
        const messages = Array.from({ length: 8 }, (_, index) =>
            createAlertMessage({ id: 40 + index, message: `${longMessage} #${index}`, color: 'danger' as const }),
        );
        await mount(<AlertsWithStore preloadedState={{ [alertsSlice.name]: { messages, msgId: 50 } }} />);

        await expect(page.getByTestId('alert-47')).toBeInViewport();
        await expect(page.getByRole('button', { name: 'Dismiss all' })).toBeInViewport();
    });

    test('should mirror the newest auto-dismissing alert into a persistent live region', async ({ mount, page }) => {
        const messages = [
            createAlertMessage({ id: 60, message: 'First success', color: 'success' }),
            createAlertMessage({ id: 61, message: '<b>Second</b> success', color: 'success' }),
            createAlertMessage({ id: 62, message: 'A failure', color: 'danger' }),
        ];
        await mount(<AlertsWithStore autoDismissMs={600000} preloadedState={{ [alertsSlice.name]: { messages, msgId: 63 } }} />);

        const announcer = page.getByTestId('alerts-announcer');
        await expect(announcer).toHaveJSProperty('tagName', 'OUTPUT');
        await expect(announcer).toHaveText('Second success');
        await expect(page.getByTestId('alerts-scroll-area')).not.toHaveAttribute('aria-live');

        await page.getByTestId('alert-61').getByRole('button', { name: 'Dismiss' }).click();
        await expect(page.getByTestId('alert-61')).not.toBeAttached();
        await expect(announcer).toHaveText('Second success');
    });

    test('should announce bracketed identifiers to screen readers', async ({ mount, page }) => {
        const messages = [createAlertMessage({ id: 66, message: 'Imported as <cert-alias>', color: 'info' })];
        await mount(<AlertsWithStore autoDismissMs={600000} preloadedState={{ [alertsSlice.name]: { messages, msgId: 67 } }} />);

        await expect(page.getByTestId('alerts-announcer')).toHaveText('Imported as <cert-alias>');
    });

    test('should clip horizontal overflow so the entry animation cannot flash a scrollbar', async ({ mount, page }) => {
        const messages = [createAlertMessage({ id: 50, message: 'Slide in', color: 'success' })];
        await mount(<AlertsWithStore preloadedState={{ [alertsSlice.name]: { messages, msgId: 51 } }} />);

        const overflowX = await page.getByTestId('alerts-scroll-area').evaluate((element) => getComputedStyle(element).overflowX);
        expect(overflowX).toBe('hidden');
    });
});
