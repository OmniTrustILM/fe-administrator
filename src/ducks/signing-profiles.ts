import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
    type BaseAttributeDto,
    type CertificateDto,
    type PaginationResponseDtoSigningRecordListDto,
    type SearchFieldDataByGroupDto,
    type SigningProfileDto,
    type SigningProfileListDto,
    type SigningProfileRequestDto,
    SigningProtocol,
    type SigningWorkflowType,
    type TspActivationDetailDto,
} from 'types/openapi';
import type { BulkActionMessageDto } from 'types/openapi/models/BulkActionMessageDto';
import type { SearchRequestModel } from 'types/certificate';
import type { ConnectorResponseModel } from 'types/connectors';

export type State = {
    deleteErrorMessage: string;
    bulkDeleteErrorMessages: BulkActionMessageDto[];

    signingProfile?: SigningProfileDto;
    signingProfiles: SigningProfileListDto[];

    tspActivationDetails?: TspActivationDetailDto;
    supportedProtocols: SigningProtocol[];
    signingCertificates: CertificateDto[];
    signingOperationAttributeDescriptors: BaseAttributeDto[];
    signatureFormattingConnectorAttributeDescriptors: BaseAttributeDto[];
    signatureFormattingConnectors: ConnectorResponseModel[];
    signingRecords?: PaginationResponseDtoSigningRecordListDto;

    searchableFields?: SearchFieldDataByGroupDto[];

    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isFetchingSearchableFields: boolean;
    isFetchingTspActivationDetails: boolean;
    isFetchingSupportedProtocols: boolean;
    isFetchingSigningCertificates: boolean;
    isFetchingSignatureAttributes: boolean;
    isFetchingSignatureFormattingConnectorAttributes: boolean;
    isFetchingSignatureFormattingConnectors: boolean;
    isFetchingSigningRecords: boolean;
    isCreating: boolean;
    isDeleting: boolean;
    isUpdating: boolean;
    isEnabling: boolean;
    isDisabling: boolean;
    isBulkDeleting: boolean;
    isBulkEnabling: boolean;
    isBulkDisabling: boolean;
    isActivatingTsp: boolean;
    isDeactivatingTsp: boolean;
};

export const initialState: State = {
    deleteErrorMessage: '',
    bulkDeleteErrorMessages: [],

    signingProfiles: [],

    supportedProtocols: [],
    signingCertificates: [],
    signingOperationAttributeDescriptors: [],
    signatureFormattingConnectorAttributeDescriptors: [],
    signatureFormattingConnectors: [],

    isFetchingList: false,
    isFetchingDetail: false,
    isFetchingSearchableFields: false,
    isFetchingTspActivationDetails: false,
    isFetchingSupportedProtocols: false,
    isFetchingSigningCertificates: false,
    isFetchingSignatureAttributes: false,
    isFetchingSignatureFormattingConnectorAttributes: false,
    isFetchingSignatureFormattingConnectors: false,
    isFetchingSigningRecords: false,
    isCreating: false,
    isDeleting: false,
    isUpdating: false,
    isEnabling: false,
    isDisabling: false,
    isBulkDeleting: false,
    isBulkEnabling: false,
    isBulkDisabling: false,
    isActivatingTsp: false,
    isDeactivatingTsp: false,
};

