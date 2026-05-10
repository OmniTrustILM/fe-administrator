import type { TableDataRow, TableHeader } from 'components/CustomTable';
import { useCallback, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { actions, selectors } from 'ducks/oids';
import { EntityType } from 'ducks/filters';
import PagedList from 'components/PagedList/PagedList';
import type { ApiClients } from 'src/api';
import { Link } from 'react-router';
import { LockWidgetNameEnum } from 'types/user-interface';
import type { SearchRequestModel } from 'types/certificate';
import { selectors as enumSelectors } from 'ducks/enums';
import { PlatformEnum } from 'types/openapi';
import Dialog from 'components/Dialog';
import CustomOIDForm from 'components/_pages/custom-oid/form';
import type { WidgetButtonProps } from 'components/WidgetButtons';

export default function CustomOIDList() {
    const dispatch = useDispatch();

    const oids = useSelector(selectors.oids);

    const isDeleting = useSelector(selectors.isDeleting);
    const isUpdating = useSelector(selectors.isUpdating);
    const isCreating = useSelector(selectors.isCreating);
    const createOidSucceeded = useSelector(selectors.createOidSucceeded);
    const updateOidSucceeded = useSelector(selectors.updateOidSucceeded);
    const isBusy = isDeleting || isUpdating;

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingOidId, setEditingOidId] = useState<string | undefined>(undefined);

    const oidCategoryEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.OidCategory));
    const oidsRowHeaders: TableHeader[] = useMemo(
        () => [
            {
                content: 'OID',
                sortable: true,
                sort: 'asc',
                id: 'oid',
                width: '15%',
            },
            {
                content: 'Display Name',
                align: 'center',
                sortable: true,
                id: 'oidName',
                width: '30%',
            },
            {
                content: 'Description',
                align: 'center',
                sortable: true,
                id: 'oidDescription',
                width: '40%',
            },
            {
                content: 'Category',
                align: 'center',
                sortable: true,
                id: 'category',
                width: '15%',
            },
        ],
        [],
    );
    const onListCallback = useCallback(
        (filters: SearchRequestModel) => {
            return dispatch(actions.listOIDs(filters));
        },
        [dispatch],
    );

    const oidsList: TableDataRow[] = useMemo(() => {
        return oids.map((oid) => ({
            id: oid.oid,
            columns: [
                <Link key={oid.oid} to={`./detail/${oid.oid}`}>
                    {oid.oid}
                </Link>,
                oid.displayName || '',
                oid.description || '',
                oidCategoryEnum[oid.category].label || '',
            ],
        }));
    }, [oids, oidCategoryEnum]);

    const onDeleteCallback = useCallback(
        (oids: string[]) => {
            return dispatch(actions.bulkDeleteOIDs({ oids: oids }));
        },
        [dispatch],
    );

    const handleOpenAddModal = useCallback(() => {
        setEditingOidId(undefined);
        setIsAddModalOpen(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
        setEditingOidId(undefined);
    }, []);

    const getFreshData = useCallback(() => {
        onListCallback({ itemsPerPage: 10, pageNumber: 1, filters: [] });
    }, [onListCallback]);

    useRunOnSuccessfulFinish(isCreating, createOidSucceeded, () => {
        if (isAddModalOpen) {
            handleCloseAddModal();
            getFreshData();
        }
    });
    useRunOnSuccessfulFinish(isUpdating, updateOidSucceeded, () => {
        if (isAddModalOpen) {
            handleCloseAddModal();
            getFreshData();
        }
    });

    const additionalButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: false,
                tooltip: 'Create Custom OID',
                onClick: handleOpenAddModal,
            },
        ],
        [handleOpenAddModal],
    );

    return (
        <>
            <PagedList
                entity={EntityType.OID}
                onListCallback={onListCallback}
                onDeleteCallback={onDeleteCallback}
                getAvailableFiltersApi={useCallback((apiClients: ApiClients) => apiClients.oids.getCustomOidEntrySearchableFields(), [])}
                headers={oidsRowHeaders}
                data={oidsList}
                isBusy={isBusy}
                title="Custom OIDs"
                entityNameSingular="an OID"
                entityNamePlural="OIDs"
                filterTitle="Certificates by Compliance"
                pageWidgetLockName={LockWidgetNameEnum.EntityStore}
                addHidden
                additionalButtons={additionalButtons}
            />
            <Dialog
                isOpen={isAddModalOpen || !!editingOidId}
                toggle={handleCloseAddModal}
                caption={editingOidId ? 'Edit Custom OID' : 'Create Custom OID'}
                size="xl"
                body={<CustomOIDForm oidId={editingOidId} onCancel={handleCloseAddModal} />}
            />
        </>
    );
}
