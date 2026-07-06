import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import type { AttributeDescriptorModel, DataAttributeModel } from 'types/attributes';
import type { SearchRequestModel } from 'types/certificate';
import type { ConnectorResponseModel } from 'types/connectors';
import type { NotificationInstanceModel, NotificationInstanceRequestModel, NotificationModel } from 'types/notifications';
import type { ListMappingAttributesRequest } from 'types/openapi';

const MAX_FAILED_RETRY_COUNT = 10;
export type State = {
    overviewNotifications: NotificationModel[];
    notifications: NotificationModel[];
    notificationInstances: NotificationInstanceModel[];
    notificationInstanceDetail?: NotificationInstanceModel;
    notificationInstanceProviders?: ConnectorResponseModel[];
    notificationProviderAttributesDescriptors?: AttributeDescriptorModel[];
    deleteErrorMessage?: string;
    mappingAttributes?: DataAttributeModel[];

    isFetchingMappingAttributes: boolean;
    isFetchingNotificationProviderAttributesDescriptors: boolean;
    isDeletingNotificationInstance: boolean;
    isFetchingNotificationProviders: boolean;
    isFetchingNotificationInstanceDetail: boolean;
    isFetchingOverview: boolean;
    failedFetchingOverviewRemainingCount: number;
    isFetchingNotificationInstances: boolean;
    isCreatingNotificationInstance: boolean;
    isEditingNotificationInstance: boolean;
    createNotificationInstanceSucceeded: boolean;
    updateNotificationInstanceSucceeded: boolean;
    isDeleting: boolean;
    isBulkDeleting: boolean;
    isMarking: boolean;
    isBulkMarking: boolean;
};

export const initialState: State = {
    overviewNotifications: [],
    notifications: [],
    notificationInstances: [],

    isFetchingMappingAttributes: false,
    isFetchingNotificationProviderAttributesDescriptors: false,
    isDeletingNotificationInstance: false,
    isFetchingNotificationProviders: false,
    isFetchingNotificationInstanceDetail: false,
    isFetchingNotificationInstances: false,
    isCreatingNotificationInstance: false,
    isFetchingOverview: false,
    failedFetchingOverviewRemainingCount: MAX_FAILED_RETRY_COUNT,
    isEditingNotificationInstance: false,
    createNotificationInstanceSucceeded: false,
    updateNotificationInstanceSucceeded: false,
    isDeleting: false,
    isBulkDeleting: false,
    isMarking: false,
    isBulkMarking: false,
};

