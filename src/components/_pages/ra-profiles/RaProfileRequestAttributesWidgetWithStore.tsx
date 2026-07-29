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
            {/* Stand-in for the epic's rejection path (CT runs no epics): flips the pending flag back
                with no success, which is what the editor rolls back on. */}
            <button
                type="button"
                data-testid="simulate-rejection"
                onClick={() =>
                    store.dispatch({
                        type: 'raProfileRequestAttributes/updateRaProfileRequestAttributesFailure',
                        payload: { error: 'Attribute definition is invalid' },
                    })
                }
            >
                simulate rejection
            </button>
        </Provider>
    );
}
