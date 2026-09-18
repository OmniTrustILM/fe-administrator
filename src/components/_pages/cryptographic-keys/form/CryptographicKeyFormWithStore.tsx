import { configureStore, type Middleware, type UnknownAction } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import CryptographicKeyForm from 'components/_pages/cryptographic-keys/form';
import { actions as keyActions, slice as keySlice, type State as KeyState } from 'ducks/cryptographic-keys';
import { actions as connectorActions } from 'ducks/connectors';
import { actions as customAttributeActions } from 'ducks/customAttributes';
import { testInitialState, testReducers } from 'ducks/test-reducers';
import type { KeyRequestType } from 'types/openapi';
import type { TokenProfileResponseModel } from 'types/token-profiles';
import type { AttributeDescriptorModel } from 'types/attributes';
import { createMockStore } from 'utils/test-helpers';

type State = Omit<ReturnType<typeof testReducers>, 'cryptographicKeys'> & { cryptographicKeys: KeyState };

function reducer(state: State | undefined, action: UnknownAction): State {
    return {
        ...testReducers(state, action),
        cryptographicKeys: keySlice.reducer(state?.cryptographicKeys, action),
    };
}

export type CryptographicKeyFormWithStoreProps = Readonly<{
    /** Route the form is rendered under — the source of the `:id` param the form used to trust. */
    initialRoute?: string;
    routePath?: string;
    usesGlobalModal?: boolean;
    tokenProfiles?: TokenProfileResponseModel[];
    supportedKeyRequestTypesByProfile?: Record<string, KeyRequestType[]>;
    keyDetail?: KeyState['cryptographicKey'];
    attributeDescriptors?: AttributeDescriptorModel[];
    onAction?: (action: UnknownAction) => void;
}>;

/** See TokenProfileFormWithStore — same harness for the sibling form behind the Key dropdown's "+". */
export function CryptographicKeyFormWithStore({
    initialRoute = '/certificates/detail/certificate-uuid',
    routePath = '/certificates/detail/:id',
    usesGlobalModal = false,
    tokenProfiles,
    supportedKeyRequestTypesByProfile,
    keyDetail,
    attributeDescriptors,
    onAction,
}: CryptographicKeyFormWithStoreProps) {
    const store = useMemo(() => {
        if (!tokenProfiles) return createMockStore();

        const apiResponses: Middleware = (api) => (next) => (action) => {
            const result = next(action);
            onAction?.(action as UnknownAction);
            if (keyActions.listSupportedKeyRequestTypes.match(action)) {
                api.dispatch(
                    keyActions.listSupportedKeyRequestTypesSuccess(
                        supportedKeyRequestTypesByProfile?.[action.payload.tokenProfileUuid] ?? [],
                    ),
                );
            } else if (keyActions.listAttributeDescriptors.match(action)) {
                api.dispatch(
                    keyActions.listAttributeDescriptorsSuccess({
                        uuid: action.payload.tokenProfileUuid,
                        attributeDescriptors: attributeDescriptors ?? [],
                    }),
                );
            } else if (connectorActions.callbackResource.match(action) || connectorActions.callbackConnector.match(action)) {
                api.dispatch(connectorActions.callbackSuccess({ callbackId: action.payload.callbackId, data: [] }));
            } else if (customAttributeActions.listResourceCustomAttributes.match(action)) {
                api.dispatch(customAttributeActions.listResourceCustomAttributesSuccess([]));
            }
            return result;
        };

        return configureStore({
            reducer,
            middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(apiResponses),
            preloadedState: {
                ...testInitialState,
                tokenprofiles: { tokenProfiles },
                cryptographicKeys: { ...keySlice.getInitialState(), cryptographicKey: keyDetail },
            },
        });
    }, [tokenProfiles, supportedKeyRequestTypesByProfile, keyDetail, attributeDescriptors, onAction]);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[initialRoute]}>
                <Routes>
                    <Route path={routePath} element={<CryptographicKeyForm usesGlobalModal={usesGlobalModal} />} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}

export default CryptographicKeyFormWithStore;
