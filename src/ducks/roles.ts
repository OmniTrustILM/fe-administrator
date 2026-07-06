import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RoleResponseModel } from 'types/auth';
import type { RoleDetailModel, RolePermissionsModel, RoleRequestModel, SubjectPermissionsModel } from 'types/roles';
import type { UserResponseModel } from 'types/users';
import { resetSliceState } from 'ducks/reducerUtils';
import type { AppState } from 'ducks';

export type State = {
    rolesListCheckedRows: string[];
    permissionsListCheckedRows: string[];

    deleteErrorMessage: string;

    role?: RoleDetailModel;

    rolePermissions?: {
        uuid: string;
        permissions: SubjectPermissionsModel;
    };

    roles: RoleResponseModel[];

    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isFetchingUsers: boolean;
    isFetchingPermissions: boolean;
    isCreating: boolean;
    createRoleSucceeded: boolean;
    isDeleting: boolean;
    isUpdating: boolean;
    updateRoleSucceeded: boolean;
    isUpdatingPermissions: boolean;
    isUpdatingUsers: boolean;
};

export const initialState: State = {
    rolesListCheckedRows: [],
    permissionsListCheckedRows: [],

    deleteErrorMessage: '',

    roles: [],

    isFetchingList: false,
    isFetchingDetail: false,
    isFetchingUsers: false,
    isFetchingPermissions: false,
    isCreating: false,
    createRoleSucceeded: false,
    isDeleting: false,
    isUpdating: false,
    updateRoleSucceeded: false,
    isUpdatingPermissions: false,
    isUpdatingUsers: false,
};

export const slice = createSlice({
    name: 'roles',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        setRolesListCheckedRows: (state, action: PayloadAction<{ checkedRows: string[] }>) => {
            state.rolesListCheckedRows = action.payload.checkedRows;
        },

        setPermissionsListCheckedRows: (state, action: PayloadAction<{ checkedRows: string[] }>) => {
            state.permissionsListCheckedRows = action.payload.checkedRows;
        },

        clearDeleteErrorMessages: (state, action: PayloadAction<void>) => {
            state.deleteErrorMessage = '';
        },

        list: (state, action: PayloadAction<void>) => {
            state.rolesListCheckedRows = [];
            state.isFetchingList = true;
        },

        listSuccess: (state, action: PayloadAction<{ roles: RoleResponseModel[] }>) => {
            state.roles = action.payload.roles;
            state.isFetchingList = false;
        },

        listFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        getDetail: (state, action: PayloadAction<{ uuid: string }>) => {
            state.permissionsListCheckedRows = [];
            state.isFetchingDetail = true;
        },

        getDetailSuccess: (state, action: PayloadAction<{ role: RoleDetailModel }>) => {
            state.role = action.payload.role;
            state.isFetchingDetail = false;
        },

        getDetailFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.role = undefined;
            state.isFetchingDetail = false;
        },

        create: (state, action: PayloadAction<RoleRequestModel>) => {
            state.isCreating = true;
            state.createRoleSucceeded = false;
        },

        createSuccess: (state, action: PayloadAction<{ role: RoleDetailModel }>) => {
            state.roles = [...state.roles, action.payload.role];
            state.isCreating = false;
            state.createRoleSucceeded = true;
        },

        createFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
            state.createRoleSucceeded = false;
        },

        update: (state, action: PayloadAction<{ uuid: string; roleRequest: RoleRequestModel }>) => {
            state.isUpdating = true;
            state.updateRoleSucceeded = false;
        },

        updateSuccess: (state, action: PayloadAction<{ role: RoleDetailModel }>) => {
            state.roles = state.roles.map((role) => (role.uuid === action.payload.role.uuid ? action.payload.role : role));

            if (state.role?.uuid === action.payload.role.uuid) {
                state.role = action.payload.role;
            }

            state.isUpdating = false;
            state.updateRoleSucceeded = true;
        },

        updateFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
            state.updateRoleSucceeded = false;
        },

        delete: (state, action: PayloadAction<{ uuid: string; redirect?: string }>) => {
            state.isDeleting = true;
        },

        deleteSuccess: (state, action: PayloadAction<{ uuid: string; redirect?: string }>) => {
            state.roles = state.roles.filter((role) => role.uuid !== action.payload.uuid);

            if (state.role?.uuid === action.payload.uuid) {
                state.role = undefined;
            }

            state.isDeleting = false;
        },

        deleteFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
        },

        bulkDelete: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isDeleting = true;
            state.deleteErrorMessage = '';
        },

        bulkDeleteSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.roles = state.roles.filter((role) => !action.payload.uuids.includes(role.uuid));

            if (state.role?.uuid && action.payload.uuids.includes(state.role.uuid)) {
                state.role = undefined;
            }

            state.rolesListCheckedRows = [];
            state.isDeleting = false;
        },

        bulkDeleteFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.deleteErrorMessage = action.payload.error || 'Unknown error';
            state.isDeleting = false;
        },

        getUsers: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isFetchingUsers = true;
        },

        getUsersSuccess: (state, action: PayloadAction<{ uuid: string; users: UserResponseModel[] }>) => {
            if (state.role?.uuid === action.payload.uuid) {
                state.role.users = action.payload.users;
            }

            state.isFetchingUsers = false;
        },

        getUsersFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingUsers = false;
        },

        updateUsers: (state, action: PayloadAction<{ uuid: string; users: string[] }>) => {
            state.isUpdatingUsers = true;
        },

        updateUsersSuccess: (state, action: PayloadAction<{ role: RoleDetailModel }>) => {
            if (state.role?.uuid === action.payload.role.uuid) {
                state.role.users = action.payload.role.users;
            }

            state.isUpdatingUsers = false;
        },

        updateUsersFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingUsers = false;
        },

        getPermissions: (state, action: PayloadAction<{ uuid: string }>) => {
            state.rolePermissions = undefined;
            state.isFetchingPermissions = true;
        },

        getPermissionsSuccess: (state, action: PayloadAction<{ uuid: string; permissions: SubjectPermissionsModel }>) => {
            state.rolePermissions = {
                uuid: action.payload.uuid,
                permissions: action.payload.permissions,
            };

            state.isFetchingPermissions = false;
        },

        getPermissionsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.rolePermissions = undefined;
            state.isFetchingPermissions = false;
        },

        updatePermissions: (state, action: PayloadAction<{ uuid: string; permissions: RolePermissionsModel }>) => {
            state.isUpdatingPermissions = true;
        },

        updatePermissionsSuccess: (state, action: PayloadAction<{ uuid: string; permissions: SubjectPermissionsModel }>) => {
            if (state.rolePermissions?.uuid === action.payload.uuid) state.rolePermissions.permissions = action.payload.permissions;
            state.isUpdatingPermissions = false;
        },

        updatePermissionsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingPermissions = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const rolesListCheckedRows = createSelector(state, (state) => state.rolesListCheckedRows);
