import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import type {
    ConnectorMetadataResponseModel,
    GlobalMetadataCreateRequestModel,
    GlobalMetadataDetailResponseModel,
    GlobalMetadataResponseModel,
    GlobalMetadataUpdateRequestModel,
} from '../types/globalMetadata';
import type { NameAndUuidModel } from '../types/locations';

export type State = {
    checkedRows: string[];

    globalMetadata?: GlobalMetadataDetailResponseModel;
    globalMetadataList: GlobalMetadataResponseModel[];
    connectorList?: NameAndUuidModel[];
    connectorMetadata?: ConnectorMetadataResponseModel[];

    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isFetchingConnectorMetadata: boolean;
    isCreating: boolean;
    createGlobalMetadataSucceeded: boolean;
    isDeleting: boolean;
    isBulkDeleting: boolean;
    isUpdating: boolean;
    updateGlobalMetadataSucceeded: boolean;
};

export const initialState: State = {
    checkedRows: [],
    globalMetadataList: [],
    isFetchingList: false,
    isFetchingDetail: false,
    isFetchingConnectorMetadata: false,
    isCreating: false,
    createGlobalMetadataSucceeded: false,
    isDeleting: false,
    isBulkDeleting: false,
    isUpdating: false,
    updateGlobalMetadataSucceeded: false,
};

export const slice = createSlice({
    name: 'globalMetadata',
    initialState,
    reducers: {
        setCheckedRows: (state, action: PayloadAction<{ checkedRows: string[] }>) => {
            state.checkedRows = action.payload.checkedRows;
        },

        listGlobalMetadata: (state, action: PayloadAction<void>) => {
            state.globalMetadataList = [];
            state.isFetchingList = true;
        },

        listGlobalMetadataSuccess: (state, action: PayloadAction<GlobalMetadataResponseModel[]>) => {
            state.globalMetadataList = action.payload;
            state.isFetchingList = false;
        },

        listGlobalMetadataFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        createGlobalMetadata: (state, action: PayloadAction<GlobalMetadataCreateRequestModel>) => {
            state.isCreating = true;
            state.createGlobalMetadataSucceeded = false;
        },

        createGlobalMetadataSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isCreating = false;
            state.createGlobalMetadataSucceeded = true;
        },

        createGlobalMetadataFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
            state.createGlobalMetadataSucceeded = false;
        },

        updateGlobalMetadata: (
            state,
            action: PayloadAction<{ uuid: string; globalMetadataUpdateRequest: GlobalMetadataUpdateRequestModel }>,
        ) => {
            state.isUpdating = true;
            state.updateGlobalMetadataSucceeded = false;
        },

        updateGlobalMetadataSuccess: (state, action: PayloadAction<GlobalMetadataDetailResponseModel>) => {
            state.isUpdating = false;
            state.globalMetadata = action.payload;
            state.updateGlobalMetadataSucceeded = true;
        },

        updateGlobalMetadataFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
            state.updateGlobalMetadataSucceeded = false;
        },

        getGlobalMetadata: (state, action: PayloadAction<string>) => {
            state.globalMetadata = undefined;
            state.isFetchingDetail = true;
        },

        getGlobalMetadataSuccess: (state, action: PayloadAction<GlobalMetadataDetailResponseModel>) => {
            state.globalMetadata = action.payload;
            state.isFetchingDetail = false;
        },

        getGlobalMetadataFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        getConnectorList: (state, action: PayloadAction<void>) => {
            state.isFetchingConnectorMetadata = true;
        },

        getConnectorListSuccess: (state, action: PayloadAction<NameAndUuidModel[]>) => {
            state.connectorList = action.payload;
            state.isFetchingConnectorMetadata = false;
        },

        getConnectorListFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingConnectorMetadata = false;
        },

        getConnectorMetadata: (state, action: PayloadAction<string>) => {
            state.isFetchingConnectorMetadata = true;
            state.connectorMetadata = undefined;
        },

        getConnectorMetadataSuccess: (state, action: PayloadAction<ConnectorMetadataResponseModel[]>) => {
            state.connectorMetadata = action.payload;
            state.isFetchingConnectorMetadata = false;
        },

        getConnectorMetadataFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingConnectorMetadata = false;
        },

        promoteConnectorMetadata: (state, action: PayloadAction<{ uuid: string; connectorUuid: string }>) => {},

        promoteConnectorMetadataSuccess: (
            state,
            action: PayloadAction<{ uuid: string; globalMetadata: GlobalMetadataDetailResponseModel }>,
        ) => {
            state.globalMetadataList = [...state.globalMetadataList, action.payload.globalMetadata];
            const index = state.connectorMetadata?.findIndex((metadata) => metadata.uuid === action.payload.uuid) ?? -1;
            if (index !== -1) state.connectorMetadata!.splice(index, 1);
        },

        promoteConnectorMetadataFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {},

        deleteGlobalMetadata: (state, action: PayloadAction<string>) => {
            state.isDeleting = true;
        },

        deleteGlobalMetadataSuccess: (state, action: PayloadAction<string>) => {
            state.isDeleting = false;
            const index = state.globalMetadataList.findIndex((metadata) => metadata.uuid === action.payload);
            if (index !== -1) state.globalMetadataList.splice(index, 1);
        },

        deleteGlobalMetadataFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
        },

        bulkDeleteGlobalMetadata: (state, action: PayloadAction<string[]>) => {
            state.isBulkDeleting = true;
        },

        bulkDeleteGlobalMetadataSuccess: (state, action: PayloadAction<string[]>) => {
            state.isBulkDeleting = false;
            action.payload.forEach((uuid) => {
                const index = state.globalMetadataList.findIndex((metadata) => metadata.uuid === uuid);
                if (index >= 0) {
                    state.globalMetadataList.splice(index, 1);
                }
            });
            if (state.globalMetadata && action.payload.includes(state.globalMetadata.uuid)) {
                state.globalMetadata = undefined;
            }
            state.checkedRows = [];
        },

        bulkDeleteGlobalMetadataFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeleting = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const checkedRows = createSelector(state, (state: State) => state.checkedRows);

