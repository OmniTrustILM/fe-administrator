import type React from 'react';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { of } from 'rxjs';
import { createMockStore } from 'utils/test-helpers';
import FilterWidget from './index';
import { EntityType } from 'ducks/filters';
import { AttributeContentType, FilterConditionOperator, FilterFieldSource, FilterFieldType, PlatformEnum } from 'types/openapi';
import type { SearchFieldListModel, SearchFilterModel } from 'types/certificate';

const conditionEnum = {
    [FilterConditionOperator.Equals]: { code: FilterConditionOperator.Equals, label: 'Equals' },
    [FilterConditionOperator.Contains]: { code: FilterConditionOperator.Contains, label: 'Contains' },
    [FilterConditionOperator.Empty]: { code: FilterConditionOperator.Empty, label: 'Empty' },
    [FilterConditionOperator.Matches]: { code: FilterConditionOperator.Matches, label: 'Matches' },
    [FilterConditionOperator.NotMatches]: { code: FilterConditionOperator.NotMatches, label: 'Not matches' },
    [FilterConditionOperator.InNext]: { code: FilterConditionOperator.InNext, label: 'In next' },
    [FilterConditionOperator.InPast]: { code: FilterConditionOperator.InPast, label: 'In past' },
    [FilterConditionOperator.CountEqual]: { code: FilterConditionOperator.CountEqual, label: 'Count equal' },
    [FilterConditionOperator.CountNotEqual]: { code: FilterConditionOperator.CountNotEqual, label: 'Count not equal' },
    [FilterConditionOperator.CountGreaterThan]: { code: FilterConditionOperator.CountGreaterThan, label: 'Count greater than' },
    [FilterConditionOperator.CountLessThan]: { code: FilterConditionOperator.CountLessThan, label: 'Count less than' },
};

const sourceEnum = {
    [FilterFieldSource.Meta]: { code: FilterFieldSource.Meta, label: 'Meta' },
    [FilterFieldSource.Custom]: { code: FilterFieldSource.Custom, label: 'Custom' },
    [FilterFieldSource.Data]: { code: FilterFieldSource.Data, label: 'Data' },
    [FilterFieldSource.Property]: { code: FilterFieldSource.Property, label: 'Property' },
};

export const defaultAvailableFilters: SearchFieldListModel[] = [
    {
        filterFieldSource: FilterFieldSource.Meta,
        searchFieldData: [
            {
                fieldIdentifier: 'status',
                fieldLabel: 'Status',
                type: FilterFieldType.String,
                conditions: [FilterConditionOperator.Equals, FilterConditionOperator.Contains, FilterConditionOperator.Matches],
            },
            {
                fieldIdentifier: 'enabled',
                fieldLabel: 'Enabled',
                type: FilterFieldType.Boolean,
                conditions: [FilterConditionOperator.Equals],
            },
            {
                fieldIdentifier: 'created',
                fieldLabel: 'Created',
                type: FilterFieldType.Date,
                conditions: [FilterConditionOperator.Equals, FilterConditionOperator.InPast],
            },
            {
                fieldIdentifier: 'expires',
                fieldLabel: 'Expires',
                type: FilterFieldType.Datetime,
                conditions: [FilterConditionOperator.Equals, FilterConditionOperator.InNext],
            },
            {
                fieldIdentifier: 'severity',
                fieldLabel: 'Severity',
                type: FilterFieldType.List,
                conditions: [FilterConditionOperator.Equals],
                platformEnum: 'SeverityEnum' as PlatformEnum,
                multiValue: false,
                value: ['low', 'high'],
            },
            {
                fieldIdentifier: 'owners',
                fieldLabel: 'Owners',
                type: FilterFieldType.List,
                conditions: [FilterConditionOperator.Equals],
                multiValue: true,
                value: [
                    { uuid: 'u1', name: 'Alice' },
                    { uuid: 'u2', name: 'Bob' },
                ],
            },
            {
                fieldIdentifier: 'customDate',
                fieldLabel: 'Custom Date',
                type: FilterFieldType.String,
                attributeContentType: AttributeContentType.Date,
                conditions: [FilterConditionOperator.Equals, FilterConditionOperator.Empty],
            },
            {
                fieldIdentifier: 'itemsCount',
                fieldLabel: 'Items Count',
                type: FilterFieldType.Number,
                conditions: [FilterConditionOperator.CountEqual, FilterConditionOperator.CountGreaterThan],
            },
        ],
    },
];

export type FilterWidgetTestWrapperProps = {
    title?: string;
    entity?: EntityType;
    availableFilters?: SearchFieldListModel[];
    initialCurrentFilters?: SearchFilterModel[];
    onFilterUpdate?: (currentFilters: SearchFilterModel[]) => void;
    disableBadgeRemove?: boolean;
    busyBadges?: boolean;
    extraFilterComponent?: React.ReactNode;
    filterGridCols?: 2 | 4;
};

export default function FilterWidgetTestWrapper({
    title = 'Filters',
    entity = EntityType.CERTIFICATE,
    availableFilters = defaultAvailableFilters,
    initialCurrentFilters = [],
    onFilterUpdate,
    disableBadgeRemove,
    busyBadges,
    extraFilterComponent,
    filterGridCols = 4,
}: Readonly<FilterWidgetTestWrapperProps>) {
    const getAvailableFiltersApi = useMemo(() => () => of(availableFilters), [availableFilters]);

    const preloadedState = useMemo(
        () => ({
            enums: {
                platformEnums: {
                    [PlatformEnum.FilterFieldSource]: sourceEnum,
                    [PlatformEnum.FilterConditionOperator]: conditionEnum,
                    SeverityEnum: {
                        low: { code: 'low', label: 'Low' },
                        high: { code: 'high', label: 'High' },
                    },
                },
            },
            filters: {
                filters: [
                    {
                        entity,
                        filter: {
                            availableFilters,
                            currentFilters: initialCurrentFilters,
                            preservedFilters: [],
                            isFetchingFilters: false,
                        },
                    },
                ],
            },
        }),
        [availableFilters, entity, initialCurrentFilters],
    );

    const store = useMemo(() => createMockStore(preloadedState), [preloadedState]);

    return (
        <Provider store={store}>
            <MemoryRouter>
                <FilterWidget
                    title={title}
                    entity={entity}
                    getAvailableFiltersApi={getAvailableFiltersApi}
                    onFilterUpdate={onFilterUpdate}
                    disableBadgeRemove={disableBadgeRemove}
                    busyBadges={busyBadges}
                    extraFilterComponent={extraFilterComponent}
                    filterGridCols={filterGridCols}
                />
            </MemoryRouter>
        </Provider>
    );
}
