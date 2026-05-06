import { describe, expect, test } from 'vitest';
import reducer, { actions, initialState, selectors } from './rules';

describe('rules slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initialState', () => {
        const dirty = { ...initialState, isFetchingRulesList: true, rules: [{ uuid: 'r-1' }] } as any;
        expect(reducer(dirty, actions.resetState())).toEqual(initialState);
    });

    test('listRules / listRulesSuccess / listRulesFailure', () => {
        let next = reducer(initialState, actions.listRules({} as any));
        expect(next.isFetchingRulesList).toBe(true);

        next = reducer(next, actions.listRulesSuccess({ rules: [{ uuid: 'r-1' }] } as any));
        expect(next.rules).toHaveLength(1);
        expect(next.isFetchingRulesList).toBe(false);

        next = reducer({ ...next, isFetchingRulesList: true }, actions.listRulesFailure({ error: 'err' }));
        expect(next.isFetchingRulesList).toBe(false);
    });

    test('listExecutions / listExecutionsSuccess / listExecutionsFailure', () => {
        let next = reducer(initialState, actions.listExecutions({} as any));
        expect(next.isFetchingExecutions).toBe(true);

        next = reducer(next, actions.listExecutionsSuccess({ executions: [{ uuid: 'e-1' }] } as any));
        expect(next.executions).toHaveLength(1);
        expect(next.isFetchingExecutions).toBe(false);

        next = reducer({ ...next, isFetchingExecutions: true }, actions.listExecutionsFailure({ error: 'err' }));
        expect(next.isFetchingExecutions).toBe(false);
    });

    test('listActions / listActionsSuccess / listActionsFailure', () => {
        let next = reducer(initialState, actions.listActions({} as any));
        expect(next.isFetchingActions).toBe(true);

        next = reducer(next, actions.listActionsSuccess({ actionsList: [{ uuid: 'a-1' }] } as any));
        expect(next.actionsList).toHaveLength(1);
        expect(next.isFetchingActions).toBe(false);

        next = reducer({ ...next, isFetchingActions: true }, actions.listActionsFailure({ error: 'err' }));
        expect(next.isFetchingActions).toBe(false);
    });

    test('listConditions / listConditionsSuccess / listConditionsFailure', () => {
        let next = reducer(initialState, actions.listConditions({} as any));
        expect(next.isFetchingConditions).toBe(true);

        next = reducer(next, actions.listConditionsSuccess({ conditions: [{ uuid: 'c-1' }] } as any));
        expect(next.conditions).toHaveLength(1);
        expect(next.isFetchingConditions).toBe(false);

        next = reducer({ ...next, isFetchingConditions: true }, actions.listConditionsFailure({ error: 'err' }));
        expect(next.isFetchingConditions).toBe(false);
    });

    test('listTriggers / listTriggersSuccess / listTriggersFailure', () => {
        let next = reducer(initialState, actions.listTriggers({} as any));
        expect(next.isFetchingTriggers).toBe(true);

        next = reducer(next, actions.listTriggersSuccess({ triggers: [{ uuid: 't-1' }] } as any));
        expect(next.triggers).toHaveLength(1);
        expect(next.isFetchingTriggers).toBe(false);

        next = reducer({ ...next, isFetchingTriggers: true }, actions.listTriggersFailure({ error: 'err' }));
        expect(next.isFetchingTriggers).toBe(false);
    });

    test('createExecution / createExecutionSuccess / createExecutionFailure', () => {
        let next = reducer(initialState, actions.createExecution({ executionRequestModel: {} } as any));
        expect(next.isCreatingExecution).toBe(true);

        next = reducer(next, actions.createExecutionSuccess({ execution: { uuid: 'e-2' } } as any));
        expect(next.executions).toHaveLength(1);
        expect(next.executions[0].uuid).toBe('e-2');
        expect(next.isCreatingExecution).toBe(false);

        next = reducer({ ...next, isCreatingExecution: true }, actions.createExecutionFailure({ error: 'err' }));
        expect(next.isCreatingExecution).toBe(false);
    });

    test('createAction / createActionSuccess / createActionFailure', () => {
        let next = reducer(initialState, actions.createAction({ action: {} } as any));
        expect(next.isCreatingAction).toBe(true);
        expect(next.createActionSucceeded).toBe(false);

        next = reducer(next, actions.createActionSuccess({ action: { uuid: 'a-2' } } as any));
        expect(next.actionsList).toHaveLength(1);
        expect(next.isCreatingAction).toBe(false);
        expect(next.createActionSucceeded).toBe(true);

        next = reducer({ ...next, isCreatingAction: true, createActionSucceeded: true }, actions.createActionFailure({ error: 'err' }));
        expect(next.isCreatingAction).toBe(false);
        expect(next.createActionSucceeded).toBe(false);
    });

    test('createCondition / createConditionSuccess / createConditionFailure', () => {
        let next = reducer(initialState, actions.createCondition({ conditionRequestModel: {} } as any));
        expect(next.isCreatingCondition).toBe(true);
        expect(next.createConditionSucceeded).toBe(false);

        next = reducer(next, actions.createConditionSuccess({ condition: { uuid: 'c-2' } } as any));
        expect(next.conditions).toHaveLength(1);
        expect(next.isCreatingCondition).toBe(false);
        expect(next.createConditionSucceeded).toBe(true);

        next = reducer(
            { ...next, isCreatingCondition: true, createConditionSucceeded: true },
            actions.createConditionFailure({ error: 'err' }),
        );
        expect(next.isCreatingCondition).toBe(false);
        expect(next.createConditionSucceeded).toBe(false);
    });

    test('createRule / createRuleSuccess / createRuleFailure', () => {
        let next = reducer(initialState, actions.createRule({ rule: {} } as any));
        expect(next.isCreatingRule).toBe(true);
        expect(next.createRuleSucceeded).toBe(false);

        next = reducer(next, actions.createRuleSuccess({ rule: { uuid: 'r-2' } } as any));
        expect(next.rules).toHaveLength(1);
        expect(next.isCreatingRule).toBe(false);
        expect(next.createRuleSucceeded).toBe(true);

        next = reducer({ ...next, isCreatingRule: true, createRuleSucceeded: true }, actions.createRuleFailure({ error: 'err' }));
        expect(next.isCreatingRule).toBe(false);
        expect(next.createRuleSucceeded).toBe(false);
    });

    test('createTrigger / createTriggerSuccess / createTriggerFailure', () => {
        let next = reducer(initialState, actions.createTrigger({ trigger: {} } as any));
        expect(next.isCreatingTrigger).toBe(true);
        expect(next.createTriggerSucceeded).toBe(false);

        next = reducer(next, actions.createTriggerSuccess({ trigger: { uuid: 't-2' } } as any));
        expect(next.isCreatingTrigger).toBe(false);
        expect(next.createTriggerSucceeded).toBe(true);

        next = reducer({ ...next, isCreatingTrigger: true, createTriggerSucceeded: true }, actions.createTriggerFailure({ error: 'err' }));
        expect(next.isCreatingTrigger).toBe(false);
        expect(next.createTriggerSucceeded).toBe(false);
    });

    test('deleteExecution / deleteExecutionSuccess / deleteExecutionFailure', () => {
        const withExecution = { ...initialState, executions: [{ uuid: 'e-1' }] } as any;

        let next = reducer(withExecution, actions.deleteExecution({ executionUuid: 'e-1' }));
        expect(next.isDeletingExecution).toBe(true);

        next = reducer(next, actions.deleteExecutionSuccess({ executionUuid: 'e-1' }));
        expect(next.executions).toHaveLength(0);
        expect(next.isDeletingExecution).toBe(false);

        next = reducer({ ...next, isDeletingExecution: true }, actions.deleteExecutionFailure({ error: 'err' }));
        expect(next.isDeletingExecution).toBe(false);
    });

    test('deleteAction / deleteActionSuccess / deleteActionFailure', () => {
        const withAction = { ...initialState, actionsList: [{ uuid: 'a-1' }] } as any;

        let next = reducer(withAction, actions.deleteAction({ actionUuid: 'a-1' }));
        expect(next.isDeletingAction).toBe(true);

        next = reducer(next, actions.deleteActionSuccess({ actionUuid: 'a-1' }));
        expect(next.actionsList).toHaveLength(0);
        expect(next.isDeletingAction).toBe(false);

        next = reducer({ ...next, isDeletingAction: true }, actions.deleteActionFailure({ error: 'err' }));
        expect(next.isDeletingAction).toBe(false);
    });

    test('deleteCondition / deleteConditionSuccess / deleteConditionFailure', () => {
        const withCondition = { ...initialState, conditions: [{ uuid: 'c-1' }] } as any;

        let next = reducer(withCondition, actions.deleteCondition({ conditionUuid: 'c-1' }));
        expect(next.isDeletingCondition).toBe(true);

        next = reducer(next, actions.deleteConditionSuccess({ conditionUuid: 'c-1' }));
        expect(next.conditions).toHaveLength(0);
        expect(next.isDeletingCondition).toBe(false);

        next = reducer({ ...next, isDeletingCondition: true }, actions.deleteConditionFailure({ error: 'err' }));
        expect(next.isDeletingCondition).toBe(false);
    });

    test('deleteRule / deleteRuleSuccess / deleteRuleFailure', () => {
        const withRule = { ...initialState, rules: [{ uuid: 'r-1' }] } as any;

        let next = reducer(withRule, actions.deleteRule({ ruleUuid: 'r-1' }));
        expect(next.isDeletingRule).toBe(true);

        next = reducer(next, actions.deleteRuleSuccess({ ruleUuid: 'r-1' }));
        expect(next.rules).toHaveLength(0);
        expect(next.isDeletingRule).toBe(false);

        next = reducer({ ...next, isDeletingRule: true }, actions.deleteRuleFailure({ error: 'err' }));
        expect(next.isDeletingRule).toBe(false);
    });

    test('deleteTrigger / deleteTriggerSuccess / deleteTriggerFailure', () => {
        const withTrigger = { ...initialState, triggers: [{ uuid: 't-1' }] } as any;

        let next = reducer(withTrigger, actions.deleteTrigger({ triggerUuid: 't-1' }));
        expect(next.isDeletingTrigger).toBe(true);

        next = reducer(next, actions.deleteTriggerSuccess({ triggerUuid: 't-1' }));
        expect(next.triggers).toHaveLength(0);
        expect(next.isDeletingTrigger).toBe(false);

        next = reducer({ ...next, isDeletingTrigger: true }, actions.deleteTriggerFailure({ error: 'err' }));
        expect(next.isDeletingTrigger).toBe(false);
    });

    test('bulkDeleteRules / bulkDeleteRulesSuccess / bulkDeleteRulesFailure', () => {
        const withRules = { ...initialState, rules: [{ uuid: 'r-1' }, { uuid: 'r-2' }] } as any;

        let next = reducer(withRules, actions.bulkDeleteRules({ ruleUuids: ['r-1'] }));
        expect(next.isBulkDeletingRules).toBe(true);

        next = reducer(next, actions.bulkDeleteRulesSuccess({ ruleUuids: ['r-1'] }));
        expect(next.rules).toHaveLength(1);
        expect(next.rules[0].uuid).toBe('r-2');
        expect(next.isBulkDeletingRules).toBe(false);

        next = reducer({ ...next, isBulkDeletingRules: true }, actions.bulkDeleteRulesFailure({ error: 'err' }));
        expect(next.isBulkDeletingRules).toBe(false);
    });

    test('bulkDeleteRulesSuccess removes all specified uuids', () => {
        const withRules = { ...initialState, rules: [{ uuid: 'r-1' }, { uuid: 'r-2' }] } as any;
        const next = reducer(withRules, actions.bulkDeleteRulesSuccess({ ruleUuids: ['r-1', 'r-2'] }));
        expect(next.rules).toHaveLength(0);
    });

    test('bulkDeleteActions / bulkDeleteActionsSuccess / bulkDeleteActionsFailure', () => {
        const withActions = { ...initialState, actionsList: [{ uuid: 'a-1' }, { uuid: 'a-2' }] } as any;

        let next = reducer(withActions, actions.bulkDeleteActions({ actionUuids: ['a-1'] }));
        expect(next.isBulkDeletingActions).toBe(true);

        next = reducer(next, actions.bulkDeleteActionsSuccess({ actionUuids: ['a-1'] }));
        expect(next.actionsList).toHaveLength(1);
        expect(next.actionsList[0].uuid).toBe('a-2');
        expect(next.isBulkDeletingActions).toBe(false);

        next = reducer({ ...next, isBulkDeletingActions: true }, actions.bulkDeleteActionsFailure({ error: 'err' }));
        expect(next.isBulkDeletingActions).toBe(false);
    });

    test('bulkDeleteConditions / bulkDeleteConditionsSuccess / bulkDeleteConditionsFailure', () => {
        const withConditions = { ...initialState, conditions: [{ uuid: 'c-1' }, { uuid: 'c-2' }] } as any;

        let next = reducer(withConditions, actions.bulkDeleteConditions({ conditionUuids: ['c-1'] }));
        expect(next.isBulkDeletingConditions).toBe(true);

        next = reducer(next, actions.bulkDeleteConditionsSuccess({ conditionUuids: ['c-1'] }));
        expect(next.conditions).toHaveLength(1);
        expect(next.conditions[0].uuid).toBe('c-2');
        expect(next.isBulkDeletingConditions).toBe(false);

        next = reducer({ ...next, isBulkDeletingConditions: true }, actions.bulkDeleteConditionsFailure({ error: 'err' }));
        expect(next.isBulkDeletingConditions).toBe(false);
    });

    test('bulkDeleteTriggers / bulkDeleteTriggersSuccess / bulkDeleteTriggersFailure', () => {
        const withTriggers = { ...initialState, triggers: [{ uuid: 't-1' }, { uuid: 't-2' }] } as any;

        let next = reducer(withTriggers, actions.bulkDeleteTriggers({ triggerUuids: ['t-1'] }));
        expect(next.isBulkDeletingTriggers).toBe(true);

        next = reducer(next, actions.bulkDeleteTriggersSuccess({ triggerUuids: ['t-1'] }));
        expect(next.triggers).toHaveLength(1);
        expect(next.triggers[0].uuid).toBe('t-2');
        expect(next.isBulkDeletingTriggers).toBe(false);

        next = reducer({ ...next, isBulkDeletingTriggers: true }, actions.bulkDeleteTriggersFailure({ error: 'err' }));
        expect(next.isBulkDeletingTriggers).toBe(false);
    });

    test('bulkDeleteExecutions / bulkDeleteExecutionsSuccess / bulkDeleteExecutionsFailure', () => {
        const withExecutions = { ...initialState, executions: [{ uuid: 'e-1' }, { uuid: 'e-2' }] } as any;

        let next = reducer(withExecutions, actions.bulkDeleteExecutions({ executionUuids: ['e-1'] }));
        expect(next.isBulkDeletingExecutions).toBe(true);

        next = reducer(next, actions.bulkDeleteExecutionsSuccess({ executionUuids: ['e-1'] }));
        expect(next.executions).toHaveLength(1);
        expect(next.executions[0].uuid).toBe('e-2');
        expect(next.isBulkDeletingExecutions).toBe(false);

        next = reducer({ ...next, isBulkDeletingExecutions: true }, actions.bulkDeleteExecutionsFailure({ error: 'err' }));
        expect(next.isBulkDeletingExecutions).toBe(false);
    });

    test('getExecution / getExecutionSuccess / getExecutionFailure', () => {
        let next = reducer(initialState, actions.getExecution({ executionUuid: 'e-1' }));
        expect(next.isFetchingExecutionDetails).toBe(true);

        next = reducer(next, actions.getExecutionSuccess({ execution: { uuid: 'e-1' } } as any));
        expect(next.executionDetails).toEqual({ uuid: 'e-1' });
        expect(next.isFetchingExecutionDetails).toBe(false);

        next = reducer({ ...next, isFetchingExecutionDetails: true }, actions.getExecutionFailure({ error: 'err' }));
        expect(next.isFetchingExecutionDetails).toBe(false);
    });

    test('getAction / getActionSuccess / getActionFailure', () => {
        let next = reducer(initialState, actions.getAction({ actionUuid: 'a-1' }));
        expect(next.isFetchingActionDetails).toBe(true);

        next = reducer(next, actions.getActionSuccess({ action: { uuid: 'a-1' } } as any));
        expect(next.actionDetails).toEqual({ uuid: 'a-1' });
        expect(next.isFetchingActionDetails).toBe(false);

        next = reducer({ ...next, isFetchingActionDetails: true }, actions.getActionFailure({ error: 'err' }));
        expect(next.isFetchingActionDetails).toBe(false);
    });

    test('getCondition / getConditionSuccess / getConditionFailure', () => {
        let next = reducer(initialState, actions.getCondition({ conditionUuid: 'c-1' }));
        expect(next.isFetchingConditionDetails).toBe(true);

        next = reducer(next, actions.getConditionSuccess({ condition: { uuid: 'c-1' } } as any));
        expect(next.conditionDetails).toEqual({ uuid: 'c-1' });
        expect(next.isFetchingConditionDetails).toBe(false);

        next = reducer({ ...next, isFetchingConditionDetails: true }, actions.getConditionFailure({ error: 'err' }));
        expect(next.isFetchingConditionDetails).toBe(false);
    });

    test('getRule / getRuleSuccess / getRuleFailure', () => {
        let next = reducer(initialState, actions.getRule({ ruleUuid: 'r-1' }));
        expect(next.isFetchingRuleDetails).toBe(true);

        next = reducer(next, actions.getRuleSuccess({ rule: { uuid: 'r-1' } } as any));
        expect(next.ruleDetails).toEqual({ uuid: 'r-1' });
        expect(next.isFetchingRuleDetails).toBe(false);

        next = reducer({ ...next, isFetchingRuleDetails: true }, actions.getRuleFailure({ error: 'err' }));
        expect(next.isFetchingRuleDetails).toBe(false);
    });

    test('getTrigger / getTriggerSuccess / getTriggerFailure', () => {
        let next = reducer(initialState, actions.getTrigger({ triggerUuid: 't-1' }));
        expect(next.isFetchingTriggerDetail).toBe(true);

        next = reducer(next, actions.getTriggerSuccess({ trigger: { uuid: 't-1' } } as any));
        expect(next.triggerDetails).toEqual({ uuid: 't-1' });
        expect(next.isFetchingTriggerDetail).toBe(false);

        next = reducer({ ...next, isFetchingTriggerDetail: true }, actions.getTriggerFailure({ error: 'err' }));
        expect(next.isFetchingTriggerDetail).toBe(false);
    });

    test('updateExecution / updateExecutionSuccess / updateExecutionFailure', () => {
        const withExecution = {
            ...initialState,
            executions: [{ uuid: 'e-1', name: 'old' }],
            executionDetails: { uuid: 'e-1', name: 'old' },
        } as any;

        let next = reducer(withExecution, actions.updateExecution({ executionUuid: 'e-1', execution: {} } as any));
        expect(next.isUpdatingExecution).toBe(true);

        const updated = { uuid: 'e-1', name: 'new' };
        next = reducer(next, actions.updateExecutionSuccess({ execution: updated } as any));
        expect(next.executions[0].name).toBe('new');
        expect(next.executionDetails).toEqual(updated);
        expect(next.isUpdatingExecution).toBe(false);

        next = reducer({ ...next, isUpdatingExecution: true }, actions.updateExecutionFailure({ error: 'err' }));
        expect(next.isUpdatingExecution).toBe(false);
    });

    test('updateExecutionSuccess does not update executionDetails when uuid differs', () => {
        const withExecution = {
            ...initialState,
            executions: [
                { uuid: 'e-1', name: 'old' },
                { uuid: 'e-2', name: 'other' },
            ],
            executionDetails: { uuid: 'e-2', name: 'other' },
        } as any;

        const next = reducer(
            { ...withExecution, isUpdatingExecution: true },
            actions.updateExecutionSuccess({ execution: { uuid: 'e-1', name: 'new' } } as any),
        );
        expect(next.executionDetails).toEqual({ uuid: 'e-2', name: 'other' });
    });

    test('updateAction / updateActionSuccess / updateActionFailure', () => {
        const withAction = {
            ...initialState,
            actionsList: [{ uuid: 'a-1', name: 'old' }],
            actionDetails: { uuid: 'a-1', name: 'old' },
        } as any;

        let next = reducer(withAction, actions.updateAction({ actionUuid: 'a-1', action: {} } as any));
        expect(next.isUpdatingAction).toBe(true);

        const updated = { uuid: 'a-1', name: 'new' };
        next = reducer(next, actions.updateActionSuccess({ action: updated } as any));
        expect(next.actionsList[0].name).toBe('new');
        expect(next.actionDetails).toEqual(updated);
        expect(next.isUpdatingAction).toBe(false);

        next = reducer({ ...next, isUpdatingAction: true }, actions.updateActionFailure({ error: 'err' }));
        expect(next.isUpdatingAction).toBe(false);
    });

    test('updateCondition / updateConditionSuccess / updateConditionFailure', () => {
        const withCondition = {
            ...initialState,
            conditions: [{ uuid: 'c-1', name: 'old' }],
            conditionDetails: { uuid: 'c-1', name: 'old' },
        } as any;

        let next = reducer(withCondition, actions.updateCondition({ conditionUuid: 'c-1', condition: {} } as any));
        expect(next.isUpdatingCondition).toBe(true);

        const updated = { uuid: 'c-1', name: 'new' };
        next = reducer(next, actions.updateConditionSuccess({ condition: updated } as any));
        expect(next.conditions[0].name).toBe('new');
        expect(next.conditionDetails).toEqual(updated);
        expect(next.isUpdatingCondition).toBe(false);

        next = reducer({ ...next, isUpdatingCondition: true }, actions.updateConditionFailure({ error: 'err' }));
        expect(next.isUpdatingCondition).toBe(false);
    });

    test('updateRule / updateRuleSuccess / updateRuleFailure', () => {
        const withRule = {
            ...initialState,
            rules: [{ uuid: 'r-1', name: 'old' }],
            ruleDetails: { uuid: 'r-1', name: 'old' },
        } as any;

        let next = reducer(withRule, actions.updateRule({ ruleUuid: 'r-1', rule: {} } as any));
        expect(next.isUpdatingRule).toBe(true);

        const updated = { uuid: 'r-1', name: 'new' };
        next = reducer(next, actions.updateRuleSuccess({ rule: updated } as any));
        expect(next.rules[0].name).toBe('new');
        expect(next.ruleDetails).toEqual(updated);
        expect(next.isUpdatingRule).toBe(false);

        next = reducer({ ...next, isUpdatingRule: true }, actions.updateRuleFailure({ error: 'err' }));
        expect(next.isUpdatingRule).toBe(false);
    });

    test('updateTrigger / updateTriggerSuccess / updateTriggerFailure', () => {
        const withTrigger = {
            ...initialState,
            triggerDetails: { uuid: 't-1', name: 'old' },
        } as any;

        let next = reducer(withTrigger, actions.updateTrigger({ triggerUuid: 't-1', trigger: {} } as any));
        expect(next.isUpdatingTrigger).toBe(true);

        const updated = { uuid: 't-1', name: 'new' };
        next = reducer(next, actions.updateTriggerSuccess({ trigger: updated } as any));
        expect(next.triggerDetails).toEqual(updated);
        expect(next.isUpdatingTrigger).toBe(false);

        next = reducer({ ...next, isUpdatingTrigger: true }, actions.updateTriggerFailure({ error: 'err' }));
        expect(next.isUpdatingTrigger).toBe(false);
    });

    test('updateTriggerSuccess does not update triggerDetails when uuid differs', () => {
        const withTrigger = {
            ...initialState,
            triggerDetails: { uuid: 't-2', name: 'other' },
        } as any;

        const next = reducer(
            { ...withTrigger, isUpdatingTrigger: true },
            actions.updateTriggerSuccess({ trigger: { uuid: 't-1', name: 'new' } } as any),
        );
        expect(next.triggerDetails).toEqual({ uuid: 't-2', name: 'other' });
    });

    test('getTriggerHistory / getTriggerHistorySuccess / getTriggerHistoryFailure', () => {
        let next = reducer(initialState, actions.getTriggerHistory({ triggerUuid: 't-1', triggerObjectUuid: 'obj-1' }));
        expect(next.isFetchingTriggerHistories).toBe(true);

        next = reducer(next, actions.getTriggerHistorySuccess({ triggerHistories: [{ uuid: 'h-1' }] } as any));
        expect(next.triggerHistories).toHaveLength(1);
        expect(next.isFetchingTriggerHistories).toBe(false);

        next = reducer({ ...next, isFetchingTriggerHistories: true }, actions.getTriggerHistoryFailure({ error: 'err' }));
        expect(next.isFetchingTriggerHistories).toBe(false);
    });

    test('getTriggerHistorySummary / getTriggerHistorySummarySuccess / getTriggerHistorySummaryFailure', () => {
        let next = reducer(initialState, actions.getTriggerHistorySummary({ triggerObjectUuid: 'obj-1' }));
        expect(next.isFetchingTriggerHistorySummary).toBe(true);

        const summary = { triggerObjectUuid: 'obj-1' };
        next = reducer(next, actions.getTriggerHistorySummarySuccess({ triggerHistorySummary: summary } as any));
        expect(next.triggerHistorySummary).toEqual(summary);
        expect(next.isFetchingTriggerHistorySummary).toBe(false);

        next = reducer({ ...next, isFetchingTriggerHistorySummary: true }, actions.getTriggerHistorySummaryFailure({ error: 'err' }));
        expect(next.isFetchingTriggerHistorySummary).toBe(false);
    });

    test('getEventTriggersAssociations / getEventTriggersAssociationsSuccess / getEventTriggersAssociationsFailure', () => {
        let next = reducer(
            initialState,
            actions.getEventTriggersAssociations({ resource: 'CERTIFICATE' as any, associationObjectUuid: 'obj-1' }),
        );
        expect(next.isFetchingEventTriggersAssociation).toBe(true);

        const assoc = { someEvent: ['t-1'] };
        next = reducer(next, actions.getEventTriggersAssociationsSuccess({ eventTriggerAssociation: assoc } as any));
        expect(next.eventTriggerAssociation).toEqual(assoc);
        expect(next.isFetchingEventTriggersAssociation).toBe(false);

        next = reducer(
            { ...next, isFetchingEventTriggersAssociation: true },
            actions.getEventTriggersAssociationsFailure({ error: 'err' }),
        );
        expect(next.isFetchingEventTriggersAssociation).toBe(false);
    });

    test('associateEventTriggers / associateEventTriggersSuccess with triggerUuids / associateEventTriggersFailure', () => {
        const withAssoc = {
            ...initialState,
            eventTriggerAssociation: { CERTIFICATE_DISCOVERED: ['t-old'] },
            isFetchingEventTriggersAssociation: false,
        } as any;

        let next = reducer(withAssoc, actions.associateEventTriggers({ triggerEventAssociationRequestModel: {} } as any));
        expect(next.isFetchingEventTriggersAssociation).toBe(true);

        next = reducer(
            next,
            actions.associateEventTriggersSuccess({
                triggerEventAssociationRequestModel: { event: 'CERTIFICATE_DISCOVERED', triggerUuids: ['t-1', 't-2'] },
            } as any),
        );
        expect(next.eventTriggerAssociation).toEqual({ CERTIFICATE_DISCOVERED: ['t-1', 't-2'] });
        expect(next.isFetchingEventTriggersAssociation).toBe(false);

        next = reducer({ ...next, isFetchingEventTriggersAssociation: true }, actions.associateEventTriggersFailure({ error: 'err' }));
        expect(next.isFetchingEventTriggersAssociation).toBe(false);
    });

    test('associateEventTriggersSuccess removes event key when triggerUuids is empty', () => {
        const withAssoc = {
            ...initialState,
            eventTriggerAssociation: { CERTIFICATE_DISCOVERED: ['t-1'], OTHER_EVENT: ['t-2'] },
            isFetchingEventTriggersAssociation: true,
        } as any;

        const next = reducer(
            withAssoc,
            actions.associateEventTriggersSuccess({
                triggerEventAssociationRequestModel: { event: 'CERTIFICATE_DISCOVERED', triggerUuids: [] },
            } as any),
        );
        expect(next.eventTriggerAssociation).not.toHaveProperty('CERTIFICATE_DISCOVERED');
        expect(next.eventTriggerAssociation).toHaveProperty('OTHER_EVENT');
    });

    test('associateEventTriggersSuccess does nothing when eventTriggerAssociation is undefined', () => {
        const next = reducer(
            { ...initialState, isFetchingEventTriggersAssociation: true },
            actions.associateEventTriggersSuccess({
                triggerEventAssociationRequestModel: { event: 'CERTIFICATE_DISCOVERED', triggerUuids: ['t-1'] },
            } as any),
        );
        expect(next.eventTriggerAssociation).toBeUndefined();
        expect(next.isFetchingEventTriggersAssociation).toBe(false);
    });
});

