import DetailPageSkeleton from 'components/DetailPageSkeleton';
import AttributeViewer from 'components/Attributes/AttributeViewer';
import CustomAttributeWidget from 'components/Attributes/CustomAttributeWidget';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import StatusBadge from 'components/StatusBadge';
import Widget from 'components/Widget';

import type { WidgetButtonProps } from 'components/WidgetButtons';
import CertificateStatus from 'components/_pages/certificates/CertificateStatus';

import { actions, selectors } from 'ducks/scep-profiles';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import ScepProfileForm from '../form';
import { PlatformEnum, Resource } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { createWidgetDetailHeaders, getGroupNames, getOwnerName } from 'utils/widget';
import { actions as groupsActions, selectors as groupsSelectors } from 'ducks/certificateGroups';
import { actions as userAction, selectors as userSelectors } from 'ducks/users';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import Container from 'components/Container';
import Breadcrumb from 'components/Breadcrumb';
import Switch from 'components/Switch';

export default function ScepProfileDetail() {
    const dispatch = useDispatch();

    const { id } = useParams();

    const scepProfile = useSelector(selectors.scepProfile);
    const isFetchingDetail = useSelector(selectors.isFetchingDetail);
    const isDisabling = useSelector(selectors.isDisabling);
    const isEnabling = useSelector(selectors.isEnabling);
    const isUpdating = useSelector(selectors.isUpdating);
    const updateScepProfileSucceeded = useSelector(selectors.updateScepProfileSucceeded);
    const users = useSelector(userSelectors.users);
    const groups = useSelector(groupsSelectors.certificateGroups);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const deleteErrorMessage = useSelector(selectors.deleteErrorMessage);

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

    const isBusy = useMemo(() => isFetchingDetail || isDisabling || isEnabling, [isFetchingDetail, isDisabling, isEnabling]);

    const getFreshScepProfile = useCallback(() => {
        if (!id) return;
        dispatch(actions.getScepProfile({ uuid: id }));
    }, [dispatch, id]);

    useEffect(() => {
        getFreshScepProfile();
    }, [id, getFreshScepProfile]);

    useEffect(() => {
        dispatch(userAction.list());
    }, [dispatch]);
    useEffect(() => {
        dispatch(groupsActions.listGroups());
    }, [dispatch]);

    useRunOnSuccessfulFinish(isUpdating, updateScepProfileSucceeded, () => {
        setIsEditModalOpen(false);
        getFreshScepProfile();
    });

    const handleOpenEditModal = useCallback(() => {
        if (!scepProfile) return;
        setIsEditModalOpen(true);
    }, [scepProfile]);

    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
    }, []);

    const onEditClick = useCallback(() => {
        handleOpenEditModal();
    }, [handleOpenEditModal]);

    const onEnableClick = useCallback(() => {
        if (!scepProfile) return;

        dispatch(actions.enableScepProfile({ uuid: scepProfile.uuid }));
    }, [scepProfile, dispatch]);

    const onDisableClick = useCallback(() => {
        if (!scepProfile) return;

        dispatch(actions.disableScepProfile({ uuid: scepProfile.uuid }));
    }, [scepProfile, dispatch]);

    const onDeleteConfirmed = useCallback(() => {
        if (!scepProfile) return;

        dispatch(actions.deleteScepProfile({ uuid: scepProfile.uuid }));
        setConfirmDelete(false);
    }, [scepProfile, dispatch]);

    const onForceDeleteScepProfile = useCallback(() => {
        if (!scepProfile) return;

        dispatch(actions.bulkForceDeleteScepProfiles({ uuids: [scepProfile.uuid], redirect: `../scepprofiles` }));
    }, [scepProfile, dispatch]);

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
                disabled: scepProfile?.enabled || false,
                tooltip: 'Enable',
                onClick: () => {
                    onEnableClick();
                },
            },
            {
                icon: 'times',
                disabled: !(scepProfile?.enabled || false),
                tooltip: 'Disable',
                onClick: () => {
                    onDisableClick();
                },
            },
        ],
        [scepProfile, onEditClick, onDisableClick, onEnableClick],
    );

    const tableHeader: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const scepProfileDetailData: TableDataRow[] = useMemo(
        () =>
            !scepProfile
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', scepProfile.uuid],
                      },
                      {
                          id: 'name',
                          columns: ['Name', scepProfile.name],
                      },
                      {
                          id: 'description',
                          columns: ['Description', scepProfile.description || ''],
                      },
                      {
                          id: 'status',
                          columns: ['Status', <StatusBadge enabled={scepProfile.enabled} />],
                      },
                      {
                          id: 'renewThreshold',
                          columns: ['Renew Threshold', scepProfile.renewThreshold?.toString() || 'N/A'],
                      },
                      {
                          id: 'includeCaCertificate',
                          columns: [
                              'Include CA Certificate',
                              <Switch
                                  key="includeCaCertificate"
                                  checked={scepProfile.includeCaCertificate}
                                  onChange={() => {}}
                                  id="includeCaCertificateSwitch"
                                  label=""
                                  disabled
                              />,
                          ],
                      },
                      {
                          id: 'includeCaCertificateChain',
                          columns: [
                              'Include CA Certificate Chain',
                              <Switch
                                  key="includeCaCertificateChain"
                                  checked={scepProfile.includeCaCertificateChain}
                                  onChange={() => {}}
                                  id="includeCaCertificateChainSwitch"
                                  label=""
                                  disabled
                              />,
                          ],
                      },
                      {
                          id: 'intuneEnabled',
                          columns: [
                              'Intune Enabled',
                              <Switch
                                  key="intuneEnabled"
                                  checked={!!scepProfile.enableIntune}
                                  onChange={() => {}}
                                  disabled
                                  id="intuneEnabledSwitch"
                                  label=""
                              />,
                          ],
                      },
                      {
                          id: 'scepUrl',
                          columns: ['URL', scepProfile.scepUrl || 'N/A'],
                      },
                  ],
        [scepProfile],
    );

    const intuneDetailData: TableDataRow[] = useMemo(
        () =>
            !scepProfile
                ? []
                : [
                      {
                          id: 'intuneTenant',
                          columns: ['Intune Tenant', scepProfile.intuneTenant ?? ''],
                      },
                      {
                          id: 'intuneApplicationId',
                          columns: ['Intune Application ID', scepProfile.intuneApplicationId ?? ''],
                      },
                  ],
        [scepProfile],
    );

    const raProfileDetailData: TableDataRow[] = useMemo(
        () =>
            !scepProfile || !scepProfile.raProfile
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', scepProfile.raProfile.uuid],
                      },
                      {
                          id: 'name',
                          columns: [
                              'Name',
                              scepProfile.raProfile?.uuid ? (
                                  <Link
                                      to={`../../raprofiles/detail/${scepProfile.raProfile.authorityInstanceUuid}/${scepProfile.raProfile.uuid}`}
                                  >
                                      {scepProfile.raProfile.name}
                                  </Link>
                              ) : (
                                  ''
                              ),
                          ],
                      },
                      {
                          id: 'status',
                          columns: ['Status', <StatusBadge enabled={scepProfile.raProfile.enabled} />],
                      },
                  ],
        [scepProfile],
    );

    const certificateDetailData: TableDataRow[] = useMemo(
        () =>
            !scepProfile || !scepProfile.caCertificate
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', scepProfile.caCertificate.uuid],
                      },
                      {
                          id: 'name',
                          columns: [
                              'Name',
                              scepProfile.caCertificate?.uuid ? (
                                  <Link to={`../../certificates/detail/${scepProfile.caCertificate.uuid}`}>
                                      {scepProfile.caCertificate.commonName}
                                  </Link>
                              ) : (
                                  ''
                              ),
                          ],
                      },
                      {
                          id: 'status',
                          columns: ['Status', <CertificateStatus status={scepProfile.caCertificate.state} />],
                      },
                  ],
        [scepProfile],
    );

    const RAProfileDetailsTitle = useMemo(
        () => (raProfileDetailData.length > 0 ? 'RA Profile Configuration' : 'Default RA Profile not selected'),
        [raProfileDetailData],
    );

    const ownerName = useMemo(() => getOwnerName(scepProfile?.certificateAssociations?.ownerUuid, users), [scepProfile, users]);

    const groupNames = useMemo(() => {
        return getGroupNames(scepProfile?.certificateAssociations?.groupUuids, groups);
    }, [scepProfile, groups]);

    const defaultCertificateAssociationsData: TableDataRow[] = useMemo(() => {
        if (!scepProfile) return [];
        return [
            {
                id: 'owner',
                columns: [
                    'Owner',
                    scepProfile.certificateAssociations?.ownerUuid ? (
                        <Link key="owner" to={`../../users/detail/${scepProfile.certificateAssociations?.ownerUuid}`}>
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
                        {!scepProfile.certificateAssociations || scepProfile.certificateAssociations?.groupUuids?.length === 0 ? (
                            <span>Unassigned</span>
                        ) : (
                            <>
                                {scepProfile.certificateAssociations?.groupUuids?.map((groupUuid, index) => {
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
    }, [scepProfile, ownerName, groupNames]);

    if (isFetchingDetail) {
        return <DetailPageSkeleton layout="simple" buttonsCount={2} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.ScepProfiles)} Inventory`, href: '/scepprofiles' },
                    { label: scepProfile?.name || 'SCEP Profile Details', href: '' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.SCEPProfileDetails} busy={isBusy} noBorder>
                <Container>
                    <Container className="md:grid grid-cols-2 items-start">
                        <Widget title="SCEP Profile Details" widgetButtons={buttons} titleSize="large" refreshAction={getFreshScepProfile}>
                            <CustomTable headers={tableHeader} data={scepProfileDetailData} />
                        </Widget>

                        {scepProfile && (
                            <CustomAttributeWidget
                                resource={Resource.ScepProfiles}
                                resourceUuid={scepProfile.uuid}
                                attributes={scepProfile.customAttributes}
                            />
                        )}
                    </Container>

                    {scepProfile && scepProfile.enableIntune && (
                        <Widget title={'Intune Configuration'}>
                            <CustomTable headers={tableHeader} data={intuneDetailData} />
                        </Widget>
                    )}

                    <Widget title={'CA Certificate Configuration'} titleSize="large">
                        {certificateDetailData.length > 0 && <CustomTable headers={tableHeader} data={certificateDetailData} />}
                    </Widget>

                    <Widget title={RAProfileDetailsTitle} titleSize="large">
                        {raProfileDetailData.length > 0 && (
                            <>
                                <CustomTable headers={tableHeader} data={raProfileDetailData} />

                                {scepProfile?.issueCertificateAttributes === undefined ||
                                scepProfile.issueCertificateAttributes.length === 0 ? (
                                    <></>
                                ) : (
                                    <Widget title="List of Attributes to Issue Certificate">
                                        <AttributeViewer attributes={scepProfile?.issueCertificateAttributes} />
                                    </Widget>
                                )}
                            </>
                        )}
                    </Widget>

                    <Widget title="Default Certificate associations" titleSize="large">
                        <CustomTable headers={tableHeader} data={defaultCertificateAssociationsData} />
                        <Widget title="Certificate Custom Attributes" noBorder className="mt-2">
                            <AttributeViewer attributes={scepProfile?.certificateAssociations?.customAttributes} />
                        </Widget>
                    </Widget>
                </Container>
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption="Delete SCEP Profile"
                body="You are about to delete SCEP Profile which may have associated SCEP
                  Account(s). When deleted the SCEP Account(s) will be revoked."
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={deleteErrorMessage.length > 0}
                caption="Delete SCEP Profile"
                body={
                    <>
                        Failed to delete the SCEP Profile that has dependent objects. Please find the details below:
                        <br />
                        <br />
                        {deleteErrorMessage}
                    </>
                }
                toggle={() => dispatch(actions.clearDeleteErrorMessages())}
                buttons={[
                    { color: 'danger', onClick: onForceDeleteScepProfile, body: 'Force' },
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
                caption="Edit SCEP Profile"
                size="xl"
                body={
                    <ScepProfileForm scepProfileId={scepProfile?.uuid} onCancel={handleCloseEditModal} onSuccess={handleCloseEditModal} />
                }
            />
        </div>
    );
}
