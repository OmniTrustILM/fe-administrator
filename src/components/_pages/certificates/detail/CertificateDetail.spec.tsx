import { Resource } from 'types/openapi';
import { expect, test } from '../../../../../playwright/ct-test';
import CertificateDetailWithStore from './CertificateDetailWithStore';

test.describe('CertificateDetail — permission-aware loading', () => {
    test('requests the certificate allowed actions alongside its detail', async ({ mount, page }) => {
        await mount(<CertificateDetailWithStore allowedListings={[Resource.Certificates, Resource.Locations]} />);

        await expect(page.getByTestId('dispatched')).toContainText('certificates/getCertificateDetail');
        await expect(page.getByTestId('dispatched')).toContainText('resource/listObjectAllowedActions');
    });

    test('shows the Locations tab and requests the locations for a user who may list locations', async ({ mount, page }) => {
        await mount(<CertificateDetailWithStore allowedListings={[Resource.Certificates, Resource.Locations]} />);

        await expect(page.getByRole('tab', { name: 'Locations' })).toBeVisible();
        await expect(page.getByTestId('dispatched')).toContainText('certificates/listCertificateLocations');
    });

    test('hides the Locations tab and skips the locations request without locations list', async ({ mount, page }) => {
        await mount(<CertificateDetailWithStore allowedListings={[Resource.Certificates]} />);

        await expect(page.getByRole('tab', { name: 'Details' })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Locations' })).toHaveCount(0);
        await expect(page.getByTestId('dispatched')).toContainText('certificates/getCertificateDetail');
        await expect(page.getByTestId('dispatched')).not.toContainText('certificates/listCertificateLocations');
    });
});
