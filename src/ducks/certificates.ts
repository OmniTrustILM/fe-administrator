import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AttributeDescriptorModel } from 'types/attributes';
import type {
    CertificateBulkDeleteRequestModel,
    CertificateBulkDeleteResponseModel,
    CertificateBulkObjectModel,
    CertificateChainResponseModel,
    CertificateComplianceCheckModel,
    CertificateContentResponseModel,
    CertificateDetailResponseModel,
    CertificateHistoryModel,
    CertificateListResponseModel,
    CertificateObjectModel,
    CertificateRekeyRequestModel,
    CertificateRenewRequestModel,
    CertificateRevokeRequestModel,
    CertificateSignRequestModel,
    CertificateUploadModel,
    DownloadCertificateChainResponseModel,
    DownloadCertificateResponseModel,
    SearchRequestModel,
    ValidationCertificateResultModel,
} from 'types/certificate';
import type { LocationResponseModel } from 'types/locations';
import type {
    ApprovalDto,
    CertificateRelationsDto,
    DownloadCertificateChainRequest,
    DownloadCertificateRequest,
    ListCertificateApprovalsRequest,
} from 'types/openapi';
import type { RaProfileResponseModel } from 'types/ra-profiles';
import type { UserResponseModel } from 'types/users';
import { downloadFileZip } from 'utils/download';

/**
 * Project a CertificateDetailResponseModel into a CertificateListResponseModel-shaped row.
 * Avoids storing detail-only fields (certificateContent, metadata, locations, …) in the
 * list cache and preserves any list-only fields already present on the row.
 */
function pickListFieldsFromDetail(
    detail: CertificateDetailResponseModel,
    existing: CertificateListResponseModel,
): CertificateListResponseModel {
    return {
        ...existing,
        uuid: detail.uuid,
        commonName: detail.commonName,
        serialNumber: detail.serialNumber,
        issuerCommonName: detail.issuerCommonName,
        issuerDn: detail.issuerDn,
        issuerSerialNumber: detail.issuerSerialNumber,
        issuerCertificateUuid: detail.issuerCertificateUuid,
        subjectDn: detail.subjectDn,
        notBefore: detail.notBefore,
        notAfter: detail.notAfter,
        publicKeyAlgorithm: detail.publicKeyAlgorithm,
        signatureAlgorithm: detail.signatureAlgorithm,
        keySize: detail.keySize,
        state: detail.state,
        validationStatus: detail.validationStatus,
        complianceStatus: detail.complianceStatus,
        fingerprint: detail.fingerprint,
        certificateType: detail.certificateType,
        privateKeyAvailability: detail.privateKeyAvailability,
        archived: detail.archived,
        trustedCa: detail.trustedCa,
        hybridCertificate: detail.hybridCertificate,
        altKeySize: detail.altKeySize,
        altPublicKeyAlgorithm: detail.altPublicKeyAlgorithm,
        altSignatureAlgorithm: detail.altSignatureAlgorithm,
        raProfile: detail.raProfile,
        groups: detail.groups,
        owner: detail.owner,
        ownerUuid: detail.ownerUuid,
    };
}

export type State = {
    deleteErrorMessage: string;

    certificates: CertificateListResponseModel[];

    certificateDetail?: CertificateDetailResponseModel;
    certificateRelations?: CertificateRelationsDto;
    certificateHistory?: CertificateHistoryModel[];
    certificateLocations?: LocationResponseModel[];
    issuanceAttributes: { [raProfileId: string]: AttributeDescriptorModel[] };
    revocationAttributes: AttributeDescriptorModel[];
    validationResult?: ValidationCertificateResultModel;
    approvals?: ApprovalDto[];
    certificateChain?: CertificateChainResponseModel;
    certificateChainDownloadContent?: DownloadCertificateChainResponseModel;
    certificateDownloadContent?: DownloadCertificateResponseModel;

    isFetchingValidationResult: boolean;

    isFetchingDetail: boolean;
    isFetchingRelations: boolean;
    isAssociating: boolean;
    isDeassociating: boolean;
    isFetchingHistory: boolean;
    isFetchingLocations: boolean;
    isFetchingApprovals: boolean;
    isFetchingCertificateChain: boolean;
    isFetchingCertificateDownloadContent: boolean;
    isFetchingCertificateChainDownloadContent: boolean;

    isIssuing: boolean;
    isRevoking: boolean;
    isRenewing: boolean;
    isRekeying: boolean;

    finalizingIssueCertificateUuids: string[];
    confirmingRevokeCertificateUuids: string[];
    cancelingPendingCertificateUuids: string[];

    isDeleting: boolean;
    isBulkDeleting: boolean;

    isUpdatingGroup: boolean;
    isUpdatingRaProfile: boolean;
    isUpdatingOwner: boolean;
    isUpdatingTrustedStatus: boolean;

    isBulkUpdatingGroup: boolean;
    isBulkUpdatingRaProfile: boolean;
    isBulkUpdatingOwner: boolean;

    isUploading: boolean;

    isFetchingIssuanceAttributes: boolean;
    isFetchingRevocationAttributes: boolean;

    isCheckingCompliance: boolean;

    isFetchingCsrAttributes: boolean;

    csrAttributeDescriptors: AttributeDescriptorModel[];

    isFetchingContents: boolean;

    isIncludeArchived: boolean;
    isArchiving: boolean;
    isBulkArchiving: boolean;
    isBulkUnarchiving: boolean;
};

