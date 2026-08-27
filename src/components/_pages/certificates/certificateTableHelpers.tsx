import React from 'react';
import { Link } from 'react-router';
import Badge from 'components/Badge';
import { KeyRound } from 'lucide-react';
import { actions as filterActions, EntityType } from 'ducks/filters';
import {
    CertificateProtocol,
    type CertificateProtocolDto,
    CertificateState,
    CertificateType,
    type CertificateValidationResultDto,
    CertificateValidationStatus,
    ComplianceStatus,
    FilterFieldSource,
    FilterFieldType,
    PlatformEnum,
} from 'types/openapi';
import type { CertificateListResponseModel, CertificateDetailResponseModel, SearchFilterModel } from 'types/certificate';
import type { EnumItemModel } from 'types/enums';
import type { Dispatch } from 'redux';
import type { TableDataRow } from 'components/CustomTable';
import { renderCell, type CellRegistry } from 'components/CustomTable/columns';
import MultiValueCell from 'components/CustomTable/columns/MultiValueCell';
import type { ColumnDefinition } from 'types/tableColumns';
import type { ListCellValue } from 'utils/attributes/listCellValues';
import { EnumValueDescription } from 'components/EnumDescription';
import Tooltip from 'components/Tooltip';
import CertificateStatus from './CertificateStatus';
import { validationPanelMessages } from './validationPanel';
import PendingActionButtons from './PendingActionButtons';
import type { PendingAction } from './PendingActionButtons/types';

type PlatformEnumMap = { [key: string]: EnumItemModel } | undefined;

export interface BuildCertificateRowColumnsOpts {
    isLinkDisabled: boolean;
    selectCertsOnly: boolean;
    currentFilters: SearchFilterModel[];
    dispatch: Dispatch;
    dateFormatter: (d: Date) => string;
    /** Enum map from platform enum selector (e.g. EnumItemDto / EnumItemModel) */
    certificateTypeEnum: PlatformEnumMap;
    getEnumLabel: (e: PlatformEnumMap, key: string) => string;
    onPendingAction: (action: PendingAction) => void;
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
    certificateTypeEnum: PlatformEnumMap,
    getEnumLabel: (e: PlatformEnumMap, k: string) => string,
) {
    if (!certificate.certificateType) return '';
    return (
        <Badge color={certificate.certificateType === CertificateType.X509 ? 'primary' : 'gray'} size="small">
            {getEnumLabel(certificateTypeEnum, certificate.certificateType)}
        </Badge>
    );
}

/**
 * Renders the Groups cell. Joining group names with `', '` — which this cell used to do — turns five
 * groups into one ever-widening line, and that does not survive a user adding more columns beside
 * it, so the extra groups move behind a `+N` reveal.
 */
function buildGroupsValues(certificate: CertificateListResponseModel, isLinkDisabled: boolean): ListCellValue[] {
    return (certificate.groups ?? []).map((group) => ({
        label: group.name,
        ...(isLinkDisabled ? {} : { link: { resource: 'groups', uuid: group.uuid } }),
    }));
}

/**
 * The platform default column set for the certificates inventory — the "Standard" tab. Field
 * identifiers are the catalogue's own (`FilterField` enum names), so a saved view referring to the
 * same field resolves to the same registry entry.
 *
 * The labels here are the headings the page ships today; the wiring ticket resolves them from the
 * live catalogue instead, which is also where the set stops being hardcoded.
 */
