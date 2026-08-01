import { test, expect } from '../../../playwright/ct-test';
import TextInput from './index';

test.describe('TextInput', () => {
    test('should render text input', async ({ mount }) => {
        const component = await mount(<TextInput value="" onChange={() => {}} />);

        const input = component.getByRole('textbox');
        await expect(input).toBeVisible();
    });

    test('should display value', async ({ mount }) => {
        const component = await mount(<TextInput value="Test value" onChange={() => {}} />);

        const input = component.getByRole('textbox');
        await expect(input).toHaveValue('Test value');
    });

    test('should call onChange when value changes', async ({ mount }) => {
        let newValue = '';
        const handleChange = (value: string) => {
            newValue = value;
        };

        const component = await mount(<TextInput value="" onChange={handleChange} />);

        const input = component.getByRole('textbox');
        await input.focus(); // TextInput removes readonly on focus to allow editing (anti-autofill)
        await input.fill('New text');
        await expect.poll(() => newValue, { timeout: 2000 }).toBe('New text');
    });

    test('should display placeholder', async ({ mount }) => {
        const component = await mount(<TextInput value="" onChange={() => {}} placeholder="Enter text here" />);

        const input = component.getByRole('textbox');
        await expect(input).toHaveAttribute('placeholder', 'Enter text here');
    });

    test('should be disabled when disabled prop is true', async ({ mount }) => {
        const component = await mount(<TextInput value="" onChange={() => {}} disabled={true} />);

        const input = component.getByRole('textbox');
        await expect(input).toBeDisabled();
    });

    test('should support different input types', async ({ mount }) => {
        const textInput = await mount(<TextInput value="" onChange={() => {}} type="text" />);
        const text = textInput.getByRole('textbox');
        await expect(text).toHaveAttribute('type', 'text');
        await textInput.unmount();

        const emailInput = await mount(<TextInput value="" onChange={() => {}} type="email" />);
        const email = emailInput.getByRole('textbox');
        await expect(email).toHaveAttribute('type', 'email');
        await emailInput.unmount();

        const passwordInput = await mount(<TextInput value="" onChange={() => {}} type="password" />);
        const password = passwordInput.getByRole('textbox');
        await expect(password).toHaveAttribute('type', 'password');
    });

    test('should render with label', async ({ mount }) => {
        const component = await mount(<TextInput value="" onChange={() => {}} label="Input Label" />);

        await expect(component.getByText('Input Label')).toBeVisible();
        const input = component.getByRole('textbox');
        await expect(input).toBeVisible();
    });

    test('should show required indicator when required is true', async ({ mount }) => {
        const component = await mount(<TextInput value="" onChange={() => {}} label="Required Field" required={true} />);

        const label = component.getByText('Required Field');
        const requiredSpan = label.locator('..').locator('span.text-danger');
        await expect(requiredSpan).toBeVisible();
    });

    test('should display error message when error prop is provided', async ({ mount }) => {
        const component = await mount(<TextInput value="" onChange={() => {}} error="This field is required" />);

        await expect(component.getByText('This field is required')).toBeVisible();
    });

    test('should apply invalid styling when invalid is true', async ({ mount }) => {
        const component = await mount(<TextInput value="" onChange={() => {}} invalid={true} />);

        const input = component.getByRole('textbox');
        await expect(input).toHaveClass(/border-danger/);
    });

    test('should support id prop', async ({ mount }) => {
        const component = await mount(<TextInput value="" onChange={() => {}} id="test-input-id" />);

        const input = component.getByRole('textbox');
        await expect(input).toHaveAttribute('id', 'test-input-id');
    });

    test('should associate label with input via id', async ({ mount }) => {
        const component = await mount(<TextInput value="" onChange={() => {}} id="test-input" label="Test Label" />);

        const label = component.getByText('Test Label');
        const input = component.getByRole('textbox');
        await expect(label).toHaveAttribute('for', 'test-input');
        await expect(input).toHaveAttribute('id', 'test-input');
    });

    test('should render number input when type is number', async ({ mount }) => {
        const component = await mount(<TextInput value="" onChange={() => {}} type="number" />);

        const input = component.getByRole('spinbutton');
        await expect(input).toHaveAttribute('type', 'number');
    });

    test('should call onBlur when input loses focus', async ({ mount }) => {
        let blurred = false;
        const handleBlur = () => {
            blurred = true;
        };

        const component = await mount(<TextInput value="" onChange={() => {}} onBlur={handleBlur} />);

        const input = component.getByRole('textbox');
        await input.focus();
        await input.blur();
        expect(blurred).toBe(true);
    });
});
