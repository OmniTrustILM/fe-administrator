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
            await mount(<CertificateRequestContentTestWrapper requestType={requestType} requestFields={{ commonName: undefined }} />);

            await expect(page.getByText('Signature Algorithm')).toBeVisible();
            await expect(page.getByText('Subject DN')).toHaveCount(0);
            await expect(page.getByText('ASN.1 Structure')).toHaveCount(0);
        });

        test(`shows a shared property only when a request of ${name} has it`, async ({ mount, page }) => {
            await mount(
                <CertificateRequestContentTestWrapper
                    requestType={requestType}
                    requestFields={{ commonName: undefined, publicKeyAlgorithm: undefined, subjectDn: 'CN=host.example' }}
                />,
            );

            await expect(page.getByText('Subject DN')).toBeVisible();
            await expect(page.getByText('Common Name')).toHaveCount(0);
            await expect(page.getByText('Public Key Algorithm')).toHaveCount(0);
        });

        test(`offers a request of ${name} only as the raw file`, async ({ mount, page }) => {
            await mount(<CertificateRequestContentTestWrapper requestType={requestType} />);

            await page.getByRole('button', { name: 'Download' }).click();

            await expect(page.getByRole('menuitem', { name: 'REQ (.req)' })).toBeVisible();
            await expect(page.getByRole('menuitem', { name: 'PEM (.pem)' })).toHaveCount(0);
            await expect(page.getByRole('menuitem', { name: 'Copy PEM to clipboard' })).toHaveCount(0);
        });
    }

    test('shows the common name and public key algorithm rows of an X.509 request without a value for them', async ({ mount, page }) => {
        await mount(<CertificateRequestContentTestWrapper requestFields={{ commonName: undefined, publicKeyAlgorithm: undefined }} />);

        await expect(page.getByText('Common Name')).toBeVisible();
        await expect(page.getByText('Public Key Algorithm')).toBeVisible();
    });
});

test.describe('CertificateRequestContent — downloaded file names', () => {
    for (const [item, fileName] of [
        ['PEM (.pem)', 'web-01 host key_CSR.pem'],
        ['REQ (.req)', 'web-01 host key_CSR.req'],
    ] as const) {
        test(`names the ${item} file after the display name of a certificate without a serial number`, async ({ mount, page }) => {
            await mount(
                <CertificateRequestContentTestWrapper
                    certificateFields={{ displayName: 'web-01 host key', commonName: 'web-01.example', serialNumber: undefined }}
                />,
            );
            await page.getByRole('button', { name: 'Download' }).click();
            const download = page.waitForEvent('download');

            await page.getByRole('menuitem', { name: item }).click();

            expect((await download).suggestedFilename()).toBe(fileName);
        });
    }
});