export const initialState: State = {
    deleteErrorMessage: '',

    certificates: [],

    issuanceAttributes: {},
    revocationAttributes: [],
    approvals: [],

    isFetchingValidationResult: false,

    isFetchingApprovals: false,
    isFetchingDetail: false,
    isFetchingHistory: false,
    isFetchingLocations: false,
    isFetchingRelations: false,
    isAssociating: false,
    isDeassociating: false,
    isFetchingCertificateChain: false,
    isFetchingCertificateDownloadContent: false,
    isFetchingCertificateChainDownloadContent: false,

    isIssuing: false,
    isRevoking: false,
    isRenewing: false,
    isRekeying: false,

    finalizingIssueCertificateUuids: [],
    confirmingRevokeCertificateUuids: [],
    cancelingPendingCertificateUuids: [],

    isDeleting: false,
    isBulkDeleting: false,

    isUpdatingGroup: false,
    isUpdatingRaProfile: false,
    isUpdatingOwner: false,
    isUpdatingTrustedStatus: false,

    isBulkUpdatingGroup: false,
    isBulkUpdatingRaProfile: false,
    isBulkUpdatingOwner: false,

    isUploading: false,

    isFetchingIssuanceAttributes: false,
    isFetchingRevocationAttributes: false,

    isCheckingCompliance: false,

    isFetchingCsrAttributes: false,

    csrAttributeDescriptors: [],

    isFetchingContents: false,

    isIncludeArchived: false,
    isArchiving: false,
    isBulkArchiving: false,
    isBulkUnarchiving: false,
};

