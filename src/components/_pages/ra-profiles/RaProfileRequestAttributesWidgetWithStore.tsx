import { Provider } from 'react-redux';
import type { RaProfileCertificateRequestAttributesDto } from 'types/openapi';
import { createMockStore } from 'utils/test-helpers';
import RaProfileRequestAttributesWidget from './RaProfileRequestAttributesWidget';

export default function RaProfileRequestAttributesWidgetWithStore({
    certificateRequestAttributes,
}: Readonly<{ certificateRequestAttributes?: RaProfileCertificateRequestAttributesDto }>) {
    const store = createMockStore();

    return (
        <Provider store={store}>
            <RaProfileRequestAttributesWidget
                authorityUuid="auth-1"
                raProfileUuid="ra-1"
                certificateRequestAttributes={certificateRequestAttributes}
            />
        </Provider>
    );
}
