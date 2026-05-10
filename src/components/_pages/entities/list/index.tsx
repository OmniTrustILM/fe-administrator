import { useCallback, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import Badge from 'components/Badge';

import { actions, selectors } from 'ducks/entities';

import type { ApiClients } from '../../../../api';
import type { TableDataRow, TableHeader } from 'components/CustomTable';
import PagedList from 'components/PagedList/PagedList';
import EntityForm from '../form';
import Dialog from 'components/Dialog';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { EntityType } from 'ducks/filters';
import type { SearchRequestModel } from 'types/certificate';
import { LockWidgetNameEnum } from 'types/user-interface';

function EntityList() {
    const dispatch = useDispatch();

    const entities = useSelector(selectors.entities);

    const isDeleting = useSelector(selectors.isDeleting);
    const isUpdating = useSelector(selectors.isUpdating);
    const isCreating = useSelector(selectors.isCreating);
    const createEntitySucceeded = useSelector(selectors.createEntitySucceeded);
    const updateEntitySucceeded = useSelector(selectors.updateEntitySucceeded);

    const isBusy = isDeleting || isUpdating;

    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [editingEntityId, setEditingEntityId] = useState<string | undefined>(undefined);

    const entitiesRowHeaders: TableHeader[] = useMemo(
        () => [
            {
                content: 'Name',
                sortable: true,
                sort: 'asc',
                id: 'entityName',
                width: '60%',
            },
            {
                content: 'Entity Provider',
                align: 'center',
                sortable: true,
                id: 'credentialProvider',
                width: '20%',
            },
            {
                content: 'Kind',
                align: 'center',
                sortable: true,
                id: 'kind',
                width: '20%',
            },
        ],
        [],
    );

    const entityList: TableDataRow[] = useMemo(
        () =>
            entities.map((entity) => ({
                id: entity.uuid,
                columns: [
                    <Link key="name" to={`./detail/${entity.uuid}`}>
                        {entity.name}
                    </Link>,
                    entity.connectorName ? (
                        <Link key="connector" to={`../connectors/detail/${entity.connectorUuid}`}>
                            {entity.connectorName ?? 'Unassigned'}
                        </Link>
                    ) : (
                        (entity.connectorName ?? 'Unassigned')
                    ),
                    <Badge key="kind" color="primary">
                        {entity.kind}
                    </Badge>,
                ],
            })),
        [entities],
    );

    const onListCallback = useCallback((filters: SearchRequestModel) => dispatch(actions.listEntities(filters)), [dispatch]);

    useRunOnSuccessfulFinish(isCreating, createEntitySucceeded, () => {
        setIsAddModalOpen(false);
        onListCallback({ itemsPerPage: 10, pageNumber: 1, filters: [] });
    });
    useRunOnSuccessfulFinish(isUpdating, updateEntitySucceeded, () => {
        setEditingEntityId(undefined);
        onListCallback({ itemsPerPage: 10, pageNumber: 1, filters: [] });
    });

    const handleOpenAddModal = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
        setEditingEntityId(undefined);
    }, []);

    const additionalButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: isBusy,
                tooltip: 'Create',
                onClick: handleOpenAddModal,
            },
        ],
        [isBusy, handleOpenAddModal],
    );

    return (
        <>
            <PagedList
                entity={EntityType.ENTITY}
                onListCallback={onListCallback}
                onDeleteCallback={(uuids) => dispatch(actions.bulkDeleteEntities({ uuids }))}
                getAvailableFiltersApi={useCallback((apiClients: ApiClients) => apiClients.entities.getEntitySearchableFields(), [])}
                headers={entitiesRowHeaders}
                data={entityList}
                isBusy={isBusy}
                title="Entity Store"
                entityNameSingular="an Entity"
                entityNamePlural="Entities"
                filterTitle="Entities Filter"
                pageWidgetLockName={LockWidgetNameEnum.EntityStore}
                addHidden
                additionalButtons={additionalButtons}
            />

            <Dialog
                isOpen={isAddModalOpen || !!editingEntityId}
                toggle={handleCloseAddModal}
                caption={editingEntityId ? 'Edit Entity' : 'Create Entity'}
                size="xl"
                body={<EntityForm entityId={editingEntityId} onCancel={handleCloseAddModal} onSuccess={handleCloseAddModal} />}
            />
        </>
    );
}

export default EntityList;
