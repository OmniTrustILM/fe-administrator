import Widget from 'components/Widget';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { ApiClients } from 'src/api';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as alertActions } from 'ducks/alerts';
import { type EntityType, actions, selectors } from 'ducks/filters';
import { useDispatch, useSelector } from 'react-redux';
import Select, { type SingleValue, type MultiValue, type OptionValue } from 'components/Select';
import TextInput from 'components/TextInput';
import type { Observable } from 'rxjs';
import type { SearchFieldListModel, SearchFilterModel } from 'types/certificate';
import {
    AttributeContentType,
    FilterConditionOperator,
    type FilterFieldSource,
    FilterFieldType,
    PlatformEnum,
    type SearchFilterRequestDto,
} from 'types/openapi';
import { getFormTypeFromAttributeContentType, getFormTypeFromFilterFieldType } from 'utils/common-utils';
import {
    checkIfFieldAttributeTypeIsDate,
    checkIfFieldOperatorIsInterval,
    checkIfFieldTypeIsDate,
    getFormattedDate,
    getFormattedDateTime,
    getFormattedUtc,
} from 'utils/dateUtil';

import {
    getInputStringFromIso8601String as getDurationStringFromIso8601String,
    getIso8601StringFromInputString as getIso8601StringFromDurationString,
} from 'utils/duration';
import Button from 'components/Button';
import Badge from 'components/Badge';
import { validateDuration, validatePostgresPosixRegex } from 'utils/validators';
import Label from 'components/Label';

const deepCopy = <T,>(value: T): T => (value == null ? value : structuredClone(value));

function mapFilterToRequestDto(f: SearchFilterModel): SearchFilterRequestDto {
    return {
        fieldSource: f.fieldSource,
        fieldIdentifier: f.fieldIdentifier,
        condition: f.condition,
        value: Array.isArray(f.value)
            ? f.value.map((v: any) => (typeof v === 'object' && v !== null && Object.hasOwn(v, 'name') ? v.name : v))
            : f.value,
    };
}

const noValue: { [condition in FilterConditionOperator]: boolean } = {
    [FilterConditionOperator.Equals]: false,
    [FilterConditionOperator.NotEquals]: false,
    [FilterConditionOperator.Greater]: false,
    [FilterConditionOperator.GreaterOrEqual]: false,
    [FilterConditionOperator.Lesser]: false,
    [FilterConditionOperator.LesserOrEqual]: false,
    [FilterConditionOperator.Contains]: false,
    [FilterConditionOperator.NotContains]: false,
    [FilterConditionOperator.StartsWith]: false,
    [FilterConditionOperator.EndsWith]: false,
    [FilterConditionOperator.InNext]: false,
    [FilterConditionOperator.InPast]: false,
    [FilterConditionOperator.Matches]: false,
    [FilterConditionOperator.NotMatches]: false,
    [FilterConditionOperator.Empty]: true,
    [FilterConditionOperator.NotEmpty]: true,
    [FilterConditionOperator.CountEqual]: false,
    [FilterConditionOperator.CountNotEqual]: false,
    [FilterConditionOperator.CountGreaterThan]: false,
    [FilterConditionOperator.CountLessThan]: false,
};

type FieldData = NonNullable<SearchFieldListModel['searchFieldData']>[number];

interface ObjectValueOptions {
    label: string;
    value: any;
}

interface Props {
    title: string;
    entity: EntityType;
    getAvailableFiltersApi: (apiClients: ApiClients) => Observable<Array<SearchFieldListModel>>;
    onFilterUpdate?: (currentFilters: SearchFilterModel[]) => void;
    disableBadgeRemove?: boolean;
    busyBadges?: boolean;
    extraFilterComponent?: React.ReactNode;
    filterGridCols?: 2 | 4;
}

