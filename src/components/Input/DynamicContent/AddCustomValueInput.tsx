import cn from 'classnames';
import type React from 'react';
import TextInput from 'components/TextInput';
import DatePicker from 'components/DatePicker';
import Switch from 'components/Switch';
import { AttributeContentType } from 'types/openapi';

const defaultInputClassName = 'py-2.5 px-4 block w-full border border-outline rounded-lg text-sm bg-surface-raised';

type Props = {
    id: string;
    inputType: string;
    contentType: AttributeContentType;
    fieldStepValue: number | undefined;
    value: string | number | boolean;
    onChange: (v: string | number | boolean) => void;
    readOnly: boolean;
    inputClassName?: string;
    placeholder?: string;
    /** Marks the control as failing validation (red border plus `aria-invalid`). */
    invalid?: boolean;
    /** Id of an element describing the control (typically an error paragraph) — announced by screen readers. */
    ariaDescribedBy?: string;
};

export function AddCustomValueInput({
    id,
    inputType,
    contentType,
    fieldStepValue,
    value,
    onChange,
    readOnly,
    inputClassName = defaultInputClassName,
    placeholder,
    invalid = false,
    ariaDescribedBy,
}: Readonly<Props>): React.ReactNode {
    if (inputType === 'datetime-local') {
        let dateVal = typeof value === 'string' && value ? value : undefined;
        if (dateVal && !dateVal.includes('T')) dateVal = dateVal.replace(' ', 'T');
        return (
            <DatePicker
                id={id}
                value={dateVal}
                onChange={(v) => onChange(v ?? '')}
                disabled={readOnly}
                timePicker
                invalid={invalid}
                ariaDescribedBy={ariaDescribedBy}
            />
        );
    }
    if (inputType === 'number') {
        const isInt = contentType === AttributeContentType.Integer;
        const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;
            if (raw === '') {
                onChange('');
                return;
            }
            const parsed = isInt ? Number.parseInt(raw, 10) : Number.parseFloat(raw);
            onChange(Number.isNaN(parsed) ? 0 : parsed);
        };
        return (
            <input
                type="number"
                step={fieldStepValue}
                className={cn(inputClassName, { 'border-danger focus:border-danger focus:ring-danger': invalid })}
                value={value === '' ? '' : Number(value)}
                onChange={handleNumberChange}
                disabled={readOnly}
                placeholder={placeholder}
                aria-invalid={invalid || undefined}
                aria-describedby={ariaDescribedBy}
            />
        );
    }
    if (inputType === 'checkbox') {
        return (
            <Switch
                id={id}
                checked={Boolean(value)}
                onChange={onChange}
                disabled={readOnly}
                ariaInvalid={invalid}
                ariaDescribedBy={ariaDescribedBy}
            />
        );
    }
    return (
        <TextInput
            id={id}
            type={inputType as 'text' | 'date' | 'time'}
            value={String(value ?? '')}
            onChange={(v) => onChange(v)}
            disabled={readOnly}
            placeholder={placeholder}
            invalid={invalid}
            ariaDescribedBy={ariaDescribedBy}
        />
    );
}
