import type { ApiClients } from '../../api';
import Spinner from 'components/Spinner';
import Widget from 'components/Widget';
import { EntityType, actions as filterActions, selectors } from 'ducks/filters';
import { selectors as rulesSelectors } from 'ducks/rules';
import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { Observable } from 'rxjs';
import type { SearchFieldListModel } from 'types/certificate';
import type { ConditionModel, ExecutionModel } from 'types/rules';
import ConditionsItemsList from './ConditionsItemsList';
import ExecutionsItemsList from './ExecutionsItemsList';

type ListType = 'conditionsItems' | 'executionItems';

interface ConditionsExecutionsListProps {
    ruleConditions?: ConditionModel[];
    actionExecutions?: ExecutionModel[];
    getAvailableFiltersApi: (apiClients: ApiClients) => Observable<Array<SearchFieldListModel>>;
    listType: ListType;
}

const ConditionsExecutionsList = ({
    ruleConditions,
    actionExecutions,
    getAvailableFiltersApi,
    listType,
}: ConditionsExecutionsListProps) => {
    const isFetchingAvailableFiltersConditions = useSelector(selectors.isFetchingFilters(EntityType.CONDITIONS));
    const isFetchingAvailableFiltersActions = useSelector(selectors.isFetchingFilters(EntityType.ACTIONS));
    const isFetchingRuleDetails = useSelector(rulesSelectors.isFetchingRuleDetails);
    const isFetchingActionsDetails = useSelector(rulesSelectors.isFetchingActionDetails);
    const dispatch = useDispatch();
    useEffect(() => {
        if (listType === 'conditionsItems')
            dispatch(filterActions.getAvailableFilters({ entity: EntityType.CONDITIONS, getAvailableFiltersApi }));
        else dispatch(filterActions.getAvailableFilters({ entity: EntityType.ACTIONS, getAvailableFiltersApi }));
    }, [dispatch, getAvailableFiltersApi, listType]);

    const isBusy = useMemo(
        () =>
            isFetchingAvailableFiltersConditions || isFetchingAvailableFiltersActions || isFetchingRuleDetails || isFetchingActionsDetails,
        [isFetchingAvailableFiltersConditions, isFetchingAvailableFiltersActions, isFetchingRuleDetails, isFetchingActionsDetails],
    );

    const widgetTitle = useMemo(() => {
        if (ruleConditions?.length) return 'Condition Items';
        return actionExecutions?.length ? 'Execution Items' : '';
    }, [ruleConditions, actionExecutions]);

    const renderListData = useMemo(() => {
        if (isBusy) return <Spinner active={isBusy} />;

        if (ruleConditions?.length) {
            return ruleConditions.map((condition, i) => (
                <React.Fragment key={condition.uuid}>
                    <ConditionsItemsList
                        conditionName={condition.name}
                        conditionUuid={condition.uuid}
                        conditionItems={condition.items}
                        key={condition.uuid}
                    />
                </React.Fragment>
            ));
        } else if (actionExecutions?.length) {
            return actionExecutions.map((execution, i) => (
                <React.Fragment key={execution.uuid}>
                    <ExecutionsItemsList
                        executionName={execution.name}
                        executionUuid={execution.uuid}
                        executionType={execution.type}
                        executionItems={execution.items}
                        key={execution.uuid}
                    />
                </React.Fragment>
            ));
        } else return <></>;
    }, [ruleConditions, actionExecutions, isBusy]);

    return (
        <Widget title={widgetTitle} titleSize="large" busy={isBusy}>
            <div className="flex flex-col gap-2">{renderListData}</div>
        </Widget>
    );
};

export default ConditionsExecutionsList;
