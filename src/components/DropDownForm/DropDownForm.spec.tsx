import { test, expect } from '../../../playwright/ct-test';
import DropDownForm from './index';

test.describe('DropDownForm', () => {
    test('should render form with dropdowns', async ({ mount }) => {
        const dropDownOptionsList = [
            {
                formLabel: 'Field 1',
                formValue: 'field1',
                options: [
                    { label: 'Option 1', value: '1' },
                    { label: 'Option 2', value: '2' },
                ],
            },
        ];

        const component = await mount(
            <div>
                <DropDownForm dropDownOptionsList={dropDownOptionsList} onSubmit={() => {}} onClose={() => {}} />
            </div>,
        );

        const label = component.locator('label[for="field1"]');
        await expect(label).toBeVisible();
        await expect(label).toHaveText('Field 1');
    });

    test('should render submit and close buttons', async ({ mount }) => {
        const dropDownOptionsList = [
            {
                formLabel: 'Field 1',
                formValue: 'field1',
                options: [{ label: 'Option 1', value: '1' }],
            },
        ];

        const component = await mount(
            <div>
                <DropDownForm dropDownOptionsList={dropDownOptionsList} onSubmit={() => {}} onClose={() => {}} />
            </div>,
        );

        await expect(component.getByRole('button', { name: 'Close' })).toBeVisible();
        await expect(component.getByRole('button', { name: 'Submit' })).toBeVisible();
    });

    test('should disable submit button when form is invalid', async ({ mount }) => {
        const dropDownOptionsList = [
            {
                formLabel: 'Field 1',
                formValue: 'field1',
                options: [{ label: 'Option 1', value: '1' }],
            },
        ];

        const component = await mount(
            <div>
                <DropDownForm dropDownOptionsList={dropDownOptionsList} onSubmit={() => {}} onClose={() => {}} />
            </div>,
        );

        const submitButton = component.getByRole('button', { name: 'Submit' });
        await expect(submitButton).toBeDisabled();
    });

    test('should call onClose when Close button is clicked', async ({ mount }) => {
        let closed = false;
        const dropDownOptionsList = [
            {
                formLabel: 'Field 1',
                formValue: 'field1',
                options: [{ label: 'Option 1', value: '1' }],
            },
        ];
        const component = await mount(
            <div>
                <DropDownForm dropDownOptionsList={dropDownOptionsList} onSubmit={() => {}} onClose={() => (closed = true)} />
            </div>,
        );
        await component.getByRole('button', { name: 'Close' }).click();
        expect(closed).toBe(true);
    });

    test('should call onSubmit with selected value when form is valid', async ({ mount }) => {
        let submitted: Record<string, string> | null = null;
        const dropDownOptionsList = [
            {
                formLabel: 'Field 1',
                formValue: 'field1',
                options: [
                    { label: 'Option 1', value: '1' },
                    { label: 'Option 2', value: '2' },
                ],
            },
        ];
        const component = await mount(
            <div>
                <DropDownForm dropDownOptionsList={dropDownOptionsList} onSubmit={(values) => (submitted = values)} onClose={() => {}} />
            </div>,
        );
        await component.getByTestId('select-field1-trigger').click();
        await component.page().getByRole('option', { name: 'Option 1', exact: true }).click();
        await component.getByRole('button', { name: 'Submit' }).click();
        expect(submitted).not.toBeNull();
        expect(submitted?.field1).toBe('1');
    });
});
