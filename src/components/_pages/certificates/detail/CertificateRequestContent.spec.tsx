import { CertificateType } from 'types/openapi';
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

test.describe('CertificateRequestContent — parts by request type', () => {
    test('shows the subject DN and the ASN.1 structure of an X.509 request', async ({ mount, page }) => {
        await mount(<CertificateRequestContentTestWrapper />);

        await expect(page.getByText('Subject DN')).toBeVisible();
        await expect(page.getByText('ASN.1 Structure')).toBeVisible();
    });

    for (const [name, requestType] of [
        ['another known type', CertificateType.Ssh],
        ['a type this version does not know', 'FUTURE' as CertificateType],
    ] as const) {
        test(`shows neither for a request of ${name}`, async ({ mount, page }) => {
            await mount(<CertificateRequestContentTestWrapper requestType={requestType} />);

            await expect(page.getByText('Signature Algorithm')).toBeVisible();
            await expect(page.getByText('Subject DN')).toHaveCount(0);
            await expect(page.getByText('ASN.1 Structure')).toHaveCount(0);
        });
    }
});
