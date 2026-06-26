import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router';

import Breadcrumb from 'components/Breadcrumb';
import ProgressButton from 'components/ProgressButton';
import Container from 'components/Container';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import StatusBadge from 'components/StatusBadge';
import { EnumValueDescription } from 'components/EnumDescription';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import CustomAttributeWidget from 'components/Attributes/CustomAttributeWidget';
import AttributeViewer from 'components/Attributes/AttributeViewer';
import TabLayout from 'components/Layout/TabLayout';

import { actions, selectors } from 'ducks/signing-profiles';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as tspProfileActions, selectors as tspProfileSelectors } from 'ducks/tsp-profiles';
import Select from 'components/Select';

import {
    type DigestAlgorithm,
    ManagedSigningType,
    PlatformEnum,
    Resource,
    SigningProtocol,
    SigningRecordPersistenceMode,
    SigningScheme,
    SigningWorkflowType,
    type StaticKeyManagedSigningDto,
    type TimestampingWorkflowDto,
} from 'types/openapi';
import { isStaticKeyManagedSigning, isTimestampingWorkflow } from 'utils/type-guards';
import { LockWidgetNameEnum } from 'types/user-interface';
import { createWidgetDetailHeaders } from 'utils/widget';

// ─── Label Helpers ────────────────────────────────────────────────────────────

const workflowTypeLabels: Record<SigningWorkflowType, string> = {
    [SigningWorkflowType.Timestamping]: 'Timestamping',
    [SigningWorkflowType.ContentSigning]: 'Content Signing',
    [SigningWorkflowType.RawSigning]: 'Raw Signing',
};

const protocolLabels: Partial<Record<SigningProtocol, string>> = {
    [SigningProtocol.Tsp]: 'TSP (RFC 3161)',
    [SigningProtocol.CscApi]: 'CSC API v2',
};

const signingSchemeLabels: Record<SigningScheme, string> = {
    [SigningScheme.Managed]: 'Managed',
    [SigningScheme.Delegated]: 'Delegated',
};

const managedSigningTypeLabels: Record<ManagedSigningType, string> = {
    [ManagedSigningType.StaticKey]: 'Static Key',
    [ManagedSigningType.OneTimeKey]: 'One-Time Key',
};

