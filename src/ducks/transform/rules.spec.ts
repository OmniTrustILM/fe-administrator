import { describe, expect, test } from 'vitest';
import {
    transformTriggerHistoryRecordDtoToModel,
    transformTriggerHistoryDtoToModel,
    transformExecutionItemRequestModelToDto,
    transformUpdateExecutionRequestModelToDto,
    transformExecutionRequestModelToDto,
    transformExecutionItemDtoToModel,
    transformExecutionDtoToModel,
    transformTriggerDtoToModel,
    transformRuleDtoToModel,
    transformConditionItemDtoToModel,
    transformConditionDtoToModel,
    transformRuleDetailDtoToModel,
    transformConditionItemModelDto,
    transformConditionItemRequestModelDto,
    transformConditionRequestModelToDto,
    transformRuleRequestModelToDto,
    transformTriggerRequestModelToDto,
    transformActionDtoToModel,
    transformTriggerDetailDtoToModel,
    transformConditionItemRequestModelToDto,
    transformUpdateConditionRequestModelToDto,
    transformUpdateTriggerRequestModelToDto,
    transformUpdateRuleRequestModelToDto,
    transformActionRequestModelToDto,
    transformActionDetailDtoToModel,
    transformUpdateActionRequestModelToDto,
    transformTriggerHistoryObjectTriggerSummaryDtoToModel,
    transformTriggerHistoryObjectSummaryDtoToModel,
    transformTriggerHistorySummaryDtoToModel,
    transformTriggerEventAssociationRequestModelToDto,
} from './rules';

