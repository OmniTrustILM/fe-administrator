import { test, expect } from '../../../playwright/ct-test';
import DatePicker from './index';

/** Dropdown is rendered via createPortal into document.body (class contains fixed and w-80) */
function getDropdown(page: { locator: (selector: string) => any }) {
    return page.locator('div.fixed.w-80');
}

test.describe('DatePicker', () => {
    test('should render date picker input', async ({ mount }) => {
        const component = await mount(
            <div>
                <DatePicker value="" onChange={() => {}} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await expect(input).toBeVisible();
    });

    test('should display selected date value', async ({ mount }) => {
        const component = await mount(
            <div>
                <DatePicker value="2024-01-15" onChange={() => {}} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await expect(input).toHaveValue('15.01.2024');
    });

    test('should call onChange when date is selected', async ({ mount, page }) => {
        let selectedValue = '';
        const component = await mount(
            <div>
                <DatePicker value="" onChange={(v) => (selectedValue = v)} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await input.click();
        await expect(getDropdown(page)).toBeVisible();

        const day15 = getDropdown(page).getByRole('button', { name: '15' }).first();
        await day15.click();

        expect(selectedValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should call onBlur when date is selected (no time picker)', async ({ mount, page }) => {
        let blurCount = 0;
        const component = await mount(
            <div>
                <DatePicker value="" onChange={() => {}} onBlur={() => (blurCount += 1)} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await input.click();
        await expect(getDropdown(page)).toBeVisible();

        const day15 = getDropdown(page).getByRole('button', { name: '15' }).first();
        await day15.click();

        expect(blurCount).toBe(1);
    });

    test('should call onBlur when clicking outside', async ({ mount, page }) => {
        let blurCount = 0;
        const component = await mount(
            <div>
                <DatePicker value="" onChange={() => {}} onBlur={() => (blurCount += 1)} />
                <div data-testid="outside">Outside</div>
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await input.click();
        await expect(getDropdown(page)).toBeVisible();

        await component.getByTestId('outside').click();
        await expect(getDropdown(page)).not.toBeVisible();
        expect(blurCount).toBe(1);
    });

    test('should navigate to previous month', async ({ mount, page }) => {
        const component = await mount(
            <div>
                <DatePicker value="2024-06-15" onChange={() => {}} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await input.click();
        await expect(getDropdown(page)).toBeVisible();

        await getDropdown(page).getByRole('button', { name: 'Previous' }).click();
        await expect(getDropdown(page).locator('text=May')).toBeVisible();
    });

    test('should navigate to next month', async ({ mount, page }) => {
        const component = await mount(
            <div>
                <DatePicker value="2024-06-15" onChange={() => {}} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await input.click();
        await expect(getDropdown(page)).toBeVisible();

        await getDropdown(page).getByRole('button', { name: 'Next' }).click();
        await expect(getDropdown(page).locator('text=July')).toBeVisible();
    });

    test('should navigate year when going prev from January', async ({ mount, page }) => {
        const component = await mount(
            <div>
                <DatePicker value="2024-01-15" onChange={() => {}} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await input.click();
        await expect(getDropdown(page)).toBeVisible();

        await getDropdown(page).getByRole('button', { name: 'Previous' }).click();
        await expect(getDropdown(page).locator('text=December')).toBeVisible();
        await expect(getDropdown(page).locator('text=2023')).toBeVisible();
    });

    test('should navigate year when going next from December', async ({ mount, page }) => {
        const component = await mount(
            <div>
                <DatePicker value="2024-12-15" onChange={() => {}} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await input.click();
        await expect(getDropdown(page)).toBeVisible();

        await getDropdown(page).getByRole('button', { name: 'Next' }).click();
        await expect(getDropdown(page).locator('text=January')).toBeVisible();
        await expect(getDropdown(page).locator('text=2025')).toBeVisible();
    });

    test('should select date with timePicker and call onChange with datetime', async ({ mount, page }) => {
        let selectedValue = '';
        const component = await mount(
            <div>
                <DatePicker value="" onChange={(v) => (selectedValue = v)} timePicker={true} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await input.click();
        await expect(getDropdown(page)).toBeVisible();

        const day15 = getDropdown(page).getByRole('button', { name: '15' }).first();
        await day15.click();

        expect(selectedValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
        await expect(getDropdown(page)).toBeVisible();
    });

    test('should call onBlur when Confirm is clicked in time picker', async ({ mount, page }) => {
        let blurCount = 0;
        const component = await mount(
            <div>
                <DatePicker value="" onChange={() => {}} onBlur={() => (blurCount += 1)} timePicker={true} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await input.click();
        await expect(getDropdown(page)).toBeVisible();

        const day15 = getDropdown(page).getByRole('button', { name: '15' }).first();
        await day15.click();
        await getDropdown(page).getByRole('button', { name: 'Confirm' }).click();

        expect(blurCount).toBe(1);
        await expect(getDropdown(page)).not.toBeVisible();
    });

    test('should close dropdown when Cancel is clicked in time picker', async ({ mount, page }) => {
        const component = await mount(
            <div>
                <DatePicker value="" onChange={() => {}} timePicker={true} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await input.click();
        await expect(getDropdown(page)).toBeVisible();

        await getDropdown(page).getByRole('button', { name: 'Cancel' }).click();
        await expect(getDropdown(page)).not.toBeVisible();
    });

    test('should call onChange when time hours are changed', async ({ mount, page }) => {
        let lastValue = '';
        const component = await mount(
            <div>
                <DatePicker value="2024-01-15T00:00:00" onChange={(v) => (lastValue = v)} timePicker={true} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await input.click();
        await expect(getDropdown(page)).toBeVisible();

        const hoursInput = getDropdown(page).locator('#datepicker-time-hours');
        await hoursInput.fill('14');
        await hoursInput.blur();

        expect(lastValue).toContain('T14:');
    });

    test('should call onChange when time minutes are changed', async ({ mount, page }) => {
        let lastValue = '';
        const component = await mount(
            <div>
                <DatePicker value="2024-01-15T10:00:00" onChange={(v) => (lastValue = v)} timePicker={true} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await input.click();
        await expect(getDropdown(page)).toBeVisible();

        const inputs = getDropdown(page).locator('input[type="number"]');
        await inputs.nth(1).fill('45');
        await inputs.nth(1).blur();

        expect(lastValue).toMatch(/T10:45:/);
    });

    test('should call onChange when time seconds are changed', async ({ mount, page }) => {
        let lastValue = '';
        const component = await mount(
            <div>
                <DatePicker value="2024-01-15T10:30:00" onChange={(v) => (lastValue = v)} timePicker={true} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await input.click();
        await expect(getDropdown(page)).toBeVisible();

        const inputs = getDropdown(page).locator('input[type="number"]');
        await inputs.nth(2).fill('30');
        await inputs.nth(2).blur();

        expect(lastValue).toMatch(/T10:30:30/);
    });

    test('should close dropdown when input is clicked again', async ({ mount, page }) => {
        const component = await mount(
            <div>
                <DatePicker value="" onChange={() => {}} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await input.click();
        await expect(getDropdown(page)).toBeVisible();
        await input.click();
        await expect(getDropdown(page)).not.toBeVisible();
    });

    test('should not open when disabled and input is clicked', async ({ mount, page }) => {
        const component = await mount(
            <div>
                <DatePicker value="" onChange={() => {}} disabled />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await input.click({ force: true });
        await page.waitForTimeout(100);
        await expect(getDropdown(page)).not.toBeVisible();
    });

    test('should show NaN when value is invalid date string', async ({ mount }) => {
        const component = await mount(
            <div>
                <DatePicker value="not-a-date" onChange={() => {}} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await expect(input).toHaveValue('NaN.NaN.NaN');
    });

    test('should show 00:00:00 when timePicker is true and value is invalid', async ({ mount }) => {
        const component = await mount(
            <div>
                <DatePicker value="invalid" onChange={() => {}} timePicker={true} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        const value = await input.inputValue();
        expect(value).toContain('00:00:00');
    });

    test('should be disabled when disabled prop is true', async ({ mount }) => {
        const component = await mount(
            <div>
                <DatePicker value="" onChange={() => {}} disabled={true} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await expect(input).toBeDisabled();
    });

    test('should display error message when error prop is provided', async ({ mount }) => {
        const component = await mount(
            <div>
                <DatePicker value="" onChange={() => {}} error="This field is required" />
            </div>,
        );

        await expect(component.getByText('This field is required')).toBeVisible();
    });

    test('should apply invalid styling when invalid is true', async ({ mount }) => {
        const component = await mount(
            <div>
                <DatePicker value="" onChange={() => {}} invalid={true} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await expect(input).toHaveClass(/border-danger/);
    });

    test('should support time picker when timePicker is true', async ({ mount }) => {
        const component = await mount(
            <div>
                <DatePicker value="2024-01-15T10:30:00" onChange={() => {}} timePicker={true} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        const value = await input.inputValue();
        expect(value).toContain('10:30:00');
    });

    test('should display placeholder', async ({ mount }) => {
        const component = await mount(
            <div>
                <DatePicker value="" onChange={() => {}} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await expect(input).toHaveAttribute('placeholder', 'dd.mm.yyyy');
    });

    test('should display time placeholder when timePicker is true', async ({ mount }) => {
        const component = await mount(
            <div>
                <DatePicker value="" onChange={() => {}} timePicker={true} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await expect(input).toHaveAttribute('placeholder', 'dd.mm.yyyy 00:00:00');
    });

    test('should support custom className', async ({ mount }) => {
        const component = await mount(
            <div>
                <DatePicker value="" onChange={() => {}} className="custom-datepicker" />
            </div>,
        );

        const container = component.locator('.custom-datepicker');
        await expect(container).toBeAttached();
    });

    test('should support id prop', async ({ mount }) => {
        const component = await mount(
            <div>
                <DatePicker value="" onChange={() => {}} id="test-datepicker" />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await expect(input).toHaveAttribute('id', 'test-datepicker');
    });

    test('should position dropdown when viewport is limited', async ({ mount, page }) => {
        await page.setViewportSize({ width: 400, height: 300 });
        const component = await mount(
            <div style={{ marginTop: 0 }}>
                <DatePicker value="" onChange={() => {}} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await input.click();
        await expect(getDropdown(page)).toBeVisible();
        const dropdown = getDropdown(page);
        await expect(dropdown).toHaveAttribute('style', /top:|left:/);
    });

    test('should update dropdown position on scroll', async ({ mount, page }) => {
        const component = await mount(
            <div style={{ height: 2000 }}>
                <DatePicker value="" onChange={() => {}} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await input.click();
        await expect(getDropdown(page)).toBeVisible();
        await page.evaluate(() => window.scrollTo(0, 100));
        await page.waitForTimeout(50);
        await expect(getDropdown(page)).toBeVisible();
    });

    test('should select day in different month after navigation', async ({ mount, page }) => {
        let selectedValue = '';
        const component = await mount(
            <div>
                <DatePicker value="2024-06-01" onChange={(v) => (selectedValue = v)} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await input.click();
        await expect(getDropdown(page)).toBeVisible();

        await getDropdown(page).getByRole('button', { name: 'Next' }).click();
        const day5July = getDropdown(page).getByRole('button', { name: '5', disabled: false }).first();
        await day5July.click();

        expect(selectedValue).toBe('2024-07-05');
    });
});
