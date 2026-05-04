import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import Container from 'components/Container';

import { actions, selectors } from 'ducks/scep-profiles';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import ForceDeleteErrorTable from 'components/ForceDeleteErrorTable';
import Dialog from 'components/Dialog';
import ScepProfileForm from '../form';
import StatusBadge from 'components/StatusBadge';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { LockWidgetNameEnum } from 'types/user-interface';

export default function ScepProfiles() {
    const dispatch = useDispatch();

    const checkedRows = useSelector(selectors.checkedRows);
    const scepProfiles = useSelector(selectors.scepProfiles);

    const bulkDeleteErrorMessages = useSelector(selectors.bulkDeleteErrorMessages);

    const isFetching = useSelector(selectors.isFetchingList);
    const isDeleting = useSelector(selectors.isDeleting);
    const isBulkDeleting = useSelector(selectors.isBulkDeleting);
    const isUpdating = useSelector(selectors.isUpdating);
    const isBulkEnabling = useSelector(selectors.isBulkEnabling);
    const isBulkDisabling = useSelector(selectors.isBulkDisabling);
    const isBulkForceDeleting = useSelector(selectors.isBulkForceDeleting);
    const isCreating = useSelector(selectors.isCreating);
    const createScepProfileSucceeded = useSelector(selectors.createScepProfileSucceeded);
    const updateScepProfileSucceeded = useSelector(selectors.updateScepProfileSucceeded);

    const isBusy = isFetching || isDeleting || isUpdating || isBulkDeleting || isBulkEnabling || isBulkDisabling || isBulkForceDeleting;

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [confirmForceDelete, setConfirmForceDelete] = useState<boolean>(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [editingScepProfileId, setEditingScepProfileId] = useState<string | undefined>(undefined);

    const getFreshData = useCallback(() => {
        dispatch(actions.setCheckedRows({ checkedRows: [] }));
        dispatch(actions.listScepProfiles());
    }, [dispatch]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    useEffect(() => {
        setConfirmForceDelete(bulkDeleteErrorMessages.length > 0);
    }, [bulkDeleteErrorMessages]);

    useRunOnSuccessfulFinish(isCreating, createScepProfileSucceeded, () => {
        setIsAddModalOpen(false);
        getFreshData();
    });
    useRunOnSuccessfulFinish(isUpdating, updateScepProfileSucceeded, () => {
        setEditingScepProfileId(undefined);
        getFreshData();
    });

    const handleOpenAddModal = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
        setEditingScepProfileId(undefined);
    }, []);

    const onAddClick = useCallback(() => {
        handleOpenAddModal();
    }, [handleOpenAddModal]);

    const onEnableClick = useCallback(() => {
        dispatch(actions.bulkEnableScepProfiles({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

    const onDisableClick = useCallback(() => {
        dispatch(actions.bulkDisableScepProfiles({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

    const onDeleteConfirmed = useCallback(() => {
        dispatch(actions.bulkDeleteScepProfiles({ uuids: checkedRows }));
        setConfirmDelete(false);
    }, [checkedRows, dispatch]);

    const setCheckedRows = useCallback(
        (rows: (string | number)[]) => {
            dispatch(actions.setCheckedRows({ checkedRows: rows as string[] }));
        },
        [dispatch],
    );

    const onForceDeleteConfirmed = useCallback(() => {
        dispatch(actions.clearDeleteErrorMessages());
        dispatch(actions.bulkForceDeleteScepProfiles({ uuids: checkedRows }));
    }, [dispatch, checkedRows]);

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
        ],
        [checkedRows, handleOpenAddModal, onEnableClick, onDisableClick],
    );

    const forceDeleteBody = (
        <ForceDeleteErrorTable
            items={bulkDeleteErrorMessages}
            entityNameSingular="a SCEP Profile"
            entityNamePlural="SCEP Profiles"
            itemsCount={checkedRows.length}
        />
    );

    const scepProfilesTableHeader: TableHeader[] = useMemo(
        () => [
            {
                id: 'name',
                content: 'Name',
                sortable: true,
                sort: 'asc',
                width: '30%',
            },
            {
                id: 'description',
                content: 'Description',
                sortable: true,
                width: '10%',
            },
            {
                id: 'raProfileName',
                content: 'RA Profile Name',
                sortable: true,
                width: '13%',
                align: 'center',
            },
            {
                id: 'status',
                content: 'Status',
                align: 'center',
                sortable: true,
                width: '7%',
            },
            {
                id: 'scepUrl',
                content: 'SCEP URL',
                sortable: true,
                width: '33%',
                align: 'center',
            },
            {
                id: 'enableIntune',
                content: 'Intune',
                align: 'center',
                sortable: true,
                width: '7%',
            },
        ],
        [],
    );

    const scepProfilesTableData: TableDataRow[] = useMemo(
        () =>
            scepProfiles.map((scepProfile) => ({
                id: scepProfile.uuid,

                columns: [
                    <span style={{ whiteSpace: 'nowrap' }}>
                        <Link to={`./detail/${scepProfile.uuid}`}>{scepProfile.name}</Link>
                    </span>,

                    <span style={{ whiteSpace: 'nowrap' }}>{scepProfile.description || ''}</span>,

                    scepProfile.raProfile ? (
                        <Link to={`../raprofiles/detail/${scepProfile?.raProfile.authorityInstanceUuid}/${scepProfile?.raProfile.uuid}`}>
                            {scepProfile.raProfile.name ?? 'Unassigned'}
                        </Link>
                    ) : (
                        (scepProfile.raProfile ?? 'Unassigned')
                    ),

                    <StatusBadge enabled={scepProfile.enabled} />,
                    <span style={{ whiteSpace: 'nowrap' }}>{scepProfile.scepUrl || ''}</span>,
                    <StatusBadge enabled={scepProfile.enableIntune} />,
                ],
            })),
        [scepProfiles],
    );

    return (
        <Container>
            <Widget
                dataTestId="scep-profiles-list-widget"
                title="List of SCEP Profiles"
                busy={isBusy && !(isFetching && scepProfiles.length === 0)}
                widgetLockName={LockWidgetNameEnum.ListOfSCEPProfiles}
                widgetButtons={buttons}
                titleSize="large"
                refreshAction={getFreshData}
            >
                <CustomTable
                    headers={scepProfilesTableHeader}
                    data={scepProfilesTableData}
                    onCheckedRowsChanged={setCheckedRows}
                    canSearch={true}
                    hasCheckboxes={true}
                    hasPagination={true}
                    isLoading={isFetching && scepProfiles.length === 0}
                />
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption={`Delete ${checkedRows.length > 1 ? 'SCEP Profiles' : 'a SCEP Profile'}`}
                body={`You are about to delete ${
                    checkedRows.length > 1 ? 'SCEP Profiles' : 'a SCEP Profile'
                } which may have associated SCEP Account(s). When deleted the SCEP Account(s) will be revoked. Is this what you want to do?`}
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                ]}
            />

            <Dialog
                isOpen={confirmForceDelete}
                caption={`Force Delete ${checkedRows.length > 1 ? 'SCEP Profiles' : 'a SCEP Profile'}`}
                body={forceDeleteBody}
                toggle={() => setConfirmForceDelete(false)}
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => dispatch(actions.clearDeleteErrorMessages()), body: 'Cancel' },
                    { color: 'danger', onClick: onForceDeleteConfirmed, body: 'Force delete' },
                ]}
            />

            <Dialog
                isOpen={isAddModalOpen || !!editingScepProfileId}
                toggle={handleCloseAddModal}
                caption={editingScepProfileId ? 'Edit SCEP Profile' : 'Create SCEP Profile'}
                size="xl"
                body={
                    <ScepProfileForm scepProfileId={editingScepProfileId} onCancel={handleCloseAddModal} onSuccess={handleCloseAddModal} />
                }
            />
        </Container>
    );
}
