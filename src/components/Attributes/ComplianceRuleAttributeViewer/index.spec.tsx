import { test, expect } from '../../../../playwright/ct-test';
import ComplianceRuleAttributeViewer from './index';
import { withProviders } from 'utils/test-helpers';
import { AttributeType, AttributeContentType } from 'types/openapi';

const mockAttribute = (uuid: string, name: string, contentType: string, content: any) => ({ uuid, name, contentType, content }) as any;

const mockDataDescriptor = (uuid: string, name: string, contentType: string, content: any) =>
    ({
        type: AttributeType.Data,
        uuid,
        name,
        contentType,
        content,
        properties: {},
    }) as any;

test.describe('ComplianceRuleAttributeViewer', () => {
    test('renders table with Name and Value headers', async ({ mount }) => {
        const component = await mount(withProviders(<ComplianceRuleAttributeViewer attributes={[]} hasHeader={true} />));
        await expect(component.getByText('Name')).toBeVisible();
        await expect(component.getByText('Value')).toBeVisible();
    });

    test('renders attribute rows from attributes prop', async ({ mount }) => {
        const attributes = [mockAttribute('a1', 'attr1', AttributeContentType.String, [{ data: 'hello' }])];
        const component = await mount(withProviders(<ComplianceRuleAttributeViewer attributes={attributes} />));
        await expect(component.getByText('attr1')).toBeVisible();
        await expect(component.getByText('hello')).toBeVisible();
    });

    test('renders the reference of a String attribute instead of its data', async ({ mount }) => {
        const attributes = [
            mockAttribute('a1', 'attr1', AttributeContentType.String, [
                { data: 'ee-profile-object-id', reference: 'End Entity Profile One' },
            ]),
        ];
        const component = await mount(withProviders(<ComplianceRuleAttributeViewer attributes={attributes} />));
        await expect(component.getByText('End Entity Profile One')).toBeVisible();
        await expect(component.getByText('ee-profile-object-id')).toHaveCount(0);
    });

    test('renders descriptor rows from descriptorAttributes (data only)', async ({ mount }) => {
        const descriptorAttributes = [mockDataDescriptor('d1', 'desc1', AttributeContentType.String, [{ data: 'world' }])];
        const component = await mount(withProviders(<ComplianceRuleAttributeViewer descriptorAttributes={descriptorAttributes} />));
        await expect(component.getByText('desc1')).toBeVisible();
        await expect(component.getByText('world')).toBeVisible();
    });

    test('renders both attributes and descriptor rows', async ({ mount }) => {
        const attributes = [mockAttribute('a1', 'fromAttr', AttributeContentType.String, [{ data: 'A' }])];
        const descriptorAttributes = [mockDataDescriptor('d1', 'fromDesc', AttributeContentType.String, [{ data: 'D' }])];
        const component = await mount(
            withProviders(<ComplianceRuleAttributeViewer attributes={attributes} descriptorAttributes={descriptorAttributes} />),
        );
        await expect(component.getByText('fromAttr')).toBeVisible();
        await expect(component.getByText('A', { exact: true })).toBeVisible();
        await expect(component.getByText('fromDesc')).toBeVisible();
        await expect(component.getByText('D', { exact: true })).toBeVisible();
    });
});
