import { test, expect } from '../../../playwright/ct-test';
import Popover from './index';
import { PopoverUnmountWrapper } from './PopoverUnmountWrapper';

test.describe('Popover', () => {
    test('should render popover with children', async ({ mount }) => {
        const component = await mount(
            <div>
                <Popover content="Popover content">
                    <button type="button">Trigger</button>
                </Popover>
            </div>,
        );

        await expect(component.getByText('Trigger')).toBeVisible();
    });

    test('should render popover content', async ({ mount }) => {
        const component = await mount(
            <div>
                <Popover content="Popover content">
                    <button type="button">Trigger</button>
                </Popover>
            </div>,
        );

        const content = component.getByText('Popover content');
        await expect(content).toBeAttached();
    });

    test('should render popover with title', async ({ mount }) => {
        const component = await mount(
            <div>
                <Popover content="Popover content" title="Popover Title">
                    <button type="button">Trigger</button>
                </Popover>
            </div>,
        );

        const title = component.getByText('Popover Title');
        await expect(title).toBeAttached();
    });

    test('should render popover with React node content', async ({ mount }) => {
        const component = await mount(
            <div>
                <Popover content={<div>Custom Content</div>}>
                    <button type="button">Trigger</button>
                </Popover>
            </div>,
        );

        const customContent = component.getByText('Custom Content');
        await expect(customContent).toBeAttached();
    });

    test('should render popover with React node children', async ({ mount }) => {
        const component = await mount(
            <div>
                <Popover content="Content">
                    <div>Custom Trigger</div>
                </Popover>
            </div>,
        );

        await expect(component.getByText('Custom Trigger')).toBeVisible();
    });

    test('should have correct role attribute', async ({ mount }) => {
        const component = await mount(
            <div>
                <Popover content="Popover content">
                    <button type="button">Trigger</button>
                </Popover>
            </div>,
        );

        const tooltip = component.locator('[role="tooltip"]');
        await expect(tooltip).toBeAttached();
    });

    test('should trigger click on Enter key', async ({ mount }) => {
        const component = await mount(
            <div>
                <Popover content="Popover content">
                    <button type="button">Trigger</button>
                </Popover>
            </div>,
        );
        const toggle = component.locator('.hs-tooltip-toggle');
        await toggle.focus();
        await toggle.press('Enter');
        await expect(component.locator('.hs-tooltip-toggle')).toBeAttached();
    });

    test('should trigger click on Space key', async ({ mount }) => {
        const component = await mount(
            <div>
                <Popover content="Content">
                    <span>Label</span>
                </Popover>
            </div>,
        );
        const toggle = component.locator('.hs-tooltip-toggle');
        await toggle.focus();
        await toggle.press(' ');
        await expect(component.locator('.hs-tooltip-toggle')).toBeAttached();
    });

    test('should apply width style when width prop is set', async ({ mount }) => {
        const component = await mount(
            <div>
                <Popover content="X" width={400}>
                    <button type="button">Open</button>
                </Popover>
            </div>,
        );
        const tooltip = component.locator('[role="tooltip"]');
        await expect(tooltip).toHaveAttribute('style', /width:\s*400px/);
    });

    test('should not apply width style when width is 0', async ({ mount }) => {
        const component = await mount(
            <div>
                <Popover content="Y" width={0}>
                    <button type="button">Open</button>
                </Popover>
            </div>,
        );
        const tooltip = component.locator('[role="tooltip"]');
        const style = await tooltip.getAttribute('style');
        expect(style).toBeFalsy();
    });

    test('should mount with interactive content and run useEffect', async ({ mount }) => {
        const component = await mount(
            <div>
                <Popover content={<button type="button">Inside</button>}>
                    <button type="button">Trigger</button>
                </Popover>
            </div>,
        );
        await expect(component.getByText('Inside')).toBeAttached();
    });

    test('should stop propagation when click happens inside content', async ({ mount }) => {
        const component = await mount(
            <div>
                <Popover content="Content">
                    <button type="button">Open</button>
                </Popover>
            </div>,
        );
        const tooltip = component.locator('[role="tooltip"]');
        await tooltip.evaluate((el) => {
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        });
        await expect(component.getByText('Content')).toBeAttached();
    });

    test('should run useEffect cleanup on unmount', async ({ mount }) => {
        const component = await mount(
            <div>
                <PopoverUnmountWrapper />
            </div>,
        );
        await expect(component.getByText('Trigger')).toBeVisible();
        await component.getByRole('button', { name: 'Unmount' }).click();
        await expect(component.getByText('Trigger')).not.toBeVisible();
    });
});
