import { Provider } from 'react-redux';
import {
    FilterConditionOperator,
    FilterFieldSource,
    FilterFieldType,
    PlatformEnum,
    Resource,
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
        eventHistory: {
            isFetchingEventHistory: false,
            isFetchingObjectEventHistory: false,
            conditionFilterFieldsByResource: hasFilterFields ? { [Resource.Certificates]: filterFields } : {},
            fetchingConditionFilterFieldsFor: [],
        },
    });

    return (
        <Provider store={store}>
            <EvaluationDetailsDialog isOpen onClose={() => {}} objectLabel="yahoo.com" trigger={trigger} />
        </Provider>
    );
}
