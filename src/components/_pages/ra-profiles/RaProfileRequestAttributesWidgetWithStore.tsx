import { configureStore } from '@reduxjs/toolkit';
import { testInitialState, testReducers } from 'ducks/test-reducers';
import { Provider } from 'react-redux';
import type { RaProfileCertificateRequestAttributesDto } from 'types/openapi';
import RaProfileRequestAttributesWidget from './RaProfileRequestAttributesWidget';

export default function RaProfileRequestAttributesWidgetWithStore({
    certificateRequestAttributes,
}: Readonly<{ certificateRequestAttributes?: RaProfileCertificateRequestAttributesDto }>) {
    const store = configureStore({
        reducer: testReducers,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
        preloadedState: testInitialState,
    });

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