describe('transformTriggerHistoryRecordDtoToModel', () => {
    test('returns shallow clone of input', () => {
        const input = { uuid: 'r1', message: 'ok', condition: true } as any;
        const result = transformTriggerHistoryRecordDtoToModel(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformTriggerHistoryDtoToModel', () => {
    test('returns empty records array when records absent', () => {
        const input = { uuid: 'th1', records: undefined } as any;
        const result = transformTriggerHistoryDtoToModel(input);
        expect(result.records).toEqual([]);
    });

    test('returns empty records array when records is empty', () => {
        const input = { uuid: 'th1', records: [] } as any;
        const result = transformTriggerHistoryDtoToModel(input);
        expect(result.records).toEqual([]);
    });

    test('maps records when present', () => {
        const record = { uuid: 'r1', message: 'ok', condition: true } as any;
        const input = { uuid: 'th1', records: [record] } as any;
        const result = transformTriggerHistoryDtoToModel(input);
        expect(result.records).toHaveLength(1);
        expect(result.records[0]).toEqual(record);
    });
});

describe('transformExecutionItemRequestModelToDto', () => {
    test('returns shallow clone of input', () => {
        const input = { fieldSource: 'PROPERTY', fieldIdentifier: 'commonName', data: 'value' } as any;
        const result = transformExecutionItemRequestModelToDto(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformUpdateExecutionRequestModelToDto', () => {
    test('maps items', () => {
        const item = { fieldSource: 'PROPERTY', fieldIdentifier: 'commonName', data: 'value' } as any;
        const input = { description: 'desc', items: [item] } as any;
        const result = transformUpdateExecutionRequestModelToDto(input);
        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toEqual(item);
    });
});

describe('transformExecutionRequestModelToDto', () => {
    test('maps items', () => {
        const item = { fieldSource: 'PROPERTY', fieldIdentifier: 'commonName', data: 'value' } as any;
        const input = { name: 'exec', type: 'SET_FIELD', resource: 'CERTIFICATE', items: [item] } as any;
        const result = transformExecutionRequestModelToDto(input);
        expect(result.items).toHaveLength(1);
    });
});

describe('transformExecutionItemDtoToModel', () => {
    test('returns shallow clone of input', () => {
        const input = { fieldSource: 'PROPERTY', fieldIdentifier: 'commonName', data: 'value' } as any;
        const result = transformExecutionItemDtoToModel(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformExecutionDtoToModel', () => {
    test('maps items', () => {
        const item = { fieldSource: 'PROPERTY', fieldIdentifier: 'commonName', data: 'value' } as any;
        const input = { uuid: 'e1', name: 'exec', type: 'SET_FIELD', resource: 'CERTIFICATE', items: [item] } as any;
        const result = transformExecutionDtoToModel(input);
        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toEqual(item);
    });
});

describe('transformTriggerDtoToModel', () => {
    test('returns shallow clone of input', () => {
        const input = { uuid: 't1', name: 'trigger', resource: 'CERTIFICATE', type: 'EVENT' } as any;
        const result = transformTriggerDtoToModel(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformRuleDtoToModel', () => {
    test('returns shallow clone of input', () => {
        const input = { uuid: 'r1', name: 'rule', resource: 'CERTIFICATE' } as any;
        const result = transformRuleDtoToModel(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformConditionItemDtoToModel', () => {
    test('returns shallow clone of input', () => {
        const input = { fieldSource: 'PROPERTY', fieldIdentifier: 'commonName', operator: 'EQUALS', value: 'test' } as any;
        const result = transformConditionItemDtoToModel(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformConditionDtoToModel', () => {
    test('maps items', () => {
        const item = { fieldSource: 'PROPERTY', fieldIdentifier: 'commonName', operator: 'EQUALS', value: 'test' } as any;
        const input = { uuid: 'c1', name: 'condition', resource: 'CERTIFICATE', items: [item] } as any;
        const result = transformConditionDtoToModel(input);
        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toEqual(item);
    });
});

describe('transformRuleDetailDtoToModel', () => {
    test('returns model with undefined conditions when conditions absent', () => {
        const input = { uuid: 'rd1', name: 'rule', resource: 'CERTIFICATE', conditions: undefined } as any;
        const result = transformRuleDetailDtoToModel(input);
        expect(result.conditions).toBeUndefined();
    });

    test('maps conditions when present', () => {
        const condition = { uuid: 'c1', name: 'cond', resource: 'CERTIFICATE', items: [] } as any;
        const input = { uuid: 'rd1', name: 'rule', resource: 'CERTIFICATE', conditions: [condition] } as any;
        const result = transformRuleDetailDtoToModel(input);
        expect(result.conditions).toHaveLength(1);
    });
});

describe('transformConditionItemModelDto', () => {
    test('returns shallow clone of input', () => {
        const input = { fieldSource: 'PROPERTY', fieldIdentifier: 'commonName', operator: 'EQUALS', value: 'test' } as any;
        const result = transformConditionItemModelDto(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformConditionItemRequestModelDto', () => {
    test('returns shallow clone of input', () => {
        const input = { fieldSource: 'PROPERTY', fieldIdentifier: 'commonName', operator: 'EQUALS', value: 'test' } as any;
        const result = transformConditionItemRequestModelDto(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformConditionRequestModelToDto', () => {
    test('maps items', () => {
        const item = { fieldSource: 'PROPERTY', fieldIdentifier: 'commonName', operator: 'EQUALS', value: 'test' } as any;
        const input = { name: 'cond', resource: 'CERTIFICATE', items: [item] } as any;
        const result = transformConditionRequestModelToDto(input);
        expect(result.items).toHaveLength(1);
    });
});

describe('transformRuleRequestModelToDto', () => {
    test('returns shallow clone of input', () => {
        const input = { name: 'rule', resource: 'CERTIFICATE', conditionsUuids: ['c1'] } as any;
        const result = transformRuleRequestModelToDto(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformTriggerRequestModelToDto', () => {
    test('returns shallow clone of input', () => {
        const input = {
            name: 'trigger',
            resource: 'CERTIFICATE',
            type: 'EVENT',
            rulesUuids: [],
            actionsUuids: [],
            ignoreTrigger: false,
        } as any;
        const result = transformTriggerRequestModelToDto(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformActionDtoToModel', () => {
    test('returns shallow clone of input', () => {
        const input = { uuid: 'a1', name: 'action', resource: 'CERTIFICATE' } as any;
        const result = transformActionDtoToModel(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformTriggerDetailDtoToModel', () => {
    test('maps rules and actions', () => {
        const rule = {
            uuid: 'r1',
            name: 'rule',
            resource: 'CERTIFICATE',
            conditions: [],
        } as any;
        const action = {
            uuid: 'a1',
            name: 'action',
            resource: 'CERTIFICATE',
            executions: [],
        } as any;
        const input = {
            uuid: 't1',
            name: 'trigger',
            resource: 'CERTIFICATE',
            type: 'EVENT',
            ignoreTrigger: false,
            rules: [rule],
            actions: [action],
        } as any;
        const result = transformTriggerDetailDtoToModel(input);
        expect(result.rules).toHaveLength(1);
        expect(result.actions).toHaveLength(1);
    });
});

describe('transformConditionItemRequestModelToDto', () => {
    test('returns shallow clone of input', () => {
        const input = { fieldSource: 'PROPERTY', fieldIdentifier: 'commonName', operator: 'EQUALS', value: 'test' } as any;
        const result = transformConditionItemRequestModelToDto(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformUpdateConditionRequestModelToDto', () => {
    test('maps items', () => {
        const item = { fieldSource: 'PROPERTY', fieldIdentifier: 'commonName', operator: 'EQUALS', value: 'test' } as any;
        const input = { description: 'desc', items: [item] } as any;
        const result = transformUpdateConditionRequestModelToDto(input);
        expect(result.items).toHaveLength(1);
    });
});

describe('transformUpdateTriggerRequestModelToDto', () => {
    test('returns shallow clone of input', () => {
        const input = { rulesUuids: ['r1'], actionsUuids: ['a1'], ignoreTrigger: false, resource: 'CERTIFICATE', type: 'EVENT' } as any;
        const result = transformUpdateTriggerRequestModelToDto(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformUpdateRuleRequestModelToDto', () => {
    test('returns shallow clone of input', () => {
        const input = { description: 'desc', conditionsUuids: ['c1'] } as any;
        const result = transformUpdateRuleRequestModelToDto(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformActionRequestModelToDto', () => {
    test('returns shallow clone of input', () => {
        const input = { name: 'action', resource: 'CERTIFICATE', executionsUuids: ['e1'] } as any;
        const result = transformActionRequestModelToDto(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformActionDetailDtoToModel', () => {
    test('returns shallow clone of input', () => {
        const input = { uuid: 'ad1', name: 'action', resource: 'CERTIFICATE', executions: [] } as any;
        const result = transformActionDetailDtoToModel(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformUpdateActionRequestModelToDto', () => {
    test('returns shallow clone of input', () => {
        const input = { description: 'desc', executionsUuids: ['e1'] } as any;
        const result = transformUpdateActionRequestModelToDto(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});

describe('transformTriggerHistoryObjectTriggerSummaryDtoToModel', () => {
    test('maps records', () => {
        const record = { uuid: 'r1', message: 'ok', condition: true } as any;
        const input = { triggerUuid: 't1', triggerName: 'trigger', records: [record] } as any;
        const result = transformTriggerHistoryObjectTriggerSummaryDtoToModel(input);
        expect(result.records).toHaveLength(1);
        expect(result.records[0]).toEqual(record);
    });
});

describe('transformTriggerHistoryObjectSummaryDtoToModel', () => {
    test('maps triggers', () => {
        const record = { uuid: 'r1', message: 'ok', condition: true } as any;
        const trigger = { triggerUuid: 't1', triggerName: 'trigger', records: [record] } as any;
        const input = { objectUuid: 'o1', triggers: [trigger] } as any;
        const result = transformTriggerHistoryObjectSummaryDtoToModel(input);
        expect(result.triggers).toHaveLength(1);
    });
});

describe('transformTriggerHistorySummaryDtoToModel', () => {
    test('maps objects', () => {
        const trigger = { triggerUuid: 't1', triggerName: 'trigger', records: [] } as any;
        const obj = { objectUuid: 'o1', triggers: [trigger] } as any;
        const input = { objects: [obj] } as any;
        const result = transformTriggerHistorySummaryDtoToModel(input);
        expect(result.objects).toHaveLength(1);
        expect(result.objects[0].triggers).toHaveLength(1);
    });
});

describe('transformTriggerEventAssociationRequestModelToDto', () => {
    test('returns shallow clone of input', () => {
        const input = { triggerUuids: ['t1'] } as any;
        const result = transformTriggerEventAssociationRequestModelToDto(input);
        expect(result).toEqual(input);
        expect(result).not.toBe(input);
    });
});
