import { test, expect } from '../../../../playwright/ct-test';
import { AttributeEditorTestWrapper } from './AttributeEditorTestWrapper';
import { CALLBACK_DEBOUNCE_MS } from './index';
import type { DataAttributeModel, CustomAttributeModel, InfoAttributeModel, AttributeDescriptorModel } from 'types/attributes';
import { AttributeContentType, AttributeType } from 'types/openapi';

const editorId = 'testEditor';

function dataDescriptor(overrides: Partial<DataAttributeModel> = {}): DataAttributeModel {
    return {
        type: AttributeType.Data,
        name: 'dataField',
        uuid: 'data-uuid-1',
        contentType: AttributeContentType.String,
        properties: { label: 'Data Field', required: true, readOnly: false, visible: true, list: false, multiSelect: false },
        ...overrides,
    } as DataAttributeModel;
}

function customDescriptor(overrides: Partial<CustomAttributeModel> = {}): CustomAttributeModel {
    return {
        type: AttributeType.Custom,
        name: 'customField',
        uuid: 'custom-uuid-1',
        contentType: AttributeContentType.String,
        properties: { label: 'Custom Field', required: false, readOnly: false, visible: true, list: false, multiSelect: false },
        ...overrides,
    } as CustomAttributeModel;
}

function infoDescriptor(overrides: Partial<InfoAttributeModel> = {}): InfoAttributeModel {
    return {
        type: AttributeType.Info,
        name: 'infoField',
        uuid: 'info-uuid-1',
        contentType: AttributeContentType.String,
        content: [{ data: 'Info text' }] as any,
        properties: { label: 'Info Label' },
        ...overrides,
    } as InfoAttributeModel;
}

