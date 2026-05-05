import Widget from 'components/Widget';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { ApiClients } from 'src/api';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { type EntityType, actions as filterActions, selectors } from 'ducks/filters';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'components/Select';
import Button from 'components/Button';
import Label from 'components/Label';
import TextInput from 'components/TextInput';
import Badge from 'components/Badge';
import type { Observable } from 'rxjs';
import type { SearchFieldListModel } from 'types/certificate';
import { AttributeContentType, type FilterFieldSource, FilterFieldType, PlatformEnum } from 'types/openapi';
import type { ExecutionItemModel, ExecutionItemRequestModel } from 'types/rules';
import { getFormTypeFromAttributeContentType, getFormTypeFromFilterFieldType } from 'utils/common-utils';
import {
    checkIfFieldAttributeTypeIsDate,
    getFormattedDate,
    getFormattedDateByType,
    getFormattedDateTime,
    getFormattedUtc,
} from 'utils/dateUtil';

const supportedInputTypes = new Set(['number', 'email', 'time', 'textarea', 'text', 'password', 'date']);

type SelectableValue = string | number | boolean | object;

function formatBadgeDataValue(v: any, field: any, platformEnums: Record<string, any>): string {
    if (field?.platformEnum) {
        return platformEnums[field.platformEnum]?.[v]?.label ?? String(v);
    }
    if (typeof v === 'object' && v !== null) {
        if (v.name) return v.name;
        if (field && checkIfFieldAttributeTypeIsDate(field)) {
            const labelStr = v.label ?? v;
            return field.attributeContentType === AttributeContentType.Date
                ? getFormattedDate(labelStr as string)
                : getFormattedDateTime(labelStr as string);
        }
        return v.label ?? String(v);
    }
    if (field?.attributeContentType === AttributeContentType.Date) {
        return getFormattedDate(v as string);
    }
    if (field?.attributeContentType === AttributeContentType.Datetime) {
        return getFormattedDateTime(v as string);
    }
    return String(v);
}

function mapFieldValueToOption(
    v: any,
    fieldRef: any,
    normalizeValue: (v: any) => SelectableValue = (x) => x,
): { label: string; value: SelectableValue } {
    if (typeof v === 'string') {
        let label = v;
        if (checkIfFieldAttributeTypeIsDate(fieldRef)) {
            label = fieldRef?.attributeContentType === AttributeContentType.Date ? getFormattedDate(v) : getFormattedDateTime(v);
        }
        return { label, value: v };
    }
    if (checkIfFieldAttributeTypeIsDate(fieldRef)) {
        return { label: v.label, value: v.value };
    }
    return {
        label: v?.name || v?.label || (typeof v?.data === 'object' ? undefined : v?.data) || JSON.stringify(v),
        value: normalizeValue(v),
    };
}

interface CurrentActionOptions {
    label: string;
    value: string | any;
}

function findSearchFieldData(availableFilters: SearchFieldListModel[], source: FilterFieldSource | undefined) {
    return availableFilters.find((f) => f.filterFieldSource === source)?.searchFieldData;
}

function findFieldDef(availableFilters: SearchFieldListModel[], source: FilterFieldSource | undefined, identifier: string | undefined) {
    if (!source || !identifier) return undefined;
    return findSearchFieldData(availableFilters, source)?.find((s) => s.fieldIdentifier === identifier);
}

function isFilterValueEmpty(value: unknown): boolean {
    return value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length);
}

function mapActionToExecutionItem(a: ExecutionItemRequestModel, availableFilters: SearchFieldListModel[]): ExecutionItemModel {
    const fieldOfAction = findFieldDef(availableFilters, a.fieldSource, a.fieldIdentifier);
    const isDateField = fieldOfAction && checkIfFieldAttributeTypeIsDate(fieldOfAction);
    const formatData = (v: any) => {
        if (typeof v === 'object' && v !== null && Object.hasOwn(v, 'uuid')) return v.uuid;
        if (isDateField) {
            const raw = typeof v === 'object' && v !== null && Object.hasOwn(v, 'value') ? v.value : v;
            return getFormattedUtc(fieldOfAction.attributeContentType!, raw);
        }
        return v;
    };
    let data: unknown;
    if (Array.isArray(a.data)) {
        data = a.data.map(formatData);
    } else if (isDateField) {
        data = [formatData(a.data)];
    } else {
        data = a.data;
    }
    return { fieldSource: a.fieldSource, fieldIdentifier: a.fieldIdentifier, data };
}

