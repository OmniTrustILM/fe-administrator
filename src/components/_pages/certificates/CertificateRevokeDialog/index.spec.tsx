import { test, expect } from '../../../../../playwright/ct-test';
import { testInitialState } from 'ducks/test-reducers';
import type { AttributeDescriptorModel } from 'types/attributes';
import { AttributeContentType, AttributeType, CertificateRevocationReason, CertificateState } from 'types/openapi';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { CertificateRevokeDialogTestWrapper } from './CertificateRevokeDialogTestWrapper';

const revokeDataDescriptor: AttributeDescriptorModel = {
    type: AttributeType.Data,
    name: 'revokeField',
    uuid: 'revoke-data-uuid-1',
    contentType: AttributeContentType.String,
    properties: { label: 'Revoke Field', required: false, readOnly: false, visible: true, list: false, multiSelect: false },
} as AttributeDescriptorModel;

const certificateWithPrivateKey: CertificateDetailResponseModel = {
    uuid: 'certificate-uuid',
    commonName: 'test-certificate',
    state: CertificateState.Issued,
    raProfile: { uuid: 'ra-profile-uuid', name: 'Test RA Profile', authorityInstanceUuid: 'authority-uuid' },
    key: { uuid: 'key-uuid', name: 'Test Key' },
    privateKeyAvailability: true,
} as CertificateDetailResponseModel;

const certificateWithKeyButNoPrivateKey: CertificateDetailResponseModel = {
    ...certificateWithPrivateKey,
    privateKeyAvailability: false,
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

    test('hides destroyKey switch when the certificate has a key but no private key available', async ({ mount, page }) => {
        await mount(<CertificateRevokeDialogTestWrapper certificate={certificateWithKeyButNoPrivateKey} />);
        await expect(page.getByTestId('switch-destroyKey')).toHaveCount(0);
    });

    test('shows destroyKey switch, unchecked, when the private key is available', async ({ mount, page }) => {
        await mount(<CertificateRevokeDialogTestWrapper certificate={certificateWithPrivateKey} />);
        await expect(page.getByTestId('switch-destroyKey')).toBeVisible();
        await expect(page.getByTestId('switch-destroyKey-input')).not.toBeChecked();
    });

    test('renders reason, destroyKey switch and connector attributes in order', async ({ mount, page }) => {
        await mount(
            <CertificateRevokeDialogTestWrapper
                certificate={certificateWithPrivateKey}
                preloadedState={{
                    certificates: { ...testInitialState.certificates, revocationAttributes: [revokeDataDescriptor] },
                }}
            />,
        );

        const reason = page.getByTestId('select-revokeReason-trigger');
        const destroyKey = page.getByTestId('switch-destroyKey');
        const attribute = page.getByTestId('text-input-__attributes__revoke__.revokeField');
        await expect(reason).toBeVisible();
        await expect(destroyKey).toBeVisible();
        await expect(attribute).toBeVisible();

        const [reasonTop, destroyKeyTop, attributeTop] = await Promise.all(
            [reason, destroyKey, attribute].map(async (locator) => (await locator.boundingBox())?.y ?? 0),
        );
        expect(reasonTop).toBeLessThan(destroyKeyTop);
        expect(destroyKeyTop).toBeLessThan(attributeTop);
    });

    test('closes the dialog on submit (reason-only path)', async ({ mount, page }) => {
        await mount(<CertificateRevokeDialogTestWrapper />);
        await page.getByTestId('revokeSubmit').click();
        await expect(page.getByTestId('dialog-closed')).toBeAttached();
    });

    test('sends entered revoke attributes and destroyKey in the revoke request', async ({ mount, page }) => {
        await mount(
            <CertificateRevokeDialogTestWrapper
                certificate={certificateWithPrivateKey}
                preloadedState={{
                    certificates: { ...testInitialState.certificates, revocationAttributes: [revokeDataDescriptor] },
                }}
            />,
        );

        const revokeField = page.getByTestId('text-input-__attributes__revoke__.revokeField');
        await revokeField.click();
        await revokeField.fill('revoke-value');
        await page.getByTestId('switch-destroyKey').locator('label[for="destroyKey"]').first().click();
        await expect(page.getByTestId('switch-destroyKey-input')).toBeChecked();
        await page.getByTestId('revokeSubmit').click();

        await expect(page.getByTestId('revoke-payload')).not.toBeEmpty();
        const payload = JSON.parse((await page.getByTestId('revoke-payload').textContent()) ?? '{}');

        expect(payload.uuid).toBe('certificate-uuid');
        expect(payload.revokeRequest.destroyKey).toBe(true);
        expect(payload.revokeRequest.attributes).toHaveLength(1);
        expect(payload.revokeRequest.attributes[0]).toMatchObject({
            name: 'revokeField',
            uuid: 'revoke-data-uuid-1',
            content: [{ data: 'revoke-value' }],
        });
    });

    test('does not send destroyKey when no private key is available', async ({ mount, page }) => {
        await mount(<CertificateRevokeDialogTestWrapper certificate={certificateWithKeyButNoPrivateKey} />);
        await page.getByTestId('revokeSubmit').click();

        await expect(page.getByTestId('revoke-payload')).not.toBeEmpty();
        const payload = JSON.parse((await page.getByTestId('revoke-payload').textContent()) ?? '{}');

        expect(payload.revokeRequest.destroyKey).toBeUndefined();
        expect(payload.revokeRequest.reason).toBe(CertificateRevocationReason.Unspecified);
    });
});
