import { MemoryRouter } from 'react-router';
import { Provider } from 'react-redux';
import { createMockStore } from 'utils/test-helpers';
import AttributeViewer, { type Props } from './index';
import { PlatformEnum, AttributeContentType, Resource } from 'types/openapi';
import GlobalModal from 'components/GlobalModal';

const contentTypeLabels: Record<string, { label: string }> = {
    [AttributeContentType.String]: { label: 'String' },
    [AttributeContentType.Text]: { label: 'Text' },
    [AttributeContentType.Secret]: { label: 'Secret' },
    [AttributeContentType.Integer]: { label: 'Integer' },
    [AttributeContentType.Boolean]: { label: 'Boolean' },
};

const resourceLabels: Record<string, { label: string }> = {
    [Resource.Certificates]: { label: 'Certificates' },
    [Resource.Connectors]: { label: 'Connectors' },
};

export function createAttributeViewerStore() {
    return createMockStore({
        enums: {
            platformEnums: {
                [PlatformEnum.AttributeContentType]: contentTypeLabels,
                [PlatformEnum.Resource]: resourceLabels,
            },
        },
    });
}

type HarnessProps = Props;

export default function AttributeViewerMountHarness(props: HarnessProps) {
    const store = createAttributeViewerStore();
    return (
        <Provider store={store}>
            <MemoryRouter>
                <>
                    <AttributeViewer {...props} />
                    <GlobalModal />
                </>
            </MemoryRouter>
        </Provider>
    );
}
