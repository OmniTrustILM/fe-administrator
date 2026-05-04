import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';

import { actions, selectors } from 'ducks/acme-profiles';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import ForceDeleteErrorTable from 'components/ForceDeleteErrorTable';
import Container from 'components/Container';
import Dialog from 'components/Dialog';
import AcmeProfileForm from '../form';
import StatusBadge from 'components/StatusBadge';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { LockWidgetNameEnum } from 'types/user-interface';

export default function AdministratorsList() {
    const dispatch = useDispatch();

    const checkedRows = useSelector(selectors.checkedRows);
    const acmeProfiles = useSelector(selectors.acmeProfiles);

    const bulkDeleteErrorMessages = useSelector(selectors.bulkDeleteErrorMessages);

    const isFetching = useSelector(selectors.isFetchingList);
    const isDeleting = useSelector(selectors.isDeleting);
    const isBulkDeleting = useSelector(selectors.isBulkDeleting);
    const isUpdating = useSelector(selectors.isUpdating);
    const isBulkEnabling = useSelector(selectors.isBulkEnabling);
    const isBulkDisabling = useSelector(selectors.isBulkDisabling);
    const isBulkForceDeleting = useSelector(selectors.isBulkForceDeleting);
    const isCreating = useSelector(selectors.isCreating);
    const createAcmeProfileSucceeded = useSelector(selectors.createAcmeProfileSucceeded);
    const updateAcmeProfileSucceeded = useSelector(selectors.updateAcmeProfileSucceeded);

    const isBusy = isFetching || isDeleting || isUpdating || isBulkDeleting || isBulkEnabling || isBulkDisabling || isBulkForceDeleting;

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [confirmForceDelete, setConfirmForceDelete] = useState<boolean>(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [editingAcmeProfileId, setEditingAcmeProfileId] = useState<string | undefined>(undefined);

    const getFreshData = useCallback(() => {
        dispatch(actions.setCheckedRows({ checkedRows: [] }));
        dispatch(actions.listAcmeProfiles());
    }, [dispatch]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    useEffect(() => {
        setConfirmForceDelete(bulkDeleteErrorMessages.length > 0);
    }, [bulkDeleteErrorMessages]);

    useRunOnSuccessfulFinish(isCreating, createAcmeProfileSucceeded, () => {
        setIsAddModalOpen(false);
        getFreshData();
    });
    useRunOnSuccessfulFinish(isUpdating, updateAcmeProfileSucceeded, () => {
        setEditingAcmeProfileId(undefined);
        getFreshData();
    });

    const handleOpenAddModal = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
        setEditingAcmeProfileId(undefined);
    }, []);

    const onAddClick = useCallback(() => {
        handleOpenAddModal();
    }, [handleOpenAddModal]);

    const onEnableClick = useCallback(() => {
        dispatch(actions.bulkEnableAcmeProfiles({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

    const onDisableClick = useCallback(() => {
        dispatch(actions.bulkDisableAcmeProfiles({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

    const onDeleteConfirmed = useCallback(() => {
        dispatch(actions.bulkDeleteAcmeProfiles({ uuids: checkedRows }));
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
        dispatch(actions.bulkForceDeleteAcmeProfiles({ uuids: checkedRows }));
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
            entityNameSingular="an ACME Profile"
            entityNamePlural="ACME Profiles"
            itemsCount={checkedRows.length}
        />
    );

    const acmeProfilesTableHeader: TableHeader[] = [
        {
            id: 'name',
            content: 'Name',
            sortable: true,
            sort: 'asc',
            width: '10%',
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
            width: '10%',
            align: 'center',
        },
        {
            id: 'directoryUrl',
            content: 'Directory URL',
            sortable: true,
            width: 'auto',
        },
        {
            id: 'status',
            content: 'Status',
            align: 'center',
            sortable: true,
            width: '7%',
        },
    ];

    const acmeProfilesTableData: TableDataRow[] = useMemo(
        () =>
            acmeProfiles.map((acmeProfile) => ({
                id: acmeProfile.uuid,

                columns: [
                    <span style={{ whiteSpace: 'nowrap' }}>
                        <Link to={`./detail/${acmeProfile.uuid}`}>{acmeProfile.name}</Link>
                    </span>,

                    <span style={{ whiteSpace: 'nowrap' }}>{acmeProfile.description || ''}</span>,

                    acmeProfile.raProfile ? (
                        <Link to={`../raprofiles/detail/${acmeProfile?.raProfile.authorityInstanceUuid}/${acmeProfile?.raProfile.uuid}`}>
                            {acmeProfile.raProfile.name ?? 'Unassigned'}
                        </Link>
                    ) : (
                        (acmeProfile.raProfile ?? 'Unassigned')
                    ),

                    acmeProfile.directoryUrl || '',

                    <StatusBadge enabled={acmeProfile.enabled} />,
                ],
            })),
        [acmeProfiles],
    );

    return (
        <Container gap={4}>
            <Widget
                dataTestId="acme-profiles-list-widget"
                title="List of ACME Profiles"
                busy={isBusy && !(isFetching && acmeProfiles.length === 0)}
                widgetLockName={LockWidgetNameEnum.ListOfACMEProfiles}
                widgetButtons={buttons}
                titleSize="large"
                refreshAction={getFreshData}
            >
                <CustomTable
                    headers={acmeProfilesTableHeader}
                    data={acmeProfilesTableData}
                    onCheckedRowsChanged={setCheckedRows}
                    canSearch={true}
                    hasCheckboxes={true}
                    hasPagination={true}
                    isLoading={isFetching && acmeProfiles.length === 0}
                />
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption={`Delete ${checkedRows.length > 1 ? 'ACME Profiles' : 'an ACME Profile'}`}
                body={`You are about to delete ${
                    checkedRows.length > 1 ? 'ACME Profiles' : 'an ACME Profile'
                } which may have associated ACME
                   Account(s). When deleted the ACME Account(s) will be revoked. Is this what you want to do?`}
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={confirmForceDelete}
                caption={`Force Delete ${checkedRows.length > 1 ? 'ACME Profiles' : 'an ACME Profile'}`}
                body={forceDeleteBody}
                toggle={() => setConfirmForceDelete(false)}
                buttons={[
                    { color: 'danger', onClick: onForceDeleteConfirmed, body: 'Force delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => dispatch(actions.clearDeleteErrorMessages()), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={isAddModalOpen || !!editingAcmeProfileId}
                toggle={handleCloseAddModal}
                caption={editingAcmeProfileId ? 'Edit ACME Profile' : 'Create ACME Profile'}
                size="xl"
                body={
                    <AcmeProfileForm acmeProfileId={editingAcmeProfileId} onCancel={handleCloseAddModal} onSuccess={handleCloseAddModal} />
                }
            />
        </Container>
    );
}
