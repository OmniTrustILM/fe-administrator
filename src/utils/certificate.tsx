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

export function downloadFile(content: any, fileName: string) {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
}

export function getCertificateStatusColor(
    status:
        | CertificateState
        | CertificateValidationStatus
        | CertificateEventHistoryDtoStatusEnum
        | ComplianceStatus
        | ComplianceRuleStatus
        | CertificateSubjectType,
) {
    switch (status) {
        case CertificateState.Requested:
            return '#3754a5';
        case CertificateState.Rejected:
            return '#EF4444';
        case CertificateState.Issued:
            return '#14B8A6';
        case CertificateState.Failed:
            return '#EF4444';
        case CertificateState.PendingApproval:
            return '#3754a5';
        case CertificateState.PendingIssue:
            return '#3782a5';
        case CertificateState.PendingRevoke:
            return '#eb3f33';
        case CertificateState.Revoked:
            return '#632828';

        case CertificateValidationStatus.Valid:
            return '#14B8A6';
        case CertificateValidationStatus.Expired:
            return '#EF4444';
        case CertificateValidationStatus.Revoked:
            return '#632828';
        case CertificateValidationStatus.Expiring:
            return '#EAB308';
        case CertificateValidationStatus.Invalid:
            return '#1F2937';
        case CertificateValidationStatus.Inactive:
            return '#6c757d';
        case CertificateValidationStatus.NotChecked:
            return '#2798E7';
        case CertificateValidationStatus.Failed:
            return '#9c0012';

        case ComplianceStatus.Na:
            return '#6c757d';
        case ComplianceStatus.Nok:
            return '#EF4444';
        case ComplianceStatus.Ok:
            return '#14B8A6';
        case ComplianceStatus.NotChecked:
            return '#2798E7';

        case ComplianceRuleStatus.Na:
            return '#6c757d';
        case ComplianceRuleStatus.Nok:
            return '#EF4444';
        case ComplianceRuleStatus.Ok:
            return '#14B8A6';

        case CertificateEventHistoryDtoStatusEnum.Failed:
            return '#EF4444';
        case CertificateEventHistoryDtoStatusEnum.Success:
            return '#14B8A6';

        case CertificateSubjectType.EndEntity:
            return '#6c757d';
        case CertificateSubjectType.SelfSignedEndEntity:
            return '#EAB308';
        case CertificateSubjectType.IntermediateCa:
            return '#3754a5';
        case CertificateSubjectType.RootCa:
            return '#14B8A6';

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
