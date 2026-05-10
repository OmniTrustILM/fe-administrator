import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { getStepValue } from 'utils/common-utils';
import { getFormattedDateTime } from 'utils/dateUtil';
import type { BaseAttributeContentModel, CustomAttributeModel } from '../../../../types/attributes';
import { AttributeContentType } from '../../../../types/openapi';
import { composeValidators, validateRequired } from '../../../../utils/validators';
import { ContentFieldConfiguration } from '../index';
import Select from 'components/Select';
import TextInput from 'components/TextInput';
import DatePicker from 'components/DatePicker';
import Container from 'components/Container';
import cn from 'classnames';
import Switch from 'components/Switch';
import { AddCustomValuePanel } from '../AddCustomValuePanel';
import { parseListValueByContentType } from 'components/Attributes/AttributeEditor/Attribute/attributeHelpers';
import Button from 'components/Button';
import { Plus } from 'lucide-react';

function getValueFieldError(fieldState: { error?: { message?: string }; isTouched: boolean; invalid: boolean }) {
    if (!fieldState.isTouched || !fieldState.invalid) return undefined;
    return typeof fieldState.error === 'string' ? fieldState.error : (fieldState.error?.message ?? 'Invalid value');
}

type ValueFieldInputProps = {
    descriptor: CustomAttributeModel;
    id?: string;
    field: { value: any; onChange: (v: any) => void; onBlur: () => void };
    fieldState: { isTouched: boolean; invalid: boolean; error?: { message?: string } };
    fieldStepValue: number | undefined;
    options: { label: string; value: string }[];
    onCancel?: () => void;
};

function normalizeDateValue(value: string | undefined): string | undefined {
    if (!value) return undefined;
    return value.includes('T') ? value : value.replace(' ', 'T');
}

function ListValueField({ descriptor, field, options, inputClassName }: ValueFieldInputProps & { inputClassName: string }) {
    const [showAddCustom, setShowAddCustom] = useState(false);
    const isExtensible = descriptor.properties.extensibleList === true;
    const multiSelect = descriptor.properties.multiSelect;

    useEffect(() => {
        setShowAddCustom(false);
    }, [descriptor.name, isExtensible]);

    const handleListChange = (v: any) => {
        if (multiSelect) {
            const arr = Array.isArray(v) ? v : [];
            const parsed = arr
                .map((item: any) => parseListValueByContentType(descriptor.contentType, item?.value ?? item))
                .filter((x) => x !== undefined);
            field.onChange(parsed.length > 0 ? parsed : undefined);
        } else {
            const parsed = parseListValueByContentType(descriptor.contentType, v);
            field.onChange(parsed ?? '');
        }
    };

    const formatListLabel = (v: string | number | boolean) =>
        descriptor.contentType === AttributeContentType.Datetime ? getFormattedDateTime(String(v)) : String(v);

    const listValue =
        multiSelect && Array.isArray(field.value)
            ? field.value.map((v: string | number | boolean) => ({ value: v, label: formatListLabel(v) }))
            : field.value;

    let currentValues: (string | number | boolean)[];
    if (multiSelect) {
        currentValues = Array.isArray(field.value) ? field.value : [];
    } else {
        currentValues = field.value != null && field.value !== '' ? [field.value] : [];
    }
    const seen = new Set(options.map((o: { value: string }) => String(o.value)));
    const extra = currentValues
        .filter((v: string | number | boolean) => !seen.has(String(v)))
        .map((v: string | number | boolean) => ({ label: formatListLabel(v), value: v }));
    const extendedOptions = [...options, ...extra];
    const { value: _omitValue, ...selectFieldProps } = field;

    return (
        <div className="flex flex-col gap-2 w-full">
            <Container className="flex-row" gap={2}>
                <div className="grow">
                    <Select
                        {...({
                            ...selectFieldProps,
                            value: listValue,
                            onChange: handleListChange,
                            id: descriptor.name,
                            options: extendedOptions,
                            isMulti: multiSelect,
                            disabled: descriptor.properties.readOnly || showAddCustom,
                            isClearable: !descriptor.properties.required,
                            dropdownScope: 'window',
                            className: 'grow',
                        } as React.ComponentProps<typeof Select>)}
                    />
                </div>
            </Container>
            {isExtensible && !descriptor.properties.readOnly && (
                <>
                    {!showAddCustom && (
                        <Button
                            type="button"
                            variant="transparent"
                            className="text-blue-600 mt-1 self-start"
                            onClick={() => setShowAddCustom(true)}
                        >
                            <Plus size={14} className="mr-1" />
                            Add custom value
                        </Button>
                    )}
                    <AddCustomValuePanel
                        open={showAddCustom}
                        onClose={() => setShowAddCustom(false)}
                        idPrefix={descriptor.name}
                        contentType={descriptor.contentType}
                        multiSelect={multiSelect}
                        readOnly={descriptor.properties.readOnly}
                        fieldValue={field.value}
                        onFieldChange={field.onChange}
                        inputClassName={inputClassName}
                    />
                </>
            )}
        </div>
    );
}

