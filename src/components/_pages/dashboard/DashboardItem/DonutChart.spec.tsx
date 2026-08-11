import { test, expect } from '../../../../../playwright/ct-test';
import DonutChartWithStore from './DonutChartWithStore';
import { EntityType } from 'ducks/filters';
import { CertificateState } from 'types/openapi';

test.describe('DonutChart', () => {
    test('should render title and chart with data', async ({ mount }) => {
        const component = await mount(
            <DonutChartWithStore
                title="Certificates by status"
                data={{ [CertificateState.Issued]: 10, [CertificateState.Revoked]: 2 }}
                entity={EntityType.CERTIFICATE}
                redirect="/certificates"
                onSetFilter={() => []}
                showCenterLabel
            />,
        );
        await expect(component.getByRole('heading', { name: 'Certificates by status' })).toBeVisible();
        await expect(component.getByText('Issued')).toBeVisible();
        await expect(component.getByText('Revoked')).toBeVisible();
        await expect(component.getByText('Total')).toBeVisible();
        await expect(component.getByText('12')).toBeVisible();
    });

    test('should render with empty data', async ({ mount }) => {
        const component = await mount(
            <DonutChartWithStore title="Empty chart" data={{}} entity={EntityType.CERTIFICATE} redirect="/" onSetFilter={() => []} />,
        );
        await expect(component.getByRole('heading', { name: 'Empty chart' })).toBeVisible();
    });

    test('should show values in legend when enabled', async ({ mount }) => {
        const component = await mount(
            <DonutChartWithStore
                title="Legend values"
                data={{ [CertificateState.Issued]: 10, [CertificateState.Revoked]: 2 }}
                entity={EntityType.CERTIFICATE}
                redirect="/certificates"
                onSetFilter={() => []}
                showValuesInLegend
            />,
        );

        const issuedLegendButton = component.getByRole('button', { name: /issued/i });
        const revokedLegendButton = component.getByRole('button', { name: /revoked/i });

        await expect(issuedLegendButton).toBeVisible();
        await expect(issuedLegendButton.getByText('10')).toBeVisible();
        await expect(revokedLegendButton).toBeVisible();
        await expect(revokedLegendButton.getByText('2')).toBeVisible();
        await expect(component.getByText('Issued')).toHaveAttribute('title', 'Issued');
    });

    test('should render non-clickable legend style when interactiveLegend is false', async ({ mount }) => {
        const component = await mount(
            <DonutChartWithStore
                title="Static legend"
                data={{ [CertificateState.Issued]: 1 }}
                entity={EntityType.CERTIFICATE}
                redirect="/certificates"
                onSetFilter={() => []}
                interactiveLegend={false}
            />,
        );

        await expect(component.getByRole('button', { name: 'Issued' })).toHaveClass(/cursor-default/);
    });

    test('should support fixed size and hidden center label via props', async ({ mount }) => {
        const component = await mount(
            <DonutChartWithStore
                title="Fixed chart"
                data={{ [CertificateState.Issued]: 10, [CertificateState.Revoked]: 2 }}
                entity={EntityType.CERTIFICATE}
                redirect="/certificates"
                onSetFilter={() => []}
                chartSize="fixed"
                showCenterLabel={false}
                showValuesInLegend
            />,
        );

        await expect(component.getByRole('heading', { name: 'Fixed chart' })).toBeVisible();
        await expect(component.getByText('Total')).toHaveCount(0);
        const issuedLegendButton = component.getByRole('button', { name: /issued/i });
        await expect(issuedLegendButton).toBeVisible();
        await expect(issuedLegendButton.getByText('10')).toBeVisible();
    });

    test('should shrink chart on small screens in full mode by default', async ({ mount }) => {
        const component = await mount(
            <DonutChartWithStore
                title="Responsive chart"
                data={{ [CertificateState.Issued]: 10, [CertificateState.Revoked]: 2 }}
                entity={EntityType.CERTIFICATE}
                redirect="/certificates"
                onSetFilter={() => []}
                chartSize="full"
            />,
        );

        await expect(component.getByTestId('donut-chart-container')).toHaveClass(/max-w-\[200px\]/);
        await expect(component.getByTestId('donut-chart-container')).toHaveClass(/w-full/);
    });

    test('paints each sector with its own colour from colorOptions', async ({ mount, page }) => {
        await mount(
            <DonutChartWithStore
                title="Certificates by status"
                data={{ [CertificateState.Issued]: 10, [CertificateState.Revoked]: 2 }}
                entity={EntityType.CERTIFICATE}
                redirect="/certificates"
                onSetFilter={() => []}
                colorOptions={{ colors: ['#333333', '#444444'] }}
            />,
        );
        const sectors = page.locator('.recharts-pie-sector path');
        await expect(sectors).toHaveCount(2);
        await expect(sectors.nth(0)).toHaveAttribute('fill', '#333333');
        await expect(sectors.nth(1)).toHaveAttribute('fill', '#444444');
    });
});