export const slice = createSlice({
    name: 'notifications',

    initialState,

    reducers: {
        listOverviewNotifications: (state, action: PayloadAction<void>) => {},

        listOverviewNotificationsStarted: (state, action: PayloadAction<void>) => {
            state.isFetchingOverview = true;
        },

        resetFailedFetchingCount: (state, action: PayloadAction<void>) => {
            state.failedFetchingOverviewRemainingCount = MAX_FAILED_RETRY_COUNT;
        },

        listOverviewNotificationsSuccess: (state, action: PayloadAction<NotificationModel[]>) => {
            state.isFetchingOverview = false;
            state.overviewNotifications = action.payload;
            state.failedFetchingOverviewRemainingCount = MAX_FAILED_RETRY_COUNT;
        },

        listOverviewNotificationsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingOverview = false;
            state.failedFetchingOverviewRemainingCount = state.failedFetchingOverviewRemainingCount - 1;
        },

        listNotifications: (state, action: PayloadAction<{ unread: boolean; pagination: SearchRequestModel }>) => {
            state.notifications = [];
        },

        listNotificationsSuccess: (state, action: PayloadAction<NotificationModel[]>) => {
            state.notifications = action.payload;
        },

        deleteNotification: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = true;
        },

        deleteNotificationSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;

            const index = state.notifications.findIndex((a) => a.uuid === action.payload.uuid);
            if (index !== -1) state.notifications.splice(index, 1);
        },

        deleteNotificationFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
        },

        markAsReadNotification: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isMarking = true;
        },

        markAsReadNotificationSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isMarking = false;

            const index = state.notifications.findIndex((a) => a.uuid === action.payload.uuid);
            if (index !== -1) state.notifications[index].readAt = Date.now().toString();
        },

        markAsReadNotificationFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isMarking = false;
        },
        listNotificationInstances: (state, action: PayloadAction<void>) => {
            state.isFetchingNotificationInstances = true;
            state.notificationInstances = [];
        },
        listNotificationInstancesSuccess: (state, action: PayloadAction<NotificationInstanceModel[]>) => {
            state.notificationInstances = action.payload;
            state.isFetchingNotificationInstances = false;
        },
        listNotificationInstancesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingNotificationInstances = false;
        },

        listNotificationProviders: (state, action: PayloadAction<void>) => {
            state.isFetchingNotificationProviders = true;
        },

        listNotificationProvidersSuccess: (state, action: PayloadAction<{ providers: ConnectorResponseModel[] }>) => {
            state.isFetchingNotificationProviders = false;
            state.notificationInstanceProviders = action.payload.providers;
        },

        listNotificationProvidersFailure: (state, action: PayloadAction<{ error: string }>) => {
            state.isFetchingNotificationProviders = false;
        },

        getNotificationAttributesDescriptors: (state, action: PayloadAction<{ uuid: string; kind: string }>) => {
            state.notificationProviderAttributesDescriptors = [];
            state.isFetchingNotificationProviderAttributesDescriptors = true;
        },

        getNotificationAttributesDescriptorsSuccess: (
            state,
            action: PayloadAction<{ attributeDescriptor: AttributeDescriptorModel[] }>,
        ) => {
            state.notificationProviderAttributesDescriptors = action.payload.attributeDescriptor;
            state.isFetchingNotificationProviderAttributesDescriptors = false;
        },

        getNotificationAttributeDescriptorsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingNotificationProviderAttributesDescriptors = false;
        },

        getNotificationInstance: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isFetchingNotificationInstanceDetail = true;
        },

        getNotificationInstanceSuccess: (state, action: PayloadAction<NotificationInstanceModel>) => {
            state.notificationInstanceDetail = action.payload;
            state.isFetchingNotificationInstanceDetail = false;
        },

        getNotificationInstanceFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingNotificationInstanceDetail = false;
        },

        createNotificationInstance: (state, action: PayloadAction<NotificationInstanceRequestModel>) => {
            state.isCreatingNotificationInstance = true;
            state.createNotificationInstanceSucceeded = false;
        },

        createNotificationInstanceSuccess: (state, action: PayloadAction<void>) => {
            state.isCreatingNotificationInstance = false;
            state.createNotificationInstanceSucceeded = true;
        },

        createNotificationInstanceFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreatingNotificationInstance = false;
            state.createNotificationInstanceSucceeded = false;
        },

        editNotificationInstance: (
            state,
            action: PayloadAction<{ notificationInstance: NotificationInstanceRequestModel; uuid: string }>,
        ) => {
            state.isEditingNotificationInstance = true;
            state.updateNotificationInstanceSucceeded = false;
        },

        editNotificationInstanceSuccess: (state, action: PayloadAction<void>) => {
            state.isEditingNotificationInstance = false;
            state.updateNotificationInstanceSucceeded = true;
        },

        editNotificationInstanceFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isEditingNotificationInstance = false;
            state.updateNotificationInstanceSucceeded = false;
        },

        deleteNotificationInstance: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeletingNotificationInstance = true;
            state.deleteErrorMessage = undefined;
        },

        deleteNotificationInstanceSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeletingNotificationInstance = false;
            const index = state.notificationInstances.findIndex((a) => a.uuid === action.payload.uuid);
            if (index !== -1) state.notificationInstances.splice(index, 1);
            state.deleteErrorMessage = undefined;
        },

        deleteNotificationInstanceFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeletingNotificationInstance = false;
            state.deleteErrorMessage = action.payload.error;
        },

        clearDeleteErrorMessages: (state, action: PayloadAction<void>) => {
            state.deleteErrorMessage = undefined;
        },

        clearNotificationInstanceDetail: (state, action: PayloadAction<void>) => {
            state.notificationInstanceDetail = undefined;
        },

        listMappingAttributes: (state, action: PayloadAction<ListMappingAttributesRequest>) => {
            state.isFetchingMappingAttributes = true;
        },

        listMappingAttributesSuccess: (state, action: PayloadAction<{ mappingAttributes: DataAttributeModel[] }>) => {
            state.isFetchingMappingAttributes = false;
            state.mappingAttributes = action.payload.mappingAttributes;
        },

        listMappingAttributesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingMappingAttributes = false;
        },

        bulkDeleteNotification: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDeleting = true;
        },

        bulkDeleteNotificationSuccess: (state, action: PayloadAction<{ deletedNotificationUuids: string[] }>) => {
            state.notifications = state.notifications.filter(
                (notification) => !action.payload.deletedNotificationUuids.includes(notification.uuid),
            );
            state.deleteErrorMessage = undefined;
            state.isBulkDeleting = false;
        },

        bulkDeleteNotificationFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.deleteErrorMessage = action.payload.error;
            state.isBulkDeleting = false;
        },

        bulkMarkNotificationAsRead: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkMarking = true;
        },

        bulkMarkNotificationAsReadSuccess: (state, action: PayloadAction<{ markedNotificationUuids: string[] }>) => {
            state.notifications = state.notifications.map((notification) => {
                if (action.payload.markedNotificationUuids.includes(notification.uuid)) {
                    notification.readAt = Date.now().toString();
                }
                return notification;
            });
            state.isBulkMarking = false;
        },

        bulkMarkNotificationAsReadFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkMarking = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const overviewNotifications = createSelector(state, (state) => state.overviewNotifications);
