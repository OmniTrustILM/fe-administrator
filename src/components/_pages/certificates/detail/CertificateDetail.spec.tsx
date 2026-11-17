import type { Locator, Page } from '@playwright/test';
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

const location = (uuid: string, name: string) =>
    ({ uuid, name, entityInstanceUuid: `entity-${uuid}`, entityInstanceName: 'Entity', enabled: true }) as never;

test.describe('CertificateDetail — permission to change each location', () => {
    const listings = [Resource.Certificates, Resource.Locations];
    const certificateLocations = [location('loc-1', 'First location'), location('loc-2', 'Second location')];
    const pushableLocations = [location('loc-3', 'Third location'), location('loc-4', 'Fourth location')];
    const answers = {
        'loc-1': [ResourceAction.Detail, ResourceAction.Update],
        'loc-2': [ResourceAction.Detail],
        'loc-3': [ResourceAction.Detail, ResourceAction.Update],
        'loc-4': [ResourceAction.Detail],
    };

    const mountLocations = (mount: (component: React.JSX.Element) => Promise<unknown>) =>
        mount(
            <CertificateDetailWithStore
                allowedListings={listings}
                allowedActions={[ResourceAction.Detail]}
                certificateLocations={certificateLocations}
                pushableLocations={pushableLocations}
                locationAnswers={answers}
            />,
        );

    const checkRow = (page: Page, name: string) =>
        page
            .getByRole('row', { name: new RegExp(name) })
            .getByRole('checkbox')
            .check();

    const removeCases = [
        { name: 'offers Remove when every checked location allows update', checked: ['First location'], enabled: true },
        { name: 'disables Remove when a checked location does not allow update', checked: ['Second location'], enabled: false },
        { name: 'disables Remove for a mixed selection', checked: ['First location', 'Second location'], enabled: false },
    ];

    for (const { name, checked, enabled } of removeCases) {
        test(name, async ({ mount, page }) => {
            await mountLocations(mount);
            await page.getByRole('tab', { name: 'Locations' }).click();

            for (const row of checked) await checkRow(page, row);

            const remove = page.getByTestId('trash-button');
            if (enabled) {
                await expect(remove).toBeEnabled();
            } else {
                await expect(remove).toBeDisabled();
                await expect(remove).not.toHaveAttribute('aria-busy');
                await remove.hover({ force: true });
                await expect(page.getByRole('tooltip')).toContainText('You need the update permission on locations.');
            }
        });
    }

    test('asks for the allowed actions of every location of the certificate in one request', async ({ mount, page }) => {
        await mountLocations(mount);

        await expect.poll(() => allowedActionsRequests(page)).toBe(2);
    });

    const pushCases = [
        { name: 'offers Push for a location that allows update', row: 'Third location', enabled: true },
        { name: 'disables Push for a location that does not allow update', row: 'Fourth location', enabled: false },
    ];

    for (const { name, row, enabled } of pushCases) {
        test(name, async ({ mount, page }) => {
            await mountLocations(mount);
            await page.getByRole('tab', { name: 'Locations' }).click();
            await page.getByTestId('plus-button').click();

            await checkRow(page.getByRole('dialog'), row);

            const push = page.getByRole('dialog').getByRole('button', { name: 'Push' });
            if (enabled) {
                await expect(push).toBeEnabled();
            } else {
                await expect(push).toBeDisabled();
                await expect(push).not.toHaveAttribute('aria-busy');
                await push.hover({ force: true });
                await expect(page.getByRole('tooltip')).toContainText('You need the update permission on locations.');
            }
        });
    }
});
