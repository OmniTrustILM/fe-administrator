import { actions as approvalActions, selectors as approvalSelectors } from 'ducks/approvals';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import TabLayout from 'components/Layout/TabLayout';
import StatusBadge from 'components/StatusBadge';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { ApprovalDtoStatusEnum } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { dateFormatter } from 'utils/dateUtil';
import Button from 'components/Button';
import { ArrowRight } from 'lucide-react';

export default function ApprovalsList() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const approvals = useSelector(approvalSelectors.approvals);
    const approvalsTotalItems = useSelector(approvalSelectors.approvalsTotalItems);

    const userApprovals = useSelector(approvalSelectors.userApprovals);
    const userApprovalsTotalItems = useSelector(approvalSelectors.userApprovalsTotalItems);

    const isFetching = useSelector(approvalSelectors.isFetchingList);

    const [approveApprovalDialogOpen, setApproveApprovalDialogOpen] = useState<boolean>(false);
    const [rejectApprovalDialogOpen, setRejectApprovalDialogOpen] = useState<boolean>(false);

    const [pageNumber, setPageNumber] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [checkedRows, setCheckedRows] = useState<string[]>([]);
    const [showAllApprovals, setShowAllApprovals] = useState<boolean>(false);
    const [showHistory, setShowHistory] = useState<boolean>(false);

    const isBusy = useMemo(() => isFetching, [isFetching]);

    const listUserApprovals = useCallback(() => {
        dispatch(
            approvalActions.listUserApprovals({
                history: showHistory,
                itemsPerPage: pageSize,
                pageNumber,
            }),
        );
        setCheckedRows([]);
    }, [dispatch, pageNumber, pageSize, showHistory]);

    const listApprovals = useCallback(() => {
        dispatch(approvalActions.listApprovals({ itemsPerPage: pageSize, pageNumber }));
        setCheckedRows([]);
    }, [dispatch, pageNumber, pageSize]);

    const getFreshData = useCallback(() => {
        if (showAllApprovals) {
            listApprovals();
        } else {
            listUserApprovals();
        }
    }, [listApprovals, listUserApprovals, showAllApprovals]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    const onApproveApprover = useCallback(() => {
        if (!checkedRows) return;
        dispatch(
            approvalActions.approveApproval({
                uuid: checkedRows[0],
            }),
        );
        setApproveApprovalDialogOpen(false);
    }, [dispatch, checkedRows, setApproveApprovalDialogOpen]);

    const onRejectApprover = useCallback(() => {
        if (!checkedRows) return;
        dispatch(
            approvalActions.rejectApproval({
                uuid: checkedRows[0],
            }),
        );
        setRejectApprovalDialogOpen(false);
    }, [dispatch, checkedRows, setRejectApprovalDialogOpen]);

    const selectedApprovalStatus = useMemo(() => {
        if (!checkedRows) return;
        const selectedApproval = approvals.find((approval) => approval.approvalUuid === checkedRows[0]);
        return selectedApproval?.status;
    }, [checkedRows, approvals]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'check',
                disabled: !checkedRows.length || selectedApprovalStatus !== ApprovalDtoStatusEnum.Pending,
                tooltip: 'Approve',
                hidden: !showAllApprovals,
                onClick: () => {
                    setApproveApprovalDialogOpen(true);
                },
            },
            {
                icon: 'times',
                disabled: !checkedRows.length || selectedApprovalStatus !== ApprovalDtoStatusEnum.Pending,
                hidden: !showAllApprovals,
                tooltip: 'Reject',
                onClick: () => {
                    setRejectApprovalDialogOpen(true);
                },
            },
            {
                icon: 'history',
                tooltip: 'Show History',
                disabled: showAllApprovals,
                hidden: showAllApprovals,
                onClick: () => {
                    setShowHistory(!showHistory);
                },
            },
        ],
        [checkedRows, selectedApprovalStatus, showHistory, showAllApprovals],
    );

    const approvalProfilesTableHeader: TableHeader[] = useMemo(
        () => [
            {
                id: 'approvalUUID',
                content: 'Approval UUID ',
                sort: 'asc',
            },
            {
                id: 'approvalProfile',
                content: 'Approval Profile',
            },
            {
                id: 'status',
                content: 'Status',
            },
            {
                id: 'requestedBy',
                content: 'Requested By',
            },
            {
                id: 'resource',
                content: 'Resource',
            },

            {
                id: 'action',
                content: 'Action',
            },

            {
                id: 'createdAt',
                content: 'Created At',
            },

            {
                id: 'closedAt',
                content: 'Closed At',
            },
        ],
        [],
    );

    const approvalProfilesTableData: TableDataRow[] = useMemo(() => {
        const data = showAllApprovals ? approvals : userApprovals;

        return data.map((approval) => ({
            id: approval.approvalUuid,
            columns: [
                <Link key="uuid" to={`./detail/${approval.approvalUuid}`}>
                    {approval.approvalUuid}
                </Link>,
                <Link key="profile" to={`../../../approvalprofiles/detail/${approval.approvalProfileUuid}`}>
                    {approval.approvalProfileName}
                </Link>,
                <div key="status-nav" className="flex items-center gap-1">
                    <StatusBadge textStatus={approval.status} />
                    <Button
                        variant="transparent"
                        className="!p-1"
                        onClick={() => {
                            navigate(`../../${approval.resource}/detail/${approval.objectUuid}`);
                        }}
                    >
                        <ArrowRight size={16} strokeWidth={1.5} />
                    </Button>
                </div>,
                approval.creatorUsername ? (
                    <Link key="creator" to={`../users/detail/${approval.creatorUuid}`}>
                        {approval.creatorUsername ?? 'Unassigned'}
                    </Link>
                ) : (
                    (approval.creatorUsername ?? 'Unassigned')
                ),
                approval.resource || '',
                approval.resourceAction || '',
                approval.createdAt ? dateFormatter(approval.createdAt) : '',
                approval.closedAt ? dateFormatter(approval.closedAt) : '',
            ],
        }));
    }, [approvals, userApprovals, showAllApprovals, navigate]);

    return (
        <>
            <TabLayout
                tabs={[
                    {
                        title: 'My Approvals',
                        content: (
                            <Widget
                                title="My Approvals"
                                busy={isBusy && !(isFetching && userApprovals.length === 0)}
                                widgetButtons={buttons}
                                titleSize="large"
                                refreshAction={listUserApprovals}
                            >
                                <CustomTable
                                    headers={approvalProfilesTableHeader}
                                    data={approvalProfilesTableData}
                                    hasPagination={true}
                                    hasCheckboxes={false}
                                    checkedRows={checkedRows}
                                    onCheckedRowsChanged={(checkedRows) => {
                                        setCheckedRows(checkedRows as string[]);
                                    }}
                                    multiSelect={false}
                                    onPageChanged={setPageNumber}
                                    onPageSizeChanged={setPageSize}
                                    paginationData={{
                                        pageSize: pageSize,
                                        totalItems: userApprovalsTotalItems || 0,
                                        itemsPerPageOptions: [10, 20, 50, 100],
                                        loadedPageSize: pageSize,
                                        totalPages: userApprovalsTotalItems ? Math.ceil(userApprovalsTotalItems / pageSize) : 0,
                                        page: pageNumber,
                                    }}
                                    isLoading={isFetching && userApprovals.length === 0}
                                />
                            </Widget>
                        ),
                        onClick: () => {
                            setShowAllApprovals(false);
                            setPageSize(10);
                            setPageNumber(1);
                        },
                    },
                    {
                        title: 'List of Approvals',
                        content: (
                            <Widget
                                title="List of Approvals"
                                busy={isBusy && !(isFetching && approvals.length === 0)}
                                widgetButtons={buttons}
                                widgetLockName={LockWidgetNameEnum.ListOfApprovals}
                                titleSize="large"
                                refreshAction={listApprovals}
                            >
                                <CustomTable
                                    headers={approvalProfilesTableHeader}
                                    data={approvalProfilesTableData}
                                    hasPagination={true}
                                    hasCheckboxes
                                    checkedRows={checkedRows}
                                    onCheckedRowsChanged={(checkedRows) => {
                                        setCheckedRows(checkedRows as string[]);
                                    }}
                                    multiSelect={false}
                                    onPageChanged={setPageNumber}
                                    onPageSizeChanged={setPageSize}
                                    paginationData={{
                                        pageSize: pageSize,
                                        totalItems: approvalsTotalItems || 0,
                                        itemsPerPageOptions: [10, 20, 50, 100],
                                        loadedPageSize: pageSize,
                                        totalPages: approvalsTotalItems ? Math.ceil(approvalsTotalItems / pageSize) : 0,
                                        page: pageNumber,
                                    }}
                                    isLoading={isFetching && approvals.length === 0}
                                />
                            </Widget>
                        ),
                        onClick: () => {
                            setShowAllApprovals(true);
                            setPageSize(10);
                            setPageNumber(1);
                        },
                    },
                ]}
            />

            <Dialog
                isOpen={approveApprovalDialogOpen}
                caption="Accept the selected Approval?"
                body="Are you sure you want to accept the selected Approval?"
                toggle={() => setApproveApprovalDialogOpen(false)}
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setApproveApprovalDialogOpen(false), body: 'Cancel' },
                    { color: 'primary', onClick: onApproveApprover, body: 'Yes, approve' },
                ]}
            />

            <Dialog
                isOpen={rejectApprovalDialogOpen}
                caption="Reject the selected Approval?"
                body="Are you sure you want to reject the selected Approval?"
                toggle={() => setRejectApprovalDialogOpen(false)}
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setRejectApprovalDialogOpen(false), body: 'Cancel' },
                    { color: 'primary', onClick: onRejectApprover, body: 'Yes, reject' },
                ]}
            />
        </>
    );
}
