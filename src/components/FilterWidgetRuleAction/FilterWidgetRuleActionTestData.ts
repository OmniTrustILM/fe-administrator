import type { SearchFieldListModel } from 'types/certificate';
import { AttributeContentType, FilterFieldSource, FilterFieldType } from 'types/openapi';

type SearchFieldData = NonNullable<SearchFieldListModel['searchFieldData']>[number];

export function makeSearchFieldList(source: FilterFieldSource, fields: Record<string, unknown>[]): SearchFieldListModel[] {
    const searchFieldData: SearchFieldData[] = fields.map((f) => ({
        fieldIdentifier: '',
        fieldLabel: '',
        type: FilterFieldType.String,
        conditions: [],
        ...f,
    }));
    return [{ filterFieldSource: source, searchFieldData }];
}

export const defaultMockAvailableFilters: SearchFieldListModel[] = [
    {
        filterFieldSource: FilterFieldSource.Meta,
        searchFieldData: [
            {
                fieldIdentifier: 'status',
                fieldLabel: 'Status',
                type: FilterFieldType.String,
                conditions: [],
            },
            {
                fieldIdentifier: 'enabled',
                fieldLabel: 'Enabled',
                type: FilterFieldType.Boolean,
                conditions: [],
            },
            {
                fieldIdentifier: 'kind',
                fieldLabel: 'Kind',
                type: FilterFieldType.List,
                conditions: [],
                value: [
                    { uuid: 'k1', name: 'Kind One' },
                    { uuid: 'k2', name: 'Kind Two' },
                ],
                multiValue: false,
            },
        ],
    },
];

export const groupsFieldDef = {
    fieldIdentifier: 'groups',
    fieldLabel: 'Groups',
    type: 'list' as const,
    value: [
        { uuid: 'g1', name: 'Group One' },
        { uuid: 'g2', name: 'Group Two' },
    ],
    multiValue: true,
};

export const tagsFieldDef = {
    fieldIdentifier: 'tags',
    fieldLabel: 'Tags',
    type: 'list' as const,
    value: [
        { uuid: 't1', name: 'Tag One' },
        { uuid: 't2', name: 'Tag Two' },
        { uuid: 't3', name: 'Tag Three' },
    ],
    multiValue: true,
};

export const tagsFieldTwoValuesDef = {
    ...tagsFieldDef,
    value: [
        { uuid: 't1', name: 'Tag One' },
        { uuid: 't2', name: 'Tag Two' },
    ],
};

export const customAttrFieldDef = {
    fieldIdentifier: 'customAttr',
    fieldLabel: 'Custom Attr',
    type: 'list' as const,
    value: [
        { reference: 'r1', data: 'Option One' },
        { reference: 'r2', data: 'Option Two' },
    ],
    multiValue: false,
};

export const complexAttrFieldDef = {
    fieldIdentifier: 'complexAttr',
    fieldLabel: 'Complex Attr',
    type: 'list' as const,
    value: [{ data: { uuid: 'cx1', name: 'Complex One' } }, { data: { uuid: 'cx2', name: 'Complex Two' } }],
    multiValue: false,
};

export const expiresAtFieldDef = {
    fieldIdentifier: 'expiresAt',
    fieldLabel: 'Expires At',
    type: 'list' as const,
    multiValue: true,
    attributeContentType: AttributeContentType.Datetime,
    value: ['2026-03-01T10:00:00Z', '2026-03-02T10:00:00Z'],
};

export const issuedOnDateFieldDef = {
    fieldIdentifier: 'issuedOn',
    fieldLabel: 'Issued On',
    type: 'date' as const,
    attributeContentType: AttributeContentType.Date,
};

// Date list field with ISO-string options — saved data normalizes to plain YYYY-MM-DD, requiring date-part matching.
export const datesListFieldDef = {
    fieldIdentifier: 'customDates',
    fieldLabel: 'Custom Dates',
    type: 'list' as const,
    multiValue: true,
    attributeContentType: AttributeContentType.Date,
    value: ['2026-02-20T00:00:00Z', '2026-03-29T00:00:00Z', '2026-04-13T00:00:00Z'],
};

export const createdAtDatetimeFieldDef = {
    fieldIdentifier: 'createdAt',
    fieldLabel: 'Created At',
    type: 'list' as const,
    multiValue: false,
    attributeContentType: AttributeContentType.Datetime,
    value: ['2026-04-01T08:00:00Z', '2026-04-02T08:00:00Z'],
};

export const modeFieldDef = {
    fieldIdentifier: 'mode',
    fieldLabel: 'Mode',
    type: 'list' as const,
    value: ['alpha', 'beta'],
    multiValue: false,
};

export const priorityListFieldDef = {
    fieldIdentifier: 'priority',
    fieldLabel: 'Priority',
    type: 'list' as const,
    platformEnum: 'PriorityLevel',
    value: [
        { uuid: 'high', name: 'High' },
        { uuid: 'low', name: 'Low' },
    ],
    multiValue: false,
};

export const priorityStringFieldDef = {
    fieldIdentifier: 'priority',
    fieldLabel: 'Priority',
    type: 'string' as const,
    platformEnum: 'PriorityLevel',
};

export const countFieldDef = {
    fieldIdentifier: 'count',
    fieldLabel: 'Count',
    type: 'number' as const,
};

export const updatedAtFieldDef = {
    fieldIdentifier: 'updatedAt',
    fieldLabel: 'Updated At',
    type: 'string' as const,
    attributeContentType: AttributeContentType.Datetime,
};

export const issuedOnStringFieldDef = {
    fieldIdentifier: 'issuedOn',
    fieldLabel: 'Issued On',
    type: 'string' as const,
    attributeContentType: AttributeContentType.Date,
};

export const priorityEnumsOverride = {
    PriorityLevel: {
        high: { label: 'High Priority' },
        low: { label: 'Low Priority' },
    },
};

export const priorityEnumsHighOnly = {
    PriorityLevel: {
        high: { label: 'High Priority' },
    },
};