export const slice = createSlice({
    name: 'signingProfiles',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            Object.keys(state).forEach((key) => {
                if (!Object.hasOwn(initialState, key)) (state as any)[key] = undefined;
            });
            Object.keys(initialState).forEach((key) => ((state as any)[key] = (initialState as any)[key]));
        },

        clearDeleteErrorMessages: (state, action: PayloadAction<void>) => {
            state.deleteErrorMessage = '';
            state.bulkDeleteErrorMessages = [];
        },

        // List
        listSigningProfiles: (state, action: PayloadAction<SearchRequestModel | undefined>) => {
            state.isFetchingList = true;
        },

        listSigningProfilesSuccess: (state, action: PayloadAction<{ signingProfiles: SigningProfileListDto[] }>) => {
            state.isFetchingList = false;
            state.signingProfiles = action.payload.signingProfiles;
        },

        listSigningProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        // Get detail
        getSigningProfile: (state, action: PayloadAction<{ uuid: string; version?: number }>) => {
            state.isFetchingDetail = true;
        },

        getSigningProfileSuccess: (state, action: PayloadAction<{ signingProfile: SigningProfileDto }>) => {
            state.isFetchingDetail = false;
            state.signingProfile = action.payload.signingProfile;
        },

        getSigningProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        // Searchable fields
        listSigningProfileSearchableFields: (state, action: PayloadAction<void>) => {
            state.isFetchingSearchableFields = true;
        },

        listSigningProfileSearchableFieldsSuccess: (state, action: PayloadAction<{ searchableFields: SearchFieldDataByGroupDto[] }>) => {
            state.isFetchingSearchableFields = false;
            state.searchableFields = action.payload.searchableFields;
        },

        listSigningProfileSearchableFieldsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingSearchableFields = false;
        },

        // Create
        createSigningProfile: (state, action: PayloadAction<{ signingProfileRequestDto: SigningProfileRequestDto }>) => {
            state.isCreating = true;
        },

        createSigningProfileSuccess: (state, action: PayloadAction<{ signingProfile: SigningProfileDto }>) => {
            state.isCreating = false;
        },

        createSigningProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
        },

        // Update
        updateSigningProfile: (state, action: PayloadAction<{ uuid: string; signingProfileRequestDto: SigningProfileRequestDto }>) => {
            state.isUpdating = true;
        },

        updateSigningProfileSuccess: (state, action: PayloadAction<{ signingProfile: SigningProfileDto }>) => {
            state.isUpdating = false;
            state.signingProfile = action.payload.signingProfile;
        },

        updateSigningProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
        },

        // Delete
        deleteSigningProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = true;
            state.deleteErrorMessage = '';
        },

        deleteSigningProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;

            const idx = state.signingProfiles.findIndex((p) => p.uuid === action.payload.uuid);
            if (idx >= 0) state.signingProfiles.splice(idx, 1);

            if (state.signingProfile?.uuid === action.payload.uuid) {
                state.signingProfile = undefined;
            }
        },

        deleteSigningProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
            state.deleteErrorMessage = action.payload.error || 'Unknown error';
        },

        // Enable / Disable
        enableSigningProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isEnabling = true;
        },

        enableSigningProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isEnabling = false;

            const idx = state.signingProfiles.findIndex((p) => p.uuid === action.payload.uuid);
            if (idx >= 0) state.signingProfiles[idx].enabled = true;

            if (state.signingProfile?.uuid === action.payload.uuid) {
                state.signingProfile.enabled = true;
            }
        },

        enableSigningProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isEnabling = false;
        },

        disableSigningProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDisabling = true;
        },

        disableSigningProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDisabling = false;

            const idx = state.signingProfiles.findIndex((p) => p.uuid === action.payload.uuid);
            if (idx >= 0) state.signingProfiles[idx].enabled = false;

            if (state.signingProfile?.uuid === action.payload.uuid) {
                state.signingProfile.enabled = false;
            }
        },

        disableSigningProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDisabling = false;
        },

        // Bulk operations
        bulkDeleteSigningProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.bulkDeleteErrorMessages = [];
            state.isBulkDeleting = true;
        },

        bulkDeleteSigningProfilesSuccess: (state, action: PayloadAction<{ uuids: string[]; errors: BulkActionMessageDto[] }>) => {
            state.isBulkDeleting = false;

            if (action.payload.errors?.length > 0) {
                state.bulkDeleteErrorMessages = action.payload.errors;
                return;
            }

            action.payload.uuids.forEach((uuid) => {
                const idx = state.signingProfiles.findIndex((p) => p.uuid === uuid);
                if (idx >= 0) state.signingProfiles.splice(idx, 1);
            });

            if (state.signingProfile && action.payload.uuids.includes(state.signingProfile.uuid)) {
                state.signingProfile = undefined;
            }
        },

        bulkDeleteSigningProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeleting = false;
        },

        bulkEnableSigningProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = true;
        },

        bulkEnableSigningProfilesSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = false;

            action.payload.uuids.forEach((uuid) => {
                const idx = state.signingProfiles.findIndex((p) => p.uuid === uuid);
                if (idx >= 0) state.signingProfiles[idx].enabled = true;
            });

            if (state.signingProfile && action.payload.uuids.includes(state.signingProfile.uuid)) {
                state.signingProfile.enabled = true;
            }
        },

        bulkEnableSigningProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkEnabling = false;
        },

        bulkDisableSigningProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = true;
        },

        bulkDisableSigningProfilesSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = false;

            action.payload.uuids.forEach((uuid) => {
                const idx = state.signingProfiles.findIndex((p) => p.uuid === uuid);
                if (idx >= 0) state.signingProfiles[idx].enabled = false;
            });

            if (state.signingProfile && action.payload.uuids.includes(state.signingProfile.uuid)) {
                state.signingProfile.enabled = false;
            }
        },

        bulkDisableSigningProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDisabling = false;
        },

        // TSP activation
        activateTsp: (state, action: PayloadAction<{ signingProfileUuid: string; tspProfileUuid: string }>) => {
            state.isActivatingTsp = true;
        },

        activateTspSuccess: (state, action: PayloadAction<{ tspActivationDetails: TspActivationDetailDto }>) => {
            state.isActivatingTsp = false;
            state.tspActivationDetails = action.payload.tspActivationDetails;
            if (state.signingProfile && !state.signingProfile.enabledProtocols?.includes(SigningProtocol.Tsp)) {
                state.signingProfile.enabledProtocols = [...(state.signingProfile.enabledProtocols ?? []), SigningProtocol.Tsp];
            }
        },

        activateTspFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isActivatingTsp = false;
        },

        deactivateTsp: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeactivatingTsp = true;
        },

        deactivateTspSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeactivatingTsp = false;
            state.tspActivationDetails = undefined;
            if (state.signingProfile) {
                state.signingProfile.enabledProtocols = state.signingProfile.enabledProtocols?.filter((p) => p !== SigningProtocol.Tsp);
            }
        },

        deactivateTspFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeactivatingTsp = false;
        },

        getTspActivationDetails: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isFetchingTspActivationDetails = true;
            state.tspActivationDetails = undefined;
        },

        getTspActivationDetailsSuccess: (state, action: PayloadAction<{ tspActivationDetails: TspActivationDetailDto }>) => {
            state.isFetchingTspActivationDetails = false;
            state.tspActivationDetails = action.payload.tspActivationDetails;
        },

        getTspActivationDetailsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingTspActivationDetails = false;
            state.tspActivationDetails = undefined;
        },

        // Supported protocols
        listSupportedProtocols: (state, action: PayloadAction<{ workflowType: SigningWorkflowType }>) => {
            state.isFetchingSupportedProtocols = true;
        },

        listSupportedProtocolsSuccess: (state, action: PayloadAction<{ supportedProtocols: SigningProtocol[] }>) => {
            state.isFetchingSupportedProtocols = false;
            state.supportedProtocols = action.payload.supportedProtocols;
        },

        listSupportedProtocolsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingSupportedProtocols = false;
        },

        // Signing certificates
        listSigningCertificates: (state, action: PayloadAction<{ workflowType: SigningWorkflowType; qualifiedTimestamp?: boolean }>) => {
            state.isFetchingSigningCertificates = true;
        },

        listSigningCertificatesSuccess: (state, action: PayloadAction<{ signingCertificates: CertificateDto[] }>) => {
            state.isFetchingSigningCertificates = false;
            state.signingCertificates = action.payload.signingCertificates;
        },

        listSigningCertificatesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingSigningCertificates = false;
        },

        // Signing operation attribute descriptors (for a selected certificate)
        listSignatureAttributesForCertificate: (state, action: PayloadAction<{ certificateUuid: string }>) => {
            state.isFetchingSignatureAttributes = true;
            state.signingOperationAttributeDescriptors = [];
        },

        listSignatureAttributesForCertificateSuccess: (state, action: PayloadAction<{ attributeDescriptors: BaseAttributeDto[] }>) => {
            state.isFetchingSignatureAttributes = false;
            state.signingOperationAttributeDescriptors = action.payload.attributeDescriptors;
        },

        listSignatureAttributesForCertificateFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingSignatureAttributes = false;
        },

        // Signature Formatting Connector attribute descriptors
        listSignatureFormattingConnectorAttributes: (
            state,
            action: PayloadAction<{ connectorUuid: string; signingProfileUuid?: string }>,
        ) => {
            state.isFetchingSignatureFormattingConnectorAttributes = true;
            state.signatureFormattingConnectorAttributeDescriptors = [];
        },

        listSignatureFormattingConnectorAttributesSuccess: (state, action: PayloadAction<{ attributeDescriptors: BaseAttributeDto[] }>) => {
            state.isFetchingSignatureFormattingConnectorAttributes = false;
            state.signatureFormattingConnectorAttributeDescriptors = action.payload.attributeDescriptors;
        },

        listSignatureFormattingConnectorAttributesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingSignatureFormattingConnectorAttributes = false;
        },

        // Signature Formatting Connectors (filtered by feature)
        listSignatureFormattingConnectors: (state, action: PayloadAction<{ workflowType: SigningWorkflowType }>) => {
            state.isFetchingSignatureFormattingConnectors = true;
            state.signatureFormattingConnectors = [];
        },

        listSignatureFormattingConnectorsSuccess: (state, action: PayloadAction<{ connectors: ConnectorResponseModel[] }>) => {
            state.isFetchingSignatureFormattingConnectors = false;
            state.signatureFormattingConnectors = action.payload.connectors;
        },

        listSignatureFormattingConnectorsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingSignatureFormattingConnectors = false;
        },

        // Signing records
        listSigningRecordsForSigningProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isFetchingSigningRecords = true;
        },

        listSigningRecordsForSigningProfileSuccess: (
            state,
            action: PayloadAction<{ signingRecords: PaginationResponseDtoSigningRecordListDto }>,
        ) => {
            state.isFetchingSigningRecords = false;
            state.signingRecords = action.payload.signingRecords;
        },

        listSigningRecordsForSigningProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingSigningRecords = false;
        },
    },
});

