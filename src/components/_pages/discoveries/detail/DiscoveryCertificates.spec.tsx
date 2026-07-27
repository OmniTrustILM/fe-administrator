import { test, expect } from '../../../../../playwright/ct-test';
import DiscoveryCertificatesWithStore from './DiscoveryCertificatesWithStore';

test.describe('DiscoveryCertificates', () => {
    test('requests all discovered certificates on the All tab', async ({ mount, page }) => {
        await mount(<DiscoveryCertificatesWithStore />);

        const probe = page.getByTestId('certificates-request-probe');
        await expect(probe).toHaveAttribute('data-newly-discovered', 'undefined');
    });

    test('requests newly discovered certificates on the New tab', async ({ mount, page }) => {
        const component = await mount(<DiscoveryCertificatesWithStore />);

        await component.getByRole('tab', { name: 'New' }).click();

        const probe = page.getByTestId('certificates-request-probe');
        await expect(probe).toHaveAttribute('data-newly-discovered', 'true');
    });

    test('requests already existing certificates on the Existing tab', async ({ mount, page }) => {
        const component = await mount(<DiscoveryCertificatesWithStore />);

        await component.getByRole('tab', { name: 'Existing' }).click();

        const probe = page.getByTestId('certificates-request-probe');
        await expect(probe).toHaveAttribute('data-newly-discovered', 'false');
    });

    test('keeps the requested filter in sync with the active tab while switching back and forth', async ({ mount, page }) => {
        const component = await mount(<DiscoveryCertificatesWithStore />);
        const probe = page.getByTestId('certificates-request-probe');

        await component.getByRole('tab', { name: 'New' }).click();
        await expect(probe).toHaveAttribute('data-newly-discovered', 'true');

        await component.getByRole('tab', { name: 'Existing' }).click();
        await expect(probe).toHaveAttribute('data-newly-discovered', 'false');

        await component.getByRole('tab', { name: 'All' }).click();
        await expect(probe).toHaveAttribute('data-newly-discovered', 'undefined');

        await component.getByRole('tab', { name: 'New' }).click();
        await expect(probe).toHaveAttribute('data-newly-discovered', 'true');
    });

    test('activates the tab and filter matching the URL param on mount', async ({ mount, page }) => {
        const component = await mount(
            <DiscoveryCertificatesWithStore initialEntries={['/discoveries/detail/discovery-1?discoveredCerts=existing']} />,
        );

        await expect(component.getByRole('tab', { name: 'Existing' })).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('certificates-request-probe')).toHaveAttribute('data-newly-discovered', 'false');
    });

    test('shows the trigger columns only on the New tab', async ({ mount, page }) => {
        const component = await mount(<DiscoveryCertificatesWithStore />);

        await expect(page.getByRole('columnheader', { name: 'Triggers' })).toHaveCount(0);

        await component.getByRole('tab', { name: 'New' }).click();
        await expect(page.getByRole('columnheader', { name: 'Triggers' })).toBeVisible();
    });
});
