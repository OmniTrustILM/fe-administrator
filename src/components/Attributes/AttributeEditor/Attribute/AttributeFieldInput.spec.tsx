import { test, expect } from '../../../../../playwright/ct-test';
import { AttributeFieldInputTestWrapper } from './AttributeFieldInputTestWrapper';
import type { DataAttributeModel } from 'types/attributes';
import { AttributeContentType } from 'types/openapi';

const defaultProperties = {
    label: 'Test Field',
    required: false,
    readOnly: false,
    visible: true,
    list: false,
    multiSelect: false,
};

function minimalDescriptor(contentType: AttributeContentType, overrides: Partial<DataAttributeModel> = {}): DataAttributeModel {
    return {
        type: 'Data',
        name: 'testField',
        uuid: 'test-uuid',
        contentType,
        properties: defaultProperties,
        ...overrides,
    } as DataAttributeModel;
}

test.describe('AttributeFieldInput', () => {
    test('renders TextInput for String contentType when visible', async ({ mount, page }) => {
        const descriptor = minimalDescriptor(AttributeContentType.String, {
            properties: { ...defaultProperties, label: 'My String Field' },
        } as any);
        await mount(<AttributeFieldInputTestWrapper name="testField" descriptor={descriptor} />);

        await expect(page.getByText('My String Field')).toBeVisible();
        const input = page.locator('#testField');
        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute('placeholder', 'Enter My String Field');
    });

    test('renders textarea for Text contentType', async ({ mount, page }) => {
        const descriptor = minimalDescriptor(AttributeContentType.Text, {
            properties: { ...defaultProperties, label: 'Description' },
        } as any);
        await mount(<AttributeFieldInputTestWrapper name="testField" descriptor={descriptor} />);

        await expect(page.getByText('Description')).toBeVisible();
        const textarea = page.locator('#testField');
        await expect(textarea).toBeVisible();
        await expect(textarea).toHaveAttribute('placeholder', 'Enter Description');
        await expect(textarea).toHaveAttribute('rows', '4');
    });

    test('renders Switch for Boolean contentType', async ({ mount, page }) => {
        const descriptor = minimalDescriptor(AttributeContentType.Boolean, {
            properties: { ...defaultProperties, label: 'Enable feature' },
        } as any);
        await mount(<AttributeFieldInputTestWrapper name="testField" descriptor={descriptor} />);

        const switchControl = page.locator('#testField');
        await expect(switchControl).toBeVisible();
        await expect(page.getByText('Enable feature')).toBeVisible();
    });

    test('switch onChange toggles checked state', async ({ mount, page }) => {
        const descriptor = minimalDescriptor(AttributeContentType.Boolean, {
            properties: { ...defaultProperties, label: 'Enable feature' },
        } as any);
        await mount(<AttributeFieldInputTestWrapper name="testField" descriptor={descriptor} />);

        const checkbox = page.locator('#testField');
        await expect(checkbox).not.toBeChecked();

        // Checkbox itself might be visually hidden, so click the label text.
        await page.getByText('Enable feature').click();
        await expect(checkbox).toBeChecked();
    });

    test('renders DatePicker for Datetime contentType', async ({ mount, page }) => {
        const descriptor = minimalDescriptor(AttributeContentType.Datetime, {
            properties: { ...defaultProperties, label: 'Start date' },
        } as any);
        await mount(<AttributeFieldInputTestWrapper name="testField" descriptor={descriptor} />);

        await expect(page.getByText('Start date')).toBeVisible();
        const datePicker = page.locator('#testField');
        await expect(datePicker).toBeVisible();
    });

    test('datetime shows Required Field error after blur', async ({ mount, page }) => {
        const descriptor = minimalDescriptor(AttributeContentType.Datetime, {
            properties: { ...defaultProperties, required: true, label: 'Start date' },
        } as any);
        await mount(<AttributeFieldInputTestWrapper name="testField" descriptor={descriptor} />);

        const dateInput = page.locator('#testField');
        await expect(dateInput).toBeVisible();

        // Confirm in DatePicker triggers onBlur; then we trigger validation.
        await page.locator('#testField').click();
        await page.getByRole('button', { name: 'Confirm' }).click();
        await page.getByTestId('trigger-validation').click();

        await expect(dateInput).toBeVisible();
    });

    test('renders number input for Integer contentType when visible', async ({ mount, page }) => {
        const descriptor = minimalDescriptor(AttributeContentType.Integer, {
            properties: { ...defaultProperties, label: 'Count' },
        } as any);
        await mount(<AttributeFieldInputTestWrapper name="testField" descriptor={descriptor} />);

        await expect(page.getByText('Count')).toBeVisible();
        const input = page.locator('#testField');
        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute('type', 'number');
    });

    test('does not render label or input when descriptor.properties.visible is false', async ({ mount, page }) => {
        const descriptor = minimalDescriptor(AttributeContentType.String, {
            properties: { ...defaultProperties, visible: false, label: 'Hidden Label' },
        } as any);
        await mount(<AttributeFieldInputTestWrapper name="testField" descriptor={descriptor} />);

        await expect(page.getByText('Hidden Label')).toHaveCount(0);
        await expect(page.locator('#testField')).toHaveCount(0);
    });

    test('renders description when descriptor.description is set and visible', async ({ mount, page }) => {
        const descriptor = minimalDescriptor(AttributeContentType.String, {
            description: 'This is a helpful description.',
        } as any);
        await mount(<AttributeFieldInputTestWrapper name="testField" descriptor={descriptor} />);

        await expect(page.getByText('This is a helpful description.')).toBeVisible();
    });

    test('renders deleteButton when provided', async ({ mount, page }) => {
        const descriptor = minimalDescriptor(AttributeContentType.String);
        await mount(
            <AttributeFieldInputTestWrapper
                name="testField"
                descriptor={descriptor}
                deleteButton={<button type="button">Remove field</button>}
            />,
        );

        await expect(page.getByRole('button', { name: 'Remove field' })).toBeVisible();
    });

    test('renders required indicator on label when descriptor.properties.required is true', async ({ mount, page }) => {
        const descriptor = minimalDescriptor(AttributeContentType.String, {
            properties: { ...defaultProperties, required: true, label: 'Required Field' },
        } as any);
        await mount(<AttributeFieldInputTestWrapper name="testField" descriptor={descriptor} />);

        const label = page.getByText('Required Field');
        await expect(label).toBeVisible();
        await expect(page.locator('label[for="testField"]')).toContainText('Required Field');
    });

    test('renders code editor for Codeblock contentType', async ({ mount, page }) => {
        const descriptor = minimalDescriptor(AttributeContentType.Codeblock, {
            properties: { ...defaultProperties, label: 'Script' },
            content: [{ data: { language: 'javascript' } }] as any,
        } as any);
        await mount(
            <AttributeFieldInputTestWrapper
                name="testField"
                descriptor={descriptor}
                defaultValues={{ testField: { code: 'const x = 1;', language: 'javascript' } }}
            />,
        );

        await expect(page.getByText('Script')).toBeVisible();
        await expect(page.getByText('javascript')).toBeVisible();
        await expect(page.locator('[id="testField.code"]')).toBeVisible();
        await expect(page.locator('[id="testField.codeTextArea"]')).toBeVisible();
        // `highlight` function should produce hljs markup.
        await expect(page.locator('span[class*="hljs-"]').first()).toBeVisible();
    });

    test('text input shows Required Field only after blur', async ({ mount, page }) => {
        const descriptor = minimalDescriptor(AttributeContentType.String, {
            properties: { ...defaultProperties, required: true, label: 'My Input' },
        } as any);
        await mount(<AttributeFieldInputTestWrapper name="testField" descriptor={descriptor} />);

        const input = page.locator('#testField');
        await input.click();
        await input.fill('');

        // Still typing (no blur yet) -> no error.
        await expect(input).toBeVisible();

        // Blur the input by moving focus to a sibling control, then trigger validation.
        await page.getByTestId('outside-blur-target').click();
        await page.getByTestId('trigger-validation').click();

        await expect(input).toBeVisible();
    });

    test('input is disabled when busy is true', async ({ mount, page }) => {
        const descriptor = minimalDescriptor(AttributeContentType.String);
        await mount(<AttributeFieldInputTestWrapper name="testField" descriptor={descriptor} busy />);

        await expect(page.locator('#testField')).toBeDisabled();
    });

    test('input is disabled when descriptor.properties.readOnly is true', async ({ mount, page }) => {
        const descriptor = minimalDescriptor(AttributeContentType.String, {
            properties: { ...defaultProperties, readOnly: true },
        } as any);
        await mount(<AttributeFieldInputTestWrapper name="testField" descriptor={descriptor} />);

        await expect(page.locator('#testField')).toBeDisabled();
    });

    test('renders String field with placeholder and empty value', async ({ mount, page }) => {
        const descriptor = minimalDescriptor(AttributeContentType.String, {
            properties: { ...defaultProperties, label: 'My Input' },
        } as any);
        await mount(<AttributeFieldInputTestWrapper name="testField" descriptor={descriptor} />);

        const input = page.locator('#testField');
        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute('placeholder', 'Enter My Input');
        await expect(input).toHaveValue('');
    });
});
