import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import type { SearchFieldListModel } from 'types/certificate';
import { FilterConditionOperator, FilterFieldSource, FilterFieldType } from 'types/openapi';
import { renderConditionItems } from './condition-badges';

const searchGroupEnum = { [FilterFieldSource.Property]: { code: FilterFieldSource.Property, label: 'Property' } };
const filterConditionOperatorEnum = {
    [FilterConditionOperator.Greater]: { code: FilterConditionOperator.Greater, label: 'greater than' },
    [FilterConditionOperator.InPast]: { code: FilterConditionOperator.InPast, label: 'in past' },
};

const renderPropertyTitle = (type: FilterFieldType, operator: FilterConditionOperator, value: string | string[]) => {
    const availableFilters: SearchFieldListModel[] = [
        {
            filterFieldSource: FilterFieldSource.Property,
            searchFieldData: [{ fieldIdentifier: 'RESOLVED_AT', fieldLabel: 'Resolved At', type, conditions: [] }],
        },
    ];
    const [badge] = renderConditionItems(
        [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'RESOLVED_AT', operator, value }],
        availableFilters,
        {},
        searchGroupEnum,
        filterConditionOperatorEnum,
        { className: '' },
    ) as ReactElement<{ title: string }>[];
    return badge.props.title;
};

describe('renderConditionItems property values', () => {
    it.each([
        [
            'a datetime in local time',
            FilterFieldType.Datetime,
            FilterConditionOperator.Greater,
            new Date(2026, 8, 1).toISOString(),
            "'2026-09-01 00:00:00'",
        ],
        ['an interval as a duration', FilterFieldType.Datetime, FilterConditionOperator.InPast, 'P5D', "'5d'"],
        ['each interval of a multi-value item', FilterFieldType.Datetime, FilterConditionOperator.InPast, ['P5D', 'P1D'], "'5d' OR '1d'"],
        ['an interval that is not a duration as stored', FilterFieldType.Datetime, FilterConditionOperator.InPast, '5', "'5'"],
    ])('shows %s', (_, type, operator, value, expected) => {
        expect(renderPropertyTitle(type, operator, value)).toBe(
            `Property Resolved At ${filterConditionOperatorEnum[operator as keyof typeof filterConditionOperatorEnum].label} ${expected}`,
        );
    });

    it('shows a date-only value as stored, in any time zone', () => {
        const original = process.env.TZ;

        try {
            for (const zone of ['UTC', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
                process.env.TZ = zone;
                expect(renderPropertyTitle(FilterFieldType.Date, FilterConditionOperator.Greater, '2026-09-01')).toBe(
                    "Property Resolved At greater than '2026-09-01'",
                );
            }
        } finally {
            if (original === undefined) delete process.env.TZ;
            else process.env.TZ = original;
        }
    });
});
