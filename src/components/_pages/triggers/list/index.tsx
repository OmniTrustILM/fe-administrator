import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { useDispatch, useSelector } from 'react-redux';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { actions as rulesActions, selectors as rulesSelectors } from 'ducks/rules';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { Link } from 'react-router';
import Select from 'components/Select';
import { PlatformEnum, type Resource } from 'types/openapi';

import { actions as resourceActions, selectors as resourceSelectors } from 'ducks/resource';
import TriggerForm from '../form';

const TriggerList = () => {
    const triggers = useSelector(rulesSelectors.triggers);
    const dispatch = useDispatch();

    const resourceTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const eventNameEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ResourceEvent));
    const triggerTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.TriggerType));
    const allResourceEvents = useSelector(resourceSelectors.allResourceEvents);
    const [selectedResource, setSelectedResource] = useState<Resource>();
    const isFetchingList = useSelector(rulesSelectors.isFetchingTriggers);
    const isDeleting = useSelector(rulesSelectors.isDeletingTrigger);
    const isBulkDeleting = useSelector(rulesSelectors.isBulkDeletingTriggers);
    const isCreatingTrigger = useSelector(rulesSelectors.isCreatingTrigger);
    const createTriggerSucceeded = useSelector(rulesSelectors.createTriggerSucceeded);

    const [checkedRows, setCheckedRows] = useState<string[]>([]);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        dispatch(resourceActions.listAllResourceEvents());
    }, [dispatch]);

    const triggerResourceOptions = useMemo(() => {
        if (!allResourceEvents?.length) return [];
        const resourcesSet = new Set(allResourceEvents.map((event) => event.producedResource).filter((el) => el));
        return [...resourcesSet].map((resource) => ({
            value: resource as Resource,
            label: getEnumLabel(resourceTypeEnum, resource as Resource),
        }));
    }, [allResourceEvents, resourceTypeEnum]);

    const isBusy = useMemo(() => isFetchingList || isDeleting || isBulkDeleting, [isFetchingList, isDeleting, isBulkDeleting]);

    const getFreshList = useCallback(() => {
        dispatch(rulesActions.listTriggers({ resource: selectedResource }));
    }, [dispatch, selectedResource]);

    useRunOnSuccessfulFinish(isCreatingTrigger, createTriggerSucceeded, () => {
        setIsAddModalOpen(false);
        getFreshList();
    });

    const handleOpenAddModal = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
    }, []);

    const onDeleteConfirmed = useCallback(() => {
        dispatch(rulesActions.bulkDeleteTriggers({ triggerUuids: checkedRows }));
        setConfirmDelete(false);
        setCheckedRows([]);
    }, [dispatch, checkedRows]);

    useEffect(() => {
        getFreshList();
    }, [getFreshList]);

    const triggerTableHeader: TableHeader[] = useMemo(
        () => [
            {
                content: 'Name',
                align: 'left',
                id: 'name',
                width: '25%',
                sortable: true,
            },
            {
                content: 'Ignore Trigger',
                align: 'left',
                id: 'ignoreTrigger',
                width: '15%',
            },
            {
                content: 'Trigger Type',
                align: 'left',
                id: 'triggerType',
                width: '15%',
                sortable: true,
            },
            {
                content: 'Event Name',
                align: 'left',
                id: 'eventName',
                width: '15%',
                sortable: true,
            },
            {
                content: 'Resource',
                align: 'left',
                id: 'resource',
                width: '15%',
                sortable: true,
            },
            {
                content: 'Description',
                align: 'left',
                id: 'description',
                width: '15%',
            },
        ],
        [],
    );

    const triggerListData: TableDataRow[] = useMemo(
        () =>
            triggers.map((trigger) => {
                return {
                    id: trigger.uuid,
                    columns: [
                        <Link to={`./detail/${trigger.uuid}`}>{trigger.name}</Link>,
                        trigger.ignoreTrigger ? 'Yes' : 'No',
                        getEnumLabel(triggerTypeEnum, trigger.type ?? ''),
                        getEnumLabel(eventNameEnum, trigger.event ?? ''),
                        getEnumLabel(resourceTypeEnum, trigger.resource),
                        trigger.description || '',
                    ],
                };
            }),
        [triggers, resourceTypeEnum, eventNameEnum, triggerTypeEnum],
    );

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'search',
                disabled: false,
                tooltip: 'Select Resource',
                onClick: () => {},
                custom: (
                    <Select
                        placeholder="Select Resource"
                        minWidth={180}
                        id="resource"
                        options={triggerResourceOptions}
                        value={selectedResource || 'Select Resource'}
                        onChange={(value) => {
                            setSelectedResource(value as Resource);
                        }}
                        isClearable
                    />
                ),
            },
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
                onClick: () => setConfirmDelete(true),
            },
        ],
        [checkedRows, triggerResourceOptions, selectedResource, handleOpenAddModal],
    );

    return (
        <>
            <Widget
                titleSize="large"
                title="Triggers"
                refreshAction={getFreshList}
                busy={isBusy && !(isFetchingList && triggers.length === 0)}
                widgetButtons={buttons}
                widgetInfoCard={{
                    title: 'Information',
                    description: 'Triggers are defined to trigger actions based on certain conditions of a resource',
                }}
            >
                <CustomTable
                    checkedRows={checkedRows}
                    hasCheckboxes
                    multiSelect
                    data={triggerListData}
                    headers={triggerTableHeader}
                    onCheckedRowsChanged={(checkedRows) => {
                        setCheckedRows(checkedRows as string[]);
                    }}
                    hasPagination
                    disablePaginationControls={isBusy}
                    disableSelectionControls={isBusy}
                    disableSearchControls={isBusy}
                    isLoading={isFetchingList && triggers.length === 0}
                />
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption={checkedRows.length > 1 ? `Delete Triggers` : `Delete a Trigger`}
                body={
                    checkedRows.length > 1
                        ? `You are about to delete ${checkedRows.length} Triggers. Is this what you want to do?`
                        : `You are about to delete a Trigger. Is this what you want to do?`
                }
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                ]}
            />

            <Dialog
                isOpen={isAddModalOpen}
                toggle={handleCloseAddModal}
                caption="Create Trigger"
                size="xl"
                body={<TriggerForm onCancel={handleCloseAddModal} onSuccess={handleCloseAddModal} />}
                noBorder
            />
        </>
    );
};

export default TriggerList;
