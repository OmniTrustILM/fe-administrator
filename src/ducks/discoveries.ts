import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AttributeDescriptorModel } from 'types/attributes';
import type { SearchRequestModel } from 'types/certificate';
import type { ConnectorResponseModel } from 'types/connectors';
import type {
    DiscoveryCertificateListModel,
    DiscoveryRequestModel,
    DiscoveryResponseDetailModel,
    DiscoveryResponseModel,
} from 'types/discoveries';
import type { GetDiscoveryCertificatesRequest } from '../types/openapi';
import { resetSliceState } from 'ducks/reducerUtils';
import type { AppState } from 'ducks';

export type State = {
    discovery?: DiscoveryResponseDetailModel;
    discoveries: DiscoveryResponseModel[];

    discoveryProviders?: ConnectorResponseModel[];
    discoveryProviderAttributeDescriptors?: AttributeDescriptorModel[];

    discoveryCertificates?: DiscoveryCertificateListModel;

    isFetchingDiscoveryProviders: boolean;
    isFetchingDiscoveryProviderAttributeDescriptors: boolean;
    isFetchingDiscoveryCertificates: boolean;

    isFetchingDetail: boolean;
    isCreating: boolean;
    createDiscoverySucceeded: boolean;
    isDeleting: boolean;
    isBulkDeleting: boolean;
};

export const initialState: State = {
    discoveries: [],

    isFetchingDiscoveryProviders: false,
    isFetchingDiscoveryProviderAttributeDescriptors: false,
    isFetchingDiscoveryCertificates: false,

    isFetchingDetail: false,
    isCreating: false,
    createDiscoverySucceeded: false,
    isDeleting: false,
    isBulkDeleting: false,
};

export const slice = createSlice({
    name: 'discoveries',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        clearDiscoveryProviderAttributeDescriptors: (state, action: PayloadAction<void>) => {
            state.discoveryProviderAttributeDescriptors = [];
        },

        listDiscoveryProviders: (state, action: PayloadAction<void>) => {
            state.discoveryProviders = undefined;
            state.isFetchingDiscoveryProviders = true;
        },

        listDiscoveryProvidersSuccess: (state, action: PayloadAction<{ connectors: ConnectorResponseModel[] }>) => {
            state.discoveryProviders = action.payload.connectors;
            state.isFetchingDiscoveryProviders = false;
        },

        listDiscoveryProvidersFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDiscoveryProviders = false;
        },

        getDiscoveryProviderAttributesDescriptors: (state, action: PayloadAction<{ uuid: string; kind: string }>) => {
            state.discoveryProviderAttributeDescriptors = [];
            state.isFetchingDiscoveryProviderAttributeDescriptors = true;
        },

        getDiscoveryProviderAttributesDescriptorsSuccess: (
            state,
            action: PayloadAction<{ attributeDescriptor: AttributeDescriptorModel[] }>,
        ) => {
            state.discoveryProviderAttributeDescriptors = action.payload.attributeDescriptor;
            state.isFetchingDiscoveryProviderAttributeDescriptors = false;
        },

        getDiscoveryProviderAttributeDescriptorsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDiscoveryProviderAttributeDescriptors = false;
        },

        getDiscoveryCertificates: (state, action: PayloadAction<GetDiscoveryCertificatesRequest>) => {
            state.discoveryCertificates = undefined;
            state.isFetchingDiscoveryCertificates = true;
        },

        getDiscoveryCertificatesSuccess: (state, action: PayloadAction<DiscoveryCertificateListModel>) => {
            state.discoveryCertificates = action.payload;
            state.isFetchingDiscoveryCertificates = false;
        },

        getDiscoveryCertificatesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDiscoveryCertificates = false;
        },

        listDiscoveries: (state, action: PayloadAction<SearchRequestModel>) => {
            state.discoveries = [];
        },

        listDiscoveriesSuccess: (state, action: PayloadAction<DiscoveryResponseModel[]>) => {
            state.discoveries = action.payload;
        },

        getDiscoveryDetail: (state, action: PayloadAction<{ uuid: string }>) => {
            state.discovery = undefined;
            state.isFetchingDetail = true;
        },

        getDiscoveryDetailSuccess: (state, action: PayloadAction<{ discovery: DiscoveryResponseDetailModel }>) => {
            state.isFetchingDetail = false;

            state.discovery = action.payload.discovery;

            const discoveryIndex = state.discoveries.findIndex((discovery) => discovery.uuid === action.payload.discovery.uuid);

            if (discoveryIndex >= 0) {
                state.discoveries[discoveryIndex] = action.payload.discovery;
            } else {
                state.discoveries.push(action.payload.discovery);
            }
        },

        getDiscoveryDetailFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        createDiscovery: (
            state,
            action: PayloadAction<{
                scheduled: boolean;
                jobName?: string;
                cronExpression?: string;
                oneTime?: boolean;
                request: DiscoveryRequestModel;
            }>,
        ) => {
            state.isCreating = true;
            state.createDiscoverySucceeded = false;
        },

        createDiscoverySuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isCreating = false;
            state.createDiscoverySucceeded = true;
        },

        createDiscoveryFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
            state.createDiscoverySucceeded = false;
        },

        deleteDiscovery: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = true;
        },

        deleteDiscoverySuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;

            const index = state.discoveries.findIndex((a) => a.uuid === action.payload.uuid);

            if (index !== -1) state.discoveries.splice(index, 1);

            if (state.discovery?.uuid === action.payload.uuid) state.discovery = undefined;
        },

        deleteDiscoveryFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
        },

        bulkDeleteDiscovery: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDeleting = true;
        },

        bulkDeleteDiscoverySuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDeleting = false;

            action.payload.uuids.forEach((uuid) => {
                const index = state.discoveries.findIndex((discovery) => discovery.uuid === uuid);
                if (index !== -1) state.discoveries.splice(index, 1);
            });

            if (state.discovery && action.payload.uuids.includes(state.discovery.uuid)) state.discovery = undefined;
        },

        bulkDeleteDiscoveryFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeleting = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const discoveryProviders = createSelector(state, (state) => state.discoveryProviders);
const discoveryProviderAttributeDescriptors = createSelector(state, (state) => state.discoveryProviderAttributeDescriptors);

const discoveryCertificates = createSelector(state, (state) => state.discoveryCertificates);

const discovery = createSelector(state, (state) => state.discovery);
const discoveries = createSelector(state, (state) => state.discoveries);

const isFetchingDiscoveryProviders = createSelector(state, (state) => state.isFetchingDiscoveryProviders);
const isFetchingDiscoveryProviderAttributeDescriptors = createSelector(
    state,
    (state) => state.isFetchingDiscoveryProviderAttributeDescriptors,
);
const isFetchingDiscoveryCertificates = createSelector(state, (state) => state.isFetchingDiscoveryCertificates);

const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isCreating = createSelector(state, (state) => state.isCreating);
const createDiscoverySucceeded = createSelector(state, (state) => state.createDiscoverySucceeded);
const isDeleting = createSelector(state, (state) => state.isDeleting);
const isBulkDeleting = createSelector(state, (state) => state.isBulkDeleting);

export const selectors = {
    state,

    discoveryProviders,
    discoveryProviderAttributeDescriptors,

    discoveryCertificates,

    discovery,
    discoveries,

    isFetchingDiscoveryProviders,
    isFetchingDiscoveryProviderAttributeDescriptors,
    isFetchingDiscoveryCertificates,

    isFetchingDetail,
    isCreating,
    createDiscoverySucceeded,
    isDeleting,
    isBulkDeleting,
};

export const actions = slice.actions;

export default slice.reducer;