export const CERTIFICATE_COLUMNS: ColumnDefinition[] = [
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'CERTIFICATE_STATE',
        catalogueLabel: 'State',
        type: FilterFieldType.List,
        align: 'center',
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'CERTIFICATE_VALIDATION_STATUS',
        catalogueLabel: 'Validation',
        type: FilterFieldType.List,
        align: 'center',
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'COMPLIANCE_STATUS',
        catalogueLabel: 'Compliance',
        type: FilterFieldType.List,
        align: 'center',
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'PRIVATE_KEY',
        catalogueLabel: 'Has private key',
        type: FilterFieldType.Boolean,
        align: 'center',
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'COMMON_NAME',
        catalogueLabel: 'Common Name',
        type: FilterFieldType.String,
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'NOT_BEFORE',
        catalogueLabel: 'Valid From',
        type: FilterFieldType.Datetime,
    },
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER', catalogueLabel: 'Expires At', type: FilterFieldType.Datetime },
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'GROUP_NAME', catalogueLabel: 'Groups', type: FilterFieldType.List },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'RA_PROFILE_NAME',
        catalogueLabel: 'RA Profile',
        type: FilterFieldType.List,
    },
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'OWNER', catalogueLabel: 'Owner', type: FilterFieldType.List },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'SERIAL_NUMBER',
        catalogueLabel: 'Serial number',
        type: FilterFieldType.String,
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'SIGNATURE_ALGORITHM',
        catalogueLabel: 'Signature Algorithm',
        type: FilterFieldType.List,
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'PUBLIC_KEY_ALGORITHM',
        catalogueLabel: 'Public Key Algorithm',
        type: FilterFieldType.List,
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'ISSUER_COMMON_NAME',
        catalogueLabel: 'Issuer Common Name',
        type: FilterFieldType.String,
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'CERTIFICATE_TYPE',
        catalogueLabel: 'Certificate Type',
        type: FilterFieldType.List,
    },
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'ARCHIVED', catalogueLabel: 'Archived', type: FilterFieldType.Boolean },
];

/**
 * Cell renderers for the certificate property columns that are rich today — statuses, links, dates.
 * Anything not registered here falls through to the attribute renderer, which is how a custom or
 * metadata column the user picks renders without this file knowing about it.
 */
export function buildCertificateCellRegistry(opts: BuildCertificateRowColumnsOpts): CellRegistry<CertificateListResponseModel> {
    const { isLinkDisabled, dateFormatter, certificateTypeEnum, getEnumLabel, onPendingAction } = opts;

    return {
        'property:CERTIFICATE_STATE': (certificate) => (
            <>
                <CertificateStatus status={certificate.state} asIcon={true} />
                <PendingActionButtons certificate={certificate} compact onAction={onPendingAction} />
            </>
        ),
        'property:CERTIFICATE_VALIDATION_STATUS': (certificate) => (
            <CertificateStatus status={certificate.validationStatus} asIcon={true} />
        ),
        'property:COMPLIANCE_STATUS': (certificate) =>
            certificate.complianceStatus ? <CertificateStatus status={certificate.complianceStatus} asIcon={true} /> : null,
        'property:PRIVATE_KEY': (certificate) =>
            certificate.privateKeyAvailability ? (
                <Tooltip content="Private key is available for this certificate">
                    <span>
                        <KeyRound aria-hidden size={16} strokeWidth={1.5} />
                        <span className="sr-only">Private key available</span>
                    </span>
                </Tooltip>
            ) : null,
        'property:COMMON_NAME': (certificate) => buildCommonNameCell(certificate, opts),
        'property:NOT_BEFORE': (certificate) =>
            certificate.notBefore ? <span className="whitespace-nowrap">{dateFormatter(new Date(certificate.notBefore))}</span> : null,
        'property:NOT_AFTER': (certificate) =>
            certificate.notAfter ? <span className="whitespace-nowrap">{dateFormatter(new Date(certificate.notAfter))}</span> : null,
        'property:GROUP_NAME': (certificate) => {
            const groups = buildGroupsValues(certificate, isLinkDisabled);
            return groups.length > 0 ? <MultiValueCell values={groups} dataTestId="cell-groups" /> : null;
        },
        'property:RA_PROFILE_NAME': (certificate) =>
            certificate.raProfile ? <span className="whitespace-nowrap">{buildRaProfileCell(certificate, isLinkDisabled)}</span> : null,
        'property:OWNER': (certificate) => (certificate.owner ? buildOwnerCell(certificate, isLinkDisabled) : null),
        'property:SERIAL_NUMBER': (certificate) => certificate.serialNumber,
        'property:SIGNATURE_ALGORITHM': (certificate) => certificate.signatureAlgorithm,
        'property:PUBLIC_KEY_ALGORITHM': (certificate) => certificate.publicKeyAlgorithm,
        'property:ISSUER_COMMON_NAME': (certificate) => buildIssuerCell(certificate, isLinkDisabled),
        'property:CERTIFICATE_TYPE': (certificate) => buildCertTypeCell(certificate, certificateTypeEnum, getEnumLabel),
        'property:ARCHIVED': (certificate) => (
            <Badge color={certificate.archived ? 'gray' : 'success'} size="small">
                {certificate.archived ? 'Yes' : 'No'}
            </Badge>
        ),
    };
}

