import { test, expect } from '../../../playwright/ct-test';
import TextArea from './index';

test.describe('TextArea', () => {
    test('should render textarea', async ({ mount }) => {
        const component = await mount(
            <div>
                <TextArea value="" onChange={() => {}} />
            </div>,
        );

        const textarea = component.locator('textarea');
        await expect(textarea).toBeVisible();
    });

    test('should display value', async ({ mount }) => {
        const component = await mount(
            <div>
                <TextArea value="Test value" onChange={() => {}} />
            </div>,
        );

        const textarea = component.locator('textarea');
        await expect(textarea).toHaveValue('Test value');
    });

    test('should call onChange when value changes', async ({ mount }) => {
        let newValue = '';
        const handleChange = (value: string) => {
            newValue = value;
        };

        const component = await mount(
            <div>
                <TextArea value="" onChange={handleChange} />
            </div>,
        );

        const textarea = component.locator('textarea');
        await textarea.fill('New text');
        await expect.poll(() => newValue).toBe('New text');
    });

    test('should display placeholder', async ({ mount }) => {
        const component = await mount(
            <div>
                <TextArea value="" onChange={() => {}} placeholder="Enter text here" />
            </div>,
        );

        const textarea = component.locator('textarea');
        await expect(textarea).toHaveAttribute('placeholder', 'Enter text here');
    });

    test('should be disabled when disabled prop is true', async ({ mount }) => {
        const component = await mount(
            <div>
                <TextArea value="" onChange={() => {}} disabled={true} />
            </div>,
        );

        const textarea = component.locator('textarea');
        await expect(textarea).toBeDisabled();
    });

    test('should call onBlur when textarea loses focus', async ({ mount }) => {
        let blurred = false;
        const handleBlur = () => {
            blurred = true;
        };

        const component = await mount(
            <div>
                <TextArea value="" onChange={() => {}} onBlur={handleBlur} />
            </div>,
        );

        const textarea = component.locator('textarea');
        await textarea.focus();
        await textarea.blur();
        expect(blurred).toBe(true);
    });

    test('should render with label', async ({ mount }) => {
        const component = await mount(<TextArea value="" onChange={() => {}} label="Text Area Label" />);

        await expect(component.getByText('Text Area Label')).toBeVisible();
        const textarea = component.locator('textarea');
        await expect(textarea).toBeVisible();
    });

    test('should show required indicator when required is true', async ({ mount }) => {
        const component = await mount(<TextArea value="" onChange={() => {}} label="Required Field" required={true} />);

        const label = component.getByText('Required Field');
        const requiredSpan = label.locator('..').locator('span.text-danger');
        await expect(requiredSpan).toBeVisible();
    });

    test('should display error message when error prop is provided', async ({ mount }) => {
        const component = await mount(<TextArea value="" onChange={() => {}} error="This field is required" />);

        await expect(component.getByText('This field is required')).toBeVisible();
    });

    test('should apply invalid styling when invalid is true', async ({ mount }) => {
        const component = await mount(
            <div>
                <TextArea value="" onChange={() => {}} invalid={true} />
            </div>,
        );

        const textarea = component.locator('textarea');
        await expect(textarea).toHaveClass(/border-danger/);
    });

    test('should support custom rows', async ({ mount }) => {
        const component = await mount(
            <div>
                <TextArea value="" onChange={() => {}} rows={5} />
            </div>,
        );

        const textarea = component.locator('textarea');
        await expect(textarea).toHaveAttribute('rows', '5');
    });

    test('should use default rows when not provided', async ({ mount }) => {
        const component = await mount(
            <div>
                <TextArea value="" onChange={() => {}} />
            </div>,
        );

        const textarea = component.locator('textarea');
        await expect(textarea).toHaveAttribute('rows', '3');
    });

    test('should support id prop', async ({ mount }) => {
        const component = await mount(
            <div>
                <TextArea value="" onChange={() => {}} id="test-textarea-id" />
            </div>,
        );

        const textarea = component.locator('textarea');
        await expect(textarea).toHaveAttribute('id', 'test-textarea-id');
    });

    test('should associate label with textarea via id', async ({ mount }) => {
        const component = await mount(<TextArea value="" onChange={() => {}} id="test-textarea" label="Test Label" />);

        const label = component.getByText('Test Label');
        const textarea = component.locator('textarea');
        await expect(label).toHaveAttribute('for', 'test-textarea');
        await expect(textarea).toHaveAttribute('id', 'test-textarea');
    });
});
