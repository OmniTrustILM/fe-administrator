import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import Badge from 'components/Badge';

import { actions, selectors } from 'ducks/credentials';

import Widget from 'components/Widget';
import CredentialForm from '../form';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import { LockWidgetNameEnum } from 'types/user-interface';

function CredentialList() {
    const dispatch = useDispatch();

    const checkedRows = useSelector(selectors.checkedRows);
    const credentials = useSelector(selectors.credentials);

    const isFetching = useSelector(selectors.isFetchingList);
    const isDeleting = useSelector(selectors.isDeleting);
    const isBulkDeleting = useSelector(selectors.isBulkDeleting);
    const isCreating = useSelector(selectors.isCreating);
    const createCredentialSucceeded = useSelector(selectors.createCredentialSucceeded);
    const isUpdating = useSelector(selectors.isUpdating);
    const updateCredentialSucceeded = useSelector(selectors.updateCredentialSucceeded);

    const isBusy = isFetching || isDeleting || isBulkDeleting;

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [editingCredentialId, setEditingCredentialId] = useState<string | undefined>(undefined);

    const getFreshData = useCallback(() => {
        dispatch(actions.setCheckedRows({ checkedRows: [] }));
        dispatch(actions.clearDeleteErrorMessages());
        dispatch(actions.listCredentials());
    }, [dispatch]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    useRunOnSuccessfulFinish(isCreating, createCredentialSucceeded, () => {
        setIsAddModalOpen(false);
        getFreshData();
    });
    useRunOnSuccessfulFinish(isUpdating, updateCredentialSucceeded, () => {
        setEditingCredentialId(undefined);
        getFreshData();
    });

    const handleOpenAddModal = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
        setEditingCredentialId(undefined);
    }, []);

    const onAddClick = useCallback(() => {
        handleOpenAddModal();
    }, [handleOpenAddModal]);

    const onDeleteConfirmed = useCallback(() => {
        setConfirmDelete(false);
        dispatch(actions.clearDeleteErrorMessages());
        dispatch(actions.bulkDeleteCredentials({ uuids: checkedRows }));
    }, [dispatch, checkedRows]);

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

    const credentialRowHeaders: TableHeader[] = useMemo(
        () => [
            {
                content: 'Name',
                sortable: true,
                sort: 'asc',
                id: 'adminName',
                width: '50%',
            },
            {
                content: 'Kind',
                sortable: true,
                id: 'kind',
                width: '20%',
                align: 'center',
            },
            {
                content: 'Credential Provider',
                sortable: true,
                id: 'credentialProviderName',
                width: '30%',
                align: 'center',
            },
        ],
        [],
    );

    const credentialsData: TableDataRow[] = useMemo(
        () =>
            credentials.map((credential) => ({
                id: credential.uuid,
                columns: [
                    <Link to={`./detail/${credential.uuid}`}>{credential.name}</Link>,

                    <Badge color="primary">{credential.kind}</Badge>,

                    credential.connectorName ? (
                        <Link to={`../connectors/detail/${credential.connectorUuid}`}>{credential.connectorName ?? 'Unassigned'}</Link>
                    ) : (
                        (credential.connectorName ?? 'Unassigned')
                    ),
                ],
            })),

        [credentials],
    );

    return (
        <>
            <Widget
                title="Credential Store"
                busy={isBusy && !(isFetching && credentials.length === 0)}
                widgetLockName={LockWidgetNameEnum.CredentialStore}
                widgetButtons={buttons}
                titleSize="large"
                refreshAction={getFreshData}
            >
                <CustomTable
                    headers={credentialRowHeaders}
                    data={credentialsData}
                    onCheckedRowsChanged={setCheckedRows}
                    hasCheckboxes={true}
                    hasPagination={true}
                    canSearch={true}
                    isLoading={isFetching && credentials.length === 0}
                />
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption={`Delete ${checkedRows.length > 1 ? 'Credentials' : 'a Credential'}`}
                body={`You are about to delete ${checkedRows.length > 1 ? 'Credentials' : 'a Credential'}. Is this what you want to do?`}
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                ]}
            />

            <Dialog
                isOpen={isAddModalOpen || !!editingCredentialId}
                toggle={handleCloseAddModal}
                caption={editingCredentialId ? 'Edit Credential' : 'Create Credential'}
                size="xl"
                body={<CredentialForm credentialId={editingCredentialId} onCancel={handleCloseAddModal} onSuccess={handleCloseAddModal} />}
            />
        </>
    );
}

export default CredentialList;
