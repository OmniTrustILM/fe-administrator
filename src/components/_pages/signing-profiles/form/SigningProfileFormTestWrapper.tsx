import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { useMemo } from 'react';
import connectorsReducer from 'ducks/connectors';
import userInterfaceReducer from 'ducks/user-interface';
import SigningProfileForm from './SigningProfileForm';

// Identity reducer for building a lightweight, inert test store (no epics, reducers are no-ops).
const identity =
    <S,>(initial: S) =>
    (state: S | undefined): S =>
        state ?? initial;

export function SigningProfileFormTestWrapper() {
    const store = useMemo(
        () =>
            configureStore({
                reducer: {
                    enums: identity({ platformEnums: {} }),
                    signingProfiles: identity({
                        signingProfile: undefined,
                        isFetchingDetail: false,
                        isCreating: false,
                        isUpdating: false,
                        signatureFormattingConnectors: [{ uuid: 'c1', name: 'PAdES Connector' }],
                        isFetchingSignatureFormattingConnectors: false,
                        signingCertificates: [{ uuid: 'cert1', commonName: 'Signing Cert', serialNumber: '123' }],
                        isFetchingSigningCertificates: false,
                        signingOperationAttributeDescriptors: [],
                        isFetchingSignatureAttributes: false,
                        signatureFormattingConnectorAttributeDescriptors: [],
                        isFetchingSignatureFormattingConnectorAttributes: false,
                    }),
                    timeQualityConfigurations: identity({
                        timeQualityConfigurations: [{ uuid: 'tqc1', name: 'High Precision' }],
                        isFetchingList: false,
                        timeQualityConfiguration: undefined,
                    }),
                    customAttributes: identity({
                        resourceCustomAttributesContents: [],
                        isFetchingResourceCustomAttributes: false,
                    }),
                    // Real reducers for infrastructure slices read by the always-mounted
                    // AttributeEditor / Widget; the form never dispatches actions that mutate
                    // them in this test, so their initial state is stable.
                    connectors: connectorsReducer,
                    userInterface: userInterfaceReducer,
                },
                middleware: (getDefault) => getDefault({ serializableCheck: false }),
            }),
        [],
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/signingprofiles/create']}>
                <SigningProfileForm />
            </MemoryRouter>
        </Provider>
    );
}
