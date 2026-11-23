import type { Page } from '@playwright/test';
import { test, expect } from '../../../../playwright/ct-test';
import { AttributeEditorTestWrapper } from './AttributeEditorTestWrapper';
import { CALLBACK_DEBOUNCE_MS } from './index';
import type {
    DataAttributeModel,
    CustomAttributeModel,
    InfoAttributeModel,
    AttributeDescriptorModel,
    GroupAttributeModel,
} from 'types/attributes';
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

    test('add custom attribute via CustomAttributeAddSelect', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            customDescriptor({
                name: 'addable',
                uuid: 'addable-uuid',
                properties: { label: 'Addable Custom', required: false } as any,
            }),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} />);
        await expect(page.getByText('Show custom attribute')).toBeVisible({ timeout: 10000 });
        await page.getByTestId('select-selectAddCustomAttribute-trigger').click();
        await page.getByRole('option', { name: 'Addable Custom' }).click();
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

    test('optional editable attribute with a default value is pre-filled', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            dataDescriptor({
                name: 'optionalDefault',
                uuid: 'optional-default-uuid',
                properties: { label: 'Optional Default', required: false, readOnly: false, list: false, multiSelect: false } as any,
                content: [{ data: 'suggestedValue' }] as any,
            }),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} />);
        const input = page.getByTestId('text-input-__attributes__testEditor__.optionalDefault');
        await expect(input).toBeVisible({ timeout: 10000 });
        await expect(input).toHaveValue('suggestedValue');
        await expect(input).toBeEnabled();
    });

    test('optional custom attribute with a default value stays hidden until the user opts in, then is pre-filled', async ({
        mount,
        page,
    }) => {
        const descriptors: AttributeDescriptorModel[] = [
            customDescriptor({
                name: 'customDefault',
                uuid: 'custom-default-uuid',
                properties: { label: 'Custom Default', required: false, readOnly: false, list: false, multiSelect: false } as any,
                content: [{ data: 'customDefaultValue' }] as any,
            }),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} />);

        await expect(page.getByText('Show custom attribute')).toBeVisible({ timeout: 10000 });
        const input = page.getByTestId('text-input-__attributes__testEditor__.customDefault');
        await expect(input).toHaveCount(0);

        await page.getByTestId('select-selectAddCustomAttribute-trigger').click();
        await page.getByRole('option', { name: 'Custom Default' }).click();

        await expect(input).toBeVisible({ timeout: 10000 });
        await expect(input).toHaveValue('customDefaultValue');
        await expect(input).toBeEnabled();
    });

    test('an opted-in custom attribute survives a descriptor refresh', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            customDescriptor({
                name: 'customDefault',
                uuid: 'custom-default-uuid',
                properties: { label: 'Custom Default', required: false, readOnly: false, list: false, multiSelect: false } as any,
                content: [{ data: 'customDefaultValue' }] as any,
            }),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} withDescriptorRefresh />);

        await page.getByTestId('select-selectAddCustomAttribute-trigger').click();
        await page.getByRole('option', { name: 'Custom Default' }).click();

        const input = page.getByTestId('text-input-__attributes__testEditor__.customDefault');
        await expect(input).toBeVisible({ timeout: 10000 });
        // TextInput starts readonly to block autofill and drops it on focus, so click before typing.
        await input.click();
        await input.fill('typedValue');

        await page.getByTestId('refresh-descriptors').click();
        // Let React flush the effects the refresh schedules, otherwise the assertions below pass on the
        // pre-refresh render and the test would never see the field disappear.
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)))));

        // The field must not vanish — its value stays in the form state and would be submitted invisibly.
        await expect(input).toBeVisible();
        await expect(input).toHaveValue('typedValue');
    });

    test('hidden optional custom attribute default is not silently seeded into the form values', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            customDescriptor({
                name: 'customDefault',
                uuid: 'custom-default-uuid',
                properties: { label: 'Custom Default', required: false, readOnly: false, list: false, multiSelect: false } as any,
                content: [{ data: 'customDefaultValue' }] as any,
            }),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} renderFormValues />);
        await expect(page.getByText('Show custom attribute')).toBeVisible({ timeout: 10000 });

        // While hidden, the default must not sit in the form state — it would end up in the request payload.
        await expect(page.getByTestId('form-values')).not.toContainText('customDefaultValue');

        await page.getByTestId('select-selectAddCustomAttribute-trigger').click();
        await page.getByRole('option', { name: 'Custom Default' }).click();
        await expect(page.getByTestId('form-values')).toContainText('customDefaultValue', { timeout: 10000 });
    });

    test('required custom attribute with a default value is shown and pre-filled from the start', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            customDescriptor({
                name: 'requiredDefault',
                uuid: 'required-default-uuid',
                properties: { label: 'Required Default', required: true, readOnly: false, list: false, multiSelect: false } as any,
                content: [{ data: 'requiredDefaultValue' }] as any,
            }),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} />);
        const input = page.getByTestId('text-input-__attributes__testEditor__.requiredDefault');
        await expect(input).toBeVisible({ timeout: 10000 });
        await expect(input).toHaveValue('requiredDefaultValue');
        await expect(input).toBeEnabled();
    });

    test('attribute value takes precedence over the descriptor default', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            customDescriptor({
                name: 'customDefault',
                uuid: 'custom-default-uuid',
                properties: { label: 'Custom Default', required: false, readOnly: false, list: false, multiSelect: false } as any,
                content: [{ data: 'customDefaultValue' }] as any,
            }),
        ];
        const attributes = [{ name: 'customDefault', uuid: 'custom-default-uuid', content: [{ data: 'storedValue' }] }] as any[];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} attributes={attributes} />);
        const input = page.getByTestId('text-input-__attributes__testEditor__.customDefault');
        await expect(input).toBeVisible({ timeout: 15000 });
        await expect(input).toHaveValue('storedValue');
    });

    test('optional custom attribute without a default value stays hidden', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            customDescriptor({
                name: 'customNoDefault',
                uuid: 'custom-no-default-uuid',
                properties: { label: 'Custom No Default', required: false, readOnly: false, list: false, multiSelect: false } as any,
            }),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} />);
        await expect(page.getByText('Show custom attribute')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('text-input-__attributes__testEditor__.customNoDefault')).toHaveCount(0);
    });

    test('list custom attribute options are not treated as a default value', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            customDescriptor({
                name: 'customList',
                uuid: 'custom-list-uuid',
                properties: { label: 'Custom List', required: false, readOnly: false, list: true, multiSelect: false } as any,
                content: [{ data: 'first' }, { data: 'second' }] as any,
            }),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} />);
        await expect(page.getByText('Show custom attribute')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('select-__attributes__testEditor__.customList')).toHaveCount(0);
    });

    test('RESOURCE custom attribute options are not treated as a default value', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [
            customDescriptor({
                name: 'customResource',
                uuid: 'custom-resource-uuid',
                contentType: AttributeContentType.Resource,
                properties: { label: 'Custom Resource', required: false, readOnly: false, list: false, multiSelect: false } as any,
                content: [
                    { reference: 'Group A', data: { uuid: 'a' } },
                    { reference: 'Group B', data: { uuid: 'b' } },
                ] as any,
            }),
        ];
        await mount(<AttributeEditorTestWrapper id={editorId} attributeDescriptors={descriptors} />);
        await expect(page.getByText('Show custom attribute')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('select-__attributes__testEditor__.customResource')).toHaveCount(0);
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

test.describe('AttributeEditor NG group callbacks', () => {
    test('drops the injected fields, nested ones included, and their values when the dependency is cleared', async ({ mount, page }) => {
        // given
        await mountWithDnsChallengeSelected(mount);
        await answerGroupCallback(page);
        await expect(page.getByTestId('spinner')).toHaveCount(0, { timeout: 10000 });
        const dnsServerInput = page.getByTestId('text-input-__attributes__testEditor__.dnsServer');
        const dnsZoneInput = page.getByTestId('text-input-__attributes__testEditor__.dnsZone');
        await expect(dnsZoneInput).toBeVisible({ timeout: 10000 });
        const enteredDnsServer = 'ns1.example.com';
        await dnsServerInput.click(); // TextInput stays read-only until focused, which keeps autofill out
        await dnsServerInput.fill(enteredDnsServer);
        await expect(page.getByTestId('form-values')).toContainText(enteredDnsServer);

        // when
        await page.getByTestId('select-__attributes__testEditor__.challengeTypeSelect-clear').click();

        // then
        await expect(dnsServerInput).toHaveCount(0, { timeout: 10000 });
        await expect(dnsZoneInput).toHaveCount(0);
        await expect(page.getByTestId('form-values')).not.toContainText(enteredDnsServer);
    });

    test('leaves the form valid when a dropped injected field was required and empty', async ({ mount, page }) => {
        // given
        const requiredDnsServer = dataDescriptor({ name: 'dnsServer', uuid: 'dnsServer-uuid' });
        await mountWithDnsGroupAnswers(mount, { [`__attributes__${editorId}__.dnsGroup`]: [requiredDnsServer] }, [], true);
        await answerGroupCallback(page);
        await expect(page.getByTestId('text-input-__attributes__testEditor__.dnsServer')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('form-valid')).toHaveText('false');

        // when
        await page.getByTestId('select-__attributes__testEditor__.challengeTypeSelect-clear').click();

        // then
        await expect(page.getByTestId('text-input-__attributes__testEditor__.dnsServer')).toHaveCount(0, { timeout: 10000 });
        await expect(page.getByTestId('form-valid')).toHaveText('true');
    });

    test('keeps the dropped fields off the form when another callback answers', async ({ mount, page }) => {
        // given
        await mountWithDnsChallengeSelected(mount, undefined, [endpointDescriptor()]);
        await answerGroupCallback(page);
        await expect(page.getByTestId('spinner')).toHaveCount(0, { timeout: 10000 });
        const dnsServerInput = page.getByTestId('text-input-__attributes__testEditor__.dnsServer');
        await expect(dnsServerInput).toBeVisible();
        await page.getByTestId('select-__attributes__testEditor__.challengeTypeSelect-clear').click();
        await expect(dnsServerInput).toHaveCount(0, { timeout: 10000 });

        // when
        await page.getByTestId(`answer-callback-__attributes__${editorId}__.endpoint`).click();

        // then
        await expect(page.getByTestId('select-__attributes__testEditor__.endpointSelect-trigger')).toBeVisible();
        await page.waitForTimeout(CALLBACK_DEBOUNCE_MS); // NOSONAR(S2925)
        await expect(dnsServerInput).toHaveCount(0);
    });

    test('fires the initial callback of an injected child group again once it is injected anew', async ({ mount, page }) => {
        // given
        const firesOnMountOnly: string[] = [];
        await mountWithDnsChallengeSelected(mount, firesOnMountOnly);
        await answerGroupCallback(page);
        await page.getByTestId('answer-callbacks').click();
        await expect(page.getByTestId('spinner')).toHaveCount(0, { timeout: 10000 });
        await page.getByTestId('select-__attributes__testEditor__.challengeTypeSelect-clear').click();
        await expect(page.getByTestId('text-input-__attributes__testEditor__.dnsZone')).toHaveCount(0, { timeout: 10000 });

        // when
        await page.getByTestId('select-__attributes__testEditor__.challengeTypeSelect-trigger').click();
        await page.getByRole('option', { name: 'dns-01' }).click();
        await expect(page.getByTestId('spinner')).toBeVisible({ timeout: 10000 });
        await page.getByTestId('answer-callbacks').click();

        // then — the nested group's callback is in flight again, as the test store never answers it
        await page.waitForTimeout(CALLBACK_DEBOUNCE_MS * 2); // NOSONAR(S2925)
        await expect(page.getByTestId('spinner')).toBeVisible();
    });

    test('keeps an injected field the user changed when another group answers', async ({ mount, page }) => {
        // given
        await mountWithDnsWriterGroup(mount);
        const writerTypeTrigger = await selectRfc2136Writer(page);

        // when
        await answerWriterGroup(page);

        // then — a reset would land after the answer is applied, so outlast the change pass that follows it
        await page.waitForTimeout(CALLBACK_DEBOUNCE_MS * 2); // NOSONAR(S2925)
        await expect(writerTypeTrigger).toContainText('rfc2136');
    });

    test('skips the callback of a removed child group whose dependency changed in the same pass', async ({ mount, page }) => {
        // given — the child group depends on a top-level field, which the drop leaves in place
        const providerDescriptor = dataDescriptor({
            name: 'dnsProvider',
            uuid: 'dns-provider-uuid',
            properties: { ...dataDescriptor().properties, label: 'DNS Provider', required: false, list: true },
            content: [{ data: 'route53' }, { data: 'cloudflare' }] as any,
        });
        await mountWithDnsGroupAnswers(
            mount,
            {
                [`__attributes__${editorId}__.dnsGroup`]: [groupDescriptor('dnsProviderGroup', ['dnsProvider'])],
                [`__attributes__${editorId}__.dnsProviderGroup`]: [injectedFieldDescriptor('providerToken', 'Provider Token')],
            },
            [providerDescriptor],
        );
        await answerGroupCallback(page);
        await expect(page.getByTestId('text-input-__attributes__testEditor__.providerToken')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('spinner')).toHaveCount(0, { timeout: 10000 });
        await page.getByTestId('select-__attributes__testEditor__.dnsProviderSelect-trigger').click();
        await page.getByRole('option', { name: 'route53' }).click();

        // when
        await page.getByTestId('select-__attributes__testEditor__.challengeTypeSelect-clear').click();

        // then — a fired provider-group callback would stay in flight, as the test store never answers it
        await expect(page.getByTestId('text-input-__attributes__testEditor__.providerToken')).toHaveCount(0, { timeout: 10000 });
        await page.waitForTimeout(CALLBACK_DEBOUNCE_MS); // NOSONAR(S2925)
        await expect(page.getByTestId('spinner')).toHaveCount(0);
    });

    test('initialises an injected field again when its own group answers it anew', async ({ mount, page }) => {
        // given
        await mountWithDnsWriterGroup(mount);
        const writerTypeTrigger = await selectRfc2136Writer(page);
        await answerWriterGroup(page);

        // when
        await page.getByTestId(`answer-callback-__attributes__${editorId}__.dnsGroup`).click();

        // then
        await expect(writerTypeTrigger).toContainText('external', { timeout: 10000 });
    });

    // ── Helpers ───────────────────────────────────────────────────────────────

    const challengeTypeDescriptor = (): DataAttributeModel =>
        dataDescriptor({
            name: 'challengeType',
            uuid: 'challenge-type-uuid',
            properties: { label: 'Challenge Type', required: false, readOnly: false, visible: true, list: true, multiSelect: false } as any,
            content: [{ data: 'dns-01' }, { data: 'http-01' }] as any,
        });

    const groupDescriptor = (name: string, dependsOn?: string[]): GroupAttributeModel =>
        ({
            type: AttributeType.Group,
            name,
            uuid: `${name}-uuid`,
            ...(dependsOn ? { attributeCallback: { mappings: [], dependsOn } } : {}),
        }) as GroupAttributeModel;

    const endpointDescriptor = (): DataAttributeModel =>
        dataDescriptor({
            name: 'endpoint',
            uuid: 'endpoint-uuid',
            properties: { label: 'Endpoint', required: false, readOnly: false, visible: true, list: true, multiSelect: false } as any,
            attributeCallback: { mappings: [], dependsOn: [] } as any,
        });

    const injectedFieldDescriptor = (name: string, label: string): DataAttributeModel =>
        dataDescriptor({ name, uuid: `${name}-uuid`, properties: { ...dataDescriptor().properties, label, required: false } });

    const answerGroupCallback = async (page: Page) => {
        await expect(page.getByTestId('spinner')).toBeVisible({ timeout: 10000 });
        // The first debounced change pass fires the group callback again; answer only after it.
        await page.waitForTimeout(CALLBACK_DEBOUNCE_MS * 2); // NOSONAR(S2925)
        await page.getByTestId('answer-callbacks').click();
    };

    const selectRfc2136Writer = async (page: Page) => {
        await answerGroupCallback(page);
        await expect(page.getByTestId('spinner')).toHaveCount(0, { timeout: 10000 });
        const writerTypeTrigger = page.getByTestId('select-__attributes__testEditor__.dnsWriterTypeSelect-trigger');
        await writerTypeTrigger.click();
        await page.getByRole('option', { name: 'rfc2136' }).click();
        await expect(page.getByTestId('spinner')).toBeVisible({ timeout: 10000 });
        return writerTypeTrigger;
    };

    const answerWriterGroup = async (page: Page) => {
        await page.getByTestId(`answer-callback-__attributes__${editorId}__.dnsWriterGroup`).click();
        await expect(page.getByTestId('text-input-__attributes__testEditor__.rfc2136Server')).toBeVisible({ timeout: 10000 });
    };

    const mountWithDnsChallengeSelected = (
        mount: any,
        nestedGroupDependsOn?: string[],
        otherDescriptors: AttributeDescriptorModel[] = [],
    ) =>
        mountWithDnsGroupAnswers(
            mount,
            {
                [`__attributes__${editorId}__.dnsGroup`]: [
                    injectedFieldDescriptor('dnsServer', 'DNS Server'),
                    groupDescriptor('dnsNestedGroup', nestedGroupDependsOn),
                ],
                [`__attributes__${editorId}__.dnsNestedGroup`]: [injectedFieldDescriptor('dnsZone', 'DNS Zone')],
                [`__attributes__${editorId}__.endpoint`]: [{ data: 'acme.example' }],
            },
            otherDescriptors,
        );

    const mountWithDnsWriterGroup = (mount: any) =>
        mountWithDnsGroupAnswers(mount, {
            [`__attributes__${editorId}__.dnsGroup`]: [
                dataDescriptor({
                    name: 'dnsWriterType',
                    uuid: 'dns-writer-type-uuid',
                    properties: { ...dataDescriptor().properties, label: 'DNS Writer', required: false, list: true },
                    content: [{ data: 'external' }, { data: 'rfc2136' }] as any,
                }),
                groupDescriptor('dnsWriterGroup', ['dnsWriterType']),
            ],
            [`__attributes__${editorId}__.dnsWriterGroup`]: [injectedFieldDescriptor('rfc2136Server', 'RFC 2136 Server')],
        });

    const mountWithDnsGroupAnswers = (
        mount: any,
        callbackResponses: Record<string, unknown[]>,
        otherDescriptors: AttributeDescriptorModel[] = [],
        renderFormValidity = false,
    ) =>
        mount(
            <AttributeEditorTestWrapper
                id={editorId}
                attributeDescriptors={[challengeTypeDescriptor(), groupDescriptor('dnsGroup', ['challengeType']), ...otherDescriptors]}
                attributes={[{ name: 'challengeType', uuid: 'challenge-type-uuid', content: [{ data: 'dns-01' }] }] as any}
                connectorUuid="conn-1"
                kind="k"
                withGroupCallbackState
                renderFormValues
                callbackResponses={callbackResponses}
                renderFormValidity={renderFormValidity}
            />,
        );
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