export const slice = createSlice({
    name: 'certificates',

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
        },

        clearCertificateDetail: (state, action: PayloadAction<void>) => {
            state.certificateDetail = undefined;
        },

        setIncludeArchived: (state, action: PayloadAction<boolean>) => {
            state.isIncludeArchived = action.payload;
        },

        listCertificates: (state, action: PayloadAction<SearchRequestModel>) => {
            state.certificates = [];
        },

        listCertificatesSuccess: (state, action: PayloadAction<CertificateListResponseModel[]>) => {
            state.certificates = action.payload;
        },

        getCertificateDetail: (state, action: PayloadAction<{ uuid: string }>) => {
            state.certificateDetail = undefined;
            state.isFetchingDetail = true;
        },

        getCertificateDetailSuccess: (state, action: PayloadAction<{ certificate: CertificateDetailResponseModel }>) => {
            state.isFetchingDetail = false;
            state.certificateDetail = action.payload.certificate;
            const idx = state.certificates.findIndex((c) => c.uuid === action.payload.certificate.uuid);
            if (idx >= 0) {
                state.certificates[idx] = pickListFieldsFromDetail(action.payload.certificate, state.certificates[idx]);
            }
        },

        getCertificateDetailFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        getCertificateRelations: (state, action: PayloadAction<{ uuid: string }>) => {
            state.certificateRelations = undefined;
            state.isFetchingRelations = true;
        },

        getCertificateRelationsSuccess: (state, action: PayloadAction<{ certificateRelations: CertificateRelationsDto }>) => {
            state.isFetchingRelations = false;
            state.certificateRelations = action.payload.certificateRelations;
        },

        getCertificateRelationsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingRelations = false;
        },

        associateCertificate: (state, action: PayloadAction<{ uuid: string; certificateUuid: string }>) => {
            state.isAssociating = true;
        },

        associateCertificateSuccess: (state, action: PayloadAction<{ uuid: string; certificateUuid: string }>) => {
            state.isAssociating = false;
        },

        associateCertificateFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isAssociating = false;
        },

        deassociateCertificate: (state, action: PayloadAction<{ uuid: string; certificateUuid: string }>) => {
            state.isDeassociating = true;
        },

        deassociateCertificateSuccess: (state, action: PayloadAction<{ uuid: string; certificateUuid: string }>) => {
            state.isDeassociating = false;
        },

        deassociateCertificateFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeassociating = false;
        },

        getCertificateValidationResult: (state, action: PayloadAction<{ uuid: string }>) => {
            state.validationResult = undefined;
            state.isFetchingValidationResult = true;
        },

        getCertificateValidationResultSuccess: (state, action: PayloadAction<ValidationCertificateResultModel>) => {
            state.isFetchingValidationResult = false;
            state.validationResult = action.payload;
        },

        getCertificateValidationResultFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingValidationResult = false;
        },

        issueCertificate: (
            state,
            action: PayloadAction<{
                authorityUuid: string;
                raProfileUuid: string;
                signRequest: CertificateSignRequestModel;
            }>,
        ) => {
            state.isIssuing = true;
        },

        issueCertificateNew: (
            state,
            action: PayloadAction<{
                authorityUuid: string;
                raProfileUuid: string;
                certificateUuid: string;
            }>,
        ) => {
            state.isIssuing = true;
        },

        issueCertificateSuccess: (
            state,
            action: PayloadAction<{
                uuid: string;
                certificateData?: string;
            }>,
        ) => {
            state.isIssuing = false;
        },

        issueCertificateFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isIssuing = false;
        },

        revokeCertificate: (
            state,
            action: PayloadAction<{
                authorityUuid: string;
                raProfileUuid: string;
                uuid: string;
                revokeRequest: CertificateRevokeRequestModel;
            }>,
        ) => {
            state.isRevoking = true;
        },

        revokeCertificateSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isRevoking = false;

            const cerificateIndex = state.certificates.findIndex((certificate) => certificate.uuid === action.payload.uuid);

            if (cerificateIndex >= 0) state.certificates.splice(cerificateIndex, 1);
        },

        revokeCertificateFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isRevoking = false;
        },

        manuallyIssueCertificate: (
            state,
            action: PayloadAction<{
                authorityUuid: string;
                raProfileUuid: string;
                uuid: string;
                uploadRequest: CertificateUploadModel;
            }>,
        ) => {
            if (!state.finalizingIssueCertificateUuids.includes(action.payload.uuid)) {
                state.finalizingIssueCertificateUuids.push(action.payload.uuid);
            }
        },

        manuallyIssueCertificateSuccess: (state, action: PayloadAction<{ uuid: string; certificate: CertificateDetailResponseModel }>) => {
            state.finalizingIssueCertificateUuids = state.finalizingIssueCertificateUuids.filter((id) => id !== action.payload.uuid);
            // No state mutation beyond clearing the loading flag: the epic dispatches getCertificateDetail to pull server truth.
        },

        manuallyIssueCertificateFailure: (state, action: PayloadAction<{ uuid: string; error: string | undefined }>) => {
            state.finalizingIssueCertificateUuids = state.finalizingIssueCertificateUuids.filter((id) => id !== action.payload.uuid);
        },

        manuallyConfirmRevoke: (
            state,
            action: PayloadAction<{
                authorityUuid: string;
                raProfileUuid: string;
                uuid: string;
            }>,
        ) => {
            if (!state.confirmingRevokeCertificateUuids.includes(action.payload.uuid)) {
                state.confirmingRevokeCertificateUuids.push(action.payload.uuid);
            }
        },

        manuallyConfirmRevokeSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.confirmingRevokeCertificateUuids = state.confirmingRevokeCertificateUuids.filter((id) => id !== action.payload.uuid);
            // No state mutation: the epic dispatches getCertificateDetail to pull server truth.
        },

        manuallyConfirmRevokeFailure: (state, action: PayloadAction<{ uuid: string; error: string | undefined }>) => {
            state.confirmingRevokeCertificateUuids = state.confirmingRevokeCertificateUuids.filter((id) => id !== action.payload.uuid);
        },

        cancelPendingCertificateOperation: (
            state,
            action: PayloadAction<{
                authorityUuid: string;
                raProfileUuid: string;
                uuid: string;
                reason: string | undefined;
            }>,
        ) => {
            if (!state.cancelingPendingCertificateUuids.includes(action.payload.uuid)) {
                state.cancelingPendingCertificateUuids.push(action.payload.uuid);
            }
        },

        cancelPendingCertificateOperationSuccess: (
            state,
            action: PayloadAction<{ uuid: string; certificate: CertificateDetailResponseModel }>,
        ) => {
            state.cancelingPendingCertificateUuids = state.cancelingPendingCertificateUuids.filter((id) => id !== action.payload.uuid);
            // No state mutation beyond clearing the loading flag: the epic dispatches getCertificateDetail to pull server truth.
        },

        cancelPendingCertificateOperationFailure: (state, action: PayloadAction<{ uuid: string; error: string | undefined }>) => {
            state.cancelingPendingCertificateUuids = state.cancelingPendingCertificateUuids.filter((id) => id !== action.payload.uuid);
        },

        renewCertificate: (
            state,
            action: PayloadAction<{
                authorityUuid: string;
                raProfileUuid: string;
                uuid: string;
                renewRequest: CertificateRenewRequestModel;
            }>,
        ) => {
            state.isRenewing = true;
        },

        renewCertificateSuccess: (
            state,
            action: PayloadAction<{
                uuid: string;
            }>,
        ) => {
            state.isRenewing = false;
        },

        renewCertificateFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isRenewing = false;
        },

        rekeyCertificate: (
            state,
            action: PayloadAction<{
                authorityUuid: string;
                raProfileUuid: string;
                uuid: string;
                rekey: CertificateRekeyRequestModel;
            }>,
        ) => {
            state.isRekeying = true;
        },

        rekeyCertificateSuccess: (
            state,
            action: PayloadAction<{
                uuid: string;
            }>,
        ) => {
            state.isRekeying = false;
        },

        rekeyCertificateFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isRekeying = false;
        },

        getCertificateHistory: (state, action: PayloadAction<{ uuid: string }>) => {
            state.certificateHistory = [];
            state.isFetchingHistory = true;
        },

        getCertificateHistorySuccess: (state, action: PayloadAction<{ certificateHistory: CertificateHistoryModel[] }>) => {
            state.isFetchingHistory = false;
            state.certificateHistory = action.payload.certificateHistory;
        },

        getCertificateHistoryFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingHistory = false;
        },

        listCertificateLocations: (state, action: PayloadAction<{ uuid: string }>) => {
            state.certificateLocations = [];
            state.isFetchingLocations = true;
        },

        listCertificateLocationsSuccess: (state, action: PayloadAction<{ certificateLocations: LocationResponseModel[] }>) => {
            state.isFetchingLocations = false;
            state.certificateLocations = action.payload.certificateLocations;
        },

        listCertificateLocationsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingLocations = false;
        },

        deleteCertificate: (state, action: PayloadAction<{ uuid: string }>) => {
            state.deleteErrorMessage = '';
            state.isDeleting = true;
        },

        deleteCertificateSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;

            const certificateIndex = state.certificates.findIndex((certificate) => certificate.uuid === action.payload.uuid);

            if (certificateIndex >= 0) state.certificates.splice(certificateIndex, 1);

            if (state.certificateDetail?.uuid === action.payload.uuid) state.certificateDetail = undefined;
        },

        deleteCertificateFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
            state.deleteErrorMessage = action.payload.error || 'Unknown error';
        },

        updateGroup: (state, action: PayloadAction<{ uuid: string; updateGroupRequest: CertificateObjectModel }>) => {
            state.isUpdatingGroup = true;
        },

        updateGroupSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isUpdatingGroup = false;
        },

        updateGroupFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingGroup = false;
        },

        deleteGroups: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isUpdatingGroup = true;
        },

        deleteGroupsSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isUpdatingGroup = false;
        },

        deleteGroupsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingGroup = false;
        },

        updateCertificateTrustedStatus: (
            state,
            action: PayloadAction<{ uuid: string; updateCertificateTrustedStatusRequest: CertificateObjectModel }>,
        ) => {
            state.isUpdatingTrustedStatus = true;
        },

        updateCertificateTrustedStatusSuccess: (state, action: PayloadAction<{ uuid: string; trustedCa?: boolean }>) => {
            state.isUpdatingTrustedStatus = false;

            const certificateIndex = state.certificates.findIndex((certificate) => certificate.uuid === action.payload.uuid);

            if (certificateIndex >= 0) state.certificates[certificateIndex].trustedCa = action.payload.trustedCa ?? false;

            if (state.certificateDetail?.uuid === action.payload.uuid)
                state.certificateDetail.trustedCa = action.payload.trustedCa ?? false;
        },

        updateCertificateTrustedStatusFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingTrustedStatus = false;
        },

        updateRaProfile: (
            state,
            action: PayloadAction<{ uuid: string; authorityUuid: string; updateRaProfileRequest: CertificateObjectModel }>,
        ) => {
            state.isUpdatingRaProfile = true;
        },

        updateRaProfileSuccess: (
            state,
            action: PayloadAction<{ uuid: string; raProfileUuid: string; raProfile: RaProfileResponseModel }>,
        ) => {
            state.isUpdatingRaProfile = false;

            const certificateIndex = state.certificates.findIndex((certificate) => certificate.uuid === action.payload.uuid);

            if (certificateIndex >= 0) state.certificates[certificateIndex].raProfile = action.payload.raProfile;

            if (state.certificateDetail?.uuid === action.payload.uuid) state.certificateDetail.raProfile = action.payload.raProfile;
        },

        updateRaProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingRaProfile = false;
        },

        deleteRaProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isUpdatingRaProfile = true;
        },

        deleteRaProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isUpdatingRaProfile = false;

            const certificateIndex = state.certificates.findIndex((certificate) => certificate.uuid === action.payload.uuid);

            if (certificateIndex >= 0) state.certificates[certificateIndex].raProfile = undefined;

            if (state.certificateDetail?.uuid === action.payload.uuid) state.certificateDetail.raProfile = undefined;
        },

        deleteRaProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingRaProfile = false;
        },

        updateOwner: (
            state,
            action: PayloadAction<{ uuid: string; user: UserResponseModel; updateOwnerRequest: CertificateObjectModel }>,
        ) => {
            state.isUpdatingOwner = true;
        },

        updateOwnerSuccess: (state, action: PayloadAction<{ uuid: string; user: UserResponseModel }>) => {
            state.isUpdatingOwner = false;

            const certificateIndex = state.certificates.findIndex((certificate) => certificate.uuid === action.payload.uuid);

            if (certificateIndex >= 0) state.certificates[certificateIndex].owner = action.payload.user.username;

            if (state.certificateDetail?.uuid === action.payload.uuid) {
                state.certificateDetail.owner = action.payload.user.username;
                state.certificateDetail.ownerUuid = action.payload.user.uuid;
            }
        },

        updateOwnerFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingOwner = false;
        },

        deleteOwner: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isUpdatingOwner = true;
        },

        deleteOwnerSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isUpdatingOwner = false;

            const certificateIndex = state.certificates.findIndex((certificate) => certificate.uuid === action.payload.uuid);

            if (certificateIndex >= 0) {
                state.certificates[certificateIndex].owner = undefined;
                state.certificates[certificateIndex].ownerUuid = undefined;
            }

            if (state.certificateDetail?.uuid === action.payload.uuid) {
                state.certificateDetail.ownerUuid = undefined;
                state.certificateDetail.owner = undefined;
            }
        },

        deleteOwnerFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingOwner = false;
        },

        bulkUpdateGroup: (state, action: PayloadAction<CertificateBulkObjectModel>) => {
            state.isBulkUpdatingGroup = true;
        },

        bulkUpdateGroupSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkUpdatingGroup = false;
        },

        bulkDeleteGroup: (state, action: PayloadAction<{ certificateUuids: string[] }>) => {
            state.isBulkUpdatingGroup = true;
        },

        bulkDeleteGroupSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkUpdatingGroup = false;
        },

        bulkUpdateGroupFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkUpdatingGroup = false;
        },

        bulkUpdateRaProfile: (state, action: PayloadAction<{ authorityUuid: string; raProfileRequest: CertificateBulkObjectModel }>) => {
            state.isBulkUpdatingRaProfile = true;
        },

        bulkUpdateRaProfileSuccess: (state, action: PayloadAction<{ uuids: string[]; raProfile: RaProfileResponseModel }>) => {
            state.isBulkUpdatingRaProfile = false;

            action.payload.uuids.forEach((uuid) => {
                const certificateIndex = state.certificates.findIndex((certificate) => certificate.uuid === uuid);

                if (certificateIndex >= 0) state.certificates[certificateIndex].raProfile = action.payload.raProfile;

                if (state.certificateDetail?.uuid === uuid) state.certificateDetail.raProfile = action.payload.raProfile;
            });
        },

        bulkDeleteRaProfile: (state, action: PayloadAction<{ certificateUuids: string[] }>) => {
            state.isBulkUpdatingRaProfile = true;
        },

        bulkDeleteRaProfileSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkUpdatingRaProfile = false;

            action.payload.uuids.forEach((uuid) => {
                const certificateIndex = state.certificates.findIndex((certificate) => certificate.uuid === uuid);

                if (certificateIndex >= 0) state.certificates[certificateIndex].raProfile = undefined;

                if (state.certificateDetail?.uuid === uuid) state.certificateDetail.raProfile = undefined;
            });
        },

        bulkDeleteRaProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkUpdatingRaProfile = false;
        },

        bulkUpdateRaProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkUpdatingRaProfile = false;
        },

        bulkUpdateOwner: (state, action: PayloadAction<{ user: UserResponseModel; request: CertificateBulkObjectModel }>) => {
            state.isBulkUpdatingOwner = true;
        },

        bulkUpdateOwnerSuccess: (state, action: PayloadAction<{ uuids: string[]; user: UserResponseModel }>) => {
            state.isBulkUpdatingOwner = false;

            action.payload.uuids.forEach((uuid) => {
                const certificateIndex = state.certificates.findIndex((certificate) => certificate.uuid === uuid);

                if (certificateIndex >= 0) {
                    state.certificates[certificateIndex].owner = action.payload.user.username;
                    state.certificates[certificateIndex].ownerUuid = action.payload.user.uuid;
                }

                if (state.certificateDetail?.uuid === uuid) {
                    state.certificateDetail.owner = action.payload.user.username;
                    state.certificateDetail.ownerUuid = action.payload.user.uuid;
                }
            });
        },

        bulkUpdateOwnerFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkUpdatingOwner = false;
        },

        bulkDeleteOwner: (state, action: PayloadAction<{ certificateUuids: string[] }>) => {
            state.isBulkUpdatingOwner = true;
        },

        bulkDeleteOwnerSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkUpdatingOwner = false;

            action.payload.uuids.forEach((uuid) => {
                const certificateIndex = state.certificates.findIndex((certificate) => certificate.uuid === uuid);

                if (certificateIndex >= 0) {
                    state.certificates[certificateIndex].owner = undefined;
                    state.certificates[certificateIndex].ownerUuid = undefined;
                }

                if (state.certificateDetail?.uuid === uuid) {
                    state.certificateDetail.ownerUuid = undefined;
                    state.certificateDetail.owner = undefined;
                }
            });
        },

        bulkDeleteOwnerFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkUpdatingOwner = false;
        },

        bulkDelete: (state, action: PayloadAction<CertificateBulkDeleteRequestModel>) => {
            state.deleteErrorMessage = '';
            state.isBulkDeleting = true;
        },

        bulkDeleteSuccess: (state, action: PayloadAction<{ response: CertificateBulkDeleteResponseModel }>) => {
            state.isBulkDeleting = false;
        },

        bulkDeleteFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeleting = false;
            state.deleteErrorMessage = action.payload.error || 'Unknown error';
        },

        uploadCertificate: (state, action: PayloadAction<CertificateUploadModel>) => {
            state.isUploading = true;
        },

        uploadCertificateSuccess: (state, action: PayloadAction<{ uuid: string; certificate: CertificateDetailResponseModel }>) => {
            state.isUploading = false;
            state.certificates.push(action.payload.certificate);
        },

        uploadCertificateFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUploading = false;
        },

        getIssuanceAttributes: (state, action: PayloadAction<{ raProfileUuid: string; authorityUuid: string }>) => {
            state.isFetchingIssuanceAttributes = true;
        },

        getIssuanceAttributesSuccess: (
            state,
            action: PayloadAction<{ raProfileUuid: string; issuanceAttributes: AttributeDescriptorModel[] }>,
        ) => {
            state.isFetchingIssuanceAttributes = false;
            state.issuanceAttributes[action.payload.raProfileUuid] = action.payload.issuanceAttributes;
        },

        getIssuanceAttributesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingIssuanceAttributes = false;
        },

        getRevocationAttributes: (state, action: PayloadAction<{ raProfileUuid: string; authorityUuid: string }>) => {
            state.isFetchingRevocationAttributes = true;
        },

        getRevocationAttributesSuccess: (
            state,
            action: PayloadAction<{ raProfileUuid: string; revocationAttributes: AttributeDescriptorModel[] }>,
        ) => {
            state.isFetchingRevocationAttributes = false;
            state.revocationAttributes = action.payload.revocationAttributes;
        },

        getRevocationAttributesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingRevocationAttributes = false;
        },

        checkCompliance: (state, action: PayloadAction<CertificateComplianceCheckModel>) => {
            state.isCheckingCompliance = true;
        },

        checkComplianceSuccess: (state, action: PayloadAction<void>) => {
            state.isCheckingCompliance = false;
        },

        checkComplianceFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCheckingCompliance = false;
        },

        getCsrAttributes: (state, action: PayloadAction<void>) => {
            state.isFetchingCsrAttributes = true;
        },

        getCsrAttributesSuccess: (state, action: PayloadAction<{ csrAttributes: AttributeDescriptorModel[] }>) => {
            state.isFetchingCsrAttributes = false;
            state.csrAttributeDescriptors = action.payload.csrAttributes;
        },

        getCsrAttributesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingCsrAttributes = false;
        },

        getCertificateContents: (state, action: PayloadAction<{ uuids: string[]; format: string }>) => {
            state.isFetchingContents = true;
        },

        getCertificateContentsSuccess: (
            state,
            action: PayloadAction<{ uuids: string[]; format: string; contents: CertificateContentResponseModel[] }>,
        ) => {
            state.isFetchingContents = false;
            downloadFileZip(action.payload.uuids, action.payload.contents, action.payload.format);
        },

        getCertificateContentsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingContents = false;
        },

        listCertificateApprovals: (state, action: PayloadAction<ListCertificateApprovalsRequest>) => {
            state.isFetchingApprovals = true;
        },

        listCertificateApprovalsSuccess: (state, action: PayloadAction<{ approvals: ApprovalDto[] }>) => {
            state.isFetchingApprovals = false;
            state.approvals = action.payload.approvals;
        },

        listCertificateApprovalsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingApprovals = false;
        },

        getCertificateChain: (state, action: PayloadAction<{ uuid: string; withEndCertificate: boolean }>) => {
            state.isFetchingCertificateChain = true;
        },

        getCertificateChainSuccess: (state, action: PayloadAction<{ certificateChain: CertificateChainResponseModel }>) => {
            state.isFetchingCertificateChain = false;
            state.certificateChain = action.payload.certificateChain;
        },

        getCertificateChainFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingCertificateChain = false;
        },

        downloadCertificateChain: (state, action: PayloadAction<DownloadCertificateChainRequest>) => {
            state.certificateChainDownloadContent = undefined;
            state.isFetchingCertificateChainDownloadContent = true;
        },

        downloadCertificateChainSuccess: (
            state,
            action: PayloadAction<{ certificateChainDownloadContent: DownloadCertificateChainResponseModel }>,
        ) => {
            state.isFetchingCertificateChainDownloadContent = false;
            state.certificateChainDownloadContent = action.payload.certificateChainDownloadContent;
        },

        downloadCertificateChainFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingCertificateChainDownloadContent = false;
        },

        downloadCertificate: (state, action: PayloadAction<DownloadCertificateRequest>) => {
            state.certificateDownloadContent = undefined;
            state.isFetchingCertificateDownloadContent = true;
        },

        downloadCertificateSuccess: (state, action: PayloadAction<{ certificateDownloadContent: DownloadCertificateResponseModel }>) => {
            state.certificateDownloadContent = action.payload.certificateDownloadContent;
            state.isFetchingCertificateDownloadContent = false;
        },

        downloadCertificateFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.certificateDownloadContent = undefined;
            state.isFetchingCertificateDownloadContent = false;
        },
        archiveCertificate: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isArchiving = true;
        },

        archiveCertificateSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isArchiving = false;

            if (state.certificateDetail?.uuid === action.payload.uuid) {
                state.certificateDetail.archived = true;
            }
            const certificateIndex = state.certificates.findIndex((certificate) => certificate.uuid === action.payload.uuid);
            if (certificateIndex >= 0) {
                state.certificates[certificateIndex].archived = true;
            }
        },

        archiveCertificateFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isArchiving = false;
        },

        unarchiveCertificate: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isArchiving = true;
        },

        unarchiveCertificateSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isArchiving = false;

            if (state.certificateDetail?.uuid === action.payload.uuid) {
                state.certificateDetail.archived = false;
            }
            const certificateIndex = state.certificates.findIndex((certificate) => certificate.uuid === action.payload.uuid);
            if (certificateIndex >= 0) {
                state.certificates[certificateIndex].archived = false;
            }
        },

        unarchiveCertificateFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isArchiving = false;
        },

        bulkArchiveCertificate: (state, action: PayloadAction<{ uuids: string[]; filters: SearchRequestModel | undefined }>) => {
            state.isBulkArchiving = true;
        },

        bulkArchiveCertificateSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkArchiving = false;
        },

        bulkArchiveCertificateFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkArchiving = false;
        },

        bulkUnarchiveCertificate: (state, action: PayloadAction<{ uuids: string[]; filters: SearchRequestModel | undefined }>) => {
            state.isBulkUnarchiving = true;
        },

        bulkUnarchiveCertificateSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkUnarchiving = false;
        },

        bulkUnarchiveCertificateFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkUnarchiving = false;
        },
    },
});

