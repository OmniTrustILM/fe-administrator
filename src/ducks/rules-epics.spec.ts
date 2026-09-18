import { describe, expect, test, vi } from 'vitest';
import type { UnknownAction } from '@reduxjs/toolkit';
import { firstValueFrom, of, throwError } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';
import { take, toArray } from 'rxjs/operators';

import { actions as rulesActions } from './rules';
import { actions as appRedirectActions } from './app-redirect';
import {
    bulkDeleteRules,
    bulkDeleteActions,
    bulkDeleteConditions,
    bulkDeleteTriggers,
    bulkDeleteExecutions,
    deleteRule,
    deleteAction,
    deleteCondition,
    deleteExecution,
} from './rules-epics';
import type { AppEpic } from 'ducks';

type EpicDeps = {
    apiClients: {
        rules: {
            deleteRule: (args: any) => any;
            deleteCondition: (args: any) => any;
        };
        actions: {
            deleteAction: (args: any) => any;
            deleteExecution: (args: any) => any;
        };
        triggers: {
            deleteTrigger: (args: any) => any;
        };
    };
};

vi.mock('../App', () => ({
    store: {
        dispatch: vi.fn(),
        getState: vi.fn(() => ({})),
    },
}));

const defaultDeps: EpicDeps = {
    apiClients: {
        rules: {
            deleteRule: () => of(undefined),
            deleteCondition: () => of(undefined),
        },
        actions: {
            deleteAction: () => of(undefined),
            deleteExecution: () => of(undefined),
        },
        triggers: {
            deleteTrigger: () => of(undefined),
        },
    },
};

function mergeDeps(overrides: Partial<EpicDeps['apiClients']>): EpicDeps {
    return {
        apiClients: {
            rules: overrides.rules ? { ...defaultDeps.apiClients.rules, ...overrides.rules } : defaultDeps.apiClients.rules,
            actions: overrides.actions ? { ...defaultDeps.apiClients.actions, ...overrides.actions } : defaultDeps.apiClients.actions,
            triggers: overrides.triggers ? { ...defaultDeps.apiClients.triggers, ...overrides.triggers } : defaultDeps.apiClients.triggers,
        },
    };
}

const rulesState = {
    rules: [
        { uuid: 'r-1', name: 'Rule 1' },
        { uuid: 'r-2', name: 'Rule 2' },
    ],
    actionsList: [
        { uuid: 'a-1', name: 'Action 1' },
        { uuid: 'a-2', name: 'Action 2' },
    ],
    conditions: [
        { uuid: 'c-1', name: 'Condition 1' },
        { uuid: 'c-2', name: 'Condition 2' },
    ],
    triggers: [
        { uuid: 't-1', name: 'Trigger 1' },
        { uuid: 't-2', name: 'Trigger 2' },
    ],
    executions: [
        { uuid: 'e-1', name: 'Execution 1' },
        { uuid: 'e-2', name: 'Execution 2' },
    ],
};

function createAjaxError(status: number, response: unknown): AjaxError {
    const err = Object.assign(new Error('ajax error'), { name: 'AjaxError', status, response });
    Object.setPrototypeOf(err, AjaxError.prototype);
    return err as unknown as AjaxError;
}

async function runEpic(
    epic: AppEpic,
    action: any,
    depsOverrides: Partial<EpicDeps['apiClients']> = {},
    takeCount = 1,
): Promise<UnknownAction[]> {
    const deps = mergeDeps(depsOverrides);
    const output$ = epic(of(action), { value: { rules: rulesState } } as any, deps as any);
    return firstValueFrom(output$.pipe(take(takeCount), toArray()));
}

