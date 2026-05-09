import React from 'react';
import { Link } from 'react-router';
import Badge from 'components/Badge';
import { KeyRound } from 'lucide-react';
import { actions as filterActions, EntityType } from 'ducks/filters';
import { CertificateType, type CertificateValidationResultDto, CertificateValidationStatus, ComplianceStatus } from 'types/openapi';
import type { CertificateListResponseModel, CertificateDetailResponseModel } from 'types/certificate';
import type { TableDataRow } from 'components/CustomTable';
import CertificateStatus from './CertificateStatus';
import PendingActionButtons from './PendingActionButtons';

export interface BuildCertificateRowColumnsOpts {
    isLinkDisabled: boolean;
    selectCertsOnly: boolean;
    currentFilters: any;
    dispatch: any;
    dateFormatter: (d: Date) => string;
    /** Enum map from platform enum selector (e.g. EnumItemDto / EnumItemModel) */
    certificateTypeEnum: any;
    getEnumLabel: (e: any, key: string) => string;
}

function buildCommonNameCell(certificate: CertificateListResponseModel, opts: BuildCertificateRowColumnsOpts) {
    const { selectCertsOnly, isLinkDisabled, dispatch, currentFilters } = opts;
    const label = certificate.commonName || '(empty)';
    if (selectCertsOnly || isLinkDisabled) return label;
    return (
        <Link
            onClick={() =>
                dispatch(filterActions.setPreservedFilters({ entity: EntityType.CERTIFICATE, preservedFilters: currentFilters }))
            }
            to={`./detail/${certificate.uuid}`}
        >
            {label}
        </Link>
    );
}

function buildGroupsCell(certificate: CertificateListResponseModel, isLinkDisabled: boolean) {
    const groups = certificate?.groups ?? [];
    if (groups.length === 0) return 'Unassigned';
    return groups.map((group, i) => (
        <React.Fragment key={group.uuid}>
            {isLinkDisabled ? group.name : <Link to={`../../groups/detail/${group.uuid}`}>{group.name}</Link>}
            {i === groups.length - 1 ? '' : ', '}
        </React.Fragment>
    ));
}

function buildRaProfileCell(certificate: CertificateListResponseModel, isLinkDisabled: boolean) {
    if (!certificate.raProfile) return 'Unassigned';
    const name = certificate.raProfile.name ?? 'Unassigned';
    if (isLinkDisabled) return name;
    return <Link to={`../raprofiles/detail/${certificate.raProfile.authorityInstanceUuid}/${certificate.raProfile.uuid}`}>{name}</Link>;
}

function buildOwnerCell(certificate: CertificateListResponseModel, isLinkDisabled: boolean) {
    const ownerLabel = certificate.owner ?? 'Unassigned';
    if (!certificate?.ownerUuid) return ownerLabel;
    if (isLinkDisabled) return ownerLabel;
    return <Link to={`../users/detail/${certificate.ownerUuid}`}>{ownerLabel}</Link>;
}

function buildIssuerCell(certificate: CertificateListResponseModel, isLinkDisabled: boolean) {
    const cn = certificate.issuerCommonName || '';
    if (!cn || !certificate?.issuerCertificateUuid) return cn;
    if (isLinkDisabled) return cn;
    return <Link to={`./detail/${certificate.issuerCertificateUuid}`}>{cn}</Link>;
}

function buildCertTypeCell(
    certificate: CertificateListResponseModel,
    certificateTypeEnum: any,
    getEnumLabel: (e: any, k: string) => string,
) {
    if (!certificate.certificateType) return '';
    return (
        <Badge color={certificate.certificateType === CertificateType.X509 ? 'primary' : 'gray'} size="small">
            {getEnumLabel(certificateTypeEnum, certificate.certificateType)}
        </Badge>
    );
}

