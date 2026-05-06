import { describe, expect, test } from 'vitest';
import { conditionGroupToFilter, filterToConditionItems } from './rules';
import { FilterConditionOperator, FilterFieldSource } from 'types/openapi';

describe('filterToConditionItems', () => {
    test('returns empty array for empty input', () => {
        expect(filterToConditionItems([])).toEqual([]);
    });

    test('maps a single filter to a condition item', () => {
        const filter = [
            {
                fieldIdentifier: 'subject',
                condition: FilterConditionOperator.Equals,
                value: 'CN=test',
                fieldSource: FilterFieldSource.Property,
            },
        ];
        const result = filterToConditionItems(filter);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            fieldIdentifier: 'subject',
            operator: FilterConditionOperator.Equals,
            value: 'CN=test',
            fieldSource: FilterFieldSource.Property,
        });
    });

    test('maps condition field to operator', () => {
        const filter = [
            {
                fieldIdentifier: 'commonName',
                condition: FilterConditionOperator.Contains,
                value: 'test',
                fieldSource: FilterFieldSource.Meta,
            },
        ];
        const result = filterToConditionItems(filter);
        expect(result[0].operator).toBe(FilterConditionOperator.Contains);
    });

    test('maps multiple filters preserving order', () => {
        const filters = [
            {
                fieldIdentifier: 'field1',
                condition: FilterConditionOperator.Equals,
                value: 'val1',
                fieldSource: FilterFieldSource.Data,
            },
            {
                fieldIdentifier: 'field2',
                condition: FilterConditionOperator.NotEquals,
                value: 'val2',
                fieldSource: FilterFieldSource.Custom,
            },
            {
                fieldIdentifier: 'field3',
                condition: FilterConditionOperator.Greater,
                value: 42,
                fieldSource: FilterFieldSource.Property,
            },
        ];
        const result = filterToConditionItems(filters);
        expect(result).toHaveLength(3);
        expect(result[0].fieldIdentifier).toBe('field1');
        expect(result[1].fieldIdentifier).toBe('field2');
        expect(result[2].fieldIdentifier).toBe('field3');
    });

    test('preserves undefined/null value', () => {
        const filter = [
            {
                fieldIdentifier: 'status',
                condition: FilterConditionOperator.Empty,
                value: undefined,
                fieldSource: FilterFieldSource.Property,
            },
        ];
        const result = filterToConditionItems(filter);
        expect(result[0].value).toBeUndefined();
    });

    test('does not include condition key in result', () => {
        const filter = [
            {
                fieldIdentifier: 'x',
                condition: FilterConditionOperator.Equals,
                value: 'y',
                fieldSource: FilterFieldSource.Data,
            },
        ];
        const result = filterToConditionItems(filter);
        expect(result[0]).not.toHaveProperty('condition');
    });
});

describe('conditionGroupToFilter', () => {
    test('returns empty array for empty input', () => {
        expect(conditionGroupToFilter([])).toEqual([]);
    });

    test('maps a single condition item to a filter', () => {
        const conditions = [
            {
                fieldIdentifier: 'subject',
                operator: FilterConditionOperator.Equals,
                value: 'CN=test',
                fieldSource: FilterFieldSource.Property,
            },
        ];
        const result = conditionGroupToFilter(conditions);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            fieldIdentifier: 'subject',
            condition: FilterConditionOperator.Equals,
            value: 'CN=test',
            fieldSource: FilterFieldSource.Property,
        });
    });

    test('maps operator field to condition', () => {
        const conditions = [
            {
                fieldIdentifier: 'name',
                operator: FilterConditionOperator.StartsWith,
                value: 'abc',
                fieldSource: FilterFieldSource.Meta,
            },
        ];
        const result = conditionGroupToFilter(conditions);
        expect(result[0].condition).toBe(FilterConditionOperator.StartsWith);
    });

    test('maps multiple conditions preserving order', () => {
        const conditions = [
            {
                fieldIdentifier: 'a',
                operator: FilterConditionOperator.Equals,
                value: '1',
                fieldSource: FilterFieldSource.Data,
            },
            {
                fieldIdentifier: 'b',
                operator: FilterConditionOperator.NotContains,
                value: '2',
                fieldSource: FilterFieldSource.Custom,
            },
        ];
        const result = conditionGroupToFilter(conditions);
        expect(result).toHaveLength(2);
        expect(result[0].fieldIdentifier).toBe('a');
        expect(result[1].fieldIdentifier).toBe('b');
    });

    test('does not include operator key in result', () => {
        const conditions = [
            {
                fieldIdentifier: 'x',
                operator: FilterConditionOperator.Equals,
                value: 'y',
                fieldSource: FilterFieldSource.Data,
            },
        ];
        const result = conditionGroupToFilter(conditions);
        expect(result[0]).not.toHaveProperty('operator');
    });

    test('filterToConditionItems and conditionGroupToFilter are inverse operations', () => {
        const originalFilters = [
            {
                fieldIdentifier: 'subject',
                condition: FilterConditionOperator.Contains,
                value: 'myvalue',
                fieldSource: FilterFieldSource.Property,
            },
            {
                fieldIdentifier: 'issuer',
                condition: FilterConditionOperator.NotEquals,
                value: 'badCA',
                fieldSource: FilterFieldSource.Meta,
            },
        ];
        const roundTripped = conditionGroupToFilter(filterToConditionItems(originalFilters));
        expect(roundTripped).toEqual(originalFilters);
    });

    test('conditionGroupToFilter and filterToConditionItems are inverse operations', () => {
        const originalConditions = [
            {
                fieldIdentifier: 'subject',
                operator: FilterConditionOperator.Contains,
                value: 'myvalue',
                fieldSource: FilterFieldSource.Property,
            },
        ];
        const roundTripped = filterToConditionItems(conditionGroupToFilter(originalConditions));
        expect(roundTripped).toEqual(originalConditions);
    });
});
