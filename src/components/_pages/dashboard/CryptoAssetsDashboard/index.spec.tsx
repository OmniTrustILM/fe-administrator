import { expect, test } from '../../../../../playwright/ct-test';
import CryptoAssetsDashboardWithStore from './CryptoAssetsDashboardWithStore';
import { FilterConditionOperator, FilterFieldSource } from 'types/openapi';

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

    test('count cards run from source documents through assets and risk to families', async ({ mount }) => {
        const component = await mount(<CryptoAssetsDashboardWithStore />);

        await expect(component.getByTestId('crypto-assets-dashboard-counts').getByRole('heading')).toHaveText([
            'Source CBOMs',
            'Crypto Assets',
            'Not PQC ready',
            'Algorithm families',
        ]);
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

    test('a sync-state chart opens the CBOM inventory filtered to the selected state', async ({ mount }) => {
        const component = await mount(
            <CryptoAssetsDashboardWithStore
                variant="partial"
                initialCbomFilter={{
                    fieldSource: FilterFieldSource.Property,
                    condition: FilterConditionOperator.Equals,
                    fieldIdentifier: 'CBOM_SERIAL_NUMBER',
                    value: 'old',
                }}
            />,
        );
        const coverage = component.getByTestId('crypto-assets-dashboard-coverage');

        await expect(coverage.getByTestId('donut-chart-container')).toBeVisible();
        await expect(component.getByTestId('cbom-current-filters')).toContainText('CBOM_SERIAL_NUMBER');
        await coverage.getByRole('button', { name: /failed\s+5/i }).click();

        await expect(component.getByTestId('route')).toHaveText('/cboms');
        const applied = JSON.parse((await component.getByTestId('cbom-current-filters').textContent()) ?? '[]');
        expect(applied).toEqual([
            { fieldSource: 'property', condition: 'EQUALS', fieldIdentifier: 'CBOM_ASSET_SYNC_STATE', value: ['failed'] },
        ]);
    });

    test('an estate nobody has synced says the counts are empty rather than complete', async ({ mount }) => {
        const component = await mount(<CryptoAssetsDashboardWithStore variant="empty" />);

        await expect(component.getByTestId('crypto-assets-dashboard-coverage-empty')).toBeVisible();
        await expect(component.getByTestId('crypto-assets-dashboard-coverage').getByTestId('donut-chart-container')).toHaveCount(0);
        await expect(component.getByTestId('crypto-assets-dashboard-charts')).toBeEmpty();
        // Core omits a count it has nothing for, and a tile left without a number reads as a heading over a gap.
        await expect(component.getByTestId('crypto-assets-dashboard-counts').locator('.text-3xl')).toHaveText(['0', '0', '0', '0']);
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

    test('algorithm families remains a count with its caption and no link', async ({ mount }) => {
        const component = await mount(<CryptoAssetsDashboardWithStore />);
        const heading = component.getByRole('heading', { name: 'Algorithm families' });
        await expect(heading).toBeVisible();
        await expect(heading.locator('xpath=ancestor::section').getByText('42', { exact: true })).toBeVisible();
        await expect(component.getByText('3,010 assets carry none')).toBeVisible();
        await expect(component.getByRole('link', { name: 'Algorithm families' })).toHaveCount(0);
    });

    test('source CBOMs replaces a prior CBOM filter and opens the contributing inventory', async ({ mount }) => {
        const component = await mount(
            <CryptoAssetsDashboardWithStore
                initialCbomFilter={{
                    fieldSource: FilterFieldSource.Property,
                    condition: FilterConditionOperator.Equals,
                    fieldIdentifier: 'CBOM_SERIAL_NUMBER',
                    value: 'old',
                }}
            />,
        );
        await expect(component.getByTestId('cbom-current-filters')).toContainText('CBOM_SERIAL_NUMBER');
        await component.getByRole('link', { name: 'Source CBOMs' }).click();

        await expect(component.getByTestId('route')).toHaveText('/cboms');
        const applied = JSON.parse((await component.getByTestId('cbom-current-filters').textContent()) ?? '[]');
        expect(applied).toEqual([
            { fieldSource: 'property', condition: 'EQUALS', fieldIdentifier: 'CBOM_HAS_CONTRIBUTED_ASSETS', value: true },
        ]);
    });

    test('source CBOMs is unavailable and unlinked when CBOM access is denied', async ({ mount }) => {
        const component = await mount(<CryptoAssetsDashboardWithStore variant="denied" />);
        await expect(component.getByRole('heading', { name: 'Source CBOMs' })).toBeVisible();
        await expect(component.getByRole('link', { name: 'Source CBOMs' })).toHaveCount(0);
        const lock = component.getByTestId('crypto-assets-dashboard-counts').locator('[data-testid="count-badge-lock"]');
        await expect(lock).toHaveCount(1);
        await expect(lock.locator('svg.lucide-lock')).toBeVisible();
        await expect(component.getByText('You do not have permission to view the Source CBOM count.')).toBeVisible();
        await expect(component.getByTestId('crypto-assets-dashboard-coverage')).toContainText('not available with your permissions');
        await expect(component.getByTestId('crypto-assets-dashboard-coverage-empty')).toHaveCount(0);
        await expect(component.getByTestId('crypto-assets-dashboard-coverage').getByTestId('donut-chart-container')).toHaveCount(0);
        await expect(component.getByText(/deduplicated across 0 CBOMs/)).toHaveCount(0);
    });

    test('the algorithm-family caption opens assets with no family', async ({ mount }) => {
        const component = await mount(<CryptoAssetsDashboardWithStore />);

        await expect(component.getByRole('heading', { name: 'Assets with no algorithm family' })).toHaveCount(0);
        await component.getByRole('link', { name: '3,010 assets carry none' }).click();

        await expect(component.getByTestId('route')).toHaveText('/cryptoassets');
        const applied = JSON.parse((await component.getByTestId('current-filters').textContent()) ?? '[]');
        expect(applied).toEqual([
            { fieldSource: 'property', condition: 'EMPTY', fieldIdentifier: 'CBOM_ASSET_ALGORITHM_FAMILY', value: [''] },
        ]);
    });
});
