import { expect, test } from '../../../../../playwright/ct-test';
import { CertificateRequestContentTestWrapper } from './CertificateRequestContentTestWrapper';

test.describe('CertificateRequestContent', () => {
    test('copying the PEM from the download menu shows the confirmation above the menu trigger', async ({ mount, page }) => {
        await page.evaluate(() => {
            navigator.clipboard.writeText = () => Promise.resolve();
        });
        await mount(<CertificateRequestContentTestWrapper />);
        const trigger = page.getByRole('button', { name: 'Download' });

        await trigger.click();
        await page.getByRole('menuitem', { name: 'Copy PEM to clipboard' }).click();

        await expect(page.getByRole('menu')).toHaveCount(0);
        const toast = page.getByTestId('copied-feedback');
        await expect(toast).toBeVisible();
        const triggerBox = await trigger.boundingBox();
        const toastBox = await toast.boundingBox();
        expect((toastBox?.x ?? 0) + (toastBox?.width ?? 0) / 2).toBeCloseTo((triggerBox?.x ?? 0) + (triggerBox?.width ?? 0) / 2, 0);
        expect((toastBox?.y ?? 0) + (toastBox?.height ?? 0)).toBeLessThanOrEqual(triggerBox?.y ?? 0);
    });
});
