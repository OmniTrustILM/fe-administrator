import { test, expect } from '../../../../playwright/ct-test';
import MultipleValueTextInput from './index';
import MultipleValueTextInputTestWrapper from './MultipleValueTextInputTestWrapper';

test.describe('MultipleValueTextInput', () => {
    test('should render Select and input', async ({ mount }) => {
        const component = await mount(
            <div>
                <MultipleValueTextInput selectedValues={[]} onValuesChange={() => {}} />
            </div>,
        );

        const select = component.getByTestId('select-multiple-value-input-input');
        const input = component.locator('input[type="text"]');
        await expect(select).toBeAttached();
        await expect(input).toBeVisible();
    });

    test('should display placeholder for Select', async ({ mount }) => {
        const component = await mount(
            <div>
                <MultipleValueTextInput
                    selectedValues={[]}
                    onValuesChange={() => {}}
                    placeholder="Select or add values"
                    initialOptions={[{ label: 'Opt', value: 'opt' }]}
                />
            </div>,
        );

        const trigger = component.getByTestId('select-multiple-value-input-trigger');
        await expect(trigger).toContainText('Select or add values');
    });

    test('should display addPlaceholder for input', async ({ mount }) => {
        const component = await mount(
            <div>
                <MultipleValueTextInput selectedValues={[]} onValuesChange={() => {}} addPlaceholder="Add value" />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await expect(input).toHaveAttribute('placeholder', 'Add value');
    });

    test('should call onValuesChange when value is added via Enter', async ({ mount }) => {
        let values: string[] = [];
        const handleChange = (newValues: string[]) => {
            values = newValues;
        };

        const component = await mount(
            <div>
                <MultipleValueTextInput selectedValues={[]} onValuesChange={handleChange} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await input.fill('value1');
        await input.press('Enter');
        expect(values).toContain('value1');
        expect(values).toHaveLength(1);
    });

    test('should call onValuesChange when value is added via Add button', async ({ mount }) => {
        let values: string[] = [];
        const handleChange = (newValues: string[]) => {
            values = newValues;
        };

        const component = await mount(
            <div>
                <MultipleValueTextInput selectedValues={[]} onValuesChange={handleChange} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        const addButton = component.locator('button[type="button"]').filter({ hasText: /^Add$/ }).last();
        await input.fill('value1');
        await addButton.click();
        expect(values).toContain('value1');
        expect(values).toHaveLength(1);
    });

    test('should not add duplicate values', async ({ mount }) => {
        let values = ['value1'];
        const handleChange = (newValues: string[]) => {
            values = newValues;
        };

        const component = await mount(
            <div>
                <MultipleValueTextInput selectedValues={['value1']} onValuesChange={handleChange} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await input.fill('value1');
        await input.press('Enter');

        expect(values).toHaveLength(1);
        expect(values).toContain('value1');
    });

    test('should clear input after adding value', async ({ mount }) => {
        let values: string[] = [];
        const handleChange = (newValues: string[]) => {
            values = newValues;
        };

        const component = await mount(
            <div>
                <MultipleValueTextInput selectedValues={[]} onValuesChange={handleChange} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        await input.fill('value1');
        await input.press('Enter');
        await expect(input).toHaveValue('');
        expect(values).toContain('value1');
    });

    test('should support id prop', async ({ mount }) => {
        const component = await mount(
            <div>
                <MultipleValueTextInput selectedValues={[]} onValuesChange={() => {}} id="test-input" />
            </div>,
        );

        const trigger = component.getByTestId('select-test-input-trigger');
        await expect(trigger).toBeVisible();
        const nativeMirror = component.getByTestId('select-test-input-input');
        await expect(nativeMirror).toHaveAttribute('id', 'test-input');
    });

    test('should display initial options in Select', async ({ mount }) => {
        const initialOptions = [
            { label: 'Option 1', value: 'option1' },
            { label: 'Option 2', value: 'option2' },
        ];

        const component = await mount(
            <div>
                <MultipleValueTextInput selectedValues={[]} onValuesChange={() => {}} initialOptions={initialOptions} />
            </div>,
        );

        const select = component.getByTestId('select-multiple-value-input-input');
        await expect(select).toBeAttached();
    });

    test('should add multiple values', async ({ mount }) => {
        let values: string[] = [];
        const handleChange = (newValues: string[]) => {
            values = newValues;
        };

        let component = await mount(
            <div>
                <MultipleValueTextInput selectedValues={values} onValuesChange={handleChange} />
            </div>,
        );

        const input = component.locator('input[type="text"]');
        const addButton = component.locator('button[type="button"]').filter({ hasText: /^Add$/ }).last();

        await input.fill('value1');
        await addButton.click();
        await expect.poll(() => values, { timeout: 1000 }).toContain('value1');
        expect(values).toHaveLength(1);

        await component.unmount();
        component = await mount(
            <div>
                <MultipleValueTextInput selectedValues={values} onValuesChange={handleChange} />
            </div>,
        );

        const input2 = component.locator('input[type="text"]');
        const addButton2 = component.locator('button[type="button"]').filter({ hasText: /^Add$/ }).last();

        await input2.fill('value2');
        await addButton2.click();
        await expect.poll(() => values, { timeout: 1000 }).toContain('value2');

        expect(values).toHaveLength(2);
        expect(values).toContain('value1');
        expect(values).toContain('value2');
    });

    test('should call onValuesChange when selecting from initialOptions', async ({ mount }) => {
        let values: string[] = [];
        const initialOptions = [
            { label: 'Opt1', value: 'opt1' },
            { label: 'Opt2', value: 'opt2' },
        ];
        const component = await mount(
            <div>
                <MultipleValueTextInput selectedValues={values} onValuesChange={(v) => (values = v)} initialOptions={initialOptions} />
            </div>,
        );
        await component.locator('input[type="text"]').fill('opt1');
        await component.locator('input[type="text"]').press('Enter');
        expect(values).toContain('opt1');
    });

    test('should render with pre-filled selectedValues', async ({ mount }) => {
        const component = await mount(
            <div>
                <MultipleValueTextInput selectedValues={['existing1', 'existing2']} onValuesChange={() => {}} />
            </div>,
        );
        const select = component.getByTestId('select-multiple-value-input-input');
        await expect(select).toBeAttached();
        await expect(component.locator('input[type="text"]')).toHaveAttribute('placeholder', 'Add value');
    });

    test('should use default id when id is not provided', async ({ mount }) => {
        const component = await mount(
            <div>
                <MultipleValueTextInput selectedValues={[]} onValuesChange={() => {}} />
            </div>,
        );
        const nativeMirror = component.getByTestId('select-multiple-value-input-input');
        await expect(nativeMirror).toHaveAttribute('id', 'multiple-value-input');
    });

    test('should not add value when Enter is pressed with empty input', async ({ mount }) => {
        let values: string[] = [];
        const component = await mount(
            <div>
                <MultipleValueTextInput selectedValues={[]} onValuesChange={(v) => (values = v)} />
            </div>,
        );
        const input = component.locator('input[type="text"]');
        await input.focus();
        await input.press('Enter');
        expect(values).toHaveLength(0);
    });

    test('should not add value when Add button is clicked with empty input', async ({ mount }) => {
        let values: string[] = [];
        const component = await mount(
            <div>
                <MultipleValueTextInput selectedValues={[]} onValuesChange={(v) => (values = v)} />
            </div>,
        );
        const addButton = component.locator('button[type="button"]').filter({ hasText: /^Add$/ }).last();
        await addButton.click();
        expect(values).toHaveLength(0);
    });

    test('should call setOptions when adding new value in controlled options mode', async ({ mount }) => {
        const options = [{ value: 'a', label: 'A' }];
        let optionsState = [...options];
        const setOptions = (newOptions: typeof options) => {
            optionsState = newOptions;
        };
        let values: string[] = [];
        const component = await mount(
            <div>
                <MultipleValueTextInput
                    selectedValues={values}
                    onValuesChange={(v) => (values = v)}
                    options={optionsState}
                    setOptions={setOptions}
                />
            </div>,
        );
        const input = component.locator('input[type="text"]');
        await input.fill('newOption');
        await input.press('Enter');
        expect(values).toContain('newOption');
        expect(optionsState.some((o) => o.value === 'newOption')).toBe(true);
        expect(optionsState).toHaveLength(2);
    });

    test('should not call setOptions when added value already exists in options', async ({ mount }) => {
        const options = [{ value: 'existing', label: 'Existing' }];
        let setOptionsCallCount = 0;
        const setOptions = () => {
            setOptionsCallCount += 1;
        };
        let values: string[] = [];
        const component = await mount(
            <div>
                <MultipleValueTextInput
                    selectedValues={values}
                    onValuesChange={(v) => (values = v)}
                    options={options}
                    setOptions={setOptions}
                />
            </div>,
        );
        const input = component.locator('input[type="text"]');
        await input.fill('existing');
        await input.press('Enter');
        expect(values).toContain('existing');
        expect(setOptionsCallCount).toBe(0);
    });

    test('should add new value and extend internal options when not in initialOptions', async ({ mount }) => {
        let values: string[] = [];
        const initialOptions = [{ value: 'opt1', label: 'Opt1' }];
        const component = await mount(
            <div>
                <MultipleValueTextInput selectedValues={values} onValuesChange={(v) => (values = v)} initialOptions={initialOptions} />
            </div>,
        );
        const input = component.locator('input[type="text"]');
        await input.fill('brandNew');
        await input.press('Enter');
        expect(values).toContain('brandNew');
        expect(values).toHaveLength(1);
    });

    test('should call onValuesChange when selection is changed via Select dropdown', async ({ mount, page }) => {
        let values: string[] = [];
        const initialOptions = [
            { value: 'choice1', label: 'Choice 1' },
            { value: 'choice2', label: 'Choice 2' },
        ];
        const component = await mount(
            <div>
                <MultipleValueTextInput selectedValues={values} onValuesChange={(v) => (values = v)} initialOptions={initialOptions} />
            </div>,
        );
        await component.getByTestId('select-multiple-value-input-trigger').click();
        const option = page.getByRole('option', { name: 'Choice 1' });
        await option.click();
        await expect.poll(() => values, { timeout: 2000 }).toContain('choice1');
    });

    test('should sync internal options when initialOptions change via wrapper', async ({ mount }) => {
        const component = await mount(<MultipleValueTextInputTestWrapper />);
        const input = component.locator('input[type="text"]');
        await input.fill('a1');
        await input.press('Enter');
        await component.getByTestId('switch-options').click();
        await input.fill('b1');
        await input.press('Enter');
        const select = component.getByTestId('select-multiple-value-input-input');
        await expect(select).toBeAttached();
    });
});
