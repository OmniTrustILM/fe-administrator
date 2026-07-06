import Widget from 'components/Widget';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { ApiClients } from 'src/api';
import { selectors as enumSelectors, getEnumLabel, getEnumDescription } from 'ducks/enums';
import { type EntityType, actions as filterActions, selectors } from 'ducks/filters';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'components/Select';
import Button from 'components/Button';
import Label from 'components/Label';
import TextInput from 'components/TextInput';
import DatePicker from 'components/DatePicker';
import Badge from 'components/Badge';
import type { Observable } from 'rxjs';
import type { SearchFieldListModel } from 'types/certificate';
import type { PlatformEnumModel } from 'types/enums';
import { AttributeContentType, FilterFieldSource, FilterFieldType, PlatformEnum } from 'types/openapi';
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

type SelectableValue = string | number | object;

type TextInputType = 'text' | 'textarea' | 'number' | 'email' | 'password' | 'date' | 'time' | 'datetime-local';

type FieldData = NonNullable<SearchFieldListModel['searchFieldData']>[number];

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;

const toSelectableValue = (value: unknown): SelectableValue => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number') return value;
    if (typeof value === 'object') return value;
    return String(value);
};

function formatBadgeDataValue(v: unknown, field: FieldData | undefined, platformEnums: PlatformEnumModel): string {
    if (field?.platformEnum) {
        return platformEnums[field.platformEnum]?.[String(v)]?.label ?? String(v);
    }
    const record = asRecord(v);
    if (record) {
        if (record.name) return String(record.name);
        if (field && checkIfFieldAttributeTypeIsDate(field)) {
            const labelStr = String(record.label ?? v);
            return field.attributeContentType === AttributeContentType.Date ? getFormattedDate(labelStr) : getFormattedDateTime(labelStr);
        }
        return record.label != null ? String(record.label) : String(v);
    }
    if (Array.isArray(field?.value)) {
        const matched = (field.value as unknown[]).find((fv) => {
            const r = asRecord(fv);
            return r ? r.uuid === v || r.value === v || r.reference === v : false;
        });
        const mr = asRecord(matched);
        if (mr) return String(mr.name ?? mr.label ?? mr.data ?? v);
    }
    if (field?.attributeContentType === AttributeContentType.Date) {
        return getFormattedDate(String(v));
    }
    if (field?.attributeContentType === AttributeContentType.Datetime) {
        return getFormattedDateTime(String(v));
    }
    return String(v);
}

function mapFieldValueToOption(
    v: unknown,
    fieldRef: FieldData,
    normalizeValue: (value: unknown) => SelectableValue = toSelectableValue,
): { label: string; value: SelectableValue } {
    if (typeof v === 'string') {
        let label = v;
        if (checkIfFieldAttributeTypeIsDate(fieldRef)) {
            label = fieldRef.attributeContentType === AttributeContentType.Date ? getFormattedDate(v) : getFormattedDateTime(v);
        }
        return { label, value: v };
    }
    const record = asRecord(v);
    if (checkIfFieldAttributeTypeIsDate(fieldRef)) {
        return { label: String(record?.label ?? ''), value: toSelectableValue(record?.value) };
    }
    const dataLabel = record && typeof record.data !== 'object' ? record.data : undefined;
    return {
        label: String(record?.name || record?.label || dataLabel || JSON.stringify(v)),
        value: normalizeValue(v),
    };
}

