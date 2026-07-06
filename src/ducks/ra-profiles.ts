import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { resetSliceState } from 'ducks/reducerUtils';
import type { AppState } from 'ducks';
import type { ProfileApprovalModel } from 'types/approval-profiles';
import type { AttributeDescriptorModel } from 'types/attributes';
import type { BulkActionModel } from 'types/connectors';
import type { RaProfileCertificateRequestAttributesUpdateDto, Resource } from 'types/openapi';
import type {
    ComplianceProfileSimplifiedModel,
    RaProfileAcmeDetailResponseModel,
    RaProfileActivateAcmeRequestModel,
    RaProfileActivateCmpRequestModel,
    RaProfileActivateScepRequestModel,
    RaProfileAddRequestModel,
    RaProfileCertificateValidationSettingsUpdateModel,
    RaProfileCmpDetailResponseModel,
    RaProfileEditRequestModel,
    RaProfileResponseModel,
    RaProfileScepDetailResponseModel,
} from 'types/ra-profiles';

export type State = {
    checkedRows: string[];

    deleteErrorMessage: string;
    bulkDeleteErrorMessages: BulkActionModel[];

    raProfile?: RaProfileResponseModel;
    raProfiles: RaProfileResponseModel[];

    acmeDetails?: RaProfileAcmeDetailResponseModel;
    scepDetails?: RaProfileScepDetailResponseModel;
    cmpDetails?: RaProfileCmpDetailResponseModel;
    associatedApprovalProfiles: ProfileApprovalModel[];

    issuanceAttributesDescriptors?: AttributeDescriptorModel[];
    revocationAttributesDescriptors?: AttributeDescriptorModel[];

    isDissociatingApprovalProfile: boolean;
    isAssociatingApprovalProfile: boolean;
    isFetchingApprovalProfiles: boolean;
    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isFetchingAttributes: boolean;
    isFetchingIssuanceAttributes: boolean;
    isFetchingRevocationAttributes: boolean;

    isFetchingAcmeDetails: boolean;
    isFetchingScepDetails: boolean;
    isFetchingCmpDetails: boolean;

    isFetchingAssociatedComplianceProfiles: boolean;

    isCreating: boolean;
    createRaProfileSucceeded: boolean;
    createdRaProfileUuid: string | null;
    isDeleting: boolean;
    isBulkDeleting: boolean;
    isUpdating: boolean;
    updateRaProfileSucceeded: boolean;
    isEnabling: boolean;
    isBulkEnabling: boolean;
    isDisabling: boolean;
    isBulkDisabling: boolean;
    isActivatingAcme: boolean;
    isDeactivatingAcme: boolean;
    isActivatingCmp: boolean;
    isDeactivatingCmp: boolean;
    isActivatingScep: boolean;
    isDeactivatingScep: boolean;
    isCheckingCompliance: boolean;
    isAssociatingComplianceProfile: boolean;
    isDissociatingComplianceProfile: boolean;

    associatedComplianceProfiles: ComplianceProfileSimplifiedModel[];
};

export const initialState: State = {
    checkedRows: [],

    deleteErrorMessage: '',
    bulkDeleteErrorMessages: [],
    associatedApprovalProfiles: [],
    raProfiles: [],

    isDissociatingApprovalProfile: false,
    isAssociatingApprovalProfile: false,
    isFetchingApprovalProfiles: false,
    isFetchingList: false,
    isFetchingDetail: false,
    isFetchingAttributes: false,
    isFetchingIssuanceAttributes: false,
    isFetchingRevocationAttributes: false,
    isFetchingAcmeDetails: false,
    isFetchingScepDetails: false,
    isFetchingCmpDetails: false,
    isFetchingAssociatedComplianceProfiles: false,
    isCreating: false,
    createRaProfileSucceeded: false,
    createdRaProfileUuid: null,
    isDeleting: false,
    isBulkDeleting: false,
    isUpdating: false,
    updateRaProfileSucceeded: false,
    isEnabling: false,
    isDisabling: false,
    isBulkEnabling: false,
    isBulkDisabling: false,
    isActivatingAcme: false,
    isDeactivatingAcme: false,
    isActivatingCmp: false,
    isDeactivatingCmp: false,
    isActivatingScep: false,
    isDeactivatingScep: false,
    isCheckingCompliance: false,
    isAssociatingComplianceProfile: false,
    isDissociatingComplianceProfile: false,
    associatedComplianceProfiles: [],
};