describe('bulkDeleteRules epic', () => {
    test('success emits bulkDeleteRulesSuccess with all uuids', async () => {
        const calls: string[] = [];
        const emitted = await runEpic(
            bulkDeleteRules,
            rulesActions.bulkDeleteRules({ ruleUuids: ['r-1', 'r-2'] }),
            {
                rules: {
                    deleteRule: ({ ruleUuid }: { ruleUuid: string }) => {
                        calls.push(ruleUuid);
                        return of(undefined);
                    },
                } as any,
            },
            1,
        );

        expect(calls).toEqual(['r-1', 'r-2']);
        expect(emitted).toEqual([rulesActions.bulkDeleteRulesSuccess({ ruleUuids: ['r-1', 'r-2'] })]);
    });

    test('partial failure emits success, failure and fetchError', async () => {
        const emitted = await runEpic(
            bulkDeleteRules,
            rulesActions.bulkDeleteRules({ ruleUuids: ['r-1', 'r-2'] }),
            {
                rules: {
                    deleteRule: ({ ruleUuid }: { ruleUuid: string }) =>
                        ruleUuid === 'r-2' ? throwError(() => new Error('delete failed')) : of(undefined),
                } as any,
            },
            3,
        );

        expect(emitted.slice(0, 2)).toEqual([
            rulesActions.bulkDeleteRulesSuccess({ ruleUuids: ['r-1'] }),
            rulesActions.bulkDeleteRulesFailure({ error: 'Failed to delete 1 rule\nRule 2: delete failed' }),
        ]);
        expect(emitted[2].type).toBe(appRedirectActions.fetchError.type);
        expect((emitted[2] as any).payload).toEqual({ error: undefined, message: 'Failed to delete 1 rule\nRule 2: delete failed' });
    });

    test('multiple failures uses plural message', async () => {
        const emitted = await runEpic(
            bulkDeleteRules,
            rulesActions.bulkDeleteRules({ ruleUuids: ['r-1', 'r-2'] }),
            { rules: { deleteRule: () => throwError(() => new Error('delete failed')) } as any },
            3,
        );

        expect(emitted.slice(0, 2)).toEqual([
            rulesActions.bulkDeleteRulesSuccess({ ruleUuids: [] }),
            rulesActions.bulkDeleteRulesFailure({ error: 'Failed to delete 2 rules\nRule 1: delete failed\nRule 2: delete failed' }),
        ]);
        expect((emitted[2] as any).payload).toEqual({
            error: undefined,
            message: 'Failed to delete 2 rules\nRule 1: delete failed\nRule 2: delete failed',
        });
    });

    test('sync throw emits bulkDeleteRulesFailure and fetchError', async () => {
        const err = new Error('sync fail');
        const emitted = await runEpic(
            bulkDeleteRules,
            rulesActions.bulkDeleteRules({ ruleUuids: ['r-1'] }),
            {
                rules: {
                    deleteRule: () => {
                        throw err;
                    },
                } as any,
            },
            2,
        );

        expect(emitted).toEqual([
            rulesActions.bulkDeleteRulesFailure({ error: 'Failed to delete Rules. sync fail' }),
            appRedirectActions.fetchError({ error: err, message: 'Failed to delete Rules' }),
        ]);
    });
});

