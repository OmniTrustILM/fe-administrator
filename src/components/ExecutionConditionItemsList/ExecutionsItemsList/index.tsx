import { selectors as enumSelectors } from 'ducks/enums';
import { EntityType, selectors } from 'ducks/filters';
import { selectors as rulesSelectors } from 'ducks/rules';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import Spinner from 'components/Spinner';
import { type ExecutionType, PlatformEnum } from 'types/openapi';
import type { ExecutionItemModel } from 'types/rules';
import { renderExecutionItems } from 'utils/execution-badges';

interface ExecutionsItemsListProps {
    executionItems: ExecutionItemModel[];
    executionName: string;
    executionType: ExecutionType;
    executionUuid: string;
    smallerBadges?: boolean;
}

const ExecutionsItemsList = ({
    executionItems = [],
    executionName,
    executionType,
    executionUuid,
    smallerBadges,
}: ExecutionsItemsListProps) => {
    const searchGroupEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.FilterFieldSource));
    const availableFilters = useSelector(selectors.availableFilters(EntityType.ACTIONS));
    const platformEnums = useSelector(enumSelectors.platformEnums);

    const isFetchingConditionDetails = useSelector(rulesSelectors.isFetchingConditionDetails);
    const isFetchingAvailableFiltersConditions = useSelector(selectors.isFetchingFilters(EntityType.ACTIONS));

    const isLoading = useMemo(
        () => isFetchingAvailableFiltersConditions || isFetchingConditionDetails,
        [isFetchingAvailableFiltersConditions, isFetchingConditionDetails],
    );

    if (isLoading) return <Spinner active={isFetchingConditionDetails} />;

    return smallerBadges ? (
        <div className="flex gap-2 items-center">
            <h6 className="text-gray-500">{`${executionName}'s Execution Items`}</h6>
            <div className="flex flex-wrap">
                {renderExecutionItems(executionItems, executionType, availableFilters, platformEnums, searchGroupEnum, 'small')}
            </div>
        </div>
    ) : (
        <div key={executionUuid} className="flex gap-2 items-center">
            <h6 className="text-gray-500">{`${executionName}`}</h6>
            {renderExecutionItems(executionItems, executionType, availableFilters, platformEnums, searchGroupEnum, 'badge')}
        </div>
    );
};

export default ExecutionsItemsList;
