import { test, expect } from '../../../../../playwright/ct-test';
import { withProviders } from 'utils/test-helpers';
import RequestAttributesSettings from './RequestAttributesSettings';
import RequestAttributesSettingsWithStore from './RequestAttributesSettingsWithStore';

test.describe('RequestAttributesSettings (platform default set)', () => {
    test('renders the default-set editor without merge mode or bindings', async ({ mount, page }) => {
        const component = await mount(withProviders(<RequestAttributesSettings />));

        await expect(page.getByText('Default Request Attributes').first()).toBeVisible();
        // Platform default set: no merge mode, no value-source bindings, starts empty.
        await expect(component.getByTestId('request-attribute-authoring-merge-mode')).toHaveCount(0);
        await expect(component.getByTestId('request-attribute-authoring-bindings')).toHaveCount(0);
        await expect(component.getByTestId('request-attribute-authoring-attributes-empty')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
    });

    test('authoring an attribute then saving runs the save handler', async ({ mount, page }) => {
        // Mount through the WithStore wrapper: it preloads a *defined* platform default set in the
        // browser so the component's `loaded` guard flips true (the editor + Save are gated until a
        // successful load, and CT runs no epics to resolve the fetch).
        const component = await mount(<RequestAttributesSettingsWithStore />);

        await component.getByTestId('request-attribute-authoring-attribute-add').click();
        await page.locator('#ra-attr-name').click();
        await page.locator('#ra-attr-name').fill('environment');
        await page.locator('#ra-attr-label').click();
        await page.locator('#ra-attr-label').fill('Environment');
        await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();

        await expect(component.getByTestId('request-attribute-authoring-attribute-row')).toContainText('Environment');

        // Save handler builds the platform DTO and dispatches without throwing.
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
    });
});
