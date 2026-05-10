import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { TrustedCertificateRequestDto, TrustedCertificateResponseDto } from 'types/trusted-certificates';

export type State = {
    trustedCertificates: TrustedCertificateResponseDto[];
    trustedCertificate?: TrustedCertificateResponseDto;
    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isCreating: boolean;
    isDeleting: boolean;
    deleteTrustedCertificateSucceeded: boolean;
};

export const initialState: State = {
    trustedCertificates: [],
    isFetchingList: false,
    isFetchingDetail: false,
    isCreating: false,
    isDeleting: false,
    deleteTrustedCertificateSucceeded: false,
};

export const slice = createSlice({
    name: 'trustedCertificates',
    initialState,

    reducers: {
        resetState: (state, _action: PayloadAction<void>) => {
            Object.keys(state).forEach((key) => {
                if (!Object.hasOwn(initialState, key)) (state as any)[key] = undefined;
            });

            Object.keys(initialState).forEach((key) => ((state as any)[key] = (initialState as any)[key]));
        },

        listTrustedCertificates: (state, _action: PayloadAction<void>) => {
            state.trustedCertificates = [];
            state.isFetchingList = true;
        },

        listTrustedCertificatesSuccess: (state, action: PayloadAction<{ trustedCertificates: TrustedCertificateResponseDto[] }>) => {
            state.trustedCertificates = action.payload.trustedCertificates;
            state.isFetchingList = false;
        },

        listTrustedCertificatesFailure: (state, _action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        getTrustedCertificate: (state, _action: PayloadAction<{ uuid: string }>) => {
            state.trustedCertificate = undefined;
            state.isFetchingDetail = true;
        },

        getTrustedCertificateSuccess: (state, action: PayloadAction<{ trustedCertificate: TrustedCertificateResponseDto }>) => {
            state.trustedCertificate = action.payload.trustedCertificate;
            state.isFetchingDetail = false;
        },

        getTrustedCertificateFailure: (state, _action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        createTrustedCertificate: (state, _action: PayloadAction<{ trustedCertificate: TrustedCertificateRequestDto }>) => {
            state.isCreating = true;
        },

        createTrustedCertificateSuccess: (state, action: PayloadAction<{ trustedCertificate: TrustedCertificateResponseDto }>) => {
            state.isCreating = false;
            state.trustedCertificate = action.payload.trustedCertificate;
        },

        createTrustedCertificateFailure: (state, _action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
        },

        deleteTrustedCertificate: (state, _action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = true;
            state.deleteTrustedCertificateSucceeded = false;
        },

        deleteTrustedCertificateSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;
            state.deleteTrustedCertificateSucceeded = true;
            state.trustedCertificates = state.trustedCertificates.filter(
                (trustedCertificate) => trustedCertificate.uuid !== action.payload.uuid,
            );

            if (state.trustedCertificate?.uuid === action.payload.uuid) {
                state.trustedCertificate = undefined;
            }
        },

        deleteTrustedCertificateFailure: (state, _action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
            state.deleteTrustedCertificateSucceeded = false;
        },
    },
});

const state = (reduxStore: any): State => reduxStore?.[slice.name];

const trustedCertificates = createSelector(state, (state) => state.trustedCertificates);
const trustedCertificate = createSelector(state, (state) => state.trustedCertificate);

const isFetchingList = createSelector(state, (state) => state.isFetchingList);
const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isCreating = createSelector(state, (state) => state.isCreating);
const isDeleting = createSelector(state, (state) => state.isDeleting);
const deleteTrustedCertificateSucceeded = createSelector(state, (state) => state.deleteTrustedCertificateSucceeded);

export const selectors = {
    state,
    trustedCertificates,
    trustedCertificate,
    isFetchingList,
    isFetchingDetail,
    isCreating,
    isDeleting,
    deleteTrustedCertificateSucceeded,
};

export const actions = slice.actions;

export default slice.reducer;
