import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';

import type { AttributeDescriptorCollectionModel, AttributeDescriptorModel } from 'types/attributes';

import type {
    BulkActionModel,
    CallbackConnectorModel,
    CallbackResourceModel,
    ConnectorRequestModel,
    ConnectorResponseModel,
    ConnectorUpdateRequestModel,
    ConnectRequestModel,
    FunctionGroupModel,
    HealthModel,
} from 'types/connectors';
import { type AuthType, type ConnectInfoDto, type ConnectorInfo, ConnectorStatus, type FunctionGroupCode } from 'types/openapi';
import type { SearchRequestModel } from 'types/certificate';
import { resetSliceState } from './reducerUtils';

export type State = {
    checkedRows: string[];

    connector?: ConnectorResponseModel;
    connectorHealth?: HealthModel;
    connectorAttributes?: AttributeDescriptorCollectionModel;
    connectorAuthAttributes?: AttributeDescriptorModel[];
    connectorConnectionDetails?: FunctionGroupModel[];
    connectInfo?: ConnectInfoDto[];
    connectorInfoV2?: ConnectorInfo;
    connectors: ConnectorResponseModel[];

    callbackData: { [key: string]: unknown };

    deleteErrorMessage: string;
    bulkDeleteErrorMessages: BulkActionModel[];

    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isFetchingHealth: boolean;
    isFetchingAttributes: boolean;
    isFetchingAllAttributes: boolean;
    isFetchingAuthAttributes: boolean;
    isCreating: boolean;
    createConnectorSucceeded: boolean;
    isDeleting: boolean;
    isBulkDeleting: boolean;
    isBulkForceDeleting: boolean;
    isUpdating: boolean;
    updateConnectorSucceeded: boolean;
    isConnecting: boolean;
    isReconnecting: boolean;
    isBulkReconnecting: boolean;
    isAuthorizing: boolean;
    isBulkAuthorizing: boolean;
    isRunningCallback: { [key: string]: boolean };
    callbackSeq: { [key: string]: number };
};

function removeConnectorsByUuids(state: State, uuids: string[]) {
    uuids.forEach((uuid) => {
        const index = state.connectors.findIndex((connector) => connector.uuid === uuid);
        if (index >= 0) state.connectors.splice(index, 1);
    });
    if (state.connector && uuids.includes(state.connector.uuid)) {
        state.connector = undefined;
        state.connectorHealth = undefined;
        state.connectorAttributes = undefined;
        state.connectorConnectionDetails = undefined;
        state.connectInfo = undefined;
    }
}

export const initialState: State = {
    checkedRows: [],

    connectors: [],

    connectInfo: undefined,

    callbackData: {},

    deleteErrorMessage: '',
    bulkDeleteErrorMessages: [],

    isFetchingList: false,
    isFetchingDetail: false,
    isFetchingHealth: false,
    isFetchingAttributes: false,
    isFetchingAllAttributes: false,
    isFetchingAuthAttributes: false,
    isCreating: false,
    createConnectorSucceeded: false,
    isDeleting: false,
    isBulkDeleting: false,
    isBulkForceDeleting: false,
    isUpdating: false,
    updateConnectorSucceeded: false,
    isConnecting: false,
    isReconnecting: false,
    isBulkReconnecting: false,
    isAuthorizing: false,
    isBulkAuthorizing: false,
    isRunningCallback: {},
    callbackSeq: {},
};