/**
 * The cells of one certificate row, rendered from the column definitions rather than assembled as a
 * positional array — which is what lets a column set chosen at runtime render at all.
 */
export function buildCertificateRowColumns(
    certificate: CertificateListResponseModel,
    opts: BuildCertificateRowColumnsOpts,
    columns: ColumnDefinition[] = CERTIFICATE_COLUMNS,
): React.ReactNode[] {
    const registry = buildCertificateCellRegistry(opts);
    return columns.map((column) => renderCell(certificate, column, registry));
}

function buildQcStatementRows(
    qc: NonNullable<CertificateDetailResponseModel['qcStatements']>,
    qcTypeEnum: PlatformEnumMap,
    getEnumLabel: (e: PlatformEnumMap, key: string) => string,
): TableDataRow[] {
    const rows: TableDataRow[] = [
        {
            id: 'qcCompliance',
            columns: [
                'Qualified Certificate Compliance',
                <Badge key="qcCompliance" color={qc.qcCompliance ? 'success' : 'secondary'}>
                    {qc.qcCompliance ? 'Qualified' : 'Not Qualified'}
                </Badge>,
            ],
        },
        {
            id: 'qcSscd',
            columns: [
                'Qualified Certificate Key Storage',
                <Badge key="qcSscd" color={qc.qcSscd ? 'success' : 'secondary'}>
                    {qc.qcSscd ? 'QESCD / Hardware' : 'Software'}
                </Badge>,
            ],
        },
    ];

    if (qc.qcType?.length) {
        rows.push({
            id: 'qcType',
            columns: [
                'Qualified Certificate Type',
                qc.qcType.map((t) => (
                    <div key={t} style={{ margin: '1px' }}>
                        <Badge>{getEnumLabel(qcTypeEnum, t)}</Badge>&nbsp;
                    </div>
                )),
            ],
        });
    }

    if (qc.qcCcLegislation?.length) {
        rows.push({
            id: 'qcCcLegislation',
            columns: [
                'QC Legislation',
                qc.qcCcLegislation.map((cc) => (
                    <div key={cc} style={{ margin: '1px' }}>
                        <Badge>{cc}</Badge>&nbsp;
                    </div>
                )),
            ],
        });
    }

    return rows;
}

