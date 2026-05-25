import { test, expect } from '../../../../../playwright/ct-test';
import { AttributeFieldSelectTestWrapper } from './AttributeFieldSelectTestWrapper';
import type { DataAttributeModel } from 'types/attributes';
import { AttributeContentType, AttributeType } from 'types/openapi';

const defaultProperties = {
    label: 'Test Select',
    required: false,
    readOnly: false,
    visible: true,
    list: false,
    multiSelect: false,
    extensibleList: false,
};

function minimalDescriptor(overrides: Partial<DataAttributeModel> = {}): DataAttributeModel {
    return {
        type: AttributeType.Data,
        name: 'testSelect',
        contentType: AttributeContentType.String,
        properties: defaultProperties as any,
        ...overrides,
    } as DataAttributeModel;
}

test.describe('AttributeFieldSelect', () => {
    test('renders label and Select when visible', async ({ mount, page }) => {
        const descriptor = minimalDescriptor({
            properties: { ...defaultProperties, label: 'My Select Field' },
        } as any);
        await mount(<AttributeFieldSelectTestWrapper name="testSelect" descriptor={descriptor} />);

        await expect(page.getByText('My Select Field')).toBeVisible();
        await expect(page.getByTestId('select-testSelectSelect')).toBeVisible();
    });

    test('renders Select when options empty', async ({ mount, page }) => {
        const descriptor = minimalDescriptor({
            properties: { ...defaultProperties, label: 'Choose one' },
        } as any);
        await mount(<AttributeFieldSelectTestWrapper name="testSelect" descriptor={descriptor} />);

        const selectContainer = page.getByTestId('select-testSelectSelect');
        await expect(selectContainer).toBeVisible();
        await expect(page.getByTestId('label-testSelectSelect')).toHaveText('Choose one');
    });

    test('does not render label when descriptor.properties.visible is false', async ({ mount, page }) => {
        const descriptor = minimalDescriptor({
            properties: { ...defaultProperties, visible: false, label: 'Hidden Label' },
        } as any);
        await mount(<AttributeFieldSelectTestWrapper name="testSelect" descriptor={descriptor} />);

        await expect(page.getByText('Hidden Label')).toHaveCount(0);
        await expect(page.getByTestId('select-testSelectSelect')).toBeVisible();
    });

    test('renders description when descriptor.description is set and visible', async ({ mount, page }) => {
        const descriptor = minimalDescriptor({
            description: 'Pick an option from the list.',
        } as any);
        await mount(<AttributeFieldSelectTestWrapper name="testSelect" descriptor={descriptor} />);

        await expect(page.getByText('Pick an option from the list.')).toBeVisible();
    });

    test('renders deleteButton when provided', async ({ mount, page }) => {
        const descriptor = minimalDescriptor();
        await mount(
            <AttributeFieldSelectTestWrapper
                name="testSelect"
                descriptor={descriptor}
                deleteButton={<button type="button">Remove select</button>}
            />,
        );

        await expect(page.getByRole('button', { name: 'Remove select' })).toBeVisible();
    });

    test('renders required indicator on label when descriptor.properties.required is true', async ({ mount, page }) => {
        const descriptor = minimalDescriptor({
            properties: { ...defaultProperties, required: true, label: 'Required Select' },
        } as any);
        await mount(<AttributeFieldSelectTestWrapper name="testSelect" descriptor={descriptor} />);

        await expect(page.getByText('Required Select')).toBeVisible();
        await expect(page.locator('label[for="testSelectSelect"]')).toContainText('Required Select');
    });

    test('Select is disabled when busy is true', async ({ mount, page }) => {
        const descriptor = minimalDescriptor();
        await mount(<AttributeFieldSelectTestWrapper name="testSelect" descriptor={descriptor} busy />);

        const selectInput = page.getByTestId('select-testSelectSelect-input');
        await expect(selectInput).toHaveAttribute('disabled');
    });

    test('Select is disabled when descriptor.properties.readOnly is true', async ({ mount, page }) => {
        const descriptor = minimalDescriptor({
            properties: { ...defaultProperties, readOnly: true },
        } as any);
        await mount(<AttributeFieldSelectTestWrapper name="testSelect" descriptor={descriptor} />);

        const selectInput = page.getByTestId('select-testSelectSelect-input');
        await expect(selectInput).toHaveAttribute('disabled');
    });

    test('renders options when provided', async ({ mount, page }) => {
        const descriptor = minimalDescriptor({
            properties: { ...defaultProperties, label: 'Status' },
        } as any);
        const options = [
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
        ];
        await mount(<AttributeFieldSelectTestWrapper name="testSelect" descriptor={descriptor} options={options} />);

        await expect(page.getByTestId('label-testSelectSelect')).toHaveText('Status');
        await expect(page.getByTestId('select-testSelectSelect')).toBeVisible();
        await page.getByTestId('select-testSelectSelect-trigger').click();
        await expect(page.getByRole('option', { name: 'Active', exact: true })).toBeVisible();
        await expect(page.getByRole('option', { name: 'Inactive', exact: true })).toBeVisible();
    });

    test('renders single Select when multiSelect is false', async ({ mount, page }) => {
        const descriptor = minimalDescriptor({
            properties: { ...defaultProperties, multiSelect: false },
        } as any);
        await mount(<AttributeFieldSelectTestWrapper name="testSelect" descriptor={descriptor} />);

        await expect(page.getByTestId('select-testSelectSelect')).toBeVisible();
        await expect(page.getByTestId('select-testSelectSelect-input')).toBeAttached();
    });

    test('renders multi Select when multiSelect is true', async ({ mount, page }) => {
        const descriptor = minimalDescriptor({
            properties: { ...defaultProperties, multiSelect: true },
        } as any);
        await mount(<AttributeFieldSelectTestWrapper name="testSelect" descriptor={descriptor} />);

        await expect(page.getByTestId('select-testSelectSelect')).toBeVisible();
        await expect(page.getByTestId('select-testSelectSelect-input')).toBeAttached();
    });

    test('includes add-new option when addNewAttributeValue is provided', async ({ mount, page }) => {
        const descriptor = minimalDescriptor({
            properties: { ...defaultProperties, label: 'Add item' },
        } as any);
        const options = [{ label: 'Option A', value: 'a' }];
        await mount(
            <AttributeFieldSelectTestWrapper
                name="testSelect"
                descriptor={descriptor}
                options={options}
                addNewAttributeValue={{ label: 'Add new', value: '__add_new__' }}
            />,
        );

        await expect(page.getByTestId('select-testSelectSelect')).toBeVisible();
        await page.getByTestId('select-testSelectSelect-trigger').click();
        await expect(page.getByRole('option', { name: 'Option A' })).toBeVisible();
        await expect(page.getByRole('option', { name: 'Add new' })).toBeVisible();
    });

    test('selecting __add_new__ when field is empty resets Select to placeholder', async ({ mount, page }) => {
        const descriptor = minimalDescriptor({
            properties: { ...defaultProperties, label: 'Credential' },
        } as any);
        const options = [{ label: 'Credential A', value: 'cred-a' }];

        await mount(
            <AttributeFieldSelectTestWrapper
                name="testSelect"
                descriptor={descriptor}
                options={options}
                addNewAttributeValue={{ label: '+ Add new', value: '__add_new__' }}
            />,
        );

        const select = page.getByTestId('select-testSelectSelect-input');

        await select.evaluate((el: HTMLSelectElement) => {
            el.value = '__add_new__';
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });

        await expect(select).toHaveValue('');
    });

    test('selecting __add_new__ when field has a value preserves the previous selection', async ({ mount, page }) => {
        const descriptor = minimalDescriptor({
            properties: { ...defaultProperties, label: 'Credential' },
        } as any);
        const options = [
            { label: 'Credential A', value: 'cred-a' },
            { label: 'Credential B', value: 'cred-b' },
        ];

        await mount(
            <AttributeFieldSelectTestWrapper
                name="testSelect"
                descriptor={descriptor}
                options={options}
                addNewAttributeValue={{ label: '+ Add new', value: '__add_new__' }}
                defaultValues={{ testSelect: 'cred-a' }}
            />,
        );

        const select = page.getByTestId('select-testSelectSelect-input');
        await expect(select).toHaveValue('cred-a');

        await select.evaluate((el: HTMLSelectElement) => {
            el.value = '__add_new__';
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });

        await expect(select).toHaveValue('cred-a');
    });

    test('onSelectChangeMulti: selecting __add_new__ with other items removes __add_new__ and keeps others', async ({ mount, page }) => {
        const descriptor = minimalDescriptor({
            properties: { ...defaultProperties, multiSelect: true, label: 'Multi Credential' },
        } as any);
        const options = [
            { label: 'Option A', value: 'a' },
            { label: 'Option B', value: 'b' },
        ];

        await mount(
            <AttributeFieldSelectTestWrapper
                name="testSelect"
                descriptor={descriptor}
                options={options}
                addNewAttributeValue={{ label: '+ Add new', value: '__add_new__' }}
            />,
        );

        await page.getByTestId('select-testSelectSelect-trigger').click();
        await page.getByRole('option', { name: 'Option A' }).click();
        await page.getByRole('option', { name: '+ Add new' }).click();

        // __add_new__ should be stripped; only 'a' remains
        const select = page.getByTestId('select-testSelectSelect-input');
        await expect(select).toHaveValues(['a']);
    });

    test('onSelectChangeMulti: selecting only __add_new__ does not add it to the field', async ({ mount, page }) => {
        const descriptor = minimalDescriptor({
            properties: { ...defaultProperties, multiSelect: true, label: 'Multi Credential' },
        } as any);
        const options = [{ label: 'Option A', value: 'a' }];

        await mount(
            <AttributeFieldSelectTestWrapper
                name="testSelect"
                descriptor={descriptor}
                options={options}
                addNewAttributeValue={{ label: '+ Add new', value: '__add_new__' }}
            />,
        );

        const clearBtn = page.getByTestId('select-testSelectSelect-clear');
        await expect(clearBtn).toHaveCount(0);

        const select = page.getByTestId('select-testSelectSelect-input');
        await select.evaluate((el: HTMLSelectElement) => {
            Array.from(el.options).forEach((opt) => {
                opt.selected = opt.value === '__add_new__';
            });
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });

        await expect(clearBtn).toHaveCount(0);
    });

    test('onSelectChangeMulti: selecting regular options updates the field', async ({ mount, page }) => {
        const descriptor = minimalDescriptor({
            properties: { ...defaultProperties, multiSelect: true, label: 'Multi Select' },
        } as any);
        const options = [
            { label: 'Option A', value: 'a' },
            { label: 'Option B', value: 'b' },
        ];

        await mount(<AttributeFieldSelectTestWrapper name="testSelect" descriptor={descriptor} options={options} />);

        await page.getByTestId('select-testSelectSelect-trigger').click();
        await page.getByRole('option', { name: 'Option A' }).click();
        await page.getByRole('option', { name: 'Option B' }).click();

        const select = page.getByTestId('select-testSelectSelect-input');
        await expect(select).toHaveValues(['a', 'b']);
        await expect(page.getByTestId('select-testSelectSelect-clear')).toBeAttached();
    });

    test('single-select renders a search box that filters options by label', async ({ mount, page }) => {
        const descriptor = minimalDescriptor({
            properties: { ...defaultProperties, multiSelect: false, label: 'CA Certificate' },
        } as any);
        const options = [
            { label: 'Acme Root CA', value: 'acme' },
            { label: 'Globex Intermediate CA', value: 'globex' },
            { label: 'Initech Signing CA', value: 'initech' },
        ];
        await mount(<AttributeFieldSelectTestWrapper name="testSelect" descriptor={descriptor} options={options} />);

        await page.getByTestId('select-testSelectSelect-trigger').click();
        await page.getByTestId('select-testSelectSelect-search').fill('globex');

        await expect(page.getByRole('option', { name: 'Globex Intermediate CA' })).toBeVisible();
        await expect(page.getByRole('option', { name: 'Acme Root CA' })).toHaveCount(0);
        await expect(page.getByRole('option', { name: 'Initech Signing CA' })).toHaveCount(0);
    });

    test('extensible list adds extra option for current value not in options', async ({ mount, page }) => {
        const descriptor = minimalDescriptor({
            properties: { ...defaultProperties, list: true, extensibleList: true, label: 'Extensible' },
        } as any);
        await mount(
            <AttributeFieldSelectTestWrapper
                name="testSelect"
                descriptor={descriptor}
                options={[{ label: 'Known', value: 'known' }]}
                defaultValues={{ testSelect: 'extra' }}
            />,
        );

        await page.getByTestId('select-testSelectSelect-trigger').click();
        await expect(page.getByRole('option', { name: 'Known' })).toBeVisible();
        await expect(page.getByRole('option', { name: 'extra' })).toBeVisible();
    });

    test('extensible list multi-select adds extra options for current values not in options', async ({ mount, page }) => {
        const descriptor = minimalDescriptor({
            properties: { ...defaultProperties, multiSelect: true, extensibleList: true, label: 'Extensible Multi' },
        } as any);

        await mount(
            <AttributeFieldSelectTestWrapper
                name="testSelect"
                descriptor={descriptor}
                options={[{ label: 'Known', value: 'known' }]}
                defaultValues={{ testSelect: ['custom1', 'custom2'] }}
            />,
        );

        const selectOptions = await page.getByTestId('select-testSelectSelect-input').evaluate((el: HTMLSelectElement) =>
            Array.from(el.options)
                .filter((o) => o.value !== '')
                .map((o) => o.value),
        );
        expect(selectOptions).toEqual(expect.arrayContaining(['known', 'custom1', 'custom2']));
    });
});