const persistenceModeLabels: Record<SigningRecordPersistenceMode, string> = {
    [SigningRecordPersistenceMode.Immediate]: 'Immediate',
    [SigningRecordPersistenceMode.DeferredDurable]: 'Deferred Durable',
    [SigningRecordPersistenceMode.BestEffort]: 'Best Effort',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SigningProfileDetail() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id } = useParams();

    // ── Selectors ──────────────────────────────────────────────────────────────

    const signingProfile = useSelector(selectors.signingProfile);
    const isFetchingDetail = useSelector(selectors.isFetchingDetail);
    const isDeleting = useSelector(selectors.isDeleting);
    const isEnabling = useSelector(selectors.isEnabling);
    const isDisabling = useSelector(selectors.isDisabling);
    const deleteErrorMessage = useSelector(selectors.deleteErrorMessage);

    const tspActivationDetails = useSelector(selectors.tspActivationDetails);
    const isFetchingTspActivationDetails = useSelector(selectors.isFetchingTspActivationDetails);
    const isActivatingTsp = useSelector(selectors.isActivatingTsp);
    const isDeactivatingTsp = useSelector(selectors.isDeactivatingTsp);

    const tspProfiles = useSelector(tspProfileSelectors.tspProfiles);

    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));

    // ── Local state ────────────────────────────────────────────────────────────

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmDeactivateTsp, setConfirmDeactivateTsp] = useState(false);
    const [activateTspDialog, setActivateTspDialog] = useState(false);
    const [selectedTspProfileUuid, setSelectedTspProfileUuid] = useState<string | undefined>(undefined);

    // ── Derived ────────────────────────────────────────────────────────────────

    const isBusy = useMemo(
        () => isFetchingDetail || isDeleting || isEnabling || isDisabling,
        [isFetchingDetail, isDeleting, isEnabling, isDisabling],
    );

    const timestampingWorkflow = useMemo((): TimestampingWorkflowDto | undefined => {
        if (!signingProfile || !isTimestampingWorkflow(signingProfile.workflow)) return undefined;
        return signingProfile.workflow;
    }, [signingProfile]);

    const workflowTabTitle = useMemo((): string => {
        const type = signingProfile?.workflow?.type;
        return type ? `${workflowTypeLabels[type] ?? 'Signing Workflow'} Properties` : 'Signing Workflow Properties';
    }, [signingProfile]);

    const staticKeyScheme = useMemo((): StaticKeyManagedSigningDto | undefined => {
        if (!signingProfile || !isStaticKeyManagedSigning(signingProfile.signingScheme)) return undefined;
        return signingProfile.signingScheme;
    }, [signingProfile]);

    // ── Data fetching ──────────────────────────────────────────────────────────

    const getFreshData = useCallback(() => {
        if (!id) return;
        dispatch(actions.getSigningProfile({ uuid: id }));
        dispatch(actions.getTspActivationDetails({ uuid: id }));
    }, [dispatch, id]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    // ── Actions ────────────────────────────────────────────────────────────────

    const onEditClick = useCallback(() => {
        if (!signingProfile) return;
        navigate(`../../${Resource.SigningProfiles.toLowerCase()}/edit/${signingProfile.uuid}`);
    }, [signingProfile, navigate]);

    const onEnableClick = useCallback(() => {
        if (!signingProfile) return;
        dispatch(actions.enableSigningProfile({ uuid: signingProfile.uuid }));
    }, [signingProfile, dispatch]);

    const onDisableClick = useCallback(() => {
        if (!signingProfile) return;
        dispatch(actions.disableSigningProfile({ uuid: signingProfile.uuid }));
    }, [signingProfile, dispatch]);

    const onDeleteConfirmed = useCallback(() => {
        if (!signingProfile) return;
        dispatch(actions.deleteSigningProfile({ uuid: signingProfile.uuid }));
        setConfirmDelete(false);
    }, [signingProfile, dispatch]);

    // ── Header buttons ─────────────────────────────────────────────────────────

    const headerButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                id: 'edit',
                icon: 'pencil',
                disabled: false,
                tooltip: 'Edit',
                onClick: onEditClick,
            },
            {
                id: 'delete',
                icon: 'trash',
                disabled: false,
                tooltip: 'Delete',
                onClick: () => setConfirmDelete(true),
            },
            {
                id: 'enable',
                icon: 'check',
                disabled: signingProfile?.enabled ?? true,
                tooltip: 'Enable',
                onClick: onEnableClick,
            },
            {
                id: 'disable',
                icon: 'times',
                disabled: !(signingProfile?.enabled ?? false),
                tooltip: 'Disable',
                onClick: onDisableClick,
            },
        ],
        [signingProfile, onEditClick, onEnableClick, onDisableClick],
    );

    // ── Table headers ──────────────────────────────────────────────────────────

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    // ── General details ────────────────────────────────────────────────────────

    const generalData: TableDataRow[] = useMemo(
        () =>
            signingProfile
                ? [
                      { id: 'uuid', columns: ['UUID', signingProfile.uuid] },
                      { id: 'name', columns: ['Name', signingProfile.name] },
                      { id: 'description', columns: ['Description', signingProfile.description || ''] },
                      { id: 'version', columns: ['Version', String(signingProfile.version)] },
                      { id: 'status', columns: ['Status', <StatusBadge key="value" enabled={signingProfile.enabled} />] },
                      {
                          id: 'workflowType',
                          columns: [
                              'Signing Workflow Type',
                              <span key="value" className="inline-flex items-center gap-1">
                                  <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                                      {workflowTypeLabels[(signingProfile.workflow as TimestampingWorkflowDto)?.type] ??
                                          (signingProfile.workflow as TimestampingWorkflowDto)?.type ??
                                          '—'}
                                  </span>
                                  <EnumValueDescription
                                      platformEnum={PlatformEnum.SigningWorkflowType}
                                      value={(signingProfile.workflow as TimestampingWorkflowDto)?.type}
                                  />
                              </span>,
                          ],
                      },
                      {
                          id: 'enabledProtocols',
                          columns: [
                              'Enabled Protocols',
                              signingProfile.enabledProtocols && signingProfile.enabledProtocols.length > 0 ? (
                                  <div key="value" className="flex flex-wrap gap-1">
                                      {signingProfile.enabledProtocols.map((p) => (
                                          <span key={p} className="inline-flex items-center gap-1">
                                              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                                  {protocolLabels[p] ?? p}
                                              </span>
                                              <EnumValueDescription platformEnum={PlatformEnum.SigningProtocol} value={p} />
                                          </span>
                                      ))}
                                  </div>
                              ) : (
                                  <span key="value" className="text-gray-400 text-sm">
                                      None
                                  </span>
                              ),
                          ],
                      },
                  ]
                : [],
        [signingProfile],
    );

    // ── Timestamping Workflow ──────────────────────────────────────────────────

    const workflowData: TableDataRow[] = useMemo(() => {
        if (!timestampingWorkflow) return [];
        return [
            {
                id: 'connectorName',
                columns: [
                    'Signature Formatting Connector',
                    timestampingWorkflow.signatureFormattingConnector ? (
                        <Link
                            key="value"
                            to={`/${Resource.Connectors.toLowerCase()}/detail/${timestampingWorkflow.signatureFormattingConnector.uuid}`}
                        >
                            {timestampingWorkflow.signatureFormattingConnector.name}
                        </Link>
                    ) : (
                        <span key="value" className="text-gray-400 text-sm">
                            Not configured
                        </span>
                    ),
                ],
            },
            {
                id: 'connectorUuid',
                columns: [
                    'Signature Formatting Connector UUID',
                    timestampingWorkflow.signatureFormattingConnector?.uuid ?? (
                        <span key="value" className="text-gray-400 text-sm">
                            —
                        </span>
                    ),
                ],
            },
            {
                id: 'qualifiedTimestamp',
                columns: ['Qualified Timestamp', <StatusBadge key="value" enabled={timestampingWorkflow.qualifiedTimestamp ?? false} />],
            },
            {
                id: 'validateTokenSignature',
                columns: [
                    'Validate Timestamp after Creation',
                    <StatusBadge key="value" enabled={timestampingWorkflow.validateTokenSignature ?? false} />,
                ],
            },
            {
                id: 'timeQualityConfig',
                columns: [
                    'Time Quality Configuration',
                    timestampingWorkflow.timeQualityConfiguration?.uuid ? (
                        <Link
                            key="value"
                            to={`/${Resource.TimeQualityConfigurations.toLowerCase()}/detail/${timestampingWorkflow.timeQualityConfiguration.uuid}`}
                        >
                            {timestampingWorkflow.timeQualityConfiguration.name ?? timestampingWorkflow.timeQualityConfiguration.uuid}
                        </Link>
                    ) : (
                        <span key="value" className="text-gray-400 text-sm">
                            Not configured
                        </span>
                    ),
                ],
            },
            {
                id: 'defaultPolicyId',
                columns: [
                    'Default TSA Policy ID',
                    timestampingWorkflow.defaultPolicyId || (
                        <span key="value" className="text-gray-400 text-sm">
                            —
                        </span>
                    ),
                ],
            },
            {
                id: 'allowedPolicyIds',
                columns: [
                    'Allowed TSA Policy IDs',
                    timestampingWorkflow.allowedPolicyIds && timestampingWorkflow.allowedPolicyIds.length > 0 ? (
                        <div key="value" className="flex flex-wrap gap-1">
                            {timestampingWorkflow.allowedPolicyIds.map((p) => (
                                <span
                                    key={p}
                                    className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
                                >
                                    {p}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <span key="value" className="text-gray-400 text-sm">
                            All policy IDs accepted
                        </span>
                    ),
                ],
            },
            {
                id: 'allowedDigestAlgorithms',
                columns: [
                    'Allowed Digest Algorithms',
                    timestampingWorkflow.allowedDigestAlgorithms && timestampingWorkflow.allowedDigestAlgorithms.length > 0 ? (
                        <div key="value" className="flex flex-wrap gap-1">
                            {timestampingWorkflow.allowedDigestAlgorithms.map((alg: DigestAlgorithm) => (
                                <span
                                    key={alg}
                                    className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                                >
                                    {alg}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <span key="value" className="text-gray-400 text-sm">
                            All digest algorithms accepted
                        </span>
                    ),
                ],
            },
        ];
    }, [timestampingWorkflow]);

    // ── Signing Scheme ─────────────────────────────────────────────────────────

    const signingSchemeData: TableDataRow[] = useMemo(() => {
        if (!signingProfile) return [];
        const sc = signingProfile.signingScheme as StaticKeyManagedSigningDto;
        const rows: TableDataRow[] = [
            {
                id: 'signingScheme',
                columns: [
                    'Signing Scheme',
                    <span key="value" className="inline-flex items-center gap-1">
                        <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                            {signingSchemeLabels[sc?.signingScheme] ?? sc?.signingScheme ?? '—'}
                        </span>
                        <EnumValueDescription platformEnum={PlatformEnum.SigningScheme} value={sc?.signingScheme} />
                    </span>,
                ],
            },
        ];

        if (sc?.signingScheme === SigningScheme.Managed) {
            rows.push({
                id: 'managedSigningType',
                columns: [
                    'Managed Signing Type',
                    <span key="value" className="inline-flex items-center gap-1">
                        {managedSigningTypeLabels[sc.managedSigningType] ?? sc.managedSigningType}
                        <EnumValueDescription platformEnum={PlatformEnum.ManagedSigningType} value={sc.managedSigningType} />
                    </span>,
                ],
            });
        }

        if (staticKeyScheme) {
            const cert = staticKeyScheme.certificate;
            rows.push({
                id: 'certificate',
                columns: [
                    'Certificate',
                    cert ? (
                        <Link key="value" to={`/${Resource.Certificates.toLowerCase()}/detail/${cert.uuid}`}>
                            {cert.commonName || cert.uuid}
                            {cert.serialNumber ? <span className="ml-2 text-gray-500 text-xs">SN: {cert.serialNumber}</span> : null}
                        </Link>
                    ) : (
                        <span key="value" className="text-gray-400 text-sm">
                            —
                        </span>
                    ),
                ],
            });

            if (cert) {
                rows.push(
                    { id: 'certSubjectDn', columns: ['Subject DN', cert.subjectDn || '—'] },
                    { id: 'certPublicKeyAlg', columns: ['Public Key Algorithm', cert.publicKeyAlgorithm || '—'] },
                    {
                        id: 'certValidity',
                        columns: [
                            'Validity',
                            cert.notBefore && cert.notAfter
                                ? `${new Date(cert.notBefore).toLocaleDateString()} – ${new Date(cert.notAfter).toLocaleDateString()}`
                                : '—',
                        ],
                    },
                );
            }
        }

        return rows;
    }, [signingProfile, staticKeyScheme]);

    // ── Record Policy ──────────────────────────────────────────────────────────

    const recordPolicyData: TableDataRow[] = useMemo(() => {
        const rp = signingProfile?.recordPolicy;
        if (!rp) return [];

        const recordingEnabled = rp.recordingEnabled ?? false;
        const rows: TableDataRow[] = [
            {
                id: 'recordingEnabled',
                columns: ['Recording Enabled', <StatusBadge key="value" enabled={recordingEnabled} />],
            },
        ];

        if (!recordingEnabled) return rows;

        // The signature value and DTBS are not stored for the timestamping workflow (the RFC 3161 token
        // already embeds both), so those rows are omitted to mirror the form. (issue #1692)
        const isTimestamping = signingProfile?.workflow ? isTimestampingWorkflow(signingProfile.workflow) : false;

        rows.push({
            id: 'recordRequestMetadata',
            columns: ['Request Metadata', <StatusBadge key="value" enabled={rp.recordRequestMetadata ?? false} />],
        });
        if (!isTimestamping) {
            rows.push({
                id: 'recordSignature',
                columns: ['Signature', <StatusBadge key="value" enabled={rp.recordSignature ?? false} />],
            });
        }
        rows.push({
            id: 'recordSignedDocument',
            columns: ['Signed Document', <StatusBadge key="value" enabled={rp.recordSignedDocument ?? false} />],
        });
        if (!isTimestamping) {
            rows.push({
                id: 'recordDtbs',
                columns: ['Data-to-be-signed', <StatusBadge key="value" enabled={rp.recordDtbs ?? false} />],
            });
        }
        rows.push(
            {
                id: 'retentionDays',
                columns: [
                    'Retention',
                    rp.retentionDays != null ? `${rp.retentionDays} day${rp.retentionDays === 1 ? '' : 's'}` : 'Indefinite',
                ],
            },
            {
                id: 'persistenceMode',
                columns: ['Persistence Mode', rp.persistenceMode ? (persistenceModeLabels[rp.persistenceMode] ?? rp.persistenceMode) : '—'],
            },
        );

        return rows;
    }, [signingProfile]);

    // ── Protocol activation ────────────────────────────────────────────────────

    const tspActivationData: TableDataRow[] = useMemo(() => {
        if (!tspActivationDetails) return [];
        return [
            { id: 'tspUuid', columns: ['UUID', tspActivationDetails.uuid] },
            { id: 'tspName', columns: ['Name', tspActivationDetails.name] },
            {
                id: 'tspAvailable',
                columns: ['Available', <StatusBadge key="value" enabled={tspActivationDetails.available} />],
            },
            {
                id: 'tspUrl',
                columns: ['TSP URL', tspActivationDetails.signingUrl ? tspActivationDetails.signingUrl : '—'],
            },
        ];
    }, [tspActivationDetails]);

    // ── Protocols table ────────────────────────────────────────────────────────

    const availableProtocolsHeaders: TableHeader[] = useMemo(
        () => [
            { id: 'name', content: 'Protocol Name', sortable: true, width: '40%', sort: 'asc' },
            { id: 'status', content: 'Status', sortable: true, align: 'center', width: '20%' },
            { id: 'actions', content: 'Actions', align: 'center', width: '40%' },
        ],
        [],
    );

    const availableProtocolsData: TableDataRow[] = useMemo(
        () => [
            {
                id: 'tsp',
                columns: [
                    'Timestamping Protocol (TSA)',
                    <StatusBadge key="status" enabled={tspActivationDetails?.available ?? false} />,
                    <ProgressButton
                        key="actions"
                        type="button"
                        title={tspActivationDetails?.available ? 'Deactivate' : 'Activate'}
                        inProgressTitle={tspActivationDetails?.available ? 'Deactivating...' : 'Activating...'}
                        inProgress={isActivatingTsp || isDeactivatingTsp}
                        onClick={() => {
                            if (tspActivationDetails?.available) {
                                setConfirmDeactivateTsp(true);
                            } else {
                                setSelectedTspProfileUuid(undefined);
                                dispatch(tspProfileActions.listTspProfiles());
                                setActivateTspDialog(true);
                            }
                        }}
                    />,
                ],
                detailColumns: [
                    <></>,
                    <></>,
                    <></>,
                    tspActivationDetails?.available ? (
                        <>
                            <b>Protocol settings</b>
                            <br />
                            <br />
                            <CustomTable hasHeader={false} headers={detailHeaders} data={tspActivationData} />
                        </>
                    ) : (
                        <>Timestamping Protocol is not activated on this profile.</>
                    ),
                ],
            },
        ],
        [tspActivationDetails?.available, isActivatingTsp, isDeactivatingTsp, detailHeaders, tspActivationData, dispatch],
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    const pageTitle = signingProfile?.name || 'Signing Profile Details';

    return (
        <div>
            <Breadcrumb
                items={[
                    {
                        label: `${getEnumLabel(resourceEnum, Resource.SigningProfiles)} Inventory`,
                        href: `/${Resource.SigningProfiles.toLowerCase()}`,
                    },
                    { label: pageTitle, href: '' },
                ]}
            />

            <Widget widgetLockName={LockWidgetNameEnum.SigningProfileDetails} busy={isBusy} noBorder>
                <TabLayout
                    tabs={[
                        {
                            title: 'Details',
                            content: (
                                <Container className="md:flex-row">
                                    <Widget
                                        title="Signing Profile Details"
                                        widgetButtons={headerButtons}
                                        titleSize="large"
                                        refreshAction={getFreshData}
                                        lockSize="large"
                                        className="w-full md:w-1/2"
                                    >
                                        <CustomTable headers={detailHeaders} data={generalData} />
                                    </Widget>

                                    <Container className="w-full md:w-1/2 flex flex-col">
                                        {signingProfile && (
                                            <CustomAttributeWidget
                                                resource={Resource.SigningProfiles}
                                                resourceUuid={signingProfile.uuid}
                                                attributes={signingProfile.customAttributes}
                                            />
                                        )}
                                    </Container>
                                </Container>
                            ),
                        },
                        {
                            title: workflowTabTitle,
                            content: (
                                <>
                                    <Widget title="Timestamping Workflow Configuration" titleSize="large">
                                        {workflowData.length > 0 ? (
                                            <CustomTable headers={detailHeaders} data={workflowData} />
                                        ) : (
                                            <p className="text-gray-400 text-sm">No workflow configuration available.</p>
                                        )}
                                    </Widget>
                                    {timestampingWorkflow?.signatureFormattingConnector &&
                                        timestampingWorkflow.signatureFormattingConnectorAttributes &&
                                        timestampingWorkflow.signatureFormattingConnectorAttributes.length > 0 && (
                                            <Widget title="Signature Formatting Connector Attributes" titleSize="large">
                                                <AttributeViewer attributes={timestampingWorkflow.signatureFormattingConnectorAttributes} />
                                            </Widget>
                                        )}
                                </>
                            ),
                        },
                        {
                            title: 'Signing Scheme',
                            content: (
                                <Widget title="Signing Scheme Configuration" titleSize="large">
                                    <CustomTable headers={detailHeaders} data={signingSchemeData} />
                                </Widget>
                            ),
                        },
                        {
                            title: 'Record Policy',
                            content: (
                                <Widget title="Signing Record Policy" titleSize="large">
                                    {recordPolicyData.length > 0 ? (
                                        <>
                                            <CustomTable headers={detailHeaders} data={recordPolicyData} />
                                            {!(signingProfile?.recordPolicy?.recordingEnabled ?? false) && (
                                                <p className="mt-2 text-sm text-gray-500">
                                                    No Signing Records are created for this profile.
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-gray-400 text-sm">No record policy configured.</p>
                                    )}
                                </Widget>
                            ),
                        },
                        {
                            title: 'Protocols',
                            content: (
                                <Widget
                                    title="Available Protocols"
                                    busy={isFetchingTspActivationDetails || isActivatingTsp || isDeactivatingTsp}
                                    titleSize="large"
                                    refreshAction={getFreshData}
                                >
                                    <CustomTable hasDetails={true} headers={availableProtocolsHeaders} data={availableProtocolsData} />
                                </Widget>
                            ),
                        },
                    ]}
                />
            </Widget>

            {/* ── Dialogs ── */}
            <Dialog
                isOpen={confirmDelete}
                caption="Delete Signing Profile"
                body="You are about to delete this Signing Profile. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={deleteErrorMessage.length > 0}
                caption="Delete Signing Profile"
                body={
                    <>
                        Failed to delete the Signing Profile:
                        <br />
                        <br />
                        {deleteErrorMessage}
                    </>
                }
                toggle={() => dispatch(actions.clearDeleteErrorMessages())}
                buttons={[
                    {
                        color: 'secondary',
                        variant: 'outline',
                        onClick: () => dispatch(actions.clearDeleteErrorMessages()),
                        body: 'Close',
                    },
                ]}
            />

            <Dialog
                isOpen={confirmDeactivateTsp}
                caption="Deactivate TSP Protocol"
                body="Are you sure you want to deactivate the TSP Protocol on this Signing Profile?"
                toggle={() => setConfirmDeactivateTsp(false)}
                icon="warning"
                buttons={[
                    {
                        color: 'danger',
                        onClick: () => {
                            if (id) dispatch(actions.deactivateTsp({ uuid: id }));
                            setConfirmDeactivateTsp(false);
                        },
                        body: 'Deactivate',
                    },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDeactivateTsp(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={activateTspDialog}
                caption="Activate TSP Protocol"
                body={
                    <div>
                        <p className="mb-3">Select a TSP Profile to activate on this Signing Profile.</p>
                        <Select
                            id="tspConfigSelect"
                            options={tspProfiles.map((c) => ({ value: c.uuid, label: c.name }))}
                            value={selectedTspProfileUuid ?? ''}
                            onChange={(value) => setSelectedTspProfileUuid(value as string | undefined)}
                            placeholder="Select TSP configuration"
                        />
                    </div>
                }
                toggle={() => setActivateTspDialog(false)}
                buttons={[
                    {
                        color: 'primary',
                        disabled: !selectedTspProfileUuid,
                        onClick: () => {
                            if (id && selectedTspProfileUuid) {
                                dispatch(actions.activateTsp({ signingProfileUuid: id, tspProfileUuid: selectedTspProfileUuid }));
                            }
                            setActivateTspDialog(false);
                        },
                        body: 'Activate',
                    },
                    { color: 'secondary', variant: 'outline', onClick: () => setActivateTspDialog(false), body: 'Cancel' },
                ]}
            />
        </div>
    );
}
