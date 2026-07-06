import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import { resetSliceState } from 'ducks/reducerUtils';
import type { ApprovalModel, DetailApprovalModel, ResponseApprovalModel, UserApprovalModel } from 'types/approvals';
import { ApprovalDetailDtoStatusEnum, ApprovalDtoStatusEnum } from 'types/openapi';

export type State = {
    approvalDetails?: DetailApprovalModel;
    approvals: ApprovalModel[];
    approvalsTotalItems: number;
    userApprovals: ApprovalModel[];
    userApprovalsTotalItems: number;
    isApproving: boolean;
    isRejecting: boolean;
    isFetchingDetail: boolean;
    isFetchingList: boolean;
    isFetchingUserList: boolean;
};

export const initialState: State = {
    approvalDetails: undefined,
    approvals: [],
    approvalsTotalItems: 0,
    userApprovals: [],
    userApprovalsTotalItems: 0,
    isApproving: false,
    isRejecting: false,
    isFetchingDetail: false,
    isFetchingList: false,
    isFetchingUserList: false,
};

export const slice = createSlice({
    name: 'approvals',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        getApproval: (state, action: PayloadAction<{ uuid: string }>) => {
            state.approvalDetails = undefined;
            state.isFetchingDetail = true;
        },

        getApprovalSuccess: (state, action: PayloadAction<DetailApprovalModel>) => {
            state.approvalDetails = action.payload;
            state.isFetchingDetail = false;
        },

        getApprovalFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.approvalDetails = undefined;
        },

        listApprovals: (state, action: PayloadAction<{ itemsPerPage: number; pageNumber: number }>) => {
            state.approvals = [];
            state.approvalsTotalItems = 0;
            state.isFetchingList = true;
        },

        listApprovalsSuccess: (state, action: PayloadAction<ResponseApprovalModel>) => {
            state.approvals = action.payload.approvals;
            state.approvalsTotalItems = action.payload.totalItems;
            state.isFetchingList = false;
        },

        listApprovalsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.approvals = [];
            state.isFetchingDetail = false;
            state.isFetchingList = false;
        },

        listUserApprovals: (state, action: PayloadAction<{ itemsPerPage: number; pageNumber: number; history?: boolean }>) => {
            state.userApprovals = [];
            state.userApprovalsTotalItems = 0;
            state.isFetchingUserList = true;
        },

        listUserApprovalsSuccess: (state, action: PayloadAction<ResponseApprovalModel>) => {
            state.userApprovals = action.payload.approvals;
            state.userApprovalsTotalItems = action.payload.totalItems;
            state.isFetchingUserList = false;
        },

        listUserApprovalsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.userApprovals = [];
            state.userApprovalsTotalItems = 0;
            state.isFetchingUserList = false;
        },

        approveApproval: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isApproving = true;
        },

        approveApprovalSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isApproving = false;
            const approval = state.approvals.find((approval) => approval.approvalUuid === action.payload.uuid);
            if (approval) {
                approval.status = ApprovalDtoStatusEnum.Approved;
            }

            const userApproval = state.userApprovals.find((approval) => approval.approvalUuid === action.payload.uuid);
            if (userApproval) {
                userApproval.status = ApprovalDtoStatusEnum.Approved;
            }
        },

        approveApprovalsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isApproving = false;
        },

        rejectApproval: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isRejecting = true;
        },

        rejectApprovalSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isApproving = false;
            const approval = state.approvals.find((approval) => approval.approvalUuid === action.payload.uuid);
            if (approval) {
                approval.status = ApprovalDtoStatusEnum.Rejected;
            }

            const userApproval = state.userApprovals.find((approval) => approval.approvalUuid === action.payload.uuid);
            if (userApproval) {
                userApproval.status = ApprovalDtoStatusEnum.Rejected;
            }
            state.isRejecting = false;
        },

        rejectApprovalFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isRejecting = false;
        },
        approveApprovalRecipient: (state, action: PayloadAction<{ uuid: string } & { userApproval: UserApprovalModel }>) => {
            state.isApproving = true;
        },

        approveApprovalRecipientSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isApproving = false;
            const approval = state.approvals.find((approval) => approval.approvalUuid === action.payload.uuid);
            if (approval) {
                approval.status = ApprovalDtoStatusEnum.Approved;
            }

            const userApproval = state.userApprovals.find((approval) => approval.approvalUuid === action.payload.uuid);
            if (userApproval) {
                userApproval.status = ApprovalDtoStatusEnum.Approved;
            }

            const approvalDetails = state.approvalDetails;
            if (approvalDetails?.approvalUuid === action.payload.uuid) {
                approvalDetails.status = ApprovalDetailDtoStatusEnum.Approved;
            }
            state.isApproving = false;
        },

        approveApprovalRecipientFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isApproving = false;
        },

        rejectApprovalRecipient: (state, action: PayloadAction<{ uuid: string } & { userApproval: UserApprovalModel }>) => {
            state.isRejecting = true;
        },
        rejectApprovalRecipientSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isRejecting = false;
            const approval = state.approvals.find((approval) => approval.approvalUuid === action.payload.uuid);
            if (approval) {
                approval.status = ApprovalDtoStatusEnum.Rejected;
            }

            const userApproval = state.userApprovals.find((approval) => approval.approvalUuid === action.payload.uuid);
            if (userApproval) {
                userApproval.status = ApprovalDtoStatusEnum.Rejected;
            }

            const approvalDetails = state.approvalDetails;
            if (approvalDetails?.approvalUuid === action.payload.uuid) {
                approvalDetails.status = ApprovalDetailDtoStatusEnum.Rejected;
            }
        },

        rejectApprovalRecipientFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isRejecting = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const approvalDetails = createSelector(state, (state) => state.approvalDetails);
const approvals = createSelector(state, (state) => state.approvals);
const userApprovals = createSelector(state, (state) => state.userApprovals);

const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isFetchingList = createSelector(state, (state) => state.isFetchingList);
const isFetchingUserList = createSelector(state, (state) => state.isFetchingUserList);
const isApproving = createSelector(state, (state) => state.isApproving);
const isRejecting = createSelector(state, (state) => state.isRejecting);

const approvalsTotalItems = createSelector(state, (state) => state.approvalsTotalItems);
const userApprovalsTotalItems = createSelector(state, (state) => state.userApprovalsTotalItems);

export const selectors = {
    state,
    approvalDetails,
    approvals,
    userApprovals,
    isFetchingDetail,
    approvalsTotalItems,
    userApprovalsTotalItems,
    isFetchingList,
    isFetchingUserList,
    isApproving,
    isRejecting,
};

export const actions = slice.actions;

export default slice.reducer;
