import { expect, test } from '../../../../../playwright/ct-test';
import CryptoAssetsDashboardWithStore from './CryptoAssetsDashboardWithStore';

test.describe('CryptoAssetsDashboard', () => {
    test('states the coverage first, then the counts and the three distributions', async ({ mount }) => {
        const component = await mount(<CryptoAssetsDashboardWithStore />);

        await expect(component.getByTestId('crypto-assets-dashboard-coverage-summary')).toHaveText('Synced 37 of 37 CBOM documents');
        await expect(component.getByRole('heading', { name: 'Crypto Assets' })).toBeVisible();
        await expect(component.getByRole('heading', { name: 'Not PQC ready' })).toBeVisible();
        await expect(component.getByRole('heading', { name: 'Algorithm families' })).toBeVisible();
        await expect(component.getByRole('heading', { name: 'Source CBOMs' })).toBeVisible();
        await expect(component.getByRole('heading', { name: 'Assets by Type' })).toBeVisible();
        await expect(component.getByRole('heading', { name: 'Assets by PQC Readiness' })).toBeVisible();
        await expect(component.getByRole('heading', { name: 'Assets by Algorithm Family' })).toBeVisible();
    });

    test('a fully synced estate carries no partial-sync warning', async ({ mount }) => {
        const component = await mount(<CryptoAssetsDashboardWithStore />);

        await expect(component.getByTestId('crypto-assets-dashboard-coverage-partial')).toHaveCount(0);
    });

    test('a partly synced estate says so before any count is read', async ({ mount }) => {
        const component = await mount(<CryptoAssetsDashboardWithStore variant="partial" />);

        await expect(component.getByTestId('crypto-assets-dashboard-coverage-summary')).toHaveText('Synced 12 of 37 CBOM documents');
        await expect(component.getByTestId('crypto-assets-dashboard-coverage-partial')).toBeVisible();
    });

    test('an estate nobody has synced says the counts are empty rather than complete', async ({ mount }) => {
        const component = await mount(<CryptoAssetsDashboardWithStore variant="empty" />);

        await expect(component.getByTestId('crypto-assets-dashboard-coverage-empty')).toBeVisible();
        await expect(component.getByTestId('crypto-assets-dashboard-charts')).toBeEmpty();
    });

    test('the Not PQC ready tile drills through to the inventory filtered on that verdict', async ({ mount }) => {
        const component = await mount(<CryptoAssetsDashboardWithStore />);

        await component.getByRole('link', { name: 'Not PQC ready' }).click();

        await expect(component.getByTestId('route')).toHaveText('/cryptoassets');
        const applied = JSON.parse((await component.getByTestId('current-filters').textContent()) ?? '[]');
        expect(applied).toEqual([
            { fieldSource: 'property', condition: 'EQUALS', fieldIdentifier: 'CBOM_ASSET_PQC_VERDICT', value: ['notReady'] },
        ]);
    });

    test('the total tile clears a previously applied filter', async ({ mount }) => {
        const component = await mount(<CryptoAssetsDashboardWithStore />);

        await component.getByRole('link', { name: 'Not PQC ready' }).click();
        await expect(component.getByTestId('current-filters')).not.toHaveText('[]');

        await component.getByRole('link', { name: 'Crypto Assets', exact: true }).click();

        await expect(component.getByTestId('current-filters')).toHaveText('[]');
        await expect(component.getByTestId('route')).toHaveText('/cryptoassets');
    });

    test('the no-family tile asks for the empty condition rather than an empty value', async ({ mount }) => {
        const component = await mount(<CryptoAssetsDashboardWithStore />);

        await component.getByRole('link', { name: 'Assets with no algorithm family' }).click();

        const applied = JSON.parse((await component.getByTestId('current-filters').textContent()) ?? '[]');
        expect(applied[0]).toMatchObject({ condition: 'EMPTY', fieldIdentifier: 'CBOM_ASSET_ALGORITHM_FAMILY' });
    });
});
