import { test, expect } from '../../../../../playwright/ct-test';
import { withProviders } from 'utils/test-helpers';
import RequestAttributesSettings from './RequestAttributesSettings';
import RequestAttributesSettingsWithStore from './RequestAttributesSettingsWithStore';

test.describe('RequestAttributesSettings (platform default set)', () => {
    test('renders the default-set editor without merge mode, bindings, or a form-level Save', async ({ mount, page }) => {
        const component = await mount(withProviders(<RequestAttributesSettings />));

        await expect(page.getByText('Default Request Attributes').first()).toBeVisible();
        // Platform default set: no merge mode, no value-source bindings, starts empty.
        await expect(component.getByTestId('request-attribute-authoring-merge-mode')).toHaveCount(0);
        await expect(component.getByTestId('request-attribute-authoring-bindings')).toHaveCount(0);
        await expect(component.getByTestId('request-attribute-authoring-attributes-empty')).toBeVisible();
        // Changes auto-save through the attribute dialog — there is no separate form-level Save button.
        await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);
    });

    test('saving an attribute in the dialog persists immediately without a second save', async ({ mount, page }) => {
        // Mount through the WithStore wrapper: it preloads a *defined* platform default set in the
        // browser so the component's `loaded` guard flips true (the editor is gated until a successful
        // load, and CT runs no epics to resolve the fetch).
        const component = await mount(<RequestAttributesSettingsWithStore />);

        await component.getByTestId('request-attribute-authoring-attribute-add').click();
        await page.locator('#ra-attr-name').click();
        await page.locator('#ra-attr-name').fill('environment');
        await page.locator('#ra-attr-label').click();
        await page.locator('#ra-attr-label').fill('Environment');
        await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();

        // The attribute is added to the list...
        await expect(component.getByTestId('request-attribute-authoring-attribute-row')).toContainText('Environment');
        // ...and that single dialog Save dispatched the platform-default update: the pending flag flips
        // true (CT runs no epics to resolve it), which disables the editor. No second Save exists.
        await expect(component.getByTestId('request-attribute-authoring-attribute-add')).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);
    });

    test('reflects the preloaded strict validation flag', async ({ mount, page }) => {
        const component = await mount(<RequestAttributesSettingsWithStore strict />);

        await expect(page.getByTestId('request-validation-strict')).toBeVisible();
        await expect(component.locator('input[type="radio"]').first()).toBeChecked();
        await expect(component.locator('input[type="radio"]').nth(1)).not.toBeChecked();
    });

    test('lenient is selected when the platform default is unset', async ({ mount, page }) => {
        const component = await mount(<RequestAttributesSettingsWithStore />);

        await expect(page.getByTestId('request-validation-lenient')).toBeVisible();
        await expect(component.locator('input[type="radio"]').first()).not.toBeChecked();
        await expect(component.locator('input[type="radio"]').nth(1)).toBeChecked();
    });
});