export const slice = createSlice({
    name: 'raprofiles',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        setCheckedRows: (state, action: PayloadAction<{ checkedRows: string[] }>) => {
            state.checkedRows = action.payload.checkedRows;
        },

        clearDeleteErrorMessages: (state, action: PayloadAction<void>) => {
            state.deleteErrorMessage = '';
            state.bulkDeleteErrorMessages = [];
        },

        clearIssuanceAttributesDescriptors: (state, action: PayloadAction<void>) => {
            state.issuanceAttributesDescriptors = undefined;
        },

        clearRevocationAttributesDescriptors: (state, action: PayloadAction<void>) => {
            state.revocationAttributesDescriptors = undefined;
        },

        listRaProfiles: (state, action: PayloadAction<void>) => {
            state.raProfiles = [];
            state.isFetchingList = true;
        },

        listRaProfilesSuccess: (state, action: PayloadAction<{ raProfiles: RaProfileResponseModel[] }>) => {
            state.raProfiles = action.payload.raProfiles;
            state.isFetchingList = false;
        },

        listRaProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        getRaProfileDetail: (state, action: PayloadAction<{ authorityUuid: string; uuid: string }>) => {
            if (state.raProfile?.uuid !== action.payload.uuid) {
                state.raProfile = undefined;
            }
            state.isFetchingDetail = true;
        },

        getRaProfileDetailSuccess: (state, action: PayloadAction<{ raProfile: RaProfileResponseModel }>) => {
            state.isFetchingDetail = false;
            state.raProfile = action.payload.raProfile;
        },

        getRaProfileDetailFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        clearRaProfileDetail: (state, action: PayloadAction<void>) => {
            state.raProfile = undefined;
        },

        createRaProfile: (
            state,
            action: PayloadAction<{
                authorityInstanceUuid: string;
                raProfileAddRequest: RaProfileAddRequestModel;
                deferRedirect?: boolean;
            }>,
        ) => {
            state.isCreating = true;
            state.createRaProfileSucceeded = false;
            state.createdRaProfileUuid = null;
        },

        createRaProfileSuccess: (state, action: PayloadAction<{ uuid: string; authorityInstanceUuid: string }>) => {
            state.isCreating = false;
            state.createRaProfileSucceeded = true;
            state.createdRaProfileUuid = action.payload.uuid;
        },

        createRaProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
            state.createRaProfileSucceeded = false;
        },

        updateRaProfile: (
            state,
            action: PayloadAction<{
                profileUuid: string;
                authorityInstanceUuid: string;
                raProfileEditRequest: RaProfileEditRequestModel;
                redirect?: string;
            }>,
        ) => {
            state.isUpdating = true;
            state.updateRaProfileSucceeded = false;
        },

        updateRaProfileSuccess: (state, action: PayloadAction<{ raProfile: RaProfileResponseModel; redirect?: string }>) => {
            state.isUpdating = false;
            state.updateRaProfileSucceeded = true;
            state.raProfile = action.payload.raProfile;
        },

        updateRaProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
            state.updateRaProfileSucceeded = false;
        },

        updateRaProfileCertificateValidation: (
            state,
            action: PayloadAction<{
                profileUuid: string;
                authorityInstanceUuid: string;
                validation: RaProfileCertificateValidationSettingsUpdateModel;
            }>,
        ) => {
            state.isUpdating = true;
        },

        updateRaProfileCertificateValidationSuccess: (state, action: PayloadAction<{ raProfile: RaProfileResponseModel }>) => {
            state.isUpdating = false;
            state.raProfile = {
                ...action.payload.raProfile,
                attributes: state.raProfile?.attributes ?? action.payload.raProfile.attributes,
                customAttributes: state.raProfile?.customAttributes ?? action.payload.raProfile.customAttributes,
            };
        },

        updateRaProfileCertificateValidationFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
        },

        updateRaProfileRequestAttributes: (
            state,
            action: PayloadAction<{
                profileUuid: string;
                authorityInstanceUuid: string;
                requestAttributes: RaProfileCertificateRequestAttributesUpdateDto;
            }>,
        ) => {
            state.isUpdating = true;
        },

        updateRaProfileRequestAttributesSuccess: (state, action: PayloadAction<{ raProfile: RaProfileResponseModel }>) => {
            state.isUpdating = false;
            state.raProfile = {
                ...action.payload.raProfile,
                attributes: state.raProfile?.attributes ?? action.payload.raProfile.attributes,
                customAttributes: state.raProfile?.customAttributes ?? action.payload.raProfile.customAttributes,
            };
        },

        updateRaProfileRequestAttributesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
        },

        enableRaProfile: (state, action: PayloadAction<{ authorityUuid: string; uuid: string }>) => {
            state.isEnabling = true;
        },

        enableRaProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isEnabling = false;

            const raProfile = state.raProfiles.find((raProfile) => raProfile.uuid === action.payload.uuid);
            if (raProfile) raProfile.enabled = true;

            if (state.raProfile?.uuid === action.payload.uuid) state.raProfile.enabled = true;
        },

        enableRaProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isEnabling = false;
        },

        disableRaProfile: (state, action: PayloadAction<{ authorityUuid: string; uuid: string }>) => {
            state.isDisabling = true;
        },

        disableRaProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDisabling = false;

            const raProfile = state.raProfiles.find((raProfile) => raProfile.uuid === action.payload.uuid);
            if (raProfile) raProfile.enabled = false;

            if (state.raProfile?.uuid === action.payload.uuid) state.raProfile.enabled = false;
        },

        disableRaProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDisabling = false;
        },

        deleteRaProfile: (state, action: PayloadAction<{ authorityUuid: string; uuid: string; redirect?: string }>) => {
            state.isDeleting = true;
        },

        deleteRaProfileSuccess: (state, action: PayloadAction<{ uuid: string; redirect?: string }>) => {
            state.isDeleting = false;

            const index = state.raProfiles.findIndex((raProfile) => raProfile.uuid === action.payload.uuid);
            if (index !== -1) state.raProfiles.splice(index, 1);

            if (state.raProfile?.uuid === action.payload.uuid) state.raProfile = undefined;
        },

        deleteRaProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
        },

        activateAcme: (
            state,
            action: PayloadAction<{
                authorityUuid: string;
                uuid: string;
                acmeProfileUuid: string;
                raProfileActivateAcmeRequest: RaProfileActivateAcmeRequestModel;
            }>,
        ) => {
            state.isActivatingAcme = true;
        },

        activateAcmeSuccess: (state, action: PayloadAction<{ raProfileAcmeDetailResponse: RaProfileAcmeDetailResponseModel }>) => {
            state.isActivatingAcme = false;
            state.acmeDetails = action.payload.raProfileAcmeDetailResponse;
        },

        activateAcmeFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isActivatingAcme = false;
        },

        deactivateAcme: (state, action: PayloadAction<{ authorityUuid: string; uuid: string }>) => {
            state.isDeactivatingAcme = true;
        },

        deactivateAcmeSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeactivatingAcme = false;
            state.acmeDetails = undefined;
        },

        deactivateAcmeFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeactivatingAcme = false;
        },

        getAcmeDetails: (state, action: PayloadAction<{ authorityUuid: string; uuid: string }>) => {
            state.isFetchingAcmeDetails = true;
        },

        getAcmeDetailsSuccess: (state, action: PayloadAction<{ raAcmeLink: RaProfileAcmeDetailResponseModel }>) => {
            state.isFetchingAcmeDetails = false;
            state.acmeDetails = action.payload.raAcmeLink;
        },

        getAcmeDetailsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingAcmeDetails = false;
        },
        activateCmp: (
            state,
            action: PayloadAction<{
                authorityUuid: string;
                uuid: string;
                cmpProfileUuid: string;
                raProfileActivateCmpRequest: RaProfileActivateCmpRequestModel;
            }>,
        ) => {
            state.isActivatingCmp = true;
        },

        activateCmpSuccess: (state, action: PayloadAction<{ raProfileCmpDetailResponse: RaProfileCmpDetailResponseModel }>) => {
            state.isActivatingCmp = false;
            state.cmpDetails = action.payload.raProfileCmpDetailResponse;
        },

        activateCmpFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isActivatingCmp = false;
        },

        deactivateCmp: (state, action: PayloadAction<{ authorityUuid: string; uuid: string }>) => {
            state.isDeactivatingCmp = true;
        },

        deactivateCmpSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeactivatingCmp = false;
            state.cmpDetails = undefined;
        },

        deactivateCmpFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeactivatingCmp = false;
        },

        getCmpDetails: (state, action: PayloadAction<{ authorityUuid: string; uuid: string }>) => {
            state.isFetchingCmpDetails = true;
        },

        getCmpDetailsSuccess: (state, action: PayloadAction<{ raCmpLink: RaProfileCmpDetailResponseModel }>) => {
            state.isFetchingCmpDetails = false;
            state.cmpDetails = action.payload.raCmpLink;
        },

        getCmpDetailsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingCmpDetails = false;
        },

        activateScep: (
            state,
            action: PayloadAction<{
                authorityUuid: string;
                uuid: string;
                scepProfileUuid: string;
                raProfileActivateScepRequest: RaProfileActivateScepRequestModel;
            }>,
        ) => {
            state.isActivatingScep = true;
        },

        activateScepSuccess: (state, action: PayloadAction<{ raProfileScepDetailResponse: RaProfileScepDetailResponseModel }>) => {
            state.isActivatingScep = false;
            state.scepDetails = action.payload.raProfileScepDetailResponse;
        },

        activateScepFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isActivatingScep = false;
        },

        deactivateScep: (state, action: PayloadAction<{ authorityUuid: string; uuid: string }>) => {
            state.isDeactivatingScep = true;
        },

        deactivateScepSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeactivatingScep = false;
            state.scepDetails = undefined;
        },

        deactivateScepFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeactivatingScep = false;
        },

        getScepDetails: (state, action: PayloadAction<{ authorityUuid: string; uuid: string }>) => {
            state.isFetchingScepDetails = true;
        },

        getScepDetailsSuccess: (state, action: PayloadAction<{ raScepLink: RaProfileScepDetailResponseModel }>) => {
            state.isFetchingScepDetails = false;
            state.scepDetails = action.payload.raScepLink;
        },

        getScepDetailsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingScepDetails = false;
        },

        bulkDeleteRaProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.bulkDeleteErrorMessages = [];
            state.isBulkDeleting = true;
        },

        bulkDeleteRaProfilesSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDeleting = false;

            action.payload.uuids.forEach((uuid) => {
                const index = state.raProfiles.findIndex((raProfile) => raProfile.uuid === uuid);
                if (index >= 0) state.raProfiles.splice(index, 1);
            });

            if (state.raProfile && action.payload.uuids.includes(state.raProfile.uuid)) state.raProfile = undefined;
        },

        bulkDeleteRaProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeleting = false;
        },

        bulkEnableRaProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = true;
        },

        bulkEnableRaProfilesSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = false;

            state.raProfiles = state.raProfiles.map((raProfile) => ({
                ...raProfile,
                enabled: action.payload.uuids.includes(raProfile.uuid) ? true : raProfile.enabled,
            }));

            if (state.raProfile && action.payload.uuids.includes(state.raProfile.uuid)) state.raProfile.enabled = true;
        },

        bulkEnableRaProfilesFailure: (state, action: PayloadAction<{ error: string }>) => {
            state.isBulkEnabling = false;
        },

        bulkDisableRaProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = true;
        },

        bulkDisableRaProfilesSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = false;

            state.raProfiles = state.raProfiles.map((raProfile) => ({
                ...raProfile,
                enabled: action.payload.uuids.includes(raProfile.uuid) ? false : raProfile.enabled,
            }));

            if (state.raProfile && action.payload.uuids.includes(state.raProfile.uuid)) state.raProfile.enabled = false;
        },

        bulkDisableRaProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDisabling = false;
        },

        listIssuanceAttributeDescriptors: (state, action: PayloadAction<{ authorityUuid: string; uuid: string }>) => {
            state.isFetchingIssuanceAttributes = true;
        },

        listIssuanceAttributesDescriptorsSuccess: (
            state,
            action: PayloadAction<{ uuid: string; attributesDescriptors: AttributeDescriptorModel[] }>,
        ) => {
            state.isFetchingIssuanceAttributes = false;

            state.issuanceAttributesDescriptors = action.payload.attributesDescriptors;
        },

        listIssuanceAttributesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingIssuanceAttributes = false;
        },

        listRevocationAttributeDescriptors: (state, action: PayloadAction<{ authorityUuid: string; uuid: string }>) => {
            state.isFetchingRevocationAttributes = true;
        },

        listRevocationAttributeDescriptorsSuccess: (
            state,
            action: PayloadAction<{ uuid: string; attributesDescriptors: AttributeDescriptorModel[] }>,
        ) => {
            state.isFetchingRevocationAttributes = false;
            state.revocationAttributesDescriptors = action.payload.attributesDescriptors;
        },

        listRevocationAttributeDescriptorsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingRevocationAttributes = false;
        },

        checkCompliance: (state, action: PayloadAction<{ resource: Resource; uuids: string[] }>) => {
            state.isCheckingCompliance = true;
        },

        checkComplianceSuccess: (state, action: PayloadAction<void>) => {
            state.isCheckingCompliance = false;
        },

        checkComplianceFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCheckingCompliance = false;
        },

        associateRaProfile: (
            state,
            action: PayloadAction<{ uuid: string; complianceProfileUuid: string; complianceProfileName: string; description?: string }>,
        ) => {
            state.isAssociatingComplianceProfile = true;
        },

        associateRaProfileSuccess: (
            state,
            action: PayloadAction<{ uuid: string; complianceProfileUuid: string; complianceProfileName: string; description?: string }>,
        ) => {
            state.isAssociatingComplianceProfile = false;
        },

        associateRaProfileFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isAssociatingComplianceProfile = false;
        },

        dissociateRaProfile: (
            state,
            action: PayloadAction<{ uuid: string; complianceProfileUuid: string; complianceProfileName: string; description?: string }>,
        ) => {
            state.isDissociatingComplianceProfile = true;
        },

        dissociateRaProfileSuccess: (
            state,
            action: PayloadAction<{ uuid: string; complianceProfileUuid: string; complianceProfileName: string; description?: string }>,
        ) => {
            state.isDissociatingComplianceProfile = false;
        },

        dissociateRaProfileFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDissociatingComplianceProfile = false;
        },

        getAssociatedApprovalProfiles: (state, action: PayloadAction<{ authorityUuid: string; raProfileUuid: string }>) => {
            state.associatedApprovalProfiles = [];
            state.isFetchingApprovalProfiles = true;
        },

        getAssociatedApprovalProfilesSuccess: (state, action: PayloadAction<{ associatedApprovalProfiles: ProfileApprovalModel[] }>) => {
            state.isFetchingApprovalProfiles = false;
            state.associatedApprovalProfiles = action.payload.associatedApprovalProfiles;
        },

        getAssociatedApprovalProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingApprovalProfiles = false;
        },

        associateRAProfileWithApprovalProfile: (
            state,
            action: PayloadAction<{ raProfileUuid: string; approvalProfileUuid: string; authorityUuid: string }>,
        ) => {
            state.isAssociatingApprovalProfile = true;
        },

        associateRAProfileWithApprovalProfileSuccess: (
            state,
            action: PayloadAction<{ raProfileUuid: string; approvalProfileUuid: string; authorityUuid: string }>,
        ) => {
            state.isAssociatingApprovalProfile = false;
        },

        associateRAProfileWithApprovalProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isAssociatingApprovalProfile = false;
        },

        disassociateRAProfileFromApprovalProfile: (
            state,
            action: PayloadAction<{ raProfileUuid: string; approvalProfileUuid: string; authorityUuid: string }>,
        ) => {
            state.isDissociatingApprovalProfile = true;
        },

        disassociateRAProfileFromApprovalProfileSuccess: (
            state,
            action: PayloadAction<{ raProfileUuid: string; approvalProfileUuid: string; authorityUuid: string }>,
        ) => {
            state.isDissociatingApprovalProfile = false;

            if (!state.associatedApprovalProfiles) return;
            const approvalProfileIndex = state.associatedApprovalProfiles.findIndex(
                (profile) => profile.uuid === action.payload.approvalProfileUuid,
            );

            if (approvalProfileIndex >= 0) state.associatedApprovalProfiles.splice(approvalProfileIndex, 1);
        },

        disassociateRAProfileFromApprovalProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDissociatingApprovalProfile = false;
        },

        getRaProfileWithoutAuthority: (state, action: PayloadAction<{ uuid: string }>) => {
            if (state.raProfile?.uuid !== action.payload.uuid) {
                state.raProfile = undefined;
            }
            state.isFetchingDetail = true;
        },

        getRaProfileWithoutAuthoritySuccess: (state, action: PayloadAction<{ raProfile: RaProfileResponseModel }>) => {
            state.isFetchingDetail = false;
            state.raProfile = action.payload.raProfile;
        },

        getRaProfileWithoutAuthorityFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        deleteRaProfileWithoutAuthority: (state, action: PayloadAction<{ uuid: string; redirect?: string }>) => {
            state.isDeleting = true;
        },

        deleteRaProfileWithoutAuthoritySuccess: (state, action: PayloadAction<{ uuid: string; redirect?: string }>) => {
            state.isDeleting = false;
        },

        deleteRaProfileWithoutAuthorityFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const checkedRows = createSelector(state, (state: State) => state.checkedRows);

