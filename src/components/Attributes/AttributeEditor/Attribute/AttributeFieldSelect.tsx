import type React from 'react';
import { useState } from 'react';
import { Controller, useFormContext, useFormState } from 'react-hook-form';
import Select, { type SelectFooterAction } from 'components/Select';
import Label from 'components/Label';
import Button from 'components/Button';
import { AddCustomValuePanel } from 'components/Input/DynamicContent/AddCustomValuePanel';
import { Plus } from 'lucide-react';
import type { CustomAttributeModel, DataAttributeModel } from 'types/attributes';
import type { AttributeSelectOption } from 'utils/attributes/attributes';
import {
    getSelectValueFromField,
    buildAttributeValidators,
    parseListValueByContentType,
    isAttributeErrorVisible,
} from './attributeHelpers';

type AttributeFieldSelectProps = {
    name: string;
    descriptor: DataAttributeModel | CustomAttributeModel;
    options?: AttributeSelectOption[];
    busy: boolean;
    deleteButton?: React.ReactNode;
    createNewAction?: SelectFooterAction;
    onSelectChangeMulti: (fieldOnChange: (v: unknown) => void) => (newValue: unknown) => void;
    onSelectChangeSingle: (fieldOnChange: (v: unknown) => void) => (newValue: unknown) => void;
};

const acceptsCustomValues = (descriptor: DataAttributeModel | CustomAttributeModel) =>
    descriptor.properties.extensibleList === true && !descriptor.properties.readOnly;

export function AttributeFieldSelect({
    name,
    descriptor,
    options = [],
    busy,
    deleteButton,
    createNewAction,
    onSelectChangeMulti,
    onSelectChangeSingle,
}: Readonly<AttributeFieldSelectProps>): React.ReactNode {
    const { control } = useFormContext();
    const { submitCount } = useFormState({ control });
    const [showAddCustom, setShowAddCustom] = useState(false);

    return (
        <Controller
            name={name}
            control={control}
            rules={{ validate: buildAttributeValidators(descriptor) }}
            render={({ field, fieldState }) => {
                const selectValue = getSelectValueFromField(field.value, descriptor.properties.multiSelect);
                // While a custom value is being added the field is still being filled in, so its error waits.
                const errorVisible = isAttributeErrorVisible(fieldState, submitCount) && !showAddCustom;
                const errorId = `${name}-error`;
                const describedBy = errorVisible && descriptor.properties.visible ? errorId : undefined;

                const baseOptions = options;
                let currentValues: unknown[];
                if (descriptor.properties.multiSelect) {
                    currentValues = Array.isArray(field.value) ? field.value : [];
                } else {
                    currentValues = field.value != null && field.value !== '' ? [field.value] : [];
                }
                const seen = new Set(baseOptions.map((o) => String(o.value))); // NOSONAR(S6551): object values share one key on purpose
                const extra: AttributeSelectOption[] =
                    descriptor.properties.extensibleList === true
                        ? currentValues
                              .filter((v) => !seen.has(String(v)))
                              .map((v) => ({ label: String(v), value: v as AttributeSelectOption['value'] }))
                        : [];
                const selectOptions = [...baseOptions, ...extra];
                const noOptionsMessage = acceptsCustomValues(descriptor) ? 'No values yet: use Add custom value below' : undefined;
                // Creating leaves the field as it was, so mark it touched or a cancelled create would hide its error.
                const footerAction = createNewAction && {
                    ...createNewAction,
                    onClick: () => {
                        field.onBlur();
                        createNewAction.onClick();
                    },
                };

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
                                        invalid={errorVisible}
                                        onBlur={field.onBlur}
                                        ariaDescribedBy={describedBy}
                                        footerAction={footerAction}
                                        noOptionsMessage={noOptionsMessage}
                                    />
                                ) : (
                                    <Select
                                        id={`${name}Select`}
                                        value={selectValue}
                                        onChange={onSelectChangeSingle(field.onChange)}
                                        options={selectOptions}
                                        placeholder={`Select ${descriptor.properties.label}`}
                                        isDisabled={descriptor.properties.readOnly || busy || showAddCustom}
                                        isMulti={false}
                                        isClearable={!descriptor.properties.required}
                                        isSearchable
                                        invalid={errorVisible}
                                        onBlur={field.onBlur}
                                        ariaDescribedBy={describedBy}
                                        footerAction={footerAction}
                                        noOptionsMessage={noOptionsMessage}
                                    />
                                )}
                            </div>
                            {deleteButton}
                        </div>
                        {acceptsCustomValues(descriptor) && (
                            <>
                                {!showAddCustom && (
                                    <Button
                                        type="button"
                                        variant="transparent"
                                        className="text-brand mt-1"
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
                                    onFieldChange={(value) => {
                                        field.onChange(value);
                                        field.onBlur();
                                    }}
                                    parseValue={(v) => parseListValueByContentType(descriptor.contentType, v) ?? v}
                                />
                            </>
                        )}
                        {descriptor.properties.visible && (
                            <>
                                {descriptor.description && <p className="text-xs text-content-muted mt-1">{descriptor.description}</p>}
                                {errorVisible && (
                                    <div id={errorId} className="mt-1 text-sm text-danger">
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