describe('rules selectors', () => {
    const featureState = {
        ...initialState,
        rules: [{ uuid: 'r-1' }],
        executions: [{ uuid: 'e-1' }],
        conditions: [{ uuid: 'c-1' }],
        actionsList: [{ uuid: 'a-1' }],
        triggers: [{ uuid: 't-1' }],
        triggerHistories: [{ uuid: 'h-1' }],
        triggerHistorySummary: { triggerObjectUuid: 'obj-1' },
        eventTriggerAssociation: { CERT_DISCOVERED: ['t-1'] },
        ruleDetails: { uuid: 'r-1' },
        executionDetails: { uuid: 'e-1' },
        conditionDetails: { uuid: 'c-1' },
        actionDetails: { uuid: 'a-1' },
        triggerDetails: { uuid: 't-1' },
        isCreatingRule: true,
        createRuleSucceeded: true,
        isCreatingCondition: true,
        createConditionSucceeded: true,
        isCreatingAction: true,
        createActionSucceeded: true,
        isCreatingExecution: true,
        isCreatingTrigger: true,
        createTriggerSucceeded: true,
        isDeletingRule: true,
        isDeletingCondition: true,
        isDeletingAction: true,
        isDeletingExecution: true,
        isDeletingTrigger: true,
        isUpdatingRule: true,
        isUpdatingCondition: true,
        isUpdatingAction: true,
        isUpdatingExecution: true,
        isUpdatingTrigger: true,
        isFetchingRulesList: true,
        isFetchingRuleDetails: true,
        isFetchingConditions: true,
        isFetchingConditionDetails: true,
        isFetchingActions: true,
        isFetchingActionDetails: true,
        isFetchingExecutions: true,
        isFetchingExecutionDetails: true,
        isFetchingTriggers: true,
        isFetchingTriggerDetail: true,
        isFetchingTriggerHistories: true,
        isFetchingTriggerHistorySummary: true,
        isFetchingEventTriggersAssociation: true,
        isUpdatingEventTriggersAssociation: true,
        isBulkDeletingRules: true,
        isBulkDeletingActions: true,
        isBulkDeletingConditions: true,
        isBulkDeletingTriggers: true,
        isBulkDeletingExecutions: true,
    } as any;

    const state = { rules: featureState } as any;

    test('data selectors return values from state', () => {
        expect(selectors.rules(state)).toHaveLength(1);
        expect(selectors.executions(state)).toHaveLength(1);
        expect(selectors.conditions(state)).toHaveLength(1);
        expect(selectors.actionsList(state)).toHaveLength(1);
        expect(selectors.triggers(state)).toHaveLength(1);
        expect(selectors.triggerHistories(state)).toHaveLength(1);
        expect(selectors.triggerHistorySummary(state)).toEqual({ triggerObjectUuid: 'obj-1' });
        expect(selectors.eventTriggerAssociation(state)).toHaveProperty('CERT_DISCOVERED');
        expect(selectors.ruleDetails(state)).toEqual({ uuid: 'r-1' });
        expect(selectors.executionDetails(state)).toEqual({ uuid: 'e-1' });
        expect(selectors.conditionDetails(state)).toEqual({ uuid: 'c-1' });
        expect(selectors.actionDetails(state)).toEqual({ uuid: 'a-1' });
        expect(selectors.triggerDetails(state)).toEqual({ uuid: 't-1' });
    });

    test('boolean selectors return values from state', () => {
        expect(selectors.isCreatingRule(state)).toBe(true);
        expect(selectors.createRuleSucceeded(state)).toBe(true);
        expect(selectors.isCreatingCondition(state)).toBe(true);
        expect(selectors.createConditionSucceeded(state)).toBe(true);
        expect(selectors.isCreatingAction(state)).toBe(true);
        expect(selectors.createActionSucceeded(state)).toBe(true);
        expect(selectors.isCreatingExecution(state)).toBe(true);
        expect(selectors.isCreatingTrigger(state)).toBe(true);
        expect(selectors.createTriggerSucceeded(state)).toBe(true);
        expect(selectors.isDeletingRule(state)).toBe(true);
        expect(selectors.isDeletingCondition(state)).toBe(true);
        expect(selectors.isDeletingAction(state)).toBe(true);
        expect(selectors.isDeletingExecution(state)).toBe(true);
        expect(selectors.isDeletingTrigger(state)).toBe(true);
        expect(selectors.isUpdatingRule(state)).toBe(true);
        expect(selectors.isUpdatingCondition(state)).toBe(true);
        expect(selectors.isUpdatingAction(state)).toBe(true);
        expect(selectors.isUpdatingExecution(state)).toBe(true);
        expect(selectors.isUpdatingTrigger(state)).toBe(true);
        expect(selectors.isFetchingRulesList(state)).toBe(true);
        expect(selectors.isFetchingRuleDetails(state)).toBe(true);
        expect(selectors.isFetchingConditions(state)).toBe(true);
        expect(selectors.isFetchingConditionDetails(state)).toBe(true);
        expect(selectors.isFetchingActions(state)).toBe(true);
        expect(selectors.isFetchingActionDetails(state)).toBe(true);
        expect(selectors.isFetchingExecutions(state)).toBe(true);
        expect(selectors.isFetchingExecutionDetails(state)).toBe(true);
        expect(selectors.isFetchingTriggers(state)).toBe(true);
        expect(selectors.isFetchingTriggerDetail(state)).toBe(true);
        expect(selectors.isFetchingTriggerHistories(state)).toBe(true);
        expect(selectors.isFetchingTriggerHistorySummary(state)).toBe(true);
        expect(selectors.isFetchingEventTriggersAssociation(state)).toBe(true);
        expect(selectors.isUpdatingEventTriggersAssociation(state)).toBe(true);
        expect(selectors.isBulkDeletingRules(state)).toBe(true);
        expect(selectors.isBulkDeletingActions(state)).toBe(true);
        expect(selectors.isBulkDeletingConditions(state)).toBe(true);
        expect(selectors.isBulkDeletingTriggers(state)).toBe(true);
        expect(selectors.isBulkDeletingExecutions(state)).toBe(true);
    });
});