const raProfile = createSelector(state, (state: State) => state.raProfile);
const raProfiles = createSelector(state, (state: State) => state.raProfiles);
const associatedApprovalProfiles = createSelector(state, (state: State) => state.associatedApprovalProfiles);
const acmeDetails = createSelector(state, (state: State) => state.acmeDetails);
const scepDetails = createSelector(state, (state: State) => state.scepDetails);
const cmpDetails = createSelector(state, (state: State) => state.cmpDetails);
const issuanceAttributes = createSelector(state, (state: State) => state.issuanceAttributesDescriptors);
const revocationAttributes = createSelector(state, (state: State) => state.revocationAttributesDescriptors);

const isDissociatingApprovalProfile = createSelector(state, (state: State) => state.isDissociatingApprovalProfile);
const isAssociatingApprovalProfile = createSelector(state, (state: State) => state.isAssociatingApprovalProfile);
const isFetchingApprovalProfiles = createSelector(state, (state: State) => state.isFetchingApprovalProfiles);
const isFetchingList = createSelector(state, (state: State) => state.isFetchingList);
const isFetchingDetail = createSelector(state, (state: State) => state.isFetchingDetail);
const isFetchingAttributes = createSelector(state, (state: State) => state.isFetchingAttributes);
const isFetchingIssuanceAttributes = createSelector(state, (state: State) => state.isFetchingIssuanceAttributes);
const isFetchingRevocationAttributes = createSelector(state, (state: State) => state.isFetchingRevocationAttributes);
const isFetchingAcmeDetails = createSelector(state, (state: State) => state.isFetchingAcmeDetails);
const isFetchingScepDetails = createSelector(state, (state: State) => state.isFetchingScepDetails);
const isFetchingCmpDetails = createSelector(state, (state: State) => state.isFetchingCmpDetails);
const isCreating = createSelector(state, (state: State) => state.isCreating);
const createRaProfileSucceeded = createSelector(state, (state: State) => state.createRaProfileSucceeded);
const createdRaProfileUuid = createSelector(state, (state: State) => state.createdRaProfileUuid);
const isDeleting = createSelector(state, (state: State) => state.isDeleting);
const isBulkDeleting = createSelector(state, (state: State) => state.isBulkDeleting);
const isUpdating = createSelector(state, (state: State) => state.isUpdating);
const updateRaProfileSucceeded = createSelector(state, (state: State) => state.updateRaProfileSucceeded);
const isEnabling = createSelector(state, (state: State) => state.isEnabling);
const isBulkEnabling = createSelector(state, (state: State) => state.isBulkEnabling);
const isDisabling = createSelector(state, (state: State) => state.isDisabling);
const isBulkDisabling = createSelector(state, (state: State) => state.isBulkDisabling);
const isActivatingAcme = createSelector(state, (state: State) => state.isActivatingAcme);
const isDeactivatingAcme = createSelector(state, (state: State) => state.isDeactivatingAcme);
const isActivatingScep = createSelector(state, (state: State) => state.isActivatingScep);
const isDeactivatingScep = createSelector(state, (state: State) => state.isDeactivatingScep);

