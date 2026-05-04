import AttributeViewer from 'components/Attributes/AttributeViewer';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import StatusBadge from 'components/StatusBadge';

import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { actions, selectors } from 'ducks/acme-profiles';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import AcmeProfileForm from '../form';
import { LockWidgetNameEnum } from 'types/user-interface';
import { PlatformEnum, Resource } from '../../../../types/openapi';
import CustomAttributeWidget from '../../../Attributes/CustomAttributeWidget';
import { createWidgetDetailHeaders, getGroupNames, getOwnerName } from 'utils/widget';
import { actions as groupsActions, selectors as groupsSelectors } from 'ducks/certificateGroups';
import { actions as userAction, selectors as userSelectors } from 'ducks/users';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import Container from 'components/Container';
import Breadcrumb from 'components/Breadcrumb';
import DetailPageSkeleton from 'components/DetailPageSkeleton';

export default function AdministratorDetail() {
    const dispatch = useDispatch();

    const { id } = useParams();

    const acmeProfile = useSelector(selectors.acmeProfile);
    const isFetchingDetail = useSelector(selectors.isFetchingDetail);
    const isDisabling = useSelector(selectors.isDisabling);
    const isEnabling = useSelector(selectors.isEnabling);
    const isUpdating = useSelector(selectors.isUpdating);
    const updateAcmeProfileSucceeded = useSelector(selectors.updateAcmeProfileSucceeded);
    const users = useSelector(userSelectors.users);
    const groups = useSelector(groupsSelectors.certificateGroups);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const deleteErrorMessage = useSelector(selectors.deleteErrorMessage);

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

    const isBusy = useMemo(() => isFetchingDetail || isDisabling || isEnabling, [isFetchingDetail, isDisabling, isEnabling]);

    const getFreshAcmeProfile = useCallback(() => {
        if (!id) return;
        dispatch(actions.getAcmeProfile({ uuid: id }));
    }, [dispatch, id]);

    useEffect(() => {
        getFreshAcmeProfile();
    }, [id, getFreshAcmeProfile]);

    useEffect(() => {
        dispatch(userAction.list());
    }, [dispatch]);
    useEffect(() => {
        dispatch(groupsActions.listGroups());
    }, [dispatch]);

    useRunOnSuccessfulFinish(isUpdating, updateAcmeProfileSucceeded, () => {
        setIsEditModalOpen(false);
        getFreshAcmeProfile();
    });

    const handleOpenEditModal = useCallback(() => {
        if (!acmeProfile) return;
        setIsEditModalOpen(true);
    }, [acmeProfile]);

    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
    }, []);

    const onEditClick = useCallback(() => {
        handleOpenEditModal();
    }, [handleOpenEditModal]);

    const onEnableClick = useCallback(() => {
        if (!acmeProfile) return;

        dispatch(actions.enableAcmeProfile({ uuid: acmeProfile.uuid }));
    }, [acmeProfile, dispatch]);

    const onDisableClick = useCallback(() => {
        if (!acmeProfile) return;

        dispatch(actions.disableAcmeProfile({ uuid: acmeProfile.uuid }));
    }, [acmeProfile, dispatch]);

    const onDeleteConfirmed = useCallback(() => {
        if (!acmeProfile) return;

        dispatch(actions.deleteAcmeProfile({ uuid: acmeProfile.uuid }));
        setConfirmDelete(false);
    }, [acmeProfile, dispatch]);

    const onForceDeleteAcmeProfile = useCallback(() => {
        if (!acmeProfile) return;

        dispatch(actions.bulkForceDeleteAcmeProfiles({ uuids: [acmeProfile.uuid], redirect: `../acmeprofiles` }));
    }, [acmeProfile, dispatch]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'pencil',
                disabled: false,
                tooltip: 'Edit',
                onClick: () => {
                    onEditClick();
                },
            },
            {
                icon: 'trash',
                disabled: false,
                tooltip: 'Delete',
                onClick: () => {
                    setConfirmDelete(true);
                },
            },
            {
                icon: 'check',
                disabled: acmeProfile?.enabled || false,
                tooltip: 'Enable',
                onClick: () => {
                    onEnableClick();
                },
            },
            {
                icon: 'times',
                disabled: !(acmeProfile?.enabled || false),
                tooltip: 'Disable',
                onClick: () => {
                    onDisableClick();
                },
            },
        ],
        [acmeProfile, onEditClick, onDisableClick, onEnableClick],
    );

    const tableHeader: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const acmeProfileDetailData: TableDataRow[] = useMemo(
        () =>
            !acmeProfile
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', acmeProfile.uuid],
                      },
                      {
                          id: 'name',
                          columns: ['Name', acmeProfile.name],
                      },
                      {
                          id: 'description',
                          columns: ['Description', acmeProfile.description || ''],
                      },
                      {
                          id: 'status',
                          columns: ['Status', <StatusBadge enabled={acmeProfile.enabled} />],
                      },
                      {
                          id: 'websiteUrl',
                          columns: ['Website URL', acmeProfile.websiteUrl || 'N/A'],
                      },
                      {
                          id: 'retryInterval',
                          columns: ['Retry Interval', `${acmeProfile.retryInterval || 'N/A'} (seconds)`],
                      },
                      {
                          id: 'orderValidity',
                          columns: ['Order Validity', `${acmeProfile.validity || 'N/A'} (seconds)`],
                      },
                      {
                          id: 'directoryUrl',
                          columns: ['Directory URL', acmeProfile.directoryUrl || 'N/A'],
                      },
                  ],
        [acmeProfile],
    );

    const raProfileDetailData: TableDataRow[] = useMemo(
        () =>
            !acmeProfile || !acmeProfile.raProfile
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', acmeProfile.raProfile.uuid],
                      },
                      {
                          id: 'name',
                          columns: [
                              'Name',
                              acmeProfile.raProfile?.uuid ? (
                                  <Link
                                      to={`../../raprofiles/detail/${acmeProfile.raProfile.authorityInstanceUuid}/${acmeProfile.raProfile.uuid}`}
                                  >
                                      {acmeProfile.raProfile.name}
                                  </Link>
                              ) : (
                                  ''
                              ),
                          ],
                      },
                      {
                          id: 'status',
                          columns: ['Status', <StatusBadge enabled={acmeProfile.raProfile.enabled} />],
                      },
                  ],
        [acmeProfile],
    );

    const dnsData: TableDataRow[] = useMemo(
        () =>
            !acmeProfile
                ? []
                : [
                      {
                          id: 'dnsResolverIpAddress',
                          columns: ['DNS Resolver IP Address', acmeProfile.dnsResolverIp || 'N/A'],
                      },
                      {
                          id: 'dnsResolverPort',
                          columns: ['DNS Resolver Port', acmeProfile.dnsResolverPort || 'N/A'],
                      },
                  ],
        [acmeProfile],
    );

    const termsOfServiceData: TableDataRow[] = useMemo(
        () =>
            !acmeProfile
                ? []
                : [
                      {
                          id: 'termsOfServiceUrl',
                          columns: ['Terms of Service URL', acmeProfile.termsOfServiceUrl || 'N/A'],
                      },
                      {
                          id: 'changesToTermsOfServiceUrl',
                          columns: ['Changes of Terms of Service URL', acmeProfile.termsOfServiceChangeUrl || 'N/A'],
                      },
                      {
                          id: 'disableNewOrderPlacement',
                          columns: [
                              'Disable new Order placement? (due to change in Terms Of Service)',
                              acmeProfile.termsOfServiceChangeDisable !== undefined
                                  ? acmeProfile.termsOfServiceChangeDisable
                                      ? 'Yes'
                                      : 'No'
                                  : 'N/A',
                          ],
                      },
                      {
                          id: 'requireContact',
                          columns: [
                              'Require Contact information for new Accounts?',
                              acmeProfile.requireContact !== undefined ? (acmeProfile.requireContact ? 'Yes' : 'No') : 'N/A',
                          ],
                      },
                      {
                          id: 'requireAgreement',
                          columns: [
                              'Require Agreement for new Accounts?',
                              acmeProfile.requireTermsOfService !== undefined ? (acmeProfile.requireTermsOfService ? 'Yes' : 'No') : 'N/A',
                          ],
                      },
                  ],
        [acmeProfile],
    );

    const raProfileText = useMemo(
        () => (raProfileDetailData.length > 0 ? 'RA Profile Configuration' : 'Default RA Profile not selected'),
        [raProfileDetailData],
    );

    const ownerName = useMemo(() => getOwnerName(acmeProfile?.certificateAssociations?.ownerUuid, users), [acmeProfile, users]);

    const groupNames = useMemo(() => {
        return getGroupNames(acmeProfile?.certificateAssociations?.groupUuids, groups);
    }, [acmeProfile, groups]);

    const defaultCertificateAssociationsData: TableDataRow[] = useMemo(() => {
        if (!acmeProfile) return [];
        return [
            {
                id: 'owner',
                columns: [
                    'Owner',
                    acmeProfile.certificateAssociations?.ownerUuid ? (
                        <Link key="owner" to={`../../users/detail/${acmeProfile.certificateAssociations?.ownerUuid}`}>
                            {ownerName}
                        </Link>
                    ) : (
                        ownerName
                    ),
                ],
            },
            {
                id: 'groups',
                columns: [
                    'Groups',
                    <>
                        {!acmeProfile.certificateAssociations || acmeProfile.certificateAssociations?.groupUuids?.length === 0 ? (
                            <span>Unassigned</span>
                        ) : (
                            <>
                                {acmeProfile.certificateAssociations?.groupUuids?.map((groupUuid, index) => {
                                    return (
                                        <>
                                            <Link key={groupUuid} to={`../../groups/detail/${groupUuid}`}>
                                                {groupNames?.[index] ?? 'N/A'}
                                            </Link>
                                            <br />
                                        </>
                                    );
                                })}
                            </>
                        )}
                    </>,
                ],
            },
        ];
    }, [acmeProfile, ownerName, groupNames]);

    if (isFetchingDetail) {
        return <DetailPageSkeleton layout="simple" buttonsCount={2} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.AcmeProfiles)} Inventory`, href: '/acmeprofiles' },
                    { label: acmeProfile?.name || 'ACME Profile Details', href: '' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.ACMEProfileDetails} busy={isBusy} noBorder>
                <Container>
                    <Container className="md:grid grid-cols-2 items-start">
                        <Widget
                            title="ACME Profile Details"
                            widgetButtons={buttons}
                            titleSize="large"
                            refreshAction={getFreshAcmeProfile}
                            lockSize="large"
                        >
                            <CustomTable headers={tableHeader} data={acmeProfileDetailData} />
                        </Widget>
                        <Container>
                            <Widget title="DNS" titleSize="large">
                                <CustomTable headers={tableHeader} data={dnsData} />
                            </Widget>
                        </Container>
                    </Container>
                    <Widget title="Terms of Service" titleSize="large">
                        <CustomTable headers={tableHeader} data={termsOfServiceData} />
                    </Widget>
                    {acmeProfile && (
                        <CustomAttributeWidget
                            resource={Resource.AcmeProfiles}
                            resourceUuid={acmeProfile.uuid}
                            attributes={acmeProfile.customAttributes}
                        />
                    )}
                    <Widget title={raProfileText} titleSize="large">
                        {raProfileDetailData.length > 0 && (
                            <>
                                <CustomTable headers={tableHeader} data={raProfileDetailData} />

                                {acmeProfile?.issueCertificateAttributes === undefined ||
                                acmeProfile.issueCertificateAttributes.length === 0 ? (
                                    <></>
                                ) : (
                                    <Widget title="List of Attributes to Issue Certificate">
                                        <AttributeViewer attributes={acmeProfile?.issueCertificateAttributes} />
                                    </Widget>
                                )}
                                {acmeProfile?.revokeCertificateAttributes === undefined ||
                                acmeProfile.revokeCertificateAttributes.length === 0 ? (
                                    <></>
                                ) : (
                                    <Widget title="List of Attributes to Revoke Certificate">
                                        <AttributeViewer attributes={acmeProfile?.revokeCertificateAttributes} />
                                    </Widget>
                                )}
                            </>
                        )}
                    </Widget>
                    <Widget title="Default Certificate associations" titleSize="large">
                        <CustomTable headers={tableHeader} data={defaultCertificateAssociationsData} />
                        <Widget title="Certificate Custom Attributes" noBorder className="mt-2" titleSize="large">
                            <AttributeViewer attributes={acmeProfile?.certificateAssociations?.customAttributes} />
                        </Widget>
                    </Widget>
                </Container>
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption="Delete ACME Profile"
                body="You are about to delete ACME Profile which may have associated ACME
                  Account(s). When deleted the ACME Account(s) will be revoked."
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />
            <Dialog
                isOpen={deleteErrorMessage.length > 0}
                caption="Delete ACME Profile"
                body={
                    <>
                        Failed to delete the ACME Profile that has dependent objects. Please find the details below:
                        <br />
                        <br />
                        {deleteErrorMessage}
                    </>
                }
                toggle={() => dispatch(actions.clearDeleteErrorMessages())}
                buttons={[
                    { color: 'danger', onClick: onForceDeleteAcmeProfile, body: 'Force' },
                    {
                        color: 'secondary',
                        variant: 'outline',
                        onClick: () => dispatch(actions.clearDeleteErrorMessages()),
                        body: 'Cancel',
                    },
                ]}
            />

            <Dialog
                isOpen={isEditModalOpen}
                toggle={handleCloseEditModal}
                caption="Edit ACME Profile"
                size="xl"
                body={
                    <AcmeProfileForm acmeProfileId={acmeProfile?.uuid} onCancel={handleCloseEditModal} onSuccess={handleCloseEditModal} />
                }
            />
        </div>
    );
}
