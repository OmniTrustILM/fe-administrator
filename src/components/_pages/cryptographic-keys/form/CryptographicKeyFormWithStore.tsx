import { configureStore, type Middleware, type UnknownAction } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import CryptographicKeyForm from 'components/_pages/cryptographic-keys/form';
import {
    importWizardTestMiddleware,
    type ImportAnswer,
    type InspectAnswer,
    type ListingAnswer,
    type TokenProfileDetailAnswer,
} from 'components/_pages/certificates/ImportWizard/importWizardTestSupport';
import { slice as certificateSlice, type State as CertificateState } from 'ducks/certificates';
import { actions as keyActions, slice as keySlice, type State as KeyState } from 'ducks/cryptographic-keys';
import { actions as connectorActions } from 'ducks/connectors';
import { actions as customAttributeActions } from 'ducks/customAttributes';
import { slice as inspectionSlice, type State as InspectionState } from 'ducks/inspections';
import { testInitialState, testReducers } from 'ducks/test-reducers';
import { actions as tokenProfileActions, slice as tokenProfileSlice, type State as TokenProfileState } from 'ducks/token-profiles';
import type { AttributeDescriptorModel } from 'types/attributes';
import type { BaseAttributeDto, KeyRequestType, KeyTransferCapabilityDto, TokenProfileDto } from 'types/openapi';
import type { TokenProfileResponseModel } from 'types/token-profiles';
import { createMockStore } from 'utils/test-helpers';
import { keyPermissionsAuth } from '../../test-utils/exportDialogTestStore';
import { nth } from '../../test-utils/testAnswers';

type SharedState = Omit<ReturnType<typeof testReducers>, 'cryptographicKeys' | 'tokenprofiles' | 'certificates'> & {
    cryptographicKeys: KeyState;
    tokenprofiles: TokenProfileState;
    certificates: CertificateState;
};

type State = SharedState & { inspections: InspectionState };

function reducer(state: State | undefined, action: UnknownAction): State {
    // The test reducers know nothing of the inspections slice, so it is kept out of what they are handed.
    const { inspections, ...shared } = state ?? {};
    const sharedState = state ? (shared as SharedState) : undefined;
    return {
        ...testReducers(sharedState, action),
        cryptographicKeys: keySlice.reducer(sharedState?.cryptographicKeys, action),
        tokenprofiles: tokenProfileSlice.reducer(sharedState?.tokenprofiles, action),
        certificates: certificateSlice.reducer(sharedState?.certificates, action),
        inspections: inspectionSlice.reducer(inspections, action),
    };
}

export type CryptographicKeyFormWithStoreProps = Readonly<{
    /** Route the form is rendered under — the source of the `:id` param the form used to trust. */
    initialRoute?: string;
    routePath?: string;
    usesGlobalModal?: boolean;
    tokenProfiles?: TokenProfileResponseModel[];
    supportedKeyRequestTypesByProfile?: Record<string, KeyRequestType[]>;
    /** The chosen profile's `keyTransfer`, answered for `getTokenProfileDetail`, keyed by profile uuid. */
    keyTransferByProfile?: Record<string, KeyTransferCapabilityDto>;
    /** The answers to `getTokenProfileDetail`, taken in order; each is `loaded` unless given. */
    tokenProfileDetailAnswers?: TokenProfileDetailAnswer[];
    keyDetail?: KeyState['cryptographicKey'];
    attributeDescriptors?: AttributeDescriptorModel[];
    /** Whether the signed-in user holds the key import permission. */
    canImportKeys?: boolean;
    onAction?: (action: UnknownAction) => void;
    onSuccess?: () => void;
    onCancel?: () => void;
    /** Import material tab fixtures, answered the way `ImportWizardWithStore` answers its own mount. */
    inspectAnswers?: InspectAnswer[];
    importableTokenProfiles?: TokenProfileDto[];
    profileListings?: ListingAnswer[];
    importKeyAttributes?: BaseAttributeDto[];
    importAnswers?: ImportAnswer[];
}>;

