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
        expect(selected).toBe(true);
    });

    test('should apply active border style when checked', async ({ mount }) => {
        const component = await mount(
            <RadioRow checked={true} onSelect={() => {}}>
                Option
            </RadioRow>,
        );
        await expect(component.locator('label')).toHaveClass(/border-brand/);
    });

    test('should apply inactive border style when unchecked', async ({ mount }) => {
        const component = await mount(
            <RadioRow checked={false} onSelect={() => {}}>
                Option
            </RadioRow>,
        );
        await expect(component.locator('label')).toHaveClass(/border-outline/);
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

    // @tailwindcss/forms paints the checked radio with `background-color: currentColor` from the
    // base layer, and any unconditional bg-* utility outranks it because utilities is the later
    // cascade layer. The dot in the checked state is a white SVG circle, so clobbering that fill
    // with a light surface makes a checked radio look unchecked. Hence not-checked:bg-surface-raised
    // rather than bg-surface-raised, and hence these two tests assert computed colour: every other
    // test in this file asserts class names, which cannot tell the two apart.
    test('should keep the brand fill on the checked radio', async ({ mount }) => {
        const component = await mount(
            <RadioRow checked={true} onSelect={() => {}}>
                Option
            </RadioRow>,
        );
        await expect(component.getByRole('radio')).toHaveCSS('background-color', 'rgb(0, 115, 207)');
    });

    test('should give the unchecked radio the themed surface rather than hardcoded white', async ({ mount, page }) => {
        const component = await mount(
            <RadioRow checked={false} onSelect={() => {}}>
                Option
            </RadioRow>,
        );
        await expect(component.getByRole('radio')).toHaveCSS('background-color', 'rgb(255, 255, 255)');

        await page.evaluate(() => document.documentElement.classList.add('dark'));
        await expect(component.getByRole('radio')).toHaveCSS('background-color', 'rgb(23, 23, 23)');
        await page.evaluate(() => document.documentElement.classList.remove('dark'));
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