describe('bulkDeleteActions epic', () => {
    test('success emits bulkDeleteActionsSuccess with all uuids', async () => {
        const calls: string[] = [];
        const emitted = await runEpic(
            bulkDeleteActions,
            rulesActions.bulkDeleteActions({ actionUuids: ['a-1', 'a-2'] }),
            {
                actions: {
                    deleteAction: ({ actionUuid }: { actionUuid: string }) => {
                        calls.push(actionUuid);
                        return of(undefined);
                    },
                } as any,
            },
            1,
        );

        expect(calls).toEqual(['a-1', 'a-2']);
        expect(emitted).toEqual([rulesActions.bulkDeleteActionsSuccess({ actionUuids: ['a-1', 'a-2'] })]);
    });

    test('partial failure emits success, failure and fetchError', async () => {
        const emitted = await runEpic(
            bulkDeleteActions,
            rulesActions.bulkDeleteActions({ actionUuids: ['a-1', 'a-2'] }),
            {
                actions: {
                    deleteAction: ({ actionUuid }: { actionUuid: string }) =>
                        actionUuid === 'a-2' ? throwError(() => new Error('delete failed')) : of(undefined),
                } as any,
            },
            3,
        );

        expect(emitted.slice(0, 2)).toEqual([
            rulesActions.bulkDeleteActionsSuccess({ actionUuids: ['a-1'] }),
            rulesActions.bulkDeleteActionsFailure({ error: 'Failed to delete 1 action\nAction 2: delete failed' }),
        ]);
        expect(emitted[2].type).toBe(appRedirectActions.fetchError.type);
        expect((emitted[2] as any).payload).toEqual({ error: undefined, message: 'Failed to delete 1 action\nAction 2: delete failed' });
    });

    test('multiple failures uses plural message', async () => {
        const emitted = await runEpic(
            bulkDeleteActions,
            rulesActions.bulkDeleteActions({ actionUuids: ['a-1', 'a-2'] }),
            { actions: { deleteAction: () => throwError(() => new Error('delete failed')) } as any },
            3,
        );

        expect(emitted.slice(0, 2)).toEqual([
            rulesActions.bulkDeleteActionsSuccess({ actionUuids: [] }),
            rulesActions.bulkDeleteActionsFailure({
                error: 'Failed to delete 2 actions\nAction 1: delete failed\nAction 2: delete failed',
            }),
        ]);
        expect((emitted[2] as any).payload).toEqual({
            error: undefined,
            message: 'Failed to delete 2 actions\nAction 1: delete failed\nAction 2: delete failed',
        });
    });

    test('sync throw emits bulkDeleteActionsFailure and fetchError', async () => {
        const err = new Error('sync fail');
        const emitted = await runEpic(
            bulkDeleteActions,
            rulesActions.bulkDeleteActions({ actionUuids: ['a-1'] }),
            {
                actions: {
                    deleteAction: () => {
                        throw err;
                    },
                } as any,
            },
            2,
        );

        expect(emitted).toEqual([
            rulesActions.bulkDeleteActionsFailure({ error: 'Failed to delete Actions. sync fail' }),
            appRedirectActions.fetchError({ error: err, message: 'Failed to delete Actions' }),
        ]);
    });
});

describe('bulkDeleteConditions epic', () => {
    test('success emits bulkDeleteConditionsSuccess with all uuids', async () => {
        const calls: string[] = [];
        const emitted = await runEpic(
            bulkDeleteConditions,
            rulesActions.bulkDeleteConditions({ conditionUuids: ['c-1', 'c-2'] }),
            {
                rules: {
                    deleteCondition: ({ conditionUuid }: { conditionUuid: string }) => {
                        calls.push(conditionUuid);
                        return of(undefined);
                    },
                } as any,
            },
            1,
        );

        expect(calls).toEqual(['c-1', 'c-2']);
        expect(emitted).toEqual([rulesActions.bulkDeleteConditionsSuccess({ conditionUuids: ['c-1', 'c-2'] })]);
    });

    test('partial failure emits success, failure and fetchError', async () => {
        const emitted = await runEpic(
            bulkDeleteConditions,
            rulesActions.bulkDeleteConditions({ conditionUuids: ['c-1', 'c-2'] }),
            {
                rules: {
                    deleteCondition: ({ conditionUuid }: { conditionUuid: string }) =>
                        conditionUuid === 'c-2' ? throwError(() => new Error('delete failed')) : of(undefined),
                } as any,
            },
            3,
        );

        expect(emitted.slice(0, 2)).toEqual([
            rulesActions.bulkDeleteConditionsSuccess({ conditionUuids: ['c-1'] }),
            rulesActions.bulkDeleteConditionsFailure({ error: 'Failed to delete 1 condition\nCondition 2: delete failed' }),
        ]);
        expect(emitted[2].type).toBe(appRedirectActions.fetchError.type);
        expect((emitted[2] as any).payload).toEqual({
            error: undefined,
            message: 'Failed to delete 1 condition\nCondition 2: delete failed',
        });
    });

    test('multiple failures uses plural message', async () => {
        const emitted = await runEpic(
            bulkDeleteConditions,
            rulesActions.bulkDeleteConditions({ conditionUuids: ['c-1', 'c-2'] }),
            { rules: { deleteCondition: () => throwError(() => new Error('delete failed')) } as any },
            3,
        );

        expect(emitted.slice(0, 2)).toEqual([
            rulesActions.bulkDeleteConditionsSuccess({ conditionUuids: [] }),
            rulesActions.bulkDeleteConditionsFailure({
                error: 'Failed to delete 2 conditions\nCondition 1: delete failed\nCondition 2: delete failed',
            }),
        ]);
        expect((emitted[2] as any).payload).toEqual({
            error: undefined,
            message: 'Failed to delete 2 conditions\nCondition 1: delete failed\nCondition 2: delete failed',
        });
    });

    test('sync throw emits bulkDeleteConditionsFailure and fetchError', async () => {
        const err = new Error('sync fail');
        const emitted = await runEpic(
            bulkDeleteConditions,
            rulesActions.bulkDeleteConditions({ conditionUuids: ['c-1'] }),
            {
                rules: {
                    deleteCondition: () => {
                        throw err;
                    },
                } as any,
            },
            2,
        );

        expect(emitted).toEqual([
            rulesActions.bulkDeleteConditionsFailure({ error: 'Failed to delete Conditions. sync fail' }),
            appRedirectActions.fetchError({ error: err, message: 'Failed to delete Conditions' }),
        ]);
    });
});

