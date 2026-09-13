import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AttributeDescriptorModel } from 'types/attributes';
import type { SearchRequestModel } from 'types/certificate';
import type { ConnectorResponseModel } from 'types/connectors';
import type {
    DiscoveryCertificateListModel,
    DiscoveryItemListModel,
    DiscoveryMessageListModel,
    DiscoveryRequestModel,
    DiscoveryResponseDetailModel,
    DiscoveryResponseModel,
} from 'types/discoveries';
import type { GetDiscoveryCertificatesRequest, GetDiscoveryItemsRequest, GetDiscoveryRunMessagesRequest, Resource } from '../types/openapi';
import { resetSliceState } from 'ducks/reducerUtils';
import type { AppState } from 'ducks';

export type State = {
    discovery?: DiscoveryResponseDetailModel;
    discoveries: DiscoveryResponseModel[];

    discoveryProviders?: ConnectorResponseModel[];
    discoveryProviderAttributeDescriptors?: AttributeDescriptorModel[];
    // Keyed by resource wire code: what a v2 connector advertises for one resource type at a time.
    discoveryProviderResourceAttributeDescriptors: { [resource: string]: AttributeDescriptorModel[] };
    // Resource wire codes a v2 connector can discover; the relay synthesizes ["certificates"] for a v1 connector.
    discoveryResources?: Resource[];

    discoveryCertificates?: DiscoveryCertificateListModel;
    discoveryItems?: DiscoveryItemListModel;
    discoveryMessages?: DiscoveryMessageListModel;

    isFetchingDiscoveryProviders: boolean;
    isFetchingDiscoveryProviderAttributeDescriptors: boolean;
    // Several resources may be in flight at once, so this holds the codes rather than one flag.
    fetchingResourceAttributeDescriptors: string[];
    isFetchingDiscoveryResources: boolean;
    isFetchingDiscoveryCertificates: boolean;
    isFetchingDiscoveryItems: boolean;
    isFetchingDiscoveryMessages: boolean;

    isFetchingDetail: boolean;
    isCreating: boolean;
    createDiscoverySucceeded: boolean;
    isDeleting: boolean;
    isBulkDeleting: boolean;
    isStopping: boolean;
    isResuming: boolean;
    isCancelling: boolean;
};

export const initialState: State = {
    discoveries: [],
    discoveryProviderResourceAttributeDescriptors: {},

    isFetchingDiscoveryProviders: false,
    isFetchingDiscoveryProviderAttributeDescriptors: false,
    fetchingResourceAttributeDescriptors: [],
    isFetchingDiscoveryResources: false,
    isFetchingDiscoveryCertificates: false,
    isFetchingDiscoveryItems: false,
    isFetchingDiscoveryMessages: false,

    isFetchingDetail: false,
    isCreating: false,
    createDiscoverySucceeded: false,
    isDeleting: false,
    isBulkDeleting: false,
    isStopping: false,
    isResuming: false,
    isCancelling: false,
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

        // v1: kind-scoped definitions from the connector's function-group endpoint.
        getDiscoveryProviderAttributesDescriptors: (state, action: PayloadAction<{ uuid: string; kind: string }>) => {
            state.discoveryProviderAttributeDescriptors = [];
            state.isFetchingDiscoveryProviderAttributeDescriptors = true;
        },

        // v2: run-level definitions relayed from the connector's DISCOVERY interface; lands in the same success action.
        getDiscoveryInterfaceAttributesDescriptors: (state, action: PayloadAction<{ connectorUuid: string }>) => {
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

        getDiscoveryResourceAttributesDescriptors: (state, action: PayloadAction<{ connectorUuid: string; resource: Resource }>) => {
            delete state.discoveryProviderResourceAttributeDescriptors[action.payload.resource];
            if (!state.fetchingResourceAttributeDescriptors.includes(action.payload.resource)) {
                state.fetchingResourceAttributeDescriptors.push(action.payload.resource);
            }
        },

        getDiscoveryResourceAttributesDescriptorsSuccess: (
            state,
            action: PayloadAction<{ resource: Resource; attributeDescriptor: AttributeDescriptorModel[] }>,
        ) => {
            state.discoveryProviderResourceAttributeDescriptors[action.payload.resource] = action.payload.attributeDescriptor;
            state.fetchingResourceAttributeDescriptors = state.fetchingResourceAttributeDescriptors.filter(
                (resource) => resource !== action.payload.resource,
            );
        },

        getDiscoveryResourceAttributesDescriptorsFailure: (
            state,
            action: PayloadAction<{ resource: Resource; error: string | undefined }>,
        ) => {
            state.fetchingResourceAttributeDescriptors = state.fetchingResourceAttributeDescriptors.filter(
                (resource) => resource !== action.payload.resource,
            );
        },

        // Without a resource, drops every per-resource set: the provider changed under them.
        clearDiscoveryResourceAttributeDescriptors: (state, action: PayloadAction<{ resource?: Resource }>) => {
            if (action.payload.resource) {
                delete state.discoveryProviderResourceAttributeDescriptors[action.payload.resource];
            } else {
                state.discoveryProviderResourceAttributeDescriptors = {};
            }
        },

        listDiscoveryResources: (state, action: PayloadAction<{ connectorUuid: string }>) => {
            state.discoveryResources = undefined;
            state.isFetchingDiscoveryResources = true;
        },

        listDiscoveryResourcesSuccess: (state, action: PayloadAction<{ resources: Resource[] }>) => {
            state.discoveryResources = action.payload.resources;
            state.isFetchingDiscoveryResources = false;
        },

        listDiscoveryResourcesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDiscoveryResources = false;
        },

        clearDiscoveryResources: (state, action: PayloadAction<void>) => {
            state.discoveryResources = undefined;
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

        getDiscoveryItems: (state, action: PayloadAction<GetDiscoveryItemsRequest>) => {
            state.discoveryItems = undefined;
            state.isFetchingDiscoveryItems = true;
        },

        getDiscoveryItemsSuccess: (state, action: PayloadAction<DiscoveryItemListModel>) => {
            state.discoveryItems = action.payload;
            state.isFetchingDiscoveryItems = false;
        },

        getDiscoveryItemsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDiscoveryItems = false;
        },

        getDiscoveryMessages: (state, action: PayloadAction<GetDiscoveryRunMessagesRequest>) => {
            state.discoveryMessages = undefined;
            state.isFetchingDiscoveryMessages = true;
        },

        getDiscoveryMessagesSuccess: (state, action: PayloadAction<DiscoveryMessageListModel>) => {
            state.discoveryMessages = action.payload;
            state.isFetchingDiscoveryMessages = false;
        },

        getDiscoveryMessagesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDiscoveryMessages = false;
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

        // The three lifecycle actions answer 204 and carry no body; the epic re-reads the detail afterwards, and does so
        // on a refusal too, because a 422 means the run has moved past the state that made the control valid.
        stopDiscovery: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isStopping = true;
        },

        stopDiscoverySuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isStopping = false;
        },

        stopDiscoveryFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isStopping = false;
        },

        resumeDiscovery: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isResuming = true;
        },

        resumeDiscoverySuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isResuming = false;
        },

        resumeDiscoveryFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isResuming = false;
        },

        cancelDiscovery: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isCancelling = true;
        },

        cancelDiscoverySuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isCancelling = false;
        },

        cancelDiscoveryFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCancelling = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const discoveryProviders = createSelector(state, (state) => state.discoveryProviders);
