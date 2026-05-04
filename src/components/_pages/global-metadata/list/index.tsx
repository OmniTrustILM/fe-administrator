import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions, selectors } from 'ducks/globalMetadata';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import { PlatformEnum } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import ConnectorMetadataDialog from './ConnectorMetadataDialog';
import GlobalMetadataForm from '../form';

export default function GlobalMetadataList() {
    const dispatch = useDispatch();

    const checkedRows = useSelector(selectors.checkedRows);
    const globalMetadata = useSelector(selectors.globalMetadataList);
    const isFetching = useSelector(selectors.isFetchingList);
    const isDeleting = useSelector(selectors.isDeleting);
    const isBulkDeleting = useSelector(selectors.isBulkDeleting);
    const isUpdating = useSelector(selectors.isUpdating);
    const isBusy = isFetching || isDeleting || isUpdating || isBulkDeleting;

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [showPromote, setShowPromote] = useState<boolean>(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [editingGlobalMetadataId, setEditingGlobalMetadataId] = useState<string | undefined>(undefined);
    const attributeContentTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.AttributeContentType));

    const getFreshData = useCallback(() => {
        dispatch(actions.setCheckedRows({ checkedRows: [] }));
        dispatch(actions.listGlobalMetadata());
    }, [dispatch]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    const handleOpenAddModal = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
        setEditingGlobalMetadataId(undefined);
        getFreshData();
    }, [getFreshData]);

    const onDeleteConfirmed = useCallback(() => {
        dispatch(actions.bulkDeleteGlobalMetadata(checkedRows));
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
            { icon: 'plus', disabled: false, tooltip: 'Create', onClick: handleOpenAddModal },
            { icon: 'push', disabled: false, tooltip: 'Promote', onClick: () => setShowPromote(true) },
            { icon: 'trash', disabled: checkedRows.length === 0, tooltip: 'Delete', onClick: () => setConfirmDelete(true) },
        ],
        [checkedRows, handleOpenAddModal],
    );

    const globalMetadataTableHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'name',
                content: 'Name',
                sortable: true,
                sort: 'asc',
                width: '35%',
            },
            {
                id: 'version',
                content: 'Version',
                sortable: true,
                width: '5%',
            },
            {
                id: 'contentType',
                content: 'Content Type',
                sortable: true,
                width: '20%',
            },
            {
                id: 'description',
                content: 'Description',
                sortable: true,
                width: '40%',
            },
        ],
        [],
    );

    const globalMetadataTableData: TableDataRow[] = useMemo(
        () =>
            globalMetadata.map((metadata) => ({
                id: metadata.uuid,
                columns: [
                    <Link to={`./detail/${metadata.uuid}`}>{metadata.name}</Link>,
                    metadata.version || '',
                    getEnumLabel(attributeContentTypeEnum, metadata.contentType),
                    metadata.description,
                ],
            })),
        [globalMetadata, attributeContentTypeEnum],
    );

    return (
        <>
            <Widget
                title="List of Global Metadata"
                busy={isBusy && !(isFetching && globalMetadata.length === 0)}
                widgetLockName={LockWidgetNameEnum.ListOfGlobalMetadata}
                widgetButtons={buttons}
                titleSize="large"
                refreshAction={getFreshData}
            >
                <CustomTable
                    headers={globalMetadataTableHeaders}
                    data={globalMetadataTableData}
                    onCheckedRowsChanged={setCheckedRows}
                    canSearch={true}
                    hasCheckboxes={true}
                    hasPagination={true}
                    isLoading={isFetching && globalMetadata.length === 0}
                />
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption={`Delete Global Metadata`}
                body={`You are about to delete selected Global Metadata. Is this what you want to do?`}
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />

            <ConnectorMetadataDialog show={showPromote} setShow={setShowPromote} />

            <Dialog
                isOpen={isAddModalOpen || !!editingGlobalMetadataId}
                toggle={handleCloseAddModal}
                caption={editingGlobalMetadataId ? 'Edit Global Metadata' : 'Create Global Metadata'}
                size="xl"
                body={
                    <GlobalMetadataForm
                        globalMetadataId={editingGlobalMetadataId}
                        onCancel={handleCloseAddModal}
                        onSuccess={handleCloseAddModal}
                    />
                }
            />
        </>
    );
}
