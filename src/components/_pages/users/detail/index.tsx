import DetailPageSkeleton from 'components/DetailPageSkeleton';
import CertificateAttributes from 'components/CertificateAttributes';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import StatusBadge from 'components/StatusBadge';

import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import UserForm from '../form';
import { actions as certActions, selectors as certSelectors } from 'ducks/certificates';

import { selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { actions, selectors } from 'ducks/users';
import { selectors as authSelectors } from 'ducks/auth';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import Badge from 'components/Badge';
import { LockWidgetNameEnum } from 'types/user-interface';
import { PlatformEnum, Resource } from '../../../../types/openapi';
import CustomAttributeWidget from '../../../Attributes/CustomAttributeWidget';
import { createWidgetDetailHeaders } from 'utils/widget';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import Breadcrumb from 'components/Breadcrumb';
import Container from 'components/Container';

export default function UserDetail() {
    const dispatch = useDispatch();

    const { id } = useParams();

    const user = useSelector(selectors.user);
    const isFetchingDetail = useSelector(selectors.isFetchingDetail);
    const isFetchingRoles = useSelector(selectors.isFetchingRoles);
    const isDisabling = useSelector(selectors.isDisabling);
    const isEnabling = useSelector(selectors.isEnabling);
    const isUpdating = useSelector(selectors.isUpdating);
    const updateUserSucceeded = useSelector(selectors.updateUserSucceeded);
    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);
    const isUpdatingContent = useSelector(customAttributesSelectors.isUpdatingContent);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const certificate = useSelector(certSelectors.certificateDetail);
    const isFetchingCertificateDetail = useSelector(certSelectors.isFetchingDetail);
    const profile = useSelector(authSelectors.profile);

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

    const getFreshUserDetails = useCallback(() => {
        if (!id) return;
        dispatch(certActions.clearCertificateDetail());
        dispatch(actions.getDetail({ uuid: id }));
        dispatch(actions.getRoles({ uuid: id }));
    }, [id, dispatch]);

    useEffect(() => {
        getFreshUserDetails();
    }, [getFreshUserDetails, id]);

    const getFreshCertificateDetails = useCallback(() => {
        // TODO: Add Toast to notify user
        if (!user || !user.certificate || !user.certificate.uuid || user.uuid !== id) return;
        dispatch(certActions.getCertificateDetail({ uuid: user.certificate.uuid }));
    }, [user, dispatch, id]);

    useEffect(() => {
        getFreshCertificateDetails();
    }, [getFreshCertificateDetails, id]);

    useRunOnSuccessfulFinish(isUpdating, updateUserSucceeded, () => {
        setIsEditModalOpen(false);
        getFreshUserDetails();
    });

    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
    }, []);

    const onEditClick = useCallback(() => {
        if (!user) return;
        setIsEditModalOpen(true);
    }, [user]);

    const onEnableClick = useCallback(() => {
        if (!user) return;

        dispatch(actions.enable({ uuid: user.uuid }));
    }, [user, dispatch]);

    const onDisableClick = useCallback(() => {
        if (!user) return;

        dispatch(actions.disable({ uuid: user.uuid }));
    }, [user, dispatch]);

    const onDeleteConfirmed = useCallback(() => {
        if (!user) return;

        dispatch(actions.deleteUser({ uuid: user.uuid, redirect: `../../users` }));
        setConfirmDelete(false);
    }, [user, dispatch]);

    const isBusy = useMemo(
        () =>
            isFetchingDetail ||
            isFetchingRoles ||
            isFetchingResourceCustomAttributes ||
            isUpdatingContent ||
            isFetchingCertificateDetail ||
            isEnabling ||
            isDisabling,
        [
            isFetchingDetail,
            isFetchingRoles,
            isFetchingResourceCustomAttributes,
            isUpdatingContent,
            isFetchingCertificateDetail,
            isEnabling,
            isDisabling,
        ],
    );

    const isCurrentUser = useMemo(() => user?.uuid === profile?.uuid, [user, profile]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'pencil',
                disabled: isBusy || user?.systemUser || false,
                tooltip: 'Edit',
                onClick: () => {
                    onEditClick();
                },
            },
            {
                icon: 'trash',
                disabled: user?.systemUser || isCurrentUser || false,
                tooltip: isCurrentUser ? 'You cannot delete your own account' : 'Delete',
                onClick: () => {
                    setConfirmDelete(true);
                },
            },
            {
                icon: 'check',
                disabled: user?.enabled || user?.systemUser || isCurrentUser || false,
                tooltip: isCurrentUser ? 'You cannot enable your own account' : 'Enable',
                onClick: () => {
                    onEnableClick();
                },
            },
            {
                icon: 'times',
                disabled: !(user?.enabled || false) || user?.systemUser || isCurrentUser || false,
                tooltip: isCurrentUser ? 'You cannot disable your own account' : 'Disable',
                onClick: () => {
                    onDisableClick();
                },
            },
        ],
        [user, onEditClick, onDisableClick, onEnableClick, isBusy, setConfirmDelete, isCurrentUser],
    );

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(
        () =>
            !user
                ? []
                : [
                      {
                          id: 'username',
                          columns: ['Username', user.username],
                      },
                      {
                          id: 'groups',
                          columns: [
                              'Groups',
                              user?.groups?.length
                                  ? user?.groups.map((group, i) => (
                                        <Fragment key={group.uuid}>
                                            <Link to={`../../groups/detail/${group.uuid}`}>{group.name}</Link>
                                            {user?.groups?.length && i !== user.groups.length - 1 ? `, ` : ``}
                                        </Fragment>
                                    ))
                                  : '',
                          ],
                      },
                      {
                          id: 'description',
                          columns: ['Description', user.description || ''],
                      },
                      {
                          id: 'firstName',
                          columns: ['First name', user.firstName || ''],
                      },
                      {
                          id: 'lastName',
                          columns: ['Last name', user.lastName || ''],
                      },
                      {
                          id: 'email',
                          columns: ['Email', user.email || ''],
                      },
                      {
                          id: 'systemUser',
                          columns: [
                              'System user',
                              <Badge color={!user.systemUser ? 'success' : 'danger'}>{user.systemUser ? 'Yes' : 'No'}</Badge>,
                          ],
                      },
                      {
                          id: 'enabled',
                          columns: ['Status', <StatusBadge enabled={user.enabled} />],
                      },
                      {
                          id: 'roles',
                          columns: ['Roles', user.roles?.map((role) => role.name).join(', ') || ''],
                      },
                  ],
        [user],
    );

    const isInitialLoad = isFetchingDetail && !user;

    if (isFetchingDetail) {
        return <DetailPageSkeleton layout="simple" buttonsCount={3} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: 'Users', href: '/users' },
                    { label: user?.username || 'User Details', href: '' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.UserDetails} busy={isBusy} noBorder>
                <Container>
                    <Widget title="User Details" widgetButtons={buttons} titleSize="large" refreshAction={getFreshUserDetails}>
                        <CustomTable headers={detailHeaders} data={detailData} isLoading={isInitialLoad} />
                    </Widget>

                    <Widget
                        title="User Certificate Details"
                        busy={!isInitialLoad && (isFetchingDetail || isFetchingCertificateDetail)}
                        titleSize="large"
                        refreshAction={user?.certificate?.uuid ? getFreshCertificateDetails : undefined}
                    >
                        <CertificateAttributes certificate={certificate} isLoading={isInitialLoad} />
                    </Widget>

                    {user && (
                        <CustomAttributeWidget resource={Resource.Users} resourceUuid={user.uuid} attributes={user.customAttributes} />
                    )}
                </Container>
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption="Delete User"
                body="You are about to delete a User. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                ]}
            />

            <Dialog
                isOpen={isEditModalOpen}
                toggle={handleCloseEditModal}
                caption="Edit User"
                size="xl"
                body={<UserForm userId={user?.uuid} onCancel={handleCloseEditModal} />}
            />
        </div>
    );
}
