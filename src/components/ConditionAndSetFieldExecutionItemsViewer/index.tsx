import type { ApiClients } from '../../api';
import FilterWidget from 'components/FilterWidget';
import FilterWidgetRuleAction from 'components/FilterWidgetRuleAction';
import { EntityType, actions as filterActions } from 'ducks/filters';
import { actions as rulesActions, selectors as rulesSelectors } from 'ducks/rules';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import type { Resource } from 'types/openapi';
import { conditionGroupToFilter, filterToConditionItems } from 'utils/rules';
type FormType = 'conditionItems' | 'executionItems';

interface ConditionGroupFormFilterProps {
    resource: Resource;
    formType: FormType;
}

const ConditionAndSetFieldExecutionItemsViewer = ({ resource, formType }: ConditionGroupFormFilterProps) => {
    const { id } = useParams();
    const editMode = useMemo(() => !!id, [id]);

    const conditionDetails = useSelector(rulesSelectors.conditionDetails);
    const isFetchingConditionDetails = useSelector(rulesSelectors.isFetchingConditionDetails);
    const isUpdatingCondition = useSelector(rulesSelectors.isUpdatingCondition);

    const executionDetails = useSelector(rulesSelectors.executionDetails);
    const isFetchingExecutionDetails = useSelector(rulesSelectors.isFetchingExecutionDetails);
    const isUpdatingExecution = useSelector(rulesSelectors.isUpdatingExecution);

    const [hasEffectRun, setHasEffectRun] = useState(false);

    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(filterActions.setCurrentFilters({ currentFilters: [], entity: EntityType.CONDITIONS }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!id) return;

        if (formType === 'conditionItems' && id !== conditionDetails?.uuid) {
            dispatch(rulesActions.getCondition({ conditionUuid: id }));
        }

        if (formType === 'executionItems' && id !== executionDetails?.uuid) {
            dispatch(rulesActions.getExecution({ executionUuid: id }));
        }
    }, [id, dispatch, formType, conditionDetails?.uuid, executionDetails?.uuid]);

    useEffect(() => {
        if (!hasEffectRun && editMode && id) {
            if (formType === 'conditionItems') {
                if (conditionDetails?.uuid !== id) return;
                const currentConditions = conditionDetails?.items ?? [];

                const currentFilters = conditionGroupToFilter(currentConditions);
                setHasEffectRun(true);
                dispatch(filterActions.setCurrentFilters({ currentFilters: currentFilters, entity: EntityType.CONDITIONS }));
            }
        }
    }, [editMode, conditionDetails, hasEffectRun, dispatch, formType, id]);

    useEffect(() => {
        return () => {
            dispatch(filterActions.setCurrentFilters({ currentFilters: [], entity: EntityType.CONDITIONS }));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const renderFilterWidgetForConditionItems = useMemo(() => {
        if (formType !== 'conditionItems' || !id || !conditionDetails) return null;
        const disableBadgeRemove = conditionDetails.items.length === 1 || isFetchingConditionDetails || isUpdatingCondition;
        const isBusy = isFetchingConditionDetails || isUpdatingCondition;
        return (
            <div>
                <FilterWidget
                    busyBadges={isBusy}
                    entity={EntityType.CONDITIONS}
                    title={'Condition Items'}
                    getAvailableFiltersApi={(apiClients: ApiClients) =>
                        apiClients.resources.listResourceRuleFilterFields({
                            resource,
                        })
                    }
                    disableBadgeRemove={disableBadgeRemove}
                    onFilterUpdate={(currentFilters) => {
                        const currentCondition = filterToConditionItems(currentFilters);
                        dispatch(
                            rulesActions.updateCondition({
                                conditionUuid: id,
                                condition: {
                                    items: currentCondition,
                                    description: conditionDetails.description ?? '',
                                },
                            }),
                        );
                    }}
                />
            </div>
        );
    }, [resource, dispatch, formType, id, conditionDetails, isFetchingConditionDetails, isUpdatingCondition]);

    const renderFilterWidgetForExecutionItems = useMemo(() => {
        if (formType !== 'executionItems' || !id || !executionDetails) return null;
        const disableBadgeRemove = executionDetails.items.length === 1 || isFetchingExecutionDetails || isUpdatingExecution;

        const isBusy = isFetchingExecutionDetails || isUpdatingExecution;
        return (
            <div>
                {
                    <FilterWidgetRuleAction
                        entity={EntityType.ACTIONS}
                        title="Execution Items"
                        busyBadges={isBusy}
                        disableBadgeRemove={disableBadgeRemove}
                        getAvailableFiltersApi={(apiClients: ApiClients) =>
                            apiClients.resources.listResourceRuleFilterFields({
                                resource,
                                settable: true,
                            })
                        }
                        ExecutionsList={executionDetails.items}
                        onActionsUpdate={(currentExecutionItems) => {
                            dispatch(
                                rulesActions.updateExecution({
                                    executionUuid: id,
                                    execution: {
                                        items: currentExecutionItems,
                                        description: executionDetails.description,
                                    },
                                }),
                            );
                        }}
                    />
                }
            </div>
        );
    }, [resource, dispatch, formType, id, executionDetails, isFetchingExecutionDetails, isUpdatingExecution]);

    const renderWidgetConditionViewer = useMemo(() => {
        switch (formType) {
            case 'conditionItems':
                return renderFilterWidgetForConditionItems;

            case 'executionItems':
                return renderFilterWidgetForExecutionItems;

            default:
                return null;
        }
    }, [formType, renderFilterWidgetForConditionItems, renderFilterWidgetForExecutionItems]);

    return <div>{renderWidgetConditionViewer}</div>;
};

export default ConditionAndSetFieldExecutionItemsViewer;
