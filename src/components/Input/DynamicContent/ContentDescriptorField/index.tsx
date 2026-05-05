import WidgetButtons from 'components/WidgetButtons';
import { useEffect, useMemo } from 'react';

import { Controller, useFormContext } from 'react-hook-form';
import Button from 'components/Button';
import Label from 'components/Label';
import TextInput from 'components/TextInput';
import DatePicker from 'components/DatePicker';
import { AttributeContentType } from 'types/openapi';
import { getStepValue } from 'utils/common-utils';
import { validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { ContentFieldConfiguration } from '../index';
import { Plus } from 'lucide-react';
import cn from 'classnames';

function DescriptorInputControl({
    name,
    contentType,
    fieldStepValue,
    field,
    fieldState,
}: {
    name: string;
    contentType: AttributeContentType;
    fieldStepValue: number | undefined;
    field: { value: any; onChange: (v: any) => void; onBlur: () => void };
    fieldState: { error?: { message?: string } | string; isTouched: boolean };
}) {
    const inputType = ContentFieldConfiguration[contentType].type;
    const error = getFieldErrorMessage(fieldState);
    const invalid = fieldState.error && fieldState.isTouched;
    const inputClassName = cn(
        'py-2.5 sm:py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600',
        { 'border-red-500 focus:border-red-500 focus:ring-red-500': invalid },
    );

    if (inputType === 'checkbox') {
        return (
            <input
                {...field}
                type="checkbox"
                id={name}
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
        );
    }
    if (inputType === 'datetime-local') {
        const dateValue = field.value ? field.value.replace(' ', 'T') : undefined;
        return (
            <DatePicker
                id={name}
                value={dateValue}
                onChange={(value) => field.onChange(value)}
                onBlur={field.onBlur}
                invalid={!!invalid}
                error={error}
                required
                timePicker
            />
        );
    }
    if (inputType === 'number') {
        return (
            <input
                {...field}
                type={inputType}
                id={name}
                step={fieldStepValue}
                placeholder="Default Content"
                value={field.value || ''}
                className={`${inputClassName} text-[var(--dark-gray-color)]`}
            />
        );
    }
    return (
        <TextInput
            {...field}
            id={name}
            type={inputType as 'text' | 'textarea' | 'date' | 'time'}
            placeholder="Default Content"
            invalid={!!invalid}
            error={error}
        />
    );
}

type Props = Readonly<{
    isList: boolean;
    contentType: AttributeContentType;
}>;

export default function ContentDescriptorField({ isList, contentType }: Props) {
    const { control, setValue, watch } = useFormContext();
    const contentValues = watch('content');
    const readOnly = watch('readOnly');

    useEffect(() => {
        if (!isList && contentValues?.length > 1) {
            setValue('content', contentValues.slice(0, 1));
        }
    }, [isList, contentValues, setValue]);

    const fieldStepValue = useMemo(() => {
        return getStepValue(ContentFieldConfiguration[contentType].type);
    }, [contentType]);

    useEffect(() => {
        if (readOnly) {
            const updatedContent =
                Array.isArray(contentValues) && contentValues?.length
                    ? contentValues?.map((content: any) => ({ data: content.data || ContentFieldConfiguration[contentType].initial }))
                    : [{ data: ContentFieldConfiguration[contentType].initial }];
            setValue('content', updatedContent);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [readOnly, contentType, setValue]);

    return (
        <>
            {contentValues?.map((_contentValue: any, index: number) => {
                const name = `content.${index}.data` as const;

                return (
                    ContentFieldConfiguration[contentType].type && (
                        <Controller
                            key={name}
                            name={name}
                            control={control}
                            shouldUnregister
                            rules={
                                ContentFieldConfiguration[contentType].validators
                                    ? buildValidationRules([
                                          ...(ContentFieldConfiguration[contentType].validators ?? []),
                                          validateRequired(),
                                      ])
                                    : buildValidationRules([validateRequired()])
                            }
                            render={({ field, fieldState }) => {
                                const labelComponent = index === 0 ? <Label htmlFor={name}>Default Content</Label> : null;
                                const inputComponent = (
                                    <DescriptorInputControl
                                        name={name}
                                        contentType={contentType}
                                        fieldStepValue={fieldStepValue}
                                        field={field}
                                        fieldState={fieldState}
                                    />
                                );
                                const buttonComponent = (
                                    <WidgetButtons
                                        justify="start"
                                        buttons={[
                                            {
                                                id: 'remove',
                                                icon: 'cross',
                                                disabled: readOnly && contentValues?.length === 1,
                                                tooltip: 'Remove',
                                                onClick: () => {
                                                    setValue(
                                                        'content',
                                                        contentValues.filter((_: any, filterIndex: number) => index !== filterIndex),
                                                    );
                                                },
                                            },
                                        ]}
                                    />
                                );
                                const feedbackComponent = getFieldErrorMessage(fieldState) ? (
                                    <p className="mt-1 text-sm text-red-600">{getFieldErrorMessage(fieldState)}</p>
                                ) : null;

                                const isBoolean = contentType === AttributeContentType.Boolean;
                                return (
                                    <div className="mb-4">
                                        {!isBoolean && (
                                            <>
                                                {labelComponent}
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1">{inputComponent}</div>
                                                    {buttonComponent}
                                                </div>
                                                {feedbackComponent}
                                            </>
                                        )}
                                        {isBoolean && (
                                            <div className="flex items-center gap-2">
                                                {inputComponent}
                                                {labelComponent}
                                                {buttonComponent}
                                                {feedbackComponent}
                                            </div>
                                        )}
                                    </div>
                                );
                            }}
                        />
                    )
                );
            })}
            {(isList || !contentValues || contentValues.length === 0) && (
                <Button
                    variant="transparent"
                    className="text-blue-600"
                    onClick={() =>
                        setValue('content', [
                            ...(isList ? (contentValues ?? []) : []),
                            { data: ContentFieldConfiguration[contentType].initial },
                        ])
                    }
                >
                    <Plus className="w-4 h-4" />
                    Add Content
                </Button>
            )}
        </>
    );
}