test.describe('AttributeEditor', () => {
    test('renders nothing when attributeDescriptors is empty', async ({ mount, page }) => {
        const root = await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={[]} />);
        await expect(root.getByText('My Data')).toHaveCount(0);
    });

    test('renders one Data attribute in a Widget', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            dataDescriptor({ properties: { ...dataDescriptor().properties, label: 'My Data' } as any }),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} />);
        await expect(page.getByTestId('text-input-__attributes__testEditor__.dataField')).toBeVisible({ timeout: 15000 });
    });

    test('renders Info and Data attributes together in a Widget', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            infoDescriptor({ properties: { label: 'Info Title' } as any }),
            dataDescriptor({ properties: { ...dataDescriptor().properties, label: 'My Data' } as any }),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} />);
        await expect(page.getByText('Info Title')).toBeVisible();
        await expect(page.getByTestId('text-input-__attributes__testEditor__.dataField')).toBeVisible({ timeout: 5000 });
    });

    test('renders attribute with group title when descriptor has properties.group', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            dataDescriptor({
                name: 'groupedField',
                uuid: 'group-uuid',
                properties: { label: 'Grouped', required: false, group: 'My Group' } as any,
            }),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} />);
        await expect(page.getByText('My Group')).toBeVisible({ timeout: 10000 });
        await expect(page.getByPlaceholder('Enter Grouped')).toBeVisible();
    });

    test('renders Info attribute', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [infoDescriptor({ properties: { label: 'Info Title' } as any })];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} />);
        await expect(page.getByText('Info Title')).toBeVisible();
        await expect(page.getByText('Info text')).toBeVisible();
    });

    test('shows CustomAttributeAddSelect when there are non-required custom descriptors', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            customDescriptor({ name: 'optCustom', uuid: 'custom-opt', properties: { label: 'Optional Custom', required: false } as any }),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} />);
        await expect(page.getByText('Show custom attribute')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('select-selectAddCustomAttribute-trigger')).toContainText('Show...');
    });

    test('renders only add selector when all descriptors are initially hidden custom', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            customDescriptor({ name: 'onlyCustom', uuid: 'only-custom', properties: { label: 'Only Custom', required: false } as any }),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} />);
        await expect(page.getByText('Show custom attribute')).toBeVisible({ timeout: 10000 });
    });

    test('withRemoveAction false does not show delete button for custom attribute', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            customDescriptor({
                name: 'customNoDelete',
                uuid: 'custom-no-del',
                properties: { label: 'No Delete', required: false } as any,
            }),
        ];
        const attributes = [{ name: 'customNoDelete', uuid: 'custom-no-del', content: [{ data: 'x' }] }] as any[];
        await mount(
            <AttributeEditorTestWrapper
                id={editorId}
                attributeDescriptors={descriptors}
                attributes={attributes}
                withRemoveAction={false}
            />,
        );
        await expect(page.getByTestId('text-input-__attributes__testEditor__.customNoDelete')).toBeVisible({ timeout: 15000 });
        await expect(page.getByTitle('Delete customNoDelete')).toHaveCount(0);
    });

    test('delete button visible for non-required custom attribute when withRemoveAction true', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            customDescriptor({
                name: 'customWithDel',
                uuid: 'custom-with-del',
                properties: { label: 'With Delete', required: false } as any,
            }),
        ];
        const attributes = [{ name: 'customWithDel', uuid: 'custom-with-del', content: [{ data: 'y' }] }] as any[];
        await mount(
            <AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} attributes={attributes} withRemoveAction={true} />,
        );
        await expect(page.getByTestId('text-input-__attributes__testEditor__.customWithDel')).toBeVisible({ timeout: 15000 });
        const rowWithDel = page.locator('section').filter({ has: page.getByTestId('text-input-__attributes__testEditor__.customWithDel') });
        await expect(rowWithDel.getByRole('button')).toBeVisible();
    });

    test('handleDeleteAttribute removes attribute from view', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            customDescriptor({
                name: 'toDelete',
                uuid: 'to-delete-uuid',
                properties: { label: 'To Delete', required: false } as any,
            }),
        ];
        const attributes = [{ name: 'toDelete', uuid: 'to-delete-uuid', content: [{ data: 'z' }] }] as any[];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} attributes={attributes} />);
        await expect(page.getByTestId('text-input-__attributes__testEditor__.toDelete')).toBeVisible({ timeout: 15000 });
        const rowToDelete = page.locator('section').filter({ has: page.getByTestId('text-input-__attributes__testEditor__.toDelete') });
        await rowToDelete.getByRole('button').click();
        await expect(page.getByTestId('text-input-__attributes__testEditor__.toDelete')).toHaveCount(0);
    });

    test.skip('add custom attribute via CustomAttributeAddSelect', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            customDescriptor({
                name: 'addable',
                uuid: 'addable-uuid',
                properties: { label: 'Addable Custom', required: false } as any,
            }),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} />);
        await expect(page.getByText('Show custom attribute')).toBeVisible({ timeout: 10000 });
        await page.getByTestId('select-selectAddCustomAttribute-input').selectOption('addable-uuid', { force: true });
        await expect(page.getByTestId('text-input-__attributes__testEditor__.addable')).toBeVisible({ timeout: 5000 });
    });

    test('renders Data descriptor with list and static options from descriptor.content', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            dataDescriptor({
                name: 'listField',
                uuid: 'list-uuid',
                contentType: AttributeContentType.String,
                properties: { label: 'List Field', required: false, list: true, multiSelect: false } as any,
                content: [
                    { reference: 'opt1', data: 'Option 1' },
                    { reference: 'opt2', data: 'Option 2' },
                ] as any,
            }),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} />);
        await expect(page.getByText('List Field')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('select-__attributes__testEditor__.listFieldSelect')).toBeAttached({ timeout: 5000 });
    });

    test('uses attributes to set initial form values', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            dataDescriptor({
                name: 'prefilled',
                uuid: 'prefilled-uuid',
                properties: { label: 'Prefilled' } as any,
            }),
        ];
        const attributes = [{ name: 'prefilled', uuid: 'prefilled-uuid', content: [{ data: 'initial' }] }] as any[];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} attributes={attributes} />);
        const input = page.getByPlaceholder('Enter Prefilled');
        await expect(input).toBeVisible({ timeout: 10000 });
        await expect(input).toHaveValue('initial');
    });

    test('renders Data Boolean attribute', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            dataDescriptor({
                name: 'flag',
                uuid: 'bool-uuid',
                contentType: AttributeContentType.Boolean,
                properties: { label: 'My Flag', required: false } as any,
            }),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} />);
        await expect(page.getByText('My Flag')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('button[role="switch"]').or(page.getByRole('checkbox'))).toBeAttached({ timeout: 5000 });
    });

    test('accepts groupAttributesCallbackAttributes and setGroupAttributesCallbackAttributes', async ({ mount, page }) => {
        const groupDescriptor = dataDescriptor({
            name: 'fromCallback',
            uuid: 'callback-uuid',
            properties: { label: 'From Callback', required: false, group: 'Callback Group' } as any,
        });
        await mount(
            <AttributeEditorTestWrapper
                id={editorId}
                attributeDescriptors={[]}
                groupAttributesCallbackAttributes={[groupDescriptor]}
                setGroupAttributesCallbackAttributes={() => {}}
            />,
        );
        await expect(page.getByText('Callback Group')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('text-input-__attributes__testEditor__.fromCallback')).toBeVisible({ timeout: 5000 });
    });

    test('renders Data list multiSelect with options from descriptor', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            dataDescriptor({
                name: 'multiField',
                uuid: 'multi-uuid',
                contentType: AttributeContentType.String,
                properties: { label: 'Multi', required: false, list: true, multiSelect: true } as any,
                content: [
                    { reference: 'a', data: 'A' },
                    { reference: 'b', data: 'B' },
                ] as any,
            }),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} />);
        const select = page.getByTestId('select-__attributes__testEditor__.multiFieldSelect');
        await expect(select).toBeAttached({ timeout: 15000 });
    });

    test('uses descriptor default when no attribute value', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            dataDescriptor({
                name: 'withDefault',
                uuid: 'default-uuid',
                properties: { label: 'With Default', required: true, list: false, multiSelect: false } as any,
                content: [{ data: 'defaultValue' }] as any,
            }),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} />);
        await expect(page.getByTestId('select-__attributes__testEditor__.withDefaultSelect-input')).toHaveCount(0);
        const input = page.getByTestId('text-input-__attributes__testEditor__.withDefault');
        await expect(input).toBeVisible({ timeout: 10000 });
        await expect(input).toHaveAttribute('type', 'text');
        await expect(input).toHaveValue('defaultValue');
    });

    test('read-only attribute with a default value is pre-filled and locked', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            dataDescriptor({
                name: 'readOnlyDefault',
                uuid: 'readonly-default-uuid',
                properties: { label: 'Read Only Default', required: false, readOnly: true, list: false, multiSelect: false } as any,
                content: [{ data: 'lockedValue' }] as any,
            }),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} />);
        const input = page.getByTestId('text-input-__attributes__testEditor__.readOnlyDefault');
        await expect(input).toBeVisible({ timeout: 10000 });
        await expect(input).toHaveValue('lockedValue');
        await expect(input).toBeDisabled();
    });

    test('Boolean required with no value shows false', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            dataDescriptor({
                name: 'requiredFlag',
                uuid: 'req-bool-uuid',
                contentType: AttributeContentType.Boolean,
                properties: { label: 'Required Flag', required: true } as any,
            }),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} />);
        await expect(page.getByText('Required Flag')).toBeVisible({ timeout: 10000 });
        const switchOrCheck = page.locator('button[role="switch"]').or(page.getByRole('checkbox'));
        await expect(switchOrCheck).toBeAttached({ timeout: 5000 });
        await expect(switchOrCheck).not.toBeChecked();
    });
});

