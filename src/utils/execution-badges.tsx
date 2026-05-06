import { getEnumLabel } from 'ducks/enums';
import Badge from 'components/Badge';
import type { SearchFieldListModel, SearchFieldModel } from 'types/certificate';
import type { EnumItemDto } from 'types/enums';
import { AttributeContentType, ExecutionType, FilterFieldType } from 'types/openapi';
import type { ExecutionItemModel } from 'types/rules';
import { getFormattedDate, getFormattedDateTime } from 'utils/dateUtil';

type RenderVariant = 'badge' | 'small';

const booleanOptions = [
    { label: 'True', value: true },
    { label: 'False', value: false },
];

const formatSingleValue = (
    v: unknown,
    field: SearchFieldModel | undefined,
    platformEnums: Record<string, Record<string, { label: string }>>,
): string => {
    if (field?.platformEnum) return platformEnums[field.platformEnum][v as string]?.label ?? String(v);
    if (typeof v === 'object' && v !== null && 'name' in v) return String((v as { name: unknown }).name);
    if (field?.attributeContentType === AttributeContentType.Date) return getFormattedDate(v as string);
    if (field?.attributeContentType === AttributeContentType.Datetime) return getFormattedDateTime(v as string);
    return String(v);
};

const getSetFieldValue = (
    item: ExecutionItemModel,
    field: SearchFieldModel | undefined,
    platformEnums: Record<string, Record<string, { label: string }>>,
): string => {
    let coincideValueToShow = '';
    if (Array.isArray(field?.value) && Array.isArray(item.data)) {
        const actionDataValues = item.data as string[];
        const coincideValues = field?.value.filter((v) => actionDataValues.includes(v.uuid));
        if (coincideValues?.length) coincideValueToShow = coincideValues.map((v) => v.name).join(', ');
    }

    if (coincideValueToShow.length) return coincideValueToShow;
    if (field?.type === FilterFieldType.Boolean) {
        return `'${booleanOptions.find((b) => !!item.data === b.value)?.label}'`;
    }
    if (Array.isArray(item.data)) {
        return item.data.map((v) => `'${formatSingleValue(v, field, platformEnums)}'`).join(', ');
    }
    if (item.data) return `'${formatSingleValue(item.data, field, platformEnums)}'`;
    return '';
};

export const renderExecutionItems = (
    executionItems: ExecutionItemModel[],
    executionType: ExecutionType,
    availableFilters: SearchFieldListModel[],
    platformEnums: Record<string, Record<string, { label: string }>>,
    searchGroupEnum: Record<string, EnumItemDto>,
    variant: RenderVariant = 'badge',
) => {
    if (executionType === ExecutionType.SendNotification) {
        return executionItems.map((item, i) => {
            const key = `${i}-${item.notificationProfileUuid ?? ''}`;
            if (variant === 'badge') {
                return (
                    <Badge key={key}>
                        <span>Send notifications to:&nbsp;</span>
                        {item.notificationProfileName}&nbsp;
                    </Badge>
                );
            }
            return (
                <div key={key} className="mt-2 mr-1">
                    <span>
                        <span>Send notifications to:&nbsp;</span>
                        {item.notificationProfileName}&nbsp;
                    </span>
                </div>
            );
        });
    }

    if (executionType !== ExecutionType.SetField) return [];

    return executionItems.map((item, i) => {
        const field = availableFilters
            .find((a) => a.filterFieldSource === item.fieldSource)
            ?.searchFieldData?.find((s) => s.fieldIdentifier === item.fieldIdentifier);

        const label = field ? field.fieldLabel : item.fieldIdentifier;
        const value = getSetFieldValue(item, field, platformEnums);
        const key = `${i}-${label}-${value}`;

        if (variant === 'badge') {
            return (
                <Badge key={key}>
                    <>
                        {item?.fieldSource && getEnumLabel(searchGroupEnum, item.fieldSource)}&nbsp;'{label}
                        '&nbsp;to&nbsp;
                        {value}
                    </>
                </Badge>
            );
        }
        return (
            <div key={key} className="mt-2 mr-1">
                <span>
                    {item?.fieldSource && getEnumLabel(searchGroupEnum, item.fieldSource)}&nbsp;'{label}
                    '&nbsp;to&nbsp;
                    {value}
                </span>
            </div>
        );
    });
};