function ValueFieldInput({ descriptor, id, field, fieldState, fieldStepValue, options }: Readonly<ValueFieldInputProps>) {
    const inputType = ContentFieldConfiguration[descriptor.contentType].type;
    const displayValue = descriptor.contentType === AttributeContentType.Datetime ? getFormattedDateTime(field.value) : field.value;
    const error = getValueFieldError(fieldState);
    const invalid = fieldState.isTouched && !!fieldState.invalid;
    const inputClassName = cn(
        'py-2.5 sm:py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600',
        { 'border-red-500 focus:border-red-500 focus:ring-red-500': invalid },
    );

    if (descriptor.properties.list) {
        return (
            <ListValueField
                descriptor={descriptor}
                id={id}
                field={field}
                fieldState={fieldState}
                fieldStepValue={fieldStepValue}
                options={options}
                inputClassName={inputClassName}
            />
        );
    }

    switch (inputType) {
        case 'datetime-local':
            return (
                <DatePicker
                    id={descriptor.name}
                    value={normalizeDateValue(field.value)}
                    onChange={(value) => field.onChange(value)}
                    onBlur={field.onBlur}
                    disabled={descriptor.properties.readOnly}
                    invalid={invalid}
                    error={error}
                    required={descriptor.properties.required}
                    timePicker
                />
            );
        case 'number':
            return (
                <input
                    {...field}
                    disabled={descriptor.properties.readOnly}
                    type={inputType}
                    id={descriptor.name}
                    step={fieldStepValue}
                    value={displayValue || ''}
                    className={inputClassName}
                />
            );
        case 'checkbox':
            return (
                <Switch
                    id={id || descriptor.name || 'checkbox'}
                    checked={field.value}
                    onChange={(checked) => field.onChange(checked)}
                    disabled={descriptor.properties.readOnly}
                />
            );
        default:
            return (
                <TextInput
                    id={descriptor.name}
                    type={inputType as 'text' | 'textarea' | 'number' | 'email' | 'password' | 'date' | 'time'}
                    disabled={descriptor.properties.readOnly}
                    value={displayValue || ''}
                    onChange={(value) => field.onChange(value)}
                    invalid={invalid}
                    error={fieldState.isTouched && fieldState.invalid ? fieldState.error?.message : undefined}
                />
            );
    }
}

type Props = {
    id?: string;
    descriptor: CustomAttributeModel;
    initialContent?: BaseAttributeContentModel[];
    onSubmit: (attributeUuid: string, content: BaseAttributeContentModel[]) => void;
    onCancel?: () => void;
};

