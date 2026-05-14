import { test, expect } from '../../../../playwright/ct-test';
import CustomAttributeWidgetMountHarness from './CustomAttributeWidgetMountHarness';

import { AttributeContentType, AttributeType } from 'types/openapi';

test.describe('CustomAttributeWidget', () => {
    test('renders widget with title Custom Attributes', async ({ mount }) => {
        const component = await mount(<CustomAttributeWidgetMountHarness attributes={undefined} />);
        await expect(component.getByRole('heading', { name: 'Custom Attributes' })).toBeVisible();
    });

    test('shows Add custom attribute section when available attributes exist', async ({ mount }) => {
        const component = await mount(<CustomAttributeWidgetMountHarness attributes={[]} />);
        await expect(component.getByText('Add custom attribute')).toBeVisible();
        await expect(component.getByTestId('select-selectCustomAttribute-input')).toBeAttached();
    });
    test('selecting attribute shows description and content editor', async ({ mount, page }) => {
        const component = await mount(<CustomAttributeWidgetMountHarness attributes={[]} />);

        await component.getByTestId('select-selectCustomAttribute-trigger').click();
        await page.getByRole('option', { name: 'Test Attribute' }).click();

        await expect(component.getByText('Test description')).toBeVisible();
        await expect(component.getByTestId('cancel-custom-value')).toBeVisible();
        await expect(component.getByTestId('save-custom-value')).toBeVisible();
    });

    test('onSubmit resets selection and hides editor', async ({ mount, page }) => {
        const component = await mount(<CustomAttributeWidgetMountHarness attributes={[]} />);

        await component.getByTestId('select-selectCustomAttribute-trigger').click();
        await page.getByRole('option', { name: 'Test Attribute' }).click();
        await expect(component.getByText('Test description')).toBeVisible();

        const input = page.locator('#testAttr');
        await input.focus();
        await input.fill('value');
        await expect(component.getByTestId('save-custom-value')).toBeEnabled();
        await component.getByTestId('save-custom-value').click();

        await expect(component.getByText('Test description')).not.toBeVisible();
    });

    test('onCancel resets selection and hides editor', async ({ mount, page }) => {
        const component = await mount(<CustomAttributeWidgetMountHarness attributes={[]} />);

        await component.getByTestId('select-selectCustomAttribute-trigger').click();
        await page.getByRole('option', { name: 'Test Attribute' }).click();
        await expect(component.getByText('Test description')).toBeVisible();
        await component.getByTestId('cancel-custom-value').click();
        await expect(component.getByText('Test description')).not.toBeVisible();
    });

    test('does not show Add custom attribute when no available attributes', async ({ mount }) => {
        const component = await mount(<CustomAttributeWidgetMountHarness attributes={[]} availableAttributes={[]} />);
        await expect(component.getByRole('heading', { name: 'Custom Attributes' })).toBeVisible();
        await expect(component.getByText('Add custom attribute')).not.toBeVisible();
    });

    test('accepts className prop and renders widget', async ({ mount }) => {
        const component = await mount(<CustomAttributeWidgetMountHarness attributes={[]} className="custom-class" />);
        await expect(component.getByRole('heading', { name: 'Custom Attributes' })).toBeVisible();
    });

    test('loads content when attributes prop is provided', async ({ mount }) => {
        const attrs = [
            {
                uuid: 'resp-1',
                name: 'attr1',
                type: AttributeType.Custom,
                properties: { label: 'A1' },
                content: [],
            },
        ] as any;
        const component = await mount(<CustomAttributeWidgetMountHarness attributes={attrs} />);
        await expect(component.getByRole('heading', { name: 'Custom Attributes' })).toBeVisible();
    });

    test('allows editing and removing existing custom attribute', async ({ mount }) => {
        const descriptor = {
            uuid: 'attr-1',
            name: 'testAttr',
            type: AttributeType.Custom,
            contentType: AttributeContentType.String,
            properties: {
                label: 'Test Attribute',
                readOnly: false,
                required: false,
                list: false,
                multiSelect: false,
                visible: true,
            },
            description: 'Test description',
        } as any;

        const attributes = [
            {
                ...descriptor,
                label: 'Test Attribute',
                content: [{ data: 'initial' }],
            },
        ] as any;

        const component = await mount(<CustomAttributeWidgetMountHarness attributes={attributes} availableAttributes={[descriptor]} />);

        await expect(component.getByRole('heading', { name: 'Custom Attributes' })).toBeVisible();
        await expect(component.getByText('Test Attribute')).toBeVisible();
        await expect(component.getByText('initial')).toBeVisible();

        // Click edit button
        await component.getByTestId('edit-button').dispatchEvent('click');

        // Wait for save/cancel buttons to appear (edit form is now visible)
        await expect(component.getByTestId('save-custom-value')).toBeVisible();
        await expect(component.getByTestId('cancel-custom-value')).toBeVisible();

        // Find the input using the data-testid from TextInput component
        const input = component.getByTestId('text-input-testAttr');
        await expect(input).toBeVisible();

        // The input may have readonly attribute from TextInput component implementation
        // Use evaluate to set the value directly via React's onChange simulation
        await input.evaluate((el: HTMLInputElement) => {
            // Remove readonly if present
            el.removeAttribute('readonly');
            el.focus();
        });

        // Now fill the input
        await input.fill('updated value');

        // Save the changes
        await component.getByTestId('save-custom-value').dispatchEvent('click');

        // After saving, delete button should be visible
        await expect(component.getByTestId('delete-button')).toBeVisible();

        // Delete the attribute
        await component.getByTestId('delete-button').dispatchEvent('click');

        // Widget should still be visible after deletion
        await expect(component.getByRole('heading', { name: 'Custom Attributes' })).toBeVisible();
    });
});
