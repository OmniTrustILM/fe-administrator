import type { BadgeColor } from 'components/Badge';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { CertificateDetailResponseModel } from 'types/certificate';
import {
    CertificateEventHistoryDtoStatusEnum,
    CertificateState,
    CertificateSubjectType,
    CertificateType,
    CertificateValidationStatus,
    ComplianceRuleStatus,
    ComplianceStatus,
    PlatformEnum,
} from 'types/openapi';

export const emptyCertificate: CertificateDetailResponseModel = {
    uuid: '',
    commonName: '',
    serialNumber: '',
    issuerCommonName: '',
    certificateContent: '',
    issuerDn: '',
    subjectDn: '',
    notBefore: '',
    notAfter: '',
    publicKeyAlgorithm: '',
    signatureAlgorithm: '',
    keySize: -1,
    keyUsage: [],
    extendedKeyUsage: [],
    subjectType: CertificateSubjectType.EndEntity,
    state: CertificateState.PendingIssue,
    validationStatus: CertificateValidationStatus.NotChecked,
    fingerprint: '',
    certificateType: CertificateType.X509,
    complianceStatus: ComplianceStatus.NotChecked,
    issuerSerialNumber: '',
    subjectAlternativeNames: {},
    privateKeyAvailability: false,
    trustedCa: false,
    hybridCertificate: false,
};

export function formatPEM(pemString: string, csr?: boolean) {
    const PEM_STRING_LENGTH = pemString.length,
        LINE_LENGTH = 64;
    const wrapNeeded = PEM_STRING_LENGTH > LINE_LENGTH;

    if (wrapNeeded) {
        let formattedString = '',
            wrapIndex = 0;

        for (let i = LINE_LENGTH; i < PEM_STRING_LENGTH; i += LINE_LENGTH) {
            formattedString += pemString.substring(wrapIndex, i) + '\r\n';
            wrapIndex = i;
        }

        formattedString += pemString.substring(wrapIndex, PEM_STRING_LENGTH);

        return `-----BEGIN CERTIFICATE${csr ? ' REQUEST' : ''}-----\n${formattedString}\n-----END CERTIFICATE${csr ? ' REQUEST' : ''}-----`;
    } else {
        return `-----BEGIN CERTIFICATE${csr ? ' REQUEST' : ''}-----\n${pemString}\n-----END CERTIFICATE${csr ? ' REQUEST' : ''}-----`;
    }
}

export function downloadFile(content: BlobPart, fileName: string) {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
}

export type CertificateStatusLike =
    | CertificateState
    | CertificateValidationStatus
    | CertificateEventHistoryDtoStatusEnum
    | ComplianceStatus
    | ComplianceRuleStatus
    | CertificateSubjectType;

/**
 * The semantic Badge colour a status reads as. Text badges must go through this rather than paint
 * `getCertificateStatusColor` on as a background: those hexes are indicator colours picked for a
 * dot on a surface, and several of them (teal #12a393, amber #b68b06) cannot carry legible text of
 * any colour. The Badge tokens carry a contrast-safe foreground for both themes, and the status
 * label itself is what distinguishes, say, Revoked from Failed.
 */
export function getCertificateStatusBadgeColor(status: CertificateStatusLike): BadgeColor {
    switch (status) {
        case CertificateState.Issued:
        case CertificateValidationStatus.Valid:
        case ComplianceStatus.Ok:
        case ComplianceRuleStatus.Ok:
        case CertificateEventHistoryDtoStatusEnum.Success:
        case CertificateSubjectType.RootCa:
            return 'success';

        case CertificateState.Rejected:
        case CertificateState.Failed:
        case CertificateState.PendingRevoke:
        case CertificateState.Revoked:
        case CertificateValidationStatus.Expired:
        case CertificateValidationStatus.Revoked:
        case CertificateValidationStatus.Invalid:
        case CertificateValidationStatus.Failed:
        case ComplianceStatus.Nok:
        case ComplianceRuleStatus.Nok:
        case CertificateEventHistoryDtoStatusEnum.Failed:
            return 'danger';

        case CertificateValidationStatus.Expiring:
        case CertificateSubjectType.SelfSignedEndEntity:
            return 'warning';

        case CertificateState.Requested:
        case CertificateState.PendingApproval:
        case CertificateState.PendingIssue:
        case CertificateState.Registered:
        case CertificateState.PendingRegistration:
        case CertificateValidationStatus.NotChecked:
        case ComplianceStatus.NotChecked:
        case CertificateSubjectType.IntermediateCa:
            return 'info';

        default:
            return 'secondary';
    }
}

