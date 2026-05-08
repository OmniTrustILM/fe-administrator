import { test, expect } from '../../../../playwright/ct-test';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import AttributeDescriptorViewer from './index';
import GlobalModal from 'components/GlobalModal';
import { AttributeType, AttributeContentType, AttributeConstraintType, PlatformEnum } from 'types/openapi';

const platformEnums = {
    [PlatformEnum.AttributeType]: {
        [AttributeType.Data]: { label: 'Data' },
        [AttributeType.Info]: { label: 'Info' },
        [AttributeType.Group]: { label: 'Group' },
        [AttributeType.Custom]: { label: 'Custom' },
        [AttributeType.Meta]: { label: 'Meta' },
    },
    [PlatformEnum.AttributeContentType]: {
        [AttributeContentType.String]: { label: 'String' },
    },
};

function withStore(node: any) {
    const store = createMockStore({ enums: { platformEnums } } as any);
    return (
        <Provider store={store}>
            <MemoryRouter>
                <>
                    {node}
                    <GlobalModal />
                </>
            </MemoryRouter>
        </Provider>
    );
}

const dataDescriptor = (overrides: any = {}) => {
    const { properties: propOverrides, constraints, content, ...rest } = overrides;
    return {
        type: AttributeType.Data,
        name: 'attr1',
        contentType: AttributeContentType.String,
        properties: {
            label: 'Data Label',
            required: true,
            readOnly: false,
            list: false,
            multiSelect: false,
            visible: true,
            ...(propOverrides ?? {}),
        },
        constraints: constraints ?? [],
        content: content ?? [],
        ...rest,
    } as any;
};

const infoDescriptor = (overrides: any = {}) => {
    const { properties: propOverrides, content, ...rest } = overrides;
    return {
        type: AttributeType.Info,
        name: 'info1',
        contentType: AttributeContentType.String,
        properties: { label: 'Info Label', visible: true, group: '__', ...(propOverrides ?? {}) },
        content: content ?? [],
        ...rest,
    } as any;
};

test.describe('AttributeDescriptorViewer', () => {
    test('shows Yes when Data attribute is required', async ({ mount, page }) => {
        await mount(withStore(<AttributeDescriptorViewer attributeDescriptors={[dataDescriptor({ properties: { required: true } })]} />));
        await expect(page.getByText('Data Label')).toBeVisible();
        await expect(page.getByRole('cell', { name: 'Yes' })).toBeVisible();
    });

    test('shows No when Data attribute is not required', async ({ mount, page }) => {
        await mount(withStore(<AttributeDescriptorViewer attributeDescriptors={[dataDescriptor({ properties: { required: false } })]} />));
        await expect(page.getByRole('cell', { name: 'No', exact: true })).toBeVisible();
    });

    test('shows n/a for Info attribute (covers else branch)', async ({ mount, page }) => {
        await mount(withStore(<AttributeDescriptorViewer attributeDescriptors={[infoDescriptor()]} />));
        await expect(page.getByText('Info Label')).toBeVisible();
        await expect(page.getByRole('cell', { name: 'n/a' })).toBeVisible();
    });

    test('renders without error when regex constraint data is non-string', async ({ mount, page }) => {
        const desc = dataDescriptor({
            properties: { label: 'WithRegex' },
            constraints: [{ type: AttributeConstraintType.RegExp, data: { someObject: true } } as any],
        });
        await mount(withStore(<AttributeDescriptorViewer attributeDescriptors={[desc]} />));
        await expect(page.getByRole('button', { name: 'WithRegex' })).toBeVisible();
    });

    test('renders without error when regex constraint data is a string', async ({ mount, page }) => {
        const desc = dataDescriptor({
            properties: { label: 'WithRegex' },
            constraints: [{ type: AttributeConstraintType.RegExp, data: '^[a-z]+$' } as any],
        });
        await mount(withStore(<AttributeDescriptorViewer attributeDescriptors={[desc]} />));
        await expect(page.getByRole('button', { name: 'WithRegex' })).toBeVisible();
    });
});