test.describe('AttributeEditor NG (dependsOn) callbacks', () => {
    // The mock store has no epics, so a dispatched callback leaves isRunningCallback=true and the
    // editor's busy spinner stays visible — its presence is the observable "callback fired" signal.
    const ngDropdown = (dependsOn: string[], overrides: Partial<DataAttributeModel> = {}): DataAttributeModel =>
        dataDescriptor({
            name: 'endpoint',
            uuid: 'ng-uuid-1',
            properties: { label: 'Endpoint', required: false, readOnly: false, visible: true, list: true, multiSelect: false } as any,
            attributeCallback: { mappings: [], dependsOn } as any,
            ...overrides,
        });

    test('dependsOn: [] fires once on mount', async ({ mount, page }) => {
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={[ngDropdown([])]} connectorUuid="conn-1" kind="k" />);
        await expect(page.getByTestId('spinner')).toBeVisible({ timeout: 10000 });
    });

    test('non-empty dependsOn does not fire while a dependency has no value', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            dataDescriptor({ name: 'region', uuid: 'dep-uuid-1', properties: { label: 'Region', required: false } as any }),
            ngDropdown(['region']),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} connectorUuid="conn-1" kind="k" />);
        await expect(page.getByText('Endpoint')).toBeVisible({ timeout: 10000 });
        // Negative check: no observable condition exists for "the debounce window elapsed with no
        // dispatch" — the wait must simply outlast the editor's callback debounce (shared constant).
        await page.waitForTimeout(CALLBACK_DEBOUNCE_MS * 2); // NOSONAR(S2925)
        await expect(page.getByTestId('spinner')).toHaveCount(0);
    });

    test('fires when the named dependency gains a value', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            dataDescriptor({
                name: 'region',
                uuid: 'dep-uuid-1',
                properties: { label: 'Region', required: false, readOnly: false, visible: true, list: true, multiSelect: false } as any,
                content: [{ data: 'eu-west' }, { data: 'us-east' }] as any,
            }),
            ngDropdown(['region']),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} connectorUuid="conn-1" kind="k" />);
        const regionSelect = page.getByTestId('select-__attributes__testEditor__.regionSelect-trigger');
        await expect(regionSelect).toBeVisible({ timeout: 10000 });
        await regionSelect.click();
        await page.getByRole('option', { name: 'eu-west' }).click();
        // past the ~600ms callback debounce the dependent's NG callback must dispatch
        await expect(page.getByTestId('spinner')).toBeVisible({ timeout: 10000 });
    });

    test('warns once when dependsOn names an attribute not mounted in the form', async ({ mount, page }) => {
        const warnings: string[] = [];
        page.on('console', (message) => {
            if (message.type() === 'warning') warnings.push(message.text());
        });
        await mount(
            <AttributeEditorTestWrapper
                id={editorId}
                attributeDescriptors={[ngDropdown(['data_caName'])]}
                connectorUuid="conn-1"
                kind="k"
            />,
        );
        await expect(page.getByText('Endpoint')).toBeVisible({ timeout: 10000 });
        await expect
            .poll(() => warnings.filter((text) => text.includes('"endpoint"') && text.includes('data_caName')).length, {
                timeout: 5000,
            })
            .toBeGreaterThanOrEqual(1);
        // and the dependent never fires
        await expect(page.getByTestId('spinner')).toHaveCount(0);
    });
});

test.describe('AttributeEditor legacy callback with missing mappings (#1882)', () => {
    const legacyCallbackNoMappings = (): DataAttributeModel =>
        dataDescriptor({
            name: 'endpoint',
            uuid: 'legacy-nomap-uuid',
            properties: { label: 'Endpoint', required: false, readOnly: false, visible: true, list: false, multiSelect: false } as any,
            attributeCallback: { callbackMethod: 'GET' } as any,
        });

    test('renders and fires the callback without throwing when mappings is undefined', async ({ mount, page }) => {
        const pageErrors: string[] = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));

        await mount(
            <AttributeEditorTestWrapper
                id={editorId}
                attributeDescriptors={[legacyCallbackNoMappings()]}
                connectorUuid="conn-1"
                kind="k"
            />,
        );

        await expect(page.getByTestId('spinner')).toBeVisible({ timeout: 10000 });
        expect(pageErrors.filter((message) => message.includes('forEach'))).toHaveLength(0);
    });
});