describe('bulkDeleteTriggers epic', () => {
    test('success emits bulkDeleteTriggersSuccess with all uuids', async () => {
        const calls: string[] = [];
        const emitted = await runEpic(
            bulkDeleteTriggers,
            rulesActions.bulkDeleteTriggers({ triggerUuids: ['t-1', 't-2'] }),
            {
                triggers: {
                    deleteTrigger: ({ triggerUuid }: { triggerUuid: string }) => {
                        calls.push(triggerUuid);
                        return of(undefined);
                    },
                } as any,
            },
            1,
        );

        expect(calls).toEqual(['t-1', 't-2']);
        expect(emitted).toEqual([rulesActions.bulkDeleteTriggersSuccess({ triggerUuids: ['t-1', 't-2'] })]);
    });

    test('partial failure emits success, failure and fetchError', async () => {
        const emitted = await runEpic(
            bulkDeleteTriggers,
            rulesActions.bulkDeleteTriggers({ triggerUuids: ['t-1', 't-2'] }),
            {
                triggers: {
                    deleteTrigger: ({ triggerUuid }: { triggerUuid: string }) =>
                        triggerUuid === 't-2' ? throwError(() => new Error('delete failed')) : of(undefined),
                } as any,
            },
            3,
        );

        expect(emitted.slice(0, 2)).toEqual([
            rulesActions.bulkDeleteTriggersSuccess({ triggerUuids: ['t-1'] }),
            rulesActions.bulkDeleteTriggersFailure({ error: 'Failed to delete 1 trigger\nTrigger 2: delete failed' }),
        ]);
        expect(emitted[2].type).toBe(appRedirectActions.fetchError.type);
        expect((emitted[2] as any).payload).toEqual({ error: undefined, message: 'Failed to delete 1 trigger\nTrigger 2: delete failed' });
    });

    test('multiple failures uses plural message', async () => {
        const emitted = await runEpic(
            bulkDeleteTriggers,
            rulesActions.bulkDeleteTriggers({ triggerUuids: ['t-1', 't-2'] }),
            { triggers: { deleteTrigger: () => throwError(() => new Error('delete failed')) } as any },
            3,
        );

        expect(emitted.slice(0, 2)).toEqual([
            rulesActions.bulkDeleteTriggersSuccess({ triggerUuids: [] }),
            rulesActions.bulkDeleteTriggersFailure({
                error: 'Failed to delete 2 triggers\nTrigger 1: delete failed\nTrigger 2: delete failed',
            }),
        ]);
        expect((emitted[2] as any).payload).toEqual({
            error: undefined,
            message: 'Failed to delete 2 triggers\nTrigger 1: delete failed\nTrigger 2: delete failed',
        });
    });

    test('sync throw emits bulkDeleteTriggersFailure and fetchError', async () => {
        const err = new Error('sync fail');
        const emitted = await runEpic(
            bulkDeleteTriggers,
            rulesActions.bulkDeleteTriggers({ triggerUuids: ['t-1'] }),
            {
                triggers: {
                    deleteTrigger: () => {
                        throw err;
                    },
                } as any,
            },
            2,
        );

        expect(emitted).toEqual([
            rulesActions.bulkDeleteTriggersFailure({ error: 'Failed to delete Triggers. sync fail' }),
            appRedirectActions.fetchError({ error: err, message: 'Failed to delete Triggers' }),
        ]);
    });
});