const state = (reduxStore: any): State => reduxStore?.[slice.name];

const deleteErrorMessage = createSelector(state, (state) => state.deleteErrorMessage);

const certificates = createSelector(state, (state) => state.certificates);
const certificateChain = createSelector(state, (state) => state.certificateChain);

const certificateDetail = createSelector(state, (state) => state.certificateDetail);
const certificateRelations = createSelector(state, (state) => state.certificateRelations);
const certificateChainDownloadContent = createSelector(state, (state) => state.certificateChainDownloadContent);
const certificateDownloadContent = createSelector(state, (state) => state.certificateDownloadContent);
const certificateHistory = createSelector(state, (state) => state.certificateHistory);
const certificateLocations = createSelector(state, (state) => state.certificateLocations);
const issuanceAttributes = createSelector(state, (state) => state.issuanceAttributes);
const revocationAttributes = createSelector(state, (state) => state.revocationAttributes);
const approvals = createSelector(state, (state) => state.approvals);

const isFetchingApprovals = createSelector(state, (state) => state.isFetchingApprovals);
const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isFetchingHistory = createSelector(state, (state) => state.isFetchingHistory);
const isFetchingLocations = createSelector(state, (state) => state.isFetchingLocations);

const isIssuing = createSelector(state, (state) => state.isIssuing);
const isRevoking = createSelector(state, (state) => state.isRevoking);
const isRenewing = createSelector(state, (state) => state.isRenewing);
const isRekeying = createSelector(state, (state) => state.isRekeying);

