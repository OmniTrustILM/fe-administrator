import type React from 'react';
import { Controller, type ControllerRenderProps, useFormContext, useFormState } from 'react-hook-form';
import Label from 'components/Label';
import TextInput, { inputBaseClassName } from 'components/TextInput';
import DatePicker from 'components/DatePicker';
import Switch from 'components/Switch';
import Editor from 'components/Input/CodeEditor/CodeEditor';
import cn from 'classnames';
import type { CustomAttributeModel, DataAttributeModel } from 'types/attributes';
import { AttributeContentType } from 'types/openapi';
import RequestAttributeMappingBadge from 'components/RequestAttributes/RequestAttributeMappingBadge';
import { useDerExtensionOids } from 'components/RequestAttributes/useDerExtensionOids';
import { getFieldMapping, getMappedExtensionOid } from 'utils/requestAttributes';
import { getExtensionJsonTreeError } from 'utils/strictJson';
import { getCodeBlockLanguage } from '../../../../utils/attributes/attributes';
import { getHighLightedCode } from '../../CodeBlock';
import {
    transformInputValueForDescriptor,
    getFormTypeFromAttributeContentType,
    buildAttributeValidators,
    getRegexpConstraint,
    type FieldValidator,
} from './attributeHelpers';

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
    field: ControllerRenderProps;
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
    const textValue = transformed ? String(transformed) : '';
    const validationVisible = fieldState.isTouched || submitCount > 0;
    const inputClassName = cn(inputBaseClassName, {
        'border-danger focus:border-danger focus:ring-danger': validationVisible && fieldState.invalid,
        '!bg-surface': descriptor.properties.readOnly,
    });

    if (descriptor.contentType === AttributeContentType.Boolean) {
        return (
            <div className="flex items-center mb-3">
                <Switch
                    id={name}
                    checked={!!transformed}
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
                    value={textValue}
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
                value={textValue}
                onChange={(value) => field.onChange(value)}
                onBlur={field.onBlur}
                invalid={validationVisible && !!fieldState.invalid}
            />
            {deleteButton}
        </>
    );
}

export function AttributeFieldInput({ name, descriptor, busy, deleteButton }: Readonly<AttributeFieldInputProps>): React.ReactNode {
    const { setValue, control, watch } = useFormContext();
    const { submitCount } = useFormState({ control });
    const formValues = watch();

    // An attribute mapped onto a DER-encoded extension (per the OID registry) accepts its value as
    // a structural ASN.1 JSON tree: a value starting with `{` is read as a tree, anything else as
    // base64 DER.
    const mappedExtensionOid = getMappedExtensionOid(getFieldMapping(descriptor));
    const derExtensionOids = useDerExtensionOids(!!mappedExtensionOid);
    const acceptsJsonTree = !!mappedExtensionOid && derExtensionOids.has(mappedExtensionOid);

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

    const baseValidator = buildAttributeValidators(descriptor);
    const jsonTreeErrorFor = (value: unknown): string | undefined => {
        if (!acceptsJsonTree || typeof value !== 'string' || !value.trim().startsWith('{')) return undefined;
        return getExtensionJsonTreeError(value);
    };
    const validate: FieldValidator = (value, allValues, fieldState) =>
        baseValidator(value, allValues, fieldState) ?? jsonTreeErrorFor(value);
    // Request attributes carry a description equal to their label; showing it just repeats the label
    // under the field, so only render the description when it adds information.
    const showDescription = !!descriptor.description && descriptor.description.trim() !== (descriptor.properties.label ?? '').trim();

    return (
        <Controller
            name={name}
            control={control}
            rules={{ validate }}
            render={({ field, fieldState }) => {
                const fieldErrorVisible = fieldState.invalid && (fieldState.isTouched || submitCount > 0);
                // Well-formedness feedback while typing: the touched/submit-gated area below only
                // reports after the field is left, and a malformed tree (duplicate keys, trailing
                // content) would otherwise stay invisible until the backend rejects it.
                const liveJsonTreeError = fieldErrorVisible ? undefined : jsonTreeErrorFor(field.value);
                return (
                    <>
                        {showLabel && (
                            <div className="flex items-center gap-2 mb-2">
                                <Label htmlFor={name} required={descriptor.properties.required} className="!mb-0">
                                    {descriptor.properties.label}
                                </Label>
                                <RequestAttributeMappingBadge fieldMapping={getFieldMapping(descriptor)} />
                            </div>
                        )}
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
                                {showDescription && (
                                    <p
                                        className={cn('text-xs text-content-muted', {
                                            'block -mt-2': descriptor.contentType === AttributeContentType.Boolean,
                                            'mt-1': descriptor.contentType !== AttributeContentType.Boolean,
                                        })}
                                    >
                                        {descriptor.description}
                                    </p>
                                )}
                                {acceptsJsonTree && (
                                    <p className="mt-1 text-xs text-content-muted" data-testid={`${name}-json-tree-hint`}>
                                        {
                                            'A value starting with { is read as a structural ASN.1 JSON tree; anything else as base64-encoded DER.'
                                        }
                                    </p>
                                )}
                                {liveJsonTreeError !== undefined && (
                                    <div className="mt-1 text-sm text-danger" data-testid={`${name}-json-tree-error`}>
                                        {liveJsonTreeError}
                                    </div>
                                )}
                                {descriptor.contentType !== AttributeContentType.Boolean && fieldErrorVisible && (
                                    <div className="mt-1 text-sm text-danger">
                                        {typeof fieldState.error === 'string' ? fieldState.error : fieldState.error?.message}
                                        {(regexpConstraint?.description || regexpConstraint?.data) && (
                                            <div className="mt-1 text-xs text-content-muted">
                                                {regexpConstraint.description && <div>{regexpConstraint.description}</div>}
                                                {regexpConstraint?.data && (
                                                    <details className="mt-1">
                                                        <summary className="cursor-pointer select-none font-semibold focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1">
                                                            Show regex pattern
                                                        </summary>
                                                        <div className="mt-1 font-mono break-all">{regexpConstraint.data}</div>
                                                    </details>
                                                )}
                                            </div>
                                        )}
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
