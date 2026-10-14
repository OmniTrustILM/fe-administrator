import { describe, expect, it } from 'vitest';
import { type ConditionItemDto, FilterConditionOperator, FilterFieldSource, type TriggerHistoryRecordDto } from 'types/openapi';
import { findUnmetConditionItem } from './trigger-history';

const fieldSourceEnum = { [FilterFieldSource.Property]: { code: FilterFieldSource.Property, label: 'Property' } };
const operatorEnum = {
    [FilterConditionOperator.Greater]: { code: FilterConditionOperator.Greater, label: 'greater than' },
    [FilterConditionOperator.Equals]: { code: FilterConditionOperator.Equals, label: 'equals' },
    [FilterConditionOperator.Empty]: { code: FilterConditionOperator.Empty, label: 'empty' },
};

const item = (fieldIdentifier: string, operator: FilterConditionOperator, value?: unknown): ConditionItemDto => ({
    fieldSource: FilterFieldSource.Property,
    fieldIdentifier,
    operator,
    value,
});

const record = (message: string, items: ConditionItemDto[]) =>
    ({ message, condition: { uuid: 'c-1', name: 'condition', items } }) as TriggerHistoryRecordDto;

const find = (message: string, items: ConditionItemDto[]) => findUnmetConditionItem(record(message, items), fieldSourceEnum, operatorEnum);

describe('findUnmetConditionItem', () => {
    const expiresAt = item('NOT_AFTER', FilterConditionOperator.Greater, '2026-08-31T22:00:00.000Z');
    const status = item('STATUS', FilterConditionOperator.Equals, ['valid', 'expiring']);

    it.each([
        ['a single value', "Condition item 'Property NOT_AFTER greater than 2026-08-31T22:00:00.000Z' is false.", expiresAt],
        ['a list of values', "Condition item 'Property STATUS equals [valid, expiring]' is false.", status],
        [
            'an object value',
            "Condition item 'Property GROUP_NAME equals {uuid=g-1, name=Team}' is false.",
            item('GROUP_NAME', FilterConditionOperator.Equals, { uuid: 'g-1', name: 'Team' }),
        ],
        ['no value', "Condition item 'Property COMMON_NAME empty ' is false.", item('COMMON_NAME', FilterConditionOperator.Empty)],
    ])('finds the item behind a reason with %s', (_, message, expected) => {
        expect(find(message, [item('SERIAL_NUMBER', FilterConditionOperator.Equals, '01'), expected])).toBe(expected);
    });

    it.each([
        ['the item changed since the evaluation', "Condition item 'Property NOT_AFTER greater than 2026-01-01T00:00:00.000Z' is false."],
        ['the reason is not about a condition item', 'Condition could not be evaluated: IllegalStateException'],
    ])('finds nothing when %s', (_, message) => {
        expect(find(message, [expiresAt, status])).toBeUndefined();
    });

    it('finds nothing when the record carries no condition items', () => {
        const message = "Condition item 'Property NOT_AFTER greater than 2026-08-31T22:00:00.000Z' is false.";

        expect(findUnmetConditionItem({ message }, fieldSourceEnum, operatorEnum)).toBeUndefined();
        expect(
            findUnmetConditionItem(
                { message, condition: { uuid: 'c-1', name: 'condition' } } as TriggerHistoryRecordDto,
                fieldSourceEnum,
                operatorEnum,
            ),
        ).toBeUndefined();
    });
});
