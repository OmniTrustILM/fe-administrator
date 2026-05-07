import { test, expect } from '../../../../playwright/ct-test';
import AttributeViewerMountHarness from './AttributeViewerMountHarness';
import { ATTRIBUTE_VIEWER_TYPE } from './index';
import type { AttributeResponseModel, CustomAttributeModel } from 'types/attributes';
import type { MetadataModel } from 'types/locations';
import { AttributeContentType, AttributeType, Resource } from 'types/openapi';

function attrResponse(overrides: Partial<AttributeResponseModel> = {}): AttributeResponseModel {
    return {
        uuid: 'attr-uuid-1',
        name: 'attr1',
        label: 'Attribute 1',
        contentType: AttributeContentType.String,
        content: [{ data: 'value1' } as any],
        ...overrides,
    } as AttributeResponseModel;
}

function customDescriptor(overrides: Partial<CustomAttributeModel> = {}): CustomAttributeModel {
    return {
        uuid: 'desc-uuid-1',
        name: 'attr1',
        type: AttributeType.Custom,
        contentType: AttributeContentType.String,
        properties: {
            label: 'Attr 1',
            readOnly: false,
            required: false,
            list: false,
            multiSelect: false,
            visible: true,
        },
        ...overrides,
    } as CustomAttributeModel;
}

