import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import { resetSliceState } from 'ducks/reducerUtils';
import { transformAttributeDescriptorDtoToModel } from 'ducks/transform/attributes';
import {
    type BaseAttributeDto,
    type CertificateDto,
    type NameAndUuidDto,
    type PaginationResponseDtoSigningRecordListDto,
    type SearchFieldDataByGroupDto,
    type SignatureFamilyDeclaration,
    type SignatureLevel,
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

/** The protocols Core supports for a workflow, and the failure of their listing. */
export interface SupportedProtocolList {
    protocols: SigningProtocol[];
    failure?: { reason?: string };
}

/** A workflow's formatting connectors with the state of their fetch. */
export interface SignatureFormattingConnectorList {
    connectors: ConnectorResponseModel[];
    isFetching: boolean;
    failure?: { reason?: string };
}

/** Connector, family and level whose formatting attributes Core lists for a content-signing profile. */
export interface ContentSigningFormattingSelection {
    connectorUuid: string;
    family: string;
    level: SignatureLevel;
}

/** Filters `listSigningCertificates` applies: the workflow's floor and the profile's certificate purpose. */
export interface SigningCertificatesQuery {
    workflowType: SigningWorkflowType;
    qualifiedTimestamp?: boolean;
    requireNonRepudiation?: boolean;
    requiredExtendedKeyUsageOids?: string[];
}

export type State = {
    deleteErrorMessage: string;
    bulkDeleteErrorMessages: BulkActionMessageDto[];

    signingProfile?: SigningProfileDto;
    signingProfiles: SigningProfileListDto[];

    tspActivationDetails?: TspActivationDetailDto;
    supportedProtocols: SigningProtocol[];
    supportedProtocolsWorkflowType?: SigningWorkflowType;
    failedSupportedProtocolsFetch?: { reason?: string };
    signingCertificates: CertificateDto[];
    signingCertificatesListed: boolean;
    signingOperationAttributeDescriptors: BaseAttributeDto[];
    signatureFormattingConnectorAttributeDescriptors: BaseAttributeDto[];
    contentSigningProfileAttributeDescriptors: BaseAttributeDto[];
    contentSigningRequestAttributeDescriptors: BaseAttributeDto[];
    contentSigningAttributesSelection?: ContentSigningFormattingSelection;
    failedContentSigningProfileAttributesFetch?: { reason?: string };
    signatureFormattingConnectors: ConnectorResponseModel[];
    signatureFormattingConnectorsWorkflowType?: SigningWorkflowType;
    signatureFormattingConnectorDeclarations?: { connectorUuid: string; declarations: SignatureFamilyDeclaration[] };
    failedSignatureFormattingConnectorsFetch?: { reason?: string };
    failedSignatureFormattingConnectorDeclarationsFetch?: { connectorUuid: string; reason?: string };
    signingRecords?: PaginationResponseDtoSigningRecordListDto;
    timestampSourceCandidates: SigningProfileDto[];
    ineligibleTimestampSourceCandidates: NameAndUuidDto[];
    unreadableTimestampSourceCandidates: NameAndUuidDto[];
    failedTimestampSourceCandidatesFetch?: { reason?: string };

    searchableFields?: SearchFieldDataByGroupDto[];

    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isFetchingSearchableFields: boolean;
    isFetchingTspActivationDetails: boolean;
    isFetchingSupportedProtocols: boolean;
    isFetchingSigningCertificates: boolean;
    failedSigningCertificatesFetch?: { reason?: string };
    isFetchingSignatureAttributes: boolean;
    isFetchingSignatureFormattingConnectorAttributes: boolean;
    isFetchingContentSigningProfileAttributes: boolean;
    isFetchingSignatureFormattingConnectors: boolean;
    isFetchingSignatureFormattingConnectorDeclarations: boolean;
    isFetchingSigningRecords: boolean;
    isFetchingTimestampSourceCandidates: boolean;
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
    isActivatingIlmNative: boolean;
    isDeactivatingIlmNative: boolean;
};

export const initialState: State = {
    deleteErrorMessage: '',
    bulkDeleteErrorMessages: [],

    signingProfiles: [],

    supportedProtocols: [],
    signingCertificates: [],
    signingCertificatesListed: false,
    signingOperationAttributeDescriptors: [],
    signatureFormattingConnectorAttributeDescriptors: [],
    contentSigningProfileAttributeDescriptors: [],
    contentSigningRequestAttributeDescriptors: [],
    signatureFormattingConnectors: [],
    timestampSourceCandidates: [],
    ineligibleTimestampSourceCandidates: [],
    unreadableTimestampSourceCandidates: [],

    isFetchingList: false,
    isFetchingDetail: false,
    isFetchingSearchableFields: false,
    isFetchingTspActivationDetails: false,
    isFetchingSupportedProtocols: false,
    isFetchingSigningCertificates: false,
    isFetchingSignatureAttributes: false,
    isFetchingSignatureFormattingConnectorAttributes: false,
    isFetchingContentSigningProfileAttributes: false,
    isFetchingSignatureFormattingConnectors: false,
    isFetchingSignatureFormattingConnectorDeclarations: false,
    isFetchingSigningRecords: false,
    isFetchingTimestampSourceCandidates: false,
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
    isActivatingIlmNative: false,
    isDeactivatingIlmNative: false,
};

export const slice = createSlice({
    name: 'signingProfiles',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
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

            // On success the epic re-fetches the list from the server (and steps the page back when the
            // current page was emptied), so no optimistic list mutation is needed here — we only surface
            // any per-item failures.
            if (action.payload.errors?.length > 0) {
                state.bulkDeleteErrorMessages = action.payload.errors;
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

        // ILM_NATIVE activation
        activateIlmNative: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isActivatingIlmNative = true;
        },

        activateIlmNativeSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isActivatingIlmNative = false;
            if (
                state.signingProfile?.uuid === action.payload.uuid &&
                !state.signingProfile.enabledProtocols?.includes(SigningProtocol.IlmNative)
            ) {
                state.signingProfile.enabledProtocols = [...(state.signingProfile.enabledProtocols ?? []), SigningProtocol.IlmNative];
            }
        },

        activateIlmNativeFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isActivatingIlmNative = false;
        },

        deactivateIlmNative: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeactivatingIlmNative = true;
        },

        deactivateIlmNativeSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeactivatingIlmNative = false;
            if (state.signingProfile?.uuid === action.payload.uuid) {
                state.signingProfile.enabledProtocols = state.signingProfile.enabledProtocols?.filter(
                    (p) => p !== SigningProtocol.IlmNative,
                );
            }
        },

        deactivateIlmNativeFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeactivatingIlmNative = false;
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
            state.supportedProtocols = [];
            state.supportedProtocolsWorkflowType = action.payload.workflowType;
            state.failedSupportedProtocolsFetch = undefined;
        },

        listSupportedProtocolsSuccess: (state, action: PayloadAction<{ supportedProtocols: SigningProtocol[] }>) => {
            state.isFetchingSupportedProtocols = false;
            state.supportedProtocols = action.payload.supportedProtocols;
        },

        listSupportedProtocolsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingSupportedProtocols = false;
            state.failedSupportedProtocolsFetch = { reason: action.payload.error };
        },

        // Signing certificates
        listSigningCertificates: (state, action: PayloadAction<SigningCertificatesQuery>) => {
            state.isFetchingSigningCertificates = true;
            state.signingCertificatesListed = false;
            state.failedSigningCertificatesFetch = undefined;
        },

        listSigningCertificatesSuccess: (state, action: PayloadAction<{ signingCertificates: CertificateDto[] }>) => {
            state.isFetchingSigningCertificates = false;
            state.signingCertificates = action.payload.signingCertificates;
            state.signingCertificatesListed = true;
        },

        listSigningCertificatesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingSigningCertificates = false;
            state.signingCertificates = [];
            state.failedSigningCertificatesFetch = { reason: action.payload.error };
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

        // Content-signing profile attributes of the chosen connector, family and level
        listContentSigningProfileAttributes: (
            state,
            action: PayloadAction<ContentSigningFormattingSelection & { signingProfileUuid?: string }>,
        ) => {
            const { connectorUuid, family, level } = action.payload;
            state.isFetchingContentSigningProfileAttributes = true;
            state.contentSigningProfileAttributeDescriptors = [];
            state.contentSigningRequestAttributeDescriptors = [];
            state.contentSigningAttributesSelection = { connectorUuid, family, level };
            state.failedContentSigningProfileAttributesFetch = undefined;
        },

        listContentSigningProfileAttributesSuccess: (
            state,
            action: PayloadAction<{ profileAttributes: BaseAttributeDto[]; requestAttributes: BaseAttributeDto[] }>,
        ) => {
            state.isFetchingContentSigningProfileAttributes = false;
            state.contentSigningProfileAttributeDescriptors = action.payload.profileAttributes;
            state.contentSigningRequestAttributeDescriptors = action.payload.requestAttributes;
        },

        listContentSigningProfileAttributesFailure: (state, action: PayloadAction<{ reason: string | undefined }>) => {
            state.isFetchingContentSigningProfileAttributes = false;
            state.failedContentSigningProfileAttributesFetch = action.payload;
        },

        // Signature Formatting Connectors
        listSignatureFormattingConnectors: (state, action: PayloadAction<{ workflowType: SigningWorkflowType }>) => {
            state.isFetchingSignatureFormattingConnectors = true;
            state.signatureFormattingConnectors = [];
            state.signatureFormattingConnectorsWorkflowType = action.payload.workflowType;
            state.failedSignatureFormattingConnectorsFetch = undefined;
        },

        listSignatureFormattingConnectorsSuccess: (state, action: PayloadAction<{ connectors: ConnectorResponseModel[] }>) => {
            state.isFetchingSignatureFormattingConnectors = false;
            state.signatureFormattingConnectors = action.payload.connectors;
        },

        listSignatureFormattingConnectorsFailure: (state, action: PayloadAction<{ reason: string | undefined }>) => {
            state.isFetchingSignatureFormattingConnectors = false;
            state.failedSignatureFormattingConnectorsFetch = action.payload;
        },

        // Signature Formatting Connector family declarations
        listSignatureFormattingConnectorDeclarations: (
            state,
            action: PayloadAction<{ connectorUuid: string; signingProfileUuid?: string }>,
        ) => {
            state.isFetchingSignatureFormattingConnectorDeclarations = true;
            state.signatureFormattingConnectorDeclarations = undefined;
            state.failedSignatureFormattingConnectorDeclarationsFetch = undefined;
        },

        listSignatureFormattingConnectorDeclarationsSuccess: (
            state,
            action: PayloadAction<{ connectorUuid: string; declarations: SignatureFamilyDeclaration[] }>,
        ) => {
            state.isFetchingSignatureFormattingConnectorDeclarations = false;
            state.signatureFormattingConnectorDeclarations = action.payload;
        },

        listSignatureFormattingConnectorDeclarationsFailure: (
            state,
            action: PayloadAction<{ connectorUuid: string; reason: string | undefined }>,
        ) => {
            state.isFetchingSignatureFormattingConnectorDeclarations = false;
            state.failedSignatureFormattingConnectorDeclarationsFetch = action.payload;
        },

        // Timestamp sources: TIMESTAMPING profiles a content-signing profile can name
        listTimestampSourceCandidates: (state, action: PayloadAction<void>) => {
            state.isFetchingTimestampSourceCandidates = true;
            state.timestampSourceCandidates = [];
            state.ineligibleTimestampSourceCandidates = [];
            state.unreadableTimestampSourceCandidates = [];
            state.failedTimestampSourceCandidatesFetch = undefined;
        },

        listTimestampSourceCandidatesSuccess: (
            state,
            action: PayloadAction<{ candidates: SigningProfileDto[]; ineligible: NameAndUuidDto[]; unreadable: NameAndUuidDto[] }>,
        ) => {
            state.isFetchingTimestampSourceCandidates = false;
            state.timestampSourceCandidates = action.payload.candidates;
            state.ineligibleTimestampSourceCandidates = action.payload.ineligible;
            state.unreadableTimestampSourceCandidates = action.payload.unreadable;
        },

        listTimestampSourceCandidatesFailure: (state, action: PayloadAction<{ reason: string | undefined }>) => {
            state.isFetchingTimestampSourceCandidates = false;
            state.failedTimestampSourceCandidatesFetch = action.payload;
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

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const signingProfile = createSelector(state, (state) => state.signingProfile);
const signingProfiles = createSelector(state, (state) => state.signingProfiles);
const tspActivationDetails = createSelector(state, (state) => state.tspActivationDetails);
const supportedProtocols = createSelector(state, (state) => state.supportedProtocols);
const supportedProtocolsWorkflowType = createSelector(state, (state) => state.supportedProtocolsWorkflowType);
const failedSupportedProtocolsFetch = createSelector(state, (state) => state.failedSupportedProtocolsFetch);
const signingCertificates = createSelector(state, (state) => state.signingCertificates);
const signingCertificatesListed = createSelector(state, (state) => state.signingCertificatesListed);
const failedSigningCertificatesFetch = createSelector(state, (state) => state.failedSigningCertificatesFetch);
const signingOperationAttributeDescriptors = createSelector(state, (state) => state.signingOperationAttributeDescriptors);
const signatureFormattingConnectorAttributeDescriptors = createSelector(
    state,
    (state) => state.signatureFormattingConnectorAttributeDescriptors,
);
const signingOperationAttributeModels = createSelector(signingOperationAttributeDescriptors, (descriptors) =>
    descriptors.map(transformAttributeDescriptorDtoToModel),
);
const signatureFormattingConnectorAttributeModels = createSelector(signatureFormattingConnectorAttributeDescriptors, (descriptors) =>
    descriptors.map(transformAttributeDescriptorDtoToModel),
);
const signatureFormattingConnectors = createSelector(state, (state) => state.signatureFormattingConnectors);
const signatureFormattingConnectorsWorkflowType = createSelector(state, (state) => state.signatureFormattingConnectorsWorkflowType);
const failedSignatureFormattingConnectorsFetch = createSelector(state, (state) => state.failedSignatureFormattingConnectorsFetch);
const signatureFormattingConnectorDeclarations = createSelector(state, (state) => state.signatureFormattingConnectorDeclarations);
const failedSignatureFormattingConnectorDeclarationsFetch = createSelector(
    state,
    (state) => state.failedSignatureFormattingConnectorDeclarationsFetch,
);
const signingRecords = createSelector(state, (state) => state.signingRecords);
const contentSigningProfileAttributeDescriptors = createSelector(state, (state) => state.contentSigningProfileAttributeDescriptors);
const contentSigningProfileAttributeModels = createSelector(contentSigningProfileAttributeDescriptors, (descriptors) =>
    descriptors.map(transformAttributeDescriptorDtoToModel),
);
const contentSigningRequestAttributeDescriptors = createSelector(state, (state) => state.contentSigningRequestAttributeDescriptors);
const isFetchingContentSigningProfileAttributes = createSelector(state, (state) => state.isFetchingContentSigningProfileAttributes);
const failedContentSigningProfileAttributesFetch = createSelector(state, (state) => state.failedContentSigningProfileAttributesFetch);
/** The selection whose formatting attributes Core listed, or nothing while a listing is pending or after it failed. */
const contentSigningAttributesListedFor = createSelector([state], (state): ContentSigningFormattingSelection | undefined =>
    state.isFetchingContentSigningProfileAttributes || state.failedContentSigningProfileAttributesFetch
        ? undefined
        : state.contentSigningAttributesSelection,
);
const timestampSourceCandidates = createSelector(state, (state) => state.timestampSourceCandidates);
const ineligibleTimestampSourceCandidates = createSelector(state, (state) => state.ineligibleTimestampSourceCandidates);
const unreadableTimestampSourceCandidates = createSelector(state, (state) => state.unreadableTimestampSourceCandidates);
const failedTimestampSourceCandidatesFetch = createSelector(state, (state) => state.failedTimestampSourceCandidatesFetch);
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
const isFetchingSignatureFormattingConnectorDeclarations = createSelector(
    state,
    (state) => state.isFetchingSignatureFormattingConnectorDeclarations,
);
const isFetchingSigningRecords = createSelector(state, (state) => state.isFetchingSigningRecords);
const isFetchingTimestampSourceCandidates = createSelector(state, (state) => state.isFetchingTimestampSourceCandidates);
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
const isActivatingIlmNative = createSelector(state, (state) => state.isActivatingIlmNative);
const isDeactivatingIlmNative = createSelector(state, (state) => state.isDeactivatingIlmNative);

const noProtocols: SupportedProtocolList = { protocols: [] };

/** The protocols Core supports for the given workflow and the failure of their listing, or none while another workflow's are stored. */
const supportedProtocolListFor = (workflowType: SigningWorkflowType | undefined) =>
    createSelector(
        [supportedProtocols, failedSupportedProtocolsFetch, supportedProtocolsWorkflowType],
        (protocols, failure, listedFor): SupportedProtocolList =>
            workflowType !== undefined && listedFor === workflowType ? { protocols, failure } : noProtocols,
    );

const notListed: SignatureFormattingConnectorList = { connectors: [], isFetching: false };

/** The formatting-connector list and fetch state of the given workflow, or an empty list while another workflow's is stored. */
const signatureFormattingConnectorListFor = (workflowType: SigningWorkflowType) =>
    createSelector(
        [
            signatureFormattingConnectors,
            isFetchingSignatureFormattingConnectors,
            failedSignatureFormattingConnectorsFetch,
            signatureFormattingConnectorsWorkflowType,
        ],
        (connectors, isFetching, failure, listedFor): SignatureFormattingConnectorList =>
            listedFor === workflowType ? { connectors, isFetching, failure } : notListed,
    );

export const selectors = {
    state,
    deleteErrorMessage,
    bulkDeleteErrorMessages,
    signingProfile,
    signingProfiles,
    tspActivationDetails,
    supportedProtocolListFor,
    signingCertificates,
    signingCertificatesListed,
    failedSigningCertificatesFetch,
    signingOperationAttributeDescriptors,
    signingOperationAttributeModels,
    signatureFormattingConnectorAttributeDescriptors,
    signatureFormattingConnectorAttributeModels,
    signatureFormattingConnectorListFor,
    signatureFormattingConnectorDeclarations,
    failedSignatureFormattingConnectorDeclarationsFetch,
    signingRecords,
    contentSigningProfileAttributeModels,
    contentSigningRequestAttributeDescriptors,
    contentSigningAttributesListedFor,
    isFetchingContentSigningProfileAttributes,
    failedContentSigningProfileAttributesFetch,
    timestampSourceCandidates,
    ineligibleTimestampSourceCandidates,
    unreadableTimestampSourceCandidates,
    failedTimestampSourceCandidatesFetch,
    searchableFields,
    isFetchingList,
    isFetchingDetail,
    isFetchingSearchableFields,
    isFetchingTspActivationDetails,
    isFetchingSupportedProtocols,
    isFetchingSigningCertificates,
    isFetchingSignatureAttributes,
    isFetchingSignatureFormattingConnectorAttributes,
    isFetchingSignatureFormattingConnectorDeclarations,
    isFetchingSigningRecords,
    isFetchingTimestampSourceCandidates,
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
    isActivatingIlmNative,
    isDeactivatingIlmNative,
};

export const actions = slice.actions;

export default slice.reducer;
