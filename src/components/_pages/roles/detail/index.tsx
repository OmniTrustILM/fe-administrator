import DetailPageSkeleton from 'components/DetailPageSkeleton';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';

import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import RoleForm from '../RoleForm';
import RoleUsersForm from '../RoleUsersForm';

import { actions, selectors } from 'ducks/roles';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router';

import Badge from 'components/Badge';
import { LockWidgetNameEnum } from 'types/user-interface';
import { Resource } from '../../../../types/openapi';
import CustomAttributeWidget from '../../../Attributes/CustomAttributeWidget';
import BooleanBadge from 'components/BooleanBadge/BooleanBadge';
import { createWidgetDetailHeaders } from 'utils/widget';
import Breadcrumb from 'components/Breadcrumb';
import Container from 'components/Container';
import Checkbox from 'components/Checkbox';

export default function UserDetail() {
    const dispatch = useDispatch();

    const navigate = useNavigate();
    const { id } = useParams();

    const role = useSelector(selectors.role);
    const permissions = useSelector(selectors.permissions);

    const isFetchingDetail = useSelector(selectors.isFetchingDetail);
    const isFetchingPermissions = useSelector(selectors.isFetchingPermissions);
    const isUpdating = useSelector(selectors.isUpdating);
    const updateRoleSucceeded = useSelector(selectors.updateRoleSucceeded);
    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const [isEditUsersModalOpen, setIsEditUsersModalOpen] = useState<boolean>(false);

    const memoizedRole = useMemo(() => role, [role]);

    useEffect(() => {
        dispatch(actions.resetState());
    }, [dispatch]);

    const getFreshDetails = useCallback(() => {
        if (!id) return;
        dispatch(actions.getDetail({ uuid: id }));
    }, [dispatch, id]);

    useEffect(() => {
        getFreshDetails();
    }, [getFreshDetails]);

    const getFreshPermissions = useCallback(() => {
        if (!role || role.uuid !== id || permissions?.uuid === id || isFetchingPermissions) return;
        dispatch(actions.getPermissions({ uuid: id }));
    }, [dispatch, id, role, permissions, isFetchingPermissions]);

    useEffect(() => {
        getFreshPermissions();
    }, [getFreshPermissions]);

    useRunOnSuccessfulFinish(isUpdating, updateRoleSucceeded, () => {
        setIsEditModalOpen(false);
        getFreshDetails();
    });

    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
    }, []);

    const onEditClick = useCallback(() => {
        if (!role) return;
        setIsEditModalOpen(true);
    }, [role]);

    const onEditRoleUsersClick = useCallback(() => {
        setIsEditUsersModalOpen(true);
    }, []);

    const handleCloseUsersModal = useCallback(() => {
        setIsEditUsersModalOpen(false);
        getFreshDetails();
    }, [getFreshDetails]);

    const onEditRolePermissionsClick = useCallback(() => {
        navigate(`../../roles/permissions/${role?.uuid}`);
    }, [navigate, role?.uuid]);

    const onDeleteConfirmed = useCallback(() => {
        if (!role) return;

        dispatch(actions.delete({ uuid: role.uuid, redirect: `../../roles` }));
        setConfirmDelete(false);
    }, [role, dispatch]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'pencil',
                disabled: role?.systemRole || false,
                tooltip: 'Edit',
                onClick: () => {
                    onEditClick();
                },
            },
            {
                icon: 'trash',
                disabled: role?.systemRole || false,
                tooltip: 'Delete',
                onClick: () => {
                    setConfirmDelete(true);
                },
            },
            {
                icon: 'user-cog',
                disabled: role?.systemRole || false,
                tooltip: 'Edit role users',
                onClick: () => {
                    onEditRoleUsersClick();
                },
            },
            {
                icon: 'lock',
                disabled: role?.systemRole || false,
                tooltip: 'Edit role permissions',
                onClick: () => {
                    onEditRolePermissionsClick();
                },
            },
        ],
        [role?.systemRole, onEditClick, onEditRoleUsersClick, onEditRolePermissionsClick],
    );

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(
        () =>
            role
                ? [
                      {
                          id: 'roleName',
                          columns: ['Name', role.name],
                      },
                      {
                          id: 'description',
                          columns: ['Description', role.description || ''],
                      },
                      {
                          id: 'email',
                          columns: ['Email', role.email || ''],
                      },
                      {
                          id: 'systemRole',
                          columns: ['System role ', <BooleanBadge key="systemRole" value={role.systemRole} invertColor />],
                      },
                  ]
                : [],
        [role],
    );

    const usersHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'username',
                content: 'Username',
            },
            {
                id: 'descrtiption',
                content: 'Description',
            },
            {
                id: 'firstName',
                content: 'First name',
            },
            {
                id: 'lastName',
                content: 'Last name',
            },
            {
                id: 'email',
                content: 'Email',
            },
        ],
        [],
    );

    const usersData: TableDataRow[] = useMemo(
        () =>
            role
                ? role.users.map((user) => ({
                      id: user.uuid,
                      columns: [
                          <span style={{ whiteSpace: 'nowrap' }}>{user.username || ''}</span>,
                          <span style={{ whiteSpace: 'nowrap' }}>{user.description || ''}</span>,
                          <span style={{ whiteSpace: 'nowrap' }}>{user.firstName || ''}</span>,
                          <span style={{ whiteSpace: 'nowrap' }}>{user.lastName || ''}</span>,
                          <span style={{ whiteSpace: 'nowrap' }}>{user.email || ''}</span>,
                      ],
                  }))
                : [],
        [role],
    );

    const permsHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'resourceName',
                content: 'Resource',
                width: 'auto',
            },
            {
                id: 'allActionsAllowed',
                content: 'All Actions',
                width: '1%',
                align: 'center',
            },
            {
                id: 'actions',
                content: 'Allowed Actions',
                width: '5%',
            },
            {
                id: 'denyActions',
                content: 'Denied Actions',
                width: '5%',
            },
            {
                id: 'noAllowedObjects',
                content: 'No. Objects',
                width: '1%',
                align: 'center',
            },
        ],

        [],
    );

    const permsData: TableDataRow[] = useMemo(
        () =>
            permissions
                ? permissions.permissions.resources.map((resource) => ({
                      id: resource.name,
                      columns: [
                          resource.name,
                          <Badge key="allowAllActions" color={resource.allowAllActions ? 'success' : 'danger'}>
                              {resource.allowAllActions ? 'Yes' : 'No'}
                          </Badge>,
                          <span style={{ whiteSpace: 'nowrap' }}>{resource.actions.join(', ')}</span>,
                          <></>,
                          resource.objects?.length.toString() || '0',
                      ],
                      detailColumns: resource.objects?.length
                          ? [
                                resource.objects.map((object) => <div key={object.name}>{object.name}</div>),
                                <></>,
                                resource.objects.map((object) => (
                                    <div key={object.uuid}>{object.allow.join(',') || <span>&nbsp;</span>}</div>
                                )),
                                resource.objects.map((object) => (
                                    <div key={object.uuid}>{object.deny.join(',') || <span>&nbsp;</span>}</div>
                                )),
                                <></>,
                            ]
                          : undefined,
                  }))
                : [],
        [permissions],
    );

    if (isFetchingDetail) {
        return <DetailPageSkeleton layout="simple" buttonsCount={2} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: 'Roles', href: '/roles' },
                    { label: role?.name || 'Role Details', href: '' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.RoleDetails} busy={isFetchingDetail} noBorder>
                <Container>
                    <Widget title="Role Details" widgetButtons={buttons} titleSize="large" refreshAction={getFreshDetails}>
                        <CustomTable headers={detailHeaders} data={detailData} />
                    </Widget>

                    <Widget title="Assigned Users" titleSize="large">
                        <CustomTable headers={usersHeaders} data={usersData} />
                    </Widget>

                    {memoizedRole && (
                        <CustomAttributeWidget
                            resource={Resource.Roles}
                            resourceUuid={memoizedRole.uuid}
                            attributes={memoizedRole.customAttributes}
                        />
                    )}

                    <Widget
                        title="Role Permissions"
                        busy={isFetchingDetail || isFetchingPermissions}
                        titleSize="large"
                        refreshAction={role && getFreshPermissions}
                    >
                        {permissions ? (
                            <>
                                <Checkbox
                                    checked={permissions.permissions.allowAllResources}
                                    disabled
                                    onChange={() => {}}
                                    label="All resources allowed"
                                />
                                {permissions.permissions.resources.length === 0 ? (
                                    <></>
                                ) : (
                                    <>
                                        <p className="text-sm mt-4 mb-2">List of allowed resources</p>
                                        <CustomTable headers={permsHeaders} data={permsData} detailHeaders={permsHeaders} hasDetails />
                                    </>
                                )}
                            </>
                        ) : null}
                    </Widget>
                </Container>
            </Widget>
            <Dialog
                isOpen={confirmDelete}
                caption="Delete Role"
                body="You are about to delete a Role. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'primary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                ]}
            />

            <Dialog
                isOpen={isEditModalOpen}
                toggle={handleCloseEditModal}
                caption="Edit Role"
                size="xl"
                body={<RoleForm roleId={role?.uuid} onCancel={handleCloseEditModal} />}
            />

            <Dialog
                isOpen={isEditUsersModalOpen}
                toggle={handleCloseUsersModal}
                caption="Edit Role Users"
                size="xl"
                body={<RoleUsersForm roleId={role?.uuid} onCancel={handleCloseUsersModal} onSuccess={handleCloseUsersModal} />}
            />
        </div>
    );
}
