import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { AttributeDescriptorModel } from 'types/attributes';
import type { AuthorityRequestModel, AuthorityResponseModel, AuthorityUpdateRequestModel } from 'types/authorities';
import type { BulkActionModel, ConnectorResponseModel } from 'types/connectors';
import type { FunctionGroupCode } from 'types/openapi';

export type State = {
    checkedRows: string[];

    deleteErrorMessage: string;
    bulkDeleteErrorMessages: BulkActionModel[];

    authority?: AuthorityResponseModel;
    authorities: AuthorityResponseModel[];

    authorityProviders?: ConnectorResponseModel[];
    authorityProviderAttributeDescriptors?: AttributeDescriptorModel[];
    raProfileAttributeDescriptors?: AttributeDescriptorModel[];

    isFetchingAuthorityProviders: boolean;
    isFetchingAuthorityProviderAttributeDescriptors: boolean;
    isFetchingRAProfilesAttributesDescriptors: boolean;

    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isCreating: boolean;
    createAuthoritySucceeded: boolean;
    isDeleting: boolean;
    isForceDeleting: boolean;
    isUpdating: boolean;
    updateAuthoritySucceeded: boolean;
    isBulkDeleting: boolean;
    isBulkForceDeleting: boolean;
};

export const initialState: State = {
    checkedRows: [],

    deleteErrorMessage: '',
    bulkDeleteErrorMessages: [],

    authorities: [],

    isFetchingAuthorityProviders: false,
    isFetchingAuthorityProviderAttributeDescriptors: false,
    isFetchingRAProfilesAttributesDescriptors: false,

    isFetchingList: false,
    isFetchingDetail: false,
    isCreating: false,
    createAuthoritySucceeded: false,
    isDeleting: false,
    isForceDeleting: false,
    isUpdating: false,
    updateAuthoritySucceeded: false,
    isBulkDeleting: false,
    isBulkForceDeleting: false,
};

