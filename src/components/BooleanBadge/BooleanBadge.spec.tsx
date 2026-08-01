import { test, expect } from '../../../playwright/ct-test';
import BooleanBadge from './BooleanBadge';

test.describe('BooleanBadge', () => {
    test('should render "Yes" badge when value is true', async ({ mount }) => {
        const component = await mount(<BooleanBadge value={true} />);

        const badge = component.getByText('Yes');
        await expect(badge).toBeVisible();
    });

    test('should render "No" badge when value is false', async ({ mount }) => {
        const component = await mount(<BooleanBadge value={false} />);

        const badge = component.getByText('No');
        await expect(badge).toBeVisible();
    });

    test('should use success color for true value by default', async ({ mount }) => {
        const component = await mount(<BooleanBadge value={true} />);

        const badge = component.getByText('Yes');
        await expect(badge).toBeVisible();

        await expect(badge).toHaveClass(/bg-success-surface/);
    });

    test('should use danger color for false value by default', async ({ mount }) => {
        const component = await mount(<BooleanBadge value={false} />);

        const badge = component.getByText('No');
        await expect(badge).toBeVisible();

        await expect(badge).toHaveClass(/bg-danger-surface/);
    });

    test('should invert colors when invertColor is true', async ({ mount }) => {
        const trueBadge = await mount(<BooleanBadge value={true} invertColor={true} />);

        const trueElement = trueBadge.getByText('Yes');

        await expect(trueElement).toHaveClass(/bg-danger-surface/);
        await trueBadge.unmount();

        const falseBadge = await mount(<BooleanBadge value={false} invertColor={true} />);
        const falseElement = falseBadge.getByText('No');

        await expect(falseElement).toHaveClass(/bg-success-surface/);
    });

    test('should use custom data-testid when provided', async ({ mount }) => {
        const component = await mount(<BooleanBadge value={true} dataTestId="custom-badge-id" />);

        const badge = component.getByText('Yes');
        await expect(badge).toBeVisible();
        await expect(badge).toHaveAttribute('data-testid', 'custom-badge-id');

        await expect(component.locator('[data-testid="boolean-badge"]')).toHaveCount(0);
    });
});