interface CurrentActionOptions {
    label: string;
    value: SelectableValue;
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

const EMPTY_SOURCE_FILTERS: SearchFieldListModel[] = [];
const emptySourceFiltersSelector = () => EMPTY_SOURCE_FILTERS;

function mapActionToExecutionItem(a: ExecutionItemRequestModel, availableFilters: SearchFieldListModel[]): ExecutionItemModel {
    if (a.sourceFieldSource && a.sourceFieldIdentifier) {
        return {
            fieldSource: a.fieldSource,
            fieldIdentifier: a.fieldIdentifier,
            sourceFieldSource: a.sourceFieldSource,
            sourceFieldIdentifier: a.sourceFieldIdentifier,
        };
    }
    const fieldOfAction = findFieldDef(availableFilters, a.fieldSource, a.fieldIdentifier);
    const isDateField = fieldOfAction && checkIfFieldAttributeTypeIsDate(fieldOfAction);
    const formatData = (v: unknown): unknown => {
        const record = asRecord(v);
        if (record && Object.hasOwn(record, 'uuid')) return record.uuid;
        if (isDateField) {
            const raw = record && Object.hasOwn(record, 'value') ? record.value : v;
            return getFormattedUtc(fieldOfAction.attributeContentType!, String(raw));
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

type Props = {
    title: string;
    entity: EntityType;
    sourceEntity?: EntityType;
    getAvailableFiltersApi: (apiClients: ApiClients) => Observable<Array<SearchFieldListModel>>;
    getSourceAvailableFiltersApi?: (apiClients: ApiClients) => Observable<Array<SearchFieldListModel>>;
    onActionsUpdate?: (actionRuleRequests: ExecutionItemModel[]) => void;
    ExecutionsList?: ExecutionItemModel[];
    disableBadgeRemove?: boolean;
    busyBadges?: boolean;
};

type ValueMode = 'static' | 'mapped';

export default function FilterWidgetRuleAction({
    ExecutionsList,
    onActionsUpdate,
    title,
    entity,
    sourceEntity,
    getAvailableFiltersApi,
    getSourceAvailableFiltersApi,
    disableBadgeRemove,
    busyBadges,
}: Readonly<Props>) {
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

    const sourceFiltersSelector = useMemo(
        () => (sourceEntity === undefined ? emptySourceFiltersSelector : selectors.availableFilters(sourceEntity)),
        [sourceEntity],
    );
    const sourceAvailableFiltersRaw = useSelector(sourceFiltersSelector);
    const sourceAvailableFilters = useMemo<SearchFieldListModel[]>(
        () => (sourceAvailableFiltersRaw ?? []).filter((f) => f.filterFieldSource !== FilterFieldSource.Property),
        [sourceAvailableFiltersRaw],
    );

    const [valueMode, setValueMode] = useState<ValueMode>('static');
    const [sourceFieldSource, setSourceFieldSource] = useState<FilterFieldSource | undefined>(undefined);
    const [sourceFilterField, setSourceFilterField] = useState<string | undefined>(undefined);

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
        if (sourceEntity === undefined || !getSourceAvailableFiltersApi) return;
        dispatch(filterActions.getAvailableFilters({ entity: sourceEntity, getAvailableFiltersApi: getSourceAvailableFiltersApi }));
    }, [dispatch, sourceEntity, getSourceAvailableFiltersApi]);

    useEffect(() => {
        // Reset editor state whenever the entity context shifts. In current callers `sourceEntity`
        // is a constant alongside `entity`, but keep it in the deps so any future caller that
        // swaps `sourceEntity` independently does not leak prior source selections.
        setFilterValue(undefined);
        setFilterField(undefined);
        setFieldSource(undefined);
        setValueMode('static');
        setSourceFieldSource(undefined);
        setSourceFilterField(undefined);
        setSelectedFilter(-1);
    }, [entity, sourceEntity]);

    useEffect(() => {
        if (fieldSource !== FilterFieldSource.Custom && valueMode === 'mapped') {
            setValueMode('static');
            setSourceFieldSource(undefined);
            setSourceFilterField(undefined);
        }
    }, [fieldSource, valueMode]);

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
            if ((e.target as HTMLElement).id !== 'unselectFilters') return;
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
        setValueMode('static');
        setSourceFieldSource(undefined);
        setSourceFilterField(undefined);
    }, []);

    const targetContentType = useMemo(
        () => findFieldDef(availableFilters, fieldSource, filterField)?.attributeContentType,
        [availableFilters, fieldSource, filterField],
    );

    // Source content type must match target's; backend rejects mismatches.
    const sourceCurrentFields = useMemo(() => {
        const fields = findSearchFieldData(sourceAvailableFilters, sourceFieldSource);
        if (!fields) return fields;
        if (!targetContentType) return fields;
        return fields.filter((f) => f.attributeContentType === targetContentType);
    }, [sourceAvailableFilters, sourceFieldSource, targetContentType]);

