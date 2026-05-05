import { MemoryRouter } from 'react-router';
import { Provider } from 'react-redux';
import { createMockStore } from 'utils/test-helpers';
import CustomAttributeWidget from './index';
import type { CustomAttributeModel } from 'types/attributes';
import { Resource, AttributeType, AttributeContentType } from 'types/openapi';

function minimalDescriptor(overrides: Partial<CustomAttributeModel> = {}): CustomAttributeModel {
    return {
        uuid: 'attr-1',
        name: 'testAttr',
        type: AttributeType.Custom,
        contentType: AttributeContentType.String,
        properties: {
            label: 'Test Attribute',
            readOnly: false,
            required: false,
            list: false,
            multiSelect: false,
            visible: true,
        },
        description: 'Test description',
        ...overrides,
    } as CustomAttributeModel;
}

type HarnessProps = Readonly<{
    resource?: Resource;
    resourceUuid?: string;
    attributes?: any;
    className?: string;
    availableAttributes?: CustomAttributeModel[];
}>;

/**
 * Creates store and renders CustomAttributeWidget in browser (for CT).
 * Store is created on render so it has customAttributes slice.
 */
export default function CustomAttributeWidgetMountHarness({
    resource = Resource.Certificates,
    resourceUuid = 'test-resource-uuid',
    attributes,
    className,
    availableAttributes = [minimalDescriptor()],
}: HarnessProps) {
    const store = createMockStore({
        customAttributes: {
            resourceCustomAttributes: availableAttributes,
            resourceCustomAttributesContents: [],
            isFetchingResourceCustomAttributes: false,
            isUpdatingContent: false,
        },
    });
    return (
        <Provider store={store}>
            <MemoryRouter>
                <CustomAttributeWidget resource={resource} resourceUuid={resourceUuid} attributes={attributes} className={className} />
            </MemoryRouter>
        </Provider>
    );
}