describe('bulkDeleteTriggers failure reasons', () => {
    test('shows the reason returned by the API for the failed trigger', async () => {
        const reason = 'Cannot delete trigger. It has 1 event association(s): Certificate validation status changed (Settings)';
        const emitted = await runEpic(
            bulkDeleteTriggers,
            rulesActions.bulkDeleteTriggers({ triggerUuids: ['t-1'] }),
            { triggers: { deleteTrigger: () => throwError(() => createAjaxError(422, [reason])) } as any },
            3,
        );

        expect((emitted[2] as any).payload).toEqual({ error: undefined, message: `Failed to delete 1 trigger\nTrigger 1: ${reason}` });
    });

    test('lists the uuid when the failed trigger is not in the loaded list', async () => {
        const emitted = await runEpic(
            bulkDeleteTriggers,
            rulesActions.bulkDeleteTriggers({ triggerUuids: ['t-unknown'] }),
            { triggers: { deleteTrigger: () => throwError(() => createAjaxError(422, { message: 'Trigger is in use' })) } as any },
            3,
        );

        expect((emitted[2] as any).payload).toEqual({
            error: undefined,
            message: 'Failed to delete 1 trigger\nt-unknown: Trigger is in use',
        });
    });

    test('lists the name alone when the failure carries no reason', async () => {
        const emitted = await runEpic(
            bulkDeleteTriggers,
            rulesActions.bulkDeleteTriggers({ triggerUuids: ['t-2'] }),
            { triggers: { deleteTrigger: () => throwError(() => ({})) } as any },
            3,
        );

        expect((emitted[2] as any).payload).toEqual({ error: undefined, message: 'Failed to delete 1 trigger\nTrigger 2' });
    });
});