    // Skip when filters not loaded yet so hydration from a saved mapped item isn't wiped.
    useEffect(() => {
        if (!sourceFilterField) return;
        if (sourceAvailableFilters.length === 0) return;
        if (sourceCurrentFields === undefined) return;
        if (!sourceCurrentFields.some((f) => f.fieldIdentifier === sourceFilterField)) {
            setSourceFilterField(undefined);
        }
    }, [sourceAvailableFilters, sourceCurrentFields, sourceFilterField]);

    const notifyActionsUpdate = useCallback(
        (next: ExecutionItemRequestModel[]) => {
            onActionsUpdate?.(next.map((a) => mapActionToExecutionItem(a, availableFilters)));
        },
        [onActionsUpdate, availableFilters],
    );

    const currentField = useMemo(() => currentFields?.find((f) => f.fieldIdentifier === filterField), [filterField, currentFields]);

    const normalizeSelectValue = useCallback((value: unknown): SelectableValue => {
        if (value == null) return '';
        const record = asRecord(value);
        if (!record) return toSelectableValue(value);

        const direct = record.uuid ?? record.value ?? record.reference;
        if (direct != null) return toSelectableValue(direct);

        if (record.data != null) {
            const dataRecord = asRecord(record.data);
            if (!dataRecord) return toSelectableValue(record.data);
            const nested = dataRecord.uuid ?? dataRecord.value ?? dataRecord.reference ?? dataRecord.name ?? dataRecord.label;

            return toSelectableValue(nested ?? record.data);
        }

        return toSelectableValue(record.name ?? record.label ?? value);
    }, []);

