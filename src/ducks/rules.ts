import { resetSliceState } from 'ducks/reducerUtils';
import type { AppState } from 'ducks';
import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Resource } from 'types/openapi';
import type {
    ActionDetailModel,
    ActionModel,
    ActionRequestModel,
    ConditionModel,
    ConditionRequestModel,
    EventTriggerAssociationModel,
    ExecutionModel,
    ExecutionRequestModel,
    RuleDetailModel,
    RuleModel,
    RuleRequestModel,
    TriggerDetailModel,
    TriggerEventAssociationRequestModel,
    TriggerHistoryModel,
    TriggerHistorySummaryModel,
    TriggerModel,
    TriggerRequestDto,
    UpdateActionRequestModel,
    UpdateConditionRequestModel,
    UpdateExecutionRequestModel,
    UpdateRuleRequestModel,
    UpdateTriggerRequestModel,
} from 'types/rules';

export type State = {
    rules: RuleModel[];
    triggerHistories: TriggerHistoryModel[];
    triggerHistorySummary?: TriggerHistorySummaryModel;
    eventTriggerAssociation?: EventTriggerAssociationModel;

    ruleDetails?: RuleDetailModel;
    executions: ExecutionModel[];
    executionDetails?: ExecutionModel;
    actionsList: ActionModel[];
    actionDetails?: ActionDetailModel;

    conditions: ConditionModel[];
    conditionDetails?: ConditionModel;
    triggers: TriggerModel[];
    triggerDetails?: TriggerDetailModel;

    isUpdatingExecution: boolean;
    isFetchingRulesList: boolean;
    isFetchingExecutions: boolean;
    isFetchingConditions: boolean;
    isFetchingTriggers: boolean;
    isCreatingAction: boolean;
    createActionSucceeded: boolean;
    isFetchingActionDetails: boolean;
    isFetchingRuleDetails: boolean;
    isFetchingExecutionDetails: boolean;
    isFetchingConditionDetails: boolean;
    isFetchingTriggerDetail: boolean;
    isDeletingRule: boolean;
    isCreatingRule: boolean;
    createRuleSucceeded: boolean;
    isCreatingExecution: boolean;
    isDeletingExecution: boolean;
    isCreatingCondition: boolean;
    createConditionSucceeded: boolean;
    isDeletingCondition: boolean;
    isCreatingTrigger: boolean;
    createTriggerSucceeded: boolean;
    isDeletingTrigger: boolean;
    isUpdatingCondition: boolean;
    isUpdatingRule: boolean;
    isUpdatingAction: boolean;
    isUpdatingTrigger: boolean;
    isFetchingTriggerHistories: boolean;
    isFetchingTriggerHistorySummary: boolean;
    isFetchingEventTriggersAssociation: boolean;
    isUpdatingEventTriggersAssociation: boolean;
    associateEventTriggersSucceeded: boolean;
    isFetchingActions: boolean;
    isDeletingAction: boolean;
    isBulkDeletingRules: boolean;
    isBulkDeletingActions: boolean;
    isBulkDeletingConditions: boolean;
    isBulkDeletingTriggers: boolean;
    isBulkDeletingExecutions: boolean;
};

export const initialState: State = {
    rules: [],
    executions: [],
    conditions: [],
    actionsList: [],
    triggers: [],
    triggerHistories: [],

    isFetchingRulesList: false,
    isFetchingExecutions: false,
    isFetchingExecutionDetails: false,
    isFetchingConditionDetails: false,
    isFetchingTriggerDetail: false,

    isFetchingConditions: false,
    isFetchingTriggers: false,
    isCreatingRule: false,
    createRuleSucceeded: false,
    isFetchingRuleDetails: false,

    isUpdatingExecution: false,
    isCreatingExecution: false,
    isCreatingAction: false,
    createActionSucceeded: false,
    isDeletingExecution: false,
    isCreatingCondition: false,
    createConditionSucceeded: false,
    isDeletingCondition: false,
    isCreatingTrigger: false,
    createTriggerSucceeded: false,
    isDeletingTrigger: false,
    isUpdatingCondition: false,
    isUpdatingRule: false,
    isUpdatingTrigger: false,
    isUpdatingAction: false,
    isDeletingRule: false,
    isFetchingTriggerHistories: false,
    isFetchingTriggerHistorySummary: false,
    isFetchingEventTriggersAssociation: false,
    isUpdatingEventTriggersAssociation: false,
    associateEventTriggersSucceeded: false,
    isFetchingActions: false,
    isFetchingActionDetails: false,
    isDeletingAction: false,
    isBulkDeletingRules: false,
    isBulkDeletingActions: false,
    isBulkDeletingConditions: false,
    isBulkDeletingTriggers: false,
    isBulkDeletingExecutions: false,
};

