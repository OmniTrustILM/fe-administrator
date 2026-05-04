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
import RulesForm from '../../form';

const RulesList = () => {
    const rules = useSelector(rulesSelectors.rules);

    const dispatch = useDispatch();

    const resourceTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const [selectedResource, setSelectedResource] = useState<Resource>();
    const isFetchingList = useSelector(rulesSelectors.isFetchingRulesList);
    const isDeleting = useSelector(rulesSelectors.isDeletingRule);
    const isBulkDeleting = useSelector(rulesSelectors.isBulkDeletingRules);
    const isCreatingRule = useSelector(rulesSelectors.isCreatingRule);
    const createRuleSucceeded = useSelector(rulesSelectors.createRuleSucceeded);

    const [checkedRows, setCheckedRows] = useState<string[]>([]);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const { resourceOptionsWithRuleEvaluator, isFetchingResourcesList } = useRuleEvaluatorResourceOptions();

    const isBusy = useMemo(
        () => isFetchingList || isDeleting || isBulkDeleting || isFetchingResourcesList,
        [isFetchingList, isDeleting, isBulkDeleting, isFetchingResourcesList],
    );

    const getFreshList = useCallback(() => {
        dispatch(rulesActions.listRules({ resource: selectedResource }));
    }, [dispatch, selectedResource]);

    useRunOnSuccessfulFinish(isCreatingRule, createRuleSucceeded, () => {
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
        dispatch(rulesActions.bulkDeleteRules({ ruleUuids: checkedRows }));
        setConfirmDelete(false);
        setCheckedRows([]);
    }, [dispatch, checkedRows]);

    useEffect(() => {
        getFreshList();
    }, [getFreshList]);

    const rulesHeader: TableHeader[] = useMemo(
        () => [
            {
                content: 'Name',
                align: 'left',
                id: 'name',
                width: '40%',
                sortable: true,
            },
            {
                content: 'Resource',
                align: 'left',
                id: 'resource',
                width: '30%',
                sortable: true,
            },
            {
                content: 'Description',
                align: 'left',
                id: 'description',
                width: '30%',
            },
        ],
        [],
    );

    const rulesData: TableDataRow[] = useMemo(
        () =>
            rules.map((rule) => {
                return {
                    id: rule.uuid,
                    columns: [
                        <Link to={`../rules/detail/${rule.uuid}`}>{rule.name}</Link>,
                        getEnumLabel(resourceTypeEnum, rule.resource),
                        rule.description || '',
                    ],
                };
            }),
        [rules, resourceTypeEnum],
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
                title="Rules"
                refreshAction={getFreshList}
                busy={isBusy && !(isFetchingList && rules.length === 0)}
                widgetButtons={buttons}
                widgetInfoCard={{
                    title: 'Information',
                    description: 'Rules contain set of conditions',
                }}
            >
                <CustomTable
                    checkedRows={checkedRows}
                    hasCheckboxes
                    multiSelect
                    data={rulesData}
                    headers={rulesHeader}
                    onCheckedRowsChanged={(checkedRows) => {
                        setCheckedRows(checkedRows as string[]);
                    }}
                    hasPagination={true}
                    disablePaginationControls={isBusy}
                    disableSelectionControls={isBusy}
                    disableSearchControls={isBusy}
                    isLoading={isFetchingList && rules.length === 0}
                />
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption={checkedRows.length > 1 ? `Delete Rules` : `Delete a Rule`}
                body={
                    checkedRows.length > 1
                        ? `You are about to delete ${checkedRows.length} Rules. Is this what you want to do?`
                        : `You are about to delete a Rule. Is this what you want to do?`
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
                caption="Create Rule"
                size="xl"
                body={<RulesForm onCancel={handleCloseAddModal} onSuccess={handleCloseAddModal} />}
            />
        </>
    );
};

export default RulesList;
