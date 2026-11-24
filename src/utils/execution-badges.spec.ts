import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderExecutionItems } from './execution-badges';
import type { SearchFieldListModel } from 'types/certificate';
import type { ExecutionItemModel } from 'types/rules';
import { AttributeContentType, ExecutionType, FilterFieldSource, FilterFieldType } from 'types/openapi';

const searchGroupEnum = {
    [FilterFieldSource.Meta]: { label: 'Meta attribute' },
    [FilterFieldSource.Property]: { label: 'Property' },
    [FilterFieldSource.Custom]: { label: 'Custom attribute' },
    [FilterFieldSource.Data]: { label: 'Data attribute' },
} as any;

const entityMap: Record<string, string> = {
    '&#x27;': "'",
    '&amp;': '&',
    '&nbsp;': ' ',
};

const renderItems = (...args: Parameters<typeof renderExecutionItems>) => {
    const elements = renderExecutionItems(...args);
    const html = renderToStaticMarkup(elements as any);
    return html.replaceAll(/&(?:#x27|amp|nbsp);/g, (match) => entityMap[match] ?? match);
};

const buildAvailableFilters = (searchFieldData: any[]): SearchFieldListModel[] => [
    {
        filterFieldSource: FilterFieldSource.Property,
        searchFieldData,
    } as any,
];

const stateEnumField = {
    fieldIdentifier: 'state',
    fieldLabel: 'State',
    type: FilterFieldType.String,
    platformEnum: 'StateEnum',
};
const stateEnumPlatformEnums = { StateEnum: { active: { label: 'Active' } } };

describe('execution-badges', () => {
    it('returns empty array for unsupported execution type', () => {
        const result = renderExecutionItems([], 'UNKNOWN' as ExecutionType, [], {}, searchGroupEnum, 'badge');
        expect(result).toHaveLength(0);
    });

    it('renders SetField badge variant with label and value', () => {
        const items: ExecutionItemModel[] = [{ fieldSource: FilterFieldSource.Meta, fieldIdentifier: 'status', data: 'active' }];

        const html = renderItems(items, ExecutionType.SetField, [], {}, searchGroupEnum, 'badge');

        expect(html).toContain('Meta');
        expect(html).toContain('status');
        expect(html).toContain("'active'");
    });

    it('renders SetField small variant as div', () => {
        const items: ExecutionItemModel[] = [{ fieldSource: FilterFieldSource.Meta, fieldIdentifier: 'name', data: 'value' }];

        const html = renderItems(items, ExecutionType.SetField, [], {}, searchGroupEnum, 'small');

        expect(html).toContain('class="mt-2 mr-1"');
        expect(html).toContain('Meta');
        expect(html).toContain("'value'");
    });

    it('formats array data as comma-separated quoted values', () => {
        const items: ExecutionItemModel[] = [{ fieldSource: FilterFieldSource.Meta, fieldIdentifier: 'tags', data: ['a', 'b'] }];

        const html = renderItems(items, ExecutionType.SetField, [], {}, searchGroupEnum, 'badge');
        expect(html).toContain("'a', 'b'");
    });

    it('uses field label and uuid mapping when available', () => {
        const availableFilters = buildAvailableFilters([
            {
                fieldIdentifier: 'group',
                fieldLabel: 'Group',
                type: FilterFieldType.String,
                value: [
                    { uuid: 'u1', name: 'GroupOne' },
                    { uuid: 'u2', name: 'GroupTwo' },
                ],
            } as any,
        ]);

        const items: ExecutionItemModel[] = [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'group', data: ['u1', 'u2'] }];

        const html = renderItems(items, ExecutionType.SetField, availableFilters, {}, searchGroupEnum, 'badge');
        expect(html).toContain('Group');
        expect(html).toContain('GroupOne, GroupTwo');
    });

    it('renders boolean field with True label for truthy data', () => {
        const availableFilters = buildAvailableFilters([
            { fieldIdentifier: 'enabled', fieldLabel: 'Enabled', type: FilterFieldType.Boolean } as any,
        ]);
        const items: ExecutionItemModel[] = [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'enabled', data: true }];

        const html = renderItems(items, ExecutionType.SetField, availableFilters, {}, searchGroupEnum, 'badge');
        expect(html).toContain("'True'");
    });

    it('renders boolean field with False label for falsy data', () => {
        const availableFilters = buildAvailableFilters([
            { fieldIdentifier: 'enabled', fieldLabel: 'Enabled', type: FilterFieldType.Boolean } as any,
        ]);
        const items: ExecutionItemModel[] = [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'enabled', data: false }];

        const html = renderItems(items, ExecutionType.SetField, availableFilters, {}, searchGroupEnum, 'badge');
        expect(html).toContain("'False'");
    });

    it('formats Date attribute content type', () => {
        const availableFilters = buildAvailableFilters([
            {
                fieldIdentifier: 'createdAt',
                fieldLabel: 'Created At',
                type: FilterFieldType.Date,
                attributeContentType: AttributeContentType.Date,
            } as any,
        ]);
        const items: ExecutionItemModel[] = [
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'createdAt', data: '2024-01-15T00:00:00Z' },
        ];

        const html = renderItems(items, ExecutionType.SetField, availableFilters, {}, searchGroupEnum, 'badge');
        expect(html).toContain('Created At');
    });

    it('formats Datetime attribute content type', () => {
        const availableFilters = buildAvailableFilters([
            {
                fieldIdentifier: 'updatedAt',
                fieldLabel: 'Updated At',
                type: FilterFieldType.Date,
                attributeContentType: AttributeContentType.Datetime,
            } as any,
        ]);
        const items: ExecutionItemModel[] = [
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'updatedAt', data: '2024-01-15T10:30:00Z' },
        ];

        const html = renderItems(items, ExecutionType.SetField, availableFilters, {}, searchGroupEnum, 'badge');
        expect(html).toContain('Updated At');
    });

    it('renders SendNotification badge variant', () => {
        const items: ExecutionItemModel[] = [{ notificationProfileUuid: 'np-1', notificationProfileName: 'AdminAlert' }];

        const html = renderItems(items, ExecutionType.SendNotification, [], {}, searchGroupEnum, 'badge');
        expect(html).toContain('Send notifications to:');
        expect(html).toContain('AdminAlert');
    });

    it('renders SendNotification small variant as div', () => {
        const items: ExecutionItemModel[] = [{ notificationProfileUuid: 'np-2', notificationProfileName: 'OpsAlert' }];

        const html = renderItems(items, ExecutionType.SendNotification, [], {}, searchGroupEnum, 'small');
        expect(html).toContain('class="mt-2 mr-1"');
        expect(html).toContain('Send notifications to:');
        expect(html).toContain('OpsAlert');
    });

    it('uses platformEnum label when available', () => {
        const availableFilters = buildAvailableFilters([stateEnumField as any]);
        const items: ExecutionItemModel[] = [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'state', data: 'active' }];

        const html = renderItems(items, ExecutionType.SetField, availableFilters, stateEnumPlatformEnums, searchGroupEnum, 'badge');
        expect(html).toContain("'Active'");
    });

    it('uses object name property when value is an object', () => {
        const items: ExecutionItemModel[] = [
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'owner', data: { name: 'Alice' } },
        ];

        const html = renderItems(items, ExecutionType.SetField, [], {}, searchGroupEnum, 'badge');
        expect(html).toContain("'Alice'");
    });

    it('returns no markup for SetField with empty items', () => {
        const html = renderItems([], ExecutionType.SetField, [], {}, searchGroupEnum, 'badge');
        expect(html).toBe('');
    });

    it('falls back to fieldIdentifier when field is not found in availableFilters', () => {
        const items: ExecutionItemModel[] = [{ fieldSource: FilterFieldSource.Meta, fieldIdentifier: 'unknown_field', data: 'x' }];

        const html = renderItems(items, ExecutionType.SetField, [], {}, searchGroupEnum, 'badge');
        expect(html).toContain('unknown_field');
    });

    it('handles platformEnum lookup miss by falling back to raw value', () => {
        const availableFilters = buildAvailableFilters([stateEnumField as any]);
        const items: ExecutionItemModel[] = [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'state', data: 'unknown' }];

        const html = renderItems(items, ExecutionType.SetField, availableFilters, stateEnumPlatformEnums, searchGroupEnum, 'badge');
        expect(html).toContain("'unknown'");
    });

    describe('mapped source attribute', () => {
        const targetOnlyFilters: SearchFieldListModel[] = [
            {
                filterFieldSource: FilterFieldSource.Custom,
                searchFieldData: [
                    {
                        fieldIdentifier: 'targetAttr|STRING',
                        fieldLabel: 'TargetAttr',
                        type: FilterFieldType.String,
                        attributeContentType: AttributeContentType.String,
                    },
                ],
            } as any,
        ];
        const sourceOnlyFilters: SearchFieldListModel[] = [
            {
                filterFieldSource: FilterFieldSource.Data,
                searchFieldData: [
                    {
                        fieldIdentifier: 'sourceAttr|STRING',
                        fieldLabel: 'SourceAttr',
                        type: FilterFieldType.String,
                        attributeContentType: AttributeContentType.String,
                    },
                ],
            } as any,
        ];
        const mappedAvailableFilters: SearchFieldListModel[] = [...targetOnlyFilters, ...sourceOnlyFilters];

        it('renders source attribute reference instead of literal value', () => {
            const items: ExecutionItemModel[] = [
                {
                    fieldSource: FilterFieldSource.Custom,
                    fieldIdentifier: 'targetAttr|STRING',
                    sourceFieldSource: FilterFieldSource.Data,
                    sourceFieldIdentifier: 'sourceAttr|STRING',
                },
            ];

            const html = renderItems(items, ExecutionType.SetField, mappedAvailableFilters, {}, searchGroupEnum, 'badge');

            expect(html).toContain('Custom attribute');
            expect(html).toContain("'TargetAttr'");
            expect(html).toContain('to');
            expect(html).toContain('Data attribute');
            expect(html).toContain("'SourceAttr'");
            // No quoted literal value
            expect(html).not.toContain("'undefined'");
        });

        it('does not duplicate the word "attribute" in the source label', () => {
            const items: ExecutionItemModel[] = [
                {
                    fieldSource: FilterFieldSource.Custom,
                    fieldIdentifier: 'targetAttr|STRING',
                    sourceFieldSource: FilterFieldSource.Data,
                    sourceFieldIdentifier: 'sourceAttr|STRING',
                },
            ];

            const html = renderItems(items, ExecutionType.SetField, mappedAvailableFilters, {}, searchGroupEnum, 'badge');
            expect(html).not.toMatch(/attribute\s+attribute/);
        });

        it('falls back to raw source field identifier when not resolved', () => {
            const items: ExecutionItemModel[] = [
                {
                    fieldSource: FilterFieldSource.Custom,
                    fieldIdentifier: 'targetAttr|STRING',
                    sourceFieldSource: FilterFieldSource.Data,
                    sourceFieldIdentifier: 'unknownSource|STRING',
                },
            ];

            const html = renderItems(items, ExecutionType.SetField, mappedAvailableFilters, {}, searchGroupEnum, 'badge');
            expect(html).toContain("'unknownSource|STRING'");
        });

        it('prefers source mapping over data when both are present', () => {
            const items: ExecutionItemModel[] = [
                {
                    fieldSource: FilterFieldSource.Custom,
                    fieldIdentifier: 'targetAttr|STRING',
                    sourceFieldSource: FilterFieldSource.Data,
                    sourceFieldIdentifier: 'sourceAttr|STRING',
                    data: 'leftover',
                },
            ];

            const html = renderItems(items, ExecutionType.SetField, mappedAvailableFilters, {}, searchGroupEnum, 'badge');
            expect(html).not.toContain("'leftover'");
            expect(html).toContain("'SourceAttr'");
        });

        it('renders small variant for mapped item', () => {
            const items: ExecutionItemModel[] = [
                {
                    fieldSource: FilterFieldSource.Custom,
                    fieldIdentifier: 'targetAttr|STRING',
                    sourceFieldSource: FilterFieldSource.Data,
                    sourceFieldIdentifier: 'sourceAttr|STRING',
                },
            ];

            const html = renderItems(items, ExecutionType.SetField, mappedAvailableFilters, {}, searchGroupEnum, 'small');
            expect(html).toContain('class="mt-2 mr-1"');
            expect(html).toContain("'SourceAttr'");
        });

        it('resolves source label from sourceAvailableFilters when target list lacks the source field', () => {
            const items: ExecutionItemModel[] = [
                {
                    fieldSource: FilterFieldSource.Custom,
                    fieldIdentifier: 'targetAttr|STRING',
                    sourceFieldSource: FilterFieldSource.Data,
                    sourceFieldIdentifier: 'sourceAttr|STRING',
                },
            ];

            // availableFilters has only target; sourceAvailableFilters provides the source label.
            const html = renderItems(items, ExecutionType.SetField, targetOnlyFilters, {}, searchGroupEnum, 'badge', sourceOnlyFilters);
            expect(html).toContain("'SourceAttr'");
            expect(html).not.toContain("'sourceAttr|STRING'");
        });

        it('falls back to raw identifier when source label is missing in both lists', () => {
            const items: ExecutionItemModel[] = [
                {
                    fieldSource: FilterFieldSource.Custom,
                    fieldIdentifier: 'targetAttr|STRING',
                    sourceFieldSource: FilterFieldSource.Data,
                    sourceFieldIdentifier: 'orphan|STRING',
                },
            ];

            const html = renderItems(items, ExecutionType.SetField, targetOnlyFilters, {}, searchGroupEnum, 'badge', sourceOnlyFilters);
            expect(html).toContain("'orphan|STRING'");
        });
    });

    describe('renew certificate executions', () => {
        it.each(['badge', 'small'] as const)('renders no items for an empty item list in the %s variant', (variant) => {
            const html = renderItems([], ExecutionType.RenewCertificate, [], {}, searchGroupEnum, variant);

            expect(html).toBe('');
        });
    });
});