export function getCertificateStatusColor(status: CertificateStatusLike) {
    switch (status) {
        case CertificateState.Requested:
        case CertificateState.PendingApproval:
            return '#3f61be';
        case CertificateState.Rejected:
        case CertificateState.Failed:
            return '#EF4444';
        case CertificateState.Issued:
            return '#12a393';
        case CertificateState.PendingIssue:
            return '#3782a5';
        case CertificateState.PendingRevoke:
            return '#eb3f33';
        case CertificateState.Revoked:
            return '#aa4545';
        case CertificateState.Registered:
            return '#8B5CF6';
        case CertificateState.PendingRegistration:
            return '#9c7cf9';

        case CertificateValidationStatus.Valid:
            return '#12a393';
        case CertificateValidationStatus.Expired:
            return '#EF4444';
        case CertificateValidationStatus.Revoked:
            return '#aa4545';
        case CertificateValidationStatus.Expiring:
            return '#b68b06';
        case CertificateValidationStatus.Invalid:
            return '#4f688c';
        case CertificateValidationStatus.Inactive:
            return '#6c757d';
        case CertificateValidationStatus.NotChecked:
            return '#2798E7';
        case CertificateValidationStatus.Failed:
            return '#cf0018';

        case ComplianceStatus.Na:
            return '#6c757d';
        case ComplianceStatus.Nok:
            return '#EF4444';
        case ComplianceStatus.Ok:
            return '#12a393';
        case ComplianceStatus.NotChecked:
            return '#2798E7';

        case ComplianceRuleStatus.Na:
            return '#6c757d';
        case ComplianceRuleStatus.Nok:
            return '#EF4444';
        case ComplianceRuleStatus.Ok:
            return '#12a393';

        case CertificateEventHistoryDtoStatusEnum.Failed:
            return '#EF4444';
        case CertificateEventHistoryDtoStatusEnum.Success:
            return '#12a393';

        case CertificateSubjectType.EndEntity:
            return '#6c757d';
        case CertificateSubjectType.SelfSignedEndEntity:
            return '#b68b06';
        case CertificateSubjectType.IntermediateCa:
            return '#3f61be';
        case CertificateSubjectType.RootCa:
            return '#12a393';

        default:
            return '#6c757d';
    }
}

export function useGetStatusText() {
    const certificateStatusEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.CertificateState));
    const certificateValidationStatusEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.CertificateValidationStatus));
    const complianceStatusEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ComplianceStatus));
    const complianceRuleStatusEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ComplianceRuleStatus));
    const certificateSubjectTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.CertificateSubjectType));
    return useCallback(
        (
            status:
                | CertificateState
                | CertificateValidationStatus
                | CertificateEventHistoryDtoStatusEnum
                | ComplianceStatus
                | ComplianceRuleStatus
                | CertificateSubjectType,
        ) => {
            switch (status) {
                case CertificateValidationStatus.Valid:
                case CertificateValidationStatus.Invalid:
                case CertificateValidationStatus.Expiring:
                case CertificateValidationStatus.Expired:
                case CertificateValidationStatus.Revoked:
                case CertificateValidationStatus.NotChecked:
                case CertificateValidationStatus.Inactive:
                case CertificateValidationStatus.Failed:
                    return getEnumLabel(certificateValidationStatusEnum, status);

                case CertificateState.Revoked:
                case CertificateState.Requested:
                case CertificateState.Rejected:
                case CertificateState.Issued:
                case CertificateState.PendingApproval:
                case CertificateState.PendingIssue:
                case CertificateState.PendingRevoke:
                case CertificateState.Registered:
                case CertificateState.PendingRegistration:
                    return getEnumLabel(certificateStatusEnum, status);

                case CertificateEventHistoryDtoStatusEnum.Success:
                    return 'Success';
                case CertificateEventHistoryDtoStatusEnum.Failed:
                    return 'Failed';

                case ComplianceStatus.Ok:
                case ComplianceStatus.Nok:
                case ComplianceStatus.Na:
                case ComplianceStatus.NotChecked:
                    return getEnumLabel(complianceStatusEnum, status);

                case ComplianceRuleStatus.Ok:
                case ComplianceRuleStatus.Nok:
                case ComplianceRuleStatus.Na:
                    return getEnumLabel(complianceRuleStatusEnum, status);

                case CertificateSubjectType.EndEntity:
                case CertificateSubjectType.SelfSignedEndEntity:
                case CertificateSubjectType.IntermediateCa:
                case CertificateSubjectType.RootCa:
                    return getEnumLabel(certificateSubjectTypeEnum, status);

                default:
                    return 'Unknown';
            }
        },
        [
            certificateStatusEnum,
            certificateValidationStatusEnum,
            complianceStatusEnum,
            complianceRuleStatusEnum,
            certificateSubjectTypeEnum,
        ],
    );
}