export function FilterWidgetSkeleton({
    title = '',
    filterGridCols = 4,
    dataTestId,
    hasExtraFilter = false,
}: {
    title?: string;
    filterGridCols?: 2 | 4;
    dataTestId?: string;
    hasExtraFilter?: boolean;
}) {
    const colCount = filterGridCols === 2 ? 2 : 4;
    return (
        <Widget title={title} titleSize="large" dataTestId={dataTestId}>
            <div className="animate-pulse">
                <div className="flex flex-row gap-2 mb-4 items-end">
                    <div className={`grid w-full ${filterGridCols === 2 ? 'grid-cols-2 gap-4' : 'grid-cols-4 gap-2'}`}>
                        {Array.from({ length: colCount }, (_, i) => (
                            <div key={i} className="flex flex-col gap-2">
                                <div className="h-4 w-24 rounded bg-gray-200 dark:bg-neutral-700 mb-1" />
                                <div className="h-[46px] w-full rounded bg-gray-200 dark:bg-neutral-700" />
                            </div>
                        ))}
                    </div>
                    <div className="h-[46px] min-w-[62px] rounded bg-gray-200 dark:bg-neutral-700" />
                </div>
                {hasExtraFilter && (
                    <>
                        <div className="border-t border-gray-200 mt-8 mb-4" />
                        <div className="flex items-center gap-3">
                            <div className="h-4 w-28 rounded bg-gray-200 dark:bg-neutral-700" />
                            <div className="h-7 w-13 rounded-full bg-gray-200 dark:bg-neutral-700" />
                        </div>
                    </>
                )}
            </div>
        </Widget>
    );
}

