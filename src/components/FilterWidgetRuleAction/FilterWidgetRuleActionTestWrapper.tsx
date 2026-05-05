import React, { useMemo } from 'react';
import { Provider } from 'react-redux';
import { of } from 'rxjs';
import { createMockStore } from 'utils/test-helpers';
import FilterWidgetRuleAction from './index';
import { EntityType } from 'ducks/filters';
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

export type FilterWidgetRuleActionTestWrapperProps = Readonly<{
    title?: string;
    entity?: EntityType;
    availableFilters?: SearchFieldListModel[];
    onActionsUpdate?: (actions: ExecutionItemModel[]) => void;
    ExecutionsList?: ExecutionItemModel[];
    disableBadgeRemove?: boolean;
    busyBadges?: boolean;
    platformEnumsOverride?: Record<string, Record<string, { label: string }>>;
}>;

export function FilterWidgetRuleActionTestWrapper({
    title = 'Filter rule actions',
    entity = EntityType.CERTIFICATE,
    availableFilters = defaultMockAvailableFilters,
    onActionsUpdate,
    ExecutionsList,
    disableBadgeRemove,
    busyBadges,
    platformEnumsOverride,
}: FilterWidgetRuleActionTestWrapperProps) {
    const getAvailableFiltersApi = useMemo(() => () => of(availableFilters), [availableFilters]);

    const preloadedState = useMemo(
        () => ({
            enums: {
                platformEnums: {
                    ...defaultEnumsPreload.enums.platformEnums,
                    ...platformEnumsOverride,
                },
            },
            filters: {
                filters: [
                    {
                        entity,
                        filter: {
                            availableFilters,
                            currentFilters: [],
                            preservedFilters: [],
                            isFetchingFilters: false,
                        },
                    },
                ],
            },
        }),
        [entity, availableFilters, platformEnumsOverride],
    );

    const store = useMemo(() => createMockStore(preloadedState), [preloadedState]);

    return (
        <Provider store={store}>
            <FilterWidgetRuleAction
                title={title}
                entity={entity}
                getAvailableFiltersApi={getAvailableFiltersApi}
                onActionsUpdate={onActionsUpdate}
                ExecutionsList={ExecutionsList}
                disableBadgeRemove={disableBadgeRemove}
                busyBadges={busyBadges}
            />
        </Provider>
    );
}
