import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RoleResponseModel, UserDetailModel, UserUpdateRequestModel } from 'types/auth';
import type { UserAddRequestModel, UserResponseModel } from 'types/users';

export type State = {
    usersListCheckedRows: string[];
    userRolesListCheckedRows: string[];

    deleteErrorMessage: string;

    user?: UserDetailModel;
    userRoles?: RoleResponseModel[];

    users: UserResponseModel[];

    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isCreating: boolean;
    createUserSucceeded: boolean;
    isDeleting: boolean;
    isUpdating: boolean;
    updateUserSucceeded: boolean;
    isEnabling: boolean;
    isDisabling: boolean;
    isFetchingRoles: boolean;
    isUpdatingRoles: boolean;
    isAddingRole: boolean;
    isRemovingRole: boolean;
};

export const initialState: State = {
    usersListCheckedRows: [],
    userRolesListCheckedRows: [],

    deleteErrorMessage: '',

    users: [],

    isFetchingDetail: false,
    isFetchingList: false,
    isCreating: false,
    createUserSucceeded: false,
    isDeleting: false,
    isUpdating: false,
    updateUserSucceeded: false,
    isEnabling: false,
    isDisabling: false,
    isFetchingRoles: false,
    isUpdatingRoles: false,
    isAddingRole: false,
    isRemovingRole: false,
};

export const slice = createSlice({
    name: 'users',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            Object.keys(state).forEach((key) => {
                if (!Object.hasOwn(initialState, key)) (state as any)[key] = undefined;
            });

            Object.keys(initialState).forEach((key) => ((state as any)[key] = (initialState as any)[key]));
        },

        setUserListCheckedRows: (state, action: PayloadAction<{ checkedRows: string[] }>) => {
            state.usersListCheckedRows = action.payload.checkedRows;
        },

        setUserRolesListCheckedRows: (state, action: PayloadAction<{ checkedRows: string[] }>) => {
            state.userRolesListCheckedRows = action.payload.checkedRows;
        },

        clearDeleteErrorMessages: (state, action: PayloadAction<void>) => {
            state.deleteErrorMessage = '';
        },

        list: (state, action: PayloadAction<void>) => {
            state.usersListCheckedRows = [];
            state.isFetchingList = true;
        },

        listSuccess: (state, action: PayloadAction<{ users: UserResponseModel[] }>) => {
            state.users = action.payload.users;
            state.isFetchingList = false;
        },

        listFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        getDetail: (state, action: PayloadAction<{ uuid: string }>) => {
            state.user = undefined;
            state.userRoles = undefined;
            state.userRolesListCheckedRows = [];
            state.isFetchingDetail = true;
        },

        getDetailSuccess: (state, action: PayloadAction<{ user: UserDetailModel }>) => {
            state.user = action.payload.user;

            const userIndex = state.users.findIndex((user) => user.uuid === action.payload.user.uuid);

            if (userIndex >= 0) {
                state.users[userIndex] = action.payload.user;
            } else {
                state.users.push(action.payload.user);
            }

            state.isFetchingDetail = false;
        },

        getDetailFailure: (state, acttion: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        create: (
            state,
            action: PayloadAction<{
                userAddRequest: UserAddRequestModel;
                roles?: string[];
            }>,
        ) => {
            state.isCreating = true;
            state.createUserSucceeded = false;
        },

        createSuccess: (state, action: PayloadAction<{ user: UserDetailModel }>) => {
            state.users.push(action.payload.user);
            state.isCreating = false;
            state.createUserSucceeded = true;
        },

        createFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
            state.createUserSucceeded = false;
        },

        update: (
            state,
            action: PayloadAction<{
                uuid: string;
                updateUserRequest: UserUpdateRequestModel;
                roles?: string[];
            }>,
        ) => {
            state.isUpdating = true;
            state.updateUserSucceeded = false;
        },

        updateSuccess: (state, action: PayloadAction<{ user: UserDetailModel }>) => {
            const userIndex = state.users.findIndex((user) => user.uuid === action.payload.user.uuid);

            if (userIndex >= 0) {
                state.users[userIndex] = action.payload.user;
            } else {
                state.users.push(action.payload.user);
            }

            if (state.user?.uuid === action.payload.user.uuid) {
                state.user = structuredClone(action.payload.user);
            }
            state.isUpdating = false;
            state.updateUserSucceeded = true;
        },

        updateFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
            state.updateUserSucceeded = false;
        },

        deleteUser: (state, action: PayloadAction<{ uuid: string; redirect?: string }>) => {
            state.isDeleting = true;
        },

        deleteUserSuccess: (state, action: PayloadAction<{ uuid: string; redirect?: string }>) => {
            state.usersListCheckedRows = [];

            const userIndex = state.users.findIndex((user) => user.uuid === action.payload.uuid);

            if (userIndex >= 0) state.users.splice(userIndex, 1);

            if (state.user?.uuid === action.payload.uuid) state.user = undefined;
            state.isDeleting = false;
        },

        deleteUserFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.deleteErrorMessage = action.payload.error || 'Unknown error';
            state.isDeleting = false;
        },

        bulkDeleteUsers: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isDeleting = true;
            state.deleteErrorMessage = '';
        },

        bulkDeleteUsersSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.usersListCheckedRows = [];
            state.users = state.users.filter((user) => !action.payload.uuids.includes(user.uuid));

            if (state.user && action.payload.uuids.includes(state.user.uuid)) {
                state.user = undefined;
            }

            state.isDeleting = false;
        },

        bulkDeleteUsersFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.deleteErrorMessage = action.payload.error || 'Unknown error';
            state.isDeleting = false;
        },

        enable: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isEnabling = true;
        },

        enableSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            const admin = state.users.find((administrator) => administrator.uuid === action.payload.uuid);
            if (admin) admin.enabled = true;

            if (state.user?.uuid === action.payload.uuid) state.user.enabled = true;

            state.isEnabling = false;
        },

        enableFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isEnabling = false;
        },

        disable: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDisabling = true;
        },

        disableSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            const admin = state.users.find((administrator) => administrator.uuid === action.payload.uuid);

            if (admin) admin.enabled = false;

            if (state.user?.uuid === action.payload.uuid) state.user.enabled = false;

            state.isDisabling = false;
        },

        disableFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDisabling = false;
        },

        getRoles: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isFetchingRoles = true;
        },

        getRolesSuccess: (state, action: PayloadAction<{ uuid: string; roles: RoleResponseModel[] }>) => {
            state.userRoles = action.payload.roles;
            state.isFetchingRoles = false;
        },

        getRolesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingRoles = false;
        },

        updateRoles: (state, action: PayloadAction<{ uuid: string; roles: string[] }>) => {
            state.userRoles = undefined;
            state.isUpdatingRoles = true;
        },

        updateRolesSuccess: (state, action: PayloadAction<{ user: UserDetailModel }>) => {
            state.userRoles = action.payload.user.roles;

            if (state.user?.uuid === action.payload.user.uuid) state.user = action.payload.user;
            state.isUpdatingRoles = false;
        },

        updateRolesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingRoles = false;
        },

        addRole: (state, action: PayloadAction<{ uuid: string; roleUuid: string }>) => {
            state.isAddingRole = true;
        },

        addRoleSuccess: (state, action: PayloadAction<{ user: UserDetailModel }>) => {
            state.userRoles = action.payload.user.roles;

            if (state.user?.uuid === action.payload.user.uuid) state.user = action.payload.user;
            state.isAddingRole = false;
        },

        addRoleFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isAddingRole = false;
        },

        removeRole: (state, action: PayloadAction<{ uuid: string; roleUuid: string }>) => {
            state.isRemovingRole = true;
        },

        removeRoleSuccess: (state, action: PayloadAction<{ user: UserDetailModel }>) => {
            state.userRoles = action.payload.user.roles;

            if (state.user?.uuid === action.payload.user.uuid) state.user = action.payload.user;
            state.isRemovingRole = false;
        },

        removeRoleFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isRemovingRole = false;
        },
    },
});

