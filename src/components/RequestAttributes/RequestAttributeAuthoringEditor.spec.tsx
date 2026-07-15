import { test, expect } from '../../../playwright/ct-test';
import { withProviders } from 'utils/test-helpers';
import RequestAttributeAuthoringEditorHarness from './RequestAttributeAuthoringEditorHarness';

test.describe('RequestAttributeAuthoringEditor', () => {
    test('shows empty states and the merge-mode selector when enabled', async ({ mount }) => {
        const component = await mount(withProviders(<RequestAttributeAuthoringEditorHarness showMergeMode />));

        await expect(component.getByTestId('request-attribute-authoring-attributes-empty')).toBeVisible();
        await expect(component.getByTestId('request-attribute-authoring-bindings-empty')).toBeVisible();
        await expect(component.getByTestId('request-attribute-authoring-merge-mode')).toBeVisible();
    });

    test('hides the merge-mode selector for the platform default set', async ({ mount }) => {
        const component = await mount(withProviders(<RequestAttributeAuthoringEditorHarness />));
        await expect(component.getByTestId('request-attribute-authoring-merge-mode')).toHaveCount(0);
    });

    test('selecting a merge mode updates the value', async ({ mount }) => {
        const component = await mount(withProviders(<RequestAttributeAuthoringEditorHarness showMergeMode />));

        await component.getByTestId('request-attribute-authoring-merge-staticOnly').click();

        const json = await component.getByTestId('value-json').textContent();
        expect(JSON.parse(json ?? '{}').mergeMode).toBe('staticOnly');
    });

    test('explains each merge mode inline under its option', async ({ mount }) => {
        const component = await mount(withProviders(<RequestAttributeAuthoringEditorHarness showMergeMode />));

        await expect(component.getByTestId('request-attribute-authoring-merge-staticOnly-description')).toBeVisible();
        await expect(component.getByTestId('request-attribute-authoring-merge-connectorOnly-description')).toContainText('connector');
        await expect(component.getByTestId('request-attribute-authoring-merge-merge-description')).toContainText('combined');
    });

    test('adds an authored attribute through the dialog', async ({ mount, page }) => {
        const component = await mount(withProviders(<RequestAttributeAuthoringEditorHarness showMergeMode />));

        await component.getByTestId('request-attribute-authoring-attribute-add').click();
        // TextInput is readonly until focused (anti-autofill), so click before fill.
        await page.locator('#ra-attr-name').click();
        await page.locator('#ra-attr-name').fill('serverFqdn');
        await page.locator('#ra-attr-label').click();
        await page.locator('#ra-attr-label').fill('Server FQDN');
        await page.getByRole('button', { name: 'Save' }).click();

        await expect(component.getByTestId('request-attribute-authoring-attribute-row')).toHaveCount(1);
        const json = await component.getByTestId('value-json').textContent();
        const parsed = JSON.parse(json ?? '{}');
        expect(parsed.attributes).toHaveLength(1);
        expect(parsed.attributes[0].name).toBe('serverFqdn');
        expect(parsed.attributes[0].label).toBe('Server FQDN');
    });

    test('the attribute dialog gives first-time guidance and per-field hints', async ({ mount, page }) => {
        const component = await mount(withProviders(<RequestAttributeAuthoringEditorHarness showMergeMode />));

        await component.getByTestId('request-attribute-authoring-attribute-add').click();

        await expect(page.getByTestId('request-attribute-authoring-attribute-form-intro')).toBeVisible();
        await expect(page.getByTestId('request-attribute-authoring-attribute-name-hint')).toBeVisible();
        await expect(page.getByTestId('request-attribute-authoring-attribute-label-hint')).toBeVisible();
        await expect(page.getByTestId('request-attribute-authoring-attribute-mapping-hint')).toContainText('certificate');
    });

    test('mapping target explains the chosen target', async ({ mount, page }) => {
        const component = await mount(withProviders(<RequestAttributeAuthoringEditorHarness showMergeMode />));

        await component.getByTestId('request-attribute-authoring-attribute-add').click();
        await page.getByTestId('select-ra-attr-mapping-trigger').click();
        await page.getByRole('option', { name: 'RDN (subject)' }).click();

        await expect(page.getByTestId('select-ra-attr-mapping-selected-description')).toBeVisible();
    });

    test('authoring a granular RDN mapping requires the RDN code', async ({ mount, page }) => {
        const component = await mount(withProviders(<RequestAttributeAuthoringEditorHarness showMergeMode />));

        await component.getByTestId('request-attribute-authoring-attribute-add').click();
        await page.locator('#ra-attr-name').click();
        await page.locator('#ra-attr-name').fill('subjectCn');
        await page.locator('#ra-attr-label').click();
        await page.locator('#ra-attr-label').fill('Common Name');

        // Pick RDN as the mapping target.
        await page.getByTestId('select-ra-attr-mapping-trigger').click();
        await page.getByRole('option', { name: 'RDN (subject)' }).click();

        // A mapped RDN with no code is invalid → Save disabled.
        const saveButton = page.getByRole('button', { name: 'Save' });
        await expect(saveButton).toBeDisabled();

        await page.locator('#ra-attr-rdn').click();
        await page.locator('#ra-attr-rdn').fill('CN');
        await expect(saveButton).toBeEnabled();
        await saveButton.click();

        await expect(component.getByTestId('request-attribute-authoring-attribute-row')).toContainText('→ RDN CN');
        const parsed = JSON.parse((await component.getByTestId('value-json').textContent()) ?? '{}');
        expect(parsed.attributes[0].mappingFieldType).toBe('rdn');
        expect(parsed.attributes[0].mappingRdnCode).toBe('CN');
    });

    test('static list source requires at least one value, then persists the values', async ({ mount, page }) => {
        const component = await mount(withProviders(<RequestAttributeAuthoringEditorHarness showMergeMode />));

        await component.getByTestId('request-attribute-authoring-attribute-add').click();
        await page.locator('#ra-attr-name').click();
        await page.locator('#ra-attr-name').fill('environment');
        await page.locator('#ra-attr-label').click();
        await page.locator('#ra-attr-label').fill('Environment');

        await page.getByTestId('select-ra-attr-value-source-trigger').click();
        await page.getByRole('option', { name: 'Static list' }).click();

        const saveButton = page.getByRole('button', { name: 'Save', exact: true });
        await expect(saveButton).toBeDisabled();

        await page.getByTestId('request-attribute-authoring-static-value-add').click();
        await page.locator('#ra-attr-static-value-0').click();
        await page.locator('#ra-attr-static-value-0').fill('prod');
        await page.getByTestId('request-attribute-authoring-static-value-add').click();
        await page.locator('#ra-attr-static-value-1').click();
        await page.locator('#ra-attr-static-value-1').fill('staging');

        await expect(saveButton).toBeEnabled();
        await saveButton.click();

        await expect(component.getByTestId('request-attribute-authoring-attribute-row')).toContainText('Static list');
        const attr = JSON.parse((await component.getByTestId('value-json').textContent()) ?? '{}').attributes[0];
        expect(attr.valueSourceType).toBe('staticList');
        expect(attr.staticValues).toEqual(['prod', 'staging']);
    });

    test('static list rejects duplicate values', async ({ mount, page }) => {
        const component = await mount(withProviders(<RequestAttributeAuthoringEditorHarness showMergeMode />));

        await component.getByTestId('request-attribute-authoring-attribute-add').click();
        await page.locator('#ra-attr-name').click();
        await page.locator('#ra-attr-name').fill('environment');
        await page.locator('#ra-attr-label').click();
        await page.locator('#ra-attr-label').fill('Environment');

        await page.getByTestId('select-ra-attr-value-source-trigger').click();
        await page.getByRole('option', { name: 'Static list' }).click();

        await page.getByTestId('request-attribute-authoring-static-value-add').click();
        await page.locator('#ra-attr-static-value-0').click();
        await page.locator('#ra-attr-static-value-0').fill('prod');
        await page.getByTestId('request-attribute-authoring-static-value-add').click();
        await page.locator('#ra-attr-static-value-1').click();
        await page.locator('#ra-attr-static-value-1').fill('prod');

        await expect(page.getByTestId('request-attribute-authoring-static-values-duplicate')).toBeVisible();
        const saveButton = page.getByRole('button', { name: 'Save', exact: true });
        await expect(saveButton).toBeDisabled();

        await page.locator('#ra-attr-static-value-1').fill('staging');
        await expect(page.getByTestId('request-attribute-authoring-static-values-duplicate')).toHaveCount(0);
        await expect(saveButton).toBeEnabled();
    });

    test('selecting a static list locks the List toggle on', async ({ mount, page }) => {
        const component = await mount(withProviders(<RequestAttributeAuthoringEditorHarness showMergeMode />));

        await component.getByTestId('request-attribute-authoring-attribute-add').click();
        await page.locator('#ra-attr-name').click();
        await page.locator('#ra-attr-name').fill('environment');
        await page.locator('#ra-attr-label').click();
        await page.locator('#ra-attr-label').fill('Environment');

        await expect(page.locator('#ra-attr-list')).not.toBeChecked();
        await expect(page.locator('#ra-attr-list')).toBeEnabled();

        await page.getByTestId('select-ra-attr-value-source-trigger').click();
        await page.getByRole('option', { name: 'Static list' }).click();

        await expect(page.locator('#ra-attr-list')).toBeChecked();
        await expect(page.locator('#ra-attr-list')).toBeDisabled();

        await page.getByTestId('request-attribute-authoring-static-value-add').click();
        await page.locator('#ra-attr-static-value-0').click();
        await page.locator('#ra-attr-static-value-0').fill('prod');
        await page.getByRole('button', { name: 'Save', exact: true }).click();

        const attr = JSON.parse((await component.getByTestId('value-json').textContent()) ?? '{}').attributes[0];
        expect(attr.list).toBe(true);
        expect(attr.valueSourceType).toBe('staticList');
    });

    test('does not offer a static list for a content type without a scalar editor', async ({ mount, page }) => {
        const component = await mount(withProviders(<RequestAttributeAuthoringEditorHarness showMergeMode />));

        await component.getByTestId('request-attribute-authoring-attribute-add').click();

        await page.getByTestId('select-ra-attr-content-type-trigger').click();
        await page.getByRole('option', { name: 'Secret' }).click();

        // The static-list option must be absent so the editor never dereferences a missing content
        // configuration and crashes.
        await page.getByTestId('select-ra-attr-value-source-trigger').click();
        await expect(page.getByRole('option', { name: 'Static list' })).toHaveCount(0);
        await expect(page.getByRole('option', { name: 'Free input' })).toBeVisible();
    });

    test('resets a chosen static list when switching to an unsupported content type', async ({ mount, page }) => {
        const component = await mount(withProviders(<RequestAttributeAuthoringEditorHarness showMergeMode />));

        await component.getByTestId('request-attribute-authoring-attribute-add').click();
        await page.locator('#ra-attr-name').click();
        await page.locator('#ra-attr-name').fill('environment');
        await page.locator('#ra-attr-label').click();
        await page.locator('#ra-attr-label').fill('Environment');

        await page.getByTestId('select-ra-attr-value-source-trigger').click();
        await page.getByRole('option', { name: 'Static list' }).click();
        await expect(page.getByTestId('request-attribute-authoring-static-values')).toBeVisible();

        // Switching to Secret (no scalar editor) drops back to free input, tearing down the value rows.
        await page.getByTestId('select-ra-attr-content-type-trigger').click();
        await page.getByRole('option', { name: 'Secret' }).click();
        await expect(page.getByTestId('request-attribute-authoring-static-values')).toHaveCount(0);
    });

    test('a binding requires a uuid or name before it can be saved', async ({ mount, page }) => {
        const component = await mount(withProviders(<RequestAttributeAuthoringEditorHarness showMergeMode />));

        await component.getByTestId('request-attribute-authoring-binding-add').click();
        await expect(page.getByTestId('request-attribute-authoring-binding-error')).toBeVisible();
        const saveButton = page.getByRole('button', { name: 'Save' });
        await expect(saveButton).toBeDisabled();

        await page.locator('#ra-binding-name').click();
        await page.locator('#ra-binding-name').fill('datacenter');
        await expect(saveButton).toBeEnabled();
        await saveButton.click();

        await expect(component.getByTestId('request-attribute-authoring-binding-row')).toHaveCount(1);
        const json = await component.getByTestId('value-json').textContent();
        expect(JSON.parse(json ?? '{}').valueSourceBindings[0].attributeName).toBe('datacenter');
    });

    test('hides the value-source bindings section when showBindings is false', async ({ mount }) => {
        const component = await mount(withProviders(<RequestAttributeAuthoringEditorHarness showBindings={false} />));
        await expect(component.getByTestId('request-attribute-authoring-bindings')).toHaveCount(0);
        await expect(component.getByTestId('request-attribute-authoring-attributes')).toBeVisible();
    });

    test('binding uses the internal attribute name (option description), not the display label', async ({ mount, page }) => {
        const component = await mount(
            withProviders(
                <RequestAttributeAuthoringEditorHarness
                    connectorAttributeOptions={[{ value: 'uuid-123', label: 'Datacenter (friendly)', description: 'datacenter' }]}
                />,
            ),
        );

        await component.getByTestId('request-attribute-authoring-binding-add').click();
        await page.getByTestId('select-ra-binding-connector-attr-trigger').click();
        await page.getByRole('option', { name: 'Datacenter (friendly)' }).click();
        await page.getByRole('button', { name: 'Save' }).click();

        const binding = JSON.parse((await component.getByTestId('value-json').textContent()) ?? '{}').valueSourceBindings[0];
        expect(binding.attributeUuid).toBe('uuid-123');
        expect(binding.attributeName).toBe('datacenter'); // internal name, not "Datacenter (friendly)"
    });

    test('blocks saving an attribute whose name duplicates an existing one', async ({ mount, page }) => {
        const initialValue = {
            mergeMode: 'merge' as const,
            attributes: [
                {
                    uuid: 'u1',
                    name: 'serverFqdn',
                    label: 'Server FQDN',
                    contentType: 'string' as const,
                    required: false,
                    readOnly: false,
                    list: false,
                    multiSelect: false,
                    staticValues: [],
                    valueSourceType: 'none' as const,
                },
            ],
            valueSourceBindings: [],
        };
        const component = await mount(withProviders(<RequestAttributeAuthoringEditorHarness initialValue={initialValue} />));

        await component.getByTestId('request-attribute-authoring-attribute-add').click();
        await page.locator('#ra-attr-name').click();
        await page.locator('#ra-attr-name').fill('serverFqdn');
        await page.locator('#ra-attr-label').click();
        await page.locator('#ra-attr-label').fill('Duplicate');

        await expect(page.getByTestId('request-attribute-authoring-attribute-name-duplicate')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
    });

    test('removes an authored attribute', async ({ mount }) => {
        const initialValue = {
            mergeMode: 'merge' as const,
            attributes: [
                {
                    uuid: 'u1',
                    name: 'serverFqdn',
                    label: 'Server FQDN',
                    contentType: 'string' as const,
                    required: true,
                    readOnly: false,
                    list: false,
                    multiSelect: false,
                    staticValues: [],
                    valueSourceType: 'none' as const,
                },
            ],
            valueSourceBindings: [],
        };
        const component = await mount(withProviders(<RequestAttributeAuthoringEditorHarness initialValue={initialValue} showMergeMode />));

        await expect(component.getByTestId('request-attribute-authoring-attribute-row')).toHaveCount(1);
        await component.getByTestId('request-attribute-authoring-attribute-remove').click();
        await expect(component.getByTestId('request-attribute-authoring-attributes-empty')).toBeVisible();
    });
});
