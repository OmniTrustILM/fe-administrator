import './ct-window-shim';
import type { Page } from '@playwright/test';
import { test, expect } from '../../playwright/ct-test';
import { DeviceType } from './common-hooks';
import { COPIED_FEEDBACK_MS } from './copyFeedback';
import {
    UseWindowSizeHarness,
    UseDeviceTypeHarness,
    UseCopyToClipboardWithStore,
    UseRunOnSuccessfulFinishHarness,
    UseRunOnFailedFinishHarness,
    UseRunOnFinishHarness,
    UseAreDefaultValuesSameHarness,
} from './common-hooks-harness';

test.describe('useWindowSize', () => {
    test('returns width and height as numbers', async ({ mount, page }) => {
        await mount(<UseWindowSizeHarness />);
        const width = page.getByTestId('width');
        const height = page.getByTestId('height');
        await expect(width).toBeVisible({ timeout: 10000 });
        await expect(height).toBeVisible({ timeout: 10000 });
        const w = await width.textContent();
        const h = await height.textContent();
        expect(Number(w)).toBeGreaterThan(0);
        expect(Number(h)).toBeGreaterThan(0);
    });
});

test.describe('useDeviceType', () => {
    test('returns one of mobile, tablet, desktop', async ({ mount, page }) => {
        await mount(<UseDeviceTypeHarness />);
        const el = page.getByTestId('device-type');
        await expect(el).toBeVisible({ timeout: 10000 });
        const value = (await el.textContent())?.trim() ?? '';
        expect([DeviceType.Mobile, DeviceType.Tablet, DeviceType.Desktop]).toContain(value);
    });
});

test.describe('useCopyToClipboard', () => {
    const stubClipboard = (page: Page, succeeds: boolean) =>
        page.evaluate((ok) => {
            navigator.clipboard.writeText = () => (ok ? Promise.resolve() : Promise.reject(new Error('denied')));
        }, succeeds);

    test('a successful copy shows a dark Copied toast above the button and no global alert', async ({ mount, page }) => {
        await stubClipboard(page, true);
        await mount(<UseCopyToClipboardWithStore />);
        const button = page.getByTestId('copy-btn');

        await button.click();

        const toast = page.getByTestId('copied-feedback');
        await expect(toast).toHaveText('Copied');
        const inverse = await page.getByTestId('inverse-reference').evaluate((el) => getComputedStyle(el).backgroundColor);
        await expect(toast).toHaveCSS('background-color', inverse);
        const buttonBox = await button.boundingBox();
        const toastBox = await toast.boundingBox();
        expect((toastBox?.x ?? 0) + (toastBox?.width ?? 0) / 2).toBeCloseTo((buttonBox?.x ?? 0) + (buttonBox?.width ?? 0) / 2, 0);
        expect((toastBox?.y ?? 0) + (toastBox?.height ?? 0)).toBeLessThanOrEqual(buttonBox?.y ?? 0);
        await expect(page.getByTestId('dispatched-alerts')).toHaveText('[]');
    });

    test('the confirmation is announced politely and dismissed after about 1.5 s', async ({ mount, page }) => {
        await stubClipboard(page, true);
        await mount(<UseCopyToClipboardWithStore />);

        await page.getByTestId('copy-btn').click();

        await expect(page.getByRole('status')).toHaveText('Copied');
        await expect(page.getByTestId('copied-feedback')).toHaveCount(0, { timeout: COPIED_FEEDBACK_MS + 1000 });
        await expect(page.getByRole('status')).toHaveText('');
    });

    test('a repeated copy replaces the toast and reuses the live region', async ({ mount, page }) => {
        await stubClipboard(page, true);
        await mount(<UseCopyToClipboardWithStore />);
        const button = page.getByTestId('copy-btn');

        await button.click();
        await expect(page.getByTestId('copied-feedback')).toHaveCount(1);
        await button.click();

        await expect(page.getByRole('status')).toHaveText('Copied');
        await expect(page.getByTestId('copied-feedback')).toHaveCount(1);
        await expect(page.getByRole('status')).toHaveCount(1);
    });

    test('a repeated copy restarts the dismissal instead of inheriting the first deadline', async ({ mount, page }) => {
        const stagger = COPIED_FEEDBACK_MS / 2;
        await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
        await stubClipboard(page, true);
        await mount(<UseCopyToClipboardWithStore />);
        await page.clock.pauseAt(new Date('2026-01-01T00:00:10Z'));
        const button = page.getByTestId('copy-btn');

        await button.click();
        await page.clock.runFor(stagger);
        await expect(page.getByRole('status')).toHaveText('Copied');
        await button.click();
        await page.clock.runFor(COPIED_FEEDBACK_MS - stagger + 100);

        await expect(page.getByRole('status')).toHaveText('Copied');
        await expect(page.getByTestId('copied-feedback')).toHaveCount(1);

        await page.clock.runFor(stagger);

        await expect(page.getByRole('status')).toHaveText('');
        await expect(page.getByTestId('copied-feedback')).toHaveCount(0);
    });

    test('a copy without an anchor still shows the toast', async ({ mount, page }) => {
        await stubClipboard(page, true);
        await mount(<UseCopyToClipboardWithStore />);

        await page.getByTestId('copy-unanchored-btn').click();

        await expect(page.getByTestId('copied-feedback')).toBeVisible();
        await expect(page.getByRole('status')).toHaveText('Copied');
    });

    test('a removed anchor falls back to the bottom of the viewport rather than the focused element', async ({ mount, page }) => {
        await stubClipboard(page, true);
        await mount(<UseCopyToClipboardWithStore />);

        await page.getByTestId('copy-detached-btn').click();

        await expect(page.getByTestId('focus-target')).toBeFocused();
        const toastBox = await page.getByTestId('copied-feedback').boundingBox();
        const viewport = page.viewportSize();
        expect((toastBox?.x ?? 0) + (toastBox?.width ?? 0) / 2).toBeCloseTo((viewport?.width ?? 0) / 2, 0);
        expect((toastBox?.y ?? 0) + (toastBox?.height ?? 0)).toBeGreaterThan((viewport?.height ?? 0) / 2);
    });

    for (const edge of ['left', 'right'] as const) {
        test(`a copy button at the ${edge} viewport edge keeps the whole toast on screen`, async ({ mount, page }) => {
            await stubClipboard(page, true);
            await mount(<UseCopyToClipboardWithStore />);

            await page.getByTestId(`copy-${edge}-edge-btn`).click();

            const toastBox = await page.getByTestId('copied-feedback').boundingBox();
            const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
            expect(toastBox?.x ?? -1).toBeGreaterThanOrEqual(0);
            expect((toastBox?.x ?? 0) + (toastBox?.width ?? 0)).toBeLessThanOrEqual(viewportWidth);
        });
    }

    test('scrolling hides the toast so it never floats away from its button', async ({ mount, page }) => {
        await stubClipboard(page, true);
        await mount(<UseCopyToClipboardWithStore />);

        await page.getByTestId('copy-btn').click();
        await expect(page.getByTestId('copied-feedback')).toBeVisible();
        await page.mouse.wheel(0, 300);

        await expect(page.getByTestId('copied-feedback')).toHaveCount(0);
        await expect(page.getByRole('status')).toHaveText('Copied');
    });

    test('inside a transformed dialog the toast stays on the button and the announcement within the dialog', async ({ mount, page }) => {
        await stubClipboard(page, true);
        await mount(<UseCopyToClipboardWithStore inDialog />);
        const button = page.getByTestId('copy-btn');

        await button.click();

        await expect(page.getByRole('dialog').getByRole('status')).toHaveText('Copied');
        const buttonBox = await button.boundingBox();
        const toastBox = await page.getByTestId('copied-feedback').boundingBox();
        expect((toastBox?.x ?? 0) + (toastBox?.width ?? 0) / 2).toBeCloseTo((buttonBox?.x ?? 0) + (buttonBox?.width ?? 0) / 2, 0);
        expect((toastBox?.y ?? 0) + (toastBox?.height ?? 0)).toBeLessThanOrEqual(buttonBox?.y ?? 0);
    });

    test('a failed copy shows the global error alert and no toast', async ({ mount, page }) => {
        await stubClipboard(page, false);
        await mount(<UseCopyToClipboardWithStore />);

        await page.getByTestId('copy-btn').click();

        await expect(page.getByTestId('dispatched-alerts')).toHaveText(JSON.stringify([{ type: 'alerts/error', payload: 'Error' }]));
        await expect(page.getByTestId('copied-feedback')).toHaveCount(0);
    });
});

