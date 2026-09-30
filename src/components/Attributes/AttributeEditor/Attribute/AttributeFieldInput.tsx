import type React from 'react';
import { Controller, type ControllerRenderProps, useFormContext, useFormState } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { actions as oidActions } from 'ducks/oids';
import RetryCallout from 'components/RetryCallout';
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
import { getFieldMapping, getMappedExtensionOids } from 'utils/requestAttributes';
import { getJerValueError, isJerValue } from 'utils/strictJson';
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
    /** Render a textarea even for a single-line content type (a structural JSON value needs room). */
    multiline?: boolean;
};

function StandardInputControl({
    name,
    descriptor,
    busy,
    deleteButton,
    field,
    fieldState,
    submitCount,
    multiline = false,
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

    if (descriptor.contentType === AttributeContentType.Text || (multiline && descriptor.contentType === AttributeContentType.String)) {
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

const NO_MODULE_JER_ERROR = 'This extension has no ASN.1 module, so its value must be base64-encoded DER.';

export function AttributeFieldInput({ name, descriptor, busy, deleteButton }: Readonly<AttributeFieldInputProps>): React.ReactNode {
    const dispatch = useDispatch();
    const { setValue, control, watch } = useFormContext();
    const { submitCount } = useFormState({ control });
    const formValues = watch();

    // An attribute mapped onto a DER-encoded extension (per the OID registry) takes its value as
    // base64 DER, or written in JER when an ASN.1 module describes the extension. A JER value has to
    // encode for every DER extension the attribute maps to, so each one needs a module. The registry
    // fetch is the editor's job (once per form).
    const mappedExtensionOids = getMappedExtensionOids(getFieldMapping(descriptor));
    const derExtensionOids = useDerExtensionOids();
    const mappedDerOids = mappedExtensionOids.filter((oid) => derExtensionOids.all.has(oid));
    const isDerTarget = mappedDerOids.length > 0;
    const acceptsJer = isDerTarget && mappedDerOids.every((oid) => derExtensionOids.withModule.has(oid));
    // A mapped extension whose registry entry could not be read has an unknown encoding, so the value
    // gets no hint or check here; the field says so and offers to read the entry again.
    const unreadExtensionOids = mappedExtensionOids.filter((oid) => derExtensionOids.failed[oid] !== undefined);

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
    const jerErrorFor = (value: unknown): string | undefined => {
        if (!isDerTarget || typeof value !== 'string' || !isJerValue(value)) return undefined;
        return acceptsJer ? getJerValueError(value) : NO_MODULE_JER_ERROR;
    };
    const validate: FieldValidator = (value, allValues, fieldState) => baseValidator(value, allValues, fieldState) ?? jerErrorFor(value);
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
                // reports after the field is left, and a malformed JER value (duplicate keys, trailing
                // content) would otherwise stay invisible until the backend rejects it.
                const liveJerError = fieldErrorVisible ? undefined : jerErrorFor(field.value);
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
                                multiline={isDerTarget}
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
                                {unreadExtensionOids.map((oid) => (
                                    <div key={oid} className="mt-1" data-testid={`${name}-extension-detail-error`}>
                                        <RetryCallout
                                            message={`${derExtensionOids.failed[oid]} The value of extension ${oid} is not checked here until its entry is read.`}
                                            onRetry={() => dispatch(oidActions.getExtensionOidDetail({ oid }))}
                                        />
                                    </div>
                                ))}
                                {isDerTarget && (
                                    <p className="mt-1 text-xs text-content-muted" data-testid={`${name}-der-value-hint`}>
                                        {acceptsJer
                                            ? 'Write the value in JER (X.697) against the extension\'s ASN.1 module, or give it as base64-encoded DER. A value starting with {, [, " or - is always read as JER.'
                                            : 'Enter the value as base64-encoded DER. This extension has no ASN.1 module, so its value cannot be written in JER.'}
                                    </p>
                                )}
                                {liveJerError !== undefined && (
                                    <div className="mt-1 text-sm text-danger" data-testid={`${name}-jer-error`}>
                                        {liveJerError}
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
