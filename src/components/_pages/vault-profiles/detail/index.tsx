import DetailPageSkeleton from 'components/DetailPageSkeleton';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';

import AttributeViewer from 'components/Attributes/AttributeViewer';
import CustomAttributeWidget from 'components/Attributes/CustomAttributeWidget';
import Badge from 'components/Badge';
import Breadcrumb from 'components/Breadcrumb';
import Container from 'components/Container';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import Widget from 'components/Widget';
import WidgetButtons from 'components/WidgetButtons';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { actions as approvalProfileActions, selectors as approvalProfileSelectors } from 'ducks/approval-profiles';
import { actions as complianceProfileActions, selectors as complianceProfileSelectors } from 'ducks/compliance-profiles';
import { actions as vaultProfileActions, selectors as vaultProfileSelectors } from 'ducks/vault-profiles';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';

import { LockWidgetNameEnum } from 'types/user-interface';
import { PlatformEnum, Resource } from 'types/openapi';
import { createWidgetDetailHeaders } from 'utils/widget';
import VaultProfileEditForm from '../edit-form';
import AssociateApprovalProfileDialogBody from '../AssociateApprovalProfileDialogBody';
import AssociateComplianceProfileDialogBody from '../AssociateComplianceProfileDialogBody';

function VaultProfileDetail() {
    const dispatch = useDispatch();

    const { vaultUuid, id: vaultProfileUuid } = useParams<{ vaultUuid: string; id: string }>();

    const profile = useSelector(vaultProfileSelectors.vaultProfile);
    const isFetchingDetail = useSelector(vaultProfileSelectors.isFetchingDetail);
    const isEnabling = useSelector(vaultProfileSelectors.isEnabling);
    const isDisabling = useSelector(vaultProfileSelectors.isDisabling);
    const isDeleting = useSelector(vaultProfileSelectors.isDeleting);
    const associatedApprovalProfiles = useSelector(approvalProfileSelectors.associatedApprovalProfiles);
    const isFetchingAssociatedApprovalProfiles = useSelector(approvalProfileSelectors.isFetchingAssociatedApprovalProfiles);
    const associatedComplianceProfiles = useSelector(complianceProfileSelectors.associatedComplianceProfiles);
    const isFetchingAssociatedComplianceProfiles = useSelector(complianceProfileSelectors.isFetchingAssociatedComplianceProfiles);

    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [associateApprovalProfile, setAssociateApprovalProfile] = useState(false);
    const [associateComplianceProfile, setAssociateComplianceProfile] = useState(false);
    const [complianceCheck, setComplianceCheck] = useState(false);

    const getFreshDetails = useCallback(() => {
        if (!vaultUuid || !vaultProfileUuid) return;
        dispatch(vaultProfileActions.resetState());
        dispatch(
            vaultProfileActions.getVaultProfileDetail({
                vaultUuid,
                vaultProfileUuid,
            }),
        );
    }, [dispatch, vaultUuid, vaultProfileUuid]);

    useEffect(() => {
        getFreshDetails();
    }, [getFreshDetails]);

    const getFreshAssociatedApprovalProfiles = useCallback(() => {
        if (!vaultProfileUuid) return;
        dispatch(
            approvalProfileActions.getAssociatedApprovalProfilesForResource({
                resource: Resource.VaultProfiles,
                associationObjectUuid: vaultProfileUuid,
            }),
        );
    }, [dispatch, vaultProfileUuid]);

    useEffect(() => {
        getFreshAssociatedApprovalProfiles();
    }, [getFreshAssociatedApprovalProfiles]);

    const getFreshComplianceDetails = useCallback(() => {
        if (!vaultProfileUuid) return;
        dispatch(
            complianceProfileActions.getAssociatedComplianceProfiles({
                resource: Resource.VaultProfiles,
                associationObjectUuid: vaultProfileUuid,
            }),
        );
    }, [dispatch, vaultProfileUuid]);

    useEffect(() => {
        getFreshComplianceDetails();
    }, [getFreshComplianceDetails]);

    const onApprove = useCallback(() => {
        if (!vaultUuid || !vaultProfileUuid) return;
        dispatch(
            vaultProfileActions.enableVaultProfile({
                vaultUuid,
                vaultProfileUuid,
            }),
        );
    }, [dispatch, vaultUuid, vaultProfileUuid]);

    const onDisapprove = useCallback(() => {
        if (!vaultUuid || !vaultProfileUuid) return;
        dispatch(
            vaultProfileActions.disableVaultProfile({
                vaultUuid,
                vaultProfileUuid,
            }),
        );
    }, [dispatch, vaultUuid, vaultProfileUuid]);

    const onDeleteConfirmed = useCallback(() => {
        if (!vaultUuid || !vaultProfileUuid) return;
        dispatch(
            vaultProfileActions.deleteVaultProfile({
                vaultUuid,
                vaultProfileUuid,
            }),
        );
        setConfirmDelete(false);
    }, [dispatch, vaultUuid, vaultProfileUuid]);

    const handleCloseEdit = useCallback(() => setIsEditOpen(false), []);

    const onComplianceCheck = useCallback(() => {
        if (!profile?.uuid) return;

        dispatch(
            complianceProfileActions.checkResourceObjectCompliance({
                resource: Resource.VaultProfiles,
                objectUuid: profile.uuid,
            }),
        );
        setComplianceCheck(false);
    }, [dispatch, profile]);

    const onDissociateComplianceProfile = useCallback(
        (uuid: string) => {
            if (!profile?.uuid) return;

            dispatch(
                complianceProfileActions.dissociateComplianceProfile({
                    uuid,
                    resource: Resource.VaultProfiles,
                    associationObjectUuid: profile.uuid,
                }),
            );
        },
        [dispatch, profile],
    );

    const onDissociateApprovalProfile = useCallback(
        (uuid: string) => {
            if (!vaultProfileUuid) return;

            dispatch(
                approvalProfileActions.dissociateApprovalProfileFromResource({
                    uuid,
                    resource: Resource.VaultProfiles,
                    associationObjectUuid: vaultProfileUuid,
                }),
            );
        },
        [dispatch, vaultProfileUuid],
    );

    const widgetButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                id: 'enable',
                icon: 'check',
                disabled: !profile || profile.enabled,
                tooltip: 'Enable',
                onClick: onApprove,
            },
            {
                id: 'disable',
                icon: 'times',
                disabled: !profile || !profile.enabled,
                tooltip: 'Disable',
                onClick: onDisapprove,
            },
            {
                id: 'check-compliance',
                icon: 'gavel',
                disabled: !profile,
                tooltip: 'Check Compliance',
                onClick: () => setComplianceCheck(true),
            },
            {
                id: 'edit',
                icon: 'pencil',
                disabled: !profile,
                tooltip: 'Edit',
                onClick: () => setIsEditOpen(true),
            },
            {
                id: 'delete',
                icon: 'trash',
                disabled: !profile,
                tooltip: 'Delete',
                onClick: () => setConfirmDelete(true),
            },
        ],
        [profile, onApprove, onDisapprove],
    );

    const complianceProfileButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: !profile,
                tooltip: 'Associate Compliance Profile',
                onClick: () => setAssociateComplianceProfile(true),
                id: 'associate-compliance-profile',
            },
        ],
        [profile],
    );

    const approvalProfileButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: !profile,
                tooltip: 'Associate Approval Profile',
                onClick: () => setAssociateApprovalProfile(true),
                id: 'associate-approval-profile',
            },
        ],
        [profile],
    );

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const complianceProfileHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'complianceProfileName',
                content: 'Name',
            },
            {
                id: 'description',
                content: 'Description',
            },
            {
                id: 'action',
                content: 'Action',
            },
        ],
        [],
    );

    const complianceProfileData: TableDataRow[] = useMemo(
        () =>
            !associatedComplianceProfiles
                ? []
                : associatedComplianceProfiles.map((complianceProfile) => ({
                      id: complianceProfile.uuid,
                      columns: [
                          <Link key="name" to={`/${Resource.ComplianceProfiles.toLowerCase()}/detail/${complianceProfile.uuid}`}>
                              {complianceProfile.name}
                          </Link>,
                          complianceProfile.description || '',
                          <WidgetButtons
                              key="actions"
                              buttons={[
                                  {
                                      id: 'remove',
                                      icon: 'minus-square',
                                      disabled: false,
                                      tooltip: 'Remove',
                                      onClick: () => onDissociateComplianceProfile(complianceProfile.uuid),
                                  },
                              ]}
                          />,
                      ],
                  })),
        [associatedComplianceProfiles, onDissociateComplianceProfile],
    );

    const approvalProfileHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'approvalProfileName',
                content: 'Name',
            },
            {
                id: 'description',
                content: 'Description',
            },
            {
                id: 'expiry',
                content: 'Expiry (in hours)',
            },
            {
                id: 'action',
                content: 'Action',
            },
        ],
        [],
    );

    const approvalProfileData: TableDataRow[] = useMemo(
        () =>
            !associatedApprovalProfiles
                ? []
                : associatedApprovalProfiles.map((approvalProfile) => ({
                      id: approvalProfile.uuid,
                      columns: [
                          <Link key="name" to={`/${Resource.ApprovalProfiles.toLowerCase()}/detail/${approvalProfile.uuid}`}>
                              {approvalProfile.name}
                          </Link>,
                          approvalProfile.description || '',
                          approvalProfile.expiry ? approvalProfile.expiry.toString() : '',
                          <WidgetButtons
                              key="actions"
                              buttons={[
                                  {
                                      id: 'remove',
                                      icon: 'minus-square',
                                      disabled: false,
                                      tooltip: 'Remove',
                                      onClick: () => onDissociateApprovalProfile(approvalProfile.uuid),
                                  },
                              ]}
                          />,
                      ],
                  })),
        [associatedApprovalProfiles, onDissociateApprovalProfile],
    );

    const detailData: TableDataRow[] = useMemo(
        () =>
            profile
                ? [
                      {
                          id: 'description',
                          columns: ['Description', profile.description ?? ''],
                      },
                      {
                          id: 'vault',
                          columns: [
                              'Vault',
                              profile.vaultInstance ? (
                                  <Link to={`/${Resource.Vaults.toLowerCase()}/detail/${profile.vaultInstance.uuid}`}>
                                      {profile.vaultInstance.name}
                                  </Link>
                              ) : (
                                  ''
                              ),
                          ],
                      },
                      {
                          id: 'status',
                          columns: [
                              'Status',
                              <Badge key="status" color={profile.enabled ? 'success' : 'secondary'}>
                                  {profile.enabled ? 'Enabled' : 'Disabled'}
                              </Badge>,
                          ],
                      },
                  ]
                : [],
        [profile],
    );

    if (isFetchingDetail) {
        return <DetailPageSkeleton layout="simple" buttonsCount={2} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    {
                        label: getEnumLabel(resourceEnum, Resource.VaultProfiles),
                        href: `/${Resource.VaultProfiles.toLowerCase()}`,
                    },
                    { label: profile?.name ?? 'Vault Profile Details', href: '' },
                ]}
            />

            <Widget
                widgetLockName={LockWidgetNameEnum.VaultProfileDetails}
                busy={isFetchingDetail || isEnabling || isDisabling || isDeleting}
                noBorder
            >
                <div className="space-y-4">
                    <Container className="grid gap-6 xl:grid-cols-2 items-start">
                        <Widget
                            title="Vault Profile Details"
                            widgetButtons={widgetButtons}
                            titleSize="large"
                            refreshAction={getFreshDetails}
                            lockSize="large"
                        >
                            <CustomTable headers={detailHeaders} data={detailData} />
                        </Widget>

                        <Container className="w-full xl:w-auto flex flex-col">
                            <Widget
                                title="Compliance Profiles"
                                busy={isFetchingAssociatedComplianceProfiles}
                                widgetButtons={complianceProfileButtons}
                                titleSize="large"
                                refreshAction={getFreshComplianceDetails}
                                widgetLockName={LockWidgetNameEnum.ComplianceProfileAssociations}
                                lockSize="large"
                            >
                                <CustomTable headers={complianceProfileHeaders} data={complianceProfileData} />
                            </Widget>
                        </Container>
                    </Container>

                    <Container className="grid gap-6 xl:grid-cols-2 items-start">
                        <Widget title="Attributes" titleSize="large">
                            <AttributeViewer attributes={profile?.attributes ?? []} />
                        </Widget>

                        <Widget
                            title="Approval Profiles"
                            busy={isFetchingAssociatedApprovalProfiles}
                            widgetButtons={approvalProfileButtons}
                            titleSize="large"
                            refreshAction={getFreshAssociatedApprovalProfiles}
                            widgetLockName={LockWidgetNameEnum.ListOfApprovalProfiles}
                            lockSize="large"
                        >
                            <CustomTable headers={approvalProfileHeaders} data={approvalProfileData} />
                        </Widget>
                    </Container>

                    {profile && (
                        <Container>
                            <CustomAttributeWidget
                                resource={Resource.VaultProfiles}
                                resourceUuid={profile.uuid}
                                attributes={profile.customAttributes}
                            />
                        </Container>
                    )}
                </div>
            </Widget>

            <Dialog
                isOpen={isEditOpen}
                caption="Edit Vault Profile"
                body={
                    profile && vaultUuid ? (
                        <VaultProfileEditForm
                            profile={profile}
                            vaultUuid={vaultUuid}
                            onCancel={handleCloseEdit}
                            onSuccess={handleCloseEdit}
                        />
                    ) : null
                }
                toggle={handleCloseEdit}
                size="lg"
            />

            <Dialog
                isOpen={confirmDelete}
                caption="Delete Vault Profile"
                body="You are about to delete this Vault Profile. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    {
                        color: 'secondary',
                        variant: 'outline',
                        onClick: () => setConfirmDelete(false),
                        body: 'Cancel',
                    },
                ]}
            />

            <Dialog
                isOpen={associateComplianceProfile}
                caption="Associate Compliance Profile"
                body={
                    <AssociateComplianceProfileDialogBody
                        visible={associateComplianceProfile}
                        onClose={() => setAssociateComplianceProfile(false)}
                        resource={Resource.VaultProfiles}
                        resourceObject={
                            profile
                                ? {
                                      uuid: profile.uuid,
                                      name: profile.name,
                                  }
                                : undefined
                        }
                        availableComplianceProfileUuids={associatedComplianceProfiles.map((p) => p.uuid)}
                    />
                }
                toggle={() => setAssociateComplianceProfile(false)}
                buttons={[]}
                dataTestId="associate-compliance-profile-dialog"
            />

            <Dialog
                isOpen={associateApprovalProfile}
                caption="Associate Approval Profile"
                body={
                    <AssociateApprovalProfileDialogBody
                        visible={associateApprovalProfile}
                        onClose={() => setAssociateApprovalProfile(false)}
                        resource={Resource.VaultProfiles}
                        resourceObject={
                            profile
                                ? {
                                      uuid: profile.uuid,
                                      name: profile.name,
                                  }
                                : undefined
                        }
                        availableApprovalProfileUuids={associatedApprovalProfiles.map((p) => p.uuid)}
                    />
                }
                toggle={() => setAssociateApprovalProfile(false)}
                buttons={[]}
                dataTestId="associate-approval-profile-dialog"
            />

            <Dialog
                isOpen={complianceCheck}
                caption="Initiate Compliance Check"
                body="Initiate the compliance check for this Vault Profile?"
                toggle={() => setComplianceCheck(false)}
                noBorder
                buttons={[
                    { color: 'primary', variant: 'outline', onClick: () => setComplianceCheck(false), body: 'Cancel' },
                    { color: 'primary', onClick: onComplianceCheck, body: 'Yes' },
                ]}
            />
        </div>
    );
}

export default VaultProfileDetail;
