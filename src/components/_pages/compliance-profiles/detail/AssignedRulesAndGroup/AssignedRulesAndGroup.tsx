import Widget from 'components/Widget';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Select from 'components/Select';
import Label from 'components/Label';
import { actions, selectors } from 'ducks/compliance-profiles';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { type ComplianceProfileDtoV2, type ComplianceRuleAvailabilityStatus, PlatformEnum, type Resource } from 'types/openapi';
import CustomTable from 'components/CustomTable';
import WidgetButtons from 'components/WidgetButtons';
import { useParams } from 'react-router';
import { capitalize } from 'utils/common-utils';
import {
    getAssignedInternalListOfGroupsAndRules,
    getAssignedProviderListOfGroupsAndRules,
    getComplianceProfileStatusColor,
    getRulesAndGroupsTableHeaders,
    getListOfResources as getListOfResourcesUtil,
    truncateText,
    rulesSourceOptions,
    getTypeTableColumn,
} from 'utils/compliance-profile';
import { ResourceBadges } from 'components/_pages/compliance-profiles/detail/Components/ResourceBadges';
import { LockWidgetNameEnum } from 'types/user-interface';
import type { TRuleGroupType } from 'types/complianceProfiles';
import Badge from 'components/Badge';
import Tooltip from 'components/Tooltip';

type Props = Readonly<{
    profile: ComplianceProfileDtoV2 | undefined;
    setSelectedEntityDetails: (entityDetails: any) => void;
    setIsEntityDetailMenuOpen: (isEntityDetailMenuOpen: boolean) => void;
    onReset?: (resetFn: () => void) => void;
}>;