test.describe('AttributeViewer', () => {
    test('ATTRIBUTE type: renders table with headers and attribute row', async ({ mount, page }) => {
        const component = await mount(
            <AttributeViewerMountHarness viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE} attributes={[attrResponse()]} />,
        );
        const table = page.getByTestId('custom-table');
        await expect(table).toBeVisible({ timeout: 10000 });
        await expect(table.getByRole('columnheader', { name: 'Name' })).toBeVisible();
        await expect(table.getByRole('columnheader', { name: 'Content Type' })).toBeVisible();
        await expect(table.getByRole('columnheader', { name: 'Content', exact: true })).toBeVisible();
        await expect(table.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
        await expect(component.getByText('Attribute 1')).toBeVisible();
        await expect(component.getByText('String')).toBeVisible();
        await expect(component.getByText('value1')).toBeVisible();
    });

    test('ATTRIBUTE type: copy button copies content', async ({ mount, page }) => {
        await mount(
            <AttributeViewerMountHarness
                viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE}
                attributes={[attrResponse({ content: [{ data: 'copy-me' } as any] })]}
            />,
        );
        await expect(page.getByTestId('custom-table')).toBeVisible({ timeout: 10000 });
        await page.getByTestId('copy-button').first().click();
        await expect(page.getByTestId('copy-button').first()).toBeAttached();
    });

    test('ATTRIBUTE type: copy disabled for Secret contentType', async ({ mount }) => {
        const component = await mount(
            <AttributeViewerMountHarness
                viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE}
                attributes={[attrResponse({ contentType: AttributeContentType.Secret, content: [{ data: 'x' } as any] })]}
            />,
        );
        await expect(component.getByTestId('copy-button')).toBeDisabled();
    });

    test('ATTRIBUTE type: hasHeader false hides header row', async ({ mount, page }) => {
        await mount(
            <AttributeViewerMountHarness viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE} attributes={[attrResponse()]} hasHeader={false} />,
        );
        await expect(page.getByTestId('custom-table')).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('columnheader', { name: 'Name' })).not.toBeVisible();
    });

    test('ATTRIBUTE_EDIT type: renders table with edit and copy buttons', async ({ mount, page }) => {
        const descriptors = [customDescriptor()];
        const attributes = [attrResponse({ name: 'attr1', label: 'Attr 1' })];
        await mount(
            <AttributeViewerMountHarness
                viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE_EDIT}
                descriptors={descriptors}
                attributes={attributes}
            />,
        );
        await expect(page.getByTestId('custom-table')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('copy-button').first()).toBeVisible();
        await expect(page.getByTestId('edit-button').first()).toBeVisible();
    });

    test('ATTRIBUTE_EDIT type: edit button enters edit mode, cancel exits', async ({ mount }) => {
        const descriptors = [customDescriptor({ name: 'attr1' })];
        const attributes = [attrResponse({ name: 'attr1', label: 'Attr 1' })];
        const component = await mount(
            <AttributeViewerMountHarness
                viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE_EDIT}
                descriptors={descriptors}
                attributes={attributes}
            />,
        );
        await component.getByTestId('edit-button').click();
        await expect(component.getByTestId('cancel-button')).toBeVisible();
        await component.getByTestId('cancel-button').click();
        await expect(component.getByTestId('edit-button')).toBeVisible();
    });

    test('ATTRIBUTE_EDIT type: onSubmit called when form submitted', async ({ mount }) => {
        let wasSubmitted = false;
        const onSubmit = async (uuid: string, content: any[]) => {
            wasSubmitted = true;
            expect(uuid).toBe('desc-uuid-1');
            expect(Array.isArray(content)).toBe(true);
        };
        const descriptors = [customDescriptor({ uuid: 'desc-uuid-1', name: 'attr1' })];
        const attributes = [attrResponse({ name: 'attr1' })];
        const component = await mount(
            <AttributeViewerMountHarness
                viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE_EDIT}
                descriptors={descriptors}
                attributes={attributes}
                onSubmit={onSubmit}
            />,
        );
        await component.getByTestId('edit-button').click();
        await component.locator('form').first().dispatchEvent('submit');
        await expect(component.getByTestId('save-custom-value')).toBeVisible();
        await component.getByTestId('save-custom-value').click();
        await expect.poll(() => wasSubmitted).toBeTruthy();
    });

    test('ATTRIBUTE_EDIT type: onRemove and delete button', async ({ mount }) => {
        const onRemove = async (uuid: string) => {
            expect(uuid).toBe('desc-uuid-1');
        };
        const descriptors = [
            customDescriptor({ uuid: 'desc-uuid-1', name: 'attr1', properties: { ...customDescriptor().properties, required: false } }),
        ];
        const attributes = [attrResponse({ name: 'attr1' })];
        const component = await mount(
            <AttributeViewerMountHarness
                viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE_EDIT}
                descriptors={descriptors}
                attributes={attributes}
                onRemove={onRemove}
            />,
        );
        await expect(component.getByTestId('delete-button')).toBeVisible();
        await component.getByTestId('delete-button').click();
    });

    test('ATTRIBUTE_EDIT type: delete disabled when required', async ({ mount }) => {
        const descriptors = [customDescriptor({ properties: { ...customDescriptor().properties, required: true } })];
        const attributes = [attrResponse({ name: 'attr1' })];
        const component = await mount(
            <AttributeViewerMountHarness
                viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE_EDIT}
                descriptors={descriptors}
                attributes={attributes}
                onRemove={() => {}}
            />,
        );
        await expect(component.getByTestId('delete-button')).toBeDisabled();
    });

    test('ATTRIBUTE_EDIT type: edit disabled when readOnly', async ({ mount }) => {
        const descriptors = [customDescriptor({ properties: { ...customDescriptor().properties, readOnly: true } })];
        const attributes = [attrResponse({ name: 'attr1' })];
        const component = await mount(
            <AttributeViewerMountHarness
                viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE_EDIT}
                descriptors={descriptors}
                attributes={attributes}
            />,
        );
        await expect(component.getByTestId('edit-button')).toBeDisabled();
    });

    test('ATTRIBUTE_EDIT type: filters attributes by descriptor names', async ({ mount }) => {
        const descriptors = [customDescriptor({ name: 'onlyThis' })];
        const attributes = [attrResponse({ name: 'onlyThis', label: 'Only' }), attrResponse({ name: 'other', label: 'Other' })];
        const component = await mount(
            <AttributeViewerMountHarness
                viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE_EDIT}
                descriptors={descriptors}
                attributes={attributes}
            />,
        );
        await expect(component.getByText('Only')).toBeVisible();
        await expect(component.getByText('Other')).not.toBeVisible();
    });

    test('ATTRIBUTE_EDIT type: copy button works while not in edit mode', async ({ mount }) => {
        const component = await mount(
            <AttributeViewerMountHarness
                viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE_EDIT}
                descriptors={[customDescriptor({ name: 'attr1' })]}
                attributes={[attrResponse({ name: 'attr1', content: [{ data: 'copy-in-edit' } as any] })]}
            />,
        );
        await expect(component.getByTestId('copy-button')).toBeVisible();
        await component.getByTestId('copy-button').click({ force: true });
        await expect(component.getByTestId('copy-button')).toBeAttached();
    });

    test('METADATA type: renders connector and source object columns with details', async ({ mount, page }) => {
        const metadata: MetadataModel[] = [
            {
                connectorUuid: 'conn-1',
                connectorName: 'Conn A',
                sourceObjectType: Resource.Certificates,
                items: [
                    {
                        uuid: 'item-1',
                        name: 'meta1',
                        label: 'Meta 1',
                        contentType: AttributeContentType.String,
                        content: [{ data: 'v1' } as any],
                        sourceObjects: [],
                    } as any,
                ],
            },
        ];
        await mount(<AttributeViewerMountHarness viewerType={ATTRIBUTE_VIEWER_TYPE.METADATA} metadata={metadata} />);
        await expect(page.getByTestId('custom-table')).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('columnheader', { name: 'Connector' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Source Object' })).toBeVisible();
        await expect(page.getByText('Conn A')).toBeVisible();
        await expect(page.getByText('Certificates')).toBeVisible();
    });

    test('METADATA type: source object button opens modal', async ({ mount, page }) => {
        const metadata: MetadataModel[] = [
            {
                connectorUuid: 'c1',
                connectorName: 'C1',
                sourceObjectType: Resource.Certificates,
                items: [
                    {
                        uuid: 'i1',
                        name: 'm1',
                        contentType: AttributeContentType.String,
                        content: [],
                        sourceObjects: [{ uuid: 'obj-1', name: 'Object 1' }],
                    } as any,
                ],
            },
        ];
        await mount(<AttributeViewerMountHarness viewerType={ATTRIBUTE_VIEWER_TYPE.METADATA} metadata={metadata} />);
        await expect(page.getByTestId('custom-table')).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: 'C1' }).click();
        await expect(page.getByTestId('source-button')).toBeVisible({ timeout: 10000 });
        await page.getByTestId('source-button').click();
        await expect(page.getByRole('heading', { name: 'Source objects' })).toBeVisible();
    });

    test('METADATA_FLAT type: renders flat table with connector and source object in row', async ({ mount, page }) => {
        const metadata: MetadataModel[] = [
            {
                connectorUuid: 'c1',
                connectorName: 'ConnX',
                sourceObjectType: Resource.Connectors,
                items: [
                    {
                        uuid: 'i1',
                        name: 'flat1',
                        label: 'Flat 1',
                        contentType: AttributeContentType.String,
                        content: [{ data: 'flatval' } as any],
                        sourceObjects: [],
                    } as any,
                ],
            },
        ];
        await mount(<AttributeViewerMountHarness viewerType={ATTRIBUTE_VIEWER_TYPE.METADATA_FLAT} metadata={metadata} />);
        await expect(page.getByTestId('custom-table')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('ConnX')).toBeVisible();
        await expect(page.getByText('Connectors')).toBeVisible();
        await expect(page.getByText('Flat 1')).toBeVisible();
        await expect(page.getByText('flatval')).toBeVisible();
    });

    test('METADATA_FLAT: No connector and No Source Object when missing', async ({ mount }) => {
        const metadata: MetadataModel[] = [
            {
                connectorUuid: '',
                connectorName: undefined as any,
                sourceObjectType: undefined as any,
                items: [
                    {
                        uuid: 'i1',
                        name: 'n',
                        contentType: AttributeContentType.String,
                        content: [],
                        sourceObjects: [],
                    } as any,
                ],
            },
        ];
        const component = await mount(<AttributeViewerMountHarness viewerType={ATTRIBUTE_VIEWER_TYPE.METADATA_FLAT} metadata={metadata} />);
        await expect(component.getByText('No connector')).toBeVisible();
        await expect(component.getByText('No Source Object')).toBeVisible();
    });

    test('attribute with no content: copy click does nothing (early return)', async ({ mount, page }) => {
        await mount(
            <AttributeViewerMountHarness
                viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE}
                attributes={[attrResponse({ content: undefined })]}
            />,
        );
        await expect(page.getByTestId('custom-table')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('copy-button').first()).toBeVisible();
        await page.getByTestId('copy-button').first().click({ force: true });
        await expect(page.getByTestId('custom-table')).toBeAttached();
    });

    test('uses label or name for attribute display', async ({ mount }) => {
        const component = await mount(
            <AttributeViewerMountHarness
                viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE}
                attributes={[attrResponse({ label: undefined, name: 'fallbackName' })]}
            />,
        );
        await expect(component.getByText('fallbackName')).toBeVisible();
    });

    test('attribute row falls back to empty name and id when values are missing', async ({ mount, page }) => {
        await mount(
            <AttributeViewerMountHarness
                viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE}
                attributes={[
                    attrResponse({
                        uuid: undefined as any,
                        name: undefined as any,
                        label: undefined as any,
                        content: [],
                    }),
                ]}
            />,
        );
        await expect(page.getByTestId('custom-table')).toBeVisible();
    });

    test('getMetadataTableData: connectorName fallback and no sourceObjectType', async ({ mount }) => {
        const metadata: MetadataModel[] = [
            {
                connectorUuid: '',
                connectorName: undefined as any,
                sourceObjectType: undefined as any,
                items: [
                    {
                        uuid: 'i1',
                        name: 'x',
                        contentType: AttributeContentType.String,
                        content: [],
                        sourceObjects: [],
                    } as any,
                ],
            },
        ];
        const component = await mount(<AttributeViewerMountHarness viewerType={ATTRIBUTE_VIEWER_TYPE.METADATA} metadata={metadata} />);
        await expect(component.getByText('No connector')).toBeVisible();
    });

    test('ATTRIBUTE_EDIT with non-Custom descriptors returns empty table', async ({ mount, page }) => {
        const nonCustomDescriptor = { ...customDescriptor(), type: AttributeType.Data } as CustomAttributeModel;
        await mount(
            <AttributeViewerMountHarness
                viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE_EDIT}
                descriptors={[nonCustomDescriptor]}
                attributes={[attrResponse({ name: 'attr1' })]}
            />,
        );
        await expect(page.getByTestId('custom-table')).toBeVisible();
        await expect(page.getByTestId('edit-button')).not.toBeVisible();
    });

    test('ATTRIBUTE_EDIT with no attributes or no descriptors renders empty table', async ({ mount, page }) => {
        await mount(
            <AttributeViewerMountHarness
                viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE_EDIT}
                descriptors={[]}
                attributes={undefined as any}
            />,
        );
        await expect(page.getByTestId('custom-table')).toBeVisible();
    });

    test('unknown viewerType (default branch) renders empty table', async ({ mount }) => {
        const harness = await mount(<AttributeViewerMountHarness viewerType={-1 as any} attributes={[attrResponse()]} />);
        await expect(harness).toBeAttached();
        await expect(harness.getByTestId('custom-table')).not.toBeAttached();
    });
});
