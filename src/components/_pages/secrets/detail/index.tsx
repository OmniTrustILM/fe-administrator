import DetailPageSkeleton from 'components/DetailPageSkeleton';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import { Info, SquareMinus } from 'lucide-react';

import AttributeViewer, { ATTRIBUTE_VIEWER_TYPE } from 'components/Attributes/AttributeViewer';
import Badge from 'components/Badge';
import Breadcrumb from 'components/Breadcrumb';
import Button from 'components/Button';
import Container from 'components/Container';
import CustomAttributeWidget from 'components/Attributes/CustomAttributeWidget';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import EditIcon from 'components/icons/EditIcon';
import Select from 'components/Select';
import TabLayout from 'components/Layout/TabLayout';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import ComplianceCheckResultWidget from 'components/_pages/certificates/ComplianceCheckResultWidget/ComplianceCheckResultWidget';
import CertificateStatus from 'components/_pages/certificates/CertificateStatus';

import { actions as approvalActions, selectors as approvalSelectors } from 'ducks/approvals';
import { actions as groupActions, selectors as groupSelectors } from 'ducks/certificateGroups';
import { actions as complianceProfileActions } from 'ducks/compliance-profiles';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as secretsActions, selectors as secretsSelectors } from 'ducks/secrets';
import { SecretContentDialog } from '../SecretContentDialog/SecretContentDialog';
import { actions as userActions, selectors as userSelectors } from 'ducks/users';
import { actions as vaultProfileActions, selectors as vaultProfileSelectors } from 'ducks/vault-profiles';

import { LockWidgetNameEnum } from 'types/user-interface';
import { ComplianceStatus, PlatformEnum, Resource, SecretState, type SyncVaultProfileDto } from 'types/openapi';
import type { AttributeResponseModel } from 'types/attributes';

import { dateFormatter } from 'utils/dateUtil';
import { createWidgetDetailHeaders } from 'utils/widget';

import SecretForm from '../form';
import SecretStateBadge from '../SecretStateBadge';
import { SyncVaultProfileDialog } from '../SyncVaultProfileDialog/SyncVaultProfileDialog';