export const slice = createSlice({
    name: 'rules',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        listRules: (state, action: PayloadAction<{ resource?: Resource }>) => {
            state.isFetchingRulesList = true;
        },
        listRulesSuccess: (state, action: PayloadAction<{ rules: RuleModel[] }>) => {
            state.rules = action.payload.rules;
            state.isFetchingRulesList = false;
        },

        listRulesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingRulesList = false;
        },

        listExecutions: (state, action: PayloadAction<{ resource?: Resource }>) => {
            state.isFetchingExecutions = true;
        },
        listExecutionsSuccess: (state, action: PayloadAction<{ executions: ExecutionModel[] }>) => {
            state.executions = action.payload.executions;
            state.isFetchingExecutions = false;
        },

        listExecutionsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingExecutions = false;
        },

        listActions: (state, action: PayloadAction<{ resource?: Resource }>) => {
            state.isFetchingActions = true;
        },

        listActionsSuccess: (state, action: PayloadAction<{ actionsList: ActionModel[] }>) => {
            state.actionsList = action.payload.actionsList;
            state.isFetchingActions = false;
        },

        listActionsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingActions = false;
        },

        listConditions: (state, action: PayloadAction<{ resource?: Resource }>) => {
            state.isFetchingConditions = true;
        },

        listConditionsSuccess: (state, action: PayloadAction<{ conditions: ConditionModel[] }>) => {
            state.conditions = action.payload.conditions;
            state.isFetchingConditions = false;
        },

        listConditionsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingConditions = false;
        },

        listTriggers: (state, action: PayloadAction<{ resource?: Resource }>) => {
            state.isFetchingTriggers = true;
        },
        listTriggersSuccess: (state, action: PayloadAction<{ triggers: TriggerModel[] }>) => {
            state.triggers = action.payload.triggers;
            state.isFetchingTriggers = false;
        },

        listTriggersFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingTriggers = false;
        },

        createExecution: (state, action: PayloadAction<{ executionRequestModel: ExecutionRequestModel }>) => {
            state.isCreatingExecution = true;
        },
        createExecutionSuccess: (state, action: PayloadAction<{ execution: ExecutionModel }>) => {
            state.executions.push(action.payload.execution);
            state.isCreatingExecution = false;
        },

        createExecutionFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreatingExecution = false;
        },

        createAction: (state, action: PayloadAction<{ action: ActionRequestModel }>) => {
            state.isCreatingAction = true;
            state.createActionSucceeded = false;
        },

        createActionSuccess: (state, action: PayloadAction<{ action: ActionModel }>) => {
            state.actionsList.push(action.payload.action);
            state.isCreatingAction = false;
            state.createActionSucceeded = true;
        },

        createActionFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreatingAction = false;
            state.createActionSucceeded = false;
        },

        createCondition: (state, action: PayloadAction<{ conditionRequestModel: ConditionRequestModel }>) => {
            state.isCreatingCondition = true;
            state.createConditionSucceeded = false;
        },

        createConditionSuccess: (state, action: PayloadAction<{ condition: ConditionModel }>) => {
            state.conditions.push(action.payload.condition);
            state.isCreatingCondition = false;
            state.createConditionSucceeded = true;
        },

        createConditionFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreatingCondition = false;
            state.createConditionSucceeded = false;
        },

        createRule: (state, action: PayloadAction<{ rule: RuleRequestModel }>) => {
            state.isCreatingRule = true;
            state.createRuleSucceeded = false;
        },
        createRuleSuccess: (state, action: PayloadAction<{ rule: RuleModel }>) => {
            state.rules.push(action.payload.rule);
            state.isCreatingRule = false;
            state.createRuleSucceeded = true;
        },

        createRuleFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreatingRule = false;
            state.createRuleSucceeded = false;
        },

        createTrigger: (state, action: PayloadAction<{ trigger: TriggerRequestDto }>) => {
            state.isCreatingTrigger = true;
            state.createTriggerSucceeded = false;
        },

        createTriggerSuccess: (state, action: PayloadAction<{ trigger: TriggerDetailModel }>) => {
            state.isCreatingTrigger = false;
            state.createTriggerSucceeded = true;
        },

        createTriggerFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreatingTrigger = false;
            state.createTriggerSucceeded = false;
        },

        deleteExecution: (state, action: PayloadAction<{ executionUuid: string }>) => {
            state.isDeletingExecution = true;
        },

        deleteExecutionSuccess: (state, action: PayloadAction<{ executionUuid: string }>) => {
            state.executions = state.executions.filter((group) => group.uuid !== action.payload.executionUuid);
            state.isDeletingExecution = false;
        },

        deleteExecutionFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeletingExecution = false;
        },
        deleteAction: (state, action: PayloadAction<{ actionUuid: string }>) => {
            state.isDeletingAction = true;
        },

        deleteActionSuccess: (state, action: PayloadAction<{ actionUuid: string }>) => {
            state.actionsList = state.actionsList.filter((group) => group.uuid !== action.payload.actionUuid);
            state.isDeletingAction = false;
        },

        deleteActionFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeletingAction = false;
        },

        deleteCondition: (state, action: PayloadAction<{ conditionUuid: string }>) => {
            state.isDeletingCondition = true;
        },
        deleteConditionSuccess: (state, action: PayloadAction<{ conditionUuid: string }>) => {
            state.conditions = state.conditions.filter((group) => group.uuid !== action.payload.conditionUuid);
            state.isDeletingCondition = false;
        },
        deleteConditionFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeletingCondition = false;
        },

        deleteRule: (state, action: PayloadAction<{ ruleUuid: string }>) => {
            state.isDeletingRule = true;
        },
        deleteRuleSuccess: (state, action: PayloadAction<{ ruleUuid: string }>) => {
            state.rules = state.rules.filter((rule) => rule.uuid !== action.payload.ruleUuid);
            state.isDeletingRule = false;
        },
        deleteRuleFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeletingRule = false;
        },

        deleteTrigger: (state, action: PayloadAction<{ triggerUuid: string }>) => {
            state.isDeletingTrigger = true;
        },
        deleteTriggerSuccess: (state, action: PayloadAction<{ triggerUuid: string }>) => {
            state.triggers = state.triggers.filter((trigger) => trigger.uuid !== action.payload.triggerUuid);
            state.isDeletingTrigger = false;
        },

        deleteTriggerFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeletingTrigger = false;
        },

        bulkDeleteRules: (state, action: PayloadAction<{ ruleUuids: string[] }>) => {
            state.isBulkDeletingRules = true;
        },
        bulkDeleteRulesSuccess: (state, action: PayloadAction<{ ruleUuids: string[] }>) => {
            state.rules = state.rules.filter((rule) => !action.payload.ruleUuids.includes(rule.uuid));
            state.isBulkDeletingRules = false;
        },
        bulkDeleteRulesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeletingRules = false;
        },

        bulkDeleteActions: (state, action: PayloadAction<{ actionUuids: string[] }>) => {
            state.isBulkDeletingActions = true;
        },
        bulkDeleteActionsSuccess: (state, action: PayloadAction<{ actionUuids: string[] }>) => {
            state.actionsList = state.actionsList.filter((item) => !action.payload.actionUuids.includes(item.uuid));
            state.isBulkDeletingActions = false;
        },
        bulkDeleteActionsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeletingActions = false;
        },

        bulkDeleteConditions: (state, action: PayloadAction<{ conditionUuids: string[] }>) => {
            state.isBulkDeletingConditions = true;
        },
        bulkDeleteConditionsSuccess: (state, action: PayloadAction<{ conditionUuids: string[] }>) => {
            state.conditions = state.conditions.filter((condition) => !action.payload.conditionUuids.includes(condition.uuid));
            state.isBulkDeletingConditions = false;
        },
        bulkDeleteConditionsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeletingConditions = false;
        },

        bulkDeleteTriggers: (state, action: PayloadAction<{ triggerUuids: string[] }>) => {
            state.isBulkDeletingTriggers = true;
        },
        bulkDeleteTriggersSuccess: (state, action: PayloadAction<{ triggerUuids: string[] }>) => {
            state.triggers = state.triggers.filter((trigger) => !action.payload.triggerUuids.includes(trigger.uuid));
            state.isBulkDeletingTriggers = false;
        },
        bulkDeleteTriggersFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeletingTriggers = false;
        },

        bulkDeleteExecutions: (state, action: PayloadAction<{ executionUuids: string[] }>) => {
            state.isBulkDeletingExecutions = true;
        },
        bulkDeleteExecutionsSuccess: (state, action: PayloadAction<{ executionUuids: string[] }>) => {
            state.executions = state.executions.filter((execution) => !action.payload.executionUuids.includes(execution.uuid));
            state.isBulkDeletingExecutions = false;
        },
        bulkDeleteExecutionsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeletingExecutions = false;
        },

        getExecution: (state, action: PayloadAction<{ executionUuid: string }>) => {
            state.isFetchingExecutionDetails = true;
        },
        getExecutionSuccess: (state, action: PayloadAction<{ execution: ExecutionModel }>) => {
            state.executionDetails = action.payload.execution;
            state.isFetchingExecutionDetails = false;
        },
        getExecutionFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingExecutionDetails = false;
        },

        getAction: (state, action: PayloadAction<{ actionUuid: string }>) => {
            state.isFetchingActionDetails = true;
        },

        getActionSuccess: (state, action: PayloadAction<{ action: ActionDetailModel }>) => {
            state.actionDetails = action.payload.action;
            state.isFetchingActionDetails = false;
        },

        getActionFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingActionDetails = false;
        },

        getCondition: (state, action: PayloadAction<{ conditionUuid: string }>) => {
            state.isFetchingConditionDetails = true;
        },
        getConditionSuccess: (state, action: PayloadAction<{ condition: ConditionModel }>) => {
            state.conditionDetails = action.payload.condition;
            state.isFetchingConditionDetails = false;
        },
        getConditionFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingConditionDetails = false;
        },
        getRule: (state, action: PayloadAction<{ ruleUuid: string }>) => {
            state.isFetchingRuleDetails = true;
        },
        getRuleSuccess: (state, action: PayloadAction<{ rule: RuleDetailModel }>) => {
            state.ruleDetails = action.payload.rule;
            state.isFetchingRuleDetails = false;
        },
        getRuleFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingRuleDetails = false;
        },

        getTrigger: (state, action: PayloadAction<{ triggerUuid: string }>) => {
            state.isFetchingTriggerDetail = true;
        },
        getTriggerSuccess: (state, action: PayloadAction<{ trigger: TriggerDetailModel }>) => {
            state.triggerDetails = action.payload.trigger;
            state.isFetchingTriggerDetail = false;
        },
        getTriggerFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingTriggerDetail = false;
        },

        updateExecution: (state, action: PayloadAction<{ executionUuid: string; execution: UpdateExecutionRequestModel }>) => {
            state.isUpdatingExecution = true;
        },

        updateExecutionSuccess: (state, action: PayloadAction<{ execution: ExecutionModel }>) => {
            state.executions = state.executions.map((group) =>
                group.uuid === action.payload.execution.uuid ? action.payload.execution : group,
            );

            if (state.executionDetails?.uuid === action.payload.execution.uuid) {
                state.executionDetails = action.payload.execution;
            }

            state.isUpdatingExecution = false;
        },

        updateExecutionFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingExecution = false;
        },

        updateAction: (state, action: PayloadAction<{ actionUuid: string; action: UpdateActionRequestModel; noRedirect?: boolean }>) => {
            state.isUpdatingAction = true;
        },

        updateActionSuccess: (state, action: PayloadAction<{ action: ActionDetailModel }>) => {
            state.actionsList = state.actionsList.map((group) =>
                group.uuid === action.payload.action.uuid ? action.payload.action : group,
            );

            if (state.actionDetails?.uuid === action.payload.action.uuid) {
                state.actionDetails = action.payload.action;
            }

            state.isUpdatingAction = false;
        },

        updateActionFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingAction = false;
        },

        updateCondition: (state, action: PayloadAction<{ conditionUuid: string; condition: UpdateConditionRequestModel }>) => {
            state.isUpdatingCondition = true;
        },

        updateConditionSuccess: (state, action: PayloadAction<{ condition: ConditionModel }>) => {
            state.conditions = state.conditions.map((group) =>
                group.uuid === action.payload.condition.uuid ? action.payload.condition : group,
            );

            if (state.conditionDetails?.uuid === action.payload.condition.uuid) {
                state.conditionDetails = action.payload.condition;
            }

            state.isUpdatingCondition = false;
        },

        updateConditionFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingCondition = false;
        },

        updateRule: (state, action: PayloadAction<{ ruleUuid: string; rule: UpdateRuleRequestModel; noRedirect?: boolean }>) => {
            state.isUpdatingRule = true;
        },
        updateRuleSuccess: (state, action: PayloadAction<{ rule: RuleDetailModel }>) => {
            state.rules = state.rules.map((rule) => (rule.uuid === action.payload.rule.uuid ? action.payload.rule : rule));
            state.isUpdatingRule = false;

            if (state.ruleDetails?.uuid === action.payload.rule.uuid) {
                state.ruleDetails = action.payload.rule;
            }
        },
        updateRuleFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingRule = false;
        },

        updateTrigger: (state, action: PayloadAction<{ triggerUuid: string; trigger: UpdateTriggerRequestModel }>) => {
            state.isUpdatingTrigger = true;
        },

        updateTriggerSuccess: (state, action: PayloadAction<{ trigger: TriggerDetailModel }>) => {
            state.triggers = state.triggers.map((trigger) =>
                trigger.uuid === action.payload.trigger.uuid ? action.payload.trigger : trigger,
            );

            if (state.triggerDetails?.uuid === action.payload.trigger.uuid) {
                state.triggerDetails = action.payload.trigger;
            }

            state.isUpdatingTrigger = false;
        },

        updateTriggerFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingTrigger = false;
        },

        getTriggerHistory: (state, action: PayloadAction<{ triggerUuid: string; triggerObjectUuid: string }>) => {
            state.isFetchingTriggerHistories = true;
        },

        getTriggerHistorySuccess: (state, action: PayloadAction<{ triggerHistories: TriggerHistoryModel[] }>) => {
            state.triggerHistories = action.payload.triggerHistories;
            state.isFetchingTriggerHistories = false;
        },

        getTriggerHistoryFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingTriggerHistories = false;
        },

        getTriggerHistorySummary: (state, action: PayloadAction<{ triggerObjectUuid: string }>) => {
            state.isFetchingTriggerHistorySummary = true;
        },
        getTriggerHistorySummarySuccess: (state, action: PayloadAction<{ triggerHistorySummary: TriggerHistorySummaryModel }>) => {
            state.triggerHistorySummary = action.payload.triggerHistorySummary;
            state.isFetchingTriggerHistorySummary = false;
        },
        getTriggerHistorySummaryFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingTriggerHistorySummary = false;
        },

        getEventTriggersAssociations: (state, action: PayloadAction<{ resource: Resource; associationObjectUuid: string }>) => {
            state.isFetchingEventTriggersAssociation = true;
            state.associateEventTriggersSucceeded = false;
        },
        getEventTriggersAssociationsSuccess: (state, action: PayloadAction<{ eventTriggerAssociation: EventTriggerAssociationModel }>) => {
            state.eventTriggerAssociation = action.payload.eventTriggerAssociation;
            state.isFetchingEventTriggersAssociation = false;
        },
        getEventTriggersAssociationsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingEventTriggersAssociation = false;
        },

        associateEventTriggers: (
            state,
            action: PayloadAction<{ triggerEventAssociationRequestModel: TriggerEventAssociationRequestModel }>,
        ) => {
            state.isFetchingEventTriggersAssociation = true;
            state.associateEventTriggersSucceeded = false;
        },
        associateEventTriggersSuccess: (
            state,
            action: PayloadAction<{ triggerEventAssociationRequestModel: TriggerEventAssociationRequestModel }>,
        ) => {
            state.isFetchingEventTriggersAssociation = false;
            state.associateEventTriggersSucceeded = true;
            const { event, triggerUuids } = action.payload.triggerEventAssociationRequestModel;
            if (state.eventTriggerAssociation) {
                if (triggerUuids.length) {
                    state.eventTriggerAssociation = {
                        ...state.eventTriggerAssociation,
                        [event]: triggerUuids,
                    };
                } else {
                    delete state.eventTriggerAssociation[event];
                }
            }
        },
        associateEventTriggersFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingEventTriggersAssociation = false;
            state.associateEventTriggersSucceeded = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const rules = createSelector(state, (state) => state.rules);
