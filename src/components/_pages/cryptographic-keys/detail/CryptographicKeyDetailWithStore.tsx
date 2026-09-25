import { configureStore, type Middleware, type UnknownAction } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import ThemeProvider from 'components/ThemeProvider';
import CryptographicKeyDetail from 'components/_pages/cryptographic-keys/detail';
import { actions as keyActions, slice as keySlice, type State as KeyState } from 'ducks/cryptographic-keys';
import {
    actions as cryptographicOperationActions,
    slice as cryptographicOperationSlice,
    type State as CryptographicOperationState,
} from 'ducks/cryptographic-operations';
import { testInitialState, testReducers } from 'ducks/test-reducers';
import { actions as profileActions, slice as profileSlice, type State as ProfileState } from 'ducks/token-profiles';
import type { CryptographicKeyDetailResponseModel } from 'types/cryptographic-keys';
import type { TokenProfileDetailResponseModel } from 'types/token-profiles';
import type { AttributeDescriptorModel } from 'types/attributes';

type State = Omit<ReturnType<typeof testReducers>, 'cryptographicKeys' | 'tokenprofiles' | 'cryptographicOperations'> & {
    cryptographicKeys: KeyState;
    tokenprofiles: ProfileState;
    cryptographicOperations: CryptographicOperationState;
};

function reducer(state: State | undefined, action: UnknownAction): State {
    const testState = state && { ...state, cryptographicOperations: testInitialState.cryptographicOperations };
    return {
        ...testReducers(testState, action),
        cryptographicKeys: keySlice.reducer(state?.cryptographicKeys, action),
        tokenprofiles: profileSlice.reducer(state?.tokenprofiles, action),
        cryptographicOperations: cryptographicOperationSlice.reducer(state?.cryptographicOperations, action),
    };
}

type Props = Readonly<{
    cryptographicKey: CryptographicKeyDetailResponseModel;
    tokenProfile?: TokenProfileDetailResponseModel;
    signatureDescriptors?: AttributeDescriptorModel[];
    onAction?: (action: UnknownAction) => void;
}>;

export default function CryptographicKeyDetailWithStore({ cryptographicKey, tokenProfile, signatureDescriptors, onAction }: Props) {
    const store = useMemo(() => {
        // Resolve API requests in memory while keeping the real key/profile state transitions.
        let hasResolvedProfileRequest = false;
        const apiResponses: Middleware = (api) => (next) => (action) => {
            const result = next(action);
            if (keyActions.getCryptographicKeyDetail.match(action)) {
                api.dispatch(keyActions.getCryptographicKeyDetailSuccess({ cryptographicKey }));
            } else if (keyActions.getHistory.match(action)) {
                api.dispatch(keyActions.getHistorySuccess({ keyItemUuid: action.payload.keyItemUuid, keyHistory: [] }));
            } else if (profileActions.getTokenProfileDetail.match(action) && tokenProfile && !hasResolvedProfileRequest) {
                hasResolvedProfileRequest = true;
                api.dispatch(profileActions.getTokenProfileDetailSuccess({ tokenProfile }));
            } else if (cryptographicOperationActions.listSignatureAttributeDescriptors.match(action) && signatureDescriptors) {
                api.dispatch(
                    cryptographicOperationActions.listSignatureAttributeDescriptorsSuccess({
                        uuid: action.payload.uuid,
                        attributeDescriptors: signatureDescriptors,
                    }),
                );
            }
            onAction?.(action as UnknownAction);
            return result;
        };
        return configureStore({
            reducer,
            middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(apiResponses),
        });
    }, [cryptographicKey, tokenProfile, signatureDescriptors, onAction]);

    return (
        <Provider store={store}>
            <ThemeProvider>
                <MemoryRouter initialEntries={[`/keys/detail/${cryptographicKey.uuid}`]}>
                    <Routes>
                        <Route path="/keys/detail/:id" element={<CryptographicKeyDetail />} />
                    </Routes>
                    {tokenProfile && (
                        <>
                            <button type="button" onClick={() => store.dispatch(profileActions.getTokenProfileDetail(tokenProfile))}>
                                Refresh profile
                            </button>
                            <button
                                type="button"
                                onClick={() => store.dispatch(profileActions.getTokenProfileDetailSuccess({ tokenProfile }))}
                            >
                                Complete profile request
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={() => store.dispatch(profileActions.getTokenProfileDetailFailure({ error: 'Profile unavailable' }))}
                    >
                        Fail profile request
                    </button>
                </MemoryRouter>
            </ThemeProvider>
        </Provider>
    );
}
