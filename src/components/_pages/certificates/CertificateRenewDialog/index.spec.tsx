import { testInitialState } from 'ducks/test-reducers';
import type { AttributeDescriptorModel } from 'types/attributes';
import { AttributeContentType, AttributeType } from 'types/openapi';
import { expect, test } from '../../../../../playwright/ct-test';
import { CertificateRenewDialogTestWrapper } from './CertificateRenewDialogTestWrapper';

const renewDescriptor: AttributeDescriptorModel = {
    type: AttributeType.Data,
    name: 'renewField',
    uuid: 'renew-data-uuid-1',
    contentType: AttributeContentType.String,
    properties: { label: 'Renew Field', required: false, readOnly: false, visible: true, list: false, multiSelect: false },
} as AttributeDescriptorModel;

const withRenewSchema = { certificates: { ...testInitialState.certificates, renewAttributes: [renewDescriptor] } };

test.describe('CertificateRenewDialog', () => {
    test('asks for the renew schema of the certificate RA profile', async ({ mount, page }) => {
        await mount(<CertificateRenewDialogTestWrapper />);

        await expect
            .poll(async () => JSON.parse((await page.getByTestId('dispatched').textContent()) ?? '[]'))
            .toContainEqual({
                type: 'certificates/getRenewAttributes',
                payload: { raProfileUuid: 'ra-profile-uuid', authorityUuid: 'authority-uuid' },
            });
    });

    test('an empty schema shows no attribute section and renews with no attributes', async ({ mount, page }) => {
        await mount(<CertificateRenewDialogTestWrapper />);

        await expect(page.getByText('Renew Attributes')).toHaveCount(0);
        await page.getByTestId('renewSubmit').click();

        await expect(page.getByTestId('renew-payload')).not.toBeEmpty();
        const payload = JSON.parse((await page.getByTestId('renew-payload').textContent()) ?? '{}');
        expect(payload.attributes).toEqual([]);
        expect(payload.fileContent).toBeUndefined();
    });

    test('renders the renew schema and sends the entered values with the renewal', async ({ mount, page }) => {
        await mount(<CertificateRenewDialogTestWrapper preloadedState={withRenewSchema} />);

        await expect(page.getByText('Renew Attributes')).toBeVisible();
        const field = page.getByTestId('text-input-__attributes__renew__.renewField');
        await field.click();
        await field.fill('renew-value');
        await page.getByTestId('renewSubmit').click();

        await expect(page.getByTestId('renew-payload')).not.toBeEmpty();
        const payload = JSON.parse((await page.getByTestId('renew-payload').textContent()) ?? '{}');
        expect(payload.attributes).toHaveLength(1);
        expect(payload.attributes[0]).toMatchObject({ name: 'renewField', uuid: 'renew-data-uuid-1', content: [{ data: 'renew-value' }] });
    });

    test('a certificate without an RA profile asks for no schema', async ({ mount, page }) => {
        await mount(
            <CertificateRenewDialogTestWrapper certificate={{ uuid: 'certificate-uuid', privateKeyAvailability: true } as never} />,
        );

        await expect(page.getByTestId('renewSubmit')).toBeVisible();
        const dispatched = JSON.parse((await page.getByTestId('dispatched').textContent()) ?? '[]');
        expect(dispatched.filter((a: { type: string }) => a.type === 'certificates/getRenewAttributes')).toEqual([]);
    });
});
