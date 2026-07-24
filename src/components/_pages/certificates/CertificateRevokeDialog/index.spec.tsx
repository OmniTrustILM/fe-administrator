import { test, expect } from '../../../../../playwright/ct-test';
import { testInitialState } from 'ducks/test-reducers';
import type { AttributeDescriptorModel } from 'types/attributes';
import { AttributeContentType, AttributeType, CertificateState } from 'types/openapi';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { CertificateRevokeDialogTestWrapper } from './CertificateRevokeDialogTestWrapper';

const revokeDataDescriptor: AttributeDescriptorModel = {
    type: AttributeType.Data,
    name: 'revokeField',
    uuid: 'revoke-data-uuid-1',
    contentType: AttributeContentType.String,
    properties: { label: 'Revoke Field', required: false, readOnly: false, visible: true, list: false, multiSelect: false },
} as AttributeDescriptorModel;

const certificateWithKey: CertificateDetailResponseModel = {
    uuid: 'certificate-uuid',
    commonName: 'test-certificate',
    state: CertificateState.Issued,
    raProfile: { uuid: 'ra-profile-uuid', name: 'Test RA Profile', authorityInstanceUuid: 'authority-uuid' },
    key: { uuid: 'key-uuid', name: 'Test Key' },
} as CertificateDetailResponseModel;

test.describe('CertificateRevokeDialog', () => {
    test('renders the revocation reason selector', async ({ mount, page }) => {
        await mount(<CertificateRevokeDialogTestWrapper />);
        await expect(page.getByTestId('select-revokeReason-trigger')).toBeVisible();
        await expect(page.getByTestId('revokeSubmit')).toBeVisible();
    });

    test('renders fetched revoke-attribute descriptors as fields', async ({ mount, page }) => {
        await mount(
            <CertificateRevokeDialogTestWrapper
                preloadedState={{
                    certificates: { ...testInitialState.certificates, revocationAttributes: [revokeDataDescriptor] },
                }}
            />,
        );
        await expect(page.getByTestId('text-input-__attributes__revoke__.revokeField')).toBeVisible();
    });

    test('hides destroyKey switch when the certificate has no associated key', async ({ mount, page }) => {
        await mount(<CertificateRevokeDialogTestWrapper />);
        await expect(page.getByTestId('switch-destroyKey')).toHaveCount(0);
    });

    test('shows destroyKey switch, unchecked, when the certificate has an associated key', async ({ mount, page }) => {
        await mount(<CertificateRevokeDialogTestWrapper certificate={certificateWithKey} />);
        await expect(page.getByTestId('switch-destroyKey')).toBeVisible();
        await expect(page.getByTestId('switch-destroyKey-input')).not.toBeChecked();
    });

    test('closes the dialog on submit (reason-only path)', async ({ mount, page }) => {
        await mount(<CertificateRevokeDialogTestWrapper />);
        await page.getByTestId('revokeSubmit').click();
        await expect(page.getByTestId('dialog-closed')).toBeAttached();
    });
});