const state = (reduxStore: any): State => reduxStore?.[slice.name];

const usersListCheckedRows = createSelector(state, (state) => state.usersListCheckedRows);
const userRolesListCheckedRows = createSelector(state, (state) => state.userRolesListCheckedRows);

const deleteErrorMessage = createSelector(state, (state) => state.deleteErrorMessage);

const user = createSelector(state, (state) => state.user);
const userRoles = createSelector(state, (state) => state.userRoles);

const users = createSelector(state, (state) => state.users);

const isFetchingList = createSelector(state, (state) => state.isFetchingList);
const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isCreating = createSelector(state, (state) => state.isCreating);
const createUserSucceeded = createSelector(state, (state) => state.createUserSucceeded);
const isUpdating = createSelector(state, (state) => state.isUpdating);
const updateUserSucceeded = createSelector(state, (state) => state.updateUserSucceeded);
const isDeleting = createSelector(state, (state) => state.isDeleting);
const isEnabling = createSelector(state, (state) => state.isEnabling);
const isDisabling = createSelector(state, (state) => state.isDisabling);
const isFetchingRoles = createSelector(state, (state) => state.isFetchingRoles);
const isUpdatingRoles = createSelector(state, (state) => state.isUpdatingRoles);
const isAddingRole = createSelector(state, (state) => state.isAddingRole);
const isRemovingRole = createSelector(state, (state) => state.isRemovingRole);

export const selectors = {
    state,

    usersListCheckedRows,
    userRolesListCheckedRows,

    deleteErrorMessage,

    user,
    userRoles,

    users,

    isFetchingList,
    isFetchingDetail,
    isCreating,
    createUserSucceeded,
    isDeleting,
    isUpdating,
    updateUserSucceeded,
    isEnabling,
    isDisabling,
    isFetchingRoles,
    isUpdatingRoles,
    isAddingRole,
    isRemovingRole,
};

export const actions = slice.actions;

export default slice.reducer;