const state = (reduxStore: any): State => reduxStore?.[slice.name];

const signingProfile = createSelector(state, (state) => state.signingProfile);
const signingProfiles = createSelector(state, (state) => state.signingProfiles);
const tspActivationDetails = createSelector(state, (state) => state.tspActivationDetails);
const supportedProtocols = createSelector(state, (state) => state.supportedProtocols);
const signingCertificates = createSelector(state, (state) => state.signingCertificates);
const signingOperationAttributeDescriptors = createSelector(state, (state) => state.signingOperationAttributeDescriptors);
const signatureFormattingConnectorAttributeDescriptors = createSelector(
    state,
    (state) => state.signatureFormattingConnectorAttributeDescriptors,
);
const signatureFormattingConnectors = createSelector(state, (state) => state.signatureFormattingConnectors);
const signingRecords = createSelector(state, (state) => state.signingRecords);
const searchableFields = createSelector(state, (state) => state.searchableFields);
const deleteErrorMessage = createSelector(state, (state) => state.deleteErrorMessage);
const bulkDeleteErrorMessages = createSelector(state, (state) => state.bulkDeleteErrorMessages);

const isFetchingList = createSelector(state, (state) => state.isFetchingList);
const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isFetchingSearchableFields = createSelector(state, (state) => state.isFetchingSearchableFields);
const isFetchingTspActivationDetails = createSelector(state, (state) => state.isFetchingTspActivationDetails);
const isFetchingSupportedProtocols = createSelector(state, (state) => state.isFetchingSupportedProtocols);
const isFetchingSigningCertificates = createSelector(state, (state) => state.isFetchingSigningCertificates);
const isFetchingSignatureAttributes = createSelector(state, (state) => state.isFetchingSignatureAttributes);
const isFetchingSignatureFormattingConnectorAttributes = createSelector(
    state,
    (state) => state.isFetchingSignatureFormattingConnectorAttributes,
);
const isFetchingSignatureFormattingConnectors = createSelector(state, (state) => state.isFetchingSignatureFormattingConnectors);
const isFetchingSigningRecords = createSelector(state, (state) => state.isFetchingSigningRecords);
const isCreating = createSelector(state, (state) => state.isCreating);
const isDeleting = createSelector(state, (state) => state.isDeleting);
const isUpdating = createSelector(state, (state) => state.isUpdating);
const isEnabling = createSelector(state, (state) => state.isEnabling);
const isDisabling = createSelector(state, (state) => state.isDisabling);
const isBulkDeleting = createSelector(state, (state) => state.isBulkDeleting);
const isBulkEnabling = createSelector(state, (state) => state.isBulkEnabling);
const isBulkDisabling = createSelector(state, (state) => state.isBulkDisabling);
const isActivatingTsp = createSelector(state, (state) => state.isActivatingTsp);
const isDeactivatingTsp = createSelector(state, (state) => state.isDeactivatingTsp);

export const selectors = {
    state,
    deleteErrorMessage,
    bulkDeleteErrorMessages,
    signingProfile,
    signingProfiles,
    tspActivationDetails,
    supportedProtocols,
    signingCertificates,
    signingOperationAttributeDescriptors,
    signatureFormattingConnectorAttributeDescriptors,
    signatureFormattingConnectors,
    signingRecords,
    searchableFields,
    isFetchingList,
    isFetchingDetail,
    isFetchingSearchableFields,
    isFetchingTspActivationDetails,
    isFetchingSupportedProtocols,
    isFetchingSigningCertificates,
    isFetchingSignatureAttributes,
    isFetchingSignatureFormattingConnectorAttributes,
    isFetchingSignatureFormattingConnectors,
    isFetchingSigningRecords,
    isCreating,
    isDeleting,
    isUpdating,
    isEnabling,
    isDisabling,
    isBulkDeleting,
    isBulkEnabling,
    isBulkDisabling,
    isActivatingTsp,
    isDeactivatingTsp,
};

export const actions = slice.actions;

export default slice.reducer;
