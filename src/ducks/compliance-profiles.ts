import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ComplianceProfileListModel } from 'types/complianceProfiles';
import type { BulkActionModel } from 'types/connectors';
import type {
    ComplianceCheckResultDto,
    ComplianceGroupListDto,
    ComplianceInternalRuleRequestDto,
    ComplianceProfileDtoV2,
    ComplianceProfileGroupsPatchRequestDto,
    ComplianceProfileListDto,
    ComplianceProfileRequestDtoV2,
    ComplianceProfileRulesPatchRequestDto,
    ComplianceRuleListDto,
    Resource,
    ResourceObjectDto,
} from 'types/openapi';
import type { AppState } from 'ducks';

export type State = {
    checkedRows: string[];

    deleteErrorMessage: string;
    bulkDeleteErrorMessages: BulkActionModel[];

    complianceProfile?: ComplianceProfileDtoV2;
    complianceProfiles: ComplianceProfileListModel[];
    associatedComplianceProfiles: ComplianceProfileListModel[];

    rules: ComplianceRuleListDto[];
    groups: ComplianceGroupListDto[];
    groupRules: ComplianceRuleListDto[];
    associationsOfComplianceProfile: ResourceObjectDto[];
    // Keyed by `${resource}:${objectUuid}` to support multiple concurrent widgets
    complianceCheckResultByKey: { [key: string]: ComplianceCheckResultDto | undefined };
    isFetchingAssociationsOfComplianceProfile: boolean;
    isFetchingAssociatedComplianceProfiles: boolean;
    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isCreating: boolean;
    createComplianceProfileSucceeded: boolean;
    isDeleting: boolean;
    isAddingRule: boolean;
    isUpdatingRule: boolean;
    isDeletingRule: boolean;
    isAddingGroup: boolean;
    isUpdatingGroup: boolean;
    isDeletingGroup: boolean;
    isBulkDeleting: boolean;
    isBulkForceDeleting: boolean;
    isFetchingComplianceProfile: boolean;
    isFetchingRules: boolean;
    isFetchingGroups: boolean;
    isFetchingGroupRules: boolean;
    isAssociatingComplianceProfile: boolean;
    isDissociatingComplianceProfile: boolean;
    isCheckingCompliance: boolean;
    isCreatingComplienceInternalRule: boolean;
    isUpdatingComplienceInternalRule: boolean;
    isDeletingComplienceInternalRule: boolean;
    isFetchingComplianceCheckResultByKey: { [key: string]: boolean };
};

export const initialState: State = {
    checkedRows: [],

    complianceProfiles: [],
    associatedComplianceProfiles: [],
    deleteErrorMessage: '',
    bulkDeleteErrorMessages: [],

    rules: [],
    groups: [],
    groupRules: [],
    associationsOfComplianceProfile: [],
    isFetchingList: false,
    isFetchingDetail: false,
    isCreating: false,
    createComplianceProfileSucceeded: false,
    isDeleting: false,
    isAddingRule: false,
    isUpdatingRule: false,
    isDeletingRule: false,
    isAddingGroup: false,
    isUpdatingGroup: false,
    isDeletingGroup: false,
    isBulkDeleting: false,
    isBulkForceDeleting: false,
    isFetchingComplianceProfile: false,
    isFetchingAssociationsOfComplianceProfile: false,
    isFetchingAssociatedComplianceProfiles: false,
    isFetchingRules: false,
    isFetchingGroups: false,
    isFetchingGroupRules: false,
    isAssociatingComplianceProfile: false,
    isDissociatingComplianceProfile: false,
    isCheckingCompliance: false,
    isCreatingComplienceInternalRule: false,
    isUpdatingComplienceInternalRule: false,
    isDeletingComplienceInternalRule: false,
    complianceCheckResultByKey: {},
    isFetchingComplianceCheckResultByKey: {},
};