export function buildCertificateRowColumns(
    certificate: CertificateListResponseModel,
    opts: BuildCertificateRowColumnsOpts,
): (string | React.ReactNode)[] {
    const { isLinkDisabled, dateFormatter, certificateTypeEnum, getEnumLabel } = opts;
    const commonNameCell = buildCommonNameCell(certificate, opts);
    const groupsCell = buildGroupsCell(certificate, isLinkDisabled);
    const raProfileCell = buildRaProfileCell(certificate, isLinkDisabled);
    const ownerCell = buildOwnerCell(certificate, isLinkDisabled);
    const issuerCell = buildIssuerCell(certificate, isLinkDisabled);
    const certTypeCell = buildCertTypeCell(certificate, certificateTypeEnum, getEnumLabel);

    return [
        <React.Fragment key="state">
            <CertificateStatus status={certificate.state} asIcon={true} />
            <PendingActionButtons certificate={certificate} compact />
        </React.Fragment>,
        <CertificateStatus key="validationStatus" status={certificate.validationStatus} asIcon={true} />,
        certificate.complianceStatus ? <CertificateStatus key="compliance" status={certificate.complianceStatus} asIcon={true} /> : '',
        certificate.privateKeyAvailability ? <KeyRound key="key" size={16} aria-hidden="true" strokeWidth={1.5} /> : '',
        commonNameCell,
        certificate.notBefore ? (
            <span key="notBefore" style={{ whiteSpace: 'nowrap' }}>
                {dateFormatter(new Date(certificate.notBefore))}
            </span>
        ) : (
            ''
        ),
        certificate.notAfter ? (
            <span key="notAfter" style={{ whiteSpace: 'nowrap' }}>
                {dateFormatter(new Date(certificate.notAfter))}
            </span>
        ) : (
            ''
        ),
        groupsCell,
        <span key="raProfile" style={{ whiteSpace: 'nowrap' }}>
            {raProfileCell}
        </span>,
        ownerCell,
        certificate.serialNumber || '',
        certificate.signatureAlgorithm || '',
        certificate.publicKeyAlgorithm || '',
        issuerCell,
        certTypeCell,
        <Badge key="archivationStatus" color={certificate.archived ? 'gray' : 'success'} size="small">
            {certificate.archived ? 'Yes' : 'No'}
        </Badge>,
    ];
}

