import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { EntityType, selectors } from 'ducks/filters';
import { selectors as rulesSelectors } from 'ducks/rules';
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Spinner from 'components/Spinner';
import Badge from 'components/Badge';
import { AttributeContentType, ExecutionType, FilterFieldType, PlatformEnum } from 'types/openapi';
import type { ExecutionItemModel } from 'types/rules';
import { getFormattedDate, getFormattedDateTime } from 'utils/dateUtil';

interface ExecutionsItemsListProps {
    executionItems: ExecutionItemModel[];
    executionName: string;
    executionType: ExecutionType;
    executionUuid: string;
    smallerBadges?: boolean;
}

const ExecutionsItemsList = ({
    executionItems = [],
    executionName,
    executionType,
    executionUuid,
    smallerBadges,
}: ExecutionsItemsListProps) => {
    const searchGroupEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.FilterFieldSource));
    const availableFilters = useSelector(selectors.availableFilters(EntityType.ACTIONS));
    const platformEnums = useSelector(enumSelectors.platformEnums);

    const isFetchingConditionDetails = useSelector(rulesSelectors.isFetchingConditionDetails);
    const isFetchingAvailableFiltersConditions = useSelector(selectors.isFetchingFilters(EntityType.ACTIONS));

    const isLoading = useMemo(
        () => isFetchingAvailableFiltersConditions || isFetchingConditionDetails,
        [isFetchingAvailableFiltersConditions, isFetchingConditionDetails],
    );

    const booleanOptions = useMemo(
        () => [
            { label: 'True', value: true },
            { label: 'False', value: false },
        ],
        [],
    );

    const renderSetFieldActionBadges = useCallback(() => {
        if (!executionItems) return null;
        return executionItems.map((f, i) => {
            const field = availableFilters
                .find((a) => a.filterFieldSource === f.fieldSource)
                ?.searchFieldData?.find((s) => s.fieldIdentifier === f.fieldIdentifier);

            const label = field ? field.fieldLabel : f.fieldIdentifier;
            let value = '';
            let coincideValueToShow = '';
            if (Array.isArray(field?.value)) {
                if (Array.isArray(f.data)) {
                    const actionDataValues = f.data as string[];
                    const coincideValues = field?.value.filter((v) => actionDataValues.includes(v.uuid));

                    if (coincideValues?.length) coincideValueToShow = coincideValues?.map((v) => v.name).join(', ');
                }
            }

            const formatSingleValue = (v: unknown): string => {
                if (field?.platformEnum) return platformEnums[field.platformEnum][v as string]?.label ?? String(v);
                if ((v as any)?.name) return (v as any).name;
                if (field?.attributeContentType === AttributeContentType.Date) return getFormattedDate(v as unknown as string);
                if (field?.attributeContentType === AttributeContentType.Datetime) return getFormattedDateTime(v as unknown as string);
                return String(v);
            };

            if (coincideValueToShow?.length) {
                value = coincideValueToShow;
            } else if (field?.type === FilterFieldType.Boolean) {
                value = `'${booleanOptions.find((b) => !!f.data === b.value)?.label}'`;
            } else if (Array.isArray(f.data)) {
                value = f.data.map((v) => `'${formatSingleValue(v)}'`).join(', ');
            } else if (f.data) {
                value = `'${formatSingleValue(f.data)}'`;
            }

            return (
                <Badge key={i.toString() + label + value}>
                    <>
                        {f?.fieldSource && getEnumLabel(searchGroupEnum, f?.fieldSource)}&nbsp;'{label}
                        '&nbsp;to&nbsp;
                        {value}
                    </>
                </Badge>
            );
        });
    }, [executionItems, availableFilters, searchGroupEnum, booleanOptions, platformEnums]);

    const renderSendNotificationActionBadges = useCallback(() => {
        if (!executionItems) return null;
        return executionItems.map((f, i) => {
            return (
                <Badge key={i.toString() + f.notificationProfileUuid}>
                    <span>Send notifications to:&nbsp;</span>
                    {f.notificationProfileName}&nbsp;
                </Badge>
            );
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [executionItems, availableFilters, searchGroupEnum, booleanOptions, platformEnums]);

    const renderActionBadges = useCallback(() => {
        switch (executionType) {
            case ExecutionType.SetField:
                return renderSetFieldActionBadges();
            case ExecutionType.SendNotification:
                return renderSendNotificationActionBadges();
        }
    }, [executionType, renderSetFieldActionBadges, renderSendNotificationActionBadges]);

    const renderSmallerSetFieldExecutionsBadges = useCallback(() => {
        return executionItems.map((f, i) => {
            const field = availableFilters
                .find((a) => a.filterFieldSource === f.fieldSource)
                ?.searchFieldData?.find((s) => s.fieldIdentifier === f.fieldIdentifier);

            const label = field ? field.fieldLabel : f.fieldIdentifier;
            let value = '';
            let coincideValueToShow = '';
            if (Array.isArray(field?.value)) {
                if (Array.isArray(f.data)) {
                    const actionDataValues = f.data as string[];
                    const coincideValues = field?.value.filter((v) => actionDataValues.includes(v.uuid));

                    if (coincideValues?.length) coincideValueToShow = coincideValues?.map((v) => v.name).join(', ');
                }
            }

            const formatSingleValue = (v: unknown): string => {
                if (field?.platformEnum) return platformEnums[field.platformEnum][v as string]?.label ?? String(v);
                if ((v as any)?.name) return (v as any).name;
                if (field?.attributeContentType === AttributeContentType.Date) return getFormattedDate(v as unknown as string);
                if (field?.attributeContentType === AttributeContentType.Datetime) return getFormattedDateTime(v as unknown as string);
                return String(v);
            };

            if (coincideValueToShow?.length) {
                value = coincideValueToShow;
            } else if (field?.type === FilterFieldType.Boolean) {
                value = `'${booleanOptions.find((b) => !!f.data === b.value)?.label}'`;
            } else if (Array.isArray(f.data)) {
                value = f.data.map((v) => `'${formatSingleValue(v)}'`).join(', ');
            } else if (f.data) {
                value = `'${formatSingleValue(f.data)}'`;
            }

            return (
                <div key={i.toString() + label + value} className="mt-2 mr-1">
                    <span>
                        {f?.fieldSource && getEnumLabel(searchGroupEnum, f?.fieldSource)}&nbsp;'{label}
                        '&nbsp;to&nbsp;
                        {value}
                    </span>
                </div>
            );
        });
    }, [executionItems, availableFilters, searchGroupEnum, booleanOptions, platformEnums]);

    const renderSmallerSendNotificationExecutionsBadges = useCallback(() => {
        return executionItems.map((f, i) => {
            return (
                <div key={i} className="mt-2 mr-1">
                    <span>
                        <span>Send notifications to:&nbsp;</span>
                        {f.notificationProfileName}&nbsp;
                    </span>
                </div>
            );
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [executionItems, availableFilters, searchGroupEnum, booleanOptions, platformEnums]);

    const renderSmallerExecutionsBadges = useCallback(() => {
        switch (executionType) {
            case ExecutionType.SetField:
                return renderSmallerSetFieldExecutionsBadges();
            case ExecutionType.SendNotification:
                return renderSmallerSendNotificationExecutionsBadges();
        }
    }, [executionType, renderSmallerSendNotificationExecutionsBadges, renderSmallerSetFieldExecutionsBadges]);

    if (isLoading) return <Spinner active={isFetchingConditionDetails} />;

    return smallerBadges ? (
        <div className="flex gap-2 items-center">
            <h6 className="text-gray-500">{`${executionName}'s Execution Items`}</h6>
            <div className="flex flex-wrap">{renderSmallerExecutionsBadges()}</div>
        </div>
    ) : (
        <div key={executionUuid} className="flex gap-2 items-center">
            <h6 className="text-gray-500">{`${executionName}`}</h6>
            {renderActionBadges()}
        </div>
    );
};

export default ExecutionsItemsList;