/** See TokenProfileFormWithStore — same harness for the sibling form behind the Key dropdown's "+". */
export function CryptographicKeyFormWithStore({
    initialRoute = '/certificates/detail/certificate-uuid',
    routePath = '/certificates/detail/:id',
    usesGlobalModal = false,
    tokenProfiles,
    supportedKeyRequestTypesByProfile,
    keyTransferByProfile,
    tokenProfileDetailAnswers,
    keyDetail,
    attributeDescriptors,
    canImportKeys = true,
    onAction,
    onSuccess,
    onCancel,
    inspectAnswers,
    importableTokenProfiles,
    profileListings,
    importKeyAttributes,
    importAnswers,
}: CryptographicKeyFormWithStoreProps) {
    const store = useMemo(() => {
        const auth = keyPermissionsAuth({ importKey: canImportKeys });
        if (!tokenProfiles) return createMockStore({ auth });

        const summaries = new Map(tokenProfiles.map((profile) => [profile.uuid, profile]));
        let detailRequestsAnswered = 0;
        const apiResponses: Middleware = (api) => (next) => (action) => {
            const result = next(action);
            onAction?.(action as UnknownAction);
            if (tokenProfileActions.listTokenProfiles.match(action)) {
                api.dispatch(tokenProfileActions.listTokenProfilesSuccess({ tokenProfiles }));
            } else if (keyActions.listSupportedKeyRequestTypes.match(action)) {
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
            } else if (tokenProfileActions.getTokenProfileDetail.match(action)) {
                const answer = nth(tokenProfileDetailAnswers, detailRequestsAnswered++) ?? 'loaded';
                const summary = summaries.get(action.payload.uuid);
                if (answer === 'failure') {
                    api.dispatch(tokenProfileActions.getTokenProfileDetailFailure({ error: 'Failed to get Token Profile detail' }));
                } else if (answer === 'loaded' && summary) {
                    api.dispatch(
                        tokenProfileActions.getTokenProfileDetailSuccess({
                            tokenProfile: { ...summary, attributes: [], keyTransfer: keyTransferByProfile?.[action.payload.uuid] },
                        }),
                    );
                }
            }
            return result;
        };

        // `onAction` is already captured by `apiResponses` above, for every action regardless of who
        // handles it, so it is not repeated here — otherwise every action would be recorded twice.
        const importWizardResponses = importWizardTestMiddleware(
            {
                inspectAnswers: inspectAnswers ?? [],
                importableTokenProfiles,
                profileListings,
                importKeyAttributes,
                importAnswers,
            },
            false,
        );

        const preloadedState: State = {
            ...testInitialState,
            auth,
            tokenprofiles: { ...tokenProfileSlice.getInitialState(), tokenProfiles },
            cryptographicKeys: { ...keySlice.getInitialState(), cryptographicKey: keyDetail },
            certificates: certificateSlice.getInitialState(),
            inspections: inspectionSlice.getInitialState(),
        };

        return configureStore({
            reducer,
            middleware: (getDefaultMiddleware) =>
                getDefaultMiddleware({ serializableCheck: false }).concat(apiResponses, importWizardResponses),
            preloadedState,
        });
    }, [
        tokenProfiles,
        supportedKeyRequestTypesByProfile,
        keyTransferByProfile,
        tokenProfileDetailAnswers,
        keyDetail,
        attributeDescriptors,
        canImportKeys,
        onAction,
        inspectAnswers,
        importableTokenProfiles,
        profileListings,
        importKeyAttributes,
        importAnswers,
    ]);

    // Asks again for the token profile detail in the store, as another part of the page may while the form is open.
    const fetchDetailAgain = () => {
        const detail = (store.getState() as State).tokenprofiles.tokenProfile;
        if (!detail) return;
        store.dispatch(
            tokenProfileActions.getTokenProfileDetail({
                tokenInstanceUuid: detail.tokenInstanceUuid,
                uuid: detail.uuid,
                skipWidgetLock: true,
            }),
        );
    };

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[initialRoute]}>
                <Routes>
                    <Route
                        path={routePath}
                        element={<CryptographicKeyForm usesGlobalModal={usesGlobalModal} onSuccess={onSuccess} onCancel={onCancel} />}
                    />
                </Routes>
                {tokenProfiles && (
                    <button type="button" onClick={fetchDetailAgain}>
                        Fetch the token profile detail again
                    </button>
                )}
            </MemoryRouter>
        </Provider>
    );
}

export default CryptographicKeyFormWithStore;
