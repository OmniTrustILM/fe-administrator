import { combineReducers, configureStore, type Reducer } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useMemo } from 'react';
import connectorsReducer from 'ducks/connectors';
import userInterfaceReducer from 'ducks/user-interface';
import {
    CertificateRelationType,
    CertificateState,
    CertificateType,
    ManagedSigningType,
    SigningRecordPersistenceMode,
    SigningScheme,
    SigningWorkflowType,
    type SigningProfileDto,
} from 'types/openapi';
import SigningProfileForm from './SigningProfileForm';
import { EXISTING_POLICY_ID } from './signingProfileFormFixtures';

// Identity reducer for building a lightweight, inert test store (no epics, reducers are no-ops).
const identity =
    <S,>(initial: S): Reducer<S> =>
    (state) =>
        state ?? initial;

const EDIT_UUID = 'sp1';

const existingSigningProfile: SigningProfileDto = {
    uuid: EDIT_UUID,
    name: 'ExistingProfile',
    description: 'An existing timestamping profile',
    version: 1,
    enabled: true,
    workflow: {
        type: SigningWorkflowType.Timestamping,
        signatureFormattingConnector: { uuid: 'c1', name: 'PAdES Connector' },
        signatureFormattingConnectorAttributes: [],
        qualifiedTimestamp: false,
        validateTokenSignature: false,
        defaultPolicyId: EXISTING_POLICY_ID,
        allowedPolicyIds: [EXISTING_POLICY_ID],
        allowedDigestAlgorithms: [],
    },
    signingScheme: {
        signingScheme: SigningScheme.Managed,
        managedSigningType: ManagedSigningType.StaticKey,
        certificate: {
            uuid: 'cert1',
            commonName: 'Signing Cert',
            serialNumber: '123',
            certificateType: CertificateType.X509,
            state: CertificateState.Issued,
            relationType: CertificateRelationType.Renewal,
            subjectDn: 'CN=Signing Cert',
            publicKeyAlgorithm: 'RSA',
        },
        signingOperationAttributes: [],
    },
    recordPolicy: {
        recordingEnabled: false,
        recordRequestMetadata: false,
        recordSignature: false,
        recordSignedDocument: false,
        recordDtbs: false,
        persistenceMode: SigningRecordPersistenceMode.DeferredDurable,
    },
    customAttributes: [],
};

export function SigningProfileFormTestWrapper({ editMode = false }: Readonly<{ editMode?: boolean }>) {
    const store = useMemo(
        () =>
            configureStore({
                reducer: combineReducers({
                    enums: identity({ platformEnums: {} }),
                    signingProfiles: identity({
                        signingProfile: editMode ? existingSigningProfile : undefined,
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
                }),
                middleware: (getDefault) => getDefault({ serializableCheck: false }),
            }),
        [editMode],
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[editMode ? `/signingprofiles/edit/${EDIT_UUID}` : '/signingprofiles/add']}>
                <Routes>
                    <Route path="/signingprofiles/add" element={<SigningProfileForm />} />
                    <Route path="/signingprofiles/edit/:id" element={<SigningProfileForm />} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}