type Props = Readonly<{
    title: string;
    entity: EntityType;
    getAvailableFiltersApi: (apiClients: ApiClients) => Observable<Array<SearchFieldListModel>>;
    onActionsUpdate?: (actionRuleRequests: ExecutionItemModel[]) => void;
    ExecutionsList?: ExecutionItemModel[];
    disableBadgeRemove?: boolean;
    busyBadges?: boolean;
}>;

export default function FilterWidgetRuleAction({
    ExecutionsList,
    onActionsUpdate,
    title,
    entity,
    getAvailableFiltersApi,
    disableBadgeRemove,
    busyBadges,
}: Props) {
    const dispatch = useDispatch();

    const searchGroupEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.FilterFieldSource));
    const [actions, setActions] = useState<ExecutionItemRequestModel[]>([]);

    const platformEnums = useSelector(enumSelectors.platformEnums);

    const availableFilters = useSelector(selectors.availableFilters(entity));
    const isFetchingAvailableFilters = useSelector(selectors.isFetchingFilters(entity));

    const [selectedFilter, setSelectedFilter] = useState<number>(-1);

    const [fieldSource, setFieldSource] = useState<FilterFieldSource | undefined>(undefined);

    const [filterField, setFilterField] = useState<string | undefined>(undefined);

    const [filterValue, setFilterValue] = useState<
        | string
        | number
        | boolean
        | object
        | { value: string | number; label: string }[]
        | { value: string | number; label: string }
        | undefined
    >(undefined);

    const booleanOptions = useMemo(
        () => [
            { label: 'True', value: true },
            { label: 'False', value: false },
        ],
        [],
    );

    useEffect(() => {
        dispatch(filterActions.getAvailableFilters({ entity, getAvailableFiltersApi }));
    }, [dispatch, entity, getAvailableFiltersApi]);

    useEffect(() => {
        setFilterValue(undefined);
        setFilterField(undefined);
        setFieldSource(undefined);
        setSelectedFilter(-1);
    }, [entity]);

    const unselectAllFilters = useCallback(() => {
        setSelectedFilter(-1);
    }, [setSelectedFilter]);

    const onUnselectFiltersClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if ((e.target as HTMLDivElement).id === 'unselectFilters') {
                unselectAllFilters();
            }
        },
        [unselectAllFilters],
    );

    const onUnselectFiltersKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLDivElement>) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                unselectAllFilters();
            }
        },
        [unselectAllFilters],
    );

    const currentFields = useMemo(() => findSearchFieldData(availableFilters, fieldSource), [availableFilters, fieldSource]);

    const clearFilterInputs = useCallback(() => {
        setFieldSource(undefined);
        setFilterField(undefined);
        setFilterValue(undefined);
    }, []);

    const notifyActionsUpdate = useCallback(
        (next: ExecutionItemRequestModel[]) => {
            onActionsUpdate?.(next.map((a) => mapActionToExecutionItem(a, availableFilters)));
        },
        [onActionsUpdate, availableFilters],
    );

    const currentField = useMemo(() => currentFields?.find((f) => f.fieldIdentifier === filterField), [filterField, currentFields]);

    const normalizeSelectValue = useCallback((value: any): SelectableValue => {
        if (value == null) return '';
        if (typeof value !== 'object') return value;

        const direct = value.uuid ?? value.value ?? value.reference;
        if (direct != null) return direct;

        if (value.data != null) {
            if (typeof value.data !== 'object') return value.data;
            const nested = value.data.uuid ?? value.data.value ?? value.data.reference ?? value.data.name ?? value.data.label;

            return nested ?? value.data;
        }

        return value.name ?? value.label ?? value;
    }, []);

    const mapActionDataToSelectValue = useCallback(
        (field: any, actionData: any) => {
            const getComparableValues = (value: any): Array<string | number | boolean> => {
                if (value === null || value === undefined) return [];
                if (typeof value !== 'object') return [value];

                const directDataValue =
                    value.data !== undefined && value.data !== null && typeof value.data !== 'object' ? value.data : undefined;
                const nestedDataValue =
                    value.data !== undefined && value.data !== null && typeof value.data === 'object'
                        ? (value.data.value ?? value.data.reference ?? value.data.uuid ?? value.data.name ?? value.data.label)
                        : undefined;

                return [
                    normalizeSelectValue(value),
                    value.uuid,
                    value.value,
                    value.name,
                    value.label,
                    value.reference,
                    directDataValue,
                    nestedDataValue,
                ].filter((candidate): candidate is string | number | boolean => candidate !== undefined && candidate !== null);
            };

            const isFieldOptionMatched = (optionValue: any, rawValue: any) => {
                const optionCandidates = getComparableValues(optionValue);
                const rawCandidates = getComparableValues(rawValue);

                return optionCandidates.some((optionCandidate) =>
                    rawCandidates.some((rawCandidate) => String(optionCandidate) === String(rawCandidate)),
                );
            };

            const mapSingleValue = (singleValue: any): { label: string; value: any } => {
                const fieldValues = Array.isArray(field?.value) ? (field.value as Array<any>) : [];
                const matchedFieldValue = fieldValues.find((fieldValue) => isFieldOptionMatched(fieldValue, singleValue));

                if (matchedFieldValue !== undefined) {
                    if (typeof matchedFieldValue === 'string') {
                        return { label: matchedFieldValue, value: matchedFieldValue };
                    }

                    if (checkIfFieldAttributeTypeIsDate(field)) {
                        return {
                            label: matchedFieldValue.label || getFormattedDateTime(matchedFieldValue.value || singleValue),
                            value: normalizeSelectValue(matchedFieldValue.value || singleValue),
                        };
                    }

                    return {
                        label: matchedFieldValue.name || matchedFieldValue.label || String(singleValue),
                        value: normalizeSelectValue(matchedFieldValue),
                    };
                }

                if (typeof singleValue === 'object' && singleValue !== null) {
                    if (Object.hasOwn(singleValue, 'value')) {
                        return {
                            label: singleValue.label || singleValue.name || JSON.stringify(singleValue.value),
                            value: normalizeSelectValue(singleValue.value),
                        };
                    }

                    return {
                        label:
                            singleValue.name ||
                            singleValue.label ||
                            (typeof singleValue.data === 'object' ? undefined : singleValue.data) ||
                            JSON.stringify(singleValue),
                        value: normalizeSelectValue(singleValue),
                    };
                }

                return { label: String(singleValue), value: normalizeSelectValue(singleValue) };
            };

            return Array.isArray(actionData) ? actionData.map((singleValue) => mapSingleValue(singleValue)) : mapSingleValue(actionData);
        },
        [normalizeSelectValue],
    );

    const mapActionDataToSingleSelectPrimitive = useCallback(
        (field: any, actionData: any): string | number | object => {
            const normalizedActionData = Array.isArray(actionData) ? actionData[0] : actionData;
            const mapped = mapActionDataToSelectValue(field, normalizedActionData) as { label: string; value: any };
            if (mapped && typeof mapped === 'object' && Object.hasOwn(mapped, 'value')) {
                return mapped.value;
            }

            return normalizeSelectValue(normalizedActionData) as string | number | object;
        },
        [mapActionDataToSelectValue, normalizeSelectValue],
    );

    const onUpdateClick = useCallback(() => {
        if (!fieldSource || !filterField || isFilterValueEmpty(filterValue)) return;

        let executionData: any;
        if (typeof filterValue === 'string' || typeof filterValue === 'number' || typeof filterValue === 'boolean') {
            executionData = filterValue;
        } else if (Array.isArray(filterValue)) {
            executionData = filterValue.map((v) => (v as { value: unknown }).value);
        } else if (Object.hasOwn(filterValue as object, 'value')) {
            executionData = (filterValue as { value: unknown }).value;
        } else {
            executionData = filterValue;
        }
        const newExecution: ExecutionItemRequestModel = {
            fieldSource,
            fieldIdentifier: filterField,
            data: executionData,
        };
        clearFilterInputs();

        const updatedActions =
            selectedFilter === -1 ? [...actions, newExecution] : actions.map((a, i) => (i === selectedFilter ? newExecution : a));
        setActions(updatedActions);
        notifyActionsUpdate(updatedActions);
        setSelectedFilter(-1);
    }, [fieldSource, filterField, filterValue, actions, selectedFilter, clearFilterInputs, notifyActionsUpdate]);

    useEffect(() => {
        if (selectedFilter === -1) {
            clearFilterInputs();
        }
    }, [selectedFilter, clearFilterInputs]);

    const onRemoveFilterClick = useCallback(
        (index: number) => {
            const newActions = actions.filter((_, i) => i !== index);
            setActions(newActions);
            if (onActionsUpdate) {
                notifyActionsUpdate(newActions);
            }
            setSelectedFilter(-1);
        },
        [actions, onActionsUpdate, notifyActionsUpdate],
    );

    const toggleFilter = useCallback(
        (index: number) => {
            setSelectedFilter(selectedFilter === index ? -1 : index);
        },
        [selectedFilter],
    );

    const objectValueOptions: CurrentActionOptions[] = useMemo(() => {
        if (!currentField) return [];

        if (Array.isArray(currentField?.value)) {
            return currentField?.value?.map((v) => mapFieldValueToOption(v, currentField, normalizeSelectValue));
        }

        return [];
    }, [currentField, normalizeSelectValue]);
    const updateFilterValueDateTime = useCallback((currentFieldThis: any, currentActionData: any) => {
        if (currentFieldThis.type === 'list') {
            // Compare only the YYYY-MM-DD part: saved data uses plain dates, API field values use ISO strings.
            const findMatchingFieldOption = (v: any): { label: string; value: any } => {
                const rawStr = typeof v === 'object' && v !== null && v.value !== undefined ? String(v.value) : String(v);
                const datePart = rawStr.split('T')[0];
                if (Array.isArray(currentFieldThis.value)) {
                    const matched = currentFieldThis.value.find(
                        (fv: any) => (typeof fv === 'string' ? fv : String(fv)).split('T')[0] === datePart,
                    );
                    if (matched !== undefined) {
                        return mapFieldValueToOption(matched, currentFieldThis);
                    }
                }
                return mapFieldValueToOption(v, currentFieldThis);
            };

            if (Array.isArray(currentActionData)) {
                setFilterValue(currentActionData.map(findMatchingFieldOption));
            } else {
                const resolved = findMatchingFieldOption(currentActionData);
                setFilterValue(currentFieldThis.multiValue ? [resolved] : resolved);
            }
        } else {
            setFilterValue(getFormattedDateByType(currentActionData as unknown as string, currentFieldThis.attributeContentType));
        }
    }, []);
    useEffect(() => {
        // this effect is for updating dropdowns when a filter is selected

        if (selectedFilter >= actions.length) {
            setSelectedFilter(-1);
            return;
        }

        if (selectedFilter === -1) {
            return;
        }

        const selectedAction = actions[selectedFilter];
        if (!selectedAction) {
            setSelectedFilter(-1);
            return;
        }

        const field = selectedAction.fieldSource;
        const fieldIdentifier = selectedAction.fieldIdentifier;
        if (!field || !fieldIdentifier) {
            return;
        }

        setFieldSource(field);
        setFilterField(fieldIdentifier);

        const currentActionDataRaw = selectedAction.data;
        if (currentActionDataRaw === undefined) {
            return;
        }

        const thisCurrentField = findFieldDef(availableFilters, field, fieldIdentifier);

        const currentActionData =
            thisCurrentField && !thisCurrentField.multiValue && Array.isArray(currentActionDataRaw)
                ? currentActionDataRaw[0]
                : currentActionDataRaw;

        // Wait until field metadata is available; otherwise select-based values are hydrated
        // from incomplete data and stay visually empty.
        if (!thisCurrentField) {
            return;
        }

        if (thisCurrentField.type === FilterFieldType.String || thisCurrentField.type === FilterFieldType.Number) {
            setFilterValue(currentActionData);
            return;
        }

        if (thisCurrentField.type === FilterFieldType.Boolean) {
            setFilterValue(
                currentActionData === true || (typeof currentActionData === 'string' && currentActionData.toLowerCase() === 'true'),
            );
            return;
        }

        if (checkIfFieldAttributeTypeIsDate(thisCurrentField)) {
            updateFilterValueDateTime(thisCurrentField, currentActionData);
            return;
        }

        if (Array.isArray(currentActionData)) {
            setFilterValue(mapActionDataToSelectValue(thisCurrentField, currentActionData));
            return;
        }

        if (thisCurrentField.multiValue) {
            const mappedValues = mapActionDataToSelectValue(thisCurrentField, currentActionData);
            let nextValue: typeof mappedValues | [] = [];

            if (Array.isArray(mappedValues)) {
                nextValue = mappedValues;
            } else if (mappedValues) {
                nextValue = [mappedValues];
            }
            setFilterValue(nextValue);
        } else {
            setFilterValue(mapActionDataToSingleSelectPrimitive(thisCurrentField, currentActionData));
        }
    }, [
        selectedFilter,
        actions,
        availableFilters,
        updateFilterValueDateTime,
        mapActionDataToSelectValue,
        mapActionDataToSingleSelectPrimitive,
    ]);

    useEffect(() => {
        // this effect is for updating the actions when the ExecutionsList is passed
        if (!ExecutionsList) return;

        const isActionDataObject = ExecutionsList.some((a) => typeof a.data === 'object');
        if (!isActionDataObject) {
            setActions(ExecutionsList);
            return;
        }

        const updatedActions = ExecutionsList.map((action) => {
            if (!(typeof action.data === 'object')) return action;

            const thisCurrentField = findFieldDef(availableFilters, action.fieldSource, action.fieldIdentifier);
            if (!thisCurrentField) return action;

            if (Array.isArray(action.data) && action.data.every((v) => typeof v === 'string')) {
                const mappedData = action.data.map((v) => {
                    if (!Array.isArray(thisCurrentField.value)) return { label: v, value: v };

                    const value = thisCurrentField.value.find(
                        (f: any) => f.uuid === v || f.value === v || f.reference === v || f.data === v,
                    );

                    return value ? { uuid: value.uuid, name: value.name, value: value.value ?? value.uuid ?? v } : { label: v, value: v };
                });

                return {
                    ...action,
                    data: thisCurrentField.multiValue ? mappedData : mappedData[0],
                };
            }

            if (!thisCurrentField.multiValue && Array.isArray(action.data)) {
                return {
                    ...action,
                    data: action.data[0],
                };
            }

            return action;
        });

        setActions(updatedActions);
    }, [ExecutionsList, availableFilters]);

    const onMultiValueChange = useCallback((values: unknown) => {
        setFilterValue((values as { value: string | number; label: string }[] | undefined) || []);
    }, []);

    const onSingleValueChange = useCallback(
        (values: unknown) => {
            const singleValue = values as { value: string | number; label: string } | string | number | object | undefined;
            if (!singleValue) {
                setFilterValue(undefined);
                return;
            }
            if (typeof singleValue === 'object' && Object.hasOwn(singleValue as object, 'value')) {
                setFilterValue(normalizeSelectValue((singleValue as { value: string | number; label: string }).value));
                return;
            }
            setFilterValue(normalizeSelectValue(singleValue));
        },
        [normalizeSelectValue],
    );

    const renderObjectValueSelector = useMemo(
        () =>
            currentField?.multiValue ? (
                <Select
                    id="value"
                    options={objectValueOptions}
                    isMulti
                    value={Array.isArray(filterValue) ? filterValue : []}
                    onChange={onMultiValueChange}
                    placeholder="Select filter value from options"
                />
            ) : (
                <Select
                    id="value"
                    options={objectValueOptions}
                    value={Array.isArray(filterValue) || typeof filterValue === 'boolean' ? '' : (filterValue ?? '')}
                    onChange={onSingleValueChange}
                    placeholder="Select filter value from options"
                />
            ),
        [objectValueOptions, filterValue, currentField, onMultiValueChange, onSingleValueChange],
    );

    const renderBadgeContent = useCallback(
        (itemNumber: number, value: string, label?: string, fieldSource?: string) => (
            <React.Fragment key={itemNumber}>
                <b>{fieldSource && getEnumLabel(searchGroupEnum, fieldSource)}&nbsp;</b>'{label}
                '&nbsp;to&nbsp;
                {value}
                {!disableBadgeRemove && (
                    <span
                        onClick={(event) => {
                            event.stopPropagation();
                            onRemoveFilterClick(itemNumber);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                event.stopPropagation();
                                onRemoveFilterClick(itemNumber);
                            }
                        }}
                    >
                        &times;
                    </span>
                )}
            </React.Fragment>
        ),
        [onRemoveFilterClick, searchGroupEnum, disableBadgeRemove],
    );

    const isUpdateButtonDisabled = useMemo(
        () => !filterField || !fieldSource || isFilterValueEmpty(filterValue),
        [filterField, fieldSource, filterValue],
    );

    const renderBooleanValueSelect = (
        <Select
            id="value"
            options={filterField ? booleanOptions.map((opt) => ({ label: opt.label, value: String(opt.value) })) : []}
            value={typeof filterValue === 'boolean' ? String(filterValue) : ''}
            onChange={(value) => {
                if (value === 'true') {
                    setFilterValue(true);
                } else if (value === 'false') {
                    setFilterValue(false);
                } else {
                    setFilterValue(undefined);
                }
            }}
            isDisabled={!filterField}
        />
    );

    const isTextInputField =
        currentField?.type === undefined ||
        currentField?.type === FilterFieldType.String ||
        currentField?.type === FilterFieldType.Date ||
        currentField?.type === FilterFieldType.Number;

    const renderBooleanOrObjectValueField =
        currentField?.type === FilterFieldType.Boolean ? renderBooleanValueSelect : renderObjectValueSelector;

    const renderValueField = isTextInputField ? (
        <TextInput
            id="valueSelect"
            type={(() => {
                const typeFromFieldType = currentField?.type ? getFormTypeFromFilterFieldType(currentField?.type) : 'text';
                const rawType =
                    currentField?.attributeContentType && checkIfFieldAttributeTypeIsDate(currentField)
                        ? getFormTypeFromAttributeContentType(currentField?.attributeContentType)
                        : typeFromFieldType;

                return supportedInputTypes.has(rawType) ? (rawType as any) : 'text';
            })()}
            value={filterValue !== undefined && typeof filterValue !== 'object' ? String(filterValue) : ''}
            onChange={(value) => {
                setFilterValue(structuredClone(value));
            }}
            placeholder="Enter filter value"
            disabled={!filterField}
        />
    ) : (
        renderBooleanOrObjectValueField
    );

    return (
        <Widget title={title} busy={isFetchingAvailableFilters} titleSize="large">
            <div id="unselectFilters" role="button" tabIndex={0} onClick={onUnselectFiltersClick} onKeyDown={onUnselectFiltersKeyDown}>
                <div className="flex flex-row gap-2 mb-4 items-end">
                    <div className="grid grid-cols-4 gap-2 w-full">
                        <Select
                            id="group"
                            options={availableFilters.map((f) => ({
                                label: getEnumLabel(searchGroupEnum, f.filterFieldSource),
                                value: f.filterFieldSource,
                            }))}
                            onChange={(value) => {
                                setFieldSource((value as FilterFieldSource) || undefined);
                                setFilterField(undefined);
                                setFilterValue(undefined);
                            }}
                            value={fieldSource || ''}
                            isClearable
                            label="Field Source"
                        />

                        <Select
                            id="field"
                            options={currentFields?.map((f) => ({ label: f.fieldLabel, value: f.fieldIdentifier }))}
                            onChange={(value) => {
                                setFilterField((value as string) || undefined);
                                setFilterValue(undefined);
                            }}
                            value={filterField || ''}
                            isDisabled={!fieldSource}
                            isClearable
                            label="Field"
                        />

                        <div>
                            <Label htmlFor="valueSelect">Value</Label>
                            {renderValueField}
                        </div>

                        <div className="flex items-end">
                            <Button color="primary" className="py-3 min-w-[62px]" onClick={onUpdateClick} disabled={isUpdateButtonDisabled}>
                                {selectedFilter === -1 ? 'Add' : 'Update'}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                    {actions.map((f, i) => {
                        const field = findFieldDef(availableFilters, f.fieldSource, f.fieldIdentifier);
                        const label = field ? field.fieldLabel : f.fieldIdentifier;
                        const nonArrayValue = f.data ? `'${formatBadgeDataValue(f.data, field, platformEnums)}'` : '';
                        const arrayOrScalarValue = Array.isArray(f.data)
                            ? f.data.map((v) => `'${formatBadgeDataValue(v, field, platformEnums)}'`).join(', ')
                            : nonArrayValue;
                        const value =
                            field?.type === FilterFieldType.Boolean
                                ? `'${booleanOptions.find((b) => !!f.data === b.value)?.label}'`
                                : arrayOrScalarValue;
                        return (
                            <Badge
                                key={`${i}-${f.fieldSource}-${f.fieldIdentifier}`}
                                onClick={() => toggleFilter(i)}
                                color={selectedFilter === i ? 'primary' : 'secondary'}
                            >
                                {!isFetchingAvailableFilters && !busyBadges && <>{renderBadgeContent(i, value, label, f.fieldSource)}</>}
                            </Badge>
                        );
                    })}
                </div>
            </div>
        </Widget>
    );
}
