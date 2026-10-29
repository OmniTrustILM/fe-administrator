import './ct-window-shim';
import type { Page } from '@playwright/test';
import { test, expect } from '../../playwright/ct-test';
import { DeviceType } from './common-hooks';
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
        await expect(page.getByTestId('copied-feedback')).toHaveCount(0, { timeout: 2500 });
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

    test('a copy without an anchor still shows the toast', async ({ mount, page }) => {
        await stubClipboard(page, true);
        await mount(<UseCopyToClipboardWithStore />);

        await page.getByTestId('copy-unanchored-btn').click();

        await expect(page.getByTestId('copied-feedback')).toBeVisible();
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
