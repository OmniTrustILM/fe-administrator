import { test, expect } from '../../../../../playwright/ct-test';
import type { AttributeDescriptorModel } from 'types/attributes';
import { AttributeContentType, AttributeType } from 'types/openapi';
import { IssueCertificateFormTestWrapper } from './IssueCertificateFormTestWrapper';

const commonNameDescriptor: AttributeDescriptorModel = {
    type: AttributeType.Data,
    name: 'commonName',
    uuid: 'csr-cn-uuid',
    contentType: AttributeContentType.String,
    properties: { label: 'Common Name', required: true, readOnly: false, visible: true, list: false, multiSelect: false },
} as AttributeDescriptorModel;

// The form pre-fills the default content, so clearing the field is what produces an empty value.
const sanWithDefaultDescriptor: AttributeDescriptorModel = {
    type: AttributeType.Data,
    name: 'SAN_DNS',
    uuid: 'csr-san-uuid',
    contentType: AttributeContentType.String,
    properties: { label: 'Subject Alternative Name', required: false, readOnly: false, visible: true, list: false, multiSelect: false },
    content: [{ data: 'default.example.com' }],
} as AttributeDescriptorModel;

test.describe('Location IssueCertificateForm', () => {
    test('issueCertificate payload omits a CSR attribute whose default was cleared', async ({ mount, page }) => {
        const dispatched: { type: string; payload?: any }[] = [];

        await mount(
            <IssueCertificateFormTestWrapper
                onAction={(a) => dispatched.push(a)}
                csrAttributeDescriptors={[commonNameDescriptor, sanWithDefaultDescriptor]}
            />,
        );

        await page.getByTestId('select-certificateSelect-trigger').click();
        await page.getByRole('option', { name: 'RA One' }).click();

        const commonNameInput = page.getByTestId('text-input-__attributes__csrAttributes__.commonName');
        await commonNameInput.click();
        await commonNameInput.fill('cmp-device-07');
        const sanInput = page.getByTestId('text-input-__attributes__csrAttributes__.SAN_DNS');
        await expect(sanInput).toHaveValue('default.example.com');
        await sanInput.click();
        await sanInput.fill('');

        await page.getByRole('button', { name: 'Issue' }).click();

        await expect.poll(() => dispatched.find((a) => a.type === 'locations/issueCertificate')).toBeTruthy();
        const action = dispatched.find((a) => a.type === 'locations/issueCertificate');
        // The entity provider builds the CSR from these attributes, so an empty value must not reach it.
        const csrAttributes = action?.payload.issueRequest.csrAttributes as { name: string }[];
        expect(csrAttributes.map((a) => a.name)).toEqual(['commonName']);
        expect(action?.payload.issueRequest.raProfileUuid).toBe('ra-1');
    });
});
