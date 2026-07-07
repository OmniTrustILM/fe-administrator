import type React from 'react';
import { Controller, useFormContext, useFormState } from 'react-hook-form';
import Label from 'components/Label';
import TextInput from 'components/TextInput';
import DatePicker from 'components/DatePicker';
import Switch from 'components/Switch';
import Editor from 'components/Input/CodeEditor/CodeEditor';
import cn from 'classnames';
import type { CustomAttributeModel, DataAttributeModel } from 'types/attributes';
import { AttributeContentType } from 'types/openapi';
import RequestAttributeMappingBadge from 'components/RequestAttributes/RequestAttributeMappingBadge';
import { getFieldMapping } from 'utils/requestAttributes';
import { getCodeBlockLanguage } from '../../../../utils/attributes/attributes';
import { getHighLightedCode } from '../../CodeBlock';
import {
    transformInputValueForDescriptor,
    getFormTypeFromAttributeContentType,
    buildAttributeValidators,
    getRegexpConstraint,
} from './attributeHelpers';

interface FieldStateLike {
    value: any;
    onChange: (v: any) => void;
    onBlur: () => void;
}

interface FieldStateError {
    isTouched: boolean;
    invalid: boolean;
    error?: { message?: string } | string;
}

type AttributeFieldInputProps = {
    name: string;
    descriptor: DataAttributeModel | CustomAttributeModel;
    busy: boolean;
    deleteButton?: React.ReactNode;
};

type StandardInputControlProps = {
    name: string;
    descriptor: DataAttributeModel | CustomAttributeModel;
    busy: boolean;
    deleteButton?: React.ReactNode;
    field: FieldStateLike;
    fieldState: FieldStateError;
    submitCount: number;
};

function StandardInputControl({
    name,
    descriptor,
    busy,
    deleteButton,
    field,
    fieldState,
    submitCount,
}: Readonly<StandardInputControlProps>): React.ReactNode {
    const transformed = transformInputValueForDescriptor(field.value, descriptor);
    const validationVisible = fieldState.isTouched || submitCount > 0;
    const inputClassName = cn(
        'py-2.5 sm:py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600',
        { 'border-red-500 focus:border-red-500 focus:ring-red-500': validationVisible && fieldState.invalid },
    );

    if (descriptor.contentType === AttributeContentType.Boolean) {
        return (
            <div className="flex items-center mb-3">
                <Switch
                    id={name}
                    checked={transformed ?? false}
                    onChange={(checked) => field.onChange(checked)}
                    disabled={descriptor.properties.readOnly || busy}
                    secondaryLabel={descriptor.properties.label}
                />
                {deleteButton}
            </div>
        );
    }

    if (descriptor.contentType === AttributeContentType.Text) {
        return (
            <>
                <textarea
                    {...field}
                    id={name}
                    placeholder={`Enter ${descriptor.properties.label}`}
                    disabled={descriptor.properties.readOnly || busy}
                    value={transformed || ''}
                    rows={4}
                    className={inputClassName}
                />
                {deleteButton}
            </>
        );
    }

    if (descriptor.contentType === AttributeContentType.Datetime) {
        const normalizedValue = field.value?.includes('T') ? field.value : field.value?.replace(' ', 'T');
        const dateValue = field.value ? normalizedValue : undefined;
        let errorMessage: string | undefined;
        if (!validationVisible || !fieldState.invalid) {
            errorMessage = undefined;
        } else if (typeof fieldState.error === 'string') {
            errorMessage = fieldState.error;
        } else {
            errorMessage = fieldState.error?.message || 'Invalid value';
        }
        return (
            <>
                <DatePicker
                    id={name}
                    value={dateValue}
                    onChange={(value) => field.onChange(value)}
                    onBlur={field.onBlur}
                    disabled={descriptor.properties.readOnly || busy}
                    invalid={validationVisible && !!fieldState.invalid}
                    error={errorMessage}
                    required={descriptor.properties.required}
                    timePicker
                />
                {deleteButton}
            </>
        );
    }

    const inputType = descriptor.properties.visible
        ? (getFormTypeFromAttributeContentType(descriptor.contentType) as 'text' | 'number' | 'date' | 'time' | 'password')
        : 'text';
    return (
        <>
            <TextInput
                id={name}
                type={inputType}
                placeholder={`Enter ${descriptor.properties.label}`}
                disabled={descriptor.properties.readOnly || busy}
                value={transformed || ''}
                onChange={(value) => field.onChange(value)}
                onBlur={field.onBlur}
                invalid={validationVisible && !!fieldState.invalid}
            />
            {deleteButton}
        </>
    );
}