export default function ContentValueField({ id, descriptor, initialContent, onSubmit, onCancel }: Readonly<Props>) {
    const { control, setValue } = useFormContext();

    const options = useMemo(
        () =>
            descriptor.content?.map((a) => {
                let label: string;
                if (a.reference) {
                    label = a.reference;
                } else if (descriptor.contentType === AttributeContentType.Datetime) {
                    label = getFormattedDateTime(a.data.toString());
                } else {
                    label = a.data.toString();
                }
                return {
                    label,
                    value: a.data.toString(),
                };
            }),
        [descriptor],
    );

    useEffect(() => {
        let initialValue: unknown;
        if (initialContent && initialContent.length > 0) {
            if (descriptor.properties.list) {
                initialValue = descriptor.properties.multiSelect ? initialContent.map((i) => i.data) : initialContent[0].data;
            } else {
                initialValue = initialContent[0].data;
            }
        } else {
            initialValue = undefined;
        }

        const firstDescriptorData = descriptor.content && descriptor.content.length > 0 ? descriptor.content[0].data : undefined;
        const descriptorValue = descriptor.properties.list ? undefined : firstDescriptorData;

        const scalarDefault = descriptor.properties.list ? undefined : ContentFieldConfiguration[descriptor.contentType].initial;
        setValue(descriptor.name, initialValue ?? descriptorValue ?? scalarDefault);
    }, [descriptor, setValue, initialContent]);

    const fieldStepValue = useMemo(() => {
        const stepValue = getStepValue(descriptor.contentType);
        return stepValue;
    }, [descriptor]);

    const beforeOnSubmit = useCallback(
        (attributeUuid: string, content: BaseAttributeContentModel[] | undefined) => {
            if (!content || content.length === 0) {
                return;
            }

            const updatedContent = content.map((contentObject) => {
                if (descriptor.contentType === 'date') {
                    const updatedDate = new Date(contentObject.data as string);
                    const formattedDate = updatedDate.toISOString().slice(0, 10);
                    return { ...contentObject, data: formattedDate };
                }
                if (descriptor.contentType === 'time') {
                    const timeString = contentObject.data as string;
                    const timeStringSplit = timeString.split(':');
                    if (timeStringSplit.length === 2) {
                        return { ...contentObject, data: timeString + ':00' };
                    }
                    return contentObject;
                } else {
                    return contentObject;
                }
            });

            onSubmit(attributeUuid, updatedContent);
        },
        [onSubmit, descriptor],
    );

    const transformObjectContent = (contentType: AttributeContentType, value: BaseAttributeContentModel) => {
        if (contentType === AttributeContentType.Datetime || contentType === AttributeContentType.Date) {
            return { ...value, data: new Date(value.data as string).toISOString() };
        }
        return value;
    };

    const getFieldContent = (input: any) => {
        if (ContentFieldConfiguration[descriptor.contentType].type === 'checkbox') {
            const booleanValue = input.checked === undefined ? (input.value ?? false) : input.checked;
            return [{ data: booleanValue }];
        }
        if (!input.value && input.value !== 0 && input.value !== false) {
            return undefined;
        }
        if (descriptor.properties.list) {
            const dataFrom = (v: any) => (v != null && typeof v === 'object' && 'value' in v ? v.value : v);
            if (descriptor.properties.multiSelect) {
                return (input.value || []).map((v: any) => transformObjectContent(descriptor.contentType, { data: dataFrom(v) }));
            } else {
                if (Array.isArray(input.value)) {
                    return input.value.map((v: any) => transformObjectContent(descriptor.contentType, { data: dataFrom(v) }));
                } else {
                    return [transformObjectContent(descriptor.contentType, { data: dataFrom(input.value) })];
                }
            }
        }
        return [transformObjectContent(descriptor.contentType, { data: input.value })];
    };

    const validators = useMemo(() => {
        const result = [];
        if (ContentFieldConfiguration[descriptor.contentType].validators) {
            result.push(...(ContentFieldConfiguration[descriptor.contentType].validators ?? []));
        }
        if (descriptor.properties.required) {
            result.push(validateRequired());
        }
        return result.length === 0 ? undefined : composeValidators(...result);
    }, [descriptor]);

    if (!ContentFieldConfiguration[descriptor.contentType].type) {
        return null;
    }

    return (
        <Controller
            key={descriptor.name}
            name={descriptor.name}
            control={control}
            rules={{
                validate: validators,
            }}
            render={({ field, fieldState }) => {
                const inputContent = getFieldContent(field);
                const inputType = ContentFieldConfiguration[descriptor.contentType].type;
                const inputComponent = (
                    <ValueFieldInput
                        descriptor={descriptor}
                        id={id}
                        field={field}
                        fieldState={fieldState}
                        fieldStepValue={fieldStepValue}
                        options={options ?? []}
                    />
                );
                const feedbackComponent = fieldState.error?.message ? (
                    <div className="text-red-500 mt-2">{fieldState.error?.message}</div>
                ) : null;

                return (
                    <>
                        <div className={cn({ grow: inputType !== 'checkbox' })}>{inputComponent}</div>
                        <Container className="flex-row justify-end mt-4" gap={2}>
                            <Button type="button" variant="outline" onClick={() => onCancel?.()} data-testid="cancel-custom-value">
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={() => beforeOnSubmit(descriptor.uuid, inputContent)}
                                disabled={!inputContent || fieldState.invalid}
                                data-testid="save-custom-value"
                            >
                                Save
                            </Button>
                        </Container>
                        {feedbackComponent}
                    </>
                );
            }}
        />
    );
}
