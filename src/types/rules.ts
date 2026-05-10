import type {
    ActionDetailDto as ActionDetailDtoApi,
    ActionDto as ActionDtoApi,
    ActionRequestDto as ActionRequestDtoApi,
    ConditionDto as ConditionDtoApi,
    ConditionItemDto as ConditionItemDtoApi,
    ConditionItemRequestDto as ConditionItemRequestDtoApi,
    ConditionRequestDto as ConditionRequestDtoApi,
    ExecutionDto as ExecutionDtoApi,
    ExecutionItemDto as ExecutionItemDtoApi,
    ExecutionItemRequestDto as ExecutionItemRequestDtoApi,
    ExecutionRequestDto as ExecutionRequestDtoApi,
    RuleDetailDto as RuleDetailDtoApi,
    RuleDto as RuleDtoApi,
    RuleRequestDto as RuleRequestDtoApi,
    SearchFieldDataByGroupDto,
    TriggerDetailDto as TriggerDetailDtoApi,
    TriggerDto as TriggerDtoApi,
    TriggerEventAssociationRequestDto as TriggerEventAssociationRequestDtoApi,
    TriggerHistoryDto as TriggerHistoryDtoApi,
    TriggerHistoryObjectSummaryDto as TriggerHistoryObjectSummaryDtoApi,
    TriggerHistoryObjectTriggerSummaryDto as TriggerHistoryObjectTriggerSummaryDtoApi,
    TriggerHistoryRecordDto as TriggerHistoryRecordDtoApi,
    TriggerHistorySummaryDto as TriggerHistorySummaryDtoApi,
    TriggerRequestDto as TriggerRequestDtoApi,
    UpdateActionRequestDto as UpdateActionRequestDtoApi,
    UpdateConditionRequestDto as UpdateConditionRequestDtoApi,
    UpdateExecutionRequestDto as UpdateExecutionRequestDtoApi,
    UpdateRuleRequestDto as UpdateRuleRequestDtoApi,
    UpdateTriggerRequestDto as UpdateTriggerRequestDtoApi,
} from './openapi';

export type FieldSearchDataByGroupDto = SearchFieldDataByGroupDto;
export type FieldSearchDataByGroupModel = FieldSearchDataByGroupDto;

export type ExecutionItemDto = ExecutionItemDtoApi;
export type ExecutionItemModel = ExecutionItemDto;

export type ExecutionDto = ExecutionDtoApi;
export type ExecutionModel = Omit<ExecutionDto, 'items'> & {
    items: Array<ExecutionItemModel>;
};

export type ExecutionItemRequestDto = ExecutionItemRequestDtoApi;
export type ExecutionItemRequestModel = ExecutionItemRequestDto;

export type ExecutionRequestDto = ExecutionRequestDtoApi;
export type ExecutionRequestModel = Omit<ExecutionRequestDto, 'items'> & {
    items: Array<ExecutionItemRequestModel>;
};

export type ActionDto = ActionDtoApi;
export type ActionModel = ActionDto;

export type ConditionItemDto = ConditionItemDtoApi;
export type ConditionItemModel = ConditionItemDto;

export type ConditionDto = ConditionDtoApi;
export type ConditionModel = Omit<ConditionDto, 'items'> & {
    items: Array<ConditionItemModel>;
};

export type ConditionItemRequestDto = ConditionItemRequestDtoApi;
export type ConditionItemRequestModel = ConditionItemRequestDto;

export type ConditionRequestDto = ConditionRequestDtoApi;
export type ConditionRequestModel = Omit<ConditionRequestDto, 'items'> & {
    items: Array<ConditionItemRequestModel>;
};

export type RuleDetailDto = RuleDetailDtoApi;
export type RuleDetailModel = Omit<RuleDetailDto, 'conditions'> & {
    conditions: Array<ConditionModel>;
};

export type RuleDto = RuleDtoApi;
export type RuleModel = RuleDto;

export type RuleRequestDto = RuleRequestDtoApi;
export type RuleRequestModel = RuleRequestDto;

export type TriggerDetailDto = TriggerDetailDtoApi;
export type TriggerDetailModel = Omit<TriggerDetailDto, 'rules | actions'> & {
    rules: Array<RuleDetailModel>;
    actions: Array<ActionDetailModel>;
};

export type TriggerDto = TriggerDtoApi;
export type TriggerModel = TriggerDto;

export type TriggerRequestDto = TriggerRequestDtoApi;
export type TriggerRequestModel = TriggerRequestDto;

export type UpdateExecutionRequestDto = UpdateExecutionRequestDtoApi;
export type UpdateExecutionRequestModel = Omit<UpdateExecutionRequestDto, 'items'> & {
    items: Array<ExecutionItemRequestModel>;
};

export type UpdateConditionRequestDto = UpdateConditionRequestDtoApi;
export type UpdateConditionRequestModel = Omit<UpdateConditionRequestDto, 'items'> & {
    items: Array<ConditionItemRequestModel>;
};

export type UpdateRuleRequestDto = UpdateRuleRequestDtoApi;
export type UpdateRuleRequestModel = UpdateRuleRequestDto;

export type UpdateTriggerRequestDto = UpdateTriggerRequestDtoApi;
export type UpdateTriggerRequestModel = UpdateTriggerRequestDto;

export type ActionRequestDto = ActionRequestDtoApi;
export type ActionRequestModel = ActionRequestDto;

export type ActionDetailDto = ActionDetailDtoApi;
export type ActionDetailModel = Omit<ActionDetailDto, 'executions'> & {
    executions: Array<ExecutionModel>;
};

export type UpdateActionRequestDto = UpdateActionRequestDtoApi;
export type UpdateActionRequestModel = UpdateActionRequestDto;

export type TriggerHistoryRecordDto = TriggerHistoryRecordDtoApi;
export type TriggerHistoryRecordModel = TriggerHistoryRecordDto;

export type TriggerHistoryDto = TriggerHistoryDtoApi;
export type TriggerHistoryModel = Omit<TriggerHistoryDto, 'records'> & {
    records: Array<TriggerHistoryRecordModel>;
};
export type TriggerHistoryObjectTriggerSummaryDto = TriggerHistoryObjectTriggerSummaryDtoApi;
export type TriggerHistoryObjectTriggerSummaryModel = Omit<TriggerHistoryObjectTriggerSummaryDto, 'records'> & {
    records: Array<TriggerHistoryRecordModel>;
};
export type TriggerHistoryObjectSummaryDto = TriggerHistoryObjectSummaryDtoApi;
export type TriggerHistoryObjectSummaryModel = Omit<TriggerHistoryObjectSummaryDto, 'triggers'> & {
    triggers: Array<TriggerHistoryObjectTriggerSummaryModel>;
};

export type TriggerHistorySummaryDto = TriggerHistorySummaryDtoApi;
export type TriggerHistorySummaryModel = Omit<TriggerHistorySummaryDto, 'objects'> & {
    objects: Array<TriggerHistoryObjectSummaryModel>;
};

export type EventTriggerAssociationModel = { [key: string]: Array<string> };

export type TriggerEventAssociationRequestDto = TriggerEventAssociationRequestDtoApi;
export type TriggerEventAssociationRequestModel = TriggerEventAssociationRequestDto;
