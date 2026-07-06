import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { of } from 'rxjs';
import { createMockStore } from 'utils/test-helpers';
import FilterWidgetRuleAction from './index';
import { EntityType, type Filter } from 'ducks/filters';
import { PlatformEnum } from 'types/openapi';
import type { SearchFieldListModel } from 'types/certificate';
import type { ExecutionItemModel } from 'types/rules';
import { defaultMockAvailableFilters } from './FilterWidgetRuleActionTestData';

const defaultEnumsPreload = {
    enums: {
        platformEnums: {
            [PlatformEnum.FilterFieldSource]: {
                meta: { label: 'Meta' },
                custom: { label: 'Custom' },
                data: { label: 'Data' },
                property: { label: 'Property' },
            },
            [PlatformEnum.ExecutionType]: {
                setField: { label: 'Set Field' },
                sendNotification: { label: 'Send Notification' },
            },
        },
    },
};

export type FilterWidgetRuleActionTestWrapperProps = {
    title?: string;
    entity?: EntityType;
    availableFilters?: SearchFieldListModel[];
    sourceEntity?: EntityType;
    sourceAvailableFilters?: SearchFieldListModel[];
    onActionsUpdate?: (actions: ExecutionItemModel[]) => void;
    ExecutionsList?: ExecutionItemModel[];
    disableBadgeRemove?: boolean;
    busyBadges?: boolean;
    platformEnumsOverride?: Record<string, Record<string, { label: string }>>;
};

export function FilterWidgetRuleActionTestWrapper({
    title = 'Filter rule actions',
    entity = EntityType.CERTIFICATE,
    availableFilters = defaultMockAvailableFilters,
    sourceEntity,
    sourceAvailableFilters,
    onActionsUpdate,
    ExecutionsList,
    disableBadgeRemove,
    busyBadges,
    platformEnumsOverride,
}: Readonly<FilterWidgetRuleActionTestWrapperProps>) {
    const getAvailableFiltersApi = useMemo(() => () => of(availableFilters), [availableFilters]);
    const getSourceAvailableFiltersApi = useMemo(
        () => (sourceAvailableFilters ? () => of(sourceAvailableFilters) : undefined),
        [sourceAvailableFilters],
    );

    const preloadedState = useMemo(() => {
        const filters: Filter[] = [
            {
                entity,
                filter: {
                    availableFilters,
                    currentFilters: [],
                    preservedFilters: [],
                    isFetchingFilters: false,
                },
            },
        ];
        if (sourceEntity !== undefined && sourceAvailableFilters) {
            filters.push({
                entity: sourceEntity,
                filter: {
                    availableFilters: sourceAvailableFilters,
                    currentFilters: [],
                    preservedFilters: [],
                    isFetchingFilters: false,
                },
            });
        }
        return {
            enums: {
                platformEnums: {
                    ...defaultEnumsPreload.enums.platformEnums,
                    ...platformEnumsOverride,
                },
            },
            filters: { filters },
        };
    }, [entity, availableFilters, sourceEntity, sourceAvailableFilters, platformEnumsOverride]);

    const store = useMemo(() => createMockStore(preloadedState), [preloadedState]);

    return (
        <Provider store={store}>
            <MemoryRouter>
                <FilterWidgetRuleAction
                    title={title}
                    entity={entity}
                    sourceEntity={sourceEntity}
                    getAvailableFiltersApi={getAvailableFiltersApi}
                    getSourceAvailableFiltersApi={getSourceAvailableFiltersApi}
                    onActionsUpdate={onActionsUpdate}
                    ExecutionsList={ExecutionsList}
                    disableBadgeRemove={disableBadgeRemove}
                    busyBadges={busyBadges}
                />
            </MemoryRouter>
        </Provider>
    );
}
