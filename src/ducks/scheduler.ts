import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SearchRequestModel } from 'types/certificate';
import type { SchedulerJobDetailModel, SchedulerJobHistoryModel, SchedulerJobModel } from 'types/scheduler';
import { resetSliceState } from 'ducks/reducerUtils';
import type { AppState } from 'ducks';

export type State = {
    schedulerJob?: SchedulerJobDetailModel;
    schedulerJobs: SchedulerJobModel[];
    schedulerJobHistory: SchedulerJobHistoryModel[];

    isFetchingDetail: boolean;
    isDeleting: boolean;
    isEnabling: boolean;
    isUpdatingCron: boolean;
};

export const initialState: State = {
    schedulerJobs: [],
    schedulerJobHistory: [],

    isFetchingDetail: false,
    isDeleting: false,
    isEnabling: false,
    isUpdatingCron: false,
};

export const slice = createSlice({
    name: 'scheduler',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        listSchedulerJobs: (state, action: PayloadAction<SearchRequestModel>) => {
            state.schedulerJobs = [];
        },

        listSchedulerJobsSuccess: (state, action: PayloadAction<SchedulerJobModel[]>) => {
            state.schedulerJobs = action.payload;
        },

        listSchedulerJobHistory: (state, action: PayloadAction<{ uuid: string; pagination: SearchRequestModel }>) => {
            state.schedulerJobHistory = [];
        },

        listSchedulerJobHistorySuccess: (state, action: PayloadAction<SchedulerJobHistoryModel[]>) => {
            state.schedulerJobHistory = action.payload;
        },

        getSchedulerJobDetail: (state, action: PayloadAction<{ uuid: string }>) => {
            state.schedulerJob = undefined;
            state.isFetchingDetail = true;
        },

        getSchedulerJobDetailSuccess: (state, action: PayloadAction<SchedulerJobDetailModel>) => {
            state.isFetchingDetail = false;

            state.schedulerJob = action.payload;

            const index = state.schedulerJobs.findIndex((schedulerJob) => schedulerJob.uuid === action.payload.uuid);

            if (index >= 0) {
                state.schedulerJobs[index] = action.payload;
            } else {
                state.schedulerJobs.push(action.payload);
            }
        },

        getSchedulerJobDetailFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        deleteSchedulerJob: (state, action: PayloadAction<{ uuid: string; redirect: boolean }>) => {
            state.isDeleting = true;
        },

        deleteSchedulerJobSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;

            const index = state.schedulerJobs.findIndex((a) => a.uuid === action.payload.uuid);

            if (index !== -1) state.schedulerJobs.splice(index, 1);

            if (state.schedulerJob?.uuid === action.payload.uuid) state.schedulerJob = undefined;
        },

        deleteSchedulerJobFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
        },

        bulkDeleteSchedulerJobs: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isDeleting = true;
        },

        bulkDeleteSchedulerJobsSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.schedulerJobs = state.schedulerJobs.filter((schedulerJob) => !action.payload.uuids.includes(schedulerJob.uuid));

            if (state.schedulerJob && action.payload.uuids.includes(state.schedulerJob.uuid)) {
                state.schedulerJob = undefined;
            }

            state.isDeleting = false;
        },

        bulkDeleteSchedulerJobsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
        },

        bulkEnableSchedulerJobs: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isEnabling = true;
        },

        bulkEnableSchedulerJobsSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isEnabling = false;

            state.schedulerJobs.forEach((schedulerJob) => {
                if (action.payload.uuids.includes(schedulerJob.uuid)) schedulerJob.enabled = true;
            });
        },

        bulkEnableSchedulerJobsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isEnabling = false;
        },

        enableSchedulerJob: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isEnabling = true;
        },

        enableSchedulerJobSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isEnabling = false;

            const index = state.schedulerJobs.findIndex((a) => a.uuid === action.payload.uuid);

            if (index !== -1) state.schedulerJobs[index].enabled = true;

            if (state.schedulerJob?.uuid === action.payload.uuid) state.schedulerJob.enabled = true;
        },

        enableSchedulerJobFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isEnabling = false;
        },

        bulkDisableSchedulerJobs: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isEnabling = true;
        },

        bulkDisableSchedulerJobsSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isEnabling = false;

            state.schedulerJobs.forEach((schedulerJob) => {
                if (action.payload.uuids.includes(schedulerJob.uuid)) schedulerJob.enabled = false;
            });
        },

        bulkDisableSchedulerJobsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isEnabling = false;
        },

        disableSchedulerJob: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isEnabling = true;
        },

        disableSchedulerJobSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isEnabling = false;

            const index = state.schedulerJobs.findIndex((a) => a.uuid === action.payload.uuid);

            if (index !== -1) state.schedulerJobs[index].enabled = false;

            if (state.schedulerJob?.uuid === action.payload.uuid) state.schedulerJob.enabled = false;
        },

        disableSchedulerJobFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isEnabling = false;
        },
        updateSchedulerJobCron: (state, action: PayloadAction<{ uuid: string; cronExpression: string }>) => {
            state.isUpdatingCron = true;
        },

        updateSchedulerJobCronSuccess: (
            state,
            action: PayloadAction<{ uuid: string; updateScheduledJob: Partial<SchedulerJobDetailModel> }>,
        ) => {
            state.isUpdatingCron = false;
            state.schedulerJob =
                state.schedulerJob?.uuid === action.payload.uuid
                    ? { ...state.schedulerJob, cronExpression: action.payload.updateScheduledJob.cronExpression || '' }
                    : state.schedulerJob;
        },

        updateSchedulerJobCronFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingCron = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const schedulerJob = createSelector(state, (state) => state.schedulerJob);
const schedulerJobs = createSelector(state, (state) => state.schedulerJobs);
const schedulerJobHistory = createSelector(state, (state) => state.schedulerJobHistory);

const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isDeleting = createSelector(state, (state) => state.isDeleting);
const isEnabling = createSelector(state, (state) => state.isEnabling);
const isUpdatingCron = createSelector(state, (state) => state.isUpdatingCron);

export const selectors = {
    state,

    schedulerJob,
    schedulerJobs,
    schedulerJobHistory,

    isFetchingDetail,
    isDeleting,
    isEnabling,
    isUpdatingCron,
};

export const actions = slice.actions;

export default slice.reducer;
