import { test, expect } from '../../../playwright/ct-test';
import Label from './index';

test.describe('Label', () => {
    test('should render label with children text', async ({ mount }) => {
        const component = await mount(<Label>Test Label</Label>);

        const label = component.getByText('Test Label');
        await expect(label).toBeVisible();

        const forAttribute = await label.getAttribute('for');
        expect(forAttribute).toBeNull();
    });

    test('should render label with title prop', async ({ mount }) => {
        const component = await mount(<Label title="Title Text">Children Text</Label>);

        await expect(component.getByText('Title Text')).toBeVisible();
        await expect(component.getByText('Children Text')).not.toBeVisible();
    });

    test('should render required indicator when required is true', async ({ mount }) => {
        const component = await mount(<Label required={true}>Required Label</Label>);

        await expect(component.getByText('Required Label')).toBeVisible();

        const label = component.getByText('Required Label');
        const requiredSpan = label.locator('..').locator('span.text-danger');
        await expect(requiredSpan).toBeVisible();
        await expect(requiredSpan).toHaveText(' *');
    });

    test('should not render required indicator when required is false', async ({ mount }) => {
        const component = await mount(<Label required={false}>Optional Label</Label>);

        await expect(component.getByText('Optional Label')).toBeVisible();
        const label = component.getByText('Optional Label');
        const requiredSpan = label.locator('..').locator('span.text-danger');
        await expect(requiredSpan).toHaveCount(0);
    });

    test('should support htmlFor prop', async ({ mount }) => {
        const component = await mount(<Label htmlFor="test-input-id">Label Text</Label>);

        const label = component.getByText('Label Text');
        await expect(label).toHaveAttribute('for', 'test-input-id');
    });

    test('should support custom className', async ({ mount }) => {
        const component = await mount(<Label className="custom-label-class">Label</Label>);

        const label = component.getByText('Label');
        await expect(label).toHaveClass(/custom-label-class/);
    });

    test('should render with React node children', async ({ mount }) => {
        const component = await mount(
            <Label>
                <span>Label</span>
                <span>Text</span>
            </Label>,
        );

        await expect(component.getByText('Label')).toBeVisible();
        await expect(component.getByText('Text')).toBeVisible();
    });

    test('clicking button when onClick is provided calls onClick', async ({ mount }) => {
        let clicked = false;
        const component = await mount(
            <div data-testid="wrap">
                <Label onClick={() => (clicked = true)} dataTestId="click-label">
                    Click me
                </Label>
            </div>,
        );
        await component.getByTestId('click-label').click();
        expect(clicked).toBe(true);
    });

    test('Enter key on button triggers onClick', async ({ mount }) => {
        let triggered = false;
        const component = await mount(
            <div data-testid="wrap">
                <Label onClick={() => (triggered = true)} dataTestId="enter-label">
                    Press Enter
                </Label>
            </div>,
        );
        const btn = component.getByTestId('enter-label');
        await btn.focus();
        await btn.press('Enter');
        expect(triggered).toBe(true);
    });

    test('Space key on button triggers onClick', async ({ mount }) => {
        let triggered = false;
        const component = await mount(
            <div data-testid="wrap">
                <Label onClick={() => (triggered = true)} dataTestId="space-label">
                    Press Space
                </Label>
            </div>,
        );
        const btn = component.getByTestId('space-label');
        await btn.focus();
        await btn.press(' ');
        expect(triggered).toBe(true);
    });

    test('dataTestId is used when provided (button)', async ({ mount }) => {
        const component = await mount(
            <div data-testid="wrap">
                <Label onClick={() => {}} dataTestId="custom-label-id">
                    Text
                </Label>
            </div>,
        );
        await expect(component.getByTestId('custom-label-id')).toBeVisible();
    });
});
