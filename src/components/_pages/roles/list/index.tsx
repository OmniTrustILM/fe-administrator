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
import { Link, useNavigate } from 'react-router';
import { LockWidgetNameEnum } from 'types/user-interface';
import Badge from 'components/Badge';

export default function RolesList() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const checkedRows = useSelector(selectors.rolesListCheckedRows);
    const roles = useSelector(selectors.roles);

    const isFetching = useSelector(selectors.isFetchingList);
    const isDeleting = useSelector(selectors.isDeleting);
    const isUpdating = useSelector(selectors.isUpdating);
    const isCreating = useSelector(selectors.isCreating);
    const createRoleSucceeded = useSelector(selectors.createRoleSucceeded);
    const updateRoleSucceeded = useSelector(selectors.updateRoleSucceeded);

    const isBusy = isFetching || isDeleting || isUpdating;

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [editingRoleId, setEditingRoleId] = useState<string | undefined>(undefined);
    const [isEditUsersModalOpen, setIsEditUsersModalOpen] = useState<boolean>(false);
    const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(undefined);

    const getFreshData = useCallback(() => {
        dispatch(actions.setRolesListCheckedRows({ checkedRows: [] }));
        dispatch(actions.list());
    }, [dispatch]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    useRunOnSuccessfulFinish(isCreating, createRoleSucceeded, () => {
        setIsAddModalOpen(false);
        getFreshData();
    });
    useRunOnSuccessfulFinish(isUpdating, updateRoleSucceeded, () => {
        setEditingRoleId(undefined);
        getFreshData();
    });

    const handleOpenAddModal = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
        setEditingRoleId(undefined);
    }, []);

    const onEditRoleUsersClick = useCallback(() => {
        if (checkedRows.length !== 1) return;
        setSelectedRoleId(checkedRows[0]);
        setIsEditUsersModalOpen(true);
    }, [checkedRows]);

    const handleCloseUsersModal = useCallback(() => {
        setIsEditUsersModalOpen(false);
        setSelectedRoleId(undefined);
        getFreshData();
    }, [getFreshData]);

    const onEditRolePermissionsClick = useCallback(() => {
        if (checkedRows.length !== 1) return;
        navigate(`./permissions/${checkedRows[0]}`);
    }, [checkedRows, navigate]);

    const onDeleteConfirmed = useCallback(() => {
        setConfirmDelete(false);

        dispatch(actions.bulkDelete({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

    const setCheckedRows = useCallback(
        (rows: (string | number)[]) => {
            dispatch(actions.setRolesListCheckedRows({ checkedRows: rows as string[] }));
        },
        [dispatch],
    );

    const isSystemRoleSelected = useMemo(() => {
        return checkedRows.some((uuid) => {
            const role = roles.find((role) => role.uuid === uuid);
            return role && role.systemRole;
        });
    }, [checkedRows, roles]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: isBusy,
                tooltip: 'Create',
                onClick: handleOpenAddModal,
            },
            {
                icon: 'trash',
                disabled: isBusy || checkedRows.length === 0 || isSystemRoleSelected,
                tooltip: 'Delete',
                onClick: () => {
                    setConfirmDelete(true);
                },
            },
            {
                icon: 'user-cog',
                disabled: isBusy || checkedRows.length !== 1 || isSystemRoleSelected,
                tooltip: 'Edit role users',
                onClick: () => {
                    onEditRoleUsersClick();
                },
            },
            {
                icon: 'lock',
                disabled: isBusy || checkedRows.length !== 1 || isSystemRoleSelected,
                tooltip: 'Edit role permissions',
                onClick: () => {
                    onEditRolePermissionsClick();
                },
            },
        ],
        [isBusy, checkedRows.length, isSystemRoleSelected, handleOpenAddModal, onEditRolePermissionsClick, onEditRoleUsersClick],
    );

    const rolesTableHeader: TableHeader[] = useMemo(
        () => [
            {
                id: 'roleName',
                content: 'Role name',
                sortable: true,
                sort: 'asc',
                width: 'auto',
            },
            {
                id: 'roleDescription',
                content: 'Role description',
                sortable: true,
                sort: 'asc',
                width: 'auto',
            },
            {
                id: 'email',
                content: 'Email',
                sortable: true,
                sort: 'asc',
                width: 'auto',
            },
            {
                id: 'systemRole',
                content: 'System role',
                sortable: true,
                sort: 'asc',
                width: 'auto',
                align: 'center',
            },
        ],
        [],
    );

    const rolesTableData: TableDataRow[] = useMemo(
        () =>
            roles.map((role) => ({
                id: role.uuid,

                columns: [
                    <span style={{ whiteSpace: 'nowrap' }}>
                        <Link to={`./detail/${role.uuid}`}>{role.name}</Link>
                    </span>,

                    role.description || '',

                    role.email || '',

                    <Badge key="systemRole" color={role.systemRole ? 'danger' : 'success'}>
                        {role.systemRole ? 'Yes' : 'No'}
                    </Badge>,
                ],
            })),
        [roles],
    );

    return (
        <div>
            <Widget
                title="List of Roles"
                busy={isBusy && !(isFetching && roles.length === 0)}
                enableBusyOverlay
                widgetLockName={LockWidgetNameEnum.ListOfRoles}
                widgetButtons={buttons}
                titleSize="large"
                refreshAction={getFreshData}
            >
                <CustomTable
                    headers={rolesTableHeader}
                    data={rolesTableData}
                    onCheckedRowsChanged={setCheckedRows}
                    canSearch={true}
                    hasCheckboxes={true}
                    hasPagination={true}
                    disableSearchControls={isBusy}
                    disableSelectionControls={isBusy}
                    disablePaginationControls={isBusy}
                    isLoading={isFetching && roles.length === 0}
                />
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption={`Delete ${checkedRows.length > 1 ? 'Roles' : 'a Role'}`}
                body={`You are about to delete ${checkedRows.length > 1 ? 'Roles' : 'a Role'}. Is this what you want to do?`}
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={isAddModalOpen || !!editingRoleId}
                toggle={handleCloseAddModal}
                caption={editingRoleId ? 'Edit Role' : 'Create Role'}
                size="xl"
                body={<RoleForm roleId={editingRoleId} onCancel={handleCloseAddModal} />}
            />

            <Dialog
                isOpen={isEditUsersModalOpen}
                toggle={handleCloseUsersModal}
                caption="Edit Role Users"
                size="xl"
                body={<RoleUsersForm roleId={selectedRoleId} onCancel={handleCloseUsersModal} onSuccess={handleCloseUsersModal} />}
            />
        </div>
    );
}