export const slice = createSlice({
    name: 'connectors',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        setCheckedRows: (state, action: PayloadAction<{ checkedRows: string[] }>) => {
            state.checkedRows = action.payload.checkedRows;
        },

        clearDeleteErrorMessages: (state, action: PayloadAction<void>) => {
            state.deleteErrorMessage = '';
            state.bulkDeleteErrorMessages = [];
        },

        clearConnectionDetails: (state, action: PayloadAction<void>) => {
            state.connectorConnectionDetails = undefined;
            state.connectInfo = undefined;
        },

        clearCallbackData: (state, action: PayloadAction<void>) => {
            state.callbackData = {};
        },

        listConnectors: (state, action: PayloadAction<SearchRequestModel | undefined>) => {
            state.checkedRows = [];
            state.connectors = [];
            state.isFetchingList = true;
        },

        listConnectorsSuccess: (state, action: PayloadAction<{ connectorList: ConnectorResponseModel[] }>) => {
            state.isFetchingList = false;
            state.connectors = action.payload.connectorList;
        },

        listConnectorsFailure: (state, action: PayloadAction<void>) => {
            state.isFetchingList = false;
        },

        // New: concurrent, merge-capable listing that does not clear existing connectors
        listConnectorsMerge: (state, action: PayloadAction<{ functionGroup?: FunctionGroupCode }>) => {
            state.isFetchingList = true;
        },

        listConnectorsMergeSuccess: (state, action: PayloadAction<{ connectorList: ConnectorResponseModel[] }>) => {
            state.isFetchingList = false;
            const existingByUuid: { [uuid: string]: ConnectorResponseModel } = {};
            state.connectors.forEach((c) => (existingByUuid[c.uuid] = c));
            action.payload.connectorList.forEach((c) => (existingByUuid[c.uuid] = c));
            state.connectors = Object.values(existingByUuid);
        },

        listConnectorsMergeFailure: (state, action: PayloadAction<void>) => {
            state.isFetchingList = false;
        },

        getConnectorDetail: (state, action: PayloadAction<{ uuid: string }>) => {
            state.connector = undefined;
            state.connectorAttributes = undefined;
            state.connectorHealth = undefined;
            state.connectorConnectionDetails = undefined;
            state.connectInfo = undefined;
            state.connectorInfoV2 = undefined;
            state.isFetchingDetail = true;
        },

        getConnectorDetailSuccess: (state, action: PayloadAction<{ connector: ConnectorResponseModel }>) => {
            state.isFetchingDetail = false;

            state.connector = action.payload.connector;

            const index = state.connectors.findIndex((connector) => connector.uuid === action.payload.connector.uuid);

            if (index >= 0) {
                state.connectors[index] = action.payload.connector;
            } else {
                state.connectors.push(action.payload.connector);
            }
        },

        getConnectorDetailFailure: (state, action: PayloadAction<void>) => {
            state.isFetchingDetail = false;
        },

        getConnectorInfoV2: (state, action: PayloadAction<{ uuid: string }>) => {
            state.connectorInfoV2 = undefined;
        },

        getConnectorInfoV2Success: (state, action: PayloadAction<{ info: ConnectorInfo }>) => {
            state.connectorInfoV2 = action.payload.info;
        },

        getConnectorInfoV2Failure: (state, action: PayloadAction<void>) => {},

        getConnectorAttributesDescriptors: (
            state,
            action: PayloadAction<{ uuid: string; functionGroup: FunctionGroupCode; kind: string }>,
        ) => {
            if (
                state.connectorAttributes &&
                Object.hasOwn(state.connectorAttributes, action.payload.functionGroup) &&
                Object.hasOwn(state.connectorAttributes[action.payload.functionGroup], action.payload.kind)
            ) {
                delete state.connectorAttributes[action.payload.functionGroup][action.payload.kind];
            }

            state.isFetchingAttributes = true;
        },

        getConnectorAttributeDescriptorsSuccess: (
            state,
            action: PayloadAction<{ functionGroup: string; kind: string; attributes: AttributeDescriptorModel[] }>,
        ) => {
            state.isFetchingAllAttributes = false;
            const connectorAttributes: AttributeDescriptorCollectionModel = state.connectorAttributes ?? {};
            const group = connectorAttributes[action.payload.functionGroup] ?? {};
            group[action.payload.kind] = action.payload.attributes;
            connectorAttributes[action.payload.functionGroup] = group;
            state.connectorAttributes = connectorAttributes;
        },

        getConnectorAttributesDescriptorsFailure: (state, action: PayloadAction<void>) => {
            state.isFetchingAllAttributes = false;
        },

        getConnectorAuthAttributesDescriptors: (state, action: PayloadAction<{ authType: AuthType }>) => {
            state.connectorAuthAttributes = undefined;
            state.isFetchingAuthAttributes = true;
        },

        getConnectorAuthAttributesDescriptorsSuccess: (state, action: PayloadAction<{ attributes: AttributeDescriptorModel[] }>) => {
            state.isFetchingAuthAttributes = false;
            state.connectorAuthAttributes = action.payload.attributes;
        },

        getConnectorAuthAttributesDescriptorsFailure: (state, action: PayloadAction<void>) => {
            state.isFetchingAuthAttributes = false;
        },

        clearConnectorAuthAttributesDescriptors: (state) => {
            state.isFetchingAuthAttributes = false;
            state.connectorAuthAttributes = undefined;
        },

        getConnectorAllAttributesDescriptors: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isFetchingAllAttributes = true;
            state.connectorAttributes = undefined;
        },

        getConnectorAllAttributesDescriptorsSuccess: (
            state,
            action: PayloadAction<{ attributeDescriptorCollection: AttributeDescriptorCollectionModel }>,
        ) => {
            state.isFetchingAllAttributes = false;
            state.connectorAttributes = action.payload.attributeDescriptorCollection;
        },

        getAllConnectorAllAttributesDescriptorsFailure: (state, action: PayloadAction<void>) => {
            state.isFetchingAllAttributes = false;
        },

        getConnectorHealth: (state, action: PayloadAction<{ uuid: string }>) => {
            state.connectorHealth = undefined;
            state.isFetchingHealth = true;
        },

        getConnectorHealthSuccess: (state, action: PayloadAction<{ health: HealthModel }>) => {
            state.isFetchingHealth = false;
            state.connectorHealth = action.payload.health;
        },

        getConnectorHealthFailure: (state, action: PayloadAction<void>) => {
            state.isFetchingHealth = false;
        },

        createConnector: (state, action: PayloadAction<ConnectorRequestModel>) => {
            state.isCreating = true;
            state.createConnectorSucceeded = false;
        },

        createConnectorSuccess: (state, action: PayloadAction<{ connector: ConnectorResponseModel }>) => {
            state.isCreating = false;
            state.createConnectorSucceeded = true;

            const index = state.connectors.findIndex((connector) => connector.uuid === action.payload.connector.uuid);

            if (index >= 0) {
                state.connectors[index] = action.payload.connector;
            } else {
                state.connectors.push(action.payload.connector);
            }

            state.connector = action.payload.connector;
            state.connectorHealth = undefined;
            state.connectorAttributes = undefined;
            state.connectorConnectionDetails = undefined;
            state.connectInfo = undefined;
        },

        createConnectorFailure: (state, action: PayloadAction<void>) => {
            state.isCreating = false;
            state.createConnectorSucceeded = false;
        },

        updateConnector: (
            state,
            action: PayloadAction<{
                uuid: string;
                connectorUpdateRequest: ConnectorUpdateRequestModel;
            }>,
        ) => {
            state.isUpdating = true;
            state.updateConnectorSucceeded = false;
        },

        updateConnectorSuccess: (state, action: PayloadAction<{ connector: ConnectorResponseModel }>) => {
            state.isUpdating = false;
            state.updateConnectorSucceeded = true;

            const index = state.connectors.findIndex((connector) => connector.uuid === action.payload.connector.uuid);

            if (index >= 0) {
                state.connectors[index] = action.payload.connector;
            } else {
                state.connectors.push(action.payload.connector);
            }

            if (state.connector?.uuid === action.payload.connector.uuid) state.connector = action.payload.connector;
        },

        updateConnectorFailure: (state, action: PayloadAction<void>) => {
            state.isUpdating = false;
            state.updateConnectorSucceeded = false;
        },

        deleteConnector: (state, action: PayloadAction<{ uuid: string }>) => {
            state.deleteErrorMessage = '';
            state.isDeleting = true;
        },

        deleteConnectorSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;

            const index = state.connectors.findIndex((connector) => connector.uuid === action.payload.uuid);

            if (index >= 0) state.connectors.splice(index, 1);

            if (state.connector?.uuid === action.payload.uuid) {
                state.connector = undefined;
                state.connectorHealth = undefined;
                state.connectorAttributes = undefined;
                state.connectorConnectionDetails = undefined;
                state.connectInfo = undefined;
            }
        },

        deleteConnectorFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.deleteErrorMessage = action.payload.error || 'Unknown error';
            state.isDeleting = false;
        },

        bulkDeleteConnectors: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.bulkDeleteErrorMessages = [];
            state.isBulkDeleting = true;
        },

        bulkDeleteConnectorsSuccess: (state, action: PayloadAction<{ uuids: string[]; errors: BulkActionModel[] }>) => {
            state.isBulkDeleting = false;

            if (action.payload.errors?.length > 0) {
                state.bulkDeleteErrorMessages = action.payload.errors;
                return;
            }

            removeConnectorsByUuids(state, action.payload.uuids);
        },

        bulkDeleteConnectorsFailure: (state, action: PayloadAction<void>) => {
            state.isBulkDeleting = false;
        },

        bulkForceDeleteConnectors: (state, action: PayloadAction<{ uuids: string[]; successRedirect?: string }>) => {
            state.isBulkForceDeleting = true;
        },

        bulkForceDeleteConnectorsSuccess: (state, action: PayloadAction<{ uuids: string[]; successRedirect?: string }>) => {
            state.isBulkForceDeleting = false;
            removeConnectorsByUuids(state, action.payload.uuids);
        },

        bulkForceDeleteConnectorsFailure: (state, action: PayloadAction<void>) => {
            state.isBulkForceDeleting = false;
        },

        connectConnector: (state, action: PayloadAction<ConnectRequestModel>) => {
            state.connectorConnectionDetails = [];
            state.connectInfo = undefined;
            state.isConnecting = true;
        },

        connectConnectorSuccess: (
            state,
            action: PayloadAction<{ connectionDetails: FunctionGroupModel[]; connectInfo: ConnectInfoDto[] }>,
        ) => {
            state.isConnecting = false;
            state.connectorConnectionDetails = action.payload.connectionDetails;
            state.connectInfo = action.payload.connectInfo;
        },

        connectConnectorFailure: (state, action: PayloadAction<void>) => {
            state.isConnecting = false;
        },

        reconnectConnector: (state, action: PayloadAction<{ uuid: string }>) => {
            state.connectorConnectionDetails = undefined;
            state.connectInfo = undefined;
            state.isReconnecting = true;
        },

        reconnectConnectorSuccess: (
            state,
            action: PayloadAction<{ uuid: string; functionGroups: FunctionGroupModel[]; connectInfo?: ConnectInfoDto[] }>,
        ) => {
            state.connectorConnectionDetails = action.payload.functionGroups;
            state.connectInfo = action.payload.connectInfo ?? state.connectInfo;
            state.isReconnecting = false;
            if (state.connector) {
                state.connector.functionGroups = action.payload.functionGroups;
            }
        },

        reconnectConnectorFailure: (state, action: PayloadAction<void>) => {
            state.isReconnecting = false;
        },

        bulkReconnectConnectors: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkReconnecting = true;
        },

        bulkReconnectConnectorsSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkReconnecting = false;
        },

        bulkReconnectConnectorsFailure: (state, action: PayloadAction<void>) => {
            state.isBulkReconnecting = false;
        },

        authorizeConnector: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isAuthorizing = true;
        },

        authorizeConnectorSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isAuthorizing = false;
            state.connector!.status = ConnectorStatus.Connected;
        },

        authorizeConnectorFailure: (state, action: PayloadAction<void>) => {
            state.isAuthorizing = false;
        },

        bulkAuthorizeConnectors: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkAuthorizing = true;
        },

        bulkAuthorizeConnectorsSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkAuthorizing = false;
        },

        bulkAuthorizeConnectorsFailure: (state, action: PayloadAction<void>) => {
            state.isBulkAuthorizing = false;
        },

        callbackConnector: (
            state,
            action: PayloadAction<{
                callbackId: string;
                callbackConnector: CallbackConnectorModel;
            }>,
        ) => {
            if (state.callbackData[action.payload.callbackId]) state.callbackData[action.payload.callbackId] = undefined;

            state.isRunningCallback[action.payload.callbackId] = true;
            state.callbackSeq[action.payload.callbackId] = (state.callbackSeq[action.payload.callbackId] ?? 0) + 1;
        },

        callbackResource: (
            state,
            action: PayloadAction<{
                callbackId: string;
                callbackResource: CallbackResourceModel;
            }>,
        ) => {
            if (state.callbackData[action.payload.callbackId]) state.callbackData[action.payload.callbackId] = undefined;

            state.isRunningCallback[action.payload.callbackId] = true;
            state.callbackSeq[action.payload.callbackId] = (state.callbackSeq[action.payload.callbackId] ?? 0) + 1;
        },

        callbackSuccess: (state, action: PayloadAction<{ callbackId: string; data: object }>) => {
            state.callbackData[action.payload.callbackId] = action.payload.data;
            state.isRunningCallback[action.payload.callbackId] = false;
        },

        callbackFailure: (state, action: PayloadAction<{ callbackId: string }>) => {
            state.isRunningCallback[action.payload.callbackId] = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore.connectors;

const checkedRows = createSelector(state, (state) => state.checkedRows);

const deleteErrorMessage = createSelector(state, (state) => state.deleteErrorMessage);
const bulkDeleteErrorMessages = createSelector(state, (state) => state.bulkDeleteErrorMessages);

const connector = createSelector(state, (state) => state.connector);
const connectorHealth = createSelector(state, (state) => state.connectorHealth);
const connectorAttributes = createSelector(state, (state) => state.connectorAttributes);
const connectorAuthAttributes = createSelector(state, (state) => state.connectorAuthAttributes);
const connectorConnectionDetails = createSelector(state, (state) => state.connectorConnectionDetails);
const connectorConnectInfo = createSelector(state, (state) => state.connectInfo);
const connectorInfoV2 = createSelector(state, (state) => state.connectorInfoV2);
const callbackData = createSelector(state, (state) => state.callbackData);

const connectors = createSelector(state, (state) => state.connectors);

const isFetchingList = createSelector(state, (state) => state.isFetchingList);
const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isFetchingHealth = createSelector(state, (state) => state.isFetchingHealth);
const isFetchingAttributes = createSelector(state, (state) => state.isFetchingAttributes);
const isFetchingAllAttributes = createSelector(state, (state) => state.isFetchingAllAttributes);
const isFetchingAuthAttributes = createSelector(state, (state) => state.isFetchingAuthAttributes);
const isCreating = createSelector(state, (state) => state.isCreating);
const createConnectorSucceeded = createSelector(state, (state) => state.createConnectorSucceeded);
const isDeleting = createSelector(state, (state) => state.isDeleting);
const isBulkDeleting = createSelector(state, (state) => state.isBulkDeleting);
const isBulkForceDeleting = createSelector(state, (state) => state.isBulkForceDeleting);
const isUpdating = createSelector(state, (state) => state.isUpdating);
const updateConnectorSucceeded = createSelector(state, (state) => state.updateConnectorSucceeded);
const isConnecting = createSelector(state, (state) => state.isConnecting);
const isBulkConnecting = createSelector(state, (state) => state.isBulkReconnecting);
const isReconnecting = createSelector(state, (state) => state.isReconnecting);
const isBulkReconnecting = createSelector(state, (state) => state.isBulkReconnecting);
const isAuthorizing = createSelector(state, (state) => state.isAuthorizing);
const isBulkAuthorizing = createSelector(state, (state) => state.isBulkAuthorizing);
const isRunningCallback = createSelector(state, (state) => state.isRunningCallback);

export const selectors = {
    state,

    checkedRows,

    deleteErrorMessage,
    bulkDeleteErrorMessages,

    connector,
    connectorHealth,
    connectorAttributes,
    connectorAuthAttributes,
    connectorConnectionDetails,
    connectorConnectInfo,
    connectorInfoV2,
    connectors,
    callbackData,

    isFetchingList,
    isFetchingDetail,
    isFetchingHealth,
    isFetchingAttributes,
    isFetchingAllAttributes,
    isFetchingAuthAttributes,
    isCreating,
    createConnectorSucceeded,
    isDeleting,
    isBulkDeleting,
    isBulkForceDeleting,
    isUpdating,
    updateConnectorSucceeded,
    isConnecting,
    isBulkConnecting,
    isReconnecting,
    isBulkReconnecting,
    isAuthorizing,
    isBulkAuthorizing,
    isRunningCallback,
};

export const actions = slice.actions;

export default slice.reducer;