export const slice = createSlice({
    name: 'complianceProfiles',

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

        ///////////////////////////////
        getComplianceProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isFetchingDetail = true;
        },
        getComplianceProfileSuccess: (state, action: PayloadAction<{ complianceProfile: ComplianceProfileDtoV2 }>) => {
            state.isFetchingDetail = false;
            state.complianceProfile = action.payload.complianceProfile;
        },
        getComplianceProfileFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },
        ///////////////////////////////
        createComplianceProfile: (state, action: PayloadAction<ComplianceProfileRequestDtoV2>) => {
            state.isCreating = true;
            state.createComplianceProfileSucceeded = false;
        },

        createComplianceProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isCreating = false;
            state.createComplianceProfileSucceeded = true;
        },

        createComplianceProfileFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
            state.createComplianceProfileSucceeded = false;
        },
        ///////////////////////////////
        deleteComplianceProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = true;
            state.deleteErrorMessage = '';
        },

        deleteComplianceProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;

            const profileIndex = state.complianceProfiles.findIndex((profile) => profile.uuid === action.payload.uuid);

            if (profileIndex >= 0) state.complianceProfiles.splice(profileIndex, 1);

            if (state.complianceProfile?.uuid === action.payload.uuid) state.complianceProfile = undefined;
        },

        deleteComplianceProfileFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
            state.deleteErrorMessage = action.payload.error || 'Unknown error';
        },
        ///////////////////////////////
        bulkDeleteComplianceProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.bulkDeleteErrorMessages = [];

            state.isBulkDeleting = true;
        },

        bulkDeleteComplianceProfilesSuccess: (state, action: PayloadAction<{ uuids: string[]; errors: BulkActionModel[] }>) => {
            state.isBulkDeleting = false;
            if (action.payload.errors?.length > 0) {
                state.bulkDeleteErrorMessages = action.payload.errors;
                return;
            }

            action.payload.uuids.forEach((uuid) => {
                const profileIndex = state.complianceProfiles.findIndex((profile) => profile.uuid === uuid);
                if (profileIndex >= 0) state.complianceProfiles.splice(profileIndex, 1);
            });

            if (state.complianceProfile && action.payload.uuids.includes(state.complianceProfile.uuid)) state.complianceProfile = undefined;
        },

        bulkDeleteComplianceProfilesFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeleting = false;
        },
        ///////////////////////////////
        bulkForceDeleteComplianceProfiles: (state, action: PayloadAction<{ uuids: string[]; redirect?: string }>) => {
            state.isBulkForceDeleting = true;
        },

        bulkForceDeleteComplianceProfilesSuccess: (state, action: PayloadAction<{ uuids: string[]; redirect?: string }>) => {
            state.isBulkForceDeleting = false;
            state.deleteErrorMessage = '';
            action.payload.uuids.forEach((uuid) => {
                const profileIndex = state.complianceProfiles.findIndex((profile) => profile.uuid === uuid);
                if (profileIndex >= 0) state.complianceProfiles.splice(profileIndex, 1);
            });

            if (state.complianceProfile && action.payload.uuids.includes(state.complianceProfile.uuid)) state.complianceProfile = undefined;
        },

        bulkForceDeleteComplianceProfilesFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkForceDeleting = false;
        },

        ///////////////////////////////
        getListComplianceProfiles: (state, action: PayloadAction<void>) => {
            state.isFetchingList = true;
        },

        getListComplianceProfilesSuccess: (state, action: PayloadAction<{ complianceProfileList: ComplianceProfileListDto[] }>) => {
            state.complianceProfiles = action.payload.complianceProfileList;
            state.isFetchingList = false;
        },

        getListComplianceProfilesFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },
        //////////////////////////////
        associateComplianceProfile: (
            state,
            action: PayloadAction<{ uuid: string; resource: Resource; associationObjectUuid: string; associationObjectName: string }>,
        ) => {
            state.isAssociatingComplianceProfile = true;
        },

        associateComplianceProfileSuccess: (
            state,
            action: PayloadAction<{ uuid: string; resource: Resource; associationObjectUuid: string; associationObjectName: string }>,
        ) => {
            state.isAssociatingComplianceProfile = false;
            if (!state.complianceProfile) return;

            state.associationsOfComplianceProfile = state.associationsOfComplianceProfile?.concat([
                {
                    objectUuid: action.payload.associationObjectUuid,
                    resource: action.payload.resource,
                    name: action.payload.associationObjectName,
                },
            ]);
        },

        associateComplianceProfileFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isAssociatingComplianceProfile = false;
        },
        //////////////////////////////
        dissociateComplianceProfile: (
            state,
            action: PayloadAction<{ uuid: string; resource: Resource; associationObjectUuid: string }>,
        ) => {
            state.isDissociatingComplianceProfile = true;
        },

        dissociateComplianceProfileSuccess: (
            state,
            action: PayloadAction<{ uuid: string; resource: Resource; associationObjectUuid: string }>,
        ) => {
            state.isDissociatingComplianceProfile = false;

            // Remove the association from the list
            state.associationsOfComplianceProfile = state.associationsOfComplianceProfile.filter(
                (association) => association.objectUuid !== action.payload.associationObjectUuid,
            );
        },

        dissociateComplianceProfileFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDissociatingComplianceProfile = false;
        },
        //////////////////////////////
        getAssociatedComplianceProfiles: (state, action: PayloadAction<{ resource: Resource; associationObjectUuid: string }>) => {
            state.isFetchingAssociatedComplianceProfiles = true;
        },

        getAssociatedComplianceProfilesSuccess: (state, action: PayloadAction<{ complianceProfiles: ComplianceProfileListDto[] }>) => {
            state.isFetchingAssociatedComplianceProfiles = false;
            state.associatedComplianceProfiles = action.payload.complianceProfiles;
        },

        getAssociatedComplianceProfilesFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingAssociatedComplianceProfiles = false;
        },
        //////////////////////////////
        getListComplianceRules: (
            state,
            action: PayloadAction<{ resource?: Resource; connectorUuid?: string; kind?: string; type?: string; format?: string }>,
        ) => {
            state.isFetchingRules = true;
        },

        getListComplianceRulesSuccess: (state, action: PayloadAction<{ rules: ComplianceRuleListDto[] }>) => {
            state.isFetchingRules = false;
            state.rules = action.payload.rules;
        },

        getListComplianceRulesFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingRules = false;
        },
        clearRules: (state, action: PayloadAction<void>) => {
            state.rules = [];
        },
        //////////////////////////////
        getListComplianceGroups: (state, action: PayloadAction<{ connectorUuid: string; kind: string; resource?: Resource }>) => {
            state.isFetchingGroups = true;
        },

        getListComplianceGroupsSuccess: (state, action: PayloadAction<{ groups: ComplianceGroupListDto[] }>) => {
            state.isFetchingGroups = false;
            state.groups = action.payload.groups;
        },

        getListComplianceGroupsFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingGroups = false;
        },
        clearGroups: (state, action: PayloadAction<void>) => {
            state.groups = [];
        },
        //////////////////////////////
        getListComplianceGroupRules: (state, action: PayloadAction<{ groupUuid: string; connectorUuid: string; kind: string }>) => {
            state.isFetchingGroupRules = true;
        },

        getListComplianceGroupRulesSuccess: (state, action: PayloadAction<{ rules: ComplianceRuleListDto[] }>) => {
            state.isFetchingGroupRules = false;
            state.groupRules = action.payload.rules;
        },

        getListComplianceGroupRulesFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingGroupRules = false;
        },

        //////////////////////////////

        getAssociationsOfComplianceProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isFetchingAssociationsOfComplianceProfile = true;
        },

        getAssociationsOfComplianceProfileSuccess: (state, action: PayloadAction<{ associations: ResourceObjectDto[] }>) => {
            state.isFetchingAssociationsOfComplianceProfile = false;
            state.associationsOfComplianceProfile = action.payload.associations;
        },

        getAssociationsOfComplianceProfileFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingAssociationsOfComplianceProfile = false;
        },

        //////////////////////////////

        updateRule: (
            state,
            action: PayloadAction<{ uuid: string; complianceProfileRulesPatchRequestDto: ComplianceProfileRulesPatchRequestDto }>,
        ) => {
            state.isUpdatingRule = true;
        },
        updateRuleSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isUpdatingRule = false;
        },
        updateRuleFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingRule = false;
        },

        //////////////////////////////

        updateGroup: (
            state,
            action: PayloadAction<{
                uuid: string;
                complianceProfileGroupsPatchRequestDto: ComplianceProfileGroupsPatchRequestDto;
            }>,
        ) => {
            state.isUpdatingGroup = true;
        },
        updateGroupSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isUpdatingGroup = false;
        },
        updateGroupFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingGroup = false;
        },

        createComplianceInternalRule: (
            state,
            action: PayloadAction<{ complianceInternalRuleRequestDto: ComplianceInternalRuleRequestDto }>,
        ) => {
            state.isCreatingComplienceInternalRule = true;
        },
        createComplianceInternalRuleSuccess: (state, action: PayloadAction<void>) => {
            state.isCreatingComplienceInternalRule = false;
        },
        createComplianceInternalRuleFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreatingComplienceInternalRule = false;
        },

        updateComplienceInternalRule: (
            state,
            action: PayloadAction<{ internalRuleUuid: string; complianceInternalRuleRequestDto: ComplianceInternalRuleRequestDto }>,
        ) => {
            state.isUpdatingComplienceInternalRule = true;
        },
        updateComplienceInternalRuleSuccess: (state, action: PayloadAction<void>) => {
            state.isUpdatingComplienceInternalRule = false;
        },
        updateComplienceInternalRuleFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingComplienceInternalRule = false;
        },

        deleteComplienceInternalRule: (state, action: PayloadAction<{ internalRuleUuid: string }>) => {
            state.isDeletingComplienceInternalRule = true;
        },
        deleteComplienceInternalRuleSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeletingComplienceInternalRule = false;
        },
        deleteComplienceInternalRuleFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeletingComplienceInternalRule = false;
        },

        //////////////////////////////

        checkComplianceForProfiles: (state, action: PayloadAction<{ requestBody: string[]; resource?: Resource; type?: string }>) => {
            state.isCheckingCompliance = true;
        },

        checkComplianceForProfilesSuccess: (state, action: PayloadAction<void>) => {
            state.isCheckingCompliance = false;
        },

        checkComplianceForProfilesFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCheckingCompliance = false;
        },

        //////////////////////////////

        checkComplianceForResourceObjects: (state, action: PayloadAction<{ resource: Resource; requestBody: string[] }>) => {
            state.isCheckingCompliance = true;
        },

        checkComplianceForResourceObjectsSuccess: (state, action: PayloadAction<void>) => {
            state.isCheckingCompliance = false;
        },

        checkComplianceForResourceObjectsFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCheckingCompliance = false;
        },

        //////////////////////////////

        checkResourceObjectCompliance: (state, action: PayloadAction<{ resource: Resource; objectUuid: string }>) => {
            state.isCheckingCompliance = true;
        },

        checkResourceObjectComplianceSuccess: (state, action: PayloadAction<void>) => {
            state.isCheckingCompliance = false;
        },

        checkResourceObjectComplianceFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCheckingCompliance = false;
        },

        //////////////////////////////

        getComplianceCheckResult: (state, action: PayloadAction<{ resource: Resource; objectUuid: string }>) => {
            const key = `${action.payload.resource}:${action.payload.objectUuid}`;
            state.isFetchingComplianceCheckResultByKey[key] = true;
        },

        getComplianceCheckResultSuccess: (
            state,
            action: PayloadAction<{ resource: Resource; objectUuid: string; complianceCheckResult: ComplianceCheckResultDto }>,
        ) => {
            const key = `${action.payload.resource}:${action.payload.objectUuid}`;
            state.isFetchingComplianceCheckResultByKey[key] = false;
            state.complianceCheckResultByKey[key] = action.payload.complianceCheckResult;
        },

        getComplianceCheckResultFailed: (
            state,
            action: PayloadAction<{ resource: Resource; objectUuid: string; error: string | undefined }>,
        ) => {
            const key = `${action.payload.resource}:${action.payload.objectUuid}`;
            state.isFetchingComplianceCheckResultByKey[key] = false;
        },
    },
});

