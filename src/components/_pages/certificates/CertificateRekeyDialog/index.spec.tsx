import type { Page } from '@playwright/test';
import { testInitialState } from 'ducks/test-reducers';
import type { AttributeDescriptorModel } from 'types/attributes';
import { AttributeContentType, AttributeType } from 'types/openapi';
import { expect, test } from '../../../../../playwright/ct-test';
import { CertificateRekeyDialogTestWrapper } from './CertificateRekeyDialogTestWrapper';

const renewDescriptor: AttributeDescriptorModel = {
    type: AttributeType.Data,
    name: 'renewField',
    uuid: 'renew-data-uuid-1',
    contentType: AttributeContentType.String,
    properties: { label: 'Renew Field', required: false, readOnly: false, visible: true, list: false, multiSelect: false },
} as AttributeDescriptorModel;

const withRenewSchema = { certificates: { ...testInitialState.certificates, renewAttributes: [renewDescriptor] } };

const dispatched = async (page: Page): Promise<{ type: string; payload?: unknown }[]> =>
    JSON.parse((await page.getByTestId('dispatched').textContent()) ?? '[]');

const chooseExternalCsr = async (page: Page) => {
    await page.getByTestId('select-uploadCsr-trigger').click();
    await page.getByRole('option', { name: 'External' }).click();
    await page.locator('textarea').fill('csr-content');
};

test.describe('CertificateRekeyDialog', () => {
    test('asks for the renew schema, since a rekey is a renew at the authority', async ({ mount, page }) => {
        await mount(<CertificateRekeyDialogTestWrapper />);

        await expect
            .poll(() => dispatched(page))
            .toContainEqual({
                type: 'certificates/getRenewAttributes',
                payload: { raProfileUuid: 'ra-profile-uuid', authorityUuid: 'authority-uuid' },
            });
        await expect(page.getByText('Renew Attributes')).toHaveCount(0);
    });

    test('renders the renew schema and sends the entered values on the rekey request', async ({ mount, page }) => {
        await mount(<CertificateRekeyDialogTestWrapper preloadedState={withRenewSchema} />);

        await expect(page.getByText('Renew Attributes')).toBeVisible();
        await chooseExternalCsr(page);
        const field = page.getByTestId('text-input-__attributes__renew__.renewField');
        await field.click();
        await field.fill('renew-value');
        await page.getByTestId('progress-button').click();

        await expect.poll(async () => (await dispatched(page)).some((a) => a.type === 'certificates/rekeyCertificate')).toBe(true);
        const rekey = (await dispatched(page)).find((a) => a.type === 'certificates/rekeyCertificate');
        expect(rekey?.payload).toMatchObject({
            uuid: 'certificate-uuid',
            raProfileUuid: 'ra-profile-uuid',
            authorityUuid: 'authority-uuid',
            rekey: { attributes: [{ name: 'renewField', uuid: 'renew-data-uuid-1', content: [{ data: 'renew-value' }] }] },
        });
    });

    test('an empty schema rekeys with no attributes', async ({ mount, page }) => {
        await mount(<CertificateRekeyDialogTestWrapper />);

        await chooseExternalCsr(page);
        await page.getByTestId('progress-button').click();

        await expect.poll(async () => (await dispatched(page)).some((a) => a.type === 'certificates/rekeyCertificate')).toBe(true);
        const rekey = (await dispatched(page)).find((a) => a.type === 'certificates/rekeyCertificate');
        expect(rekey?.payload).toMatchObject({ rekey: { attributes: [] } });
    });
});