export const slice = createSlice({
    name: 'authorities',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            Object.keys(state).forEach((key) => {
                if (!Object.hasOwn(initialState, key)) (state as any)[key] = undefined;
            });

            Object.keys(initialState).forEach((key) => ((state as any)[key] = (initialState as any)[key]));
        },

        setCheckedRows: (state, action: PayloadAction<{ checkedRows: string[] }>) => {
            state.checkedRows = action.payload.checkedRows;
        },

        clearDeleteErrorMessages: (state, action: PayloadAction<void>) => {
            state.deleteErrorMessage = '';
            state.bulkDeleteErrorMessages = [];
        },

        clearAuthorityProviderAttributeDescriptors: (state, action: PayloadAction<void>) => {
            state.authorityProviderAttributeDescriptors = [];
        },

        clearRAProfilesAttributesDescriptors: (state, action: PayloadAction<void>) => {
            state.raProfileAttributeDescriptors = [];
        },

        listAuthorityProviders: (state, action: PayloadAction<void>) => {
            state.authorityProviders = undefined;
            state.isFetchingAuthorityProviders = true;
        },

        listAuthorityProvidersSuccess: (state, action: PayloadAction<{ connectors: ConnectorResponseModel[] }>) => {
            state.authorityProviders = action.payload.connectors;
            state.isFetchingAuthorityProviders = false;
        },

        listAuthorityProvidersFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingAuthorityProviders = false;
        },

        getAuthorityProviderAttributesDescriptors: (
            state,
            action: PayloadAction<{ uuid: string; kind: string; functionGroup: FunctionGroupCode }>,
        ) => {
            state.authorityProviderAttributeDescriptors = [];
            state.isFetchingAuthorityProviderAttributeDescriptors = true;
        },

        getAuthorityInstanceAttributesDescriptors: (state, action: PayloadAction<{ connectorUuid: string; interfaceUuid?: string }>) => {
            state.authorityProviderAttributeDescriptors = [];
            state.isFetchingAuthorityProviderAttributeDescriptors = true;
        },

        getAuthorityProviderAttributesDescriptorsSuccess: (
            state,
            action: PayloadAction<{ attributeDescriptor: AttributeDescriptorModel[] }>,
        ) => {
            state.authorityProviderAttributeDescriptors = action.payload.attributeDescriptor;
            state.isFetchingAuthorityProviderAttributeDescriptors = false;
        },

        getAuthorityProviderAttributeDescriptorsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingAuthorityProviderAttributeDescriptors = false;
        },

        getRAProfilesAttributesDescriptors: (state, action: PayloadAction<{ authorityUuid: string }>) => {
            state.isFetchingRAProfilesAttributesDescriptors = true;
        },

        getRAProfilesAttributesDescriptorsSuccess: (
            state,
            action: PayloadAction<{ authorityUuid: string; attributesDescriptors: AttributeDescriptorModel[] }>,
        ) => {
            state.isFetchingRAProfilesAttributesDescriptors = false;
            state.raProfileAttributeDescriptors = action.payload.attributesDescriptors;
        },

        getRAProfilesAttributesDescriptorsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingRAProfilesAttributesDescriptors = false;
        },

        listAuthorities: (state, action: PayloadAction<void>) => {
            state.authorities = [];
            state.isFetchingList = true;
        },

        listAuthoritiesSuccess: (state, action: PayloadAction<{ authorityList: AuthorityResponseModel[] }>) => {
            state.authorities = action.payload.authorityList;
            state.isFetchingList = false;
        },

        listAuthoritiesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        getAuthorityDetail: (state, action: PayloadAction<{ uuid: string }>) => {
            if (state.authority?.uuid !== action.payload.uuid) {
                state.authority = undefined;
            }
            state.isFetchingDetail = true;
        },

        getAuthorityDetailSuccess: (state, action: PayloadAction<{ authority: AuthorityResponseModel }>) => {
            state.isFetchingDetail = false;

            state.authority = action.payload.authority;

            const authorityIndex = state.authorities.findIndex((authority) => authority.uuid === action.payload.authority.uuid);

            if (authorityIndex >= 0) {
                state.authorities[authorityIndex] = action.payload.authority;
            } else {
                state.authorities.push(action.payload.authority);
            }
        },

        getAuthorityDetailFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        createAuthority: (state, action: PayloadAction<AuthorityRequestModel>) => {
            state.isCreating = true;
            state.createAuthoritySucceeded = false;
        },

        createAuthoritySuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isCreating = false;
            state.createAuthoritySucceeded = true;
        },

        createAuthorityFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
            state.createAuthoritySucceeded = false;
        },

        updateAuthority: (state, action: PayloadAction<{ uuid: string; updateAuthority: AuthorityUpdateRequestModel }>) => {
            state.isUpdating = true;
            state.updateAuthoritySucceeded = false;
        },

        updateAuthoritySuccess: (state, action: PayloadAction<{ authority: AuthorityResponseModel }>) => {
            state.isUpdating = false;
            state.updateAuthoritySucceeded = true;

            const authorityIndex = state.authorities.findIndex((authority) => authority.uuid === action.payload.authority.uuid);

            if (authorityIndex >= 0) {
                state.authorities[authorityIndex] = action.payload.authority;
            } else {
                state.authorities.push(action.payload.authority);
            }

            if (state.authority?.uuid === action.payload.authority.uuid) state.authority = action.payload.authority;
        },

        updateAuthorityFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
            state.updateAuthoritySucceeded = false;
        },

        deleteAuthority: (state, action: PayloadAction<{ uuid: string }>) => {
            state.deleteErrorMessage = '';
            state.isDeleting = true;
        },

        deleteAuthoritySuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;

            const index = state.authorities.findIndex((a) => a.uuid === action.payload.uuid);

            if (index !== -1) state.authorities.splice(index, 1);

            if (state.authority?.uuid === action.payload.uuid) state.authority = undefined;
        },

        deleteAuthorityFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.deleteErrorMessage = action.payload.error || 'Unknown error';
            state.isDeleting = false;
        },

        bulkDeleteAuthority: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.bulkDeleteErrorMessages = [];
            state.isBulkDeleting = true;
        },

        bulkDeleteAuthoritySuccess: (state, action: PayloadAction<{ uuids: string[]; errors: BulkActionModel[] }>) => {
            state.isBulkDeleting = false;

            if (action.payload.errors?.length > 0) {
                state.bulkDeleteErrorMessages = action.payload.errors;
                return;
            }

            action.payload.uuids.forEach((uuid) => {
                const index = state.authorities.findIndex((authority) => authority.uuid === uuid);
                if (index !== -1) state.authorities.splice(index, 1);
            });

            if (state.authority && action.payload.uuids.includes(state.authority.uuid)) state.authority = undefined;
        },

        bulkDeleteAuthorityFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeleting = false;
        },

        bulkForceDeleteAuthority: (state, action: PayloadAction<{ uuids: string[]; redirect?: string }>) => {
            state.isBulkForceDeleting = true;
        },

        bulkForceDeleteAuthoritySuccess: (state, action: PayloadAction<{ uuids: string[]; redirect?: string }>) => {
            state.isBulkForceDeleting = false;

            action.payload.uuids.forEach((uuid) => {
                const index = state.authorities.findIndex((authority) => authority.uuid === uuid);
                if (index !== -1) state.authorities.splice(index, 1);
            });

            if (state.authority && action.payload.uuids.includes(state.authority.uuid)) state.authority = undefined;
        },

        bulkForceDeleteAuthorityFailure: (state, action: PayloadAction<{ error: string }>) => {
            state.isBulkForceDeleting = false;
        },
    },
});

