import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { useDispatch, useSelector } from 'react-redux';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import Widget from 'components/Widget';
import { actions as rulesActions, selectors as rulesSelectors } from 'ducks/rules';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { Link } from 'react-router';
import { PlatformEnum, type Resource } from 'types/openapi';
import { useRuleEvaluatorResourceOptions } from 'utils/rules';
import { useResourceFilterButtons } from '../useResourceFilterButtons';
import ConditionForm from '../../../conditions/form';

const ConditionsList = () => {
    const conditions = useSelector(rulesSelectors.conditions);

    const dispatch = useDispatch();

    const resourceTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const conditionTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ConditionType));
    const [selectedResource, setSelectedResource] = useState<Resource>();
    const isFetchingList = useSelector(rulesSelectors.isFetchingConditions);
    const isDeleting = useSelector(rulesSelectors.isDeletingCondition);
    const isBulkDeleting = useSelector(rulesSelectors.isBulkDeletingConditions);
    const isCreatingCondition = useSelector(rulesSelectors.isCreatingCondition);
    const createConditionSucceeded = useSelector(rulesSelectors.createConditionSucceeded);

    const [checkedRows, setCheckedRows] = useState<string[]>([]);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const { resourceOptionsWithRuleEvaluator, isFetchingResourcesList } = useRuleEvaluatorResourceOptions({ includeAny: false });

    const isBusy = useMemo(
        () => isFetchingList || isDeleting || isBulkDeleting || isFetchingResourcesList,
        [isFetchingList, isDeleting, isBulkDeleting, isFetchingResourcesList],
    );

    const getFreshListConditionGroups = useCallback(() => {
        dispatch(rulesActions.listConditions({ resource: selectedResource }));
    }, [dispatch, selectedResource]);

    useRunOnSuccessfulFinish(isCreatingCondition, createConditionSucceeded, () => {
        setIsAddModalOpen(false);
        getFreshListConditionGroups();
    });

    const handleOpenAddModal = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
    }, []);

    const onDeleteConfirmed = useCallback(() => {
        dispatch(rulesActions.bulkDeleteConditions({ conditionUuids: checkedRows }));
        setConfirmDelete(false);
        setCheckedRows([]);
    }, [dispatch, checkedRows]);

    useEffect(() => {
        getFreshListConditionGroups();
    }, [getFreshListConditionGroups]);

    const conditionDataHeaders: TableHeader[] = useMemo(
        () => [
            {
                content: 'Name',
                align: 'left',
                id: 'name',
                width: '40%',
                sortable: true,
            },
            {
                content: 'Type',
                align: 'left',
                id: 'type',
                width: '20%',
            },
            {
                content: 'Resource',
                align: 'left',
                id: 'resource',
                width: '20%',
                sortable: true,
            },
            {
                content: 'Description',
                align: 'left',
                id: 'description',
                width: '20%',
            },
        ],
        [],
    );

    const conditionsData: TableDataRow[] = useMemo(
        () =>
            conditions.map((condition) => {
                return {
                    id: condition.uuid,
                    columns: [
                        <Link to={`../conditions/detail/${condition.uuid}`}>{condition.name}</Link>,
                        getEnumLabel(conditionTypeEnum, condition.type),
                        getEnumLabel(resourceTypeEnum, condition.resource),
                        condition.description || '',
                    ],
                };
            }),
        [conditions, resourceTypeEnum, conditionTypeEnum],
    );

    const buttons = useResourceFilterButtons({
        resourceOptionsWithRuleEvaluator,
        selectedResource,
        setSelectedResource,
        checkedRows,
        handleOpenAddModal,
        setConfirmDelete,
    });

    return (
        <>
            <Widget
                noBorder
                titleSize="large"
                title="Conditions"
                refreshAction={getFreshListConditionGroups}
                busy={isBusy && !(isFetchingList && conditions.length === 0)}
                widgetButtons={buttons}
                widgetInfoCard={{
                    title: 'Information',
                    description: 'Condition is named set of conditions items',
                }}
            >
                <CustomTable
                    checkedRows={checkedRows}
                    hasCheckboxes
                    multiSelect
                    data={conditionsData}
                    headers={conditionDataHeaders}
                    onCheckedRowsChanged={(checkedRows) => {
                        setCheckedRows(checkedRows as string[]);
                    }}
                    hasPagination={true}
                    disablePaginationControls={isBusy}
                    disableSelectionControls={isBusy}
                    disableSearchControls={isBusy}
                    isLoading={isFetchingList && conditions.length === 0}
                />
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption={checkedRows.length > 1 ? `Delete Conditions` : `Delete a Condition`}
                body={
                    checkedRows.length > 1
                        ? `You are about to delete ${checkedRows.length} Conditions. Is this what you want to do?`
                        : `You are about to delete a Condition. Is this what you want to do?`
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
                caption="Create Condition"
                size="xxl"
                body={<ConditionForm onCancel={handleCloseAddModal} onSuccess={handleCloseAddModal} />}
                noBorder
            />
        </>
    );
};

export default ConditionsList;
