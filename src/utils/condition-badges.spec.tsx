import { test, expect } from '../../playwright/ct-test';
import { renderConditionItems } from './condition-badges';
import type { SearchFieldListModel } from 'types/certificate';
import { type ConditionItemDto, FilterConditionOperator, FilterFieldSource, FilterFieldType } from 'types/openapi';

const searchGroupEnum = { [FilterFieldSource.Meta]: { label: 'Meta' }, [FilterFieldSource.Property]: { label: 'Property' } };
const filterConditionOperatorEnum = {
    [FilterConditionOperator.Equals]: { label: 'equals' },
    [FilterConditionOperator.Greater]: { label: 'greater than' },
    [FilterConditionOperator.InPast]: { label: 'in past' },
};

const propertyFilters = (type: FilterFieldType): SearchFieldListModel[] => [
    {
        filterFieldSource: FilterFieldSource.Property,
        searchFieldData: [{ fieldIdentifier: 'RESOLVED_AT', fieldLabel: 'Resolved At', type, conditions: [] }],
    },
];

test.describe('condition-badges', () => {
    test('renderConditionItems renders badge variant with label and value', async ({ mount }) => {
        const conditionItems: ConditionItemDto[] = [
            {
                fieldSource: FilterFieldSource.Meta,
                fieldIdentifier: 'status',
                operator: FilterConditionOperator.Equals,
                value: 'active',
            },
        ];
        const availableFilters: SearchFieldListModel[] = [];
        const platformEnums: Record<string, Record<string, { label: string }>> = {};

        const result = renderConditionItems(
            conditionItems,
            availableFilters,
            platformEnums,
            searchGroupEnum as any,
            filterConditionOperatorEnum as any,
            { className: 'test-class', variant: 'badge' },
        );

        const component = await mount(<div>{result}</div>);

        await expect(component.getByText(/Meta/)).toBeVisible();
        await expect(component.getByText(/status/)).toBeVisible();
        await expect(component.getByText(/equals/)).toBeVisible();
        await expect(component.getByText(/'active'/)).toBeVisible();
    });

    test('renderConditionItems renders small variant as span', async ({ mount }) => {
        const conditionItems: ConditionItemDto[] = [
            {
                fieldSource: FilterFieldSource.Meta,
                fieldIdentifier: 'name',
                operator: FilterConditionOperator.Equals,
                value: 'test',
            },
        ];

        const result = renderConditionItems(conditionItems, [], {}, searchGroupEnum as any, filterConditionOperatorEnum as any, {
            className: 'text-class',
            variant: 'small',
        });

        const component = await mount(<div>{result}</div>);

        const span = component.locator('span.text-class');
        await expect(span).toBeVisible();
        await expect(span).toContainText(/Meta/);
        await expect(span).toContainText(/'test'/);
    });

    test('renderConditionItems formats array value as OR-separated', async ({ mount }) => {
        const conditionItems: ConditionItemDto[] = [
            {
                fieldSource: FilterFieldSource.Meta,
                fieldIdentifier: 'tags',
                operator: FilterConditionOperator.Equals,
                value: ['a', 'b'],
            },
        ];

        const result = renderConditionItems(conditionItems, [], {}, searchGroupEnum as any, filterConditionOperatorEnum as any, {
            className: 'cls',
            variant: 'badge',
        });

        const component = await mount(<div>{result}</div>);
        await expect(component.getByText(/'a' OR 'b'/)).toBeVisible();
    });

    test('renderConditionItems returns empty when conditionItems empty', () => {
        const result = renderConditionItems([], [], {}, searchGroupEnum as any, filterConditionOperatorEnum as any, {
            className: 'c',
            variant: 'badge',
        });

        expect(result).toHaveLength(0);
    });

    test('renderConditionItems formats a datetime property that has no attribute content type', async ({ mount }) => {
        const conditionItems: ConditionItemDto[] = [
            {
                fieldSource: FilterFieldSource.Property,
                fieldIdentifier: 'RESOLVED_AT',
                operator: FilterConditionOperator.Greater,
                value: '2026-08-31T22:00:00.000Z',
            },
        ];

        const result = renderConditionItems(
            conditionItems,
            propertyFilters(FilterFieldType.Datetime),
            {},
            searchGroupEnum as any,
            filterConditionOperatorEnum as any,
            { className: 'cls', variant: 'badge' },
        );

        const component = await mount(<div>{result}</div>);
        await expect(component.getByText(/'\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}'/)).toBeVisible();
        await expect(component.getByText(/T22:00:00\.000Z/)).toHaveCount(0);
    });

    test('renderConditionItems shows the duration for an interval operator on a date property', async ({ mount }) => {
        const conditionItems: ConditionItemDto[] = [
            {
                fieldSource: FilterFieldSource.Property,
                fieldIdentifier: 'RESOLVED_AT',
                operator: FilterConditionOperator.InPast,
                value: 'P5D',
            },
        ];

        const result = renderConditionItems(
            conditionItems,
            propertyFilters(FilterFieldType.Datetime),
            {},
            searchGroupEnum as any,
            filterConditionOperatorEnum as any,
            { className: 'cls', variant: 'badge' },
        );

        const component = await mount(<div>{result}</div>);
        await expect(component.getByText(/'5d'/)).toBeVisible();
    });

    test('renderConditionItems keeps a raw interval value that is not a duration', async ({ mount }) => {
        const conditionItems: ConditionItemDto[] = [
            {
                fieldSource: FilterFieldSource.Property,
                fieldIdentifier: 'RESOLVED_AT',
                operator: FilterConditionOperator.InPast,
                value: '5',
            },
        ];

        const result = renderConditionItems(
            conditionItems,
            propertyFilters(FilterFieldType.Datetime),
            {},
            searchGroupEnum as any,
            filterConditionOperatorEnum as any,
            { className: 'cls', variant: 'badge' },
        );

        const component = await mount(<div>{result}</div>);
        await expect(component.getByText(/'5'/)).toBeVisible();
    });
});