const ruleDetails = createSelector(state, (state) => state.ruleDetails);

const conditions = createSelector(state, (state) => state.conditions);
const conditionDetails = createSelector(state, (state) => state.conditionDetails);

const triggerDetails = createSelector(state, (state) => state.triggerDetails);
const triggers = createSelector(state, (state) => state.triggers);
const triggerHistories = createSelector(state, (state) => state.triggerHistories);
const triggerHistorySummary = createSelector(state, (state) => state.triggerHistorySummary);
const eventTriggerAssociation = createSelector(state, (state) => state.eventTriggerAssociation);

const actionsList = createSelector(state, (state) => state.actionsList);
const actionDetails = createSelector(state, (state) => state.actionDetails);

const executions = createSelector(state, (state) => state.executions);
const executionDetails = createSelector(state, (state) => state.executionDetails);

const isCreatingCondition = createSelector(state, (state) => state.isCreatingCondition);
const createConditionSucceeded = createSelector(state, (state) => state.createConditionSucceeded);
const isUpdatingCondition = createSelector(state, (state) => state.isUpdatingCondition);

const isCreatingRule = createSelector(state, (state) => state.isCreatingRule);
const createRuleSucceeded = createSelector(state, (state) => state.createRuleSucceeded);

const isFetchingTriggerHistorySummary = createSelector(state, (state) => state.isFetchingTriggerHistorySummary);
const isFetchingEventTriggersAssociation = createSelector(state, (state) => state.isFetchingEventTriggersAssociation);
const isUpdatingEventTriggersAssociation = createSelector(state, (state) => state.isUpdatingEventTriggersAssociation);
const associateEventTriggersSucceeded = createSelector(state, (state) => state.associateEventTriggersSucceeded);
const isFetchingTriggerHistories = createSelector(state, (state) => state.isFetchingTriggerHistories);
const isUpdatingRule = createSelector(state, (state) => state.isUpdatingRule);
const isDeletingRule = createSelector(state, (state) => state.isDeletingRule);
const isFetchingRulesList = createSelector(state, (state) => state.isFetchingRulesList);
const isFetchingConditions = createSelector(state, (state) => state.isFetchingConditions);
const isDeletingCondition = createSelector(state, (state) => state.isDeletingCondition);
const isFetchingConditionDetails = createSelector(state, (state) => state.isFetchingConditionDetails);
const isFetchingRuleDetails = createSelector(state, (state) => state.isFetchingRuleDetails);
const isCreatingExecution = createSelector(state, (state) => state.isCreatingExecution);
const isFetchingExecutions = createSelector(state, (state) => state.isFetchingExecutions);
const isDeletingExecution = createSelector(state, (state) => state.isDeletingExecution);
const isFetchingActionDetails = createSelector(state, (state) => state.isFetchingActionDetails);
const isUpdatingAction = createSelector(state, (state) => state.isUpdatingAction);
const isCreatingAction = createSelector(state, (state) => state.isCreatingAction);
const createActionSucceeded = createSelector(state, (state) => state.createActionSucceeded);
const isFetchingExecutionDetails = createSelector(state, (state) => state.isFetchingExecutionDetails);
const isUpdatingExecution = createSelector(state, (state) => state.isUpdatingExecution);
const isUpdatingTrigger = createSelector(state, (state) => state.isUpdatingTrigger);
const isFetchingTriggerDetail = createSelector(state, (state) => state.isFetchingTriggerDetail);
const isDeletingTrigger = createSelector(state, (state) => state.isDeletingTrigger);
const isFetchingTriggers = createSelector(state, (state) => state.isFetchingTriggers);
const isCreatingTrigger = createSelector(state, (state) => state.isCreatingTrigger);
const createTriggerSucceeded = createSelector(state, (state) => state.createTriggerSucceeded);
const isFetchingActions = createSelector(state, (state) => state.isFetchingActions);
const isDeletingAction = createSelector(state, (state) => state.isDeletingAction);
const isBulkDeletingRules = createSelector(state, (state) => state.isBulkDeletingRules);
const isBulkDeletingActions = createSelector(state, (state) => state.isBulkDeletingActions);
const isBulkDeletingConditions = createSelector(state, (state) => state.isBulkDeletingConditions);
const isBulkDeletingTriggers = createSelector(state, (state) => state.isBulkDeletingTriggers);
const isBulkDeletingExecutions = createSelector(state, (state) => state.isBulkDeletingExecutions);

