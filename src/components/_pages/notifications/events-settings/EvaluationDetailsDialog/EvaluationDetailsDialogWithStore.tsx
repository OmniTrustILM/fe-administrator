import { EntityType } from 'ducks/filters';
import { Provider } from 'react-redux';
import {
    FilterConditionOperator,
    FilterFieldSource,
    FilterFieldType,
    PlatformEnum,
    type TriggerHistoryObjectTriggerSummaryDto,
} from 'types/openapi';
import { createMockStore } from 'utils/test-helpers';
import EvaluationDetailsDialog from './index';

type Props = Readonly<{
    trigger: TriggerHistoryObjectTriggerSummaryDto;
    hasFilterFields?: boolean;
}>;

const filterFields = [
    {
        filterFieldSource: FilterFieldSource.Property,
        searchFieldData: [{ fieldIdentifier: 'NOT_AFTER', fieldLabel: 'Expires At', type: FilterFieldType.Datetime, conditions: [] }],
    },
];

export default function EvaluationDetailsDialogWithStore({ trigger, hasFilterFields = true }: Props) {
    const store = createMockStore({
        enums: {
            platformEnums: {
                [PlatformEnum.FilterFieldSource]: {
                    [FilterFieldSource.Property]: { label: 'Property' },
                },
                [PlatformEnum.FilterConditionOperator]: {
                    [FilterConditionOperator.Greater]: { label: 'greater than' },
                },
            },
        },
        filters: {
            filters: [
                {
                    entity: EntityType.CONDITIONS,
                    filter: {
                        availableFilters: hasFilterFields ? filterFields : [],
                        currentFilters: [],
                        isFetchingFilters: false,
                        hasLoadedFilters: hasFilterFields,
                    },
                },
            ],
        },
    });

    return (
        <Provider store={store}>
            <EvaluationDetailsDialog isOpen onClose={() => {}} objectLabel="yahoo.com" trigger={trigger} />
        </Provider>
    );
}