export function buildCertificateDetailBaseRows(
    certificate: CertificateDetailResponseModel,
    validationResult: CertificateValidationResultDto | undefined,
    isCertificateArchived: boolean,
    certificateKeyUsageEnum: any,
    dateFormatter: (d: Date) => string,
    getEnumLabel: (e: any, key: string) => string,
): TableDataRow[] {
    const rows: TableDataRow[] = [
        {
            id: 'commonName',
            columns: [
                <span key="cn-label" style={{ whiteSpace: 'nowrap' }}>
                    Common Name
                </span>,
                certificate.commonName,
            ],
        },
        { id: 'serialNumber', columns: ['Serial Number', certificate.serialNumber || ''] },
        {
            id: 'key',
            columns: ['Key', certificate.key ? <Link to={`../keys/detail/${certificate.key.uuid}`}>{certificate.key.name}</Link> : ''],
        },
    ];
    if (certificate.hybridCertificate) {
        rows.push({
            id: 'altKey',
            columns: [
                'Alternative Key',
                certificate.altKey ? <Link to={`../keys/detail/${certificate.altKey.uuid}`}>{certificate.altKey.name}</Link> : '',
            ],
        });
    }
    rows.push(
        {
            id: 'issuerCommonName',
            columns: [
                'Issuer Common Name',
                (() => {
                    if (certificate?.issuerCommonName && certificate?.issuerCertificateUuid) {
                        return (
                            <Link to={`../certificates/detail/${certificate.issuerCertificateUuid}`}>{certificate.issuerCommonName}</Link>
                        );
                    }
                    return certificate?.issuerCommonName ?? '';
                })(),
            ],
        },
        { id: 'issuerDN', columns: ['Issuer DN', certificate.issuerDn || ''] },
        { id: 'subjectDN', columns: ['Subject DN', certificate.subjectDn] },
        {
            id: 'validFrom',
            columns: [
                'Valid From',
                certificate.notBefore ? <span style={{ whiteSpace: 'nowrap' }}>{dateFormatter(new Date(certificate.notBefore))}</span> : '',
            ],
        },
        {
            id: 'expiresAt',
            columns: [
                'Expires At',
                certificate.notAfter ? <span style={{ whiteSpace: 'nowrap' }}>{dateFormatter(new Date(certificate.notAfter))}</span> : '',
            ],
        },
        { id: 'publicKeyAlgorithm', columns: ['Public Key Algorithm', certificate.publicKeyAlgorithm] },
    );
    if (certificate.hybridCertificate) {
        rows.push({
            id: 'altPublicKeyAlgorithm',
            columns: ['Alternative Public Key Algorithm', certificate.altPublicKeyAlgorithm],
        });
    }
    rows.push({ id: 'signatureAlgorithm', columns: ['Signature Algorithm', certificate.signatureAlgorithm] });
    if (certificate.hybridCertificate) {
        rows.push({
            id: 'altSignatureAlgorithm',
            columns: ['Alternative Signature Algorithm', certificate.altSignatureAlgorithm],
        });
    }
    rows.push(
        {
            id: 'certState',
            columns: [
                'State',
                <React.Fragment key="state">
                    <CertificateStatus status={certificate.state} />
                    <PendingActionButtons certificate={certificate} />
                </React.Fragment>,
            ],
        },
        {
            id: 'validationStatus',
            columns: [
                'Validation Status',
                validationResult?.resultStatus ? (
                    <CertificateStatus key="validation" status={validationResult?.resultStatus} />
                ) : (
                    <CertificateStatus key="validation" status={CertificateValidationStatus.NotChecked} />
                ),
            ],
        },
        {
            id: 'complianceStatus',
            columns: [
                'Compliance Status',
                <CertificateStatus key="compliance" status={certificate.complianceStatus || ComplianceStatus.Na} />,
            ],
        },
        { id: 'fingerprint', columns: ['Fingerprint', certificate.fingerprint || ''] },
        { id: 'fingerprintAlgorithm', columns: ['Fingerprint Algorithm', 'SHA256'] },
        { id: 'keySize', columns: ['Key Size', certificate.keySize.toString()] },
    );
    if (certificate.hybridCertificate) {
        rows.push({
            id: 'altKeySize',
            columns: ['Alternative Key Size', certificate.altKeySize?.toString()],
        });
    }
    rows.push(
        {
            id: 'keyUsage',
            columns: [
                'Key Usage',
                certificate?.keyUsage?.map((name) => (
                    <div key={name} style={{ margin: '1px' }}>
                        <Badge>{getEnumLabel(certificateKeyUsageEnum, name)}</Badge>
                        &nbsp;
                    </div>
                )) || '',
            ],
        },
        {
            id: 'extendedKeyUsage',
            columns: [
                'Extended Key Usage',
                certificate.extendedKeyUsage?.map((name) => (
                    <div key={name} style={{ margin: '1px' }}>
                        <Badge>{name}</Badge>
                        &nbsp;
                    </div>
                )) || '',
            ],
        },
        {
            id: 'subjectType',
            columns: [
                'Subject Type',
                certificate.subjectType ? <CertificateStatus key="subjectType" status={certificate.subjectType} /> : <>n/a</>,
            ],
        },
        {
            id: 'archivationStatus',
            columns: [
                'Archived',
                <Badge key="archivationStatus" color={isCertificateArchived ? 'secondary' : 'success'}>
                    {isCertificateArchived ? 'Yes' : 'No'}
                </Badge>,
            ],
        },
    );
    return rows;
}
