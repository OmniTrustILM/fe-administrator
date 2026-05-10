import { test, expect } from '../../../playwright/ct-test';
import Tooltip from './index';

test.describe('Tooltip', () => {
    test('should render tooltip with children', async ({ mount }) => {
        const component = await mount(
            <Tooltip content="Tooltip text">
                <button type="button">Hover me</button>
            </Tooltip>,
        );

        await expect(component.getByText('Hover me')).toBeVisible();
    });

    test('should render tooltip content', async ({ mount }) => {
        const component = await mount(
            <Tooltip content="Tooltip text">
                <button type="button">Hover me</button>
            </Tooltip>,
        );

        const tooltip = component.locator('[role="tooltip"]');
        await expect(tooltip).toHaveText('Tooltip text');
    });

    test('should render with string content', async ({ mount }) => {
        const component = await mount(
            <Tooltip content="Simple tooltip">
                <span>Trigger</span>
            </Tooltip>,
        );

        const tooltip = component.locator('[role="tooltip"]');
        await expect(tooltip).toHaveText('Simple tooltip');
    });

    test('should render with React node content', async ({ mount }) => {
        const component = await mount(
            <Tooltip content={<span>React node content</span>}>
                <button type="button">Hover</button>
            </Tooltip>,
        );

        const tooltip = component.locator('[role="tooltip"]');
        await expect(tooltip).toContainText('React node content');
    });

    test('should render children when disabled is true', async ({ mount }) => {
        const component = await mount(
            <Tooltip content="Tooltip text" disabled={true}>
                <button type="button">Button</button>
            </Tooltip>,
        );

        await expect(component.getByText('Button')).toBeVisible();
        await expect(component).toHaveClass(/pointer-events-none/);

        const tooltip = component.locator('[role="tooltip"]');
        await expect(tooltip).toHaveCount(1);
    });

    test('should support custom className', async ({ mount }) => {
        const component = await mount(
            <Tooltip content="Tooltip" className="custom-tooltip">
                <button type="button">Button</button>
            </Tooltip>,
        );

        await expect(component.getByText('Button')).toBeVisible();

        const button = component.getByText('Button');
        const tooltipWrapper = button.locator('..');
        await expect(tooltipWrapper).toBeVisible();
    });

    test('should support triggerClassName', async ({ mount }) => {
        const component = await mount(
            <Tooltip content="Tooltip" triggerClassName="custom-trigger">
                <button type="button">Button</button>
            </Tooltip>,
        );

        await expect(component.getByText('Button')).toBeVisible();
    });

    test('should support contentClassName', async ({ mount }) => {
        const component = await mount(
            <Tooltip content="Tooltip" contentClassName="custom-content">
                <button type="button">Button</button>
            </Tooltip>,
        );

        const tooltip = component.locator('[role="tooltip"]');
        await expect(tooltip).toHaveClass(/custom-content/);
    });
});
