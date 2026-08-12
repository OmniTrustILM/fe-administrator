import { test, expect } from '../../../../playwright/ct-test';
import DurationInput from './index';

test.describe('DurationInput', () => {
    test('should render with empty value', async ({ mount }) => {
        const component = await mount(<DurationInput onChange={() => {}} />);
        await expect(component.getByRole('textbox')).toHaveValue('');
    });

    test('should display ISO 8601 value as human-readable string', async ({ mount }) => {
        const component = await mount(<DurationInput value="PT1H30M" onChange={() => {}} />);
        await expect(component.getByRole('textbox')).toHaveValue('1h 30m');
    });

    test('should display full duration with days, hours, minutes, seconds, and milliseconds', async ({ mount }) => {
        const component = await mount(<DurationInput value="P1DT2H30M45S" onChange={() => {}} />);
        await expect(component.getByRole('textbox')).toHaveValue('1d 2h 30m 45s');
    });

    test('should call onChange with ISO 8601 string on blur', async ({ mount }) => {
        let emitted = '';
        const component = await mount(
            <DurationInput
                onChange={(v) => {
                    emitted = v;
                }}
            />,
        );
        const input = component.getByRole('textbox');
        await input.fill('2h 30m');
        await input.blur();
        await expect.poll(() => emitted, { timeout: 2000 }).toBe('PT2H30M');
        expect(emitted).toBe('PT2H30M');
    });

    test('should re-format display value to canonical form on blur', async ({ mount }) => {
        const component = await mount(<DurationInput onChange={() => {}} />);
        const input = component.getByRole('textbox');
        await input.fill('90m');
        await input.blur();
        // 90m normalizes to 1h 30m
        await expect(input).toHaveValue('1h 30m');
    });

    test('should emit empty string when input is cleared on blur', async ({ mount }) => {
        let emitted: string | undefined;
        const component = await mount(
            <DurationInput
                value="PT1H"
                onChange={(v) => {
                    emitted = v;
                }}
            />,
        );
        const input = component.getByRole('textbox');
        await input.fill('');
        await input.blur();
        await expect.poll(() => emitted, { timeout: 2000 }).toBe('');
        expect(emitted).toBe('');
    });

    test('should emit empty string for invalid/unparseable input on blur', async ({ mount }) => {
        let emitted: string | undefined;
        const component = await mount(
            <DurationInput
                onChange={(v) => {
                    emitted = v;
                }}
            />,
        );
        const input = component.getByRole('textbox');
        await input.fill('not a duration');
        await input.blur();
        await expect.poll(() => emitted, { timeout: 2000 }).toBe('');
        expect(emitted).toBe('');
    });

    test('should call onBlur callback when input loses focus', async ({ mount }) => {
        let blurred = false;
        const component = await mount(
            <DurationInput
                onChange={() => {}}
                onBlur={() => {
                    blurred = true;
                }}
            />,
        );
        const input = component.getByRole('textbox');
        await input.focus();
        await input.blur();
        expect(blurred).toBe(true);
    });

    test('should sync display value when external value prop changes', async ({ mount }) => {
        let value = 'PT1H';
        const component = await mount(
            <DurationInput
                value={value}
                onChange={(v) => {
                    value = v;
                }}
            />,
        );
        await expect(component.getByRole('textbox')).toHaveValue('1h');
        await component.update(
            <DurationInput
                value="P2DT3H"
                onChange={(v) => {
                    value = v;
                }}
            />,
        );
        await expect(component.getByRole('textbox')).toHaveValue('2d 3h');
    });

    test('should be disabled when disabled prop is true', async ({ mount }) => {
        const component = await mount(<DurationInput onChange={() => {}} disabled />);
        await expect(component.getByRole('textbox')).toBeDisabled();
    });

    test('should render label when provided', async ({ mount }) => {
        const component = await mount(<DurationInput onChange={() => {}} label="Duration" />);
        await expect(component.getByText('Duration')).toBeVisible();
    });

    test('should show required indicator when required is true', async ({ mount }) => {
        const component = await mount(<DurationInput onChange={() => {}} label="Duration" required />);
        await expect(component.locator('span.text-danger')).toBeVisible();
    });

    test('should associate label with input via id', async ({ mount }) => {
        const component = await mount(<DurationInput id="dur" onChange={() => {}} label="My Duration" />);
        await expect(component.getByText('My Duration')).toHaveAttribute('for', 'dur');
        await expect(component.getByRole('textbox')).toHaveAttribute('id', 'dur');
    });

    test('should display error message when error prop is provided', async ({ mount }) => {
        const component = await mount(<DurationInput onChange={() => {}} error="Value is required" />);
        await expect(component.getByText('Value is required')).toBeVisible();
    });

    test('should apply invalid styling when invalid is true', async ({ mount }) => {
        const component = await mount(<DurationInput onChange={() => {}} invalid />);
        await expect(component.getByRole('textbox')).toHaveClass(/border-danger/);
    });

    test('should display custom placeholder when provided', async ({ mount }) => {
        const component = await mount(<DurationInput onChange={() => {}} placeholder="Enter duration" />);
        await expect(component.getByRole('textbox')).toHaveAttribute('placeholder', 'Enter duration');
    });

    test('should display default placeholder when none provided', async ({ mount }) => {
        const component = await mount(<DurationInput onChange={() => {}} />);
        await expect(component.getByRole('textbox')).toHaveAttribute('placeholder', 'e.g. 1d 2h 30m 45s 500ms');
    });

    test('should display format hint text', async ({ mount }) => {
        const component = await mount(<DurationInput onChange={() => {}} />);
        await expect(component.getByText(/Format:/)).toBeVisible();
    });
});