export function AttributeFieldInput({ name, descriptor, busy, deleteButton }: Readonly<AttributeFieldInputProps>): React.ReactNode {
    const { setValue, control, watch } = useFormContext<Record<string, any>>();
    const { submitCount } = useFormState({ control });
    const formValues = watch();

    // Attribute should not be rendered in form but its value should be sent to BE
    if (descriptor.properties.visible === false) {
        return null;
    }

    if (descriptor.contentType === AttributeContentType.Codeblock) {
        const attributeValue = formValues[name];
        const language = getCodeBlockLanguage(attributeValue?.language ?? undefined, descriptor.content);
        return (
            <>
                <Label htmlFor={`${name}.codeTextArea`} required={descriptor.properties.required}>
                    {descriptor.properties.label}
                    <span className="italic"> ({language})</span>
                </Label>
                &nbsp;
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Controller
                        name={`${name}.code`}
                        control={control}
                        render={({ field }) => (
                            <Editor
                                {...field}
                                textareaId={`${name}.codeTextArea`}
                                id={`${name}.code`}
                                value={field.value || ''}
                                onValueChange={(code: string) => setValue(`${name}.code`, code)}
                                highlight={(code: string) => getHighLightedCode(code, language)}
                                padding={10}
                                style={{
                                    fontFamily: '"Fira code", "Fira Mono", monospace',
                                    fontSize: 14,
                                    border: 'solid 1px #ccc',
                                    borderRadius: '0.375rem',
                                    width: '100%',
                                }}
                            />
                        )}
                    />
                    {deleteButton}
                </div>
            </>
        );
    }

    const showLabel = descriptor.properties.visible && descriptor.contentType !== AttributeContentType.Boolean;
    const showDescriptionAndError = descriptor.properties.visible;
    const regexpConstraint = getRegexpConstraint(descriptor);

    return (
        <Controller
            name={name}
            control={control}
            rules={{ validate: buildAttributeValidators(descriptor) }}
            render={({ field, fieldState }) => (
                <>
                    {showLabel && (
                        <Label htmlFor={name} required={descriptor.properties.required}>
                            {descriptor.properties.label}
                        </Label>
                    )}
                    {showLabel && <RequestAttributeMappingBadge fieldMapping={getFieldMapping(descriptor)} />}
                    <div className="flex items-center">
                        <StandardInputControl
                            name={name}
                            descriptor={descriptor}
                            busy={busy}
                            deleteButton={deleteButton}
                            field={field}
                            fieldState={fieldState}
                            submitCount={submitCount}
                        />
                    </div>
                    {showDescriptionAndError && (
                        <>
                            {descriptor.description && (
                                <p
                                    className={cn('text-xs text-gray-400 dark:text-neutral-400', {
                                        'block -mt-2': descriptor.contentType === AttributeContentType.Boolean,
                                        'mt-1': descriptor.contentType !== AttributeContentType.Boolean,
                                    })}
                                >
                                    {descriptor.description}
                                </p>
                            )}
                            {descriptor.contentType !== AttributeContentType.Boolean &&
                                fieldState.invalid &&
                                (fieldState.isTouched || submitCount > 0) && (
                                    <div className="mt-1 text-sm text-red-600">
                                        {typeof fieldState.error === 'string' ? fieldState.error : fieldState.error?.message}
                                        {(regexpConstraint?.description || regexpConstraint?.data) && (
                                            <div className="mt-1 text-xs text-gray-600 dark:text-neutral-400">
                                                {regexpConstraint.description && <div>{regexpConstraint.description}</div>}
                                                {regexpConstraint?.data && (
                                                    <div className="font-mono break-all">Pattern: {regexpConstraint.data}</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                        </>
                    )}
                </>
            )}
        />
    );
}
