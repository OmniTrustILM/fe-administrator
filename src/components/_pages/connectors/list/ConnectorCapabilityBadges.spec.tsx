import { test, expect } from '../../../../../playwright/ct-test';
import { withProviders } from 'utils/test-helpers';

import ConnectorCapabilityBadges from './ConnectorCapabilityBadges';

test.describe('ConnectorCapabilityBadges', () => {
    test('renders all badges without an overflow trigger when 3 or fewer', async ({ mount, page }) => {
        await mount(
            withProviders(
                <ConnectorCapabilityBadges
                    labels={['Info', 'Health', 'Metrics']}
                    color="primary"
                    testIdPrefix="t"
                    overflowTitle="Show all"
                    onOverflowClick={() => {}}
                />,
            ),
        );

        await expect(page.getByText('Info')).toBeVisible();
        await expect(page.getByText('Health')).toBeVisible();
        await expect(page.getByText('Metrics')).toBeVisible();
        await expect(page.getByTestId('t-overflow')).toHaveCount(0);
    });

    test('collapses to first 3 plus a +N overflow badge and fires the callback on click', async ({ mount, page }) => {
        let overflowClicks = 0;

        await mount(
            withProviders(
                <ConnectorCapabilityBadges
                    labels={['Info', 'Health', 'Metrics', 'Secret', 'Notification']}
                    color="primary"
                    testIdPrefix="t"
                    overflowTitle="Show all interfaces"
                    onOverflowClick={() => {
                        overflowClicks += 1;
                    }}
                />,
            ),
        );

        await expect(page.getByText('Info')).toBeVisible();
        await expect(page.getByText('Metrics')).toBeVisible();
        // 4th and 5th labels are collapsed into the overflow badge
        await expect(page.getByText('Secret')).toHaveCount(0);

        const overflow = page.getByTestId('t-overflow');
        await expect(overflow).toHaveText('+2');

        await overflow.click();
        await expect.poll(() => overflowClicks).toBe(1);
    });

    test('renders an em dash when there are no labels', async ({ mount, page }) => {
        await mount(
            withProviders(
                <ConnectorCapabilityBadges
                    labels={[]}
                    color="secondary"
                    testIdPrefix="t"
                    overflowTitle="Show all"
                    onOverflowClick={() => {}}
                />,
            ),
        );

        await expect(page.getByText('—')).toBeVisible();
    });
});
