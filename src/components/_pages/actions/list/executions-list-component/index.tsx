import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { useDispatch, useSelector } from 'react-redux';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { actions as actionGroupsActions, selectors as rulesSelectors } from 'ducks/rules';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import Select from 'components/Select';
import { PlatformEnum, type Resource } from 'types/openapi';
import { useRuleEvaluatorResourceOptions } from 'utils/rules';

const ExecutionsList = () => {
    const executions = useSelector(rulesSelectors.executions);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const resourceTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const executionTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ExecutionType));
    const [selectedResource, setSelectedResource] = useState<Resource>();
    const isFetchingList = useSelector(rulesSelectors.isFetchingExecutions);
    const isDeleting = useSelector(rulesSelectors.isDeletingExecution);
    const isBulkDeleting = useSelector(rulesSelectors.isBulkDeletingExecutions);

    const [checkedRows, setCheckedRows] = useState<string[]>([]);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const isBusy = useMemo(() => isFetchingList || isDeleting || isBulkDeleting, [isFetchingList, isDeleting, isBulkDeleting]);

    const onDeleteConfirmed = useCallback(() => {
        dispatch(actionGroupsActions.bulkDeleteExecutions({ executionUuids: checkedRows }));
        setConfirmDelete(false);
        setCheckedRows([]);
    }, [dispatch, checkedRows]);

    const getFreshListActionGroups = useCallback(() => {
        dispatch(actionGroupsActions.listExecutions({ resource: selectedResource }));
    }, [dispatch, selectedResource]);

    useEffect(() => {
        getFreshListActionGroups();
    }, [getFreshListActionGroups]);

    const { resourceOptionsWithRuleEvaluator, isFetchingResourcesList } = useRuleEvaluatorResourceOptions();

    const executionsDataHeaders: TableHeader[] = useMemo(
        () => [
            {
                content: 'Name',
                align: 'left',
                id: 'name',
                width: '25%',
                sortable: true,
            },
            {
                content: 'Type',
                align: 'left',
                id: 'type',
                width: '25%',
                sortable: true,
            },
            {
                content: 'Resource',
                align: 'left',
                id: 'resource',
                width: '25%',
                sortable: true,
            },
            {
                content: 'Description',
                align: 'left',
                id: 'description',
                width: '25%',
            },
        ],
        [],
    );

    const executionsData: TableDataRow[] = useMemo(
        () =>
            executions.map((execution) => {
                return {
                    id: execution.uuid,
                    columns: [
                        <Link to={`../executions/detail/${execution.uuid}`}>{execution.name}</Link>,
                        getEnumLabel(executionTypeEnum, execution.type),
                        getEnumLabel(resourceTypeEnum, execution.resource),
                        execution.description || '',
                    ],
                };
            }),
        [executions, resourceTypeEnum, executionTypeEnum],
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
                        options={resourceOptionsWithRuleEvaluator}
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
                onClick: () => navigate(`../executions/add`),
            },
            {
                icon: 'trash',
                disabled: checkedRows.length === 0,
                tooltip: 'Delete',
                onClick: () => setConfirmDelete(true),
            },
        ],
        [checkedRows, resourceOptionsWithRuleEvaluator, navigate, selectedResource],
    );

    return (
        <>
            <Widget
                titleSize="large"
                title="Executions"
                refreshAction={getFreshListActionGroups}
                busy={isBusy && !(isFetchingList && executions.length === 0)}
                widgetButtons={buttons}
                widgetInfoCard={{
                    title: 'Information',
                    description: 'Executions is named set of execution items',
                }}
                noBorder
            >
                <CustomTable
                    checkedRows={checkedRows}
                    hasCheckboxes
                    multiSelect
                    data={executionsData}
                    headers={executionsDataHeaders}
                    onCheckedRowsChanged={(checkedRows) => {
                        setCheckedRows(checkedRows as string[]);
                    }}
                    hasPagination={true}
                    disablePaginationControls={isBusy}
                    disableSelectionControls={isBusy}
                    disableSearchControls={isBusy}
                    isLoading={isFetchingList && executions.length === 0}
                />
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption={checkedRows.length > 1 ? `Delete Executions` : `Delete an Execution`}
                body={
                    checkedRows.length > 1
                        ? `You are about to delete ${checkedRows.length} Executions. Is this what you want to do?`
                        : `You are about to delete an Execution. Is this what you want to do?`
                }
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />
        </>
    );
};

export default ExecutionsList;
