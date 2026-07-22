import { test, expect } from '../../../../../playwright/ct-test';
import TimeSeriesChartWithStore from './TimeSeriesChartWithStore';
import TimeSeriesChartNavHarness from './TimeSeriesChartNavHarness';
import { EntityType } from 'ducks/filters';
import { SigningRecordStatisticsPeriod } from 'types/openapi';

const data = { '2026-06-18T00:00:00Z': 3, '2026-06-18T01:00:00Z': 5, '2026-06-18T02:00:00Z': 2 };

test.describe('TimeSeriesChart', () => {
    test('renders the title and the four period toggles', async ({ mount }) => {
        const component = await mount(
            <TimeSeriesChartWithStore
                title="Signings over Time"
                data={data}
                entity={EntityType.SIGNING_RECORD}
                redirect="/signingrecords"
                onSetFilter={() => []}
            />,
        );
        await expect(component.getByRole('heading', { name: 'Signings over Time' })).toBeVisible();
        await expect(component.getByRole('button', { name: '24h' })).toBeVisible();
        await expect(component.getByRole('button', { name: '7d' })).toBeVisible();
        await expect(component.getByRole('button', { name: '30d' })).toBeVisible();
        await expect(component.getByRole('button', { name: '90d' })).toBeVisible();
    });

    test('clicking a period moves the active highlight to that toggle', async ({ mount }) => {
        const component = await mount(
            <TimeSeriesChartWithStore
                title="Signings over Time"
                data={data}
                entity={EntityType.SIGNING_RECORD}
                redirect="/signingrecords"
                initialPeriod={SigningRecordStatisticsPeriod._24h}
                onSetFilter={() => []}
            />,
        );
        await expect(component.getByRole('button', { name: '24h' })).toHaveClass(/text-white/);
        await component.getByRole('button', { name: '7d' }).click();
        await expect(component.getByRole('button', { name: '7d' })).toHaveClass(/text-white/);
        await expect(component.getByRole('button', { name: '24h' })).not.toHaveClass(/text-white/);
    });

    test('clicking a data point drills down (navigates to the redirect)', async ({ mount, page }) => {
        const component = await mount(
            <TimeSeriesChartNavHarness title="Signings over Time" data={data} entity={EntityType.SIGNING_RECORD} onSetFilter={() => []} />,
        );
        // Let the chart lay out (recharts computes activeTooltipIndex from geometry).
        await page.waitForTimeout(1000);
        const surface = component.locator('.recharts-surface').first();
        const box = await surface.boundingBox();
        if (!box) throw new Error('chart surface not found');
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        await page.mouse.move(cx, cy);
        await page.waitForTimeout(200);
        await page.mouse.click(cx, cy);
        await expect(page.getByTestId('landed-on-redirect')).toBeVisible();
    });
});