test.describe('useRunOnSuccessfulFinish', () => {
    test('runs callback when loading goes true to false and succeeded is true', async ({ mount, page }) => {
        await mount(<UseRunOnSuccessfulFinishHarness />);
        await expect(page.getByTestId('successful-finish-result')).toHaveText('ran', { timeout: 5000 });
    });
});

test.describe('useRunOnFailedFinish', () => {
    test('runs callback when loading goes true to false and succeeded is false', async ({ mount, page }) => {
        await mount(<UseRunOnFailedFinishHarness />);
        await expect(page.getByTestId('failed-finish-result')).toHaveText('ran', { timeout: 5000 });
    });
});

test.describe('useRunOnFinish', () => {
    test('runs callback when loading goes true to false', async ({ mount, page }) => {
        await mount(<UseRunOnFinishHarness />);
        await expect(page.getByTestId('finish-result')).toHaveText('ran', { timeout: 5000 });
    });
});

test.describe('useAreDefaultValuesSame', () => {
    test('returns true when values match defaultValues', async ({ mount, page }) => {
        await mount(<UseAreDefaultValuesSameHarness />);
        await expect(page.getByTestId('same')).toHaveText('true', { timeout: 10000 });
    });

    test('returns false when values differ from defaultValues', async ({ mount, page }) => {
        await mount(<UseAreDefaultValuesSameHarness />);
        await expect(page.getByTestId('diff')).toHaveText('false', { timeout: 10000 });
    });

    test('returns false when values have extra keys', async ({ mount, page }) => {
        await mount(<UseAreDefaultValuesSameHarness />);
        await expect(page.getByTestId('diff-keys')).toHaveText('false', { timeout: 10000 });
    });
});