const isActivatingCmp = createSelector(state, (state: State) => state.isActivatingCmp);
const isDeactivatingCmp = createSelector(state, (state: State) => state.isDeactivatingCmp);

const isFetchingAssociatedComplianceProfiles = createSelector(state, (state: State) => state.isFetchingAssociatedComplianceProfiles);
const associatedComplianceProfiles = createSelector(state, (state: State) => state.associatedComplianceProfiles);

export const selectors = {
    state,

    checkedRows,

    raProfile,
    raProfiles,
    associatedApprovalProfiles,

    acmeDetails,
    scepDetails,
    cmpDetails,
    issuanceAttributes,
    revocationAttributes,

    isAssociatingApprovalProfile,
    isFetchingApprovalProfiles,
    isFetchingList,
    isFetchingDetail,
    isFetchingAttributes,
    isFetchingIssuanceAttributes,
    isFetchingRevocationAttributes,
    isFetchingAcmeDetails,
    isFetchingScepDetails,
    isFetchingCmpDetails,
    isCreating,
    createRaProfileSucceeded,
    createdRaProfileUuid,
    isDeleting,
    isBulkDeleting,
    isUpdating,
    updateRaProfileSucceeded,
    isEnabling,
    isBulkEnabling,
    isDisabling,
    isBulkDisabling,
    isActivatingAcme,
    isActivatingCmp,
    isDeactivatingCmp,
    isDeactivatingAcme,
    isActivatingScep,
    isDeactivatingScep,
    isFetchingAssociatedComplianceProfiles,
    associatedComplianceProfiles,
    isDissociatingApprovalProfile,
};

export const actions = slice.actions;

export default slice.reducer;
