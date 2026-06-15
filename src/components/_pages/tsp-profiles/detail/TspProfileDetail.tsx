import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router';

import Breadcrumb from 'components/Breadcrumb';
import Container from 'components/Container';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import Badge from 'components/Badge';
import StatusBadge from 'components/StatusBadge';
import Widget from 'components/Widget';
import WidgetButtons, { type WidgetButtonProps } from 'components/WidgetButtons';
import CustomAttributeWidget from 'components/Attributes/CustomAttributeWidget';

import { actions, selectors } from 'ducks/tsp-profiles';
import { actions as basicCredentialActions, selectors as basicCredentialSelectors } from 'ducks/tsp-profile-basic-credentials';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { PlatformEnum, Resource, TspAuthenticationMethod, type TspBasicCredentialDto } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { createWidgetDetailHeaders } from 'utils/widget';
import TspBasicCredentialDialog from './TspBasicCredentialDialog';

export const TspProfileDetail = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { id } = useParams();

    const tspProfile = useSelector(selectors.tspProfile);
    const isFetchingDetail = useSelector(selectors.isFetchingDetail);
    const isDeleting = useSelector(selectors.isDeleting);
    const isEnabling = useSelector(selectors.isEnabling);
    const isDisabling = useSelector(selectors.isDisabling);
    const deleteErrorMessage = useSelector(selectors.deleteErrorMessage);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const authenticationMethodEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.TspAuthenticationMethod));

    const basicCredentials = useSelector(basicCredentialSelectors.credentials);
    const isFetchingCredentials = useSelector(basicCredentialSelectors.isFetchingList);
    const isDeletingCredential = useSelector(basicCredentialSelectors.isDeleting);
    const credentialDeleteErrorMessage = useSelector(basicCredentialSelectors.deleteErrorMessage);

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [credentialDialogOpen, setCredentialDialogOpen] = useState<boolean>(false);
    const [editCredential, setEditCredential] = useState<TspBasicCredentialDto | undefined>(undefined);
    const [confirmDeleteCredentialUuid, setConfirmDeleteCredentialUuid] = useState<string>('');

    const isBusy = useMemo(
        () => isFetchingDetail || isDeleting || isEnabling || isDisabling,
        [isFetchingDetail, isDeleting, isEnabling, isDisabling],
    );

    const getFreshData = useCallback(() => {
        if (!id) return;
        dispatch(actions.getTspProfile({ uuid: id }));
    }, [dispatch, id]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    useEffect(() => {
        if (!id) return;
        dispatch(basicCredentialActions.listBasicCredentials({ tspProfileUuid: id }));
        return () => {
            dispatch(basicCredentialActions.resetState());
        };
    }, [dispatch, id]);

    const onEditClick = useCallback(() => {
        if (!tspProfile) return;
        navigate(`../${Resource.TspProfiles.toLowerCase()}/edit/${tspProfile.uuid}`);
    }, [tspProfile, navigate]);

    const onEnableClick = useCallback(() => {
        if (!tspProfile) return;
        dispatch(actions.enableTspProfile({ uuid: tspProfile.uuid }));
    }, [tspProfile, dispatch]);

    const onDisableClick = useCallback(() => {
        if (!tspProfile) return;
        dispatch(actions.disableTspProfile({ uuid: tspProfile.uuid }));
    }, [tspProfile, dispatch]);

    const onDeleteConfirmed = useCallback(() => {
        if (!tspProfile) return;
        dispatch(actions.deleteTspProfile({ uuid: tspProfile.uuid }));
        setConfirmDelete(false);
    }, [tspProfile, dispatch]);

    const openCreateCredentialDialog = useCallback(() => {
        setEditCredential(undefined);
        setCredentialDialogOpen(true);
    }, []);

    const closeCredentialDialog = useCallback(() => {
        setCredentialDialogOpen(false);
        setEditCredential(undefined);
    }, []);

    const onDeleteCredentialConfirmed = useCallback(() => {
        if (!id || !confirmDeleteCredentialUuid) return;
        dispatch(basicCredentialActions.deleteBasicCredential({ tspProfileUuid: id, uuid: confirmDeleteCredentialUuid }));
        setConfirmDeleteCredentialUuid('');
    }, [dispatch, id, confirmDeleteCredentialUuid]);

    const buttons: WidgetButtonProps[] = useMemo(
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
                disabled: tspProfile?.enabled ?? true,
                tooltip: 'Enable',
                onClick: onEnableClick,
            },
            {
                id: 'disable',
                icon: 'times',
                disabled: !(tspProfile?.enabled ?? false),
                tooltip: 'Disable',
                onClick: onDisableClick,
            },
        ],
        [tspProfile, onEditClick, onEnableClick, onDisableClick],
    );

    const tableHeader: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(
        () =>
            !tspProfile
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', tspProfile.uuid],
                      },
                      {
                          id: 'name',
                          columns: ['Name', tspProfile.name],
                      },
                      {
                          id: 'description',
                          columns: ['Description', tspProfile.description || ''],
                      },
                      {
                          id: 'status',
                          columns: ['Status', <StatusBadge key="status" enabled={tspProfile.enabled} />],
                      },
                      {
                          id: 'signingUrl',
                          columns: ['TSP Signing URL', tspProfile.signingUrl ? tspProfile.signingUrl : '-'],
                      },
                  ],
        [tspProfile],
    );

    const signingProfileData: TableDataRow[] = useMemo(
        () =>
            !tspProfile?.defaultSigningProfile
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', tspProfile.defaultSigningProfile.uuid],
                      },
                      {
                          id: 'name',
                          columns: [
                              'Name',
                              <Link
                                  key="signing-profile"
                                  to={`../../${Resource.SigningProfiles.toLowerCase()}/detail/${tspProfile.defaultSigningProfile.uuid}`}
                              >
                                  {tspProfile.defaultSigningProfile.name}
                              </Link>,
                          ],
                      },
                      {
                          id: 'status',
                          columns: ['Status', <StatusBadge key="status" enabled={tspProfile.defaultSigningProfile.enabled} />],
                      },
                  ],
        [tspProfile],
    );

    const signingProfileTitle = useMemo(
        () => (signingProfileData.length > 0 ? 'Default Signing Profile' : 'Default Signing Profile not assigned'),
        [signingProfileData],
    );

    const authenticationData: TableDataRow[] = useMemo(
        () =>
            !tspProfile
                ? []
                : [
                      {
                          id: 'allowedMethods',
                          columns: [
                              'Allowed Methods',
                              <div key="methods" className="flex flex-wrap gap-1">
                                  {(tspProfile.allowedAuthenticationMethods ?? []).map((method) => (
                                      <Badge key={method}>{getEnumLabel(authenticationMethodEnum, method)}</Badge>
                                  ))}
                              </div>,
                          ],
                      },
                      {
                          id: 'vaultProfile',
                          columns: [
                              'Vault Profile',
                              tspProfile.vaultProfile ? (
                                  <Link
                                      key="vaultProfile"
                                      to={`/${Resource.VaultProfiles.toLowerCase()}/detail/${tspProfile.vaultProfile.vaultInstance.uuid}/${tspProfile.vaultProfile.uuid}`}
                                  >
                                      {tspProfile.vaultProfile.name}
                                  </Link>
                              ) : (
                                  '-'
                              ),
                          ],
                      },
                  ],
        [tspProfile, authenticationMethodEnum],
    );

    const basicPasswordAllowed = useMemo(
        () => (tspProfile?.allowedAuthenticationMethods ?? []).includes(TspAuthenticationMethod.BasicPassword),
        [tspProfile],
    );

    const showCredentialsWidget = basicPasswordAllowed || basicCredentials.length > 0;

    const credentialHeaders: TableHeader[] = useMemo(
        () => [
            { id: 'username', content: 'Username' },
            { id: 'mappedUser', content: 'Mapped User' },
            { id: 'actions', content: 'Actions' },
        ],
        [],
    );

    const credentialData: TableDataRow[] = useMemo(
        () =>
            basicCredentials.map((credential) => ({
                id: credential.uuid,
                columns: [
                    credential.username,
                    <Link key="mappedUser" to={`/${Resource.Users.toLowerCase()}/detail/${credential.mappedUser.uuid}`}>
                        {credential.mappedUser.name}
                    </Link>,
                    <WidgetButtons
                        key="actions"
                        buttons={[
                            {
                                id: 'editCredential',
                                icon: 'pencil',
                                disabled: isDeletingCredential,
                                tooltip: 'Edit',
                                onClick: () => {
                                    setEditCredential(credential);
                                    setCredentialDialogOpen(true);
                                },
                            },
                            {
                                id: 'deleteCredential',
                                icon: 'trash',
                                disabled: isDeletingCredential,
                                tooltip: 'Delete',
                                onClick: () => setConfirmDeleteCredentialUuid(credential.uuid),
                            },
                        ]}
                    />,
                ],
            })),
        [basicCredentials, isDeletingCredential],
    );

    const credentialWidgetButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                id: 'addCredential',
                icon: 'plus',
                disabled: !basicPasswordAllowed,
                tooltip: 'Add Basic Credential',
                onClick: openCreateCredentialDialog,
            },
        ],
        [openCreateCredentialDialog, basicPasswordAllowed],
    );

    return (
        <div>
            <Breadcrumb
                items={[
                    {
                        label: `${getEnumLabel(resourceEnum, Resource.TspProfiles)} Inventory`,
                        href: `/${Resource.TspProfiles.toLowerCase()}`,
                    },
                    { label: tspProfile?.name || 'TSP Profile Details', href: '' },
                ]}
            />

            <Widget widgetLockName={LockWidgetNameEnum.TspProfileDetails} busy={isBusy} noBorder>
                <Container>
                    <Container className="md:grid grid-cols-2 items-start">
                        <Widget title="TSP Profile Details" widgetButtons={buttons} titleSize="large" refreshAction={getFreshData}>
                            <CustomTable headers={tableHeader} data={detailData} />
                        </Widget>

                        {tspProfile && (
                            <CustomAttributeWidget
                                resource={Resource.TspProfiles}
                                resourceUuid={tspProfile.uuid}
                                attributes={tspProfile.customAttributes}
                            />
                        )}
                    </Container>

                    <Widget title={signingProfileTitle} titleSize="large">
                        {signingProfileData.length > 0 && <CustomTable headers={tableHeader} data={signingProfileData} />}
                    </Widget>

                    <Widget title="Authentication" titleSize="large" busy={isFetchingDetail}>
                        <CustomTable headers={tableHeader} data={authenticationData} />
                    </Widget>

                    {showCredentialsWidget && (
                        <Widget
                            title="Basic Credentials"
                            titleSize="large"
                            busy={isFetchingCredentials || isDeletingCredential}
                            widgetButtons={credentialWidgetButtons}
                        >
                            {!basicPasswordAllowed && basicCredentials.length > 0 && (
                                <p className="mb-2 text-sm text-[var(--status-warning-color)]">
                                    Basic authentication is not enabled for this profile — these credentials are not accepted until Basic
                                    password is re-allowed.
                                </p>
                            )}
                            {basicCredentials.length === 0 ? (
                                <p className="text-sm text-gray-500">No Basic credentials configured yet.</p>
                            ) : (
                                <CustomTable headers={credentialHeaders} data={credentialData} />
                            )}
                        </Widget>
                    )}
                </Container>
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption="Delete TSP Profile"
                body="You are about to delete this TSP Profile. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={deleteErrorMessage.length > 0}
                caption="Delete TSP Profile"
                body={
                    <>
                        Failed to delete the TSP Profile. Please find the details below:
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
                isOpen={credentialDialogOpen}
                caption={editCredential ? 'Edit Basic Credential' : 'Add Basic Credential'}
                toggle={closeCredentialDialog}
                body={
                    credentialDialogOpen && tspProfile ? (
                        <TspBasicCredentialDialog
                            key={editCredential?.uuid ?? 'create'}
                            tspProfileUuid={tspProfile.uuid}
                            credential={editCredential}
                            onClose={closeCredentialDialog}
                        />
                    ) : null
                }
                buttons={[]}
            />

            <Dialog
                isOpen={confirmDeleteCredentialUuid !== ''}
                caption="Delete Basic Credential"
                body="You are about to delete this Basic credential. Its password will be removed from the Vault. Is this what you want to do?"
                toggle={() => setConfirmDeleteCredentialUuid('')}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteCredentialConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDeleteCredentialUuid(''), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={credentialDeleteErrorMessage.length > 0}
                caption="Delete Basic Credential"
                body={
                    <>
                        Failed to delete the Basic credential. Please find the details below:
                        <br />
                        <br />
                        {credentialDeleteErrorMessage}
                    </>
                }
                toggle={() => dispatch(basicCredentialActions.clearDeleteErrorMessage())}
                buttons={[
                    {
                        color: 'secondary',
                        variant: 'outline',
                        onClick: () => dispatch(basicCredentialActions.clearDeleteErrorMessage()),
                        body: 'Close',
                    },
                ]}
            />
        </div>
    );
};
