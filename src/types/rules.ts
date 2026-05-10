import type {
    ActionDetailDto,
    ConditionDto,
    ConditionItemRequestDto,
    ConditionRequestDto,
    ExecutionDto,
    ExecutionItemRequestDto,
    ExecutionRequestDto,
    RuleDetailDto,
    TriggerDetailDto,
    TriggerHistoryDto,
    TriggerHistoryObjectSummaryDto,
    TriggerHistoryObjectTriggerSummaryDto,
    TriggerHistorySummaryDto,
    UpdateConditionRequestDto,
    UpdateExecutionRequestDto,
} from './openapi';

export type {
    SearchFieldDataByGroupDto as FieldSearchDataByGroupDto,
    SearchFieldDataByGroupDto as FieldSearchDataByGroupModel,
    ExecutionItemDto,
    ExecutionItemDto as ExecutionItemModel,
    ExecutionDto,
    ExecutionItemRequestDto,
    ExecutionItemRequestDto as ExecutionItemRequestModel,
    ExecutionRequestDto,
    ActionDto,
    ActionDto as ActionModel,
    ConditionItemDto,
    ConditionItemDto as ConditionItemModel,
    ConditionDto,
    ConditionItemRequestDto,
    ConditionItemRequestDto as ConditionItemRequestModel,
    ConditionRequestDto,
    RuleDetailDto,
    RuleDto,
    RuleDto as RuleModel,
    RuleRequestDto,
    RuleRequestDto as RuleRequestModel,
    TriggerDetailDto,
    TriggerDto,
    TriggerDto as TriggerModel,
    TriggerRequestDto,
    TriggerRequestDto as TriggerRequestModel,
    UpdateExecutionRequestDto,
    UpdateConditionRequestDto,
    UpdateRuleRequestDto,
    UpdateRuleRequestDto as UpdateRuleRequestModel,
    UpdateTriggerRequestDto,
    UpdateTriggerRequestDto as UpdateTriggerRequestModel,
    ActionRequestDto,
    ActionRequestDto as ActionRequestModel,
    ActionDetailDto,
    UpdateActionRequestDto,
    UpdateActionRequestDto as UpdateActionRequestModel,
    TriggerHistoryRecordDto,
    TriggerHistoryRecordDto as TriggerHistoryRecordModel,
    TriggerHistoryDto,
    TriggerHistoryObjectTriggerSummaryDto,
    TriggerHistoryObjectSummaryDto,
    TriggerHistorySummaryDto,
    TriggerEventAssociationRequestDto,
    TriggerEventAssociationRequestDto as TriggerEventAssociationRequestModel,
} from './openapi';

export type ExecutionModel = Omit<ExecutionDto, 'items'> & {
    items: Array<import('./openapi').ExecutionItemDto>;
};

export type ExecutionRequestModel = Omit<ExecutionRequestDto, 'items'> & {
    items: Array<ExecutionItemRequestDto>;
};

export type ConditionModel = Omit<ConditionDto, 'items'> & {
    items: Array<import('./openapi').ConditionItemDto>;
};

export type ConditionRequestModel = Omit<ConditionRequestDto, 'items'> & {
    items: Array<ConditionItemRequestDto>;
};

export type RuleDetailModel = Omit<RuleDetailDto, 'conditions'> & {
    conditions: Array<ConditionModel>;
};

export type ActionDetailModel = Omit<ActionDetailDto, 'executions'> & {
    executions: Array<ExecutionModel>;
};

export type TriggerDetailModel = Omit<TriggerDetailDto, 'rules | actions'> & {
    rules: Array<RuleDetailModel>;
    actions: Array<ActionDetailModel>;
};

export type UpdateExecutionRequestModel = Omit<UpdateExecutionRequestDto, 'items'> & {
    items: Array<ExecutionItemRequestDto>;
};

export type UpdateConditionRequestModel = Omit<UpdateConditionRequestDto, 'items'> & {
    items: Array<ConditionItemRequestDto>;
};

export type TriggerHistoryModel = Omit<TriggerHistoryDto, 'records'> & {
    records: Array<import('./openapi').TriggerHistoryRecordDto>;
};

export type TriggerHistoryObjectTriggerSummaryModel = Omit<TriggerHistoryObjectTriggerSummaryDto, 'records'> & {
    records: Array<import('./openapi').TriggerHistoryRecordDto>;
};

export type TriggerHistoryObjectSummaryModel = Omit<TriggerHistoryObjectSummaryDto, 'triggers'> & {
    triggers: Array<TriggerHistoryObjectTriggerSummaryModel>;
};

export type TriggerHistorySummaryModel = Omit<TriggerHistorySummaryDto, 'objects'> & {
    objects: Array<TriggerHistoryObjectSummaryModel>;
};

export type EventTriggerAssociationModel = { [key: string]: Array<string> };
