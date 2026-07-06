import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import { resetSliceState } from 'ducks/reducerUtils';
import type { AttributeDescriptorModel } from 'types/attributes';
import type {
    CryptographicKeyRandomDataRequestModel,
    CryptographicKeyRandomDataResponseModel,
    CryptographicKeySignDataRequestModel,
    CryptographicKeySignResponseModel,
    CryptographicKeyVerifyDataRequestModel,
    CryptographicKeyVerifyResponseModel,
} from 'types/cryptographic-operations';
import type { KeyAlgorithm } from 'types/openapi';
import { downloadFile } from 'utils/download';

export type State = {
    signatureAttributeDescriptors?: AttributeDescriptorModel[];
    altSignatureAttributeDescriptors?: AttributeDescriptorModel[];
    cipherAttributeDescriptors?: AttributeDescriptorModel[];
    randomDataAttributeDescriptors?: AttributeDescriptorModel[];

    isEncrypting: boolean;
    isDecrypting: boolean;
    isSigning: boolean;
    isVerifying: boolean;
    isGeneratingRandomData: boolean;

    isFetchingSignatureAttributes: boolean;
    isFetchingCipherAttributes: boolean;
    isFetchingRandomDataAttributes: boolean;
};

export const initialState: State = {
    cipherAttributeDescriptors: [],
    signatureAttributeDescriptors: [],
    altSignatureAttributeDescriptors: [],
    randomDataAttributeDescriptors: [],

    isEncrypting: false,
    isDecrypting: false,
    isSigning: false,
    isVerifying: false,
    isGeneratingRandomData: false,

    isFetchingSignatureAttributes: false,
    isFetchingCipherAttributes: false,
    isFetchingRandomDataAttributes: false,
};

