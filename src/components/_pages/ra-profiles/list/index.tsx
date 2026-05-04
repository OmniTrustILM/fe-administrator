import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';

import Badge from 'components/Badge';

import { actions, selectors } from 'ducks/ra-profiles';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import StatusBadge from 'components/StatusBadge';
import Widget from 'components/Widget';
import RaProfileForm from '../form';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { LockWidgetNameEnum } from 'types/user-interface';

function RaProfileList() {
    const dispatch = useDispatch();

    const checkedRows = useSelector(selectors.checkedRows);
    const raProfiles = useSelector(selectors.raProfiles);

    const isFetching = useSelector(selectors.isFetchingList);
    const isDeleting = useSelector(selectors.isDeleting);
    const isBulkDeleting = useSelector(selectors.isBulkDeleting);
    const isUpdating = useSelector(selectors.isUpdating);
    const isCreating = useSelector(selectors.isCreating);
    const createRaProfileSucceeded = useSelector(selectors.createRaProfileSucceeded);
    const updateRaProfileSucceeded = useSelector(selectors.updateRaProfileSucceeded);
    const isEnabling = useSelector(selectors.isEnabling);
    const isBulkEnabling = useSelector(selectors.isBulkEnabling);
    const isBulkDisabling = useSelector(selectors.isBulkDisabling);

    const isBusy = isFetching || isDeleting || isUpdating || isBulkDeleting || isEnabling || isBulkEnabling || isBulkDisabling;

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [complianceCheck, setComplianceCheck] = useState<boolean>(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [editingRaProfileId, setEditingRaProfileId] = useState<string | undefined>(undefined);
    const [editingAuthorityId, setEditingAuthorityId] = useState<string | undefined>(undefined);

    const getFreshData = useCallback(() => {
        dispatch(actions.setCheckedRows({ checkedRows: [] }));
        dispatch(actions.listRaProfiles());
    }, [dispatch]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    useRunOnSuccessfulFinish(isCreating, createRaProfileSucceeded, () => {
        setIsAddModalOpen(false);
        setEditingAuthorityId(undefined);
        getFreshData();
    });
    useRunOnSuccessfulFinish(isUpdating, updateRaProfileSucceeded, () => {
        setEditingRaProfileId(undefined);
        setEditingAuthorityId(undefined);
        getFreshData();
    });

    const handleOpenAddModal = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
        setEditingRaProfileId(undefined);
        setEditingAuthorityId(undefined);
    }, []);

    const onAddClick = useCallback(() => {
        handleOpenAddModal();
    }, [handleOpenAddModal]);

    const onEnableClick = useCallback(() => {
        dispatch(actions.bulkEnableRaProfiles({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

    const onDisableClick = useCallback(() => {
        dispatch(actions.bulkDisableRaProfiles({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

    const onDeleteConfirmed = useCallback(() => {
        dispatch(actions.bulkDeleteRaProfiles({ uuids: checkedRows }));
        setConfirmDelete(false);
    }, [checkedRows, dispatch]);

    const onComplianceCheckConfirmed = useCallback(() => {
        dispatch(actions.checkCompliance({ uuids: checkedRows }));
        setComplianceCheck(false);
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
            {
                icon: 'check',
                disabled: checkedRows.length === 0,
                tooltip: 'Enable',
                onClick: () => {
                    onEnableClick();
                },
            },
            {
                icon: 'times',
                disabled: checkedRows.length === 0,
                tooltip: 'Disable',
                onClick: () => {
                    onDisableClick();
                },
            },
            {
                icon: 'gavel',
                disabled: checkedRows.length === 0,
                tooltip: 'Check Compliance',
                onClick: () => {
                    setComplianceCheck(true);
                },
            },
        ],
        [checkedRows, handleOpenAddModal, onEnableClick, onDisableClick],
    );

    const raProfilesTableHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'name',
                content: 'Name',
                sortable: true,
                sort: 'asc',
                width: '20%',
            },
            {
                id: 'description',
                content: 'Description',
                sortable: true,
                width: '38%',
            },
            {
                id: 'authority',
                align: 'center',
                content: 'Authority',
                sortable: true,
                width: '15%',
            },
            {
                id: 'enabledProtocols',
                content: 'Enabled Protocols',
                align: 'center',
                sortable: true,
                width: '20%',
            },
            {
                id: 'status',
                align: 'center',
                content: 'Status',
                sortable: true,
                width: '7%',
            },
        ],
        [],
    );

    const getProtocolsForDisplay = useCallback(
        (protocols?: string[]) =>
            !protocols ? (
                <></>
            ) : (
                <>
                    {protocols.map((protocol) => (
                        <Fragment key={protocol}>
                            <Badge color="secondary">{protocol}</Badge>
                            &nbsp;
                        </Fragment>
                    ))}
                </>
            ),
        [],
    );

    const profilesTableData: TableDataRow[] = useMemo(
        () =>
            raProfiles.map((raProfile) => ({
                id: raProfile.uuid,

                columns: [
                    <span style={{ whiteSpace: 'nowrap' }}>
                        <Link to={`./detail/${raProfile.authorityInstanceUuid || 'unknown'}/${raProfile.uuid}`}>{raProfile.name}</Link>
                    </span>,

                    <span style={{ whiteSpace: 'nowrap' }}>{raProfile.description || ''}</span>,

                    raProfile.authorityInstanceName ? (
                        <Link to={`../authorities/detail/${raProfile.authorityInstanceUuid}`}>
                            {raProfile.authorityInstanceName ?? 'Unassigned'}
                        </Link>
                    ) : (
                        (raProfile.authorityInstanceName ?? 'Unassigned')
                    ),

                    getProtocolsForDisplay(raProfile.enabledProtocols),

                    <StatusBadge enabled={raProfile.enabled} />,
                ],
            })),
        [getProtocolsForDisplay, raProfiles],
    );

    return (
        <>
            <Widget
                title="List of RA Profiles"
                busy={isBusy && !(isFetching && raProfiles.length === 0)}
                widgetLockName={LockWidgetNameEnum.ListOfRAProfiles}
                widgetButtons={buttons}
                titleSize="large"
                refreshAction={getFreshData}
            >
                <CustomTable
                    headers={raProfilesTableHeaders}
                    data={profilesTableData}
                    onCheckedRowsChanged={setCheckedRows}
                    canSearch
                    hasCheckboxes
                    hasPagination
                    isLoading={isFetching && raProfiles.length === 0}
                />
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption={`Delete RA ${checkedRows.length > 1 ? 'Profiles' : 'Profile'}`}
                body={`You are about to delete ${checkedRows.length > 1 ? 'RA profiles' : 'this RA Profile'}. Is this what you want to do?`}
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'primary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                ]}
            />

            <Dialog
                isOpen={complianceCheck}
                caption={`Initiate Compliance Check`}
                body={'Initiate the compliance check for the selected RA Profile(s)?'}
                toggle={() => setComplianceCheck(false)}
                noBorder
                buttons={[
                    { color: 'primary', variant: 'outline', onClick: () => setComplianceCheck(false), body: 'Cancel' },
                    { color: 'primary', onClick: onComplianceCheckConfirmed, body: 'Yes' },
                ]}
            />

            <Dialog
                isOpen={isAddModalOpen || !!editingRaProfileId}
                toggle={handleCloseAddModal}
                caption={editingRaProfileId ? 'Edit RA Profile' : 'Create RA Profile'}
                size="xl"
                body={<RaProfileForm raProfileId={editingRaProfileId} authorityId={editingAuthorityId} onCancel={handleCloseAddModal} />}
            />
        </>
    );
}

export default RaProfileList;
