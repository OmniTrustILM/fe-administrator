import { test, expect } from '../../playwright/ct-test';
import { renderConditionItems } from './condition-badges';
import type { SearchFieldListModel } from 'types/certificate';
import { type ConditionItemDto, FilterConditionOperator, FilterFieldSource } from 'types/openapi';

const searchGroupEnum = { [FilterFieldSource.Meta]: { label: 'Meta' } };
const filterConditionOperatorEnum = { [FilterConditionOperator.Equals]: { label: 'equals' } };

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
});