function SecretDetail() {
    const dispatch = useDispatch();

    const { id } = useParams();

    const secret = useSelector(secretsSelectors.secret);
    const versions = useSelector(secretsSelectors.versions);
    const secretContent = useSelector(secretsSelectors.secretContent);
    const isFetchingDetail = useSelector(secretsSelectors.isFetchingDetail);
    const isFetchingContent = useSelector(secretsSelectors.isFetchingContent);
    const isDeleting = useSelector(secretsSelectors.isDeleting);
    const isUpdating = useSelector(secretsSelectors.isUpdating);
    const approvals = useSelector(approvalSelectors.approvals);
    const isFetchingApprovals = useSelector(approvalSelectors.isFetchingList);

    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const secretTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.SecretType));
    const secretStateEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.SecretState));

    const users = useSelector(userSelectors.users);
    const groups = useSelector(groupSelectors.certificateGroups);
    const vaultProfiles = useSelector(vaultProfileSelectors.vaultProfiles);

    const [isShowContentOpen, setIsShowContentOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmEnable, setConfirmEnable] = useState(false);
    const [confirmDisable, setConfirmDisable] = useState(false);
    const [complianceCheck, setComplianceCheck] = useState(false);
    const [isUpdateOwnerOpen, setIsUpdateOwnerOpen] = useState(false);
    const [isUpdateGroupsOpen, setIsUpdateGroupsOpen] = useState(false);
    const [isUpdateVaultProfileOpen, setIsUpdateVaultProfileOpen] = useState(false);
    const [isEditSecretOpen, setIsEditSecretOpen] = useState(false);
    const [isAddSyncVaultProfileOpen, setIsAddSyncVaultProfileOpen] = useState(false);
    const [selectedSyncVaultProfile, setSelectedSyncVaultProfile] = useState<SyncVaultProfileDto | null>(null);
    const [isSyncVaultProfileAttributesOpen, setIsSyncVaultProfileAttributesOpen] = useState(false);
    const [selectedAttributesInfo, setSelectedAttributesInfo] = useState<AttributeResponseModel[] | null>(null);

    const [ownerUuid, setOwnerUuid] = useState('');
    const [selectedGroups, setSelectedGroups] = useState<{ value: string; label: string }[]>([]);
    const [selectedVaultProfileUuid, setSelectedVaultProfileUuid] = useState('');

    const getFreshSecretDetails = useCallback(() => {
        if (!id) return;
        dispatch(secretsActions.clearSecret());
        dispatch(secretsActions.getSecretDetail({ uuid: id }));
        dispatch(secretsActions.getSecretVersions({ uuid: id }));
        dispatch(userActions.list());
        dispatch(groupActions.listGroups());
        dispatch(vaultProfileActions.listVaultProfiles({ pageNumber: 1, itemsPerPage: 100, filters: [] }));
    }, [dispatch, id]);

    const getFreshSecretApprovals = useCallback(() => {
        dispatch(
            approvalActions.listApprovals({
                pageNumber: 1,
                itemsPerPage: 100,
            }),
        );
    }, [dispatch]);

    useEffect(() => {
        getFreshSecretApprovals();
    }, [getFreshSecretApprovals]);

    useEffect(() => {
        getFreshSecretDetails();
    }, [getFreshSecretDetails]);
    const onDeleteConfirmed = useCallback(() => {
        if (!secret) return;
        dispatch(secretsActions.deleteSecret({ uuid: secret.uuid }));
        setConfirmDelete(false);
    }, [dispatch, secret]);

    const onEnableConfirmed = useCallback(() => {
        if (!secret) return;
        dispatch(secretsActions.enableSecret({ uuid: secret.uuid }));
        setConfirmEnable(false);
    }, [dispatch, secret]);

    const onDisableConfirmed = useCallback(() => {
        if (!secret) return;
        dispatch(secretsActions.disableSecret({ uuid: secret.uuid }));
        setConfirmDisable(false);
    }, [dispatch, secret]);

    const onComplianceCheck = useCallback(() => {
        if (!secret?.uuid) return;

        dispatch(
            complianceProfileActions.checkResourceObjectCompliance({
                resource: Resource.Secrets,
                objectUuid: secret.uuid,
            }),
        );
        setComplianceCheck(false);
    }, [dispatch, secret]);

    const handleUpdateOwner = useCallback(() => {
        if (!secret || !ownerUuid) return;
        dispatch(secretsActions.updateSecretObjects({ uuid: secret.uuid, update: { ownerUuid } }));
        setIsUpdateOwnerOpen(false);
        setOwnerUuid('');
    }, [dispatch, ownerUuid, secret]);

    const handleRemoveOwner = useCallback(() => {
        if (!secret) return;
        dispatch(secretsActions.updateSecretObjects({ uuid: secret.uuid, update: { ownerUuid: '' } }));
        setIsUpdateOwnerOpen(false);
        setOwnerUuid('');
    }, [dispatch, secret]);

    const handleUpdateGroups = useCallback(() => {
        if (!secret) return;
        const groupUuids = selectedGroups.map((g) => g.value);
        dispatch(secretsActions.updateSecretObjects({ uuid: secret.uuid, update: { groupUuids } }));
        setIsUpdateGroupsOpen(false);
        setSelectedGroups([]);
    }, [dispatch, secret, selectedGroups]);

    const handleClearGroups = useCallback(() => {
        if (!secret) return;
        dispatch(secretsActions.updateSecretObjects({ uuid: secret.uuid, update: { groupUuids: [] } }));
        setIsUpdateGroupsOpen(false);
        setSelectedGroups([]);
    }, [dispatch, secret]);

    const handleUpdateVaultProfile = useCallback(() => {
        if (!secret || !selectedVaultProfileUuid) return;
        dispatch(
            secretsActions.updateSecretObjects({
                uuid: secret.uuid,
                update: { sourceVaultProfileUuid: selectedVaultProfileUuid },
            }),
        );
        setIsUpdateVaultProfileOpen(false);
        setSelectedVaultProfileUuid('');
    }, [dispatch, secret, selectedVaultProfileUuid]);

    const handleSelectedAttributesInfo = useCallback((attributes: AttributeResponseModel[]) => {
        setSelectedAttributesInfo(attributes);
    }, []);
    const widgetButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'eye',
                disabled: !secret?.enabled,
                tooltip: 'Show Content',
                onClick: () => {
                    setIsShowContentOpen(true);
                    if (secret) dispatch(secretsActions.getSecretContent({ uuid: secret.uuid }));
                },
            },
            {
                icon: 'check',
                disabled: !secret || secret.enabled,
                tooltip: 'Enable',
                onClick: () => setConfirmEnable(true),
            },
            {
                icon: 'times',
                disabled: !secret?.enabled,
                tooltip: 'Disable',
                onClick: () => setConfirmDisable(true),
            },
            {
                icon: 'gavel',
                disabled: !secret,
                tooltip: 'Check Compliance',
                onClick: () => setComplianceCheck(true),
            },
            {
                icon: 'pencil',
                disabled: !secret || secret.state === SecretState.PendingApproval,
                tooltip: 'Edit',
                onClick: () => {
                    setIsEditSecretOpen(true);
                },
            },
            {
                icon: 'trash',
                disabled: !secret,
                tooltip: 'Delete',
                onClick: () => setConfirmDelete(true),
            },
        ],
        [secret],
    );

    const syncVaultProfilesButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: !secret,
                tooltip: 'Add Sync Vault Profile',
                onClick: () => setIsAddSyncVaultProfileOpen(true),
            },
        ],
        [secret],
    );

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(() => {
        if (!secret) return [];

        const rows: TableDataRow[] = [
            {
                id: 'type',
                columns: ['Type', getEnumLabel(secretTypeEnum, secret.type)],
            },
            {
                id: 'description',
                columns: ['Description', secret.description ?? ''],
            },
            {
                id: 'state',
                columns: [
                    'State',
                    <SecretStateBadge key="state" state={secret.state}>
                        {getEnumLabel(secretStateEnum, secret.state)}
                    </SecretStateBadge>,
                ],
            },
            {
                id: 'version',
                columns: ['Version', secret.version ? secret.version.toString() : ''],
            },
            {
                id: 'status',
                columns: [
                    'Status',
                    <Badge key="status" color={secret.enabled ? 'success' : 'danger'}>
                        {secret.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>,
                ],
            },
            {
                id: 'complianceStatus',
                columns: [
                    'Compliance Status',
                    <CertificateStatus key="compliance-status" status={secret.complianceStatus || ComplianceStatus.Na} />,
                ],
            },
            {
                id: 'lastUpdate',
                columns: ['Last update', secret.updatedAt ? dateFormatter(secret.updatedAt) : ''],
            },
        ];

        return rows;
    }, [secret, secretTypeEnum, secretStateEnum]);

    const syncVaultProfilesHeaders: TableHeader[] = useMemo(
        () => [
            { id: 'name', content: 'Name' },
            { id: 'description', content: 'Description' },
            { id: 'action', content: 'Action' },
        ],
        [],
    );

    const syncVaultProfilesData: TableDataRow[] = useMemo(() => {
        if (!secret?.syncVaultProfiles) return [];

        return secret.syncVaultProfiles.map((profile) => {
            const vaultUuid = vaultProfiles.find((p) => p.uuid === profile.uuid)?.vaultInstance?.uuid ?? undefined;

            return {
                id: profile.uuid,
                columns: [
                    vaultUuid ? (
                        <Link key="name" to={`/${Resource.VaultProfiles.toLowerCase()}/detail/${vaultUuid}/${profile.uuid}`}>
                            {profile.name}
                        </Link>
                    ) : (
                        profile.name
                    ),
                    '',
                    <div key="action" className="flex">
                        <Button
                            variant="transparent"
                            color="secondary"
                            onClick={() => {
                                dispatch(
                                    secretsActions.removeSyncVaultProfile({
                                        uuid: secret.uuid,
                                        vaultProfileUuid: profile.uuid,
                                    }),
                                );
                            }}
                            title="Remove Sync Vault Profile"
                            aria-label="Remove Sync Vault Profile"
                        >
                            <SquareMinus size={16} />
                        </Button>
                        {profile.secretAttributes && profile.secretAttributes.length > 0 && (
                            <Button
                                variant="transparent"
                                color="secondary"
                                onClick={() => {
                                    setSelectedSyncVaultProfile(profile);
                                    setIsSyncVaultProfileAttributesOpen(true);
                                }}
                                title="Show Sync Vault Profile attributes"
                                aria-label="Show Sync Vault Profile attributes"
                            >
                                <Info size={16} />
                            </Button>
                        )}
                    </div>,
                ],
            };
        });
    }, [secret, vaultProfiles, dispatch]);

    const userOptions = useMemo(
        () =>
            users.map((user) => ({
                value: user.uuid,
                label: user.username,
            })),
        [users],
    );

    const groupOptions = useMemo(
        () =>
            (groups ?? []).map((group: any) => ({
                value: group.uuid,
                label: group.name,
            })),
        [groups],
    );

    const vaultProfileOptions = useMemo(
        () =>
            vaultProfiles
                .filter((profile) => profile.enabled)
                .map((profile) => ({
                    value: profile.uuid,
                    label: profile.name,
                })),
        [vaultProfiles],
    );

    const versionsHeaders: TableHeader[] = useMemo(
        () => [
            { id: 'version', content: 'Version' },
            { id: 'createdAt', content: 'Created at' },
            { id: 'fingerprint', content: 'Fingerprint' },
        ],
        [],
    );

    const versionsData: TableDataRow[] = useMemo(
        () =>
            versions.map((v) => ({
                id: v.version.toString(),
                columns: [v.version.toString(), v.createdAt ? dateFormatter(v.createdAt) : '', v.fingerprint ?? ''],
            })),
        [versions],
    );

    const approvalsHeaders: TableHeader[] = useMemo(
        () => [
            { id: 'approvalUUID', content: 'Approval UUID' },
            { id: 'approvalProfile', content: 'Approval Profile' },
            { id: 'status', content: 'Status' },
            { id: 'requestedBy', content: 'Requested By' },
            { id: 'resource', content: 'Resource' },
            { id: 'action', content: 'Action' },
            { id: 'createdAt', content: 'Created At' },
            { id: 'closedAt', content: 'Closed At' },
        ],
        [],
    );

    const approvalsData: TableDataRow[] = useMemo(
        () =>
            approvals
                .filter((approval) => approval.resource === Resource.Secrets && approval.objectUuid === id)
                .map((approval) => ({
                    id: approval.approvalUuid,
                    columns: [
                        <Link key="uuid" to={`/${Resource.Approvals.toLowerCase()}/detail/${approval.approvalUuid}`}>
                            {approval.approvalUuid}
                        </Link>,
                        <Link key="profile" to={`/${Resource.ApprovalProfiles.toLowerCase()}/detail/${approval.approvalProfileUuid}`}>
                            {approval.approvalProfileName}
                        </Link>,
                        approval.status,
                        approval.creatorUsername ? (
                            <Link key="creator" to={`/${Resource.Users.toLowerCase()}/detail/${approval.creatorUuid}`}>
                                {approval.creatorUsername}
                            </Link>
                        ) : (
                            'Unassigned'
                        ),
                        getEnumLabel(resourceEnum, approval.resource),
                        approval.resourceAction || '',
                        approval.createdAt ? dateFormatter(approval.createdAt) : '',
                        approval.closedAt ? dateFormatter(approval.closedAt) : '',
                    ],
                })),
        [approvals, id, resourceEnum],
    );

    const otherPropertiesHeaders: TableHeader[] = useMemo(
        () => [
            { id: 'attribute', content: 'Attribute' },
            { id: 'value', content: 'Value' },
            { id: 'action', content: 'Action' },
        ],
        [],
    );

    const otherPropertiesData: TableDataRow[] = useMemo(() => {
        const sourceVaultProfileVaultUuid =
            vaultProfiles.find((p) => p.uuid === secret?.sourceVaultProfile?.uuid)?.vaultInstance?.uuid ?? undefined;

        const sourceVaultProfileCell = secret?.sourceVaultProfile ? (
            sourceVaultProfileVaultUuid ? (
                <Link
                    to={`/${Resource.VaultProfiles.toLowerCase()}/detail/${sourceVaultProfileVaultUuid}/${secret.sourceVaultProfile.uuid}`}
                >
                    {secret.sourceVaultProfile.name}
                </Link>
            ) : (
                secret.sourceVaultProfile.name
            )
        ) : (
            'Unassigned'
        );

        return [
            {
                id: 'uuid',
                columns: ['UUID', secret?.uuid ?? ''],
            },
            {
                id: 'owner',
                columns: [
                    'Owner',
                    secret?.owner ? (
                        <Link to={`/${Resource.Users.toLowerCase()}/detail/${secret.owner.uuid}`}>{(secret.owner as any).name}</Link>
                    ) : (
                        'Unassigned'
                    ),
                    <div key="owner-actions" className="flex">
                        <Button
                            variant="transparent"
                            color="secondary"
                            onClick={() => {
                                setOwnerUuid(secret?.owner?.uuid ?? '');
                                setIsUpdateOwnerOpen(true);
                            }}
                            title="Update Owner"
                        >
                            <EditIcon size={16} />
                        </Button>
                    </div>,
                ],
            },
            {
                id: 'groups',
                columns: [
                    'Groups',
                    secret?.groups && secret.groups.length > 0
                        ? secret.groups.map((g, i) => (
                              <Fragment key={g.uuid}>
                                  <Link to={`/${Resource.Groups.toLowerCase()}/detail/${g.uuid}`}>{g.name}</Link>
                                  {i !== (secret.groups?.length ?? 0) - 1 ? ', ' : ''}
                              </Fragment>
                          ))
                        : 'Unassigned',
                    <div key="groups-actions" className="flex">
                        <Button
                            variant="transparent"
                            color="secondary"
                            onClick={() => {
                                setSelectedGroups(
                                    (secret?.groups ?? []).map((g) => ({
                                        value: g.uuid,
                                        label: g.name,
                                    })),
                                );
                                setIsUpdateGroupsOpen(true);
                            }}
                            title="Update Groups"
                        >
                            <EditIcon size={16} />
                        </Button>
                    </div>,
                ],
            },
            {
                id: 'sourceVaultProfile',
                columns: [
                    'Source Vault profile',
                    sourceVaultProfileCell,
                    <div key="source-vault-profile-actions" className="flex">
                        <Button
                            variant="transparent"
                            color="secondary"
                            onClick={() => {
                                setSelectedVaultProfileUuid(secret?.sourceVaultProfile?.uuid ?? '');
                                setIsUpdateVaultProfileOpen(true);
                            }}
                            title="Update Source Vault Profile"
                        >
                            <EditIcon size={16} />
                        </Button>
                    </div>,
                ],
            },
        ];
    }, [secret, vaultProfiles]);

    if (isFetchingDetail) {
        return <DetailPageSkeleton layout="tabs" tabCount={5} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.Secrets)} Inventory`, href: `/${Resource.Secrets.toLowerCase()}` },
                    { label: secret?.name || 'Secret Details', href: '' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.SecretDetailsWidget} busy={isFetchingDetail || isDeleting || isUpdating} noBorder>
                <div className="space-y-4">
                    <TabLayout
                        tabs={[
                            {
                                title: 'Details',
                                content: (
                                    <div className="space-y-4">
                                        <Widget
                                            title="Secret Details"
                                            busy={isFetchingDetail || isDeleting || isUpdating}
                                            widgetButtons={widgetButtons}
                                            titleSize="large"
                                            refreshAction={getFreshSecretDetails}
                                            lockSize="large"
                                        >
                                            <CustomTable headers={detailHeaders} data={detailData} />
                                        </Widget>

                                        {secret && (
                                            <Container className="grid gap-6 xl:grid-cols-2 items-start">
                                                <Widget
                                                    title="Sync Vault Profiles"
                                                    titleSize="large"
                                                    refreshAction={getFreshSecretDetails}
                                                    widgetLockName={LockWidgetNameEnum.ListOfVaults}
                                                    lockSize="large"
                                                    widgetButtons={syncVaultProfilesButtons}
                                                >
                                                    <CustomTable headers={syncVaultProfilesHeaders} data={syncVaultProfilesData} />
                                                </Widget>

                                                <Widget title="Other Properties" titleSize="large">
                                                    <CustomTable headers={otherPropertiesHeaders} data={otherPropertiesData} />
                                                </Widget>
                                            </Container>
                                        )}
                                    </div>
                                ),
                            },
                            {
                                title: 'Attributes',
                                content: (
                                    <div className="space-y-4">
                                        <Widget title="Metadata" titleSize="large">
                                            <AttributeViewer viewerType={ATTRIBUTE_VIEWER_TYPE.METADATA} metadata={secret?.metadata} />
                                        </Widget>

                                        {secret?.attributes && secret.attributes.length > 0 && (
                                            <AttributeViewer attributes={secret.attributes} />
                                        )}

                                        {secret && (
                                            <CustomAttributeWidget
                                                resource={Resource.Secrets}
                                                resourceUuid={secret.uuid}
                                                attributes={secret.customAttributes}
                                                noBorder
                                            />
                                        )}
                                    </div>
                                ),
                            },
                            {
                                title: 'Versions',
                                content: <CustomTable headers={versionsHeaders} data={versionsData} />,
                            },
                            {
                                title: 'Approvals',
                                content: (
                                    <Widget
                                        title="Secret Approvals"
                                        titleSize="large"
                                        busy={isFetchingApprovals}
                                        refreshAction={getFreshSecretApprovals}
                                    >
                                        <CustomTable headers={approvalsHeaders} data={approvalsData} />
                                    </Widget>
                                ),
                            },
                            {
                                title: 'Validation',
                                content: (
                                    <>
                                        {secret?.uuid && (
                                            <ComplianceCheckResultWidget
                                                resource={Resource.Secrets}
                                                widgetLockName={LockWidgetNameEnum.SecretDetailsWidget}
                                                objectUuid={secret.uuid}
                                                setSelectedAttributesInfo={handleSelectedAttributesInfo}
                                            />
                                        )}
                                    </>
                                ),
                            },
                        ]}
                    />
                </div>
            </Widget>

            <Dialog
                isOpen={isEditSecretOpen}
                caption={`Edit "${secret?.name}"`}
                size="xl"
                toggle={() => setIsEditSecretOpen(false)}
                body={
                    secret && (
                        <SecretForm
                            initialSecret={secret}
                            onCancel={() => setIsEditSecretOpen(false)}
                            onSuccess={() => {
                                setIsEditSecretOpen(false);
                                getFreshSecretDetails();
                            }}
                        />
                    )
                }
            />

            <Dialog
                isOpen={confirmEnable}
                caption="Enable Secret"
                body="You are about to enable a Secret. Is this what you want to do?"
                toggle={() => setConfirmEnable(false)}
                icon="check"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmEnable(false), body: 'Cancel' },
                    { color: 'primary', onClick: onEnableConfirmed, body: 'Enable' },
                ]}
            />

            <Dialog
                isOpen={confirmDisable}
                caption="Disable Secret"
                body="You are about to disable a Secret. Is this what you want to do?"
                toggle={() => setConfirmDisable(false)}
                icon="warning"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDisable(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDisableConfirmed, body: 'Disable' },
                ]}
            />

            <Dialog
                isOpen={confirmDelete}
                caption="Delete Secret"
                body="You are about to delete a Secret. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                ]}
            />

            <Dialog
                isOpen={complianceCheck}
                caption="Initiate Compliance Check"
                body="Initiate the compliance check for this Secret?"
                toggle={() => setComplianceCheck(false)}
                noBorder
                buttons={[
                    { color: 'primary', variant: 'outline', onClick: () => setComplianceCheck(false), body: 'Cancel' },
                    { color: 'primary', onClick: onComplianceCheck, body: 'Yes' },
                ]}
            />

            <Dialog
                isOpen={isUpdateOwnerOpen}
                caption="Update Secret Owner"
                body={
                    <>
                        <Select
                            id="secret-owner-detail"
                            label="Owner"
                            placeholder="Select owner"
                            options={userOptions}
                            value={ownerUuid || ''}
                            onChange={(value) => setOwnerUuid(value as string)}
                        />
                        <Container className="flex-row justify-end modal-footer mt-4" gap={4}>
                            <Button variant="outline" onClick={() => setIsUpdateOwnerOpen(false)} type="button">
                                Cancel
                            </Button>
                            <Button color="danger" onClick={handleRemoveOwner} type="button">
                                Remove
                            </Button>
                            <Button color="primary" onClick={handleUpdateOwner} type="button" disabled={!ownerUuid}>
                                Update
                            </Button>
                        </Container>
                    </>
                }
                toggle={() => setIsUpdateOwnerOpen(false)}
                size="md"
                buttons={[]}
            />

            <Dialog
                isOpen={isUpdateGroupsOpen}
                caption="Update Secret Groups"
                body={
                    <>
                        <Select
                            id="secret-groups-detail"
                            label="Groups"
                            placeholder="Select groups"
                            options={groupOptions}
                            value={selectedGroups}
                            onChange={(value) => setSelectedGroups((value as { value: string; label: string }[]) || [])}
                            isMulti
                        />
                        <Container className="flex-row justify-end modal-footer mt-4" gap={4}>
                            <Button variant="outline" onClick={() => setIsUpdateGroupsOpen(false)} type="button">
                                Cancel
                            </Button>
                            <Button color="danger" onClick={handleClearGroups} type="button">
                                Clear
                            </Button>
                            <Button color="primary" onClick={handleUpdateGroups} type="button" disabled={selectedGroups.length === 0}>
                                Update
                            </Button>
                        </Container>
                    </>
                }
                toggle={() => setIsUpdateGroupsOpen(false)}
                size="md"
                buttons={[]}
            />

            <Dialog
                isOpen={isUpdateVaultProfileOpen}
                caption="Update Source Vault Profile"
                body={
                    <>
                        <Select
                            id="secret-vault-profile-detail"
                            label="Source Vault Profile"
                            placeholder="Select vault profile"
                            options={vaultProfileOptions}
                            value={selectedVaultProfileUuid || ''}
                            onChange={(value) => setSelectedVaultProfileUuid(value as string)}
                        />
                        <Container className="flex-row justify-end modal-footer mt-4" gap={4}>
                            <Button variant="outline" onClick={() => setIsUpdateVaultProfileOpen(false)} type="button">
                                Cancel
                            </Button>
                            <Button color="primary" onClick={handleUpdateVaultProfile} type="button" disabled={!selectedVaultProfileUuid}>
                                Update
                            </Button>
                        </Container>
                    </>
                }
                toggle={() => setIsUpdateVaultProfileOpen(false)}
                size="md"
                buttons={[]}
            />

            {secret && (
                <Dialog
                    isOpen={isAddSyncVaultProfileOpen}
                    caption="Add Sync Vault Profile"
                    body={<SyncVaultProfileDialog secret={secret} onClose={() => setIsAddSyncVaultProfileOpen(false)} />}
                    toggle={() => setIsAddSyncVaultProfileOpen(false)}
                    size="md"
                    buttons={[]}
                />
            )}

            <Dialog
                isOpen={isSyncVaultProfileAttributesOpen}
                caption={`Sync Vault Profile Attributes: ${selectedSyncVaultProfile?.name ?? ''}`}
                body={<AttributeViewer attributes={selectedSyncVaultProfile?.secretAttributes} />}
                toggle={() => setIsSyncVaultProfileAttributesOpen(false)}
                size="xl"
                buttons={[
                    {
                        color: 'secondary',
                        variant: 'outline',
                        onClick: () => setIsSyncVaultProfileAttributesOpen(false),
                        body: 'Close',
                    },
                ]}
            />

            <Dialog
                isOpen={!!selectedAttributesInfo}
                caption="Attributes Info"
                body={<AttributeViewer attributes={selectedAttributesInfo ?? []} />}
                toggle={() => setSelectedAttributesInfo(null)}
                buttons={[]}
                size="xl"
            />

            <Dialog
                isOpen={isShowContentOpen}
                caption={`Secret Content: ${secret?.name ?? ''}`}
                body={<SecretContentDialog content={secretContent} isFetching={isFetchingContent} />}
                toggle={() => {
                    setIsShowContentOpen(false);
                    dispatch(secretsActions.clearSecretContent());
                }}
                size="xl"
                buttons={[
                    {
                        color: 'secondary',
                        variant: 'outline',
                        onClick: () => {
                            setIsShowContentOpen(false);
                            dispatch(secretsActions.clearSecretContent());
                        },
                        body: 'Close',
                    },
                ]}
            />
        </div>
    );
}

export default SecretDetail;
