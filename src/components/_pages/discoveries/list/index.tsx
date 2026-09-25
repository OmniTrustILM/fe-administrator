import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { actions, selectors } from 'ducks/discoveries';
import { EntityType, actions as filterActions } from 'ducks/filters';
import { actions as pagingActions } from 'ducks/paging';
import { dateFormatter, durationFormatter } from 'utils/dateUtil';

import type { ApiClients } from '../../../../api';
import PagedList from 'components/PagedList/PagedList';
import type { SearchRequestModel } from 'types/certificate';
import { LockWidgetNameEnum } from 'types/user-interface';
import { Resource } from 'types/openapi';
import type { DiscoveryResponseModel } from 'types/discoveries';
import { buildDiscoveryCellRegistry, DISCOVERY_COLUMNS, DISCOVERY_DEFAULT_SORT } from '../discoveryTableHelpers';
import Dialog from 'components/Dialog';
import DiscoveryForm from '../form';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';

function DiscoveryList() {
    const dispatch = useDispatch();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const isCreating = useSelector(selectors.isCreating);
    const createDiscoverySucceeded = useSelector(selectors.createDiscoverySucceeded);

    const discoveries = useSelector(selectors.discoveries);
    const isDeleting = useSelector(selectors.isDeleting);
    const isBulkDeleting = useSelector(selectors.isBulkDeleting);
    const isBusy = isDeleting || isBulkDeleting;

    const registry = useMemo(() => buildDiscoveryCellRegistry({ dateFormatter, durationFormatter }), []);

    const configurableColumns = useMemo(
        () => ({
            resource: Resource.Discoveries,
            standardColumns: DISCOVERY_COLUMNS,
            rows: discoveries,
            getRowId: (discovery: DiscoveryResponseModel) => discovery.uuid,
            registry,
            defaultSort: DISCOVERY_DEFAULT_SORT,
        }),
        [discoveries, registry],
    );

    const onListCallback = useCallback((filters: SearchRequestModel) => dispatch(actions.listDiscoveries(filters)), [dispatch]);

    const handleOpenAddModal = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
    }, []);

    // Back to an unfiltered first page, so the discovery just created is on it. The refresh goes through
    // the token rather than a request assembled here, which would carry no columns and no ordering.
    const [refreshToken, setRefreshToken] = useState(0);

    const handleFormSuccess = useCallback(() => {
        handleCloseAddModal();
        dispatch(filterActions.setCurrentFilters({ entity: EntityType.DISCOVERY, currentFilters: [] }));
        dispatch(pagingActions.resetPaging({ entity: EntityType.DISCOVERY }));
        setRefreshToken((token) => token + 1);
    }, [handleCloseAddModal, dispatch]);

    const handleCreateSuccess = useCallback(() => {
        if (!isAddModalOpen) return;
        handleFormSuccess();
    }, [handleFormSuccess, isAddModalOpen]);

    useRunOnSuccessfulFinish(isCreating, createDiscoverySucceeded, handleCreateSuccess);

    const additionalButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: false,
                tooltip: 'Add',
                onClick: handleOpenAddModal,
            },
        ],
        [handleOpenAddModal],
    );

    return (
        <>
            <PagedList
                entity={EntityType.DISCOVERY}
                onListCallback={onListCallback}
                onDeleteCallback={(uuids) => dispatch(actions.bulkDeleteDiscovery({ uuids }))}
                getAvailableFiltersApi={useCallback((apiClients: ApiClients) => apiClients.discoveries.getDiscoverySearchableFields(), [])}
                configurableColumns={configurableColumns}
                isBusy={isBusy}
                title="Discovery Store"
                entityNameSingular="a Discovery"
                entityNamePlural="Discoveries"
                filterTitle="Discoveries Filter"
                pageWidgetLockName={LockWidgetNameEnum.DiscoveriesStore}
                addHidden
                additionalButtons={additionalButtons}
                refreshToken={refreshToken}
            />
            <Dialog
                isOpen={isAddModalOpen}
                caption="Create Discovery"
                body={<DiscoveryForm onCancel={handleCloseAddModal} />}
                toggle={handleCloseAddModal}
                size="xl"
                buttons={[]}
            />
        </>
    );
}

export default DiscoveryList;
