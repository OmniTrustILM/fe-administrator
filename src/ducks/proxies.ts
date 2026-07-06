import { resetSliceState } from 'ducks/reducerUtils';
import type { AppState } from 'ducks';
import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { ProxyListModel, ProxyRequestDto, ProxyResponseModel, ProxyUpdateRequestDto } from 'types/proxies';
import type { ProxyStatus } from 'types/openapi';

export type State = {
    checkedRows: string[];

    proxy?: ProxyResponseModel;
    proxies: ProxyListModel[];
    proxyInstructions?: string;

    deleteErrorMessage: string;

    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isFetchingInstructions: boolean;
    isCreating: boolean;
    createProxySucceeded: boolean;
    isDeleting: boolean;
    isBulkDeleting: boolean;
    isUpdating: boolean;
};

export const initialState: State = {
    checkedRows: [],

    proxies: [],
    proxyInstructions: undefined,

    deleteErrorMessage: '',

    isFetchingList: false,
    isFetchingDetail: false,
    isFetchingInstructions: false,
    isCreating: false,
    createProxySucceeded: false,
    isDeleting: false,
    isBulkDeleting: false,
    isUpdating: false,
};

export const slice = createSlice({
    name: 'proxies',
    initialState,
    reducers: {
        clearDeleteErrorMessages: (state, action: PayloadAction<void>) => {
            state.deleteErrorMessage = '';
        },

        setCheckedRows: (state, action: PayloadAction<{ checkedRows: string[] }>) => {
            state.checkedRows = action.payload.checkedRows;
        },

        listProxies: (state, action: PayloadAction<{ status?: ProxyStatus }>) => {
            state.checkedRows = [];
            state.proxies = [];
            state.isFetchingList = true;
        },

        listProxiesSuccess: (state, action: PayloadAction<{ proxiesList: ProxyListModel[] }>) => {
            state.isFetchingList = false;
            state.proxies = action.payload.proxiesList;
        },

        listProxiesFailure: (state, action: PayloadAction<void>) => {
            state.isFetchingList = false;
        },

        getProxyDetail: (state, action: PayloadAction<{ uuid: string }>) => {
            state.proxy = undefined;
            state.isFetchingDetail = true;
        },

        getProxyDetailSuccess: (state, action: PayloadAction<{ proxy: ProxyResponseModel }>) => {
            state.isFetchingDetail = false;
            state.proxy = action.payload.proxy;

            const index = state.proxies.findIndex((proxy) => proxy.uuid === action.payload.proxy.uuid);

            if (index >= 0) {
                state.proxies[index] = action.payload.proxy;
            } else {
                state.proxies.push(action.payload.proxy);
            }
        },

        getProxyDetailFailure: (state, action: PayloadAction<void>) => {
            state.isFetchingDetail = false;
        },

        getProxyInstructions: (state, action: PayloadAction<{ uuid: string }>) => {
            state.proxyInstructions = undefined;
            state.isFetchingInstructions = true;
        },

        getProxyInstructionsSuccess: (state, action: PayloadAction<{ instructions: string }>) => {
            state.isFetchingInstructions = false;
            state.proxyInstructions = action.payload.instructions;
        },

        getProxyInstructionsFailure: (state, action: PayloadAction<void>) => {
            state.isFetchingInstructions = false;
        },

        createProxy: (state, action: PayloadAction<ProxyRequestDto>) => {
            state.isCreating = true;
            state.createProxySucceeded = false;
        },

        createProxySuccess: (state, action: PayloadAction<{ proxy: ProxyResponseModel }>) => {
            state.isCreating = false;
            state.createProxySucceeded = true;

            const index = state.proxies.findIndex((proxy) => proxy.uuid === action.payload.proxy.uuid);

            if (index >= 0) {
                state.proxies[index] = action.payload.proxy;
            } else {
                state.proxies.push(action.payload.proxy);
            }

            state.proxy = action.payload.proxy;
        },

        createProxyFailure: (state, action: PayloadAction<void>) => {
            state.isCreating = false;
            state.createProxySucceeded = false;
        },

        updateProxy: (state, action: PayloadAction<{ uuid: string; proxyUpdateRequest: ProxyUpdateRequestDto }>) => {
            state.isUpdating = true;
        },

        updateProxySuccess: (state, action: PayloadAction<{ proxy: ProxyResponseModel }>) => {
            state.isUpdating = false;

            const index = state.proxies.findIndex((proxy) => proxy.uuid === action.payload.proxy.uuid);

            if (index >= 0) {
                state.proxies[index] = action.payload.proxy;
            }

            state.proxy = action.payload.proxy;
        },

        updateProxyFailure: (state, action: PayloadAction<void>) => {
            state.isUpdating = false;
        },

        deleteProxy: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = true;
        },

        deleteProxySuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;
            state.proxies = state.proxies.filter((proxy) => proxy.uuid !== action.payload.uuid);
        },

        deleteProxyFailure: (state, action: PayloadAction<{ error: string }>) => {
            state.isDeleting = false;
            state.deleteErrorMessage = action.payload.error;
        },

        bulkDeleteProxies: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDeleting = true;
            state.checkedRows = [];
        },

        bulkDeleteProxiesSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDeleting = false;
            state.proxies = state.proxies.filter((proxy) => !action.payload.uuids.includes(proxy.uuid));
        },

        bulkDeleteProxiesFailure: (state, action: PayloadAction<{ error: string }>) => {
            state.isBulkDeleting = false;
            state.deleteErrorMessage = action.payload.error;
        },

        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const checkedRows = createSelector(state, (state) => state.checkedRows);
const deleteErrorMessage = createSelector(state, (state) => state.deleteErrorMessage);
const proxy = createSelector(state, (state) => state.proxy);
const proxies = createSelector(state, (state) => state.proxies);
const proxyInstructions = createSelector(state, (state) => state.proxyInstructions);
const isFetchingList = createSelector(state, (state) => state.isFetchingList);
const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isFetchingInstructions = createSelector(state, (state) => state.isFetchingInstructions);
const isCreating = createSelector(state, (state) => state.isCreating);
const createProxySucceeded = createSelector(state, (state) => state.createProxySucceeded);
const isDeleting = createSelector(state, (state) => state.isDeleting);
const isBulkDeleting = createSelector(state, (state) => state.isBulkDeleting);
const isUpdating = createSelector(state, (state) => state.isUpdating);

export const selectors = {
    state,
    checkedRows,
    deleteErrorMessage,
    proxy,
    proxies,
    proxyInstructions,
    isFetchingList,
    isFetchingDetail,
    isFetchingInstructions,
    isCreating,
    isDeleting,
    createProxySucceeded,
    isBulkDeleting,
    isUpdating,
};

export const actions = slice.actions;

export default slice.reducer;
