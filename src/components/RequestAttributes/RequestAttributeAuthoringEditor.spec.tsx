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