const isDeleting = createSelector(state, (state) => state.isDeleting);
const isBulkDeleting = createSelector(state, (state) => state.isBulkDeleting);

const isUpdatingGroup = createSelector(state, (state) => state.isUpdatingGroup);
const isUpdatingRaProfile = createSelector(state, (state) => state.isUpdatingRaProfile);
const isUpdatingOwner = createSelector(state, (state) => state.isUpdatingOwner);
const isUpdatingTrustedStatus = createSelector(state, (state) => state.isUpdatingTrustedStatus);

const isBulkUpdatingGroup = createSelector(state, (state) => state.isBulkUpdatingGroup);
const isBulkUpdatingRaProfile = createSelector(state, (state) => state.isBulkUpdatingRaProfile);
const isBulkUpdatingOwner = createSelector(state, (state) => state.isBulkUpdatingOwner);

const isUploading = createSelector(state, (state) => state.isUploading);

const isFetchingIssuanceAttributes = createSelector(state, (state) => state.isFetchingIssuanceAttributes);
const isFetchingRevocationAttributes = createSelector(state, (state) => state.isFetchingRevocationAttributes);

const isFetchingValidationResult = createSelector(state, (state) => state.isFetchingValidationResult);
const validationResult = createSelector(state, (state) => state.validationResult);