const state = (reduxStore: any): State => reduxStore?.[slice.name];

const complianceProfile = createSelector(state, (state) => state.complianceProfile);
const complianceProfiles = createSelector(state, (state) => state.complianceProfiles);

const deleteErrorMessage = createSelector(state, (state) => state.deleteErrorMessage);
const bulkDeleteErrorMessages = createSelector(state, (state) => state.bulkDeleteErrorMessages);

const checkedRows = createSelector(state, (state) => state.checkedRows);

const isFetchingList = createSelector(state, (state) => state.isFetchingList);
const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isCreating = createSelector(state, (state) => state.isCreating);
const createComplianceProfileSucceeded = createSelector(state, (state) => state.createComplianceProfileSucceeded);
const isDeleting = createSelector(state, (state) => state.isDeleting);
const isFetchingRules = createSelector(state, (state) => state.isFetchingRules);
const isFetchingGroups = createSelector(state, (state) => state.isFetchingGroups);
const isFetchingGroupRules = createSelector(state, (state) => state.isFetchingGroupRules);

const isAddingRule = createSelector(state, (state) => state.isAddingRule);
const isDeletingRule = createSelector(state, (state) => state.isDeletingRule);
const isAddingGroup = createSelector(state, (state) => state.isAddingGroup);
const isDeletingGroup = createSelector(state, (state) => state.isDeletingGroup);
const isAssociatingComplianceProfile = createSelector(state, (state) => state.isAssociatingComplianceProfile);
const isDissociatingComplianceProfile = createSelector(state, (state) => state.isDissociatingComplianceProfile);
const isFetchingComplianceProfile = createSelector(state, (state) => state.isFetchingComplianceProfile);
const isBulkDeleting = createSelector(state, (state) => state.isBulkDeleting);
const isBulkForceDeleting = createSelector(state, (state) => state.isBulkForceDeleting);
const rules = createSelector(state, (state) => state.rules);
const groups = createSelector(state, (state) => state.groups);
const associationsOfComplianceProfile = createSelector(state, (state) => state.associationsOfComplianceProfile);
const isFetchingAssociationsOfComplianceProfile = createSelector(state, (state) => state.isFetchingAssociationsOfComplianceProfile);
const groupRules = createSelector(state, (state) => state.groupRules);

