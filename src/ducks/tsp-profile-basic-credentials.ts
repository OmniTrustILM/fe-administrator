import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { TspBasicCredentialCreateRequestDto, TspBasicCredentialDto, TspBasicCredentialUpdateRequestDto } from 'types/openapi';

export type State = {
    credentials: TspBasicCredentialDto[];

    isFetchingList: boolean;
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;

    saveSucceeded: boolean;
    saveErrorMessage: string;
    deleteErrorMessage: string;
};

export const initialState: State = {
    credentials: [],

    isFetchingList: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,

    saveSucceeded: false,
    saveErrorMessage: '',
    deleteErrorMessage: '',
};

export const slice = createSlice({
    name: 'tspProfileBasicCredentials',

    initialState,

    reducers: {
        resetState: (state, _action: PayloadAction<void>) => {
            Object.keys(state).forEach((key) => {
                if (!Object.hasOwn(initialState, key)) (state as any)[key] = undefined;
            });
            Object.keys(initialState).forEach((key) => {
                (state as any)[key] = (initialState as any)[key];
            });
        },

        clearSaveStatus: (state, _action: PayloadAction<void>) => {
            state.saveSucceeded = false;
            state.saveErrorMessage = '';
        },

        clearDeleteErrorMessage: (state, _action: PayloadAction<void>) => {
            state.deleteErrorMessage = '';
        },

        listBasicCredentials: (state, _action: PayloadAction<{ tspProfileUuid: string }>) => {
            state.credentials = [];
            state.isFetchingList = true;
        },

        listBasicCredentialsSuccess: (state, action: PayloadAction<{ credentials: TspBasicCredentialDto[] }>) => {
            state.credentials = action.payload.credentials;
            state.isFetchingList = false;
        },

        listBasicCredentialsFailure: (state, _action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        createBasicCredential: (state, _action: PayloadAction<{ tspProfileUuid: string; request: TspBasicCredentialCreateRequestDto }>) => {
            state.isCreating = true;
            state.saveSucceeded = false;
            state.saveErrorMessage = '';
        },

        createBasicCredentialSuccess: (state, action: PayloadAction<{ credential: TspBasicCredentialDto }>) => {
            state.isCreating = false;
            state.saveSucceeded = true;
            state.credentials.push(action.payload.credential);
        },

        createBasicCredentialFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
            state.saveSucceeded = false;
            state.saveErrorMessage = action.payload.error || 'Unknown error';
        },

        updateBasicCredential: (
            state,
            _action: PayloadAction<{ tspProfileUuid: string; uuid: string; request: TspBasicCredentialUpdateRequestDto }>,
        ) => {
            state.isUpdating = true;
            state.saveSucceeded = false;
            state.saveErrorMessage = '';
        },

        updateBasicCredentialSuccess: (state, action: PayloadAction<{ credential: TspBasicCredentialDto }>) => {
            state.isUpdating = false;
            state.saveSucceeded = true;
            const idx = state.credentials.findIndex((c) => c.uuid === action.payload.credential.uuid);
            if (idx >= 0) state.credentials[idx] = action.payload.credential;
        },

        updateBasicCredentialFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
            state.saveSucceeded = false;
            state.saveErrorMessage = action.payload.error || 'Unknown error';
        },

        deleteBasicCredential: (state, _action: PayloadAction<{ tspProfileUuid: string; uuid: string }>) => {
            state.isDeleting = true;
            state.deleteErrorMessage = '';
        },

        deleteBasicCredentialSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;
            state.credentials = state.credentials.filter((c) => c.uuid !== action.payload.uuid);
        },

        deleteBasicCredentialFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
            state.deleteErrorMessage = action.payload.error || 'Unknown error';
        },
    },
});

const state = (reduxStore: any): State => reduxStore?.[slice.name];

const credentials = createSelector(state, (state: State) => state.credentials);
const isFetchingList = createSelector(state, (state: State) => state.isFetchingList);
const isCreating = createSelector(state, (state: State) => state.isCreating);
const isUpdating = createSelector(state, (state: State) => state.isUpdating);
const isDeleting = createSelector(state, (state: State) => state.isDeleting);
const saveSucceeded = createSelector(state, (state: State) => state.saveSucceeded);
const saveErrorMessage = createSelector(state, (state: State) => state.saveErrorMessage);
const deleteErrorMessage = createSelector(state, (state: State) => state.deleteErrorMessage);

export const selectors = {
    state,
    credentials,
    isFetchingList,
    isCreating,
    isUpdating,
    isDeleting,
    saveSucceeded,
    saveErrorMessage,
    deleteErrorMessage,
};

export const actions = slice.actions;

export default slice.reducer;