const isFetchingCsrAttributes = createSelector(state, (state) => state.isFetchingCsrAttributes);
const csrAttributeDescriptors = createSelector(state, (state) => state.csrAttributeDescriptors);

const isFetchingContents = createSelector(state, (state) => state.isFetchingContents);
const isFetchingCertificateChain = createSelector(state, (state) => state.isFetchingCertificateChain);

const isFetchingRelations = createSelector(state, (state) => state.isFetchingRelations);
const isAssociating = createSelector(state, (state) => state.isAssociating);
const isDeassociating = createSelector(state, (state) => state.isDeassociating);

const isFetchingCertificateDownloadContent = createSelector(state, (state) => state.isFetchingCertificateDownloadContent);
const isFetchingCertificateChainDownloadContent = createSelector(state, (state) => state.isFetchingCertificateChainDownloadContent);

const isIncludeArchived = createSelector(state, (state) => state.isIncludeArchived);
const isArchiving = createSelector(state, (state) => state.isArchiving);

const finalizingIssueCertificateUuids = createSelector(state, (state) => state.finalizingIssueCertificateUuids);
const confirmingRevokeCertificateUuids = createSelector(state, (state) => state.confirmingRevokeCertificateUuids);
const cancelingPendingCertificateUuids = createSelector(state, (state) => state.cancelingPendingCertificateUuids);

