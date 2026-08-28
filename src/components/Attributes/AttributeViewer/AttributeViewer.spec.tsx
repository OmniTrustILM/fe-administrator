import { test, expect } from '../../../../playwright/ct-test';
import AttributeViewerMountHarness from './AttributeViewerMountHarness';
import { AttributeContentType, Resource } from 'types/openapi';
import type { AttributeResponseModel } from 'types/attributes';
import type { MetadataModel } from 'types/locations';
import { ATTRIBUTE_VIEWER_TYPE } from './index';

const makeResourceAttribute = (content: any[], overrides: Partial<AttributeResponseModel> = {}): AttributeResponseModel =>
    ({
        uuid: 'attr-1',
        name: 'resAttr',
        label: 'Resource Attr',
        version: 'v1',
        contentType: AttributeContentType.Resource,
        content,
        ...overrides,
    }) as any;

const connOne = { data: { uuid: '1234', name: 'Conn One', resource: Resource.Connectors } } as any;

test.describe('AttributeViewer', () => {
    test('renders Resource attribute content as link', async ({ mount, page }) => {
        await mount(<AttributeViewerMountHarness attributes={[makeResourceAttribute([connOne])]} />);

        const link = page.getByRole('link', { name: 'Conn One' });
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute('href', '/connectors/detail/1234');
    });

    test('renders all items of a multi-value Resource attribute as links', async ({ mount, page }) => {
        const resourceAttribute = makeResourceAttribute(
            [
                { data: { uuid: '1111', name: 'Conn One', resource: Resource.Connectors } },
                { data: { uuid: '2222', name: 'Conn Two', resource: Resource.Connectors } },
                { data: { uuid: '3333', name: 'Conn Three', resource: Resource.Connectors } },
            ],
            { uuid: 'attr-multi', name: 'resAttrMulti', label: 'Resource Attr Multi' },
        );

        await mount(<AttributeViewerMountHarness attributes={[resourceAttribute]} />);

        const one = page.getByRole('link', { name: 'Conn One' });
        const two = page.getByRole('link', { name: 'Conn Two' });
        const three = page.getByRole('link', { name: 'Conn Three' });
        await expect(one).toHaveAttribute('href', '/connectors/detail/1111');
        await expect(two).toHaveAttribute('href', '/connectors/detail/2222');
        await expect(three).toHaveAttribute('href', '/connectors/detail/3333');
    });

    test('uses name, reference then uuid for the link label and renders text for items without uuid/resource', async ({ mount, page }) => {
        const resourceAttribute = makeResourceAttribute(
            [
                { data: { uuid: '1111', name: 'Conn One', resource: Resource.Connectors } },
                { data: { uuid: '2222', resource: Resource.Connectors }, reference: 'Ref Label' },
                { data: { uuid: '3333', resource: Resource.Connectors } },
                { data: { name: 'Orphan Item' } },
                {},
            ],
            { uuid: 'attr-mixed', name: 'resAttrMixed', label: 'Resource Attr Mixed' },
        );

        await mount(<AttributeViewerMountHarness attributes={[resourceAttribute]} />);

        await expect(page.getByRole('link', { name: 'Conn One' })).toHaveAttribute('href', '/connectors/detail/1111');
        await expect(page.getByRole('link', { name: 'Ref Label' })).toHaveAttribute('href', '/connectors/detail/2222');
        await expect(page.getByRole('link', { name: '3333' })).toHaveAttribute('href', '/connectors/detail/3333');
        await expect(page.getByText('Orphan Item')).toBeVisible();
        await expect(page.getByRole('link', { name: 'Orphan Item' })).toHaveCount(0);
    });

    test('METADATA viewer uses connectorName and sourceObjectType columns', async ({ mount, page }) => {
        const resourceAttribute = makeResourceAttribute([connOne]);

        const metadata: MetadataModel = {
            connectorUuid: 'conn-uuid',
            connectorName: 'My Connector',
            sourceObjectType: Resource.Connectors,
            items: [resourceAttribute as any],
        } as any;

        await mount(
            <AttributeViewerMountHarness
                viewerType={ATTRIBUTE_VIEWER_TYPE.METADATA}
                metadata={[metadata]}
                attributes={[]}
                descriptors={[]}
            />,
        );

        await expect(page.getByText('My Connector')).toBeVisible();
        await expect(page.getByText('Connectors', { exact: true })).toBeVisible();
    });

    test('ATTRIBUTE_EDIT viewer handles undefined attributes gracefully', async ({ mount, page }) => {
        await mount(
            <AttributeViewerMountHarness
                viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE_EDIT}
                // attributes intentionally undefined to cover guard path in getAttributesEditTableData
                attributes={undefined as any}
                descriptors={[]}
            />,
        );

        await expect(page.getByText('Name')).toBeVisible();
        await expect(page.getByText('Content Type')).toBeVisible();
    });
});
