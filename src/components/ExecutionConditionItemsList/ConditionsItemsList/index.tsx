import { selectors as enumSelectors } from 'ducks/enums';
import { EntityType, selectors } from 'ducks/filters';
import { selectors as rulesSelectors } from 'ducks/rules';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import Spinner from 'components/Spinner';
import { type ConditionItemDto, PlatformEnum } from 'types/openapi';
import { renderConditionItems } from 'utils/condition-badges';

interface ConditionsTableViewerProps {
    conditionItems: ConditionItemDto[];
    conditionName: string;
    conditionUuid: string;
    smallerBadges?: boolean;
}

const ConditionsItemsList = ({ conditionItems = [], conditionName, conditionUuid, smallerBadges }: ConditionsTableViewerProps) => {
    const searchGroupEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.FilterFieldSource));
    const filterConditionOperatorEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.FilterConditionOperator));
    const availableFilters = useSelector(selectors.availableFilters(EntityType.CONDITIONS));
    const platformEnums = useSelector(enumSelectors.platformEnums);
    const isFetchingConditionDetails = useSelector(rulesSelectors.isFetchingConditionDetails);

    const isFetchingAvailableFiltersConditions = useSelector(selectors.isFetchingFilters(EntityType.CONDITIONS));

    const isLoading = useMemo(
        () => isFetchingAvailableFiltersConditions || isFetchingConditionDetails,
        [isFetchingAvailableFiltersConditions, isFetchingConditionDetails],
    );

    if (isLoading) return <Spinner active={isFetchingConditionDetails} />;

    return smallerBadges ? (
        <div className="flex gap-2 items-center">
            <h6 className="text-gray-500">{`${conditionName}'s Condition Items`}</h6>
            <div className="flex flex-wrap">
                {renderConditionItems(conditionItems, availableFilters, platformEnums, searchGroupEnum, filterConditionOperatorEnum, {
                    className: '',
                    variant: 'small',
                })}
            </div>
        </div>
    ) : (
        <div key={conditionUuid} className="flex gap-2 items-center">
            <h6 className="text-gray-500">{`${conditionName}`}</h6>
            {renderConditionItems(conditionItems, availableFilters, platformEnums, searchGroupEnum, filterConditionOperatorEnum, {
                className: '',
                variant: 'badge',
            })}
        </div>
    );
};

export default ConditionsItemsList;