export const selectors = {
    rules,
    triggers,
    triggerDetails,
    conditions,
    conditionDetails,
    executions,
    actionDetails,
    actionsList,
    triggerHistorySummary,
    eventTriggerAssociation,

    isCreatingAction,
    createActionSucceeded,
    isFetchingActionDetails,
    isUpdatingAction,
    executionDetails,
    ruleDetails,
    triggerHistories,
    isDeletingRule,
    isFetchingConditions,
    isDeletingCondition,
    isFetchingRulesList,
    isCreatingCondition,
    createConditionSucceeded,
    isCreatingRule,
    createRuleSucceeded,
    isUpdatingCondition,
    isFetchingConditionDetails,
    isUpdatingRule,
    isFetchingRuleDetails,
    isCreatingExecution,
    isFetchingExecutions,
    isDeletingExecution,
    isFetchingExecutionDetails,
    isUpdatingExecution,
    isUpdatingTrigger,
    isFetchingTriggerDetail,
    isDeletingTrigger,
    isFetchingTriggers,
    isCreatingTrigger,
    createTriggerSucceeded,
    isFetchingTriggerHistories,
    isFetchingTriggerHistorySummary,
    isFetchingEventTriggersAssociation,
    isUpdatingEventTriggersAssociation,
    associateEventTriggersSucceeded,
    isFetchingActions,
    isDeletingAction,
    isBulkDeletingRules,
    isBulkDeletingActions,
    isBulkDeletingConditions,
    isBulkDeletingTriggers,
    isBulkDeletingExecutions,
};

export const actions = slice.actions;

export default slice.reducer;