export const slice = createSlice({
    name: 'cryptographicOperations',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        clearSignatureAttributeDescriptors: (state, action: PayloadAction<'alt' | 'normal' | undefined>) => {
            if (action.payload === 'alt') {
                state.altSignatureAttributeDescriptors = [];
            } else {
                state.signatureAttributeDescriptors = [];
            }
        },

        clearCipherAttributeDescriptors: (state, action: PayloadAction<void>) => {
            state.cipherAttributeDescriptors = [];
        },

        clearRandomDataAttributeDescriptors: (state, action: PayloadAction<void>) => {
            state.randomDataAttributeDescriptors = [];
        },

        listSignatureAttributeDescriptors: (
            state,
            action: PayloadAction<{
                tokenInstanceUuid: string;
                tokenProfileUuid: string;
                uuid: string;
                keyItemUuid: string;
                algorithm: KeyAlgorithm;
                store?: 'alt' | 'normal';
            }>,
        ) => {
            state.isFetchingSignatureAttributes = true;
        },

        listSignatureAttributeDescriptorsSuccess: (
            state,
            action: PayloadAction<{ uuid: string; attributeDescriptors: AttributeDescriptorModel[]; store?: 'alt' | 'normal' }>,
        ) => {
            state.isFetchingSignatureAttributes = false;
            if (action.payload.store === 'alt') {
                state.altSignatureAttributeDescriptors = action.payload.attributeDescriptors;
            } else {
                state.signatureAttributeDescriptors = action.payload.attributeDescriptors;
            }
        },

        listSignatureAttributesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingSignatureAttributes = false;
        },

        listCipherAttributeDescriptors: (
            state,
            action: PayloadAction<{
                tokenInstanceUuid: string;
                tokenProfileUuid: string;
                uuid: string;
                keyItemUuid: string;
                algorithm: KeyAlgorithm;
            }>,
        ) => {
            state.isFetchingCipherAttributes = true;
        },

        listCipherAttributeDescriptorsSuccess: (
            state,
            action: PayloadAction<{ uuid: string; attributeDescriptors: AttributeDescriptorModel[] }>,
        ) => {
            state.isFetchingCipherAttributes = false;

            state.cipherAttributeDescriptors = action.payload.attributeDescriptors;
        },

        listCipherAttributesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingCipherAttributes = false;
        },

        listRandomAttributeDescriptors: (state, action: PayloadAction<{ tokenInstanceUuid: string }>) => {
            state.isFetchingRandomDataAttributes = true;
        },

        listRandomAttributeDescriptorsSuccess: (
            state,
            action: PayloadAction<{ uuid: string; attributeDescriptors: AttributeDescriptorModel[] }>,
        ) => {
            state.isFetchingRandomDataAttributes = false;

            state.randomDataAttributeDescriptors = action.payload.attributeDescriptors;
        },

        listRandomAttributesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingRandomDataAttributes = false;
        },

        signData: (
            state,
            action: PayloadAction<{
                tokenInstanceUuid: string;
                tokenProfileUuid: string;
                uuid: string;
                keyItemUuid: string;
                request: CryptographicKeySignDataRequestModel;
            }>,
        ) => {
            state.isSigning = true;
        },

        signDataSuccess: (state, action: PayloadAction<{ uuid: string; signature: CryptographicKeySignResponseModel }>) => {
            state.isSigning = false;
            downloadFile(atob(action.payload.signature?.signatures[0]?.data), 'signature.sign', 'application/octet-stream');
        },

        signDataFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isSigning = false;
        },

        verifyData: (
            state,
            action: PayloadAction<{
                tokenInstanceUuid: string;
                tokenProfileUuid: string;
                uuid: string;
                keyItemUuid: string;
                request: CryptographicKeyVerifyDataRequestModel;
            }>,
        ) => {
            state.isVerifying = true;
        },

        verifyDataSuccess: (state, action: PayloadAction<{ uuid: string; signature: CryptographicKeyVerifyResponseModel }>) => {
            state.isVerifying = false;
            downloadFile(JSON.stringify(action.payload.signature), 'verification-result.json');
        },

        verifyDataFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isVerifying = false;
        },

        generateRandomData: (
            state,
            action: PayloadAction<{ tokenInstanceUuid: string; request: CryptographicKeyRandomDataRequestModel }>,
        ) => {
            state.isGeneratingRandomData = true;
        },

        generateRandomDataSuccess: (
            state,
            action: PayloadAction<{ uuid: string; randomData: CryptographicKeyRandomDataResponseModel }>,
        ) => {
            state.isGeneratingRandomData = false;
            downloadFile(atob(action.payload.randomData.data), 'generated-random-data');
        },

        generateRandomDataFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isGeneratingRandomData = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const signatureAttributeDescriptors = createSelector(state, (state: State) => state.signatureAttributeDescriptors);
const altSignatureAttributeDescriptors = createSelector(state, (state: State) => state.altSignatureAttributeDescriptors);
const cipherAttributeDescriptors = createSelector(state, (state: State) => state.cipherAttributeDescriptors);
const randomDataAttributeDescriptors = createSelector(state, (state: State) => state.randomDataAttributeDescriptors);

const isSigning = createSelector(state, (state: State) => state.isSigning);
const isVerifying = createSelector(state, (state: State) => state.isVerifying);
const isGeneratingRandomData = createSelector(state, (state: State) => state.isGeneratingRandomData);
const isEncrypting = createSelector(state, (state: State) => state.isEncrypting);
const isDecrypting = createSelector(state, (state: State) => state.isDecrypting);

const isFetchingSignatureAttributes = createSelector(state, (state: State) => state.isFetchingSignatureAttributes);
const isFetchingCipherAttributes = createSelector(state, (state: State) => state.isFetchingCipherAttributes);
const isFetchingRandomDataAttributes = createSelector(state, (state: State) => state.isFetchingRandomDataAttributes);

export const selectors = {
    state,

    signatureAttributeDescriptors,
    altSignatureAttributeDescriptors,
    cipherAttributeDescriptors,
    randomDataAttributeDescriptors,

    isSigning,
    isVerifying,
    isGeneratingRandomData,
    isEncrypting,
    isDecrypting,

    isFetchingSignatureAttributes,
    isFetchingCipherAttributes,
    isFetchingRandomDataAttributes,
};

export const actions = slice.actions;

export default slice.reducer;