export function buildCertificateDetailBaseRows(
    certificate: CertificateDetailResponseModel,
    validationResult: CertificateValidationResultDto | undefined,
    isCertificateArchived: boolean,
    enums: { certificateKeyUsage: PlatformEnumMap; qcType: PlatformEnumMap },
    dateFormatter: (d: Date) => string,
    getEnumLabel: (e: PlatformEnumMap, key: string) => string,
    onPendingAction: (action: PendingAction) => void,
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
                    <span className="inline-flex items-center gap-1">
                        <CertificateStatus status={certificate.state} />
                        <EnumValueDescription platformEnum={PlatformEnum.CertificateState} value={certificate.state} />
                    </span>
                    <PendingActionButtons certificate={certificate} onAction={onPendingAction} />
                </React.Fragment>,
            ],
        },
        {
            id: 'validationStatus',
            columns: [
                'Validation Status',
                <span key="validation" className="inline-flex flex-wrap items-center gap-2">
                    <CertificateStatus status={validationResult?.resultStatus ?? CertificateValidationStatus.NotChecked} />
                    {certificate.state === CertificateState.Requested && (
                        <span className="text-content-muted">{validationPanelMessages['pending-issuance']}</span>
                    )}
                </span>,
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
        { id: 'keySize', columns: ['Key Size', certificate.keySize?.toString() ?? ''] },
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
                        <Badge>{getEnumLabel(enums.certificateKeyUsage, name)}</Badge>
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
                certificate.subjectType ? (
                    <span key="subjectType" className="inline-flex items-center gap-1">
                        <CertificateStatus status={certificate.subjectType} />
                        <EnumValueDescription platformEnum={PlatformEnum.CertificateSubjectType} value={certificate.subjectType} />
                    </span>
                ) : (
                    <>n/a</>
                ),
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

    if (certificate.qcStatements) {
        rows.push(...buildQcStatementRows(certificate.qcStatements, enums.qcType, getEnumLabel));
    }

    return rows;
}

function getProtocolProfileLink(protocolInfo: CertificateProtocolDto): string | undefined {
    switch (protocolInfo.protocol) {
        case CertificateProtocol.Acme:
            return `../acmeprofiles/detail/${protocolInfo.protocolProfileUuid}`;
        case CertificateProtocol.Cmp:
            return `../cmpprofiles/detail/${protocolInfo.protocolProfileUuid}`;
        case CertificateProtocol.Scep:
            return `../scepprofiles/detail/${protocolInfo.protocolProfileUuid}`;
        default:
            // A protocol the backend added before these types were regenerated has no known profile route here.
            return undefined;
    }
}

export function buildCertificateProtocolRows(
    protocolInfo: CertificateProtocolDto | undefined,
    certificateProtocolEnum: PlatformEnumMap,
    getEnumLabel: (e: PlatformEnumMap, key: string) => string,
): TableDataRow[] {
    if (!protocolInfo) return [];

    // The profile association is not always known — e.g. legacy CMP-issued certificates whose recorded UUID was
    // cleared by a core migration, or profiles deleted after issuance. Linking anyway would navigate to
    // /detail/undefined, which 404s, and the link label would be empty and therefore invisible. An unrecognised
    // protocol has no route either, so the UUID is still shown, just not as a link.
    const profileLink = protocolInfo.protocolProfileUuid ? getProtocolProfileLink(protocolInfo) : undefined;

    const rows: TableDataRow[] = [
        {
            id: 'protocol',
            columns: [
                'Protocol Name',
                <span key="protocol" className="inline-flex items-center gap-1">
                    <Badge color="secondary">{getEnumLabel(certificateProtocolEnum, protocolInfo.protocol)}</Badge>
                    <EnumValueDescription platformEnum={PlatformEnum.CertificateProtocol} value={protocolInfo.protocol} />
                </span>,
            ],
        },
        {
            id: 'protocolProfileUuid',
            columns: [
                'Protocol Profile UUID',
                profileLink ? (
                    <Link key="protocolProfileUuid" to={profileLink}>
                        {protocolInfo.protocolProfileUuid}
                    </Link>
                ) : (
                    (protocolInfo.protocolProfileUuid ?? 'n/a')
                ),
            ],
        },
    ];

    if (protocolInfo.protocol === CertificateProtocol.Acme && protocolInfo.additionalProtocolUuid) {
        rows.push({
            id: 'additionalProfileUuid',
            columns: [
                'Protocol Account UUID',
                // The ACME account route is nested under the profile, so without the profile UUID there is no
                // resolvable path — show the account UUID as plain text instead.
                protocolInfo.protocolProfileUuid ? (
                    <Link
                        key="additionalProfileUuid"
                        to={`../acmeaccounts/detail/${protocolInfo.protocolProfileUuid}/${protocolInfo.additionalProtocolUuid}`}
                    >
                        {protocolInfo.additionalProtocolUuid}
                    </Link>
                ) : (
                    protocolInfo.additionalProtocolUuid
                ),
            ],
        });
    }

    return rows;
}