export default function FilterWidget({
    onFilterUpdate,
    title,
    entity,
    getAvailableFiltersApi,
    disableBadgeRemove,
    busyBadges,
    extraFilterComponent,
    filterGridCols = 4,
}: Props) {
    const dispatch = useDispatch();

    const searchGroupEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.FilterFieldSource));
    const FilterConditionOperatorEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.FilterConditionOperator));
    const platformEnums = useSelector(enumSelectors.platformEnums);

    const availableFilters = useSelector(selectors.availableFilters(entity));
    const currentFilters = useSelector(selectors.currentFilters(entity));
    const isFetchingAvailableFilters = useSelector(selectors.isFetchingFilters(entity));

    const [selectedFilter, setSelectedFilter] = useState<number>(-1);

    const [filterGroup, setFilterGroup] = useState<SingleValue<{ label: string; value: FilterFieldSource }> | undefined>(undefined);
    const [filterField, setFilterField] = useState<SingleValue<{ label: string; value: string }> | undefined>(undefined);
    const [filterCondition, setFilterCondition] = useState<SingleValue<{ label: string; value: FilterConditionOperator }> | undefined>(
        undefined,
    );
    const [filterValue, setFilterValue] = useState<
        | string
        | number
        | object
        | SingleValue<object | object[] | { label: string; value: object }>
        | MultiValue<object | object[] | { label: string; value: object }>
        | undefined
    >(undefined);
    const [regexError, setRegexError] = useState<string>('');

    const booleanOptions = useMemo(
        () => [
            { label: 'True', value: true },
            { label: 'False', value: false },
        ],
        [],
    );

    const filterConditionsRequiredNumberInput = useMemo(
        () => [
            FilterConditionOperatorEnum?.COUNT_LESS_THAN.code,
            FilterConditionOperatorEnum?.COUNT_GREATER_THAN.code,
            FilterConditionOperatorEnum?.COUNT_EQUAL.code,
            FilterConditionOperatorEnum?.COUNT_NOT_EQUAL.code,
        ],
        [FilterConditionOperatorEnum],
    );

    useEffect(() => {
        dispatch(actions.getAvailableFilters({ entity, getAvailableFiltersApi }));
    }, [dispatch, entity, getAvailableFiltersApi]);

    useEffect(() => {
        if (selectedFilter >= currentFilters.length) {
            setSelectedFilter(-1);
            return;
        }

        if (selectedFilter === -1) {
            setFilterGroup(undefined);
            setFilterField(undefined);
            setFilterCondition(undefined);
            setFilterValue(undefined);
            return;
        }

        const field = availableFilters
            .find((f) => f.filterFieldSource === currentFilters[selectedFilter].fieldSource)
            ?.searchFieldData?.find((f) => f.fieldIdentifier === currentFilters[selectedFilter].fieldIdentifier);
        if (!field) return;

        setFilterGroup({
            label: getEnumLabel(searchGroupEnum, currentFilters[selectedFilter].fieldSource),
            value: currentFilters[selectedFilter].fieldSource,
        });
        setFilterField({ label: field.fieldLabel, value: field.fieldIdentifier });
        setFilterCondition({
            label: getEnumLabel(FilterConditionOperatorEnum, currentFilters[selectedFilter].condition),
            value: currentFilters[selectedFilter].condition,
        });

        if (filterConditionsRequiredNumberInput.includes(currentFilters[selectedFilter].condition)) {
            setFilterValue(currentFilters[selectedFilter].value);
            return;
        }

        if (checkIfFieldAttributeTypeIsDate(field)) {
            if (field.attributeContentType === AttributeContentType.Date) {
                const dateVal = getFormattedDate(currentFilters[selectedFilter].value as unknown as string);
                setFilterValue(deepCopy(dateVal));
                return;
            }
            if (field.attributeContentType === AttributeContentType.Datetime) {
                const dateTimeVal = getFormattedDateTime(currentFilters[selectedFilter].value as unknown as string);
                setFilterValue(deepCopy(dateTimeVal));
                return;
            }
        }

        if (
            field.type === FilterFieldType.String ||
            field.type === FilterFieldType.Number ||
            field.type === FilterFieldType.Date ||
            field.type === FilterFieldType.Datetime
        ) {
            if (checkIfFieldOperatorIsInterval(currentFilters[selectedFilter].condition)) {
                const duration = getDurationStringFromIso8601String(currentFilters[selectedFilter].value as unknown as string);
                setFilterValue(deepCopy(duration));
                return;
            }
            if (field.type === FilterFieldType.Datetime) {
                const dateTimeVal = getFormattedDateTime(currentFilters[selectedFilter].value as unknown as string);
                setFilterValue(deepCopy(dateTimeVal));
                return;
            }
            if (field.type === FilterFieldType.Date) {
                const dateVal = getFormattedDate(currentFilters[selectedFilter].value as unknown as string);
                setFilterValue(deepCopy(dateVal));
                return;
            }
            setFilterValue(currentFilters[selectedFilter].value);

            return;
        }

        if (field.type === FilterFieldType.Boolean) {
            setFilterValue(booleanOptions.find((f) => !!currentFilters[selectedFilter].value === f.value));
            return;
        }

        if (!field.multiValue) {
            const value = currentFilters[selectedFilter].value;
            const computeLabel = () => {
                if (field.platformEnum) return platformEnums[field.platformEnum][(value ?? '') as string].label;
                if (checkIfFieldAttributeTypeIsDate(field)) return getFormattedDateTime(value as unknown as string);
                return value;
            };
            setFilterValue({ label: computeLabel(), value });
            return;
        }

        if (Array.isArray(currentFilters[selectedFilter].value)) {
            const currentValue = currentFilters[selectedFilter]?.value as Array<object>;
            const newFilterValue = currentValue.map((v: any) => {
                const value = v;
                let label: string;
                if (typeof v === 'string') {
                    if (checkIfFieldAttributeTypeIsDate(field)) {
                        label = getFormattedDateTime(v);
                    } else {
                        label = field.platformEnum ? getEnumLabel(platformEnums[field.platformEnum], v) : v;
                    }
                } else {
                    label = v?.name || JSON.stringify(v);
                }
                return { label, value };
            });

            setFilterValue(newFilterValue);
        }
    }, [
        availableFilters,
        currentFilters,
        selectedFilter,
        booleanOptions,
        platformEnums,
        FilterConditionOperatorEnum,
        searchGroupEnum,
        filterConditionsRequiredNumberInput,
    ]);

    const onUpdateFilterClick = useCallback(() => {
        if (!filterGroup || !filterField || !filterCondition) {
            return;
        }

        if (selectedFilter >= currentFilters.length) {
            setSelectedFilter(-1);
            return;
        }

        const isDuplicate = currentFilters.some(
            (f, i) =>
                i !== selectedFilter &&
                f.fieldSource === filterGroup.value &&
                f.fieldIdentifier === filterField.value &&
                f.condition === filterCondition.value,
        );
        if (isDuplicate) {
            dispatch(alertActions.error('A filter with the same field and condition already exists'));
            return;
        }

        const field = availableFilters
            .find((f) => f?.filterFieldSource === filterGroup.value)
            ?.searchFieldData?.find((f) => f?.fieldIdentifier === filterField.value);

        const computeValue = (): unknown => {
            if (filterValue == null || filterValue === '') return undefined;
            if (typeof filterValue === 'number') return filterValue;
            if (typeof filterValue === 'string') {
                if (field?.type && checkIfFieldTypeIsDate(field.type) && checkIfFieldOperatorIsInterval(filterCondition.value)) {
                    return getIso8601StringFromDurationString(filterValue);
                }
                if (field?.attributeContentType && checkIfFieldAttributeTypeIsDate(field)) {
                    return getFormattedUtc(field.attributeContentType, filterValue);
                }
                return field?.type && checkIfFieldTypeIsDate(field.type) ? getFormattedUtc(field.type, filterValue) : filterValue;
            }
            return Array.isArray(filterValue) ? filterValue.map((v) => v.value) : (filterValue as any).value;
        };
        const value = computeValue();

        const updatedFilterItem: SearchFilterModel = {
            fieldSource: filterGroup.value,
            fieldIdentifier: filterField.value,
            condition: filterCondition.value,
            value: value,
        };

        const newFilters =
            selectedFilter === -1
                ? [...currentFilters, updatedFilterItem]
                : [...currentFilters.slice(0, selectedFilter), updatedFilterItem, ...currentFilters.slice(selectedFilter + 1)];

        dispatch(actions.setCurrentFilters({ entity, currentFilters: newFilters }));
        if (onFilterUpdate) {
            onFilterUpdate(newFilters.map(mapFilterToRequestDto));
            setSelectedFilter(-1);
        }
    }, [
        availableFilters,
        filterGroup,
        filterField,
        filterCondition,
        selectedFilter,
        currentFilters,
        filterValue,
        dispatch,
        entity,
        onFilterUpdate,
    ]);

    const onRemoveFilterClick = useCallback(
        (index: number) => {
            const newFilters = currentFilters.filter((_, i) => i !== index);
            if (newFilters.length === 0) {
                dispatch(actions.setCurrentFilters({ entity, currentFilters: [] }));
                dispatch(actions.setPreservedFilters({ entity, preservedFilters: [] }));
            } else {
                dispatch(actions.setCurrentFilters({ entity, currentFilters: newFilters }));
            }
            setSelectedFilter(-1);
            if (onFilterUpdate) {
                onFilterUpdate(newFilters.map(mapFilterToRequestDto));
            }
        },
        [currentFilters, dispatch, entity, onFilterUpdate],
    );

    const toggleFilter = useCallback(
        (index: number) => {
            setSelectedFilter(selectedFilter === index ? -1 : index);
        },
        [selectedFilter],
    );

    const currentFields = useMemo(
        () => availableFilters?.find((f) => f.filterFieldSource === filterGroup?.value)?.searchFieldData,
        [availableFilters, filterGroup],
    );

    const currentField = useMemo(() => currentFields?.find((f) => f.fieldIdentifier === filterField?.value), [filterField, currentFields]);

    const isValidValue = useMemo(() => {
        if (checkIfFieldOperatorIsInterval(filterCondition?.value)) return !validateDuration()(filterValue as unknown as string);

        const isRegex =
            filterCondition?.value === FilterConditionOperator.Matches || filterCondition?.value === FilterConditionOperator.NotMatches;
        if (isRegex) {
            return !regexError;
        }

        return true;
    }, [filterCondition, filterValue, regexError]);

    const objectValueOptions: ObjectValueOptions[] = useMemo(() => {
        if (!currentField) return [];

        if (Array.isArray(currentField?.value)) {
            return currentField?.value?.map((v) => {
                const value = v;
                let label: string;
                if (typeof v === 'string') {
                    if (checkIfFieldAttributeTypeIsDate(currentField)) {
                        label = getFormattedDateTime(v);
                    } else {
                        label = currentField?.platformEnum ? getEnumLabel(platformEnums[currentField.platformEnum], v) : v;
                    }
                } else {
                    label = v?.name || JSON.stringify(v);
                }
                return { label, value };
            });
        }

        return [];
    }, [currentField, platformEnums]);

    const getBadgeContent = useCallback(
        (itemNumber: number, fieldSource: string, fieldCondition: string, label: string, value: string) => {
            if (isFetchingAvailableFilters || busyBadges) return null;
            return (
                <React.Fragment key={itemNumber}>
                    <b>{getEnumLabel(searchGroupEnum, fieldSource)}&nbsp;</b>'{label}'&nbsp;
                    {getEnumLabel(FilterConditionOperatorEnum, fieldCondition)}&nbsp;
                    {value}
                </React.Fragment>
            );
        },
        [isFetchingAvailableFilters, FilterConditionOperatorEnum, searchGroupEnum, busyBadges],
    );

    const renderFilterValueInput = useCallback(() => {
        function renderDurationInput() {
            return (
                <>
                    <TextInput
                        id="valueSelect"
                        type="text"
                        value={(filterValue as string | number | null | undefined)?.toString() ?? ''}
                        onChange={(value) => {
                            setFilterValue(deepCopy(value));
                        }}
                        placeholder="eg. 2d 30m"
                    />
                    <p className="mt-1 text-sm text-gray-600">Duration in format: 0d 0h 0m 0s</p>
                </>
            );
        }
        function renderTextOrDateInput() {
            const isRegex =
                filterCondition?.value === FilterConditionOperator.Matches || filterCondition?.value === FilterConditionOperator.NotMatches;
            type TextInputType = 'text' | 'textarea' | 'number' | 'email' | 'password' | 'date' | 'time' | 'datetime-local';
            let inputType: TextInputType = 'text';
            if (currentField?.attributeContentType && checkIfFieldAttributeTypeIsDate(currentField)) {
                inputType = getFormTypeFromAttributeContentType(currentField.attributeContentType) as TextInputType;
            } else if (currentField?.type) {
                inputType = getFormTypeFromFilterFieldType(currentField.type) as TextInputType;
            }
            return (
                <>
                    <TextInput
                        id="valueSelect"
                        type={inputType}
                        value={(filterValue as string | number | null | undefined)?.toString() ?? ''}
                        onChange={(value: string) => {
                            setFilterValue(deepCopy(value));

                            if (isRegex) {
                                const error = validatePostgresPosixRegex(value);
                                setRegexError(error);
                            } else {
                                setRegexError('');
                            }
                        }}
                        placeholder={isRegex ? 'Enter regex value' : 'Enter filter value'}
                        disabled={!filterField || !filterCondition || noValue[filterCondition.value]}
                        invalid={isRegex && !!regexError}
                    />
                    {isRegex && regexError && <p className="mt-1 text-sm text-red-600">{regexError}</p>}
                </>
            );
        }
        function renderBooleanInput() {
            return (
                <Select
                    id="valueSelect"
                    options={filterField ? (booleanOptions as unknown as { value: OptionValue; label: string }[]) : []}
                    value={filterValue ?? null}
                    onChange={(e: OptionValue | { value: OptionValue; label: string } | null) => {
                        if (e == null) {
                            setFilterValue(undefined);
                            return;
                        }
                        setFilterValue({ label: e, value: e });
                    }}
                    isDisabled={!filterField || !filterCondition || noValue[filterCondition.value]}
                    isSearchable
                />
            );
        }
        function renderDefaultInput() {
            const isLongValue = objectValueOptions.some((o) => o.label.length > 50);
            return (
                <Select
                    id="valueSelect"
                    options={objectValueOptions}
                    value={filterValue ?? null}
                    onChange={(e: any) => {
                        setFilterValue(e);
                    }}
                    isMulti={currentField?.multiValue as any}
                    isClearable
                    isDisabled={!filterField || !filterCondition || noValue[filterCondition.value]}
                    isSearchable
                    dropdownWidth={isLongValue ? 400 : undefined}
                />
            );
        }
        function renderNumberInput() {
            const numericValue = Number(filterValue);
            const displayValue = Number.isNaN(numericValue) ? '' : numericValue;

            return (
                <TextInput
                    id="valueSelect"
                    type="number"
                    value={displayValue.toString()}
                    onChange={(value) => {
                        if (value === '' || /^\d+$/.test(value)) {
                            setFilterValue(value === '' ? undefined : Number(value));
                        }
                    }}
                    placeholder="Enter filter value"
                />
            );
        }

        if (filterConditionsRequiredNumberInput.includes(filterCondition?.value as string)) {
            return renderNumberInput();
        }
        if (checkIfFieldOperatorIsInterval(filterCondition?.value) && checkIfFieldTypeIsDate(currentField?.type)) {
            return renderDurationInput();
        }
        if (
            currentField?.type === undefined ||
            currentField?.type === FilterFieldType.String ||
            currentField?.type === FilterFieldType.Date ||
            currentField?.type === FilterFieldType.Datetime ||
            currentField?.type === FilterFieldType.Number
        ) {
            return renderTextOrDateInput();
        }
        if (currentField?.type === FilterFieldType.Boolean) {
            return renderBooleanInput();
        }

        return renderDefaultInput();
    }, [
        booleanOptions,
        currentField,
        filterCondition,
        filterConditionsRequiredNumberInput,
        filterField,
        filterValue,
        objectValueOptions,
        regexError,
    ]);

    function getFilterBadgeValue(f: SearchFilterModel, field: FieldData | undefined): string {
        function mapArrayValue(v: any): any {
            if (field?.platformEnum) return platformEnums[field.platformEnum][v]?.label ?? v;
            if (v?.name) return v.name;
            if (field?.type && checkIfFieldTypeIsDate(field.type) && checkIfFieldOperatorIsInterval(f.condition)) {
                return getIso8601StringFromDurationString(v as string);
            }
            if (field?.attributeContentType === AttributeContentType.Date) return getFormattedDate(v);
            if (field?.attributeContentType === AttributeContentType.Datetime) return getFormattedDateTime(v);
            return v;
        }

        function mapValue(): any {
            if (f.value == null || f.value === '') return '';
            if (typeof f.value === 'number') return f.value;
            if (field?.type && checkIfFieldTypeIsDate(field.type) && checkIfFieldOperatorIsInterval(f.condition)) {
                return getDurationStringFromIso8601String(f.value as unknown as string);
            }
            if (field?.platformEnum) return platformEnums[field.platformEnum][f.value as unknown as string]?.label;
            if (
                field?.attributeContentType === AttributeContentType.Date ||
                (field?.type === FilterFieldType.Date && field?.attributeContentType !== AttributeContentType.Datetime)
            ) {
                return getFormattedDate(f.value as unknown as string);
            }
            if (field?.attributeContentType === AttributeContentType.Datetime || field?.type === FilterFieldType.Datetime) {
                return getFormattedDateTime(f.value as unknown as string);
            }
            return f.value;
        }

        if (field?.type === FilterFieldType.Boolean) return `'${booleanOptions.find((b) => !!f.value === b.value)?.label}'`;
        if (Array.isArray(f.value)) return `'${f.value.map((v) => mapArrayValue(v)).join(' OR ')}'`;
        return `'${mapValue()}'`;
    }

    if (isFetchingAvailableFilters && availableFilters.length === 0) {
        return <FilterWidgetSkeleton title={title} filterGridCols={filterGridCols} hasExtraFilter={!!extraFilterComponent} />;
    }

    return (
        <Widget title={title} busy={isFetchingAvailableFilters} titleSize="large">
            <div className="block w-full text-left">
                <div className="flex flex-row gap-2 mb-4 items-end">
                    <div className={`grid w-full ${filterGridCols === 2 ? 'grid-cols-2 gap-4' : 'grid-cols-4 gap-2'}`}>
                        <Select
                            id="group"
                            label="Filter Field Source"
                            options={availableFilters.map((f) => ({
                                label: getEnumLabel(searchGroupEnum, f.filterFieldSource),
                                value: f.filterFieldSource,
                            }))}
                            onChange={(e) => {
                                setFilterGroup({ label: e as string, value: e as FilterFieldSource });
                                setFilterField(undefined);
                                setFilterCondition(undefined);
                                setFilterValue(undefined);
                                setRegexError('');
                            }}
                            value={filterGroup || null}
                        />
                        <Select
                            label="Filter Field"
                            id="field"
                            options={
                                currentFields?.map((f) => ({
                                    label: f.fieldLabel,
                                    value: f.fieldIdentifier,
                                })) || []
                            }
                            onChange={(e) => {
                                setFilterField({ label: e as string, value: e as string });
                                setFilterCondition(undefined);
                                setFilterValue(undefined);
                                setRegexError('');
                            }}
                            value={filterField || null}
                            isDisabled={!filterGroup}
                            isSearchable
                        />

                        <Select
                            id="conditions"
                            label="Filter Condition"
                            options={
                                filterField
                                    ? currentField?.conditions.map((c) => ({
                                          label: getEnumLabel(FilterConditionOperatorEnum, c),
                                          value: c,
                                      }))
                                    : []
                            }
                            onChange={(e) => {
                                setFilterCondition({ label: e as string, value: e as FilterConditionOperator });
                                setFilterValue(undefined);
                                setRegexError('');
                            }}
                            value={filterCondition || null}
                            isDisabled={!filterField}
                            isSearchable
                        />

                        <div>
                            <Label htmlFor="valueSelect">Filter Value</Label>
                            {renderFilterValueInput()}
                        </div>
                    </div>
                    <Button
                        id="addFilter"
                        disabled={
                            !filterField ||
                            !filterCondition ||
                            !isValidValue ||
                            (!noValue[filterCondition.value] && (filterValue == null || filterValue === ''))
                        }
                        onClick={onUpdateFilterClick}
                        className="py-3 min-w-[62px]"
                    >
                        {selectedFilter === -1 ? 'Add' : 'Update'}
                    </Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {currentFilters.map((f, i) => {
                        const field = availableFilters
                            .find((a) => a.filterFieldSource === f.fieldSource)
                            ?.searchFieldData?.find((s) => s.fieldIdentifier === f.fieldIdentifier);
                        const label = field ? field.fieldLabel : f.fieldIdentifier;
                        const value = getFilterBadgeValue(f, field);
                        return (
                            <Badge
                                key={f.fieldIdentifier + i}
                                onClick={() => toggleFilter(i)}
                                color={selectedFilter === i ? 'primary' : 'secondary'}
                                onRemove={() => {
                                    if (disableBadgeRemove) return;
                                    onRemoveFilterClick(i);
                                }}
                                size="medium"
                            >
                                {!isFetchingAvailableFilters && !busyBadges && getBadgeContent(i, f.fieldSource, f.condition, label, value)}
                            </Badge>
                        );
                    })}
                </div>
            </div>
            {extraFilterComponent && (
                <>
                    <div className="border-t border-gray-200 my-4"></div>
                    <div className="mt-4">{extraFilterComponent}</div>
                </>
            )}
        </Widget>
    );
}