const state = (reduxStore: any): State => reduxStore?.[slice.name];

const checkedRows = createSelector(state, (state) => state.checkedRows);

const deleteErrorMessage = createSelector(state, (state) => state.deleteErrorMessage);
const bulkDeleteErrorMessages = createSelector(state, (state) => state.bulkDeleteErrorMessages);

const authorityProviders = createSelector(state, (state) => state.authorityProviders);
const authorityProviderAttributeDescriptors = createSelector(state, (state) => state.authorityProviderAttributeDescriptors);

const authority = createSelector(state, (state) => state.authority);
const authorities = createSelector(state, (state) => state.authorities);
const raProfileAttributeDescriptors = createSelector(state, (state) => state.raProfileAttributeDescriptors);

const isFetchingAuthorityProviders = createSelector(state, (state) => state.isFetchingAuthorityProviders);
const isFetchingAuthorityProviderAttributeDescriptors = createSelector(
    state,
    (state) => state.isFetchingAuthorityProviderAttributeDescriptors,
);
const isFetchingRAProfilesAttributesDescriptors = createSelector(state, (state) => state.isFetchingRAProfilesAttributesDescriptors);

const isFetchingList = createSelector(state, (state) => state.isFetchingList);
const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isCreating = createSelector(state, (state) => state.isCreating);
const createAuthoritySucceeded = createSelector(state, (state) => state.createAuthoritySucceeded);
const isUpdating = createSelector(state, (state) => state.isUpdating);
const updateAuthoritySucceeded = createSelector(state, (state) => state.updateAuthoritySucceeded);
const isDeleting = createSelector(state, (state) => state.isDeleting);
const isBulkDeleting = createSelector(state, (state) => state.isBulkDeleting);
const isBulkForceDeleting = createSelector(state, (state) => state.isBulkForceDeleting);

export const selectors = {
    state,

    checkedRows,

    deleteErrorMessage,
    bulkDeleteErrorMessages,

    authorityProviders,
    authorityProviderAttributeDescriptors,

    authority,
    authorities,
    raProfileAttributeDescriptors,

    isFetchingAuthorityProviders,
    isFetchingAuthorityProviderAttributeDescriptors,
    isFetchingRAProfilesAttributesDescriptors,

    isFetchingList,
    isFetchingDetail,
    isCreating,
    createAuthoritySucceeded,
    isUpdating,
    updateAuthoritySucceeded,
    isDeleting,
    isBulkDeleting,
    isBulkForceDeleting,
};

export const actions = slice.actions;

export default slice.reducer;
