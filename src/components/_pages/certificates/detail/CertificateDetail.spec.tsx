import type { Page } from '@playwright/test';
import { Resource, ResourceAction } from 'types/openapi';
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

const allowedActionsRequests = async (page: Page) =>
    (JSON.parse((await page.getByTestId('dispatched').textContent()) ?? '[]') as string[]).filter(
        (type) => type === 'resource/listObjectAllowedActions',
    ).length;

test.describe('CertificateDetail — permission to change', () => {
    const listings = [Resource.Certificates, Resource.Locations];

    test('asks for the allowed actions again when the details are refreshed', async ({ mount, page }) => {
        await mount(<CertificateDetailWithStore allowedListings={listings} allowedActions={[ResourceAction.Detail]} />);
        await expect.poll(() => allowedActionsRequests(page)).toBe(1);

        await page.getByTestId('refresh-icon').first().click();

        await expect.poll(() => allowedActionsRequests(page)).toBe(2);
    });

    test('disables the related-certificate and location changes without update', async ({ mount, page }) => {
        await mount(<CertificateDetailWithStore allowedListings={listings} allowedActions={[ResourceAction.Detail]} />);

        await page.getByRole('tab', { name: 'Related Certificates' }).click();
        await expect(page.getByTestId('add_related_certificate-button')).toBeDisabled();

        await page.getByRole('tab', { name: 'Locations' }).click();
        await expect(page.getByTestId('plus-button')).toBeDisabled();
    });

    test('offers the related-certificate change the certificate answer allows', async ({ mount, page }) => {
        await mount(
            <CertificateDetailWithStore allowedListings={listings} allowedActions={[ResourceAction.Detail, ResourceAction.Update]} />,
        );

        await page.getByRole('tab', { name: 'Related Certificates' }).click();
        await expect(page.getByTestId('add_related_certificate-button')).toBeEnabled();
    });
});
