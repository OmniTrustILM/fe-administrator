import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';

import { actions as profileApprovalActions, selectors as profileApprovalSelector } from 'ducks/approval-profiles';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import ApprovalProfileForm from '../form';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { LockWidgetNameEnum } from 'types/user-interface';

export default function ApprovalProfilesList() {
    const dispatch = useDispatch();
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    const profileApprovalList = useSelector(profileApprovalSelector.profileApprovalList);
    const profileApprovalListTotalItems = useSelector(profileApprovalSelector.totalItems);
    const isFetchingList = useSelector(profileApprovalSelector.isFetchingList);
    const isCreating = useSelector(profileApprovalSelector.isCreating);
    const createApprovalProfileSucceeded = useSelector(profileApprovalSelector.createApprovalProfileSucceeded);
    const isUpdating = useSelector(profileApprovalSelector.isUpdating);
    const updateApprovalProfileSucceeded = useSelector(profileApprovalSelector.updateApprovalProfileSucceeded);

    const isBusy = useMemo(() => isFetchingList, [isFetchingList]);

    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [editingApprovalProfileId, setEditingApprovalProfileId] = useState<string | undefined>(undefined);

    const getFreshData = useCallback(() => {
        dispatch(profileApprovalActions.listApprovalProfiles({ itemsPerPage: pageSize, pageNumber }));
    }, [dispatch, pageNumber, pageSize]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    useRunOnSuccessfulFinish(isCreating, createApprovalProfileSucceeded, () => {
        setIsAddModalOpen(false);
        getFreshData();
    });
    useRunOnSuccessfulFinish(isUpdating, updateApprovalProfileSucceeded, () => {
        setEditingApprovalProfileId(undefined);
        getFreshData();
    });

    const handleOpenAddModal = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
        setEditingApprovalProfileId(undefined);
    }, []);

    const onAddClick = useCallback(() => {
        handleOpenAddModal();
    }, [handleOpenAddModal]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: false,
                tooltip: 'Create',
                onClick: handleOpenAddModal,
            },
        ],
        [handleOpenAddModal],
    );

    const approvalProfilesTableHeader: TableHeader[] = useMemo(
        () => [
            {
                id: 'name',
                content: 'Name',
                sortable: true,
                sort: 'asc',
            },
            {
                id: 'description',
                content: 'Description',
            },
            {
                id: 'version',
                content: 'Version',
            },

            {
                id: 'approvalSteps',
                content: 'Approval Steps',
            },
            {
                id: 'associations',
                content: 'Associations',
            },
        ],
        [],
    );

    const approvalProfilesTableData: TableDataRow[] = useMemo(
        () =>
            profileApprovalList.map((approvalProfile) => ({
                id: approvalProfile.uuid,

                columns: [
                    <Link to={`./detail/${approvalProfile.uuid}`}>{approvalProfile.name}</Link>,

                    approvalProfile.description || '',

                    <>{approvalProfile.version}</>,

                    <>{approvalProfile.numberOfSteps}</>,

                    <>{approvalProfile.associations.toString()}</>,
                ],
            })),
        [profileApprovalList],
    );

    return (
        <Widget
            dataTestId="approval-profiles-list-widget"
            title="List of Approval Profiles"
            busy={isBusy && !(isFetchingList && profileApprovalList.length === 0)}
            widgetLockName={LockWidgetNameEnum.ListOfApprovalProfiles}
            widgetButtons={buttons}
            titleSize="large"
            refreshAction={getFreshData}
        >
            <CustomTable
                headers={approvalProfilesTableHeader}
                data={approvalProfilesTableData}
                hasPagination={true}
                onPageChanged={setPageNumber}
                onPageSizeChanged={setPageSize}
                paginationData={{
                    pageSize: pageSize,
                    totalItems: profileApprovalListTotalItems || 0,
                    itemsPerPageOptions: [10, 20, 50, 100],
                    loadedPageSize: pageSize,
                    totalPages: profileApprovalListTotalItems ? Math.ceil(profileApprovalListTotalItems / pageSize) : 0,
                    page: pageNumber,
                }}
                isLoading={isFetchingList && profileApprovalList.length === 0}
            />

            <Dialog
                isOpen={isAddModalOpen || !!editingApprovalProfileId}
                toggle={handleCloseAddModal}
                caption={editingApprovalProfileId ? 'Edit Approval Profile' : 'Create Approval Profile'}
                size="xl"
                body={
                    <ApprovalProfileForm
                        approvalProfileId={editingApprovalProfileId}
                        onCancel={handleCloseAddModal}
                        onSuccess={handleCloseAddModal}
                    />
                }
            />
        </Widget>
    );
}
