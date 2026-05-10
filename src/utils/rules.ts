import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { SearchFilterModel } from 'types/certificate';
import type { ConditionItemModel } from 'types/rules';
import { actions as resourceActions, selectors as resourceSelectors } from 'ducks/resource';
import { PlatformEnum, Resource } from 'types/openapi';
import type { ResourceModel } from 'types/resource';

export const filterToConditionItems = (filter: SearchFilterModel[]): ConditionItemModel[] => {
    return filter.map((filter) => ({
        fieldIdentifier: filter.fieldIdentifier,
        operator: filter.condition,
        value: filter.value,
        fieldSource: filter.fieldSource,
    }));
};

export const conditionGroupToFilter = (conditionGroup: ConditionItemModel[]): SearchFilterModel[] => {
    return conditionGroup.map((condition) => ({
        fieldIdentifier: condition.fieldIdentifier,
        condition: condition.operator,
        value: condition.value,
        fieldSource: condition.fieldSource,
    }));
};

export const useResourceOptions = () => {
    const resourceList = useSelector(resourceSelectors.resourcesList);
    const resourceTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const isFetchingResourcesList = useSelector(resourceSelectors.isFetchingResourcesList);
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(resourceActions.listResources());
    }, [dispatch]);

    const resourceOptions = useMemo(() => {
        if (!resourceList.length) return [];
        return resourceList.map((resource) => {
            return { value: resource.resource, label: getEnumLabel(resourceTypeEnum, resource.resource) };
        });
    }, [resourceList, resourceTypeEnum]);

    return { resourceOptions, isFetchingResourcesList };
};

export const useRuleEvaluatorResourceOptions = (options?: { includeAny?: boolean }) => {
    const includeAny = options?.includeAny !== false;
    const resourceList = useSelector(resourceSelectors.resourcesList);
    const resourceTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const isFetchingResourcesList = useSelector(resourceSelectors.isFetchingResourcesList);
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(resourceActions.listResources());
    }, [dispatch]);

    const resourceOptionsWithRuleEvaluator = useMemo(() => {
        if (!resourceList.length) return [];
        const resourceListWithRuleEvaluator = resourceList.filter((resource) => resource.hasRuleEvaluator);
        const baseOptions = resourceListWithRuleEvaluator.map((resource) => {
            return { value: resource.resource, label: getEnumLabel(resourceTypeEnum, resource.resource) };
        });
        if (includeAny) {
            return [
                ...baseOptions,
                {
                    label: 'Any',
                    value: Resource.Any,
                },
            ];
        }
        return baseOptions;
    }, [resourceList, resourceTypeEnum, includeAny]);

    return { resourceOptionsWithRuleEvaluator, isFetchingResourcesList };
};

export const useComplianceProfileResourceOptions = () => {
    const resourceList = useSelector(resourceSelectors.resourcesList);
    const resourceTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const isFetchingResourcesList = useSelector(resourceSelectors.isFetchingResourcesList);
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(resourceActions.listResources());
    }, [dispatch]);

    const resourceOptionsWithComplianceProfile = useMemo(() => {
        if (!resourceList.length) return [];
        const resourceListWithComplianceProfile = resourceList.filter((resource) => resource.complianceSubject);
        return resourceListWithComplianceProfile.map((resource) => {
            return { value: resource.resource, label: getEnumLabel(resourceTypeEnum, resource.resource) };
        });
    }, [resourceList, resourceTypeEnum]);

    return { resourceOptionsWithComplianceProfile, isFetchingResourcesList };
};

export const useHasEventsResourceOptions = () => {
    const resourceList = useSelector(resourceSelectors.resourcesList);
    const resourceTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const isFetchingResourcesList = useSelector(resourceSelectors.isFetchingResourcesList);
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(resourceActions.listResources());
    }, [dispatch]);

    const resourceOptionsWithEvents = useMemo(() => {
        if (!resourceList.length) return [];
        const resourceListWithEvents = resourceList.filter((resource) => resource.hasEvents);
        return resourceListWithEvents.map((resource) => {
            return { value: resource.resource, label: getEnumLabel(resourceTypeEnum, resource.resource) };
        });
    }, [resourceList, resourceTypeEnum]);

    return { resourceOptionsWithEvents, isFetchingResourcesList };
};

type ResourceFilter = 'hasEvents' | 'hasRuleEvaluator';

export const useResourceOptionsFromListWithFilters = (resourceList: ResourceModel[], resourceFilter?: ResourceFilter) => {
    const resourceTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));

    const resourceOptions = useMemo(() => {
        if (!resourceList.length) return [];

        if (resourceFilter === 'hasEvents') {
            const resourceListWithEvents = resourceList.filter((resource) => resource.hasEvents);
            return resourceListWithEvents.map((resource) => {
                return { value: resource.resource, label: getEnumLabel(resourceTypeEnum, resource.resource) };
            });
        }

        if (resourceFilter === 'hasRuleEvaluator') {
            const resourceListWithRuleEvaluator = resourceList.filter((resource) => resource.hasRuleEvaluator);
            return resourceListWithRuleEvaluator.map((resource) => {
                return { value: resource.resource, label: getEnumLabel(resourceTypeEnum, resource.resource) };
            });
        }

        return resourceList.map((resource) => {
            return { value: resource.resource, label: getEnumLabel(resourceTypeEnum, resource.resource) };
        });
    }, [resourceList, resourceTypeEnum, resourceFilter]);

    return resourceOptions;
};
