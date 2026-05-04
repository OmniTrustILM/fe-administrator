import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';

import { actions, selectors } from 'ducks/certificateGroups';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import GroupForm from '../form';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { LockWidgetNameEnum } from 'types/user-interface';

export default function GroupList() {
    const dispatch = useDispatch();

    const checkedRows = useSelector(selectors.checkedRows);
    const groups = useSelector(selectors.certificateGroups);

    const isFetching = useSelector(selectors.isFetchingList);
    const isDeleting = useSelector(selectors.isDeleting);
    const isBulkDeleting = useSelector(selectors.isBulkDeleting);
    const isUpdating = useSelector(selectors.isUpdating);
    const isCreating = useSelector(selectors.isCreating);
    const createGroupSucceeded = useSelector(selectors.createGroupSucceeded);
    const updateGroupSucceeded = useSelector(selectors.updateGroupSucceeded);

    const isBusy = isFetching || isDeleting || isUpdating || isBulkDeleting;

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [editingGroupId, setEditingGroupId] = useState<string | undefined>(undefined);

    const getFreshData = useCallback(() => {
        dispatch(actions.setCheckedRows({ checkedRows: [] }));
        dispatch(actions.listGroups());
    }, [dispatch]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    useRunOnSuccessfulFinish(isCreating, createGroupSucceeded, () => {
        setIsAddModalOpen(false);
        getFreshData();
    });
    useRunOnSuccessfulFinish(isUpdating, updateGroupSucceeded, () => {
        setEditingGroupId(undefined);
        getFreshData();
    });

    const handleOpenAddModal = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
        setEditingGroupId(undefined);
    }, []);

    const onAddClick = useCallback(() => {
        handleOpenAddModal();
    }, [handleOpenAddModal]);

    const onDeleteConfirmed = useCallback(() => {
        dispatch(actions.bulkDeleteGroups({ uuids: checkedRows }));
        setConfirmDelete(false);
    }, [checkedRows, dispatch]);

    const setCheckedRows = useCallback(
        (rows: (string | number)[]) => {
            dispatch(actions.setCheckedRows({ checkedRows: rows as string[] }));
        },
        [dispatch],
    );

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: false,
                tooltip: 'Create',
                onClick: handleOpenAddModal,
            },
            {
                icon: 'trash',
                disabled: checkedRows.length === 0,
                tooltip: 'Delete',
                onClick: () => {
                    setConfirmDelete(true);
                },
            },
        ],
        [checkedRows, handleOpenAddModal],
    );

    const groupsTableHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'name',
                content: 'Name',
                sortable: true,
                sort: 'asc',
                width: '15%',
            },
            {
                id: 'description',
                content: 'Description',
                sortable: true,
            },
            {
                id: 'email',
                content: 'Email',
                sortable: true,
                sort: 'asc',
                width: '15%',
            },
        ],
        [],
    );

    const groupsTableData: TableDataRow[] = useMemo(
        () =>
            groups.map((group) => ({
                id: group.uuid,

                columns: [<Link to={`./detail/${group.uuid}`}>{group.name}</Link>, group.description || '', group.email || ''],
            })),
        [groups],
    );

    return (
        <>
            <Widget
                title="List of Groups"
                busy={isBusy && !(isFetching && groups.length === 0)}
                widgetLockName={LockWidgetNameEnum.ListOfGroups}
                widgetButtons={buttons}
                titleSize="large"
                refreshAction={getFreshData}
            >
                <CustomTable
                    headers={groupsTableHeaders}
                    data={groupsTableData}
                    onCheckedRowsChanged={setCheckedRows}
                    canSearch
                    hasCheckboxes
                    hasPagination
                    isLoading={isFetching && groups.length === 0}
                />
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption={`Delete ${checkedRows.length > 1 ? 'Groups' : 'a Group'}`}
                body={`You are about to delete ${checkedRows.length > 1 ? 'Groups' : 'a Group'}. Is this what you want to do?`}
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={isAddModalOpen || !!editingGroupId}
                toggle={handleCloseAddModal}
                caption={editingGroupId ? 'Edit Group' : 'Create Group'}
                size="xl"
                body={<GroupForm groupId={editingGroupId} onCancel={handleCloseAddModal} onSuccess={handleCloseAddModal} />}
            />
        </>
    );
}