export default function AssignedRulesAndGroup({ profile, setSelectedEntityDetails, setIsEntityDetailMenuOpen, onReset }: Props) {
    const { id } = useParams();
    const dispatch = useDispatch();

    const isFetchingRules = useSelector(selectors.isFetchingRules);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));

    const [assignedRulesSource, setAssignedRulesSource] = useState<'Internal' | 'Provider' | null>(null);
    const [assignedResourceType, setAssignedResourceType] = useState<string | null>('All');

    const [assignedRulesAndGroupsList, setAssignedRulesAndGroupsList] = useState<TRuleGroupType[]>([]);
    const [assignedRulesAndGroupsResources, setAssignedRulesAndGroupsResources] = useState<(Resource | 'All')[]>(['All']);
    const [filteredAssignedRulesAndGroupList, setFilteredAssignedRulesAndGroupList] = useState<TRuleGroupType[]>([]);
    const [assignedProvidersList, setAssignedProvidersList] = useState<{ label: string; value: string }[]>([]);
    const [selectedAssignedProvider, setSelectedAssignedProvider] = useState<string | null>(null);
    const [assignedKindsList, setAssignedKindsList] = useState<{ label: string; value: string }[]>([]);
    const [selectedAssignedKind, setSelectedAssignedKind] = useState<string | null>(null);

    const resetSelectValues = useCallback(() => {
        setAssignedRulesSource(null);
        setAssignedResourceType('All');
        setSelectedAssignedProvider(null);
        setSelectedAssignedKind(null);
    }, []);

    // Expose reset function to parent component
    useEffect(() => {
        if (onReset) {
            onReset(resetSelectValues);
        }
    }, [onReset, resetSelectValues]);

    const tableHeadersAssignedRulesAndGroups = useMemo(() => {
        return getRulesAndGroupsTableHeaders('assigned');
    }, []);

    const tableDataAssignedRulesAndGroups = useMemo(
        () =>
            filteredAssignedRulesAndGroupList.map((ruleOrGroup) => {
                const statusColor = getComplianceProfileStatusColor(ruleOrGroup.availabilityStatus as ComplianceRuleAvailabilityStatus);
                return {
                    id: ruleOrGroup.uuid,
                    columns: [
                        <div key={ruleOrGroup.uuid}>
                            {ruleOrGroup.updatedReason ? (
                                <Tooltip content={truncateText(capitalize(ruleOrGroup.updatedReason), 100)}>
                                    <Badge
                                        data-testid="status-badge"
                                        id={`status-${ruleOrGroup.uuid.replaceAll('-', '_')}`}
                                        color={statusColor}
                                        style={{ background: statusColor }}
                                    >
                                        {capitalize(ruleOrGroup.availabilityStatus as ComplianceRuleAvailabilityStatus)}
                                    </Badge>
                                </Tooltip>
                            ) : (
                                <Badge
                                    data-testid="status-badge"
                                    id={`status-${ruleOrGroup.uuid.replaceAll('-', '_')}`}
                                    color={statusColor}
                                    style={{ background: statusColor }}
                                >
                                    {capitalize(ruleOrGroup.availabilityStatus as ComplianceRuleAvailabilityStatus)}
                                </Badge>
                            )}
                        </div>,
                        getTypeTableColumn(ruleOrGroup, setSelectedEntityDetails, setIsEntityDetailMenuOpen),
                        ruleOrGroup.name,
                        getEnumLabel(resourceEnum, ruleOrGroup.resource),
                        <WidgetButtons
                            key={ruleOrGroup.uuid}
                            justify="start"
                            buttons={[
                                {
                                    id: 'remove',
                                    icon: 'minus-square',
                                    disabled: false,
                                    tooltip: 'Remove',
                                    onClick: () => {
                                        if (!id) return;
                                        if (ruleOrGroup.entityDetails?.entityType === 'rule') {
                                            const rulePayload = {
                                                uuid: id,
                                                complianceProfileRulesPatchRequestDto: {
                                                    removal: true,
                                                    ruleUuid: ruleOrGroup.uuid,
                                                    connectorUuid: ruleOrGroup?.entityDetails?.connectorUuid ?? undefined,
                                                    kind: ruleOrGroup?.entityDetails?.kind ?? undefined,
                                                },
                                            };
                                            dispatch(actions.updateRule(rulePayload));
                                        }
                                        if (ruleOrGroup.entityDetails?.entityType === 'group') {
                                            dispatch(
                                                actions.updateGroup({
                                                    uuid: id,
                                                    complianceProfileGroupsPatchRequestDto: {
                                                        removal: true,
                                                        groupUuid: ruleOrGroup.uuid,
                                                        connectorUuid: ruleOrGroup.entityDetails.connectorUuid!,
                                                        kind: ruleOrGroup.entityDetails.kind!,
                                                    },
                                                }),
                                            );
                                        }
                                    },
                                },
                            ]}
                        />,
                    ],
                };
            }),
        [dispatch, filteredAssignedRulesAndGroupList, id, resourceEnum, setIsEntityDetailMenuOpen, setSelectedEntityDetails],
    );

    const getInternalListOfGroupsAndRules = useCallback(
        (resource?: Resource) => {
            if (!profile) return [];
            return getAssignedInternalListOfGroupsAndRules(profile, resource);
        },
        [profile],
    );

    const getProviderListOfGroupsAndRules = useCallback(
        (resource?: Resource, providerUuid?: string | null, kind?: string | null) => {
            if (!profile) return [];
            return getAssignedProviderListOfGroupsAndRules(profile, resource, providerUuid, kind);
        },
        [profile],
    );

    const getInitialListOfGroupsAndRules = useCallback(
        (resource?: Resource) => {
            if (!profile) return [];

            return [...getInternalListOfGroupsAndRules(resource), ...getProviderListOfGroupsAndRules(resource)];
        },
        [getInternalListOfGroupsAndRules, getProviderListOfGroupsAndRules, profile],
    );

    const getListOfResources = useCallback(
        (rulesAndGroupsList: TRuleGroupType[]): (Resource | 'All')[] => {
            if (!profile) return [];
            return getListOfResourcesUtil(rulesAndGroupsList) as (Resource | 'All')[];
        },
        [profile],
    );

    const filterRulesAndGroupsList = useCallback(() => {
        let filteredRulesAndGroupsList: TRuleGroupType[];
        let resourcesList: (Resource | 'All')[];

        if (assignedRulesSource === 'Internal') {
            filteredRulesAndGroupsList = getInternalListOfGroupsAndRules(
                assignedResourceType === 'All' || assignedResourceType === null ? undefined : (assignedResourceType as Resource),
            );
            resourcesList = getListOfResources(getInternalListOfGroupsAndRules());
        } else if (assignedRulesSource === 'Provider') {
            filteredRulesAndGroupsList = getProviderListOfGroupsAndRules(
                assignedResourceType === 'All' || assignedResourceType === null ? undefined : (assignedResourceType as Resource),
                selectedAssignedProvider,
                selectedAssignedKind,
            );
            resourcesList = getListOfResources(getProviderListOfGroupsAndRules(undefined, selectedAssignedProvider));
        } else {
            filteredRulesAndGroupsList = getInitialListOfGroupsAndRules(
                assignedResourceType === 'All' || assignedResourceType === null ? undefined : (assignedResourceType as Resource),
            );
            resourcesList = getListOfResources(getInitialListOfGroupsAndRules());
        }
        setFilteredAssignedRulesAndGroupList(filteredRulesAndGroupsList);
        setAssignedRulesAndGroupsResources(resourcesList);
    }, [
        assignedRulesSource,
        getInternalListOfGroupsAndRules,
        assignedResourceType,
        getListOfResources,
        getProviderListOfGroupsAndRules,
        selectedAssignedProvider,
        getInitialListOfGroupsAndRules,
        selectedAssignedKind,
    ]);

    useEffect(() => {
        setAssignedRulesAndGroupsList(getInitialListOfGroupsAndRules());
    }, [getInitialListOfGroupsAndRules]);

    useEffect(() => {
        setAssignedRulesAndGroupsResources(getListOfResources(assignedRulesAndGroupsList));
    }, [assignedRulesAndGroupsList, getListOfResources]);

    useEffect(() => {
        filterRulesAndGroupsList();
    }, [assignedRulesSource, assignedResourceType, filterRulesAndGroupsList]);

    const getListOfProviders = useCallback(() => {
        return profile?.providerRules
            .filter((providerRule) => (selectedAssignedKind ? providerRule.kind === selectedAssignedKind : true))
            .map((providerRule) => ({
                label: providerRule.connectorName,
                value: providerRule.connectorUuid,
            }));
    }, [profile, selectedAssignedKind]);

    useEffect(() => {
        if (assignedRulesSource === 'Provider') {
            setAssignedProvidersList(getListOfProviders() || []);
        }
    }, [assignedRulesSource, getListOfProviders]);

    const getListOfKinds = useCallback(() => {
        return profile?.providerRules
            .filter((providerRule) => (selectedAssignedProvider ? providerRule.connectorUuid === selectedAssignedProvider : true))
            .map((providerRule) => ({
                label: providerRule.kind,
                value: providerRule.kind,
            }));
    }, [profile, selectedAssignedProvider]);

    useEffect(() => {
        if (assignedRulesSource === 'Provider') {
            setAssignedKindsList(getListOfKinds() || []);
        }
    }, [assignedRulesSource, getListOfKinds]);

    return (
        <Widget
            title="Assigned Rules & Groups"
            busy={isFetchingRules}
            titleSize="large"
            widgetLockName={LockWidgetNameEnum.ComplianceProfileDetails}
            lockSize="large"
            dataTestId="assigned-rules-and-group-widget"
        >
            <Label htmlFor="assignedRulesSource">Rules Source</Label>
            <Select
                id="assignedRulesSource"
                placeholder="Select..."
                options={rulesSourceOptions}
                value={assignedRulesSource || ''}
                onChange={(value) => {
                    setAssignedResourceType('All');
                    setAssignedRulesSource((value as 'Internal' | 'Provider') || null);
                }}
                isClearable
            />
            {assignedRulesSource === 'Provider' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2.5">
                    <div>
                        <Label htmlFor="assignedProvider">Provider</Label>
                        <Select
                            id="assignedProvider"
                            placeholder="Select..."
                            options={assignedProvidersList}
                            value={selectedAssignedProvider || ''}
                            onChange={(value) => {
                                setSelectedAssignedProvider((value as string) || null);
                            }}
                            isClearable
                        />
                    </div>
                    <div>
                        <Label htmlFor="assignedKind">Kind</Label>
                        <Select
                            id="assignedKind"
                            placeholder="Select..."
                            options={assignedKindsList}
                            value={selectedAssignedKind || ''}
                            onChange={(value) => {
                                setSelectedAssignedKind((value as string) || null);
                            }}
                            isClearable
                        />
                    </div>
                </div>
            )}
            <ResourceBadges
                resources={assignedRulesAndGroupsResources}
                selected={assignedResourceType}
                onSelect={setAssignedResourceType}
                getLabel={(resource) => getEnumLabel(resourceEnum, resource)}
            />
            <Widget titleSize="large" busy={isFetchingRules}>
                <CustomTable
                    headers={tableHeadersAssignedRulesAndGroups}
                    data={tableDataAssignedRulesAndGroups}
                    hasPagination
                    canSearch={true}
                />
            </Widget>
        </Widget>
    );
}
