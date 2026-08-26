import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';

import type { TableDataRow, TableHeader } from 'components/CustomTable';
import Badge from 'components/Badge';
import PagedList from 'components/PagedList/PagedList';
import Dialog from 'components/Dialog';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import Select from 'components/Select';
import { EnumColumnDescription } from 'components/EnumDescription';

import type { ApiClients } from '../../../../api';
import { actions, selectors } from 'ducks/secrets';
import { EntityType } from 'ducks/filters';
import { selectors as pagingSelectors } from 'ducks/paging';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as userActions, selectors as userSelectors } from 'ducks/users';
import { actions as groupActions, selectors as groupSelectors } from 'ducks/certificateGroups';
import { actions as vaultProfileActions, selectors as vaultProfileSelectors } from 'ducks/vault-profiles';

import type { SearchRequestModel } from 'types/certificate';
import { LockWidgetNameEnum } from 'types/user-interface';
import { ComplianceStatus, PlatformEnum, Resource } from 'types/openapi';

import SecretForm from '../form';
import SecretStateBadge from '../SecretStateBadge';
import CertificateStatus from 'components/_pages/certificates/CertificateStatus';

export default function SecretsList() {
    const dispatch = useDispatch();

    const secrets = useSelector(selectors.secrets);
    const checkedRows = useSelector(pagingSelectors.checkedRows(EntityType.SECRET));

    const isFetchingList = useSelector(selectors.isFetchingList);
    const isDeleting = useSelector(selectors.isDeleting);
    const isUpdating = useSelector(selectors.isUpdating);

    const isBusy = isFetchingList || isDeleting || isUpdating;

    const secretTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.SecretType));
    const secretStateEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.SecretState));

    const users = useSelector(userSelectors.users);
    const groups = useSelector(groupSelectors.certificateGroups);
    const vaultProfiles = useSelector(vaultProfileSelectors.vaultProfiles);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isUpdateOwnerOpen, setIsUpdateOwnerOpen] = useState(false);
    const [isUpdateGroupsOpen, setIsUpdateGroupsOpen] = useState(false);
    const [isUpdateVaultProfileOpen, setIsUpdateVaultProfileOpen] = useState(false);
    const [isEnableSecretsOpen, setIsEnableSecretsOpen] = useState(false);
    const [isDisableSecretsOpen, setIsDisableSecretsOpen] = useState(false);

    const [ownerUuid, setOwnerUuid] = useState<string>('');
    const [selectedGroups, setSelectedGroups] = useState<{ value: string; label: string }[]>([]);
    const [selectedVaultProfileUuid, setSelectedVaultProfileUuid] = useState<string>('');

    useEffect(() => {
        dispatch(userActions.list());
        dispatch(groupActions.listGroups());
        dispatch(vaultProfileActions.listVaultProfiles());
    }, [dispatch]);

    const headers: TableHeader[] = useMemo(
        () => [
            {
                id: 'name',
                content: 'Name',
                width: '25%',
                sortable: true,
            },
            {
                id: 'type',
                content: 'Type',
                info: <EnumColumnDescription platformEnum={PlatformEnum.SecretType} title="Type" />,
                width: '10%',
                sortable: true,
            },
            {
                id: 'state',
                content: 'State',
                info: <EnumColumnDescription platformEnum={PlatformEnum.SecretState} title="State" />,
                width: '10%',
                align: 'center',
                sortable: true,
            },
            {
                id: 'compliance',
                content: 'Compliance',
                width: '10%',
                align: 'center',
                sortable: false,
            },
            {
                id: 'vaultProfile',
                content: 'Vault Profile',
                width: '15%',
                sortable: true,
            },
            {
                id: 'version',
                content: 'Version',
                width: '5%',
                align: 'center',
                sortable: true,
            },
            {
                id: 'owner',
                content: 'Owner',
                width: '15%',
                sortable: true,
            },
            {
                id: 'groups',
                content: 'Groups',
                width: '15%',
                sortable: true,
            },
            {
                id: 'status',
                content: 'Status',
                width: '5%',
                align: 'center',
                sortable: true,
            },
        ],
        [],
    );

    const rows: TableDataRow[] = useMemo(
        () =>
            secrets.map((secret) => ({
                id: secret.uuid,
                columns: [
                    <span key="name" style={{ whiteSpace: 'nowrap' }}>
                        <Link to={`./detail/${secret.uuid}`}>{secret.name}</Link>
                    </span>,
                    getEnumLabel(secretTypeEnum, secret.type),
                    <SecretStateBadge key="state" state={secret.state}>
                        {getEnumLabel(secretStateEnum, secret.state)}
                    </SecretStateBadge>,
                    <CertificateStatus key="compliance" status={secret.complianceStatus || ComplianceStatus.Na} asIcon={true} />,
                    secret.sourceVaultProfile
                        ? (() => {
                              const profile = vaultProfiles.find((p) => p.uuid === secret.sourceVaultProfile?.uuid);
                              const vaultUuid = profile?.vaultInstance?.uuid;
                              return vaultUuid ? (
                                  <Link
                                      to={`/${Resource.VaultProfiles.toLowerCase()}/detail/${vaultUuid}/${secret.sourceVaultProfile.uuid}`}
                                  >
                                      {secret.sourceVaultProfile.name}
                                  </Link>
                              ) : (
                                  secret.sourceVaultProfile.name
                              );
                          })()
                        : '',
                    secret.version ? secret.version.toString() : '',
                    secret.owner ? <Link to={`../users/detail/${secret.owner.uuid}`}>{secret.owner.name}</Link> : 'Unassigned',
                    secret.groups && secret.groups.length > 0
                        ? secret.groups.map((group, i) => (
                              <Fragment key={group.uuid}>
                                  <Link to={`../groups/detail/${group.uuid}`}>{group.name}</Link>
                                  {secret.groups && i !== secret.groups.length - 1 ? ', ' : ''}
                              </Fragment>
                          ))
                        : 'Unassigned',
                    <Badge key="status" color={secret.enabled ? 'success' : 'danger'}>
                        {secret.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>,
                ],
            })),
        [secrets, secretTypeEnum, secretStateEnum, vaultProfiles],
    );

    const onListCallback = useCallback((filters: SearchRequestModel) => dispatch(actions.listSecrets(filters)), [dispatch]);

    const handleEnableSecrets = useCallback(() => {
        checkedRows.forEach((uuid) => dispatch(actions.enableSecret({ uuid: String(uuid) })));
        setIsEnableSecretsOpen(false);
    }, [dispatch, checkedRows]);

    const handleDisableSecrets = useCallback(() => {
        checkedRows.forEach((uuid) => dispatch(actions.disableSecret({ uuid: String(uuid) })));
        setIsDisableSecretsOpen(false);
    }, [dispatch, checkedRows]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: false,
                tooltip: 'Create Secret',
                onClick: () => setIsAddOpen(true),
            },
            {
                icon: 'check',
                disabled: checkedRows.length === 0,
                tooltip: 'Enable selected Secrets',
                onClick: () => setIsEnableSecretsOpen(true),
            },
            {
                icon: 'times',
                disabled: checkedRows.length === 0,
                tooltip: 'Disable selected Secrets',
                onClick: () => setIsDisableSecretsOpen(true),
            },
            {
                icon: 'user-check',
                disabled: checkedRows.length === 0,
                tooltip: 'Override Owner',
                onClick: () => setIsUpdateOwnerOpen(true),
            },
            {
                icon: 'group',
                disabled: checkedRows.length === 0,
                tooltip: 'Override Groups',
                onClick: () => setIsUpdateGroupsOpen(true),
            },
            {
                icon: 'shield-check',
                disabled: checkedRows.length === 0,
                tooltip: 'Override Source Vault Profile',
                onClick: () => setIsUpdateVaultProfileOpen(true),
            },
        ],
        [checkedRows, setIsUpdateGroupsOpen, setIsUpdateOwnerOpen, setIsUpdateVaultProfileOpen],
    );

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
            groups.map((group) => ({
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

    const handleDeleteSecrets = useCallback(
        (uuids: (string | number)[]) => {
            uuids.forEach((uuid) => dispatch(actions.deleteSecret({ uuid: String(uuid) })));
        },
        [dispatch],
    );

    const handleUpdateOwner = useCallback(() => {
        if (!ownerUuid) return;
        checkedRows.forEach((uuid) => dispatch(actions.updateSecretObjects({ uuid: String(uuid), update: { ownerUuid } })));
        setIsUpdateOwnerOpen(false);
        setOwnerUuid('');
    }, [dispatch, checkedRows, ownerUuid]);

    const handleRemoveOwner = useCallback(() => {
        checkedRows.forEach((uuid) => dispatch(actions.updateSecretObjects({ uuid: String(uuid), update: { ownerUuid: '' } })));
        setIsUpdateOwnerOpen(false);
        setOwnerUuid('');
    }, [dispatch, checkedRows]);

    const handleUpdateGroups = useCallback(() => {
        const groupUuids = selectedGroups.map((g) => g.value);
        checkedRows.forEach((uuid) => dispatch(actions.updateSecretObjects({ uuid: String(uuid), update: { groupUuids } })));
        setIsUpdateGroupsOpen(false);
        setSelectedGroups([]);
    }, [dispatch, checkedRows, selectedGroups]);

    const handleClearGroups = useCallback(() => {
        checkedRows.forEach((uuid) => dispatch(actions.updateSecretObjects({ uuid: String(uuid), update: { groupUuids: [] } })));
        setIsUpdateGroupsOpen(false);
        setSelectedGroups([]);
    }, [dispatch, checkedRows]);

    const handleUpdateVaultProfile = useCallback(() => {
        if (!selectedVaultProfileUuid) return;
        checkedRows.forEach((uuid) =>
            dispatch(
                actions.updateSecretObjects({
                    uuid: String(uuid),
                    update: { sourceVaultProfileUuid: selectedVaultProfileUuid },
                }),
            ),
        );
        setIsUpdateVaultProfileOpen(false);
        setSelectedVaultProfileUuid('');
    }, [dispatch, checkedRows, selectedVaultProfileUuid]);

    return (
        <>
            <PagedList
                entity={EntityType.SECRET}
                onListCallback={onListCallback}
                onDeleteCallback={handleDeleteSecrets}
                headers={headers}
                data={rows}
                isBusy={isBusy}
                title="List of Secrets"
                entityNameSingular="Secret"
                entityNamePlural="Secrets"
                filterTitle="Secrets Inventory Filter"
                pageWidgetLockName={LockWidgetNameEnum.ListOfSecrets}
                getAvailableFiltersApi={useCallback((apiClients: ApiClients) => apiClients.secrets.getSecretSearchableFields(), [])}
                additionalButtons={buttons}
                addHidden
            />

            <Dialog
                isOpen={isAddOpen}
                caption="Create Secret"
                size="xl"
                toggle={() => setIsAddOpen(false)}
                body={<SecretForm onCancel={() => setIsAddOpen(false)} onSuccess={() => setIsAddOpen(false)} />}
            />

            <Dialog
                isOpen={isUpdateOwnerOpen}
                caption="Override Secret Owner"
                body={
                    <Select
                        id="secret-owner"
                        label="Owner"
                        placeholder="Select owner"
                        options={userOptions}
                        value={ownerUuid || ''}
                        onChange={(value) => setOwnerUuid(value as string)}
                    />
                }
                toggle={() => setIsUpdateOwnerOpen(false)}
                size="md"
                buttons={[
                    {
                        key: 'cancel',
                        color: 'secondary',
                        variant: 'outline',
                        body: 'Cancel',
                        onClick: () => setIsUpdateOwnerOpen(false),
                    },
                    {
                        key: 'remove',
                        color: 'danger',
                        body: 'Remove',
                        onClick: handleRemoveOwner,
                    },
                    {
                        key: 'update',
                        color: 'primary',
                        body: 'Update',
                        disabled: !ownerUuid,
                        onClick: handleUpdateOwner,
                    },
                ]}
            />

            <Dialog
                isOpen={isEnableSecretsOpen}
                caption={`Enable ${checkedRows.length === 1 ? 'Secret' : 'Secrets'}`}
                icon="check"
                body={`You are about to enable the selected ${checkedRows.length === 1 ? 'Secret' : 'Secrets'}. Is this what you want to do?`}
                toggle={() => setIsEnableSecretsOpen(false)}
                size="md"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setIsEnableSecretsOpen(false), body: 'Cancel' },
                    { color: 'primary', onClick: handleEnableSecrets, body: 'Enable' },
                ]}
            />

            <Dialog
                isOpen={isDisableSecretsOpen}
                caption={`Disable ${checkedRows.length === 1 ? 'Secret' : 'Secrets'}`}
                icon="warning"
                body={`You are about to disable the selected ${checkedRows.length === 1 ? 'Secret' : 'Secrets'}. Is this what you want to do?`}
                toggle={() => setIsDisableSecretsOpen(false)}
                size="md"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setIsDisableSecretsOpen(false), body: 'Cancel' },
                    { color: 'danger', onClick: handleDisableSecrets, body: 'Disable' },
                ]}
            />

            <Dialog
                isOpen={isUpdateGroupsOpen}
                caption="Override Secret Groups"
                body={
                    <Select
                        id="secret-groups-update"
                        label="Groups"
                        placeholder="Select groups"
                        options={groupOptions}
                        value={selectedGroups}
                        onChange={(value) => setSelectedGroups((value as { value: string; label: string }[]) || [])}
                        isMulti
                    />
                }
                toggle={() => setIsUpdateGroupsOpen(false)}
                size="md"
                buttons={[
                    {
                        key: 'cancel',
                        color: 'secondary',
                        variant: 'outline',
                        body: 'Cancel',
                        onClick: () => setIsUpdateGroupsOpen(false),
                    },
                    {
                        key: 'clear',
                        color: 'danger',
                        body: 'Clear',
                        onClick: handleClearGroups,
                    },
                    {
                        key: 'update',
                        color: 'primary',
                        body: 'Update',
                        disabled: selectedGroups.length === 0,
                        onClick: handleUpdateGroups,
                    },
                ]}
            />

            <Dialog
                isOpen={isUpdateVaultProfileOpen}
                caption="Override Source Vault Profile"
                body={
                    <Select
                        id="secret-vault-profile"
                        label="Source Vault Profile"
                        placeholder="Select vault profile"
                        options={vaultProfileOptions}
                        value={selectedVaultProfileUuid || ''}
                        onChange={(value) => setSelectedVaultProfileUuid(value as string)}
                    />
                }
                toggle={() => setIsUpdateVaultProfileOpen(false)}
                size="md"
                buttons={[
                    {
                        key: 'cancel',
                        color: 'secondary',
                        variant: 'outline',
                        body: 'Cancel',
                        onClick: () => setIsUpdateVaultProfileOpen(false),
                    },
                    {
                        key: 'update',
                        color: 'primary',
                        body: 'Update',
                        disabled: !selectedVaultProfileUuid,
                        onClick: handleUpdateVaultProfile,
                    },
                ]}
            />
        </>
    );
}