const notifications = createSelector(state, (state) => state.notifications);
const notificationInstances = createSelector(state, (state) => state.notificationInstances);
const notificationInstanceDetail = createSelector(state, (state) => state.notificationInstanceDetail);
const notificationInstanceProviders = createSelector(state, (state) => state.notificationInstanceProviders);
const notificationProviderAttributesDescriptors = createSelector(state, (state) => state.notificationProviderAttributesDescriptors);
const mappingAttributes = createSelector(state, (state) => state.mappingAttributes);

const isFetchingMappingAttributes = createSelector(state, (state) => state.isFetchingMappingAttributes);
const isFetchingNotificationProviders = createSelector(state, (state) => state.isFetchingNotificationProviders);
const deleteErrorMessage = createSelector(state, (state) => state.deleteErrorMessage);
const isCreatingNotificationInstance = createSelector(state, (state) => state.isCreatingNotificationInstance);
const isEditingNotificationInstance = createSelector(state, (state) => state.isEditingNotificationInstance);
const createNotificationInstanceSucceeded = createSelector(state, (state) => state.createNotificationInstanceSucceeded);
const updateNotificationInstanceSucceeded = createSelector(state, (state) => state.updateNotificationInstanceSucceeded);
const isFetchingNotificationInstanceDetail = createSelector(state, (state) => state.isFetchingNotificationInstanceDetail);
const isFetchingNotificationInstances = createSelector(state, (state) => state.isFetchingNotificationInstances);
const isFetchingOverview = createSelector(state, (state) => state.isFetchingOverview);
const isDeleting = createSelector(state, (state) => state.isDeleting);
const isBulkDeleting = createSelector(state, (state) => state.isBulkDeleting);
const isMarking = createSelector(state, (state) => state.isMarking);
const isBulkMarking = createSelector(state, (state) => state.isBulkMarking);

export const selectors = {
    state,
    notificationInstanceDetail,
    overviewNotifications,
    notifications,
    notificationInstances,
    notificationInstanceProviders,
    notificationProviderAttributesDescriptors,
    mappingAttributes,

    isFetchingMappingAttributes,
    deleteErrorMessage,
    isFetchingNotificationProviders,
    isCreatingNotificationInstance,
    createNotificationInstanceSucceeded,
    isEditingNotificationInstance,
    updateNotificationInstanceSucceeded,
    isFetchingNotificationInstanceDetail,
    isFetchingNotificationInstances,
    isFetchingOverview,
    isDeleting,
    isBulkDeleting,
    isMarking,
    isBulkMarking,
};

export const actions = slice.actions;

export default slice.reducer;