describe('bulkDeleteExecutions epic', () => {
    test('success emits bulkDeleteExecutionsSuccess with all uuids', async () => {
        const calls: string[] = [];
        const emitted = await runEpic(
            bulkDeleteExecutions,
            rulesActions.bulkDeleteExecutions({ executionUuids: ['e-1', 'e-2'] }),
            {
                actions: {
                    deleteExecution: ({ executionUuid }: { executionUuid: string }) => {
                        calls.push(executionUuid);
                        return of(undefined);
                    },
                } as any,
            },
            1,
        );

        expect(calls).toEqual(['e-1', 'e-2']);
        expect(emitted).toEqual([rulesActions.bulkDeleteExecutionsSuccess({ executionUuids: ['e-1', 'e-2'] })]);
    });

    test('partial failure emits success, failure and fetchError', async () => {
        const emitted = await runEpic(
            bulkDeleteExecutions,
            rulesActions.bulkDeleteExecutions({ executionUuids: ['e-1', 'e-2'] }),
            {
                actions: {
                    deleteExecution: ({ executionUuid }: { executionUuid: string }) =>
                        executionUuid === 'e-2' ? throwError(() => new Error('delete failed')) : of(undefined),
                } as any,
            },
            3,
        );

        expect(emitted.slice(0, 2)).toEqual([
            rulesActions.bulkDeleteExecutionsSuccess({ executionUuids: ['e-1'] }),
            rulesActions.bulkDeleteExecutionsFailure({ error: 'Failed to delete 1 execution\nExecution 2: delete failed' }),
        ]);
        expect(emitted[2].type).toBe(appRedirectActions.fetchError.type);
        expect((emitted[2] as any).payload).toEqual({
            error: undefined,
            message: 'Failed to delete 1 execution\nExecution 2: delete failed',
        });
    });

    test('multiple failures uses plural message', async () => {
        const emitted = await runEpic(
            bulkDeleteExecutions,
            rulesActions.bulkDeleteExecutions({ executionUuids: ['e-1', 'e-2'] }),
            { actions: { deleteExecution: () => throwError(() => new Error('delete failed')) } as any },
            3,
        );

        expect(emitted.slice(0, 2)).toEqual([
            rulesActions.bulkDeleteExecutionsSuccess({ executionUuids: [] }),
            rulesActions.bulkDeleteExecutionsFailure({
                error: 'Failed to delete 2 executions\nExecution 1: delete failed\nExecution 2: delete failed',
            }),
        ]);
        expect((emitted[2] as any).payload).toEqual({
            error: undefined,
            message: 'Failed to delete 2 executions\nExecution 1: delete failed\nExecution 2: delete failed',
        });
    });

    test('sync throw emits bulkDeleteExecutionsFailure and fetchError', async () => {
        const err = new Error('sync fail');
        const emitted = await runEpic(
            bulkDeleteExecutions,
            rulesActions.bulkDeleteExecutions({ executionUuids: ['e-1'] }),
            {
                actions: {
                    deleteExecution: () => {
                        throw err;
                    },
                } as any,
            },
            2,
        );

        expect(emitted).toEqual([
            rulesActions.bulkDeleteExecutionsFailure({ error: 'Failed to delete Executions. sync fail' }),
            appRedirectActions.fetchError({ error: err, message: 'Failed to delete Executions' }),
        ]);
    });
});

describe('single-delete redirects', () => {
    test('deleteRule success redirects to the Rules list', async () => {
        const emitted = await runEpic(deleteRule, rulesActions.deleteRule({ ruleUuid: 'r-1' }), {}, 2);
        expect(emitted).toEqual([rulesActions.deleteRuleSuccess({ ruleUuid: 'r-1' }), appRedirectActions.redirect({ url: '/rules' })]);
    });

    test('deleteCondition success redirects to the Conditions tab', async () => {
        const emitted = await runEpic(deleteCondition, rulesActions.deleteCondition({ conditionUuid: 'c-1' }), {}, 2);
        expect(emitted).toEqual([
            rulesActions.deleteConditionSuccess({ conditionUuid: 'c-1' }),
            appRedirectActions.redirect({ url: '/rules?tab=conditions' }),
        ]);
    });

    test('deleteAction success redirects to the Actions list', async () => {
        const emitted = await runEpic(deleteAction, rulesActions.deleteAction({ actionUuid: 'a-1' }), {}, 2);
        expect(emitted).toEqual([
            rulesActions.deleteActionSuccess({ actionUuid: 'a-1' }),
            appRedirectActions.redirect({ url: '/actions' }),
        ]);
    });

    test('deleteExecution success redirects to the Executions tab', async () => {
        const emitted = await runEpic(deleteExecution, rulesActions.deleteExecution({ executionUuid: 'e-1' }), {}, 2);
        expect(emitted).toEqual([
            rulesActions.deleteExecutionSuccess({ executionUuid: 'e-1' }),
            appRedirectActions.redirect({ url: '/actions?tab=executions' }),
        ]);
    });
});