    const mapActionDataToSelectValue = useCallback(
        (field: FieldData, actionData: unknown) => {
            const getComparableValues = (value: unknown): unknown[] => {
                if (value === null || value === undefined) return [];
                const record = asRecord(value);
                if (!record) return [value];

                const directDataValue = record.data != null && typeof record.data !== 'object' ? record.data : undefined;
                const dataRecord = asRecord(record.data);
                const nestedDataValue = dataRecord
                    ? (dataRecord.value ?? dataRecord.reference ?? dataRecord.uuid ?? dataRecord.name ?? dataRecord.label)
                    : undefined;

                return [
                    normalizeSelectValue(value),
                    record.uuid,
                    record.value,
                    record.name,
                    record.label,
                    record.reference,
                    directDataValue,
                    nestedDataValue,
                ].filter((candidate) => candidate !== undefined && candidate !== null);
            };

            const isFieldOptionMatched = (optionValue: unknown, rawValue: unknown) => {
                const optionCandidates = getComparableValues(optionValue);
                const rawCandidates = getComparableValues(rawValue);

                return optionCandidates.some((optionCandidate) =>
                    rawCandidates.some((rawCandidate) => String(optionCandidate) === String(rawCandidate)),
                );
            };

            const mapSingleValue = (singleValue: unknown): { label: string; value: SelectableValue } => {
                const fieldValues = Array.isArray(field?.value) ? (field.value as unknown[]) : [];
                const matchedFieldValue = fieldValues.find((fieldValue) => isFieldOptionMatched(fieldValue, singleValue));

                if (matchedFieldValue !== undefined) {
                    if (typeof matchedFieldValue === 'string') {
                        return { label: matchedFieldValue, value: matchedFieldValue };
                    }

                    const matchedRecord = asRecord(matchedFieldValue);
                    if (checkIfFieldAttributeTypeIsDate(field)) {
                        const dateSource = matchedRecord?.value || singleValue;
                        return {
                            label: String(matchedRecord?.label || getFormattedDateTime(String(dateSource))),
                            value: normalizeSelectValue(dateSource),
                        };
                    }

                    return {
                        label: String(matchedRecord?.name || matchedRecord?.label || String(singleValue)),
                        value: normalizeSelectValue(matchedFieldValue),
                    };
                }

                const singleRecord = asRecord(singleValue);
                if (singleRecord) {
                    if (Object.hasOwn(singleRecord, 'value')) {
                        return {
                            label: String(singleRecord.label || singleRecord.name || JSON.stringify(singleRecord.value)),
                            value: normalizeSelectValue(singleRecord.value),
                        };
                    }

                    const dataLabel = typeof singleRecord.data === 'object' ? undefined : singleRecord.data;
                    return {
                        label: String(singleRecord.name || singleRecord.label || dataLabel || JSON.stringify(singleValue)),
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
        (field: FieldData, actionData: unknown): SelectableValue => {
            const normalizedActionData = Array.isArray(actionData) ? actionData[0] : actionData;
            const mapped = mapActionDataToSelectValue(field, normalizedActionData) as { label: string; value: SelectableValue };
            if (mapped && typeof mapped === 'object' && Object.hasOwn(mapped, 'value')) {
                return mapped.value;
            }

            return normalizeSelectValue(normalizedActionData);
        },
        [mapActionDataToSelectValue, normalizeSelectValue],
    );

    const onUpdateClick = useCallback(() => {
        if (!fieldSource || !filterField) return;

        let newExecution: ExecutionItemRequestModel;
        if (valueMode === 'mapped') {
            if (fieldSource !== FilterFieldSource.Custom || !sourceFieldSource || !sourceFilterField) return;
            newExecution = {
                fieldSource,
                fieldIdentifier: filterField,
                sourceFieldSource,
                sourceFieldIdentifier: sourceFilterField,
            };
        } else {
            if (isFilterValueEmpty(filterValue)) return;
            let executionData: unknown;
            if (typeof filterValue === 'string' || typeof filterValue === 'number' || typeof filterValue === 'boolean') {
                executionData = filterValue;
            } else if (Array.isArray(filterValue)) {
                executionData = filterValue.map((v) => (v as { value: unknown }).value);
            } else if (Object.hasOwn(filterValue as object, 'value')) {
                executionData = (filterValue as { value: unknown }).value;
            } else {
                executionData = filterValue;
            }
            newExecution = {
                fieldSource,
                fieldIdentifier: filterField,
                data: executionData,
            };
        }
        clearFilterInputs();

        const updatedActions =
            selectedFilter === -1 ? [...actions, newExecution] : actions.map((a, i) => (i === selectedFilter ? newExecution : a));
        setActions(updatedActions);
        notifyActionsUpdate(updatedActions);
        setSelectedFilter(-1);
    }, [
        fieldSource,
        filterField,
        filterValue,
        valueMode,
        sourceFieldSource,
        sourceFilterField,
        actions,
        selectedFilter,
        clearFilterInputs,
        notifyActionsUpdate,
    ]);

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
    const updateFilterValueDateTime = useCallback((currentFieldThis: FieldData, currentActionData: unknown) => {
        if (currentFieldThis.type === FilterFieldType.List) {
            // Compare only the YYYY-MM-DD part: saved data uses plain dates, API field values use ISO strings.
            const findMatchingFieldOption = (v: unknown): { label: string; value: SelectableValue } => {
                const vRecord = asRecord(v);
                const rawStr = vRecord && vRecord.value !== undefined ? String(vRecord.value) : String(v);
                const datePart = rawStr.split('T')[0];
                if (Array.isArray(currentFieldThis.value)) {
                    const matched = (currentFieldThis.value as unknown[]).find(
                        (fv) => (typeof fv === 'string' ? fv : String(fv)).split('T')[0] === datePart,
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
            setFilterValue(getFormattedDateByType(String(currentActionData), currentFieldThis.attributeContentType!));
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

        if (selectedAction.sourceFieldSource && selectedAction.sourceFieldIdentifier) {
            setValueMode('mapped');
            setSourceFieldSource(selectedAction.sourceFieldSource);
            setSourceFilterField(selectedAction.sourceFieldIdentifier);
            setFilterValue(undefined);
            return;
        }
        setValueMode('static');
        setSourceFieldSource(undefined);
        setSourceFilterField(undefined);

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
            if (typeof action.data !== 'object') return action;

            const thisCurrentField = findFieldDef(availableFilters, action.fieldSource, action.fieldIdentifier);
            if (!thisCurrentField) return action;

            if (Array.isArray(action.data) && action.data.every((v) => typeof v === 'string')) {
                const mappedData = action.data.map((v) => {
                    if (!Array.isArray(thisCurrentField.value)) return { label: v, value: v };

                    const matched = (thisCurrentField.value as unknown[]).find((f) => {
                        const r = asRecord(f);
                        return r ? r.uuid === v || r.value === v || r.reference === v || r.data === v : false;
                    });
                    const mr = asRecord(matched);

                    return mr ? { uuid: mr.uuid, name: mr.name, value: mr.value ?? mr.uuid ?? v } : { label: v, value: v };
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
            if (typeof singleValue === 'object' && Object.hasOwn(singleValue, 'value')) {
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
        (itemNumber: number, value: string, label?: string, fieldSource?: string, isMapped?: boolean) => (
            <React.Fragment key={itemNumber}>
                <b>{fieldSource && getEnumLabel(searchGroupEnum, fieldSource)}&nbsp;</b>'{label}
                '&nbsp;to&nbsp;
                {isMapped ? <i>{value}</i> : value}
                {!disableBadgeRemove && (
                    // biome-ignore lint/a11y/useSemanticElements: can't be a <button> — this remove control is rendered inside the badge's own <button>, and nested buttons are invalid HTML; role="button" with key handling keeps it accessible.
                    <span
                        onClick={(event) => {
                            event.stopPropagation();
                            onRemoveFilterClick(itemNumber);
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label="Remove filter"
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

    const isUpdateButtonDisabled = useMemo(() => {
        if (!filterField || !fieldSource) return true;
        if (valueMode === 'mapped') {
            return fieldSource !== FilterFieldSource.Custom || !sourceFieldSource || !sourceFilterField;
        }
        return isFilterValueEmpty(filterValue);
    }, [filterField, fieldSource, filterValue, valueMode, sourceFieldSource, sourceFilterField]);

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

    const resolvedInputType = (() => {
        const typeFromFieldType = currentField?.type ? getFormTypeFromFilterFieldType(currentField?.type) : 'text';
        return currentField?.attributeContentType && checkIfFieldAttributeTypeIsDate(currentField)
            ? getFormTypeFromAttributeContentType(currentField?.attributeContentType)
            : typeFromFieldType;
    })();

    const renderDateOrDatetimePicker = (
        <DatePicker
            id="valueSelect"
            value={(() => {
                const raw = filterValue !== undefined && typeof filterValue !== 'object' ? String(filterValue) : '';
                return raw ? raw.replace(' ', 'T') : '';
            })()}
            onChange={(value) => setFilterValue(structuredClone(value))}
            disabled={!filterField}
            timePicker={resolvedInputType === 'datetime-local'}
        />
    );

    const renderTextInputField = (
        <TextInput
            id="valueSelect"
            type={supportedInputTypes.has(resolvedInputType) ? (resolvedInputType as TextInputType) : 'text'}
            value={filterValue !== undefined && typeof filterValue !== 'object' ? String(filterValue) : ''}
            onChange={(value) => {
                setFilterValue(structuredClone(value));
            }}
            placeholder="Enter filter value"
            disabled={!filterField}
        />
    );

    const isDateOrDatetime = resolvedInputType === 'date' || resolvedInputType === 'datetime-local';
    const renderTextOrDateField = isDateOrDatetime ? renderDateOrDatetimePicker : renderTextInputField;
    const renderValueField = isTextInputField ? renderTextOrDateField : renderBooleanOrObjectValueField;

    const mappingSupported = sourceEntity !== undefined;
    const isMappingTargetCustom = fieldSource === FilterFieldSource.Custom;
    const isMappedMode = mappingSupported && valueMode === 'mapped';
    const gridColsClass = isMappedMode ? 'grid-cols-5' : 'grid-cols-4';

    return (
        <Widget title={title} busy={isFetchingAvailableFilters} titleSize="large">
            {/* biome-ignore lint/a11y/useSemanticElements: can't be a <button> — it wraps the filter form's inputs and badges (interactive content is invalid inside a button); role="button" is the closest accessible fit for the click/keyboard "deselect on empty background" behaviour. */}
            <div id="unselectFilters" role="button" tabIndex={0} onClick={onUnselectFiltersClick} onKeyDown={onUnselectFiltersKeyDown}>
                {mappingSupported && isMappingTargetCustom && (
                    <div className="flex flex-row gap-4 mb-3 text-sm">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="valueMode"
                                checked={valueMode === 'static'}
                                onChange={() => {
                                    setValueMode('static');
                                    setSourceFieldSource(undefined);
                                    setSourceFilterField(undefined);
                                }}
                            />
                            <span>Static value</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="valueMode"
                                checked={valueMode === 'mapped'}
                                onChange={() => {
                                    setValueMode('mapped');
                                    setFilterValue(undefined);
                                }}
                            />
                            <span>Mapped from attribute</span>
                        </label>
                    </div>
                )}
                <div className="flex flex-row gap-2 mb-4 items-end">
                    <div className={`grid ${gridColsClass} gap-2 w-full`}>
                        <Select
                            id="group"
                            options={availableFilters.map((f) => ({
                                label: getEnumLabel(searchGroupEnum, f.filterFieldSource),
                                value: f.filterFieldSource,
                                description: getEnumDescription(searchGroupEnum, f.filterFieldSource),
                            }))}
                            onChange={(value) => {
                                setFieldSource((value as FilterFieldSource) || undefined);
                                setFilterField(undefined);
                                setFilterValue(undefined);
                            }}
                            value={fieldSource || ''}
                            isClearable
                            label="Target Type"
                            showOptionDescriptionInDropdown
                            showSelectedDescriptionAsHelp
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
                            label="Target Field"
                        />

                        {isMappedMode ? (
                            <>
                                <Select
                                    id="sourceGroup"
                                    options={sourceAvailableFilters.map((f) => ({
                                        label: getEnumLabel(searchGroupEnum, f.filterFieldSource),
                                        value: f.filterFieldSource,
                                        description: getEnumDescription(searchGroupEnum, f.filterFieldSource),
                                    }))}
                                    onChange={(value) => {
                                        setSourceFieldSource((value as FilterFieldSource) || undefined);
                                        setSourceFilterField(undefined);
                                    }}
                                    value={sourceFieldSource || ''}
                                    isClearable
                                    isDisabled={!filterField}
                                    label="Source Type"
                                    showOptionDescriptionInDropdown
                                    showSelectedDescriptionAsHelp
                                />
                                <Select
                                    id="sourceField"
                                    options={sourceCurrentFields?.map((f) => ({ label: f.fieldLabel, value: f.fieldIdentifier }))}
                                    onChange={(value) => setSourceFilterField((value as string) || undefined)}
                                    value={sourceFilterField || ''}
                                    isDisabled={!sourceFieldSource}
                                    isClearable
                                    label="Source Field"
                                />
                            </>
                        ) : (
                            <div>
                                <Label htmlFor="valueSelect">Value</Label>
                                {renderValueField}
                            </div>
                        )}

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
                        const isMapped = !!f.sourceFieldSource && !!f.sourceFieldIdentifier;
                        let value: string;
                        if (isMapped) {
                            const sourceField = findFieldDef(sourceAvailableFilters, f.sourceFieldSource, f.sourceFieldIdentifier);
                            const sourceLabel = sourceField?.fieldLabel ?? f.sourceFieldIdentifier;
                            value = `${getEnumLabel(searchGroupEnum, f.sourceFieldSource!)} '${sourceLabel}'`;
                        } else {
                            const nonArrayValue = f.data ? `'${formatBadgeDataValue(f.data, field, platformEnums)}'` : '';
                            const arrayOrScalarValue = Array.isArray(f.data)
                                ? f.data.map((v) => `'${formatBadgeDataValue(v, field, platformEnums)}'`).join(', ')
                                : nonArrayValue;
                            value =
                                field?.type === FilterFieldType.Boolean
                                    ? `'${booleanOptions.find((b) => !!f.data === b.value)?.label}'`
                                    : arrayOrScalarValue;
                        }
                        return (
                            <Badge
                                key={`${i}-${f.fieldSource}-${f.fieldIdentifier}`}
                                onClick={() => toggleFilter(i)}
                                color={selectedFilter === i ? 'primary' : 'secondary'}
                            >
                                {!isFetchingAvailableFilters && !busyBadges && (
                                    <>{renderBadgeContent(i, value, label, f.fieldSource, isMapped)}</>
                                )}
                            </Badge>
                        );
                    })}
                </div>
            </div>
        </Widget>
    );
}
