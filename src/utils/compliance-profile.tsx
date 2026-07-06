import Button from 'components/Button';
import Badge from 'components/Badge';
import type { TRuleGroupType } from 'types/complianceProfiles';
import {
    type ComplianceGroupListDto,
    type ComplianceProfileDtoV2,
    type ComplianceRuleListDto,
    ComplianceRuleAvailabilityStatus,
    type Resource,
    PlatformEnum,
} from 'types/openapi';
import { capitalize } from 'utils/common-utils';
import { Info } from 'lucide-react';
import { EnumColumnDescription } from 'components/EnumDescription';

export const getComplianceProfileStatusColor = (status: ComplianceRuleAvailabilityStatus) => {
    switch (status) {
        case ComplianceRuleAvailabilityStatus.Available:
            return 'success';
        case ComplianceRuleAvailabilityStatus.NotAvailable:
            return 'danger';
        case ComplianceRuleAvailabilityStatus.Updated:
            return 'warning';
    }
};

export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '…';
}

export const rulesSourceOptions = [
    {
        label: 'Provider',
        value: 'Provider',
    },
    {
        label: 'Internal',
        value: 'Internal',
    },
];

export function getRulesAndGroupsTableHeaders(type: 'assigned' | 'available') {
    return [
        ...(type === 'assigned' ? [{ id: 'status', content: 'Status', sortable: true }] : []),
        {
            id: 'type',
            content: 'Type',
            sortable: true,
        },
        {
            id: 'name',
            content: 'Name',
            sortable: true,
        },
        {
            id: 'resource',
            content: (
                <span className="inline-flex items-center gap-1">
                    Resource
                    <EnumColumnDescription platformEnum={PlatformEnum.Resource} title="Resource" />
                </span>
            ),
            sortable: true,
        },
        {
            id: 'action',
            content: 'Action',
        },
    ];
}

export const getAssignedInternalListOfGroupsAndRules = (profile: ComplianceProfileDtoV2 | undefined, resource?: Resource) => {
    if (!profile) return [];
    const internalRules = profile.internalRules
        .filter((rule) => (resource ? rule.resource === resource : true))
        .map((rule) => ({
            ...rule,
            entityDetails: {
                entityType: 'rule',
            },
        }));
    return internalRules as TRuleGroupType[];
};

export const getAssignedProviderListOfGroupsAndRules = (
    profile: ComplianceProfileDtoV2 | undefined,
    resource?: Resource,
    providerUuid?: string | null,
    kind?: string | null,
) => {
    if (!profile) return [];
    const providerRulesAndGroupsList = profile.providerRules
        .filter((providerRule) => (providerUuid ? providerRule.connectorUuid === providerUuid : true))
        .filter((providerRule) => (kind ? providerRule.kind === kind : true))
        .flatMap((providerRule) => {
            return [
                ...providerRule.rules
                    .filter((rule) => (resource ? rule.resource === resource : true))
                    .map((rule) => ({
                        ...rule,
                        entityDetails: {
                            connectorUuid: providerRule.connectorUuid,
                            connectorName: providerRule.connectorName,
                            kind: providerRule.kind,
                            entityType: 'rule',
                        },
                    })),
                ...providerRule.groups
                    .filter((group) => (resource ? group.resource === resource : true))
                    .map((group) => ({
                        ...group,
                        entityDetails: {
                            connectorUuid: providerRule.connectorUuid,
                            connectorName: providerRule.connectorName,
                            kind: providerRule.kind,
                            entityType: 'group',
                        },
                    })),
            ];
        });
    return providerRulesAndGroupsList as TRuleGroupType[];
};

export const formatAvailableRulesAndGroups = (
    type: 'rule' | 'group',
    rulesAndGroups: ComplianceRuleListDto[] | ComplianceGroupListDto[],
) => {
    return rulesAndGroups.map((ruleOrGroup) => {
        return {
            ...ruleOrGroup,
            entityDetails: {
                entityType: type,
            },
        };
    });
};

export const getListOfResources = (rulesAndGroupsList: TRuleGroupType[]) => {
    const list = Array.from(new Set(rulesAndGroupsList.map((ruleOrGroup) => ruleOrGroup.resource)));
    return ['All', ...list];
};

export function makeOptions<T extends { uuid: string; name: string }>(profiles: T[], associations: { objectUuid: string }[]) {
    return profiles
        .filter((profile) => !associations.some((a) => a.objectUuid === profile.uuid))
        .map((profile) => ({
            value: profile,
            label: profile.name,
        }));
}

export const getTypeTableColumn = (
    ruleOrGroup: TRuleGroupType,
    setSelectedEntityDetails: (entityDetails: TRuleGroupType) => void,
    setIsEntityDetailMenuOpen: (isEntityDetailMenuOpen: boolean) => void,
) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Badge data-testid="compliance-table-type-badge" color="secondary">
                {capitalize(ruleOrGroup?.entityDetails?.entityType)}{' '}
            </Badge>
            <Button
                variant="transparent"
                title="Rules"
                onClick={() => {
                    setSelectedEntityDetails(ruleOrGroup);
                    setIsEntityDetailMenuOpen(true);
                }}
            >
                <Info size={16} style={{ color: 'auto' }} />
            </Button>
        </div>
    );
};