const isUpdatingRule = createSelector(state, (state) => state.isUpdatingRule);
const isUpdatingGroup = createSelector(state, (state) => state.isUpdatingGroup);

const isCreatingComplienceInternalRule = createSelector(state, (state) => state.isCreatingComplienceInternalRule);
const isUpdatingComplienceInternalRule = createSelector(state, (state) => state.isUpdatingComplienceInternalRule);
const isDeletingComplienceInternalRule = createSelector(state, (state) => state.isDeletingComplienceInternalRule);
// Parameterized selectors for keyed compliance results
const isFetchingComplianceCheckResultBy = (rootState: AppState, resource: Resource, objectUuid: string): boolean => {
    const s = rootState[slice.name];
    const key = `${resource}:${objectUuid}`;
    return !!s.isFetchingComplianceCheckResultByKey[key];
};

const complianceCheckResultBy = (rootState: AppState, resource: Resource, objectUuid: string): ComplianceCheckResultDto | undefined => {
    const s = rootState[slice.name];
    const key = `${resource}:${objectUuid}`;
    return s.complianceCheckResultByKey[key];
};
const isFetchingAssociatedComplianceProfiles = createSelector(state, (state) => state.isFetchingAssociatedComplianceProfiles);
const associatedComplianceProfiles = createSelector(state, (state) => state.associatedComplianceProfiles);

export const selectors = {
    state,

    checkedRows,

    deleteErrorMessage,
    bulkDeleteErrorMessages,

    complianceProfile,
    complianceProfiles,

    isFetchingList,
    isFetchingDetail,
    isCreating,
    createComplianceProfileSucceeded,
    isDeleting,
    isFetchingRules,
    isFetchingGroups,
    isFetchingGroupRules,
    isFetchingAssociationsOfComplianceProfile,
    isAddingRule,
    isDeletingRule,
    isAddingGroup,
    isDeletingGroup,
    isAssociatingComplianceProfile,
    isDissociatingComplianceProfile,
    isFetchingComplianceProfile,
    isFetchingAssociatedComplianceProfiles,
    isBulkDeleting,
    isBulkForceDeleting,

    rules,
    groups,
    associationsOfComplianceProfile,
    groupRules,
    isUpdatingRule,
    isUpdatingGroup,
    isCreatingComplienceInternalRule,
    isUpdatingComplienceInternalRule,
    isDeletingComplienceInternalRule,
    isFetchingComplianceCheckResultBy,
    complianceCheckResultBy,
    associatedComplianceProfiles,
};

export const actions = slice.actions;

export default slice.reducer;
