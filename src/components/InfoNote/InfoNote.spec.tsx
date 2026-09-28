import { test, expect } from '../../../playwright/ct-test';
import InfoNote from './index';

test.describe('InfoNote', () => {
    test('should render its children beside a decorative icon', async ({ mount }) => {
        const component = await mount(<InfoNote>Private keys stay in the provider.</InfoNote>);

        await expect(component).toContainText('Private keys stay in the provider.');
        await expect(component.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    });

    test('should paint the info tint', async ({ mount }) => {
        const component = await mount(<InfoNote>Note</InfoNote>);

        await expect(component).toHaveClass(/bg-info-surface/);
        await expect(component).toHaveClass(/text-info/);
    });

    test('should keep its own classes when given more', async ({ mount }) => {
        const component = await mount(<InfoNote className="mt-4">Note</InfoNote>);

        await expect(component).toHaveClass(/bg-info-surface/);
        await expect(component).toHaveClass(/mt-4/);
    });
});
