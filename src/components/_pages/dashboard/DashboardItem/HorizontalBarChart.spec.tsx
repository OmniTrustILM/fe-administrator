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
