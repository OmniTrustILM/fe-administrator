import { test, expect } from '../../../playwright/ct-test';
import Button from './index';

test.describe('Button', () => {
    test('should render button with children text', async ({ mount }) => {
        const component = await mount(<Button>Click Me</Button>);

        await expect(component.getByText('Click Me')).toBeVisible();

        const textElement = component.getByText('Click Me');
        const button = textElement.locator('..').locator('button').first();
        await expect(button).toBeVisible();
        await expect(button).toBeEnabled();
    });

    test('should support different variants', async ({ mount }) => {
        const solidButton = await mount(<Button variant="solid">Solid</Button>);
        await expect(solidButton.getByText('Solid')).toBeVisible();
        await solidButton.unmount();

        const outlineButton = await mount(<Button variant="outline">Outline</Button>);
        await expect(outlineButton.getByText('Outline')).toBeVisible();
        await outlineButton.unmount();

        const transparentButton = await mount(<Button variant="transparent">Transparent</Button>);
        await expect(transparentButton.getByText('Transparent')).toBeVisible();
    });

    test('should support different colors', async ({ mount }) => {
        const primaryButton = await mount(<Button color="primary">Primary</Button>);
        await expect(primaryButton.getByText('Primary')).toBeVisible();
        await primaryButton.unmount();

        const dangerButton = await mount(<Button color="danger">Danger</Button>);
        await expect(dangerButton.getByText('Danger')).toBeVisible();
        await dangerButton.unmount();

        const secondaryButton = await mount(<Button color="secondary">Secondary</Button>);
        await expect(secondaryButton.getByText('Secondary')).toBeVisible();
        await secondaryButton.unmount();

        const warningButton = await mount(<Button color="warning">Warning</Button>);
        await expect(warningButton.getByText('Warning')).toBeVisible();
    });

    test('should be disabled when disabled prop is true', async ({ mount }) => {
        let clicked = false;
        const handleClick = () => {
            clicked = true;
        };

        const component = await mount(
            <Button disabled={true} onClick={handleClick}>
                Disabled
            </Button>,
        );

        await expect(component.getByText('Disabled')).toBeVisible();
        const textElement = component.getByText('Disabled');
        const button = textElement.locator('..').locator('button').first();
        await expect(button).toBeVisible();
        await expect(button).toBeDisabled();

        await button.click({ force: true });
        expect(clicked).toBe(false);
    });

    test('should call onClick handler when clicked', async ({ mount }) => {
        let clicked = false;
        const handleClick = () => {
            clicked = true;
        };

        const component = await mount(<Button onClick={handleClick}>Click Me</Button>);

        const textElement = component.getByText('Click Me');
        await expect(textElement).toBeVisible();
        await textElement.click();
        expect(clicked).toBe(true);
    });

    test('should support different button types', async ({ mount }) => {
        const submitButton = await mount(<Button type="submit">Submit</Button>);
        const submitText = submitButton.getByText('Submit');
        const submitBtn = submitText.locator('..').locator('button').first();
        await expect(submitBtn).toHaveAttribute('type', 'submit');
        await submitButton.unmount();

        const resetButton = await mount(<Button type="reset">Reset</Button>);
        const resetText = resetButton.getByText('Reset');
        const resetBtn = resetText.locator('..').locator('button').first();
        await expect(resetBtn).toHaveAttribute('type', 'reset');
        await resetButton.unmount();

        const button = await mount(<Button type="button">Button</Button>);
        const buttonText = button.getByText('Button');
        const btn = buttonText.locator('..').locator('button').first();
        await expect(btn).toHaveAttribute('type', 'button');
    });

    test('should use custom data-testid when provided', async ({ mount }) => {
        const component = await mount(<Button data-testid="custom-button">Click Me</Button>);

        await expect(component.getByText('Click Me')).toBeVisible();
        const textElement = component.getByText('Click Me');
        const button = textElement.locator('..').locator('button').first();
        await expect(button).toBeVisible();
        await expect(button).toHaveAttribute('data-testid', 'custom-button');
    });

    test('should render with title tooltip', async ({ mount }) => {
        const component = await mount(<Button title="Tooltip text">Hover Me</Button>);

        await expect(component.getByText('Hover Me')).toBeVisible();
    });

    test('should show the reason for a disabled button, which cannot host the tooltip trigger itself', async ({ mount, page }) => {
        const component = await mount(
            <Button disabled disabledTooltip="A retry is already in flight">
                Retry
            </Button>,
        );

        const button = component.getByText('Retry').locator('..').locator('button').first();
        await expect(button).toBeDisabled();

        // The button takes no pointer events while disabled, so the wrapper around it is what the pointer reaches.
        await component.locator('span.inline-flex').hover();
        await expect(page.getByRole('tooltip')).toHaveText('A retry is already in flight');
    });

    test('should support custom className', async ({ mount }) => {
        const component = await mount(<Button className="custom-class">Custom</Button>);

        await expect(component.getByText('Custom')).toBeVisible();
        const textElement = component.getByText('Custom');
        const button = textElement.locator('..').locator('button').first();
        await expect(button).toHaveClass(/custom-class/);
    });

    test('should support id prop', async ({ mount }) => {
        const component = await mount(<Button id="test-button-id">Test</Button>);

        await expect(component.getByText('Test')).toBeVisible();
        const textElement = component.getByText('Test');
        const button = textElement.locator('..').locator('button').first();
        await expect(button).toHaveAttribute('id', 'test-button-id');
    });

    test('should render with icon and text', async ({ mount }) => {
        const component = await mount(
            <Button>
                <span>Icon</span>
                <span>Text</span>
            </Button>,
        );

        await expect(component.getByText('Icon')).toBeVisible();
        await expect(component.getByText('Text')).toBeVisible();
    });
});
