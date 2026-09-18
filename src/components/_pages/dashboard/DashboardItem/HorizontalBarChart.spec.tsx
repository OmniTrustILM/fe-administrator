import { test, expect } from '../../../../../playwright/ct-test';
import HorizontalBarChartWithStore from './HorizontalBarChartWithStore';
import { EntityType } from 'ducks/filters';

test.describe('HorizontalBarChart', () => {
    test('renders title and a "+k more" caption when overflowCount exceeds shown bars', async ({ mount }) => {
        const component = await mount(
            <HorizontalBarChartWithStore
                title="Top Requesters"
                data={{ alice: 8, bob: 5 }}
                entity={EntityType.SIGNING_RECORD}
                redirect="/signingrecords"
                onSetFilter={() => []}
                overflowCount={6}
                topN={2}
            />,
        );
        await expect(component.getByRole('heading', { name: 'Top Requesters' })).toBeVisible();
        await expect(component.getByText('+4 more')).toBeVisible();
    });

    test('the count axis labels counts as distinct whole numbers', async ({ mount }) => {
        const component = await mount(
            <HorizontalBarChartWithStore
                title="Top Requesters"
                data={{ alice: 2, bob: 1 }}
                entity={EntityType.SIGNING_RECORD}
                redirect="/signingrecords"
                onSetFilter={() => []}
            />,
        );
        const ticks = component.locator('.recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value');
        await expect(ticks).toHaveText(['0', '1', '2']);
    });

    test('omits the overflow caption when nothing overflows', async ({ mount }) => {
        const component = await mount(
            <HorizontalBarChartWithStore
                title="Top Requesters"
                data={{ alice: 8, bob: 5 }}
                entity={EntityType.SIGNING_RECORD}
                redirect="/signingrecords"
                onSetFilter={() => []}
                overflowCount={2}
                topN={10}
            />,
        );
        await expect(component.getByText(/more/)).toHaveCount(0);
    });

    test('a bar label is reachable by keyboard and opens the same filtered list the bar does', async ({ mount, page }) => {
        let drilledInto: string | undefined;
        await mount(
            <HorizontalBarChartWithStore
                title="Top Requesters"
                data={{ alice: 8, bob: 5 }}
                entity={EntityType.SIGNING_RECORD}
                redirect="/signingrecords"
                onSetFilter={(label) => {
                    drilledInto = label;
                    return [];
                }}
            />,
        );

        await expect(page.getByTestId('horizontal-bar-chart-label')).toHaveCount(2);

        const label = page.locator('[aria-label="alice: open the filtered list"]');
        await label.focus();
        await expect(label).toBeFocused();
        await page.keyboard.press('Enter');

        await expect.poll(() => drilledInto).toBe('alice');
    });

    test('paints each bar with its own colour from colorOptions', async ({ mount, page }) => {
        await mount(
            <HorizontalBarChartWithStore
                title="Top Requesters"
                data={{ alice: 8, bob: 5 }}
                entity={EntityType.SIGNING_RECORD}
                redirect="/signingrecords"
                onSetFilter={() => []}
                colorOptions={{ colors: ['#111111', '#222222'] }}
            />,
        );
        const bars = page.locator('.recharts-bar-rectangle path');
        await expect(bars).toHaveCount(2);
        await expect(bars.nth(0)).toHaveAttribute('fill', '#111111');
        await expect(bars.nth(1)).toHaveAttribute('fill', '#222222');
    });
});