const permissionsListCheckedRows = createSelector(state, (state) => state.permissionsListCheckedRows);

const deleteErrorMessage = createSelector(state, (state) => state.deleteErrorMessage);

const role = createSelector(state, (state) => state.role);
const permissions = createSelector(state, (state) => state.rolePermissions);
const roles = createSelector(state, (state) => state.roles);

const isFetchingList = createSelector(state, (state) => state.isFetchingList);
const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isFetchingPermissions = createSelector(state, (state) => state.isFetchingPermissions);
const isFetchingUsers = createSelector(state, (state) => state.isFetchingUsers);

const isCreating = createSelector(state, (state) => state.isCreating);
const createRoleSucceeded = createSelector(state, (state) => state.createRoleSucceeded);
const isDeleting = createSelector(state, (state) => state.isDeleting);
const isUpdating = createSelector(state, (state) => state.isUpdating);
const updateRoleSucceeded = createSelector(state, (state) => state.updateRoleSucceeded);
const isUpdatingUsers = createSelector(state, (state) => state.isUpdatingUsers);
const isUpdatingPermissions = createSelector(state, (state) => state.isUpdatingPermissions);

export const selectors = {
    rolesListCheckedRows,
    permissionsListCheckedRows,

    deleteErrorMessage,

    role,
    permissions,
    roles,

    isFetchingList,
    isFetchingDetail,
    isFetchingPermissions,
    isFetchingUsers,

    isCreating,
    createRoleSucceeded,
    isDeleting,
    isUpdating,
    updateRoleSucceeded,
    isUpdatingUsers,
    isUpdatingPermissions,
};

export const actions = slice.actions;

export default slice.reducer;