const globalMetadata = createSelector(state, (state: State) => state.globalMetadata);
const globalMetadataList = createSelector(state, (state: State) => state.globalMetadataList);
const connectorList = createSelector(state, (state: State) => state.connectorList);
const connectorMetadata = createSelector(state, (state: State) => state.connectorMetadata);

const isFetchingList = createSelector(state, (state: State) => state.isFetchingList);
const isFetchingDetail = createSelector(state, (state: State) => state.isFetchingDetail);
const isFetchingConnectorMetadata = createSelector(state, (state: State) => state.isFetchingConnectorMetadata);
const isCreating = createSelector(state, (state: State) => state.isCreating);
const createGlobalMetadataSucceeded = createSelector(state, (state: State) => state.createGlobalMetadataSucceeded);
const isDeleting = createSelector(state, (state: State) => state.isDeleting);
const isBulkDeleting = createSelector(state, (state: State) => state.isBulkDeleting);
const isUpdating = createSelector(state, (state: State) => state.isUpdating);
const updateGlobalMetadataSucceeded = createSelector(state, (state: State) => state.updateGlobalMetadataSucceeded);

export const selectors = {
    state,

    checkedRows,

    globalMetadata,
    globalMetadataList,
    connectorList,
    connectorMetadata,

    isCreating,
    createGlobalMetadataSucceeded,
    isFetchingList,
    isFetchingDetail,
    isFetchingConnectorMetadata,
    isDeleting,
    isBulkDeleting,
    isUpdating,
    updateGlobalMetadataSucceeded,
};

export const actions = slice.actions;

export default slice.reducer;
