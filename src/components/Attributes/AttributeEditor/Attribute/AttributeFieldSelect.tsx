import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import Select from 'components/Select';
import Label from 'components/Label';
import Button from 'components/Button';
import { AddCustomValuePanel } from 'components/Input/DynamicContent/AddCustomValuePanel';
import { Plus } from 'lucide-react';
import type { CustomAttributeModel, DataAttributeModel } from 'types/attributes';
import type { AttributeSelectOption } from 'utils/attributes/attributes';
import { getSelectValueFromField, buildAttributeValidators, parseListValueByContentType } from './attributeHelpers';

type AttributeFieldSelectProps = {
    name: string;
    descriptor: DataAttributeModel | CustomAttributeModel;
    options?: AttributeSelectOption[];
    busy: boolean;
    deleteButton?: React.ReactNode;
    addNewAttributeValue?: { label: string; value: string; disabled?: boolean };
    onSelectChangeMulti: (fieldOnChange: (v: unknown) => void) => (newValue: unknown) => void;
    onSelectChangeSingle: (fieldOnChange: (v: unknown) => void) => (newValue: unknown) => void;
};

export function AttributeFieldSelect({
    name,
    descriptor,
    options = [],
    busy,
    deleteButton,
    addNewAttributeValue,
    onSelectChangeMulti,
    onSelectChangeSingle,
}: Readonly<AttributeFieldSelectProps>): React.ReactNode {
    const { control } = useFormContext();
    const [showAddCustom, setShowAddCustom] = useState(false);
    const [singleSelectKey, setSingleSelectKey] = useState(0);
    const fieldValueRef = useRef<unknown>(undefined);

    const handleSingleSelectChange = useCallback(
        (fieldOnChange: (v: unknown) => void) => (newValue: unknown) => {
            if (newValue === '__add_new__') {
                onSelectChangeSingle(fieldOnChange)(newValue);
                if (!fieldValueRef.current) {
                    fieldOnChange(undefined);
                }
                setSingleSelectKey((k) => k + 1);
            } else {
                onSelectChangeSingle(fieldOnChange)(newValue);
            }
        },
        [onSelectChangeSingle],
    );

    return (
        <Controller
            name={name}
            control={control}
            rules={{ validate: buildAttributeValidators(descriptor) }}
            render={({ field, fieldState }) => {
                fieldValueRef.current = field.value;
                const selectValue = getSelectValueFromField(field.value, descriptor.properties.multiSelect);
                const invalidClass = fieldState.isTouched && fieldState.invalid ? 'border-red-500' : '';

                const baseOptions = options;
                let currentValues: unknown[];
                if (descriptor.properties.multiSelect) {
                    currentValues = Array.isArray(field.value) ? field.value : [];
                } else {
                    currentValues = field.value != null && field.value !== '' ? [field.value] : [];
                }
                const seen = new Set(baseOptions.map((o) => String(o.value)));
                const extra: AttributeSelectOption[] =
                    descriptor.properties.extensibleList === true
                        ? currentValues
                              .filter((v) => !seen.has(String(v)))
                              .map((v) => ({ label: String(v), value: v as AttributeSelectOption['value'] }))
                        : [];
                const selectOptionsList = [...baseOptions, ...extra];
                const selectOptions = addNewAttributeValue
                    ? [
                          ...selectOptionsList,
                          {
                              label: addNewAttributeValue.label,
                              value: addNewAttributeValue.value,
                              disabled: addNewAttributeValue.disabled ?? false,
                          },
                      ]
                    : selectOptionsList;

                return (
                    <>
                        {descriptor.properties.visible && (
                            <Label htmlFor={`${name}Select`} required={descriptor.properties.required}>
                                {descriptor.properties.label}
                            </Label>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                {descriptor.properties.multiSelect ? (
                                    <Select
                                        id={`${name}Select`}
                                        value={selectValue as { value: string | number; label: string }[]}
                                        onChange={onSelectChangeMulti(field.onChange)}
                                        options={selectOptions}
                                        placeholder={`Select ${descriptor.properties.label}`}
                                        isDisabled={descriptor.properties.readOnly || busy || showAddCustom}
                                        isMulti={true}
                                        isClearable={!descriptor.properties.required}
                                        isSearchable
                                        className={invalidClass}
                                    />
                                ) : (
                                    <Select
                                        key={singleSelectKey}
                                        id={`${name}Select`}
                                        value={selectValue}
                                        onChange={handleSingleSelectChange(field.onChange)}
                                        options={selectOptions}
                                        placeholder={`Select ${descriptor.properties.label}`}
                                        isDisabled={descriptor.properties.readOnly || busy || showAddCustom}
                                        isMulti={false}
                                        isClearable={!descriptor.properties.required}
                                        isSearchable
                                        className={invalidClass}
                                    />
                                )}
                            </div>
                            {deleteButton}
                        </div>
                        {descriptor.properties.extensibleList === true && !descriptor.properties.readOnly && (
                            <>
                                {!showAddCustom && (
                                    <Button
                                        type="button"
                                        variant="transparent"
                                        className="text-blue-600 mt-1"
                                        onClick={() => setShowAddCustom(true)}
                                    >
                                        <Plus size={14} className="mr-1" />
                                        Add custom value
                                    </Button>
                                )}
                                <AddCustomValuePanel
                                    open={showAddCustom}
                                    onClose={() => setShowAddCustom(false)}
                                    idPrefix={name}
                                    contentType={descriptor.contentType}
                                    multiSelect={descriptor.properties.multiSelect}
                                    readOnly={descriptor.properties.readOnly}
                                    fieldValue={field.value}
                                    onFieldChange={field.onChange}
                                    parseValue={(v) => parseListValueByContentType(descriptor.contentType, v) ?? v}
                                />
                            </>
                        )}
                        {descriptor.properties.visible && (
                            <>
                                {descriptor.description && (
                                    <p className="text-xs text-gray-700 mt-1 dark:text-neutral-400">{descriptor.description}</p>
                                )}
                                {fieldState.isTouched && fieldState.invalid && (
                                    <div className="mt-1 text-sm text-red-600">
                                        {typeof fieldState.error === 'string' ? fieldState.error : fieldState.error?.message}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                );
            }}
        />
    );
}
