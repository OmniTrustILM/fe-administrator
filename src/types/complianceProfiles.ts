import type { AttributeDescriptorModel, AttributeRequestModel, AttributeResponseModel } from './attributes';
import type { RaProfileSimplifiedModel } from './certificate';
import type {
    ComplianceGroupDto,
    ComplianceProfileDto,
    ComplianceProfileRequestDto,
    ComplianceProfileRuleDto,
    ComplianceRuleAdditionRequestDto,
    ComplianceRuleAvailabilityStatus,
    ComplianceRuleDto,
    ComplianceRuleListDto,
    ComplianceRulesListResponseDto,
    ComplianceRulesResponseDto,
    ComplianceGroupsListResponseDto,
    ComplianceGroupsResponseDto,
} from './openapi';

export type {
    ComplianceProviderSummaryDto as ComplianceProfileListRuleDto,
    ComplianceProviderSummaryDto as ComplianceProfileListRuleModel,
    ComplianceProfileListDto,
    ComplianceProfileListDto as ComplianceProfileListModel,
    ComplianceRuleDto as ComplianceProfileResponseRuleRuleDto,
    ComplianceRuleDto as ComplianceProfileResponseRuleDto,
    ComplianceGroupDto as ComplianceProfileResponseGroupGroupDto,
    ComplianceGroupDto as ComplianceProfileResponseGroupGroupModel,
    ComplianceGroupDto as ComplianceProfileResponseGroupDto,
    ComplianceProfileDto as ComplianceProfileResponseDto,
    ComplianceRuleDto as ComplianceProfileRequestRuleRuleDto,
    ComplianceRuleDto as ComplianceProfileRequestRuleDto,
    ComplianceProfileRequestDto,
    ComplianceRuleAdditionRequestDto as ComplianceProfileRuleAddRequestDto,
    ComplianceProfileRuleDto as ComplianceProfileRuleAddResponseDto,
    ComplianceGroupRequestDto as ComplianceProfileGroupRequestDto,
    ComplianceGroupRequestDto as ComplianceProfileGroupRequestModel,
    ComplianceRuleDeletionRequestDto as ComplianceProfileRuleDeleteRequestDto,
    ComplianceRuleDeletionRequestDto as ComplianceProfileRuleDeleteRequestModel,
    ComplianceRulesResponseDto as ComplianceProfileRuleListResponseRuleDto,
    ComplianceRulesListResponseDto as ComplianceProfileRuleListResponseDto,
    ComplianceGroupsResponseDto as ComplianceProfileGroupListResponseGroupDto,
    ComplianceGroupsResponseDto as ComplianceProfileGroupListResponseGroupModel,
    ComplianceGroupsListResponseDto as ComplianceProfileGroupListResponseDto,
} from './openapi';

export type ComplianceProfileResponseRuleRuleModel = Omit<ComplianceRuleDto, 'attributes'> & {
    attributes?: Array<AttributeResponseModel>;
};

export type ComplianceProfileResponseRuleModel = Omit<ComplianceRuleDto, 'rules'> & {
    rules?: Array<ComplianceProfileResponseRuleRuleModel>;
};

export type ComplianceProfileResponseGroupModel = Omit<ComplianceGroupDto, 'groups'> & {
    groups?: Array<ComplianceGroupDto>;
};

export type ComplianceProfileResponseModel = Omit<ComplianceProfileDto, 'rules | groups | raProfiles | customAttributes'> & {
    rules: Array<ComplianceProfileResponseRuleModel>;
    groups: Array<ComplianceProfileResponseGroupModel>;
    raProfiles?: Array<RaProfileSimplifiedModel>;
    customAttributes?: Array<AttributeResponseModel>;
};

export type ComplianceProfileRequestRuleRuleModel = Omit<ComplianceRuleDto, 'attributes'> & {
    attributes?: Array<AttributeRequestModel>;
};

export type ComplianceProfileRequestRuleModel = Omit<ComplianceRuleDto, 'rules'> & {
    rules?: Array<ComplianceProfileRequestRuleRuleModel>;
};

export type ComplianceProfileRequestModel = Omit<ComplianceProfileRequestDto, 'rules | customAttributes'> & {
    rules?: Array<ComplianceProfileRequestRuleModel>;
    customAttributes?: Array<AttributeRequestModel>;
};

export type ComplianceProfileRuleAddRequestModel = Omit<ComplianceRuleAdditionRequestDto, 'attributes'> & {
    attributes?: Array<AttributeRequestModel>;
};

export type ComplianceProfileRuleAddResponseModel = Omit<ComplianceProfileRuleDto, 'attributes'> & {
    attributes: Array<AttributeResponseModel>;
};

export type ComplianceProfileRuleListResponseRuleModel = Omit<ComplianceRulesResponseDto, 'attributes'> & {
    attributes?: Array<AttributeDescriptorModel>;
};

export type ComplianceProfileRuleListResponseModel = Omit<ComplianceRulesListResponseDto, 'rules'> & {
    rules: Array<ComplianceProfileRuleListResponseRuleModel>;
};

export type ComplianceProfileGroupListResponseModel = Omit<ComplianceGroupsListResponseDto, 'groups'> & {
    groups: Array<ComplianceGroupsResponseDto>;
};

export type TRuleGroupType = ComplianceRuleListDto & {
    entityDetails: {
        entityType: string;
        connectorUuid?: string;
        connectorName?: string;
        kind?: string;
    };
    availabilityStatus?: ComplianceRuleAvailabilityStatus;
    updatedReason?: string;
};
