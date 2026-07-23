import { test, expect } from '../../../playwright/ct-test';
import RadioRow from './index';

test.describe('RadioRow', () => {
    test('should render children', async ({ mount }) => {
        const component = await mount(
            <RadioRow checked={false} onSelect={() => {}}>
                <span>Every day</span>
            </RadioRow>,
        );
        await expect(component.getByText('Every day')).toBeVisible();
    });

    test('should show radio as checked when checked is true', async ({ mount }) => {
        const component = await mount(
            <RadioRow checked={true} onSelect={() => {}}>
                Option
            </RadioRow>,
        );
        await expect(component.getByRole('radio')).toBeChecked();
    });

    test('should show radio as unchecked when checked is false', async ({ mount }) => {
        const component = await mount(
            <RadioRow checked={false} onSelect={() => {}}>
                Option
            </RadioRow>,
        );
        await expect(component.getByRole('radio')).not.toBeChecked();
    });

    test('should call onSelect when radio is clicked', async ({ mount }) => {
        let selected = false;
        const component = await mount(
            <RadioRow
                checked={false}
                onSelect={() => {
                    selected = true;
                }}
            >
                Option
            </RadioRow>,
        );
        await component.getByRole('radio').click();
        await expect.poll(() => selected, { timeout: 2000 }).toBe(true);
    });

    test('should apply active border style when checked', async ({ mount }) => {
        const component = await mount(
            <RadioRow checked={true} onSelect={() => {}}>
                Option
            </RadioRow>,
        );
        await expect(component.locator('label')).toHaveClass(/border-blue-300/);
    });

    test('should apply inactive border style when unchecked', async ({ mount }) => {
        const component = await mount(
            <RadioRow checked={false} onSelect={() => {}}>
                Option
            </RadioRow>,
        );
        await expect(component.locator('label')).toHaveClass(/border-gray-200/);
    });

    test('should apply maxWidth style when maxWidth prop is provided', async ({ mount }) => {
        const component = await mount(
            <RadioRow checked={false} onSelect={() => {}} maxWidth={300}>
                Option
            </RadioRow>,
        );
        await expect(component).toHaveCSS('max-width', '300px');
    });

    test('should disable the radio and apply disabled styles when disabled', async ({ mount }) => {
        const component = await mount(
            <RadioRow checked={false} onSelect={() => {}} disabled>
                Option
            </RadioRow>,
        );
        await expect(component.getByRole('radio')).toBeDisabled();
        await expect(component.locator('label')).toHaveClass(/cursor-not-allowed/);
        await expect(component.locator('label')).toHaveClass(/opacity-60/);
    });

    test('should forward the name prop to the radio input', async ({ mount }) => {
        const component = await mount(
            <RadioRow checked={false} onSelect={() => {}} name="csr-validation">
                Option
            </RadioRow>,
        );
        await expect(component.getByRole('radio')).toHaveAttribute('name', 'csr-validation');
    });

    test('should render multiple children', async ({ mount }) => {
        const component = await mount(
            <RadioRow checked={false} onSelect={() => {}}>
                <span>Every</span>
                <span>5</span>
                <span>days</span>
            </RadioRow>,
        );
        await expect(component.getByText('Every')).toBeVisible();
        await expect(component.getByText('5')).toBeVisible();
        await expect(component.getByText('days')).toBeVisible();
    });
});
