import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import Container from 'components/Container';

import { actions, selectors } from 'ducks/cmp-profiles';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import ForceDeleteErrorTable from 'components/ForceDeleteErrorTable';
import Dialog from 'components/Dialog';
import StatusBadge from 'components/StatusBadge';
import Widget from 'components/Widget';
import CmpProfileForm from '../form';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { PlatformEnum } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import Badge from 'components/Badge';

export default function AdministratorsList() {
    const dispatch = useDispatch();

    const checkedRows = useSelector(selectors.checkedRows);
    const cmpProfiles = useSelector(selectors.cmpProfiles);

    const bulkDeleteErrorMessages = useSelector(selectors.bulkDeleteErrorMessages);

    const isFetching = useSelector(selectors.isFetchingList);
    const isDeleting = useSelector(selectors.isDeleting);
    const isBulkDeleting = useSelector(selectors.isBulkDeleting);
    const isUpdating = useSelector(selectors.isUpdating);
    const isCreating = useSelector(selectors.isCreating);
    const createCmpProfileSucceeded = useSelector(selectors.createCmpProfileSucceeded);
    const updateCmpProfileSucceeded = useSelector(selectors.updateCmpProfileSucceeded);
    const isBulkEnabling = useSelector(selectors.isBulkEnabling);
    const isBulkDisabling = useSelector(selectors.isBulkDisabling);
    const isBulkForceDeleting = useSelector(selectors.isBulkForceDeleting);
    const cmpCmpProfileVariantEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.CmpProfileVariant));

    const isBusy = isFetching || isDeleting || isUpdating || isBulkDeleting || isBulkEnabling || isBulkDisabling || isBulkForceDeleting;

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [confirmForceDelete, setConfirmForceDelete] = useState<boolean>(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [editingCmpProfileId, setEditingCmpProfileId] = useState<string | undefined>(undefined);

    const getFreshData = useCallback(() => {
        dispatch(actions.setCheckedRows({ checkedRows: [] }));
        dispatch(actions.listCmpProfiles());
    }, [dispatch]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    useEffect(() => {
        setConfirmForceDelete(bulkDeleteErrorMessages.length > 0);
    }, [bulkDeleteErrorMessages]);

    useRunOnSuccessfulFinish(isCreating, createCmpProfileSucceeded, () => {
        setIsAddModalOpen(false);
        getFreshData();
    });
    useRunOnSuccessfulFinish(isUpdating, updateCmpProfileSucceeded, () => {
        setEditingCmpProfileId(undefined);
        getFreshData();
    });

    const handleOpenAddModal = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
        setEditingCmpProfileId(undefined);
    }, []);

    const onAddClick = useCallback(() => {
        handleOpenAddModal();
    }, [handleOpenAddModal]);

    const onEnableClick = useCallback(() => {
        dispatch(actions.bulkEnableCmpProfiles({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

    const onDisableClick = useCallback(() => {
        dispatch(actions.bulkDisableCmpProfiles({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

    const onDeleteConfirmed = useCallback(() => {
        dispatch(actions.bulkDeleteCmpProfiles({ uuids: checkedRows }));
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
        dispatch(actions.bulkForceDeleteCmpProfiles({ uuids: checkedRows }));
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
            entityNameSingular="a CMP Profile"
            entityNamePlural="CMP Profiles"
            itemsCount={checkedRows.length}
        />
    );

    const cmpProfilesTableHeader: TableHeader[] = useMemo(
        () => [
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
                id: 'cmpUrl',
                content: 'CMP URL',
                sortable: true,
                width: 'auto',
            },
            {
                id: 'variant',
                content: 'Variant',
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
        ],
        [],
    );

    const cmpProfilesTableData: TableDataRow[] = useMemo(
        () =>
            cmpProfiles.map((cmpProfile) => ({
                id: cmpProfile.uuid,

                columns: [
                    <span style={{ whiteSpace: 'nowrap' }}>
                        <Link to={`./detail/${cmpProfile.uuid}`}>{cmpProfile.name}</Link>
                    </span>,

                    <span style={{ whiteSpace: 'nowrap' }}>{cmpProfile.description || ''}</span>,

                    cmpProfile.raProfile ? (
                        <Link to={`../raprofiles/detail/${cmpProfile?.raProfile.authorityInstanceUuid}/${cmpProfile?.raProfile.uuid}`}>
                            {cmpProfile.raProfile.name ?? 'Unassigned'}
                        </Link>
                    ) : (
                        (cmpProfile.raProfile ?? 'Unassigned')
                    ),

                    cmpProfile.cmpUrl || '',
                    <Badge color="primary">{getEnumLabel(cmpCmpProfileVariantEnum, cmpProfile.variant)}</Badge>,
                    <StatusBadge enabled={cmpProfile.enabled} />,
                ],
            })),
        [cmpProfiles, cmpCmpProfileVariantEnum],
    );

    return (
        <Container>
            <Widget
                title="List of CMP Profiles"
                busy={isBusy && !(isFetching && cmpProfiles.length === 0)}
                widgetLockName={LockWidgetNameEnum.ListOfCMPProfiles}
                widgetButtons={buttons}
                titleSize="large"
                refreshAction={getFreshData}
            >
                <CustomTable
                    headers={cmpProfilesTableHeader}
                    data={cmpProfilesTableData}
                    onCheckedRowsChanged={setCheckedRows}
                    canSearch={true}
                    hasCheckboxes={true}
                    hasPagination={true}
                    isLoading={isFetching && cmpProfiles.length === 0}
                />
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption={`Delete ${checkedRows.length > 1 ? 'CMP Profiles' : 'a CMP Profile'}`}
                body={`You are about to delete ${checkedRows.length > 1 ? 'CMP Profiles' : 'a CMP Profile'}. Is this what you want to do?`}
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={confirmForceDelete}
                caption={`Force Delete ${checkedRows.length > 1 ? 'CMP Profiles' : 'a CMP Profile'}`}
                body={forceDeleteBody}
                toggle={() => setConfirmForceDelete(false)}
                buttons={[
                    { color: 'danger', onClick: onForceDeleteConfirmed, body: 'Force delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => dispatch(actions.clearDeleteErrorMessages()), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={isAddModalOpen || !!editingCmpProfileId}
                toggle={handleCloseAddModal}
                caption={editingCmpProfileId ? 'Edit CMP Profile' : 'Create CMP Profile'}
                size="xl"
                body={<CmpProfileForm cmpProfileId={editingCmpProfileId} onCancel={handleCloseAddModal} />}
            />
        </Container>
    );
}