export const selectors = {
    state,
    deleteErrorMessage,
    certificates,
    certificateDetail,
    certificateRelations,
    isFetchingRelations,
    isAssociating,
    isDeassociating,
    certificateChainDownloadContent,
    isFetchingCertificateDownloadContent,
    isFetchingCertificateChainDownloadContent,
    certificateDownloadContent,
    certificateHistory,
    certificateLocations,
    issuanceAttributes,
    revocationAttributes,
    approvals,
    isFetchingDetail,
    isFetchingHistory,
    isFetchingLocations,
    isFetchingCertificateChain,
    isIssuing,
    isRevoking,
    isRenewing,
    isRekeying,
    isDeleting,
    isBulkDeleting,
    isUpdatingTrustedStatus,
    isUpdatingGroup,
    isUpdatingRaProfile,
    isUpdatingOwner,
    isBulkUpdatingGroup,
    isBulkUpdatingRaProfile,
    isBulkUpdatingOwner,
    isUploading,
    isFetchingIssuanceAttributes,
    isFetchingRevocationAttributes,
    isFetchingValidationResult,
    validationResult,
    isFetchingCsrAttributes,
    csrAttributeDescriptors,
    isFetchingContents,
    isFetchingApprovals,
    certificateChain,
    isIncludeArchived,
    isArchiving,
    finalizingIssueCertificateUuids,
    confirmingRevokeCertificateUuids,
    cancelingPendingCertificateUuids,
};

export const actions = slice.actions;

export default slice.reducer;