const discoveryProviderAttributeDescriptors = createSelector(state, (state) => state.discoveryProviderAttributeDescriptors);
const discoveryProviderResourceAttributeDescriptors = createSelector(state, (state) => state.discoveryProviderResourceAttributeDescriptors);
const discoveryResources = createSelector(state, (state) => state.discoveryResources);

const discoveryCertificates = createSelector(state, (state) => state.discoveryCertificates);
const discoveryItems = createSelector(state, (state) => state.discoveryItems);
const discoveryMessages = createSelector(state, (state) => state.discoveryMessages);

const discovery = createSelector(state, (state) => state.discovery);
const discoveries = createSelector(state, (state) => state.discoveries);

const isFetchingDiscoveryProviders = createSelector(state, (state) => state.isFetchingDiscoveryProviders);
const isFetchingDiscoveryProviderAttributeDescriptors = createSelector(
    state,
    (state) => state.isFetchingDiscoveryProviderAttributeDescriptors,
);
const fetchingResourceAttributeDescriptors = createSelector(state, (state) => state.fetchingResourceAttributeDescriptors);
const isFetchingDiscoveryResources = createSelector(state, (state) => state.isFetchingDiscoveryResources);
const isFetchingDiscoveryCertificates = createSelector(state, (state) => state.isFetchingDiscoveryCertificates);
const isFetchingDiscoveryItems = createSelector(state, (state) => state.isFetchingDiscoveryItems);
const isFetchingDiscoveryMessages = createSelector(state, (state) => state.isFetchingDiscoveryMessages);

const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isCreating = createSelector(state, (state) => state.isCreating);
const createDiscoverySucceeded = createSelector(state, (state) => state.createDiscoverySucceeded);
const isDeleting = createSelector(state, (state) => state.isDeleting);
const isBulkDeleting = createSelector(state, (state) => state.isBulkDeleting);
const isStopping = createSelector(state, (state) => state.isStopping);
const isResuming = createSelector(state, (state) => state.isResuming);
const isCancelling = createSelector(state, (state) => state.isCancelling);

export const selectors = {
    state,

    discoveryProviders,
    discoveryProviderAttributeDescriptors,
    discoveryProviderResourceAttributeDescriptors,
    discoveryResources,

    discoveryCertificates,
    discoveryItems,
    discoveryMessages,

    discovery,
    discoveries,

    isFetchingDiscoveryProviders,
    isFetchingDiscoveryProviderAttributeDescriptors,
    fetchingResourceAttributeDescriptors,
    isFetchingDiscoveryResources,
    isFetchingDiscoveryCertificates,
    isFetchingDiscoveryItems,
    isFetchingDiscoveryMessages,

    isFetchingDetail,
    isCreating,
    createDiscoverySucceeded,
    isDeleting,
    isBulkDeleting,
    isStopping,
    isResuming,
    isCancelling,
};

export const actions = slice.actions;

export default slice.reducer;
